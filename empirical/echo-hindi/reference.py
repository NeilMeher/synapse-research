"""Independent arithmetic checks and optional replay against the original Hindi publisher files."""
from collections import Counter
from fractions import Fraction
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "echo-public"))
from reference import close, confidence_intervals, decide, pair, require

ARCHIVE = ROOT.parent / "archives" / "echo-hindi-economics-001"


def load(path):
    return json.loads(path.read_bytes())


def verify_raw(source, data, columns, receipt):
    included = {row["id"]: row for row in data}
    verified = 0
    for f in receipt["files"]:
        file = source / f["file"]
        digest = sha256(file.read_bytes()).hexdigest()
        require(digest == f["sha256"] and f["size"] == file.stat().st_size,
                "Publisher receipt mismatch " + f["file"])
        if f["kind"] != "prediction":
            continue
        seen = set()
        column = columns.index(f["model"])
        with file.open(encoding="utf-8") as stream:
            for line in stream:
                raw = json.loads(line)
                doc = raw["doc"]
                key = doc["question_id"]
                if key not in included:
                    continue
                require(key not in seen, "Duplicate source row")
                seen.add(key)
                row = included[key]
                choices = [doc["option_" + str(i)] for i in range(row["options"])]
                identity = json.dumps([doc["question"], choices, doc["answer_index"]],
                                      ensure_ascii=False, separators=(",", ":")).encode()
                require(sha256(identity).hexdigest() == row["hiHash"] and
                        (doc["src"], doc["question_id_src"], doc["answer_index"]) ==
                        (row["source"], row["sourceId"], row["gold"]), "Hindi benchmark identity")
                require(raw["doc_id"] == row["sourceRowsHi"][column], "Publisher row locator")
                hits = re.findall("उत्तर है [(]?([A-J])[)]?", raw["resps"][0][0])
                label = hits[0] if hits else "[invalid]"
                require(label == raw["filtered_resps"][0] and
                        int(label == raw["target"]) == raw["exact_match"], "Publisher raw scoring")
                ordinal = ord(label) - 65 if len(label) == 1 else -1
                if ordinal >= row["options"]:
                    ordinal = -2
                require(row["hi"][column] == ordinal, "Canonical score")
                verified += 1
        require(seen == included.keys(), "Missing aligned items")
    require(verified == len(data) * len(columns), "Raw replay denominator")
    print(f"Independently rescored {verified} retained Hindi publisher completions.")


def report_counts(rows, votes, report):
    correct = sum(row["gold"] == vote for row, vote in zip(rows, votes, strict=True))
    valid = sum(vote is not None and vote >= 0 for vote in votes)
    require((report["correct"], report["wrong"], report["abstain"]) ==
            (correct, valid - correct, len(rows) - valid), "Decision outcome counts")
    close(correct / len(rows), report["accuracy"], "Full-plan accuracy")
    close(valid / len(rows), report["coverage"], "Coverage")
    close(correct / valid if valid else None, report["validAccuracy"], "Conditional accuracy")
    for cost, value in report["utility"].items():
        close(float((correct - Fraction(cost) * (valid - correct)) / len(rows)), value, "Decision utility")


def by_support(row, team, seed, threshold=1, weights=None):
    counts = Counter()
    for member in team:
        if row["predictions"][member] >= 0:
            counts[row["predictions"][member]] += 1 if weights is None else weights[member]
    if not counts or max(counts.values()) < threshold:
        return None, 0
    best = max(counts.values())
    selected = sorted(i for i in counts if counts[i] == best)
    rule = ((row["id"] ^ seed) * 2654435761 % 2**32) % len(selected)
    return selected[rule], best


def projector(rows, language):
    return [{**row, "predictions": row[language], "subject": "economics"} for row in rows]


