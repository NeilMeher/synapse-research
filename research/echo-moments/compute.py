"""Generate rational extremizers and dual witnesses for ECHO moment bounds."""
from fractions import Fraction
from hashlib import sha256
from itertools import combinations
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT.parent / "evidence/echo-heterogeneous-moments-001"


def dot(a, b):
    return sum(x*y for x, y in zip(a, b, strict=True))


def exact_support(a, b, support):
    columns = len(support)
    matrix = [[Fraction(row[j]) for j in support] + [y] for row, y in zip(a, b, strict=True)]
    for j in range(columns):
        k = next(k for k in range(j, len(matrix)) if matrix[k][j])
        matrix[j], matrix[k] = matrix[k], matrix[j]
        pivot = matrix[j][j]
        matrix[j] = [x/pivot for x in matrix[j]]
        for i, row in enumerate(matrix):
            if i != j and row[j]:
                matrix[i] = [x-row[j]*y for x, y in zip(row, matrix[j], strict=True)]
    return [matrix[i][-1] for i in range(columns)]


def endpoints(a, b, c, sign, tolerance, max_denom):
    from scipy.optimize import linprog
    fit = linprog([sign*x for x in c], A_eq=a, b_eq=list(map(float, b)),
                  bounds=(0, None), method="highs-ds")
    if not fit.success:
        raise ValueError(fit.message)
    support = [i for i, p in enumerate(fit.x) if p > tolerance]
    p = exact_support(a, b, support)
    dual = [Fraction(float(x)*sign).limit_denominator(max_denom) for x in fit.eqlin.marginals]
    value = dot(p, [c[i] for i in support])
    if (not all(x > 0 for x in p)
            or any(dot(p, [row[i] for i in support]) != y for row, y in zip(a, b, strict=True))
            or any(sign * (cost - dot(dual, column)) < 0 for cost, column in zip(c, zip(*a), strict=True))
            or dot(dual, b) != value):
        raise ValueError("Failed exact primal or dual verification after numerical optimization")
    return {"bound": str(value), "witness": [[i, str(pj)] for i, pj in zip(support, p, strict=True)],
            "dual": list(map(str, dual))}


def independent(probabilities):
    n = len(probabilities)
    distribution = []
    for state in range(2**n):
        mass = Fraction(1)
        for i, p in enumerate(probabilities):
            mass *= p if state & (1 << i) else 1-p
        distribution.append(mass)
    return distribution


def bits(subset):
    return sum(1 << i for i in subset)


def run_case(weights, cfg):
    size = len(weights).bit_length()-1
    states = range(len(weights))
    units = list(range(size))
    singles = list(map(bits, combinations(units, 1)))
    pairs = list(map(bits, combinations(units, 2)))
    selected = [bits(row) for row in cfg["selectedTriples"]] if size == 7 else [7]
    objectives = {"strictMajority": [int(s.bit_count() > size/2) for s in states],
                  "allWrong": [int(s == 0) for s in states]}
    result = {"states": len(weights), "fixedDistribution": list(map(str, weights)), "scopes": {}}
    for scope, features in zip(cfg["scopes"], ([0, *singles], [0, *singles, *pairs],
                                               [0, *singles, *pairs, *selected]), strict=True):
        a = [[int(s & f == f) for s in states] for f in features]
        b = [dot(weights, row) for row in a]
        bounds = {name: {"observed": str(dot(weights, c)),
            "lower": endpoints(a, b, c, 1, cfg["supportTolerance"], cfg["dualMaxDenominator"]),
            "upper": endpoints(a, b, c, -1, cfg["supportTolerance"], cfg["dualMaxDenominator"])}
            for name, c in objectives.items()}
        result["scopes"][scope] = {"features": features, "moments": list(map(str, b)), "targets": bounds}
    return result


def main():
    if len(sys.argv) != 2 or not re.fullmatch("[a-f0-9]{40}", sys.argv[1]):
        raise ValueError("Supply the frozen study commit")
    cfg_file = ROOT / "protocol.json"
    cfg = json.loads(cfg_file.read_bytes())
    raw = (ROOT / cfg["calibrationArchive"]).read_bytes()
    if sha256(raw).hexdigest() != cfg["calibrationSha256"]:
        raise ValueError("Original calibration archive changed")
    cal = json.loads(raw)[cfg["calibrationSubset"]]
    weights = [Fraction(0)]*128
    for row in cal:
        state = sum(1 << i for i, p in enumerate(row["predictions"]) if p == row["gold"])
        weights[state] += Fraction(1, len(cal))
    report = {"id": cfg["id"], "evidenceClass": cfg["evidenceClass"], "protocolCommit": sys.argv[1],
              "calibrationCount": len(cal), "cases": {
        "exactThree": run_case(independent(list(map(Fraction, cfg["threeModelProbabilities"]))), cfg),
        "heterogeneousSeven": run_case(independent(list(map(Fraction, cfg["syntheticSevenProbabilities"]))), cfg),
        "englishCalibration": run_case(weights, cfg)}}
    payload = (json.dumps(report, indent=2) + "\n").encode()
    manifest = {"id": cfg["id"], "evidence": cfg["evidenceClass"], "status": "completed",
                "protocolCommit": sys.argv[1], "protocolHash": sha256(cfg_file.read_bytes()).hexdigest(),
                "outputs": {"bounds.json": {"bytes": len(payload), "sha256": sha256(payload).hexdigest()}}}
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    for name, data in (("bounds.json", payload),
                       ("manifest.json", (json.dumps(manifest, indent=2)+"\n").encode())):
        file = ARCHIVE / name
        if file.exists():
            if file.read_bytes() != data:
                raise ValueError("Pre-existing immutable evidence differs")
        else:
            with file.open("xb") as stream:
                stream.write(data)
    print(json.dumps({case: {scope: {target: [d["lower"]["bound"], d["upper"]["bound"]]
        for target, d in s["targets"].items()} for scope, s in record["scopes"].items()}
        for case, record in report["cases"].items()}))


if __name__ == "__main__":
    main()
