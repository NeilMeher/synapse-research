"""Package and replay actual Phase III inference without a model server."""
import argparse
from collections import Counter
from contextlib import closing
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import tempfile

from empirical.inference import file_hash, json_bytes, parse
from empirical.run import load
from empirical.robustness.archive import FAILED, REGISTERED
from empirical.robustness.design import IDS
from empirical.phase3.analysis import compare_models, decode
from empirical.phase3.collect import LOCAL_ROOT, metadata
from empirical.phase3.design import ROOT, SETTINGS, STAGES, build_plan, prepare

BASE=ROOT.parent/"archives"
DIRS={"development":"mirage-empirical-decoding-004-development","decoding":"mirage-empirical-decoding-004",
      "qwen-development":"mirage-empirical-cross-model-003-development","cross-model":"mirage-empirical-cross-model-003"}


def scoring(stage, observations):
    tasks, keys, schedule=build_plan(stage)
    truth={r["id"]:r["correct"] for r in keys}
    result=[]
    used_ids=set()
    for request, observed in zip(schedule,observations,strict=True):
        if observed["evidence"]!="actual-model-request":
            raise ValueError("Only actual-model evidence can be scored.")
        if (observed["sequence"],observed["requestSha256"])!=(request["sequence"],request["requestSha256"]):
            raise ValueError("Response sequence or requested conditions differ.")
        identifier=observed["id"]
        if identifier is not None and identifier in used_ids:
            raise ValueError("Duplicate observed response identifier.")
        if identifier is not None:
            used_ids.add(identifier)
        if observed["status"] in FAILED:
            if observed["raw"] is not None or observed["answer"] is not None or observed["confidence"] is not None or not observed["error"]:
                raise ValueError("Failure record contains answer data or lacks failure code.")
        elif not isinstance(observed["raw"],str) or any(observed[k]!=v for k,v in parse(observed["raw"],observed["finishReason"]).items()):
            raise ValueError("Parsed response differs from recorded evidence.")
        d=request["design"]
        label=observed["answer"]
        i=d["mapping"]["labels"].index(label) if label is not None else None
        answer=IDS[i] if i is not None else None
        result.append({"sequence":request["sequence"],"taskId":d["taskId"],"family":d["family"],"presentation":d["presentation"],
                       "cue":d["cue"],"target":d["target"],"arm":request["arm"],"replicate":request["replicate"],
                       "status":observed["status"],"answer":label,"canonical":answer,"truth":truth[d["taskId"]],
                       "position":1+d["mapping"]["physical"].index(str(i)) if i is not None else None,
                       "grammarPosition":1+d["mapping"]["grammar"].index(label) if label else None,
                       "correct":int(answer==truth[d["taskId"]]) if answer is not None else None,
                       "confidence":observed["confidence"]})
    return result, schedule


def payload(stage, observations):
    scores, schedule=scoring(stage,observations)
    data={"responses.ndjson":b"".join(json_bytes(r) for r in observations),
          "scores.json":json_bytes({"rows":scores}),"schedule.json":json_bytes(schedule)}
    config=load(SETTINGS)
    if stage=="decoding":
        data["analysis.json"]=json_bytes(decode(scores,config["analysis"],config["ensembleGate"]))
    elif stage=="cross-model":
        source=REGISTERED/"scores.json"
        if file_hash(source)!=load(REGISTERED/"manifest.json")["outputs"]["scores.json"]["sha256"]:
            raise ValueError("Matched SmolLM2 baseline archive differs.")
        reference=load(source)["rows"]
        for old, new, req in zip(reference,scores,schedule,strict=True):
            key=("taskId","presentation","cue","truth","target")
            if any(old[k]!=new[k] for k in key) or old["sequence"]!=req["referenceSequence"]:
                raise ValueError("Previously recorded responses are not matched to the new schedule.")
        result=compare_models(scores,reference,config["analysis"])
        result["matchedSmolScoresSha256"]=file_hash(source)
        data["analysis.json"]=json_bytes(result)
    return data


def build(stage):
    target=BASE/DIRS[stage]
    if target.exists():
        raise FileExistsError("Archive already exists.")
    db_path=LOCAL_ROOT/stage/"observations.sqlite"
    with closing(sqlite3.connect(db_path.as_uri()+"?mode=ro",uri=True)) as db:
        meta=json.loads(db.execute("SELECT data FROM metadata WHERE id=1").fetchone()[0])
        observed=[json.loads(raw) for raw, in db.execute("SELECT data FROM record ORDER BY sequence")]
        peak,preflight=db.execute("SELECT max(peakBytes),min(preflightRamGiB) FROM measures").fetchone()
    if meta!=metadata(stage):
        raise ValueError("Archive requires the original checkout and input hashes.")
    records=payload(stage,observed)
    manifest={"classification":"development-actual-model" if "development" in stage else "registered-actual-model",
              "execution":meta,"status":"partial" if any(r["status"]=="notAttempted" for r in observed) else "completed",
              "planned":len(observed),"actualResponses":sum(r["raw"] is not None for r in observed),
              "statusCounts":dict(Counter(r["status"] for r in observed)),
              "startedUtc":observed[0]["timestamp"],"lastRequestUtc":observed[-1]["timestamp"],
              "peakServerWorkingSetBytes":peak,"preflightRamGiB":preflight,"additionalCostUsd":0,
              "environment":"Windows x86-64 · pinned CPU runtime · loopback",
              "outputs":{name:{"sha256":sha256(data).hexdigest(),"bytes":len(data)} for name,data in records.items()}}
    records["manifest.json"]=json_bytes(manifest)
    with tempfile.TemporaryDirectory(prefix=".p3-",dir=BASE) as directory:
        stage_dir=Path(directory)/"archive"
        stage_dir.mkdir()
        for name,data in records.items():
            (stage_dir/name).write_bytes(data)
        stage_dir.rename(target)
    print(f"Archived {manifest['actualResponses']} genuine outputs for {stage}.")


def verify(stage):
    prepare()
    folder=BASE/DIRS[stage]
    manifest=load(folder/"manifest.json")
    execution=manifest["execution"]
    if {**metadata(stage),"sourceCommit":execution["sourceCommit"]}!=execution:
        raise ValueError("Published inputs differ from frozen hashes.")
    observed=[json.loads(raw) for raw in (folder/"responses.ndjson").read_bytes().splitlines()]
    if (manifest["planned"],manifest["actualResponses"],manifest["statusCounts"])!=(
        len(observed),sum(r["raw"] is not None for r in observed),dict(Counter(r["status"] for r in observed))):
        raise ValueError("Manifest coverage differs from archive.")
    for name,data in payload(stage,observed).items():
        checked={"bytes":len(data),"sha256":sha256(data).hexdigest()}
        if checked!=manifest["outputs"][name] or (folder/name).read_bytes()!=data:
            raise ValueError("Published output differs from verified computation: "+name)
    print(f"Verified {stage}: {manifest['actualResponses']} actual responses and {len(manifest['outputs'])} digests.")


if __name__=="__main__":
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("command",choices=("build","verify"))
    cli.add_argument("stage",choices=STAGES)
    args=cli.parse_args()
    (build if args.command=="build" else verify)(args.stage)
