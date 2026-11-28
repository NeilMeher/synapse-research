"""Create and verify the immutable MIRAGE pilot archive without executing inference."""
import argparse
from datetime import datetime, timedelta
from hashlib import sha256
import json
import os
import platform
import re
import tempfile

from empirical.analysis import analyze
from empirical.inference import digest, file_hash, json_bytes, parse
from empirical.run import HERE, PROTOCOL_FILE, PROMPT_FILE, effective_order, load, messages_for, prepare, provenance, read_journal, split_paths

ARCHIVE = HERE / "archives" / "mirage-empirical-pilot-001"
FILES = ("responses.ndjson", "scores.json", "analysis.json")
STATUSES = {"scorable", "abstention", "missingConfidence", "missingAnswer", "invalidOutput",
            "explicitRefusal", "truncated", "timeout", "interrupted", "infrastructureFailure"}
FAILURES = {"timeout", "interrupted", "infrastructureFailure"}


def score(records):
    dataset_path, key_path = split_paths("pilot")
    dataset, key = load(dataset_path), load(key_path)
    prompt = load(PROMPT_FILE)
    plan = list(effective_order(dataset))
    if len(records) != len(plan):
        raise ValueError("The response archive does not cover the full frozen plan.")
    truth = {row["id"]: row for row in key}
    ids = set()
    scores = []
    for expected, (record, (task, condition)) in enumerate(zip(records, plan), 1):
        if (record["evidence"], record["schemaVersion"], record["replicate"]) != ("actual-model-execution", 1, 1):
            raise ValueError("Only the registered actual-model observation class can enter the pilot.")
        if (record["sequence"], record["taskId"], record["taskFamily"], record["condition"], record["requestSha256"]) != (
                expected, task["id"], task["family"], condition, digest(messages_for(task, condition, prompt))):
            raise ValueError("Observation order, task, condition or request digest mismatch.")
        status, raw = record["status"], record["raw"]
        if status not in STATUSES or (status in FAILURES) != (raw is None):
            raise ValueError("Invalid observation status.")
        if status in FAILURES:
            if record["answer"] is not None or record["confidence"] is not None or not record["error"]:
                raise ValueError("Infrastructure failure contains an answer or lacks its error code.")
        else:
            parsed = parse(raw, record["finishReason"])
            if any(record[key] != value for key, value in parsed.items()) or record["error"] is not None:
                raise ValueError("The observed parse differs from the frozen parser.")
        identifier = record["id"]
        if status != "interrupted":
            if not isinstance(identifier, str) or not identifier or identifier in ids:
                raise ValueError("Missing or repeated observation identifier.")
            ids.add(identifier)
        answer = record["answer"]
        scores.append({"taskId": task["id"], "taskFamily": task["family"], "condition": condition,
                       "status": status, "answer": answer, "truth": truth[task["id"]]["correct"],
                       "correct": None if answer is None else int(answer == truth[task["id"]]["correct"]),
                       "confidence": record["confidence"]})
    return scores


def assemble(meta, records, environment):
    expected = provenance("pilot")
    if not re.fullmatch(r"[0-9a-f]{40}", meta["sourceCommit"]):
        raise ValueError("The source commit is missing.")
    if {**expected, "sourceCommit": meta["sourceCommit"]} != meta:
        raise ValueError("The archive inputs do not match the frozen protocol or dataset.")
    scores = score(records)
    analysis = analyze(scores, load(split_paths("pilot")[0]), load(PROTOCOL_FILE)["analysis"])
    content = {"responses.ndjson": b"".join(json_bytes(row) for row in records),
               "scores.json": json_bytes({"scoringVersion": "mirage-score-v1", "rows": scores}),
               "analysis.json": json_bytes(analysis)}
    start = datetime.fromisoformat(records[0]["timestamp"])
    end = max(datetime.fromisoformat(row["timestamp"]) + timedelta(milliseconds=row["latencyMs"] or 0) for row in records)
    counts = {name: {key: arm[key] for key in ("planned", "answered", "scorable", "statuses")}
              for name, arm in analysis["conditions"].items()}
    manifest = {"schemaVersion": 1, "status": "completed", "execution": meta, "executionEnvironment": environment,
                "startedUtc": start.isoformat(timespec="milliseconds"), "endedUtc": end.isoformat(timespec="milliseconds"),
                "elapsedSeconds": round((end-start).total_seconds(), 3), "additionalCostUsd": 0,
                "scoringVersion": "mirage-score-v1", "analysisVersion": analysis["analysisVersion"],
                "counts": counts, "outputs": {name: {"sha256": sha256(content[name]).hexdigest(), "bytes": len(content[name])}
                                             for name in FILES},
                "scope": "One quantized model and four task families. Exploratory. External human review pending."}
    return manifest, content


def archive():
    if ARCHIVE.exists():
        raise FileExistsError("The pilot archive already exists; verification never overwrites it.")
    meta, records = read_journal("pilot")
    environment = {"os": platform.system(), "architecture": platform.machine(), "python": platform.python_version(),
                   "execution": "local CPU, no offload", "runtime": meta["model"]["runtime"]}
    manifest, content = assemble(meta, records, environment)
    ARCHIVE.parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".package-", dir=ARCHIVE.parent) as staging:
        from pathlib import Path
        bundle = Path(staging) / "bundle"
        bundle.mkdir()
        for name, payload in {**content, "manifest.json": json_bytes(manifest)}.items():
            (bundle / name).write_bytes(payload)
        bundle.rename(ARCHIVE)


def verify():
    prepare()
    manifest = load(ARCHIVE / "manifest.json")
    records = [json.loads(line) for line in (ARCHIVE / "responses.ndjson").read_bytes().splitlines()]
    regenerated, content = assemble(manifest["execution"], records, manifest["executionEnvironment"])
    if manifest != regenerated or any((ARCHIVE / name).read_bytes() != payload for name, payload in content.items()):
        raise ValueError("Empirical archive does not match verified scoring, summaries and artifact digests.")
    print(f"Verified {manifest['execution']['studyId']} with {len(records)} planned responses and three artifact digests.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("archive", "verify"))
    args = parser.parse_args()
    (archive if args.command == "archive" else verify)()
