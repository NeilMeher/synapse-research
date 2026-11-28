"""Package immutable raw responses, score records and analysis."""
import argparse
from collections import Counter
from contextlib import closing
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import tempfile

from empirical.inference import digest, json_bytes, parse
from empirical.run import LOCAL, load
from empirical.robustness.analysis import study
from empirical.robustness.collect import DIRECTORY, metadata
from empirical.robustness.design import HERE, IDS, SETTINGS, file_paths, prepare

ARCHIVES=HERE.parent/"archives"
REGISTERED=ARCHIVES/DIRECTORY
FAILED={"infrastructureFailure","timeout","interrupted","notAttempted"}


def scoring(rows, split):
    task_path,key_path,plan_path=file_paths(split)
    plan=load(plan_path)
    keys={r["id"]:r["correct"] for r in load(key_path)}
    if len(rows)!=len(plan):
        raise ValueError("Response count differs from the full plan.")
    scores=[]
    seen=set()
    for observed,request in zip(rows,plan,strict=True):
        if observed["evidence"]!="actual-model-request":
            raise ValueError("Only genuine actual-model request evidence is eligible.")
        if (observed["sequence"],observed["requestSha256"])!=(request["sequence"],request["requestSha256"]):
            raise ValueError("The response does not match the planned request.")
        raw=observed["raw"]
        if observed["status"] in FAILED:
            if raw is not None or observed["answer"] is not None or observed["confidence"] is not None or not observed["error"]:
                raise ValueError("Invalid record of a failed or unattempted request.")
        elif not isinstance(raw,str) or any(observed[k]!=v for k,v in parse(raw,observed["finishReason"]).items()):
            raise ValueError("Response differs from the registered parse.")
        identifier=observed["id"]
        if identifier is not None:
            if identifier in seen:
                raise ValueError("An observation identifier was repeated.")
            seen.add(identifier)
        label=observed["answer"]
        mapping=request["mapping"]
        ix=mapping["labels"].index(label) if label else None
        truth=keys[request["taskId"]]
        canonical=IDS[ix] if ix is not None else None
        target=request["target"]
        scores.append({"sequence":request["sequence"],"taskId":request["taskId"],"family":request["family"],
                       "cue":request["cue"],"presentation":request["presentation"],"target":target,"truth":truth,
                       "targetLabel":mapping["labels"][IDS.index(target)] if target else None,
                       "answer":label,"canonical":canonical,"status":observed["status"],
                       "position":mapping["physical"].index(str(ix))+1 if ix is not None else None,
                       "grammarPosition":mapping["grammar"].index(label)+1 if label else None,
                       "correct":int(canonical==truth) if canonical is not None else None,
                       "confidence":observed["confidence"],"rawPresent":raw is not None,
                       "rawSha256":digest(raw) if raw is not None else None})
    return scores,plan


def pack_content(rows,split):
    scores,plan=scoring(rows,split)
    payload={"responses.ndjson":b"".join(json_bytes(row) for row in rows),
             "scores.json":json_bytes({"version":"mirage-robustness-scores-v1","rows":scores})}
    if split=="heldout":
        payload["analysis.json"]=json_bytes(study(scores,plan,load(SETTINGS)["analysis"]))
    return payload


def archive_path(split):
    return REGISTERED if split=="heldout" else ARCHIVES/(DIRECTORY+"-development")


def build(split):
    target=archive_path(split)
    if target.exists():
        raise FileExistsError("An existing archive is immutable.")
    db_path=LOCAL/DIRECTORY/split/"observations.sqlite"
    with closing(sqlite3.connect(db_path.as_uri()+"?mode=ro",uri=True)) as db:
        meta=json.loads(db.execute("SELECT data FROM metadata WHERE id=1").fetchone()[0])
        rows=[json.loads(raw) for raw, in db.execute("SELECT data FROM record ORDER BY sequence")]
        peak=db.execute("SELECT max(peakWorkingSet) FROM measures").fetchone()[0]
    if split=="heldout" and metadata(split)!=meta:
        raise ValueError("Held-out archive requires the original source and inputs.")
    payload=pack_content(rows,split)
    envelope={"classification":"registered-actual-model" if split=="heldout" else "development-actual-model",
              "execution":meta,"status":"partial" if any(r["status"]=="notAttempted" for r in rows) else "completed",
              "planned":len(rows),"actualResponses":sum(r["raw"] is not None for r in rows),
              "statusCounts":dict(Counter(r["status"] for r in rows)),
              "firstAttemptUtc":rows[0]["timestamp"],"lastRecordUtc":rows[-1]["timestamp"],
              "peakServerWorkingSetBytes":peak,"executionEnvironment":"Windows x86-64 · local CPU · no GPU layers",
              "additionalCostUsd":0,"analysisVersion":"mirage-robustness-analysis-v1" if split=="heldout" else None,
              "outputs":{name:{"sha256":sha256(content).hexdigest(),"bytes":len(content)} for name,content in payload.items()}}
    payload["manifest.json"]=json_bytes(envelope)
    with tempfile.TemporaryDirectory(prefix=".robust-",dir=ARCHIVES) as temp:
        staging=Path(temp)/"bundle"
        staging.mkdir()
        for name,data in payload.items():
            (staging/name).write_bytes(data)
        staging.rename(target)
    print(f"Archived {split}: {envelope['actualResponses']} actual outputs for {len(rows)} planned.")


def verify(split):
    prepare()
    target=archive_path(split)
    manifest=load(target/"manifest.json")
    meta=manifest["execution"]
    if split=="heldout" and {**metadata(split),"sourceCommit":meta["sourceCommit"]}!=meta:
        raise ValueError("The registered input digests differ.")
    rows=[json.loads(line) for line in (target/"responses.ndjson").read_bytes().splitlines()]
    outputs=pack_content(rows,split)
    if manifest["planned"]!=len(rows) or manifest["statusCounts"]!=dict(Counter(r["status"] for r in rows)):
        raise ValueError("Incorrect manifest counts.")
    if manifest["actualResponses"]!=sum(r["raw"] is not None for r in rows):
        raise ValueError("Incorrect genuine response count.")
    for name,data in outputs.items():
        rec=manifest["outputs"][name]
        if (target/name).read_bytes()!=data or rec!={"sha256":sha256(data).hexdigest(),"bytes":len(data)}:
            raise ValueError(f"Archive digest or checked output differs: {name}")
    print(f"Verified {split} archive: {manifest['actualResponses']} genuine outputs, {len(outputs)} digests.")


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command",choices=("build","verify"))
    parser.add_argument("--split",choices=("development","heldout"),required=True)
    args=parser.parse_args()
    (build if args.command=="build" else verify)(args.split)
