"""Enumerate independent rational reference cases for the dynamic trust mathematics."""
from argparse import ArgumentParser
from fractions import Fraction as F
from hashlib import sha256
from itertools import product
from math import isclose, log2, prod
from pathlib import Path
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FIXTURE = HERE / "fixtures.json"
OUTPUT = ROOT / "research/evidence/morpheus-adaptive-mathematics-001"


def encoded(value):
    return (json.dumps(value, sort_keys=True, indent=2, default=str) + "\n").encode()


def identity(data):
    return {"bytes": len(data), "sha256": sha256(data).hexdigest()}


def weights(bits, p):
    return prod(p if bit else 1-p for bit in bits)


def moments(case):
    a, q, initial, n = (F(case[key]) for key in ("alpha", "rate", "initial", "steps"))
    n = int(n)
    points = []
    for bits in product((0, 1), repeat=n):
        x = initial
        for z in bits:
            x += a*(z-x)
        points.append((x, weights(bits, q)))
    mean = sum(x*mass for x, mass in points)
    variance = sum(mass*(x-mean)**2 for x, mass in points)
    assert mean == q+(initial-q)*(1-a)**n
    stationary_second = (2*a*(1-a)*q*q + a*a*q)/(1-(1-a)**2)
    stationary = stationary_second-q*q
    assert variance == stationary*(1-(1-a)**(2*n))
    return {"mean": mean, "variance": variance, "stationaryVariance": stationary}


def beta(case):
    a,b,s,f = (F(case[key]) for key in ("a","b","successes","failures"))
    # Integrals of p^j(1-p)^k against the prior, scaled by its beta integral.
    def integral(j,k):
        return F(1)*prod(a+i for i in range(j))*prod(b+i for i in range(k))/prod(a+b+i for i in range(j+k))
    s,f = int(s),int(f)
    likelihood = integral(s,f)
    mean = integral(s+1,f)/likelihood
    return {"a":a+s,"b":b+f,"mean":mean,"variance":integral(s+2,f)/likelihood-mean**2}


def regime(parameters, audits, time):
    m = {key:F(value) for key,value in parameters.items()}
    transitions = {0:(1-m["restore"],m["restore"]),1:(m["fail"],1-m["fail"])}
    likelihoods = {}
    for state, rate in ((0,m["faultyRate"]),(1,m["healthyRate"])):
        # Integrate over latent correctness and independently flipped audit observations.
        for z in (0,1):
            likelihoods[state,z] = sum(
                (rate if truth else 1-rate)*(m["auditAccuracy"] if truth==z else 1-m["auditAccuracy"])
                for truth in (0,1))
    visible = {a["event"]:a["outcome"] for a in audits if a["arrival"]<=time}

    def distribution(ignore_current):
        state_mass = [F(), F()]
        for path in product((0,1),repeat=time+1):
            weight = (m["prior"] if path[0] else 1-m["prior"])
            weight *= prod(transitions[pre][curr] for pre,curr in zip(path,path[1:]))
            weight *= prod(likelihoods[path[event],seen] for event,seen in visible.items()
                           if event<time or not ignore_current)
            state_mass[path[-1]] += weight
        return [x/sum(state_mass) for x in state_mass]

    predicted = distribution(True)
    posterior = distribution(False)
    return {"predictedHealthy":predicted[1],"filteredHealthy":posterior[1],
            "nextHealthy":sum(posterior[i]*transitions[i][1] for i in (0,1)),
            "reliability":posterior[0]*m["faultyRate"]+posterior[1]*m["healthyRate"]}


def passage(case):
    a,q,initial,cut = (F(case[key]) for key in ("alpha","rate","initial","threshold"))
    n = case["steps"]
    masses = [F() for _ in range(n+1)]
    survival = F()
    for bits in product((0,1),repeat=n):
        # Explicit finite weighted sum at each prefix. Full paths count first hits once.
        states = [(1-a)**k*initial+a*sum(z*(1-a)**(k-i-1) for i,z in enumerate(bits[:k]))
                  for k in range(n+1)]
        crossing = next((k for k,state in enumerate(states) if state<=cut),None)
        mass = weights(bits,q)
        if crossing is None:
            survival += mass
        else:
            masses[crossing] += mass
    assert sum(masses)+survival == 1
    return {"masses":masses,"survival":survival}


