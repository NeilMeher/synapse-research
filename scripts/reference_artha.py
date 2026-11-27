"""Independent ARTHA check by summing production rounds."""
from collections import defaultdict
from math import fsum, isclose
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
VECTOR_FIELDS = ("output", "imports", "valueAdded", "adjustments", "finalDemand")


def read(path):
    return json.loads((ROOT / path).read_bytes())


def compare(actual, expected, label):
    if not isclose(actual, expected, rel_tol=2e-11, abs_tol=2e-9):
        raise ValueError(f"{label} differs: {actual} vs {expected}")


def aggregate(panel, groups):
    by_code = {item["code"]: index for index, item in enumerate(panel["industries"])}
    blocks = [[by_code[code] for code in group["members"]] for group in groups]
    if sorted(index for block in blocks for index in block) != list(range(len(by_code))):
        raise ValueError("Invalid reference grouping.")
    flows = panel["transactions"]
    data = {field: [fsum(panel[field][i] for i in block) for block in blocks]
            for field in VECTOR_FIELDS}
    data["transactions"] = [[fsum(flows[i][j] for i in left for j in right)
                             for right in blocks] for left in blocks]
    return data


def rounds(data, demand):
    n = len(demand)
    gross = data["output"]
    flows = data["transactions"]

    def next_round(previous):
        return [fsum(row[j] * (previous[j] / gross[j]) for j in range(n)) for row in flows]

    # The positive weighted norm induced by observed sector output bounds
    # the remaining series because these two panels have positive domestic final use.
    bound = max(value / g for value, g in zip(next_round(gross), gross))
    if not 0 <= bound < 1:
        raise ValueError("Reference cannot bound this production series.")
    initial = next_round(demand)
    total = demand.copy()
    term = initial
    higher = [0.0] * n
    for step in range(1, 10001):
        total = [fsum(pair) for pair in zip(total, term)]
        if step > 1:
            higher = [fsum(pair) for pair in zip(higher, term)]
        remaining = max(abs(value) / g for value, g in zip(term, gross)) * bound / (1 - bound) * max(gross)
        if remaining < 2e-12:
            break
        term = next_round(term)
    else:
        raise ValueError("Production series did not converge within 10,000 rounds.")
    return dict(direct=demand, firstRound=initial, otherRounds=higher,
                indirect=[fsum(pair) for pair in zip(initial, higher)], output=total,
                valueAdded=[value * va / g for value, va, g in zip(total, data["valueAdded"], gross)],
                importedInputs=[value * imp / g for value, imp, g in zip(total, data["imports"], gross)])


def main():
    full = read("data/processed/artha-india.json")
    groups = read("data/processed/artha-groups.json")
    archive = read("results/artha-scenario.json")
    config = read("experiments/artha-scenario.json")
    if archive["config"] != config or [run["year"] for run in archive["panels"]] != config["panels"]:
        raise ValueError("Scenario design changed.")
    count = 0
    for run in archive["panels"]:
        data = full["panels"][str(run["year"])]
        for resolution, scenario in zip(("source", "aggregated"), run["comparisons"], strict=True):
            detail = data if resolution == "source" else aggregate(data, groups)
            codes = [x["code"] for x in (data["industries"] if resolution == "source" else groups)]
            size = len(codes)
            if scenario["resolution"] != resolution or scenario["industryCount"] != size:
                raise ValueError("Unexpected comparison resolution.")
            for i in range(size):
                compare(fsum(detail["transactions"][i]) + detail["finalDemand"][i], detail["output"][i], "row")
                compare(fsum([*(row[i] for row in detail["transactions"]),
                               *(detail[field][i] for field in ("imports", "valueAdded", "adjustments"))]),
                        detail["output"][i], "column")
            for shock, saved in zip(config["shocks"], scenario["scenarios"], strict=True):
                if shock["id"] != saved["id"]:
                    raise ValueError("Scenario order changed.")
                demand = [0.0] * size
                demand[codes.index(shock["sourceCode" if resolution == "source" else "groupCode"])] = config["amount"]
                if saved["shock"] != demand:
                    raise ValueError("Scenario demand differs.")
                for key, vector in rounds(detail, demand).items():
                    for n, (actual, expected) in enumerate(zip(saved[key], vector, strict=True)):
                        compare(actual, expected, f"{shock['id']} {key} sector {n}")
                    compare(saved["totals"][key], fsum(vector), f"{shock['id']} total {key}")
                count += 1
    print(f"ARTHA reference verified {count} sector-vector scenarios and four sets of row and column accounts.")


if __name__ == "__main__":
    main()
