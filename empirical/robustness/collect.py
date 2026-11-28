"""Run a frozen schedule against the verified local chat adapter."""
import argparse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
import time

from empirical.inference import digest, file_hash, json_bytes, now, serve
from empirical.run import LOCAL, PROTOCOL_FILE, git, journal, load, lock
from empirical.robustness.design import PROMPT_FILE, SETTINGS, file_paths, prepare, render

PROTOCOL = SETTINGS.parents[2] / "research/mirage-robustness-protocol.md"
DIRECTORY = "mirage-empirical-robustness-002"


def metadata(split):
    config = load(PROTOCOL_FILE)
    balance = (SETTINGS.parent/"inputs/heldout.balance.json",) if split=="heldout" else ()
    return {"studyId": DIRECTORY, "sourceCommit": git("rev-parse", "HEAD"),
            "split":split,"version":load(SETTINGS)["version"], "model":config["model"],
            "generation":config["generation"],"runtime":config["runtime"],
            "files": {path.name:file_hash(path) for path in (*file_paths(split), *balance, PROTOCOL_FILE, SETTINGS, PROMPT_FILE, PROTOCOL)},
            "inferenceConfigSha256":digest([config["generation"],config["runtime"]])}


def pending(status, stamp):
    return {"id":None,"timestamp":stamp,"raw":None,"finishReason":None,"answer":None,
            "confidence":None,"providerResponseId":None,"tokens":None,"error":status,
            "latencyMs":None,"status":status}


def peak_working_set(pid):
    """Windows subprocess peak working set, in bytes."""
    if pid is None:
        return None
    import ctypes
    from ctypes import wintypes
    class Counters(ctypes.Structure):
        _fields_ = [("size",wintypes.DWORD),("faults",wintypes.DWORD)] + [
            (name, ctypes.c_size_t) for name in ("peak","working","qpp","qp","qnp","qn","page","peakPage")]
    kernel, psapi = ctypes.windll.kernel32, ctypes.windll.psapi
    kernel.OpenProcess.argtypes = [wintypes.DWORD,wintypes.BOOL,wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE,ctypes.POINTER(Counters),wintypes.DWORD]
    handle = kernel.OpenProcess(0x0410,False,pid)
    if not handle:
        return None
    result = Counters()
    result.size = ctypes.sizeof(result)
    try:
        return result.peak if psapi.GetProcessMemoryInfo(handle,ctypes.byref(result),result.size) else None
    finally:
        kernel.CloseHandle(handle)


def collect(split, runtime, weights, commit):
    prepare(create=split=="development")
    paths = ("empirical/robustness","empirical/inference.py","empirical/run.py",
             "empirical/mirage-pilot-v1.json","research/mirage-robustness-protocol.md","schemas/empirical-robustness-v1.json")
    if split == "heldout" and (commit!=git("rev-parse","HEAD") or git("status","--porcelain","--",*paths)):
        raise ValueError("Held-out inference requires the exact clean freeze revision.")
    settings, config, prompt = load(SETTINGS), load(PROTOCOL_FILE), load(PROMPT_FILE)
    task_path, _, schedule_path = file_paths(split)
    plan=load(schedule_path)
    tasks={task["id"]:task for task in load(task_path)["tasks"]}
    if len(plan)!=settings[split]["requests"] or settings["budget"]["retries"]!=0 or config["runtime"]["tools"]:
        raise ValueError("Request plan differs from registered budget.")
    local=LOCAL / DIRECTORY / split
    local.mkdir(parents=True,exist_ok=True)
    with lock(local/"collector.lock"), journal(local/"observations.sqlite",metadata(split)) as db:
        db.execute("CREATE TABLE IF NOT EXISTS measures (peakWorkingSet INTEGER)")
        previous={i:(stamp,raw) for i,stamp,raw in db.execute("SELECT * FROM record ORDER BY sequence")}
        if len(previous)==len(plan) and all(raw is not None for _,raw in previous.values()):
            print("Every planned stage is already journaled.")
            return
        failure_count=0
        start=time.monotonic()
        first_stamp=next(iter(previous.values()))[0] if previous else None
        with serve(runtime,weights,config,local/"runtime.log") as adapter:
            for request in plan:
                seq=request["sequence"]
                if seq in previous and previous[seq][1] is not None:
                    continue
                stamp=now()
                if first_stamp is None:
                    first_stamp=stamp
                if seq in previous:
                    observation=pending("interrupted",previous[seq][0])
                else:
                    db.execute("INSERT INTO record VALUES (?, ?, NULL)",(seq,stamp))
                    elapsed=(datetime.now(timezone.utc)-datetime.fromisoformat(first_stamp)).total_seconds()
                    if elapsed>settings["budget"]["maximumSeconds"] or failure_count>=settings["budget"]["consecutiveInfrastructureFailures"]:
                        observation=pending("notAttempted",stamp)
                    else:
                        messages, grammar=render(tasks[request["taskId"]],request,prompt)
                        if digest({"messages":messages,"grammar":grammar})!=request["requestSha256"]:
                            raise ValueError("Rendered request differs from the registered plan.")
                        observation=adapter.infer(messages,grammar)
                        failure_count=failure_count+1 if observation["status"] in ("timeout","infrastructureFailure") else 0
                observation.update(sequence=seq,requestSha256=request["requestSha256"],evidence="actual-model-request")
                db.execute("UPDATE record SET data=? WHERE sequence=?",(json_bytes(observation).decode(),seq))
                if seq%32==0 or seq==len(plan):
                    print(f"{split}: {seq}/{len(plan)} journaled ({time.monotonic()-start:.1f}s)",flush=True)
            db.execute("INSERT INTO measures VALUES (?)",(peak_working_set(getattr(adapter,"pid",None)),))
        import json
        results=[json.loads(raw) for raw, in db.execute("SELECT data FROM record ORDER BY sequence")]
    metrics=Counter(row["status"] for row in results)
    latencies=[row["latencyMs"] for row in results if row["latencyMs"] is not None]
    if latencies:
        print(f"Median request latency {median(latencies):.1f} ms")
    print(dict(metrics))


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--split",required=True,choices=("development","heldout"))
    cli.add_argument("--runtime",required=True,type=Path)
    cli.add_argument("--weights",required=True,type=Path)
    cli.add_argument("--freeze-commit")
    arg=cli.parse_args()
    collect(arg.split,arg.runtime,arg.weights,arg.freeze_commit)


if __name__=="__main__":
    main()