def decisions(case):
    p,x,y,c,a = (F(case[key]) for key in ("prior","falseAccept","falseReject","cost","accuracy"))
    prior = [1-p,p]
    losses = [(x,0),(0,y)]
    immediate = [sum(prior[s]*action[s] for s in (0,1)) for action in losses]
    # Enumerate all four policies, including ignoring the audit signal.
    using_signal = min(sum(prior[s]*(a if s==z else 1-a)*losses[choices[z]][s]
                           for s,z in product((0,1),repeat=2))
                       for choices in product((0,1),repeat=2))
    return {"accept":immediate[0],"reject":immediate[1],"verify":c+using_signal,
            "valueOfInformation":min(immediate)-using_signal}


def compare(expected, measured, tolerance):
    if isinstance(expected, dict):
        assert expected.keys() == measured.keys()
        for k,v in expected.items():
            compare(v,measured[k],tolerance)
    elif isinstance(expected, list):
        for a,b in zip(expected,measured,strict=True):
            compare(a,b,tolerance)
    else:
        assert isclose(float(expected),measured,rel_tol=0,abs_tol=tolerance), (expected,measured)


def verify(fixture):
    reg = fixture["regime"]
    model = reg["model"]
    exact = {
        "moments":[moments(c) for c in fixture["momentCases"]],
        "beta":[beta(c) for c in fixture["betaCases"]],
        "regime":[regime(model,reg["audits"],t) for t in reg["times"]],
        "uninformative":[regime({**model,"auditAccuracy":reg["uninformativeAccuracy"]},reg["audits"],t) for t in reg["times"]],
        "passage":[passage(c) for c in fixture["passageCases"]],
        "decisions":[decisions(c) for c in fixture["decisionCases"]],
    }
    actual = json.loads(subprocess.check_output(["node",str(HERE/"evaluate.mjs")],cwd=ROOT))
    for case, checked in zip(fixture["momentCases"],actual["moments"],strict=True):
        a = F(case["alpha"])
        h = checked.pop("halfLife")
        assert h == 1 if a == 1 else isclose((1-float(a))**h,.5,abs_tol=1e-12)
    compare(exact,actual,fixture["tolerance"])
    r = F(4,5)
    shared = r/(r+1-r)
    independent = r*r/(r*r+(1-r)**2)
    assert shared == F(4,5) and independent == F(16,17)
    # A four-state world with an independent fair nuisance bit, plus a 75% accurate truth bit.
    def channel(irrelevant):
        joint = [[sum(F(1,4)*(int(z==other) if irrelevant else F(3,4) if z==truth else F(1,4))
                      for other in (0,1)) for z in (0,1)] for truth in (0,1)]
        info = sum(float(j)*log2(float(j/(sum(joint[y])*sum(row[z] for row in joint))))
                   for y,row in enumerate(joint) for z,j in enumerate(row) if j)
        return {"truthInformationBits":info, "decisionValue":F(1,2)-sum(min(col) for col in zip(*joint))}
    return {"id":fixture["id"],"evidence":"A","exactResults":exact,
            "duplicateReports":{"jointPosterior":shared,"independencePosterior":independent},
            "decisionInformation":{"irrelevant":{"stateInformationBits":1,**channel(True)},
                                   "noisyTruth":{"stateInformationBits":channel(False)["truthInformationBits"],**channel(False)}},
            "agreementTolerance":fixture["tolerance"]}


def main():
    cli = ArgumentParser(description=__doc__)
    cli.add_argument("mode",choices=("run","verify"))
    cli.add_argument("protocol_commit",nargs="?")
    args = cli.parse_args()
    original = FIXTURE.read_bytes()
    metadata = json.loads((OUTPUT/"manifest.json").read_bytes()) if args.mode=="verify" else None
    commit = metadata["protocolCommit"] if metadata else args.protocol_commit
    if not re.fullmatch(r"[a-f0-9]{40}",commit or ""):
        cli.error("a frozen protocol commit is required")
    result = verify(json.loads(original))
    payload = encoded(result)
    manifest = {"id":result["id"],"evidence":"A","status":"completed","protocolCommit":commit,
                "protocol":identity(original),"outputs":{"exact-fixtures.json":identity(payload)}}
    if args.mode=="run":
        OUTPUT.mkdir(parents=True,exist_ok=True)
    for name,data in (("exact-fixtures.json",payload),("manifest.json",encoded(manifest))):
        path = OUTPUT/name
        if args.mode=="verify" or path.exists():
            assert path.read_bytes()==data, path
        else:
            with path.open("xb") as stream:
                stream.write(data)
    print("Verified 31 finite adaptive-trust cases against the shared application implementation and two information examples.")


if __name__ == "__main__":
    main()
