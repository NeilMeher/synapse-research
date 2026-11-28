"""Run bounded local inference and persist every completed or missing request."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import json
import os
from statistics import median
import time

from empirical.inference import LocalChat, digest, file_hash, json_bytes, now, serve
from empirical.run import LOCAL, PROTOCOL_FILE, git, journal, load, lock
from empirical.robustness.collect import peak_working_set, pending
from empirical.robustness.design import PROMPT_FILE, file_paths
from empirical.phase3.design import ROOT, SETTINGS, STAGES, build_plan, prepare, render_request, request_file

PROJECT=ROOT.parents[1]
DECODING_PROTOCOL=PROJECT/"research/mirage-decoding-protocol.md"
QWEN_PROTOCOL=PROJECT/"research/mirage-cross-model-protocol.md"
LOCAL_ROOT=LOCAL/"phase3"
ERRORS={"timeout","infrastructureFailure"}


def is_qwen(stage):
    return stage in ("cross-model","qwen-development")


def model_config(stage):
    config=load(PROTOCOL_FILE)
    if is_qwen(stage):
        config["model"]={**config["model"],**load(SETTINGS)["qwen"]["model"]}
    return config


def preflight_qwen():
    if os.name!="nt":
        raise RuntimeError("The pinned Phase III runtime is Windows x86-64.")
    import ctypes
    from ctypes import wintypes
    class Status(ctypes.Structure):
        _fields_=[("size",wintypes.DWORD),("load",wintypes.DWORD)]+[
            (name,ctypes.c_ulonglong) for name in ("total","available","pageTotal","pageAvailable","virtTotal","virtFree","extended")]
    data=Status()
    data.size=ctypes.sizeof(data)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(data)):
        raise OSError("Host memory preflight was unavailable.")
    available=data.available/(1024**3)
    threshold=load(SETTINGS)["qwen"]["minimumFreeRamGiB"]
    if available<threshold:
        raise RuntimeError(f"Qwen preflight: {available:.2f} GiB available, below the registered {threshold:.2f} GiB.")
    return round(available,3)


def metadata(stage):
    model=model_config(stage)
    protocol=QWEN_PROTOCOL if is_qwen(stage) else DECODING_PROTOCOL
    # Public manifests contain only basenames and byte hashes.
    files=(SETTINGS,PROMPT_FILE,PROTOCOL_FILE,protocol,request_file(stage))
    if stage in ("decoding","cross-model"):
        files+=file_paths("heldout")
    return {"stage":stage,"studyId":load(SETTINGS)["qwen" if is_qwen(stage) else "decoding"]["id"],
            "sourceCommit":git("rev-parse","HEAD"),"files":{path.name:file_hash(path) for path in files},
            "plan":load(request_file(stage)),"model":model["model"],"runtime":model["runtime"],
            "seedPolicy":"exact request plan","transport":"local HTTP loopback"}


def now_age(stamp):
    return (datetime.now(timezone.utc)-datetime.fromisoformat(stamp)).total_seconds()


def collect(stage, runtime, weights, freeze_commit):
    prepare()
    if stage in ("decoding","cross-model"):
        guarded=("empirical/phase3","empirical/run.py","empirical/inference.py","empirical/robustness/design.py",
                 "empirical/robustness/inputs","research/mirage-decoding-protocol.md","research/mirage-cross-model-protocol.md")
        if freeze_commit!=git("rev-parse","HEAD") or git("status","--porcelain","--",*guarded):
            raise ValueError("Registered inference needs the exact committed and clean protocol freeze.")
    config=model_config(stage)
    resource=preflight_qwen() if is_qwen(stage) else None
    budget=load(SETTINGS)["qwen" if is_qwen(stage) else "decoding"]
    tasks,_,plan=build_plan(stage)
    lookup={task["id"]:task for task in tasks}
    local=LOCAL_ROOT/stage
    local.mkdir(parents=True,exist_ok=True)
    with lock(local/"collector.lock"),journal(local/"observations.sqlite",metadata(stage)) as db:
        db.execute("CREATE TABLE IF NOT EXISTS measures (peakBytes INTEGER, preflightRamGiB REAL)")
        previous={seq:(stamp, raw) for seq,stamp,raw in db.execute("SELECT * FROM record ORDER BY sequence")}
        if len(previous)==len(plan) and all(raw is not None for _,raw in previous.values()):
            print(f"{stage} already journaled; no inference repeated.")
            return
        start=time.monotonic()
        first_stamp=next(iter(previous.values()))[0] if previous else None
        streak=0
        previous_records=(raw for _,raw in reversed(previous.values()))
        for raw in previous_records:
            if raw is None or json.loads(raw)["status"] not in ERRORS:
                break
            streak+=1
        with serve(runtime,weights,config,local/"runtime.log") as server:
            for item in plan:
                seq=item["sequence"]
                if seq in previous and previous[seq][1] is not None:
                    continue
                stamp=now()
                if first_stamp is None:
                    first_stamp=stamp
                if seq in previous:
                    observation=pending("interrupted",previous[seq][0])
                else:
                    db.execute("INSERT INTO record VALUES (?, ?, NULL)",(seq,stamp))
                    if streak>=budget["maxInfrastructureFailures"] or now_age(first_stamp)>budget["maximumSeconds"]:
                        observation=pending("notAttempted",stamp)
                    else:
                        messages,grammar=render_request(lookup[item["design"]["taskId"]],item)
                        settings=item["generation"]
                        if digest({"messages":messages,"grammar":grammar,"generation":settings})!=item["requestSha256"]:
                            raise ValueError("Request does not match frozen fingerprint.")
                        observation=LocalChat(server.port,{**config,"generation":settings}).infer(messages,grammar)
                        streak=streak+1 if observation["status"] in ERRORS else 0
                observation.update(sequence=seq,requestSha256=item["requestSha256"],evidence="actual-model-request")
                db.execute("UPDATE record SET data=? WHERE sequence=?",(json_bytes(observation).decode(),seq))
                if seq%32==0 or seq==len(plan):
                    print(f"{stage}: {seq}/{len(plan)} journaled in {time.monotonic()-start:.1f}s",flush=True)
            db.execute("INSERT INTO measures VALUES (?, ?)",(peak_working_set(server.pid),resource))
        records=[json.loads(raw) for raw, in db.execute("SELECT data FROM record ORDER BY sequence")]
    latencies=[r["latencyMs"] for r in records if r["latencyMs"] is not None]
    print("Statuses:",dict(Counter(r["status"] for r in records)))
    if latencies:
        print(f"Median request latency {median(latencies):.3f} ms")


if __name__=="__main__":
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("stage",choices=STAGES)
    cli.add_argument("--runtime",required=True,type=Path)
    cli.add_argument("--weights",required=True,type=Path)
    cli.add_argument("--freeze-commit")
    args=cli.parse_args()
    collect(args.stage,args.runtime,args.weights,args.freeze_commit)
