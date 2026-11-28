"""Metrics for verbal confidence and paired, stratified MIRAGE comparisons."""
from collections import Counter, defaultdict
import math
import random
from statistics import mean


def average(values):
    return mean(values) if values else None


def brier(row):
    return (row["confidence"] - row["correct"]) ** 2


def summary(rows, bin_count):
    answered = [r for r in rows if r["correct"] is not None]
    eligible = [r for r in answered if r["confidence"] is not None]
    correct = [r["confidence"] for r in eligible if r["correct"]]
    wrong = [r["confidence"] for r in eligible if not r["correct"]]
    bins = [[] for _ in range(bin_count)]
    for row in eligible:
        bins[min(bin_count-1, int(row["confidence"] * bin_count))].append(row)
    reliability = [{"from": index / bin_count, "to": (index+1) / bin_count, "count": len(group),
                    "accuracy": average([r["correct"] for r in group]),
                    "confidence": average([r["confidence"] for r in group])} for index, group in enumerate(bins)]
    risk = []
    for threshold in sorted(set(correct + wrong), reverse=True):
        kept = [row for row in eligible if row["confidence"] >= threshold]
        risk.append({"threshold": threshold, "count": len(kept), "coverage": len(kept)/len(rows),
                     "risk": 1-mean(r["correct"] for r in kept)})
    loss = []
    for row in eligible:
        p = min(1-1e-6, max(1e-6, row["confidence"]))
        loss.append(-math.log(p) if row["correct"] else -math.log1p(-p))
    accuracy = average([r["correct"] for r in eligible])
    confidence = average([r["confidence"] for r in eligible])
    return {"planned": len(rows), "answered": len(answered), "scorable": len(eligible),
            "answerCoverage": len(answered)/len(rows) if rows else None,
            "confidenceCoverage": len(eligible)/len(rows) if rows else None,
            "accuracy": average([r["correct"] for r in answered]), "scorableAccuracy": accuracy,
            "confidence": confidence, "calibrationGap": confidence - accuracy if eligible else None,
            "brier": average([brier(r) for r in eligible]), "logLoss": average(loss),
            "clippedCount": sum(not 1e-6 <= r["confidence"] <= 1-1e-6 for r in eligible),
            "errorAUROC": (sum((e < c) + 0.5*(e == c) for e in wrong for c in correct) / (len(correct)*len(wrong))
                           if correct and wrong else None),
            "ece": (sum(b["count"]*abs(b["confidence"]-b["accuracy"]) for b in reliability if b["count"]) / len(eligible)
                    if eligible else None),
            "reliability": reliability, "riskCoverage": risk,
            "statuses": dict(Counter(r["status"] for r in rows))}


def quantile(sorted_values, fraction):
    position = (len(sorted_values) - 1) * fraction
    lo, hi = math.floor(position), math.ceil(position)
    return sorted_values[lo] + (position - lo) * (sorted_values[hi] - sorted_values[lo])


def contrast(values, total, config):
    """Resample complete item contrasts independently within the registered task families."""
    count = len(values)
    if not count:
        return {"pairs": 0, "coverage": 0, "difference": None, "interval95": None, "pairsByFamily": {}}
    groups = defaultdict(list)
    for family, delta in values:
        groups[family].append(delta)
    rng = random.Random(config["bootstrapSeed"])
    boot = sorted(sum(sum(rng.choices(group, k=len(group))) for group in groups.values()) / count
                  for _ in range(config["bootstrapReplicates"]))
    return {"pairs": count, "coverage": count/total, "difference": mean(delta for _, delta in values),
            "interval95": [quantile(boot, 0.025), quantile(boot, 0.975)],
            "pairsByFamily": {key: len(group) for key, group in groups.items()}}


def analyze(scores, dataset, config):
    arms = {condition: [r for r in scores if r["condition"] == condition]
            for condition in ("neutral", "incorrectCue")}
    by_task = {(row["taskId"], row["condition"]): row for row in scores}
    values = {key: [] for key in ("brier", "accuracy", "confidence", "calibrationGap", "answerCoverage", "confidenceCoverage")}
    transitions = Counter()
    cue_adoption = 0
    for item in dataset["tasks"]:
        neutral, cue = (by_task[(item["id"], name)] for name in arms)
        family = item["family"]
        answers = neutral["correct"] is not None and cue["correct"] is not None
        eligible = neutral["confidence"] is not None and cue["confidence"] is not None
        values["answerCoverage"].append((family, int(cue["correct"] is not None)-int(neutral["correct"] is not None)))
        values["confidenceCoverage"].append((family, int(cue["confidence"] is not None)-int(neutral["confidence"] is not None)))
        if answers:
            values["accuracy"].append((family, cue["correct"]-neutral["correct"]))
            transitions[("correct" if neutral["correct"] else "wrong") + "To" + ("Correct" if cue["correct"] else "Wrong")] += 1
            cue_adoption += cue["answer"] == item["incorrectCueOption"] and neutral["answer"] != cue["answer"]
        if eligible:
            delta_confidence = cue["confidence"] - neutral["confidence"]
            values["confidence"].append((family, delta_confidence))
            values["calibrationGap"].append((family, delta_confidence - (cue["correct"] - neutral["correct"])))
            values["brier"].append((family, brier(cue) - brier(neutral)))
    total = len(dataset["tasks"])
    paired = {key: contrast(rows, total, config) for key, rows in values.items()}
    bins = config["confidenceBins"]
    return {"analysisVersion": "mirage-analysis-v1", "inputEvidence": "actual-model-execution",
            "primary": "brier", "primaryCoverageMet": paired["brier"]["coverage"] >= config["minimumPairedCoverage"],
            "conditions": {arm: summary(rows, bins) for arm, rows in arms.items()},
            "familySummaries": {family: {arm: summary([r for r in rows if r["taskFamily"] == family], bins)
                                         for arm, rows in arms.items()}
                                for family in sorted({item["family"] for item in dataset["tasks"]})},
            "paired": paired, "transitions": dict(transitions), "changedToCue": cue_adoption,
            "mathematicalBaseline": {"evidence": "established-baseline", "expectedAccuracy": 0.25,
                                     "constantConfidence": 0.25, "expectedBrier": 0.1875}}
