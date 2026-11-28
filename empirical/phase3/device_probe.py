"""Four matched SmolLM2 development requests on the portable Vulkan backend."""
import argparse
from pathlib import Path
from statistics import median
import json
import os
import subprocess
import time

from empirical.inference import LocalChat, file_hash, json_bytes, serve
from empirical.run import git, load
from empirical.robustness.collect import peak_working_set
from empirical.phase3.archive import BASE, DIRS
from empirical.phase3.collect import LOCAL_ROOT, model_config
from empirical.phase3.design import ROOT, build_plan, render_request

BACKEND_SHA="be304a70b0ba5b5a4a8f98ab5a43e7a61cd78186ed27bdd258914881f89e9601"
ZIP_SHA="57f0d96e28222142112cd47e49b6c3519b0df692caa837e2f7239456f1781110"
PUBLISHED=ROOT/"vulkan-development.json"


def vram():
    result=subprocess.check_output(["nvidia-smi","--query-gpu=memory.used","--format=csv,noheader,nounits"],text=True)
    return int(result.splitlines()[0].strip())


def cpu_records():
    folder=BASE/DIRS["development"]
    manifest=load(folder/"manifest.json")
    path=folder/"responses.ndjson"
    expected=manifest["outputs"]["responses.ndjson"]["sha256"]
    if file_hash(path)!=expected:
        raise ValueError("Archived CPU outputs differ.")
    return {r["requestSha256"]:r for r in map(json.loads,path.read_bytes().splitlines())},expected


def derive(data):
    cpu, expected=cpu_records()
    if data["cpuResponseDigest"]!=expected or len(data["records"])!=4:
        raise ValueError("The GPU probe must have four matched CPU benchmark requests.")
    rows=data["records"]
    paired=[(cpu[x["response"]["requestSha256"]],x["response"]) for x in rows]
    if any(a["raw"] is None or b["raw"] is None for a,b in paired):
        raise ValueError("An incomplete GPU probe needs a separately labelled interrupted archive.")
    vram_peak=max(r["gpuUsedMiB"] for r in rows)
    return {"cpuMedianMs":median(a["latencyMs"] for a,b in paired),
            "gpuMedianMs":median(b["latencyMs"] for a,b in paired),
            "scorableGpu":sum(b["status"]=="scorable" for a,b in paired),
            "identicalRaw":sum(a["raw"]==b["raw"] for a,b in paired),
            "sameAnswer":sum(a["answer"]==b["answer"] and a["answer"] is not None for a,b in paired),
            "gpuPeakSampledUsedMiB":vram_peak,"gpuUsedChangeMiB":vram_peak-data["gpuUsedIdleMiB"],
            "cpuOutputTokensPerRequestSecond":1000*sum(a["tokens"]["output"] for a,b in paired)/sum(a["latencyMs"] for a,b in paired),
            "gpuOutputTokensPerRequestSecond":1000*sum(b["tokens"]["output"] for a,b in paired)/sum(b["latencyMs"] for a,b in paired)}


def run(runtime, weights, package):
    if PUBLISHED.exists():
        raise FileExistsError("Existing device observations are immutable.")
    if file_hash(package)!=ZIP_SHA or file_hash(runtime/"ggml-vulkan.dll")!=BACKEND_SHA:
        raise ValueError("The backend differs from the verified portable release.")
    tasks,_,plan=build_plan("development")
    pending=[row for row in plan if row["arm"]=="greedy"]
    lookup={task["id"]:task for task in tasks}
    _,cpu_sha=cpu_records()
    config=model_config("development")
    config["runtime"]["gpuLayers"]=99
    local=LOCAL_ROOT/"vulkan-development"
    local.mkdir(parents=True,exist_ok=True)
    used=vram()
    rows=[]
    start=time.perf_counter()
    with (local/"responses.ndjson").open("xb") as journal, serve(runtime,weights,config,local/"runtime.log") as server:
        startup=round((time.perf_counter()-start)*1000,3)
        for request in pending:
            messages,grammar=render_request(lookup[request["design"]["taskId"]],request)
            observation=LocalChat(server.port,{**config,"generation":request["generation"]}).infer(messages,grammar)
            observation.update(sequence=request["sequence"],evidence="actual-model-request",requestSha256=request["requestSha256"])
            entry={"taskId":request["design"]["taskId"],"gpuUsedMiB":vram(),"response":observation}
            journal.write(json_bytes(entry))
            journal.flush()
            os.fsync(journal.fileno())
            rows.append(entry)
        peak=peak_working_set(server.pid)
    bundle={"classification":"development-actual-model","studyId":"mirage-phase3-vulkan-development",
            "sourceCommit":git("rev-parse","HEAD"),"model":config["model"],"runtime":config["runtime"],"gpu":"GeForce GTX 1650",
            "driver":"531.79","backendSha256":BACKEND_SHA,"vulkanPackageSha256":ZIP_SHA,"cpuResponseDigest":cpu_sha,
            "gpuUsedIdleMiB":used,"peakServerWorkingSetBytes":peak,"startupMsIncludingHashCheck":startup,
            "additionalCostUsd":0,"records":rows}
    bundle["metrics"]=derive(bundle)
    with PUBLISHED.open("xb") as saved:
        saved.write(json_bytes(bundle))
    print(bundle["metrics"])


if __name__=="__main__":
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--verify",action="store_true")
    cli.add_argument("--runtime",type=Path)
    cli.add_argument("--weights",type=Path)
    cli.add_argument("--package",type=Path)
    args=cli.parse_args()
    if args.verify:
        source=load(PUBLISHED)
        if source["classification"]!="development-actual-model" or source["metrics"]!=derive(source):
            raise ValueError("GPU development archive differs.")
        print("Verified four genuine Vulkan development responses.")
    else:
        run(args.runtime,args.weights,args.package)
