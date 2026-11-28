"""Reconstruct retrospective MIRAGE 001 findings from immutable raw and scored data."""
from collections import Counter
from pathlib import Path
from statistics import mean, median
import json

from empirical.inference import json_bytes
from empirical.run import load, split_paths
from empirical.robustness.design import HERE

ARCHIVE = HERE.parent / "archives/mirage-empirical-pilot-001"


def audit():
    tasks = {t["id"]:t for t in load(split_paths("pilot")[0])["tasks"]}
    scores = load(ARCHIVE/"scores.json")["rows"]
    raw = [json.loads(line) for line in (ARCHIVE/"responses.ndjson").read_bytes().splitlines()]
    rows = [{**a, **b} for a,b in zip(raw,scores,strict=True)]
    result = {"evidence":"retrospective-exploratory-actual-model",
              "sources":load(ARCHIVE/"manifest.json")["outputs"],"conditions":{},"pairsByFamily":{}}
    for arm in ("neutral","incorrectCue"):
        group = [r for r in rows if r["condition"]==arm]
        scorable = [r for r in group if r["confidence"] is not None]
        answered = [r for r in group if r["answer"] is not None]
        result["conditions"][arm] = {
            "planned":len(group),"labels":dict(Counter(r["answer"] for r in answered)),
            "physicalPositions":dict(Counter(str(list(tasks[r["taskId"]]["options"]).index(r["answer"])+1) for r in answered)),
            "correctLabels":dict(Counter(r["truth"] for r in group)),
            "designatedWrongLabels":dict(Counter(tasks[r["taskId"]]["incorrectCueOption"] for r in group)),
            "confidencePercentCounts":dict(Counter(str(round(100*r["confidence"])) for r in scorable)),
            "confidenceByAnswer":{letter:{"n":len(items),"mean":mean(items)}
                                  for letter in "ABCD"
                                  if (items := [r["confidence"] for r in scorable if r["answer"]==letter])},
            "confidenceMultiplesOfTen":sum(round(100*r["confidence"]) % 10 == 0 for r in scorable),
            "statuses":dict(Counter(r["status"] for r in group)),
            "correctPerPlanned":sum(r["correct"] or 0 for r in group)/len(group),
            "latencyMsMedian":median(r["latencyMs"] for r in group),
            "inputTokensRange":[min(r["tokens"]["input"] for r in group),max(r["tokens"]["input"] for r in group)],
            "outputTokensRange":[min(r["tokens"]["output"] for r in group),max(r["tokens"]["output"] for r in group)],
            "firstWithinTask":sum((r["sequence"]%2)==1 for r in group)}
    lookup = {(r["condition"],r["taskId"]):r for r in rows}
    for family in sorted({task["family"] for task in tasks.values()}):
        pairs = [(lookup["neutral",task["id"]],lookup["incorrectCue",task["id"]])
                 for task in tasks.values() if task["family"]==family]
        valid = [(a,b) for a,b in pairs if a["confidence"] is not None and b["confidence"] is not None]
        result["pairsByFamily"][family] = {
            "planned":len(pairs),"pairs":len(valid),
            "neutralAbstentions":sum(a["status"]=="abstention" for a,b in pairs),
            "meanConfidenceChange":mean(b["confidence"]-a["confidence"] for a,b in valid),
            "meanBrierChange":mean((b["confidence"]-b["correct"])**2-(a["confidence"]-a["correct"])**2 for a,b in valid),
            "correctToIncorrect":sum(a["correct"]==1 and b["correct"]==0 for a,b in valid),
            "incorrectToCorrect":sum(a["correct"]==0 and b["correct"]==1 for a,b in valid),
            "switchedToWrongCue":sum(a["answer"]!=b["answer"] and b["answer"]==tasks[b["taskId"]]["incorrectCueOption"] for a,b in valid)}
    return result


if __name__ == "__main__":
    import argparse
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--create",action="store_true")
    opts=p.parse_args()
    path=Path(__file__).with_name("audit-pilot-001.json")
    expected=json_bytes(audit())
    if opts.create and not path.exists():
        with path.open("xb") as stream:
            stream.write(expected)
    if path.read_bytes()!=expected:
        raise ValueError("The published retrospective audit differs from the original-archive computation.")
    print("Verified retrospective MIRAGE 001 audit.")
