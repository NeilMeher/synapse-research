"""Verify finite moment bounds with exact arithmetic, without the numerical solver."""
from fractions import Fraction as Q
from hashlib import sha256
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT.parent / "evidence/echo-heterogeneous-moments-001"


def verify():
    payload = (ARCHIVE / "bounds.json").read_bytes()
    manifest = json.loads((ARCHIVE / "manifest.json").read_bytes())
    record = manifest["outputs"]["bounds.json"]
    assert record == {"bytes": len(payload), "sha256": sha256(payload).hexdigest()}
    data = json.loads(payload)
    cfg_file = ROOT / "protocol.json"
    cfg = json.loads(cfg_file.read_bytes())
    assert sha256(cfg_file.read_bytes()).hexdigest() == manifest["protocolHash"]
    assert data["protocolCommit"] == manifest["protocolCommit"]
    cal = (ROOT / cfg["calibrationArchive"]).read_bytes()
    assert sha256(cal).hexdigest() == cfg["calibrationSha256"]
    checked = 0
    for key, record in data["cases"].items():
        n = record["states"].bit_length()-1
        domain = list(itertools.product([0, 1], repeat=n))
        baseline = {}
        if key == "englishCalibration":
            rows = json.loads(cal)[cfg["calibrationSubset"]]
            for row in rows:
                x = tuple(int(p == row["gold"]) for p in row["predictions"])
                baseline[x] = baseline.get(x, Q(0)) + Q(1, len(rows))
        else:
            choice = "threeModelProbabilities" if n == 3 else "syntheticSevenProbabilities"
            for x in domain:
                mass = Q(1)
                for report, p in zip(x, map(Q, cfg[choice]), strict=True):
                    mass *= p if report else 1-p
                baseline[x] = mass
        def unpack(num):
            return tuple(int(b) for b in f"{num:0{n}b}"[::-1])
        assert all(baseline.get(unpack(i), 0) == Q(w) for i, w in enumerate(record["fixedDistribution"]))
        running = {}
        for scope, archive in record["scopes"].items():
            features = [{i for i, bit in enumerate(unpack(f)) if bit} for f in archive["features"]]
            moments = list(map(Q, archive["moments"]))
            assert [sum(w for x, w in baseline.items() if all(x[i] for i in mask))
                    for mask in features] == moments
            for target, arm in archive["targets"].items():
                def success(x):
                    return (sum(x) > n // 2) if target == "strictMajority" else not any(x)
                low, high = (Q(arm[p]["bound"]) for p in ("lower", "upper"))
                observed = sum(w for x, w in baseline.items() if success(x))
                assert low <= observed <= high and observed == Q(arm["observed"])
                if target in running:
                    old_low, old_high = running[target]
                    assert old_low <= low <= high <= old_high
                running[target] = low, high
                for lower, name in ((True, "lower"), (False, "upper")):
                    witness = [(unpack(i), Q(w)) for i, w in arm[name]["witness"]]
                    assert all(w > 0 for _, w in witness)
                    expected = Q(arm[name]["bound"])
                    assert [sum(w for x, w in witness if all(x[i] for i in mask))
                            for mask in features] == moments
                    assert sum(w for x, w in witness if success(x)) == expected
                    dual = list(map(Q, arm[name]["dual"]))
                    for x in domain:
                        envelope = sum(a for a, mask in zip(dual, features, strict=True) if all(x[i] for i in mask))
                        assert (envelope <= success(x) if lower else success(x) <= envelope)
                    assert sum(a*b for a,b in zip(dual,moments,strict=True)) == expected
                    checked += 1
        if n == 3:
            p1,p2,p3 = map(Q, cfg["threeModelProbabilities"])
            q12,q13,q23 = p1*p2,p1*p3,p2*p3
            t_min = max(0,q12+q13-p1,q12+q23-p2,q13+q23-p3)
            t_max = min(q12,q13,q23,1-p1-p2-p3+q12+q13+q23)
            s = q12+q13+q23
            result = record["scopes"]["pairs"]["targets"]["strictMajority"]
            assert (Q(result["lower"]["bound"]), Q(result["upper"]["bound"])) == (s-2*t_max,s-2*t_min)
            assert (s-2*t_max, s-2*t_min) == (Q("0.74"), Q("0.86"))
    print(f"Verified {checked} exact primal and dual certificates, all states and the closed-form three-model fixture.")


if __name__ == "__main__":
    verify()
