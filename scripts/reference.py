"""Exact, independently coded finite sample reference for the published design."""
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def binomial(n, q, k):
    if k < 0 or k > n:
        return 0.0
    return math.comb(n, k) * q**k * (1-q)**(n-k)


def source_vector_mass(n, k, q, rho):
    if n == 0:
        return 1.0
    unanimous = (q if k == n else 0.0) + ((1-q) if k == 0 else 0.0)
    return (1-rho) * q**k * (1-q)**(n-k) + rho * unanimous


def oracle(n, original_correct, m, fresh_correct, q, rho):
    one = source_vector_mass(n, original_correct, q, rho) * q**fresh_correct * (1-q)**(m-fresh_correct)
    zero = source_vector_mass(n, n-original_correct, q, rho) * q**(m-fresh_correct) * (1-q)**fresh_correct
    return one / (one + zero)


def exact(case, rho):
    n, q, rounds, radius = (case[key] for key in ("agents", "reliability", "rounds", "radius"))
    if radius >= 2*q-1-1e-12:
        raise ValueError("This closed-form reference intentionally covers the protocol's fixed HK case.")
    fresh = case["verified"]
    m = n - fresh
    totals = defaultdict(float)
    hub_mass = 1/n
    for _ in range(rounds):
        hub_mass = 0.5 + (case["hubWeight"]-0.5)*hub_mass

    def accumulate(policy, belief, mass):
        win = 0.5 if math.isclose(belief, 0.5, rel_tol=0, abs_tol=1e-12) else float(belief > 0.5)
        totals["accuracy", policy] += mass*win
        totals["brier", policy] += mass*(1-belief)**2

    for hub_correct in (0, 1):
        for leaf_correct in range(n):
            correct = hub_correct + leaf_correct
            independent = (q if hub_correct else 1-q) * binomial(n-1, q, leaf_correct)
            unanimous = (q if correct == n else 0.0) + ((1-q) if correct == 0 else 0.0)
            mass = (1-rho)*independent + rho*unanimous
            if mass == 0:
                continue
            totals["accuracy", "individual"] += mass*correct/n
            totals["brier", "individual"] += mass*(correct*(1-q)**2 + (n-correct)*q**2)/n
            fraction = correct/n
            linear = 1-q + (2*q-1)*fraction
            for policy in ("majority", "complete", "ring", "bounded"):
                accumulate(policy, linear, mass)
            fraction_hub = hub_mass*hub_correct + (1-hub_mass)*leaf_correct/(n-1)
            accumulate("hub", 1-q + (2*q-1)*fraction_hub, mass)
            accumulate("naiveBayes", oracle(n, correct, 0, 0, q, 0), mass)
            accumulate("awareBayes", oracle(n, correct, 0, 0, q, rho), mass)

    for old_correct in range(m+1):
        original_mass = math.comb(m, old_correct)*source_vector_mass(m, old_correct, q, rho)
        if original_mass == 0:
            continue
        for fresh_correct in range(fresh+1):
            mass = original_mass*binomial(fresh, q, fresh_correct)
            accumulate("verifiedBayes", oracle(m, old_correct, fresh, fresh_correct, q, rho), mass)
    return totals


def cross_check(mode):
    artifact = ROOT / "results" / f"{mode}.json"
    config = json.loads((ROOT / "experiments" / f"{mode}.json").read_text())
    reference = {rho: exact(config["scenario"], rho) for rho in config["correlations"]}
    observed = json.loads(artifact.read_text()) if artifact.exists() else None
    for rho, values in reference.items():
        print(f"{mode} rho={rho:.2f} majority={values['accuracy', 'majority']:.6f} "
              f"hub={values['accuracy', 'hub']:.6f} verification={values['accuracy', 'verifiedBayes']:.6f}")
    if observed is None:
        return
    for condition in observed["conditions"]:
        expected = reference[condition["correlation"]]
        assert abs(condition["exactMajorityAccuracy"]-expected["accuracy", "majority"]) < 1e-12
        for metric in condition["metrics"]:
            value = expected[metric["metric"], metric["policy"]]
            tolerance = 5*metric["sd"]/math.sqrt(metric["trials"]) + 1/metric["trials"]
            assert abs(value-metric["estimate"]) <= tolerance, (condition["correlation"], metric, value)
    independent, shared = reference[0], reference[0.75]
    exact_contrasts = [
        independent["accuracy", "majority"] - independent["accuracy", "individual"]
        - (shared["accuracy", "majority"] - shared["accuracy", "individual"]),
        shared["accuracy", "complete"] - shared["accuracy", "hub"],
        shared["accuracy", "verifiedBayes"] - shared["accuracy", "awareBayes"],
    ]
    for value, row in zip(exact_contrasts, observed["contrasts"], strict=True):
        tolerance = 5*row["sd"]/math.sqrt(row["trials"]) + 2/row["trials"]
        assert abs(value-row["estimate"]) <= tolerance, (row["id"], row["estimate"], value)
    print(f"{mode}: all metrics and contrasts inside exact-reference tolerances")
    print("Exact contrasts:", ", ".join(f"{value:.6f}" for value in exact_contrasts))


if __name__ == "__main__":
    for mode in ("pilot", "confirmatory"):
        if (ROOT / "experiments" / f"{mode}.json").exists():
            cross_check(mode)