def check_language(rows, cal, record, cfg, team, baseline):
    seed = cfg["tieSeed"]
    chosen = []
    for threshold in cfg["quorums"]:
        payoff = 0
        for row in cal:
            a, _ = by_support(row, team, seed, threshold)
            if a is not None:
                payoff += 1 if a == row["gold"] else -1
        chosen.append((payoff, threshold))
    primary_threshold = max(chosen)[1]
    require(primary_threshold == record["threshold"], "Calibration threshold")
    expected_weights = [1 + sum(r["predictions"][i] == r["gold"] for r in cal)
                        for i in range(len(rows[0]["predictions"]))]
    require(expected_weights == record["weight"], "Reliability weights")
    scores = record["policies"]
    majority = [decide(row, team, "majority", seed) for row in rows]
    individual = [row["predictions"][baseline] for row in rows]
    individual = [None if option < 0 else option for option in individual]
    report_counts(rows, individual, scores["individual"])
    report_counts(rows, majority, scores["majority"])
    report_counts(rows, [decide(r, team, "plurality", seed) for r in rows], scores["plurality"])
    report_counts(rows, [decide(r, team, "unanimity", seed) for r in rows], scores["unanimity"])
    report_counts(rows, [a if a is not None else b for a, b in zip(majority, individual, strict=True)],
                  scores["majorityFallback"])
    report_counts(rows, [by_support(r, team, seed, primary_threshold)[0] for r in rows],
                  scores["threshold"])
    report_counts(rows, [by_support(r, team, seed, weights=expected_weights)[0] for r in rows],
                  scores["reliability"])
    section = [(r, a, b) for r, a, b in zip(rows, majority, individual, strict=True) if a is not None]
    require(record["sameSupport"] == {"n": len(section),
        "majorityCorrect": sum(r["gold"] == a for r, a, _ in section),
        "individualCorrect": sum(r["gold"] == b for r, _, b in section),
        "individualValid": sum(b is not None for _, _, b in section)}, "Matched support")
    for m, reference in zip(team, record["modelRates"], strict=True):
        report_counts(rows, [r["predictions"][m] for r in rows], reference)
    histogram = Counter(sum(r["predictions"][i] != r["gold"] for i in team) for r in rows)
    require(record["failedMembers"] == [histogram[i] for i in range(len(team)+1)], "Joint failures")
    for p in record["dependence"]:
        a, b = p["members"]
        phi, excess, joint, _, _ = pair(rows, a, b)
        close(phi, p["phi"], "Error phi")
        close(float(excess), p["excess"], "Joint excess")
        require(joint == p["jointErrors"], "Joint error counts")
    for fitted, subset in zip(record["transferred"], cfg["unchangedCommittees"], strict=True):
        report_counts(rows, [decide(r, subset, "majority", seed) for r in rows], fitted)
    everyone = range(len(rows[0]["predictions"]))
    report_counts(rows, [decide(r, everyone, "majority", seed) for r in rows],
                  record["sensitivityWithOlmo"])
    hist = Counter((count, a == r["gold"]) for r in cal
                   if (vote := by_support(r, team, seed))[0] is not None
                   for a, count in (vote,))
    constant = Fraction(sum(n for (_, success), n in hist.items() if success)+1, sum(hist.values())+2)
    probability = [Fraction(hist[j, True]+1, hist[j, True]+hist[j, False]+2)
                   for j in range(len(team)+1)]
    actual = [(count, a == r["gold"]) for r in rows
              if (vote := by_support(r, team, seed))[0] is not None for a, count in (vote,)]
    agreement = record["agreement"]["heldout"]
    for name, pred in (("agreement", lambda n: probability[n]), ("constant", lambda n: constant)):
        close(float(sum((pred(count)-y)**2 for count, y in actual)/len(actual)), agreement[name],
              "Brier " + name)
    return majority


def main():
    manifest = load(ARCHIVE / "manifest.json")
    for root, paths in ((ROOT, manifest["inputs"]), (ARCHIVE, manifest["outputs"])):
        for name, record in paths.items():
            payload = (root / name).read_bytes()
            require((sha256(payload).hexdigest(), len(payload)) == (record["sha256"], record["bytes"]),
                    "Artifact hash " + name)
    data = load(ARCHIVE / "predictions.json")
    report = load(ARCHIVE / "results.json")
    cfg = load(ROOT / "protocol.json")
    old = ROOT.parent / "archives" / "echo-public-empirical-001"
    original = {r["id"]: r for rows in load(old / "predictions.json").values() for r in rows}
    split = load(ROOT.parent / "echo-public/splits.json")
    models = [m["id"] for m in load(ROOT.parent / "echo-public/sources.json")["models"]]
    for row in data:
        ref = original[row["id"]]
        require((ref["gold"], ref["options"], ref["group"], ref["contentHash"], ref["predictions"],
                 split[str(row["id"])]) == (row["gold"], row["options"], row["group"], row["enHash"],
                                            row["en"], row["split"]), "English archive and group transfer")
    team = [models.index(m) for m in report["models"]]
    base = models.index(cfg["historicalBaselineModel"])
    held = [r for r in data if r["split"] == "heldout"]
    cal = [r for r in data if r["split"] == "calibration"]
    decisions = [check_language(projector(held, lang), projector(cal, lang), report["observations"][lang],
                                cfg, team, base) for lang in ("en", "hi")]
    diff = [int(b == r["gold"]) - int(a == r["gold"])
            for r, a, b in zip(held, *decisions, strict=True)]
    estimate, bounds = next(confidence_intervals(projector(held, "en"), [diff], cfg["interval"]))
    close(estimate, report["primary"]["estimate"], "Paired estimand")
    for a, b in zip(bounds, report["primary"]["interval"], strict=True):
        close(a, b, "Paired bootstrap")
    for i, p in zip(team, report["crossLanguageDependence"], strict=True):
        rows = [{"predictions": [r["en"][i], r["hi"][i]], "gold": r["gold"]} for r in held]
        close(pair(rows, 0, 1)[0], p["phi"], "Same-checkpoint cross-language phi")
    print(f"Independent paired scores, policies, bootstrap, agreement and dependence verified on {len(held)} holdouts.")
    if len(sys.argv) == 2:
        verify_raw(Path(sys.argv[1]), data, models, load(ROOT / "sources.json"))


if __name__ == "__main__":
    main()
