"""Prepare frozen inputs and collect bounded model responses to a recoverable local journal."""
import argparse
from contextlib import closing, contextmanager
import json
import os
from pathlib import Path
import sqlite3
import subprocess
from datetime import datetime
import time

from empirical.inference import digest, file_hash, json_bytes, now, serve
from empirical.tasks import SPLITS, generate

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / "empirical"
PROTOCOL_FILE = HERE / "mirage-pilot-v1.json"
PROMPT_FILE = HERE / "prompt-v2.json"
PROTOCOL_TEXT = ROOT / "research/mirage-empirical-protocol.md"
DATA = HERE / "datasets"
LOCAL = ROOT / ".empirical-local"
CONDITIONS = ("neutral", "incorrectCue")


def load(path):
    return json.loads(path.read_bytes())


def write_new(path, obj):
    with path.open("xb") as stream:
        stream.write(json_bytes(obj))


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def split_paths(split):
    return DATA / f"{split}.tasks.json", DATA / f"{split}.key.json"


def prepare():
    DATA.mkdir(exist_ok=True)
    for split in SPLITS:
        for path, expected in zip(split_paths(split), generate(split)):
            if not path.exists():
                write_new(path, expected)
            if path.read_bytes() != json_bytes(expected):
                raise ValueError(f"Frozen dataset differs from generator: {path.name}")


def messages_for(task, condition, prompt):
    if condition not in CONDITIONS:
        raise ValueError("Unknown condition")
    options = "\n".join(f"{key}. {value}" for key, value in task["options"].items())
    cue = prompt["cue"].format(option=task["incorrectCueOption"]) if condition == "incorrectCue" else ""
    user = prompt["question"].format(question=task["question"], options=options, cue=cue)
    return [{"role": "system", "content": prompt["system"]}, {"role": "user", "content": user}]


def effective_order(dataset):
    for task in dataset["tasks"]:
        for condition in (CONDITIONS[::-1] if task["misleadingFirst"] else CONDITIONS):
            yield task, condition


@contextmanager
def lock(path):
    """Prevent concurrent collectors; the OS unlocks the byte when the process exits."""
    with path.open("a+b") as handle:
        if path.stat().st_size == 0:
            handle.write(b"\0")
            handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


@contextmanager
def journal(path, metadata):
    with closing(sqlite3.connect(path, isolation_level=None)) as db:
        db.execute("PRAGMA journal_mode=DELETE")
        db.execute("PRAGMA synchronous=FULL")
        db.execute("CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS record (sequence INTEGER PRIMARY KEY, started TEXT NOT NULL, data TEXT)")
        db.execute("INSERT OR IGNORE INTO metadata VALUES (1, ?)", (json_bytes(metadata).decode(),))
        previous = json.loads(db.execute("SELECT data FROM metadata WHERE id=1").fetchone()[0])
        if previous != metadata:
            raise ValueError("Journal provenance differs from the approved inputs or source revision.")
        yield db


def provenance(split):
    dataset_path, key_path = split_paths(split)
    protocol = load(PROTOCOL_FILE)
    return {"studyId": protocol["studyId"], "protocolVersion": protocol["version"],
            "classification": protocol["classification"], "split": split,
            "datasetVersion": load(dataset_path)["datasetVersion"], "datasetSha256": file_hash(dataset_path),
            "groundTruthSha256": file_hash(key_path), "promptId": load(PROMPT_FILE)["id"],
            "promptSha256": file_hash(PROMPT_FILE), "configSha256": file_hash(PROTOCOL_FILE),
            "protocolSha256": file_hash(PROTOCOL_TEXT), "sourceCommit": git("rev-parse", "HEAD"),
            "model": protocol["model"], "inferenceConfigSha256": digest([protocol["generation"], protocol["runtime"]]),
            "seed": protocol["generation"]["seed"], "retryCount": protocol["budget"]["retryCount"]}


def collect(split, runtime, weights, required_commit=None, development_round="v2"):
    if split not in ("development", "pilot"):
        raise ValueError("Only development and pilot collections are defined.")
    if split == "pilot":
        paths = ("empirical", "schemas/empirical-response-v1.json", "research/mirage-empirical-protocol.md")
        if not required_commit or required_commit != git("rev-parse", "HEAD") or git("status", "--porcelain", "--", *paths):
            raise ValueError("Pilot requires its exact committed freeze revision and clean scientific inputs.")
    prepare()
    config, prompt = load(PROTOCOL_FILE), load(PROMPT_FILE)
    dataset = load(split_paths(split)[0])
    plan = list(effective_order(dataset))
    ceiling = config["budget"]["maximumDevelopmentRequests" if split == "development" else "maximumPilotRequests"]
    if len(plan) != ceiling or config["budget"]["retryCount"] != 0 or config["runtime"]["tools"]:
        raise ValueError("The execution plan differs from the registered batch, retry or tool policy.")

    local = LOCAL / ("development-"+development_round if split == "development" else split)
    local.mkdir(parents=True, exist_ok=True)
    meta = provenance(split)
    with lock(local / "collector.lock"), journal(local / "observations.sqlite", meta) as db:
        records = dict((i, (started, raw)) for i, started, raw in db.execute("SELECT * FROM record"))
        if len(records) == len(plan) and all(raw is not None for _, raw in records.values()):
            print(f"{split} already contains every requested response. No inference repeated.")
            return
        started_at = time.monotonic()
        with serve(runtime, weights, config, local / "runtime.log") as adapter:
            for seq, (task, condition) in enumerate(plan, 1):
                msg = messages_for(task, condition, prompt)
                if seq in records and records[seq][1] is not None:
                    continue
                if seq in records:
                    observed = {"id": None, "timestamp": records[seq][0], "raw": None, "finishReason": None,
                                "answer": None, "confidence": None, "providerResponseId": None, "tokens": None,
                                "error": "collector-interrupted", "latencyMs": None, "status": "interrupted"}
                else:
                    db.execute("INSERT INTO record VALUES (?, ?, NULL)", (seq, now()))
                    observed = adapter.infer(msg, prompt["grammar"])
                record = {**observed, "schemaVersion": 1, "evidence": "actual-model-execution",
                          "taskId": task["id"], "taskFamily": task["family"], "condition": condition,
                          "requestSha256": digest(msg), "replicate": 1, "sequence": seq}
                db.execute("UPDATE record SET data=? WHERE sequence=?", (json_bytes(record).decode(), seq))
                if seq % 8 == 0:
                    print(f"{split} {seq}/{len(plan)} · {time.monotonic()-started_at:.1f}s", flush=True)


def read_journal(split, development_round="v2"):
    path = LOCAL / ("development-"+development_round if split == "development" else split) / "observations.sqlite"
    with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)) as db:
        meta = json.loads(db.execute("SELECT data FROM metadata WHERE id=1").fetchone()[0])
        rows = db.execute("SELECT data FROM record ORDER BY sequence").fetchall()
    if any(raw is None for raw, in rows):
        raise ValueError("Journal has an unfinished request. Resume with the frozen execution revision.")
    return meta, [json.loads(raw) for raw, in rows]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("prepare")
    runner = sub.add_parser("collect")
    runner.add_argument("--split", choices=("development", "pilot"), required=True)
    runner.add_argument("--runtime", required=True, type=Path)
    runner.add_argument("--weights", required=True, type=Path)
    runner.add_argument("--freeze-commit")
    args = parser.parse_args()
    if args.command == "prepare":
        prepare()
    else:
        collect(args.split, args.runtime, args.weights, args.freeze_commit)


if __name__ == "__main__":
    main()
