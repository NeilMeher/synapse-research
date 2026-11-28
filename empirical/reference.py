"""Independent reading of printed items and exact rational pilot score checks."""
from collections import Counter
from fractions import Fraction
from itertools import permutations
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "datasets"
ARCHIVE = ROOT / "archives" / "mirage-empirical-pilot-001"


def solved(task):
    question = task["question"]
    family = task["family"]
    numbers = [int(x) for x in re.findall(r"\b[0-9]+\b", question)]
    if family == "multiplication":
        rows, clips = numbers
        return rows * clips
    if family == "remaining":
        start, removed, added = numbers
        return len(list(range(start))[removed:]) + added
    if family == "weighted_count":
        bags_two, bags_three = numbers
        return len([0, 1] * bags_two + [0, 1, 2] * bags_three)
    if family == "change":
        start, sold, added, per_pack = numbers
        return len([1] * (start-sold) + [1] * (added*per_pack))
    if family == "conditional":
        striped, plain, metal = numbers
        tokens = [(True, True)] * striped + [(True, False)] * plain + [(False, True)] * metal
        wooden = [stripe for wood, stripe in tokens if wood]
        return Fraction(sum(wooden), len(wooden))
    if family == "mean":
        avg, *seen = numbers
        feasible = [candidate for candidate in range(-500, 501) if Fraction(sum(seen) + candidate, 4) == avg]
        answer, = feasible
        return answer
    names = tuple(task["options"].values())
    before = re.findall(r"(\w+) finished before (\w+)", question)
    after = [(later, earlier) for earlier, later in re.findall(r"(\w+) finished after (\w+)", question)]
    feasible, = [order for order in permutations(names)
                 if all(order.index(a) < order.index(b) for a, b in before + after)]
    return feasible[1]


def verify_datasets():
    questions, ids, families_by_split = set(), set(), set()
    for split, expected in (("development", 8), ("calibration", 8), ("pilot", 64)):
        tasks = json.loads((DATA / f"{split}.tasks.json").read_bytes())["tasks"]
        keys = json.loads((DATA / f"{split}.key.json").read_bytes())
        assert len(tasks) == len(keys) == expected
        assert not families_by_split.intersection(task["family"] for task in tasks)
        families_by_split.update(task["family"] for task in tasks)
        counts = Counter()
        for task, key in zip(tasks, keys):
            answer = solved(task)
            interpreted = {label: value if isinstance(answer, str) else Fraction(value)
                           for label, value in task["options"].items()}
            assert len(interpreted) == len(set(interpreted.values())) == 4
            label, = (label for label, value in interpreted.items() if value == answer)
            assert task["id"] == key["id"] and key["correct"] == label and key["value"] == str(answer)
            assert task["incorrectCueOption"] in interpreted and task["incorrectCueOption"] != label
            assert task["question"] not in questions and task["id"] not in ids
            questions.add(task["question"])
            ids.add(task["id"])
            counts.update([(task["family"], label, "answer"), (task["family"], task["incorrectCueOption"], "cue"),
                           (task["family"], task["misleadingFirst"], "order")])
        for family in {task["family"] for task in tasks}:
            assert len({counts[family, label, "answer"] for label in "ABCD"}) == 1
            assert counts[family, True, "order"] == counts[family, False, "order"]
            if split == "pilot":
                assert {counts[family, label, "cue"] for label in "ABCD"} == {4}
    print(f"Independent ground-truth and balance checks passed for {len(ids)} distinct items.")


def verify_archive():
    data = json.loads((ARCHIVE / "analysis.json").read_bytes())
    key = {x["id"]: x["correct"] for x in json.loads((DATA / "pilot.key.json").read_bytes())}
    expected = json.loads((ARCHIVE / "scores.json").read_bytes())["rows"]
    rows = [json.loads(x) for x in (ARCHIVE / "responses.ndjson").read_bytes().splitlines()]
    assert len(rows) == 128 and len(expected) == 128
    exact = {}
    for record, scored in zip(rows, expected):
        assert record["taskId"] == scored["taskId"]
        if record["status"] != "scorable":
            continue
        answer, percent = re.fullmatch(r"Answer: ([A-D])\nConfidence: (100|[1-9]?[0-9])%", record["raw"]).groups()
        observed = (Fraction(percent)/100, int(answer == key[record["taskId"]]))
        assert float(observed[0]) == scored["confidence"] and observed[1] == scored["correct"]
        exact[record["taskId"], record["condition"]] = observed

    def exact_brier(row):
        p, correct = row
        return p*p - 2*p*correct + correct

    for condition, metrics in data["conditions"].items():
        unit = [row for (_, arm), row in exact.items() if arm == condition]
        assert metrics["scorable"] == len(unit)
        if unit:
            confidence = sum(p for p, _ in unit)/len(unit)
            accuracy = Fraction(sum(c for _, c in unit), len(unit))
            facts = {"brier": sum(map(exact_brier, unit))/len(unit), "confidence": confidence,
                     "scorableAccuracy": accuracy, "calibrationGap": confidence-accuracy}
            for metric, value in facts.items():
                assert abs(metrics[metric] - float(value)) < 1e-12
    differences = [exact_brier(exact[item, "incorrectCue"]) - exact_brier(exact[item, "neutral"]) for item in key
                   if (item, "neutral") in exact and (item, "incorrectCue") in exact]
    primary = data["paired"]["brier"]
    assert primary["pairs"] == len(differences)
    if differences:
        assert abs(primary["difference"] - float(sum(differences)/len(differences))) < 1e-12
    else:
        assert primary["difference"] is None
    print(f"Independent rational score check passed for {len(exact)} scorable responses and {len(differences)} complete pairs.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tasks-only", action="store_true")
    options = parser.parse_args()
    verify_datasets()
    if not options.tasks_only:
        verify_archive()
