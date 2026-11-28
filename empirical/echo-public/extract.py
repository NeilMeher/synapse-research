"""Retrieve, align and compact the pinned ECHO public predictions without running models."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parent
LETTERS = "ABCDEFGHIJ"
MISSING = "[invalid]"
ANSWER = re.compile(r"answer is \(?([ABCDEFGHIJ])\)?")
SETTINGS = {
    "until": ["</s>", "Q:", "Question:", "<|im_end|>"],
    "do_sample": False, "temperature": 0.0, "max_gen_toks": 512,
}
SUBJECTS = ("economics", "physics")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value, compact=False):
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, separators=(",", ":") if compact else None,
                  indent=None if compact else 2)
        stream.write("\n")


def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def verified_bytes(path, spec):
    payload = path.read_bytes()
    if len(payload) != spec["size"] or hashlib.sha256(payload).hexdigest() != spec["sha256"]:
        raise ValueError(f"Size or SHA-256 mismatch for {spec['path']}")
    if spec.get("gitBlob"):
        blob = f"blob {len(payload)}\0".encode() + payload
        if hashlib.sha1(blob).hexdigest() != spec["gitBlob"]:
            raise ValueError(f"Publisher blob mismatch for {spec['path']}")


def retrieve(directory, manifest):
    directory.mkdir(parents=True, exist_ok=True)
    if sum(f["size"] for f in manifest["files"]) > manifest["maximumDataBytes"]:
        raise ValueError("Research data budget exceeded")
    for spec in manifest["files"]:
        dest = directory / spec["file"]
        if dest.exists():
            verified_bytes(dest, spec)
            continue
        url = f"https://huggingface.co/datasets/{spec['repo']}/resolve/{spec['revision']}/{spec['path']}"
        partial = dest.with_suffix(dest.suffix + ".partial")
        downloaded = 0
        try:
            with urllib.request.urlopen(url, timeout=45) as response, partial.open("wb") as out:
                while chunk := response.read(1024 * 256):
                    downloaded += len(chunk)
                    if downloaded > spec["size"]:
                        raise ValueError(f"Publisher returned too many bytes for {spec['path']}")
                    out.write(chunk)
            verified_bytes(partial, spec)
            partial.replace(dest)
        finally:
            partial.unlink(missing_ok=True)


def benchmark(path):
    # DuckDB is needed only for extraction from the publisher's Parquet file.
    import duckdb
    with duckdb.connect() as con:
        cur = con.execute(
            "SELECT * FROM read_parquet(?) WHERE category IN (?, ?) ORDER BY question_id",
            [str(path), *SUBJECTS],
        )
        columns = [x[0] for x in cur.description]
        rows = [dict(zip(columns, row, strict=True)) for row in cur.fetchall()]
    result = {row["question_id"]: row for row in rows}
    if len(result) != len(rows):
        raise ValueError("Non-unique benchmark question ID")
    return result


def options(row):
    values = [row[f"option_{i}"] for i in range(10)]
    active = [value for value in values if value is not None]
    if len(active) < 2 or active != values[:len(active)] or any(not x.strip() for x in active):
        raise ValueError("Non-contiguous or empty canonical options")
    return active


def normalized(value):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def task_fragment(question, choices):
    lines = "\n".join(f"{letter}. {choice}" for letter, choice in zip(LETTERS, choices))
    return f"Question:\n{question}\nOptions:\n{lines}\nAnswer: Let's think step by step."


def configuration(data, spec, subject):
    key = f"mmlu_prox_en_{subject}"
    task = data["configs"][key]
    run = data["config"]
    filter_config = [{"name": "custom-extract", "filter": [
        {"function": "regex", "regex_pattern": ANSWER.pattern}, {"function": "take_first"},
    ]}]
    if (run["model"] != "vllm" or run["model_args"]["pretrained"] != spec["model"]
            or run["model_args"]["dtype"] != "bfloat16" or run["limit"] is not None
            or run["gen_kwargs"] != {"max_gen_toks": 512} or data["lm_eval_version"] != "0.4.11"
            or data["n-shot"][key] != 5 or task["num_fewshot"] != 5
            or task["dataset_path"] != "li-lab/MMLU-ProX" or task["dataset_name"] != "en"
            or task["test_split"] != "test" or task["fewshot_split"] != "validation"
            or task["generation_kwargs"] != SETTINGS or task["filter_list"] != filter_config
            or task["output_type"] != "generate_until" or task["repeats"] != 1
            or task["fewshot_config"]["sampler"] != "first_n" or data["chat_template"] is not None
            or data["system_instruction"] is not None):
        raise ValueError(f"Incompatible run configuration {spec['path']} {subject}")
    return {"model": spec["model"], "subject": subject, "runDate": data["date"],
            "backend": data["model_source"], "modelArgs": run["model_args"],
            "transformers": data["transformers_version"], "harness": data["lm_eval_version"],
            "seedSettings": {k: run[k] for k in (
                "random_seed", "numpy_seed", "torch_seed", "fewshot_seed")},
            "generation": SETTINGS,
            "benchmarkRevisionRecorded": task.get("dataset_kwargs", {}).get("revision"),
            "modelRevisionRecorded": run["model_args"].get("revision"),
            "taskHash": data["task_hashes"][key], "noChatTemplate": True,
            "fewshot": 5, "fewshotSplit": "validation", "prompt": "five-shot plain-text CoT",
            "responseExtraction": filter_config[0], "publisherCount": data["n-samples"][key]}


def group_questions(rows):
    parent = {key: key for key in rows}
    seen = {}

    def root(key):
        while parent[key] != key:
            key = parent[key]
        return key

    for key, row in rows.items():
        for identity in (("source", row["src"], row["question_id_src"]),
                         ("text", normalized(row["question"]))):
            if identity in seen:
                left, right = sorted((root(key), root(seen[identity])))
                parent[right] = left
            else:
                seen[identity] = key
    return {key: root(key) for key in rows}


def extract(directory, manifest, mode, output):
    for spec in manifest["files"]:
        verified_bytes(directory / spec["file"], spec)
    benchmark_file = next(f for f in manifest["files"] if f["kind"] == "benchmark")
    state = benchmark(directory / benchmark_file["file"])
    group = group_questions(state)
    baseline = {}
    excluded_items = {}
    for key, item in state.items():
        choices = options(item)
        gold = item["answer_index"]
        if not (0 <= gold < len(choices)) or LETTERS[gold] != item["answer"]:
            raise ValueError(f"Invalid published answer key {key}")
        if len(set(map(normalized, choices))) != len(choices):
            excluded_items[key] = "duplicate canonical option content"
        baseline[key] = {"id": key, "group": group[key], "subject": item["category"],
                         "source": item["src"], "sourceId": item["question_id_src"],
                         "options": len(choices), "gold": gold,
                         "contentHash": digest(json.dumps([item["question"], choices, gold],
                                                         ensure_ascii=False, separators=(",", ":")))}

    configurations = [configuration(read(directory / f["file"]), f, subject)
                      for f in manifest["files"] if f["kind"] == "configuration"
                      for subject in SUBJECTS]
    for subject in SUBJECTS:
        configs = [c for c in configurations if c["subject"] == subject]
        if len({x["taskHash"] for x in configs}) != 1 or len({tuple(x["seedSettings"].items()) for x in configs}) != 1:
            raise ValueError(f"Task hash or seed mismatch in {subject}")

    source_rows, scores = {}, {}
    first_prompt, differing = {}, set()
    included = set(state) - excluded_items.keys()
    audit = {"benchmarkItems": len(state), "benchmarkSubjects": dict(collections.Counter(
        q["subject"] for q in baseline.values())), "files": [], "configuration": configurations,
        "itemExclusions": [{"id": k, "reason": v} for k, v in excluded_items.items()]}
    for spec in (f for f in manifest["files"] if f["kind"] == "prediction"):
        model, subject = spec["model"], spec["subject"]
        covered, seen, ids = set(), set(), set()
        issues = collections.Counter()
        failures = []
        total = 0
        with (directory / spec["file"]).open(encoding="utf-8") as stream:
            for line in stream:
                total += 1
                obs = json.loads(line)
                doc = obs["doc"]
                key, doc_id = doc["question_id"], obs["doc_id"]
                original = state.get(key)
                if key in seen or doc_id in ids:
                    raise ValueError(f"Duplicate question or source record in {spec['path']}: {key}")
                seen.add(key)
                ids.add(doc_id)
                args = obs["arguments"]["gen_args_0"]
                reason = None
                if original is None or original["category"] != subject:
                    reason = "unmatched benchmark identity"
                elif any(doc[name] != original[name] for name in original):
                    reason = "benchmark content, key or displayed order mismatch"
                elif (obs["target"] != original["answer"] or obs["filter"] != "custom-extract"
                      or obs["metrics"] != ["exact_match"] or args["arg_1"] != SETTINGS):
                    reason = "target or extraction configuration mismatch"
                else:
                    prompt = args["arg_0"]
                    if not prompt.endswith(task_fragment(original["question"], options(original))):
                        reason = "target prompt layout mismatch"
                    elif key in excluded_items:
                        reason = excluded_items[key]
                    else:
                        sha = digest(prompt)
                        if key in first_prompt and first_prompt[key] != sha:
                            differing.add(key)
                        first_prompt.setdefault(key, sha)
                if reason:
                    issues[reason] += 1
                    failures.append([key, reason])
                    continue
                covered.add(key)
                source_rows[(key, model)] = doc_id
                if mode == "extract":
                    scores[(key, model)] = canonical_prediction(obs, baseline[key])
        expected = {k for k, q in baseline.items() if q["subject"] == subject}
        included -= expected - covered
        audit["files"].append({"path": spec["path"], "model": model, "subject": subject,
                               "records": total, "matched": len(covered),
                               "excluded": dict(issues), "exclusionDetails": failures,
                               "missingCanonicalIds": sorted(expected - seen),
                               "unmatchedCanonicalIds": sorted(seen - expected),
                               "docIdsContiguous": ids == set(range(total))})
    # Identical full rendered prompts are required for this fixed committee panel.
    included -= differing
    audit.update({"crossModelPromptMismatchIds": sorted(differing), "matchedItems": len(included),
                  "matchedGroups": len({group[k] for k in included}),
                  "matchedPredictions": len(included) * len(manifest["models"]),
                  "totalPredictions": sum(f["records"] for f in audit["files"])})
    if mode == "align":
        write(output / "alignment.json", audit)
        write(output / "eligible.json", [{k: v for k, v in baseline[key].items() if k != "gold"}
                                        for key in sorted(included)], compact=True)
        print(json.dumps({k: v for k, v in audit.items() if k not in
                          ("files", "configuration", "itemExclusions")}))
        return

    # The extraction step can only reproduce the already frozen structural cohort.
    freeze = read(ROOT / "alignment.json")
    if audit != freeze:
        raise ValueError("Aligned cohort differs from frozen structural audit")
    protocol = read(ROOT / "protocol.json")
    split = read(ROOT / "splits.json")
    if set(map(int, split)) != included:
        raise ValueError("Frozen split does not cover the aligned cohort")
    models = [m["id"] for m in manifest["models"]]
    for partition in protocol["partitions"]:
        data = []
        for key in sorted(k for k in included if split[str(k)] == partition):
            row = baseline[key]
            row["predictions"] = [scores[(key, m)] for m in models]
            row["sourceRows"] = [source_rows[(key, m)] for m in models]
            data.append(row)
        write(output / f"{partition}.json", data, compact=True)
    print("Extracted three frozen partitions without reporting performance.")


def canonical_prediction(obs, canonical):
    filtered = obs["filtered_resps"]
    raw = obs["resps"]
    if len(filtered) != 1 or len(raw) != 1 or len(raw[0]) != 1:
        raise ValueError("Expected a single archived candidate and filtered answer")
    match = ANSWER.search(raw[0][0])
    label = match.group(1) if match else MISSING
    if label != filtered[0] or (label == obs["target"]) != obs["exact_match"]:
        raise ValueError(f"Publisher extraction or binary score mismatch for {canonical['id']}")
    if label == MISSING:
        return -1  # no label passed the publisher's extraction filter
    index = LETTERS.index(label)
    return index if index < canonical["options"] else -2  # out-of-range labels are invalid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=["fetch", "align", "extract"])
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path, nargs="?")
    args = parser.parse_args()
    manifest = read(ROOT / "sources.json")
    if args.stage == "fetch":
        retrieve(args.source_dir, manifest)
    else:
        out = args.output_dir or ROOT
        out.mkdir(parents=True, exist_ok=True)
        extract(args.source_dir, manifest, args.stage, out)


if __name__ == "__main__":
    main()
