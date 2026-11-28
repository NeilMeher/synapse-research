"""Outcome-blind canonical audit and post-freeze prediction extraction for English–Hindi ECHO."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata

ROOT = Path(__file__).resolve().parent
ENGLISH = ROOT.parent / "echo-public"
sys.path.insert(0, str(ENGLISH))
from extract import LETTERS, normalized, options, read, verified_bytes, write

LANG = "hi"
KEY = "mmlu_prox_hi_economics"
REGEX = re.compile(r"उत्तर है \(?([ABCDEFGHIJ])\)?")
GEN = {"until": ["</s>", "Q:", "प्रश्न:", "<|im_end|>"],
       "do_sample": False, "temperature": 0.0, "max_gen_toks": 512}
ARCHIVE = ROOT.parent / "archives" / "echo-public-empirical-001"


def sha(data):
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def bench(path):
    import duckdb
    with duckdb.connect() as con:
        query = con.execute("select * from read_parquet(?) where category='economics'", [str(path)])
        names = [c[0] for c in query.description]
        items = [dict(zip(names, row, strict=True)) for row in query.fetchall()]
    by_id = {row["question_id"]: row for row in items}
    if len(by_id) != len(items):
        raise ValueError("Duplicate benchmark identifier")
    return by_id


def digits(text):
    text = "".join(str(unicodedata.decimal(c)) if c.isdecimal() else c for c in text)
    text = re.sub(r"(?<=\d),(?=\d)", "", text).replace("−", "-")
    return sorted(re.findall(r"[+-]?\d+(?:\.\d+)?", text))


def roman_statements(text):
    return sorted(re.findall(r"(?im)^\s*\(?([ivxlcdm]{1,6})[.)](?=\s)", text.casefold()))


def compatible_config(file, model, english):
    data = read(file)
    run, config = data["config"], data["configs"][KEY]
    regex = [{"name": "custom-extract", "filter": [
        {"function": "regex", "regex_pattern": REGEX.pattern}, {"function": "take_first"}]}]
    if (data["model_name"] != model or run["model"] != "vllm" or run["limit"] is not None
            or config["dataset_path"] != "li-lab/MMLU-ProX" or config["dataset_name"] != LANG
            or config["test_split"] != "test" or config["fewshot_split"] != "validation"
            or config["fewshot_config"]["sampler"] != "first_n"
            or config["num_fewshot"] != 5 or data["n-shot"][KEY] != 5
            or config["generation_kwargs"] != GEN or run["gen_kwargs"] != {"max_gen_toks": 512}
            or config["filter_list"] != regex or config["repeats"] != 1
            or config["output_type"] != "generate_until" or data["chat_template"] is not None
            or data["system_instruction"] is not None):
        raise ValueError("Incompatible Hindi task structure: " + model)
    fields = {
        "backend": data["model_source"], "modelArgs": run["model_args"],
        "harness": data["lm_eval_version"], "transformers": data["transformers_version"],
        "seedSettings": {k: run[k] for k in english["seedSettings"]},
    }
    differences = {k: {"en": english[k], "hi": v} for k, v in fields.items() if english[k] != v}
    return {"model": model, **fields, "configDifferences": differences, "datedRun": data["date"],
            "taskHash": data["task_hashes"][KEY], "fiveShot": True, "rawGeneration": GEN,
            "filter": regex[0], "publishedSampleCount": data["n-samples"][KEY]}


def fingerprint(doc, choices):
    return sha(json.dumps([doc["question"], choices, doc["answer_index"]],
                          ensure_ascii=False, separators=(",", ":")))


def suffix(doc):
    choices = "\n".join(f"{letter}. {option}" for letter, option in zip(LETTERS, options(doc)))
    return f"प्रश्न:\n{doc['question']}\nविकल्प:\n{choices}\nउत्तर: चलिए चरण-दर-चरण सोचते हैं।"


def canonical_score(raw, width):
    resp, labels = raw["resps"], raw["filtered_resps"]
    if len(resp) != 1 or len(resp[0]) != 1 or len(labels) != 1:
        raise ValueError("Unexpected repetition")
    match = REGEX.search(resp[0][0])
    text = match.group(1) if match else "[invalid]"
    if labels != [text] or raw["exact_match"] != (text == raw["target"]):
        raise ValueError(f"Archived scoring mismatch for source row {raw['doc_id']}")
    if text == "[invalid]":
        return -1
    option = LETTERS.index(text)
    return option if option < width else -2


def structural_audit(data, original, stage):
    sources = read(ROOT / "sources.json")
    for entry in sources["files"]:
        if entry["lfs"] and entry["lfs"] != entry["sha256"]:
            raise ValueError("Publisher LFS digest differs from the receipt")
        verified_bytes(data / entry["file"],
                       {**entry, "gitBlob": None if entry["lfs"] else entry["oid"]})
    en_sources = read(ENGLISH / "sources.json")
    en_spec = next(f for f in en_sources["files"] if f["kind"] == "benchmark")
    verified_bytes(original / en_spec["file"], en_spec)
    en = bench(original / en_spec["file"])
    hi = bench(data / "benchmark-hi-test.parquet")
    en_cohort = {r["id"]: r for r in read(ENGLISH / "eligible.json") if r["subject"] == "economics"}
    frozen_groups = read(ENGLISH / "splits.json")
    prior = {c["model"]: c for c in read(ENGLISH / "alignment.json")["configuration"]
             if c["subject"] == "economics"}
    manifest_models = [m["id"] for m in en_sources["models"]]
    en_independent = {(doc["src"], doc["question_id_src"]): doc for doc in en.values()}
    hi_independent = {(doc["src"], doc["question_id_src"]): doc for doc in hi.values()}
    if len(en_independent) != len(en) or len(hi_independent) != len(hi):
        raise ValueError("Ambiguous original question identity")
    exclusions, cohort, anchor_differences, statement_differences = {}, {}, [], []
    for i, question in sorted(en_cohort.items()):
        english = en[i]
        translated = hi_independent.get((question["source"], question["sourceId"]))
        if translated is None or translated["question_id"] != i:
            exclusions[i] = "benchmark ID and original source identity did not match"
            continue
        en_options, hi_options = options(english), options(translated)
        if (len(en_options) != len(hi_options)
                or len(set(map(normalized, hi_options))) != len(hi_options)
                or english["answer_index"] != translated["answer_index"]
                or english["answer"] != translated["answer"]
                or LETTERS[translated["answer_index"]] != translated["answer"]):
            exclusions[i] = "option count, unique content or keyed position did not match"
            continue
        if fingerprint(english, en_options) != question["contentHash"]:
            raise ValueError("Published English cohort fingerprint differs")
        en_statements = roman_statements(english["question"])
        hi_statements = roman_statements(translated["question"])
        if en_statements != hi_statements:
            statement_differences.append({"id": i, "en": en_statements, "hi": hi_statements})
            exclusions[i] = "different Roman-numbered statement scaffolding"
            continue
        anchor = [part for part, a, b in zip(
            ["question", *LETTERS], [english["question"], *en_options],
            [translated["question"], *hi_options]) if digits(a) != digits(b)]
        if anchor:
            anchor_differences.append({"id": i, "fields": anchor})
            # Conservative primary cohort. A text difference can be harmless digit spelling.
            exclusions[i] = "different numeric anchors in question or ordered choices"
            continue
        cohort[i] = {"id": i, "group": question["group"], "source": question["source"],
                     "sourceId": question["sourceId"], "split": frozen_groups[str(i)],
                     "options": len(hi_options), "enHash": question["contentHash"],
                     "hiHash": fingerprint(translated, hi_options)}
    configurations = [compatible_config(data / f["file"], f["model"], prior[f["model"]])
                      for f in sources["files"] if f["kind"] == "configuration"]
    if len({x["taskHash"] for x in configurations}) != 1:
        raise ValueError("Hindi model task hashes differ")
    common_models = [m for m in manifest_models
                     if not next(c for c in configurations if c["model"] == m)["configDifferences"]]
    seen_by_model, prompt_map, compact, record_ids = {}, {}, {}, {}
    alignment = []
    for spec in (f for f in sources["files"] if f["kind"] == "prediction"):
        model = spec["model"]
        seen, rows, discrepancies = set(), set(), []
        with (data / spec["file"]).open(encoding="utf-8") as stream:
            for line in stream:
                obs = json.loads(line)
                doc, row_id = obs["doc"], obs["doc_id"]
                i = doc["question_id"]
                if i in seen or row_id in rows:
                    raise ValueError("Duplicate original archive row")
                rows.add(row_id)
                seen.add(i)
                prompt = obs["arguments"]["gen_args_0"]
                if (i not in hi or doc != hi[i] or obs["target"] != doc["answer"]
                        or obs["filter"] != "custom-extract" or obs["metrics"] != ["exact_match"]
                        or prompt["arg_1"] != GEN or not prompt["arg_0"].endswith(suffix(doc))):
                    discrepancies.append(i)
                    continue
                prompt_hash = sha(prompt["arg_0"])
                if i in prompt_map and prompt_hash != prompt_map[i]:
                    discrepancies.append(i)
                    continue
                prompt_map.setdefault(i, prompt_hash)
                record_ids[i, model] = row_id
                if stage == "extract" and i in cohort:
                    compact[i, model] = canonical_score(obs, cohort[i]["options"])
        seen_by_model[model] = seen
        alignment.append({"model": model, "file": spec["path"], "publisherRecords": len(seen),
                          "missingIds": sorted(hi.keys() - seen),
                          "extraIds": sorted(seen - hi.keys()), "incompatibleIds": sorted(discrepancies),
                          "sourceRowsContiguous": rows == set(range(len(rows)))})
        for i in cohort.keys() & (set(discrepancies) | (hi.keys() - seen)):
            exclusions[i] = "missing or incompatible Hindi archive row"
    for item in exclusions:
        cohort.pop(item, None)
    counts = Counter(q["split"] for q in cohort.values())
    groups = defaultdict(set)
    source_ids = defaultdict(list)
    for q in cohort.values():
        groups[q["split"]].add(q["group"])
        source_ids[q["source"]].append(q["id"])
    spot = sorted(i for ids in source_ids.values()
                  for i in sorted(ids, key=lambda i: sha(f"translation-screen-v1|{i}"))[:2])
    summary = {"baselineEnglish": len(en_cohort), "hindiBenchmark": len(hi),
               "pairedIdentities": len(en.keys() & hi.keys()), "eligible": len(cohort),
               "excluded": {str(i): reason for i, reason in sorted(exclusions.items())},
               "numericAnchorDifferences": anchor_differences,
               "romanStatementDifferences": statement_differences, "partitions": dict(counts),
               "groupCounts": {p: len(g) for p, g in groups.items()}, "canonicalSpotIds": spot,
               "compatibleModelIds": common_models, "configurations": configurations,
               "archiveEvidence": alignment, "rawHindiPredictions": sum(map(len, seen_by_model.values()))}
    if stage == "spot":
        for i in spot:
            print(json.dumps({"id": i, "en": [en[i]["question"], *options(en[i])],
                              "hi": [hi[i]["question"], *options(hi[i])]}, ensure_ascii=False))
        return
    if stage == "align":
        write(ROOT / "alignment.json", summary)
        write(ROOT / "cohort.json", list(cohort.values()), compact=True)
        print(json.dumps({k: summary[k] for k in ("baselineEnglish", "hindiBenchmark", "eligible",
            "partitions", "groupCounts", "compatibleModelIds", "rawHindiPredictions")}))
        return
    if summary != read(ROOT / "alignment.json") or list(cohort.values()) != read(ROOT / "cohort.json"):
        raise ValueError("Cohort differs from the frozen structural audit")
    if not (ROOT / "protocol.json").exists():
        raise ValueError("Study protocol required before scoring")
    archived_english = {row["id"]: row for rows in read(ARCHIVE / "predictions.json").values()
                        for row in rows if row["subject"] == "economics"}
    missing = set(cohort) - archived_english.keys()
    if missing:
        raise ValueError("Archived English rows missing")
    return [{**q, "gold": archived_english[i]["gold"], "en": archived_english[i]["predictions"],
             "hi": [compact[i, m] for m in manifest_models],
             "sourceRowsHi": [record_ids[i, m] for m in manifest_models]} for i, q in cohort.items()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=["align", "spot", "extract"])
    parser.add_argument("hindi", type=Path)
    parser.add_argument("english", type=Path)
    parser.add_argument("output", type=Path, nargs="?")
    args = parser.parse_args()
    predictions = structural_audit(args.hindi, args.english, args.stage)
    if predictions is not None:
        if args.output is None:
            parser.error("supply a temporary output path")
        write(args.output, predictions, compact=True)
        print("Rescored archived Hindi completions and stored paired outcomes without displaying results.")


if __name__ == "__main__":
    main()
