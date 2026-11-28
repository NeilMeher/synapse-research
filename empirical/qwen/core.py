"""Run and independently replay the frozen Qwen Vulkan evidence envelope."""
from argparse import ArgumentParser
from collections import Counter
from contextlib import closing
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import tempfile
from time import monotonic

from empirical.inference import LocalChat, digest, file_hash, json_bytes, now, serve
from empirical.phase3.archive import BASE, DIRS, payload, scoring
from empirical.phase3.collect import ERRORS, LOCAL_ROOT, metadata, model_config, now_age
from empirical.phase3.design import build_plan, prepare, render_request
from empirical.qwen.resources import ResourceGuard, check_artifacts, verify_offload
from empirical.robustness.collect import pending
from empirical.run import git, journal, load, lock

ROOT=Path(__file__).resolve().parent
CONFIG=ROOT/"vulkan.json"
DOC=ROOT.parents[1]/"research/mirage-qwen-vulkan-protocol.md"
STREAM=ROOT/"vulkan-streamed.json"
STREAM_DOC=ROOT.parents[1]/"research/mirage-qwen-vulkan-streamed.md"
ATTEMPT=ROOT/"mmap-startup-stop.json"
STAGES=("qwen-development","cross-model")


def path_for(stage):
    return BASE/DIRS[stage]


def config():
    spec=load(CONFIG)
    params=model_config("qwen-development")
    params["runtime"].update(device=spec["device"],gpuLayers=spec["gpuLayers"],loadMode=load(STREAM)["loadMode"])
    params["model"].update(runtime=spec["runtime"],runtimeArchiveSha256=spec["packageSha256"],
                           runtimeExecutableSha256=spec["executableSha256"],vulkanBackendSha256=spec["backendSha256"])
    return params


def execution(stage):
    original=metadata(stage)
    values=config()
    original.update(runtime=values["runtime"],model=values["model"],backend="Vulkan0 · GTX 1650")
    original["files"].update({p.name:file_hash(p) for p in (CONFIG,DOC,STREAM,STREAM_DOC,ATTEMPT)})
    if stage=="cross-model":
        original["capabilityManifestSha256"]=file_hash(path_for("qwen-development")/"manifest.json")
    return original


def observations(folder):
    return [json.loads(raw) for raw in (folder/"responses.ndjson").read_bytes().splitlines()]


def gate(records, resources):
    threshold=load(CONFIG)["capability"]
    scores,_=scoring("qwen-development",records)
    correct=Counter({r["family"]:0 for r in scores})
    for row in scores:
        correct[row["family"]]+=row["correct"] or 0
    scorable=sum(r["status"]=="scorable" for r in records)
    failed=sum(r["raw"] is None for r in records)
    latencies=[r["latencyMs"]/1000 for r in records if r["latencyMs"] is not None]
    estimate=(latencies[0]+511*max(latencies[1:])*threshold["warmLatencyInflation"]+
              threshold["fixedOverheadSeconds"]) if len(latencies)==12 else None
    checks={"scorable":scorable>=threshold["minimumScorable"],"correct":sum(correct.values())>=threshold["minimumCorrect"],
            "families":min(correct.values())>=threshold["minimumCorrectPerFamily"],
            "infrastructure":failed<=threshold["maximumInfrastructureFailures"],
            "resources":bool(resources) and all(m["resourceStop"] is None and m["offload"] for m in resources),
            "budget":estimate is not None and estimate<=load(CONFIG)["replication"]["maximumSeconds"]}
    return {"passed":all(checks.values()),"criteria":checks,"scorable":scorable,"correct":sum(correct.values()),
            "correctByFamily":dict(correct),"infrastructureFailures":failed,"projectedFullSeconds":estimate}


def check_freeze(freeze):
    paths=("empirical/qwen","empirical/phase3","empirical/inference.py","empirical/run.py",
           "empirical/robustness","research/mirage-qwen-vulkan-protocol.md","research/mirage-qwen-vulkan-streamed.md","research/mirage-cross-model-protocol.md")
    if freeze!=git("rev-parse","HEAD") or git("status","--porcelain","--",*paths):
        raise RuntimeError("The Vulkan launch requires the exact committed protocol and a clean study tree.")


