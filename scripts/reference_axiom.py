"""Independently check the exact AXIOM enumeration and response controls."""
from fractions import Fraction
from hashlib import sha256
import itertools
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_MATRICES = {
    "dilemma": [[[3, 3], [0, 5]], [[5, 0], [1, 1]]],
    "assurance": [[[4, 4], [0, 3]], [[3, 0], [3, 3]]],
    "pennies": [[[1, -1], [-1, 1]], [[-1, 1], [1, -1]]],
    "tie": [[[2, 2], [2, 2]], [[2, 2], [2, 2]]],
}
SWAPS = {"canonical": (0, 0), "rows": (1, 0), "columns": (0, 1), "both": (1, 1)}


def utilities(matrix, beliefs):
    return [sum(Fraction(cell[0]) * belief for cell, belief in zip(row, beliefs, strict=True)) for row in matrix]


def policies(values):
    first, second = values
    difference = first - second
    max_response = (0.5, 0.5) if difference == 0 else (int(difference > 0), int(difference < 0))
    return {"utility": max_response, "logit": (1/(1+math.exp(-difference)), 1/(1+math.exp(difference))),
            "position": (1, 0)}


def match_pair(pair, archived):
    assert len(archived) == 2
    assert all(math.isclose(a, b, rel_tol=0, abs_tol=1e-12) for a, b in zip(pair, archived, strict=True))


def dist(left, right):
    return abs(left[0] - right[0])


def check_config(config):
    assert {game["id"]: game["payoffs"] for game in config["games"]} == EXPECTED_MATRICES
    assert config["firstWeights"] == list(range(5))
    assert config["beta"] == 1
    dilemma = EXPECTED_MATRICES["dilemma"]
    assert utilities(dilemma, [Fraction(3, 4), Fraction(1, 4)]) == [Fraction(9, 4), Fraction(4)]
    assert utilities(EXPECTED_MATRICES["assurance"], [Fraction(3, 4), Fraction(1, 4)]) == [3, 3]
    assert utilities(EXPECTED_MATRICES["pennies"], [Fraction(1, 2)] * 2) == [0, 0]


def check_archive(config):
    raw = (ROOT / "results/axiom-pilot.json").read_bytes()
    manifest = json.loads((ROOT / "results/axiom-pilot.manifest.json").read_bytes())
    assert sha256(raw).hexdigest() == manifest["output"]["sha256"]
    assert len(raw) == manifest["output"]["bytes"]
    archive = json.loads(raw)
    assert archive["config"] == config
    expected = set(itertools.product(EXPECTED_MATRICES, range(5), SWAPS))
    summary = archive["summary"]
    defects = {"inequivalentDefects": 0, "defectsChangingUtility": 0, "defectsChangingBestResponse": 0}
    for row in archive["cases"]:
        game, quarter, presentation = row["game"], row["weights"][0], row["presentation"]
        expected.remove((game, quarter, presentation))
        canonical = EXPECTED_MATRICES[game]
        beliefs = [Fraction(quarter, 4), Fraction(4-quarter, 4)]
        assert row["weights"] == [4 * value for value in beliefs]
        swap_row, swap_column = SWAPS[presentation]
        matrix = [[canonical[i ^ swap_row][j ^ swap_column] for j in range(2)] for i in range(2)]
        carried = [beliefs[j ^ swap_column] for j in range(2)]
        assert row["rows"] == [swap_row, 1-swap_row]
        assert row["columns"] == [swap_column, 1-swap_column]
        assert row["view"]["payoffs"] == matrix
        assert row["view"]["weights"] == [4 * value for value in carried]
        assert [[matrix[i ^ swap_row][j ^ swap_column] for j in range(2)] for i in range(2)] == canonical
        assert row["equivalent"]
        original = utilities(canonical, beliefs)
        displayed = utilities(matrix, carried)
        assert row["original"] == row["canonicalUtilities"] == [4 * value for value in original]
        assert row["displayed"] == [4 * value for value in displayed]
        baseline = policies(original)
        for policy, response in policies(displayed).items():
            restored = [response[i ^ swap_row] for i in range(2)]
            match_pair(baseline[policy], row["baseline"][policy])
            match_pair(response, row["shown"][policy])
            match_pair(restored, row["mapped"][policy])
            assert math.isclose(dist(baseline[policy], restored), row["distances"][policy], abs_tol=1e-12)
            assert row["distances"][policy] == (swap_row if policy == "position" else 0)
        if swap_column:
            defective = utilities(matrix, beliefs)
            wrong = [defective[i ^ swap_row] for i in range(2)]
            control = row["defect"]
            assert control["equivalent"] == (quarter == 2)
            assert control["utilities"] == [4 * value for value in wrong]
            changed = dist(baseline["utility"], policies(wrong)["utility"])
            assert control["utilityTV"] == changed
            assert math.isclose(control["logitTV"], dist(baseline["logit"], policies(wrong)["logit"]), abs_tol=1e-12)
            defects["inequivalentDefects"] += quarter != 2
            defects["defectsChangingUtility"] += wrong != original
            defects["defectsChangingBestResponse"] += changed > 0
        else:
            assert row["defect"] is None
    assert not expected
    assert summary == dict(tasks=20, presentations=80, equivalenceFailures=0, utilityFailures=0,
                           tieFailures=0, maxUtilityTV=0, maxLogitTV=0, positionChanges=40, defectTrials=40,
                           **defects)
    assert defects["inequivalentDefects"] == 32 and defects["defectsChangingBestResponse"] > 0
    print("AXIOM rational reference verified all 80 presentations and 40 deliberate belief controls.", defects)


if __name__ == "__main__":
    config = json.loads((ROOT / "experiments/axiom-pilot.json").read_bytes())
    check_config(config)
    if "--fixtures" in sys.argv:
        print("AXIOM registered input and exact hand fixtures verified.")
    else:
        check_archive(config)