def collect(stage,runtime,weights,package,freeze):
    check_freeze(freeze)
    prepare()
    if stage=="cross-model":
        verify("qwen-development")
        prior=load(path_for("qwen-development")/"manifest.json")
        if not prior["capabilityGate"]["passed"]:
            raise RuntimeError("The registered capability gate did not pass.")
    constants=load(CONFIG)
    model=config()
    check_artifacts(runtime,package,weights,constants,model["model"])
    tasks,_,plan=build_plan(stage)
    lookup={r["id"]:r for r in tasks}
    work=LOCAL_ROOT/"qwen-vulkan-streamed"/stage
    work.mkdir(parents=True,exist_ok=True)
    meta=execution(stage)
    budget=constants["replication"]
    with lock(work.parent/"collector.lock"),journal(work/"observations.sqlite",meta) as db:
        db.execute("CREATE TABLE IF NOT EXISTS resource_runs (data TEXT NOT NULL)")
        rows={i:(stamp,raw) for i,stamp,raw in db.execute("SELECT * FROM record ORDER BY sequence")}
        if len(rows)==len(plan) and all(raw is not None for _,raw in rows.values()):
            print("Already complete; no requests repeated.")
            return
        first=next(iter(rows.values()))[0] if rows else None
        streak=0
        for _,raw in reversed(rows.values()):
            if not raw or json.loads(raw)["status"] not in ERRORS:
                break
            streak+=1
        guard=ResourceGuard(constants)
        guard.summary["offload"]=None
        log=work/f"runtime-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')}.log"
        start=monotonic()
        try:
            with serve(runtime,weights,model,log,on_launch=guard.launch) as server:
                guard.summary["offload"]=verify_offload(log,model["runtime"]["loadMode"])
                guard.summary["startupMs"]=round((monotonic()-start)*1000,3)
                for item in plan:
                    seq=item["sequence"]
                    if seq in rows and rows[seq][1] is not None:
                        continue
                    stamp=now()
                    if first is None:
                        first=stamp
                    if seq in rows:
                        observation=pending("interrupted",rows[seq][0])
                    else:
                        db.execute("INSERT INTO record VALUES (?, ?, NULL)",(seq,stamp))
                        if guard.summary["resourceStop"] or streak>=budget["maximumConsecutiveFailures"] or now_age(first)>budget["maximumSeconds"]:
                            observation=pending("notAttempted",stamp)
                        else:
                            messages,grammar=render_request(lookup[item["design"]["taskId"]],item)
                            settings=item["generation"]
                            if digest({"messages":messages,"grammar":grammar,"generation":settings})!=item["requestSha256"]:
                                raise ValueError("The exact prepared request hash differs.")
                            observation=LocalChat(server.port,{**model,"generation":settings}).infer(messages,grammar)
                            streak=streak+1 if observation["status"] in ERRORS else 0
                    observation.update(sequence=seq,requestSha256=item["requestSha256"],evidence="actual-model-request")
                    db.execute("UPDATE record SET data=? WHERE sequence=?",(json_bytes(observation).decode(),seq))
                    if seq%32==0 or seq==len(plan):
                        print(f"{stage}: {seq}/{len(plan)} journaled in {monotonic()-start:.1f}s",flush=True)
        finally:
            guard.stop()
            db.execute("INSERT INTO resource_runs VALUES (?)",(json_bytes(guard.summary).decode(),))
            print("Resource measurements:",json.dumps(guard.summary),flush=True)


def pack(stage):
    target=path_for(stage)
    if target.exists():
        raise FileExistsError("Existing archives are immutable.")
    db_path=LOCAL_ROOT/"qwen-vulkan-streamed"/stage/"observations.sqlite"
    with closing(sqlite3.connect(db_path.as_uri()+"?mode=ro",uri=True)) as db:
        meta=json.loads(db.execute("SELECT data FROM metadata").fetchone()[0])
        records=[json.loads(r) for r, in db.execute("SELECT data FROM record ORDER BY sequence")]
        resources=[json.loads(r) for r, in db.execute("SELECT data FROM resource_runs ORDER BY rowid")]
    if meta!=execution(stage):
        raise ValueError("Original execution checkout and inputs are required for archiving.")
    data=payload(stage,records)
    manifest={"classification":"development-actual-model" if stage=="qwen-development" else "registered-actual-model",
              "execution":meta,"status":"partial" if any(r["status"]=="notAttempted" for r in records) else "completed",
              "planned":len(records),"actualResponses":sum(r["raw"] is not None for r in records),
              "statusCounts":dict(Counter(r["status"] for r in records)),"resources":resources,
              "startedUtc":records[0]["timestamp"],"lastRequestUtc":records[-1]["timestamp"],"additionalCostUsd":0,
              "outputs":{name:{"sha256":sha256(contents).hexdigest(),"bytes":len(contents)} for name,contents in data.items()}}
    if stage=="qwen-development":
        manifest["capabilityGate"]=gate(records,resources)
    data["manifest.json"]=json_bytes(manifest)
    with tempfile.TemporaryDirectory(prefix=".qwen-",dir=BASE) as temp:
        stage_dir=Path(temp)/"qwen"
        stage_dir.mkdir()
        for name,contents in data.items():
            (stage_dir/name).write_bytes(contents)
        stage_dir.rename(target)
    print(stage,manifest["statusCounts"],manifest.get("capabilityGate",""))


def verify(stage):
    target=path_for(stage)
    manifest=load(target/"manifest.json")
    rec=observations(target)
    if {**execution(stage),"sourceCommit":manifest["execution"]["sourceCommit"]}!=manifest["execution"]:
        raise ValueError("Qwen execution provenance differs.")
    if (len(rec),sum(r["raw"] is not None for r in rec),dict(Counter(r["status"] for r in rec)))!=(
            manifest["planned"],manifest["actualResponses"],manifest["statusCounts"]):
        raise ValueError("Response counts differ.")
    if stage=="qwen-development" and manifest["capabilityGate"]!=gate(rec,manifest["resources"]):
        raise ValueError("Capability gate replay differs.")
    expected={"bytes":0,"sha256":""}
    for name,contents in payload(stage,rec).items():
        expected.update(bytes=len(contents),sha256=sha256(contents).hexdigest())
        if manifest["outputs"][name]!=expected or (target/name).read_bytes()!=contents:
            raise ValueError("Archived Qwen result differs: "+name)
    print("Verified",stage,manifest["actualResponses"],"genuine responses.")


if __name__=="__main__":
    cli=ArgumentParser(description=__doc__)
    cli.add_argument("command",choices=("collect","pack","verify"))
    cli.add_argument("stage",choices=STAGES)
    for name in ("runtime","weights","package"):
        cli.add_argument("--"+name,type=Path)
    cli.add_argument("--freeze")
    args=cli.parse_args()
    if args.command=="collect":
        collect(args.stage,args.runtime,args.weights,args.package,args.freeze)
    else:
        (pack if args.command=="pack" else verify)(args.stage)
