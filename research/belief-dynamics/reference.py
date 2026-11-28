"""Enumerate latent paths and jointly observable evidence for the registered finite study."""
import argparse
from collections import defaultdict
from fractions import Fraction as F
from hashlib import sha256
from itertools import product
from math import isclose
from pathlib import Path
import json
import re
import subprocess

HERE=Path(__file__).resolve().parent
spec=HERE/"protocol.json"
cfg=json.loads(spec.read_bytes())
archive=HERE.parent/"evidence"/cfg["id"]
model={k:F(v) for k,v in cfg["rates"].items()}
rates=(model["faultyRate"],model["healthyRate"])
alt,ca,cr,cost,eta,abstain=(F(cfg[k]) for k in ("alternative","falseAccept","falseReject","cost","verifyAccuracy","abstain"))


def pair(p):
    return ((0,1-p),(1,p))


def worlds(law,delay):
    """True truth/evidence mass and separate mode/evidence mass."""
    table=defaultdict(lambda:[F(),F()])
    calibration=defaultdict(lambda:[F(),F()])
    time=cfg["horizon"]
    for states in product((0,1),repeat=time+1):
        mass=(1-model["prior"],model["prior"])[states[0]]
        for j,k in zip(states,states[1:]):
            p=model["restore"] if j==0 else 1-model["fail"]
            mass*=p if k else 1-p
        available=time-delay+1
        audit_probability=[1-model["auditAccuracy"]+(2*model["auditAccuracy"]-1)*rates[x] for x in states[:available]]
        for audit in product(*(pair(p) for p in audit_probability)):
            bits=tuple(a[0] for a in audit)
            w=mass
            for _,p in audit:
                w*=p
            mode=states[-1]
            calibration[bits][mode]+=w
            for truth in (0,1):
                for a,both in pair(rates[mode]):
                    secondary=pair(rates[mode]) if law!="duplicate" else ((a,F(1)),)
                    for b,other in secondary:
                        for c,last in pair(alt):
                            reports=(truth^int(not a),truth^int(not b),truth^int(not c))
                            table[bits,reports][truth]+=w*both*other*last/2
    assert sum(sum(x) for x in table.values())==1
    assert sum(sum(x) for x in calibration.values())==1
    assert all(w>=0 for v in table.values() for w in v)
    # Expected correctness of both primary reports equals the same regime-mixture mean.
    expected=sum(sum(m[i]*rates[i] for i in (0,1)) for m in calibration.values())
    for idx in (0,1):
        assert sum(m[r[idx]] for (_,r),m in table.items())==expected
    assert sum(m[r[2]] for (_,r),m in table.items())==alt
    joint=sum(m[r[0]] for (_,r),m in table.items() if r[0]==r[1])
    expected_joint=expected if law=="duplicate" else sum(sum(m[i]*rates[i]**2 for i in (0,1)) for m in calibration.values())
    assert joint==expected_joint
    return dict(sorted(table.items())),calibration,expected,joint


def calculation(policy,law,reports,mode_weights):
    healthy=mode_weights[1]/sum(mode_weights) if policy.startswith("adaptive") else F(1)
    aware=policy.endswith("-aware")
    q=(1-healthy)*rates[0]+healthy*rates[1]
    joint=[]
    for truth in (0,1):
        flags=[r==truth for r in reports]
        if not aware:
            mass=q*q if all(flags[:2]) else (1-q)**2 if not any(flags[:2]) else q*(1-q)
        else:
            def likelihood(rate):
                if law=="duplicate":
                    return (rate if flags[0] else 1-rate) if flags[0]==flags[1] else F()
                return (rate if flags[0] else 1-rate)*(rate if flags[1] else 1-rate)
            mass=(1-healthy)*likelihood(rates[0])+healthy*likelihood(rates[1])
        joint.append(mass*(alt if flags[2] else 1-alt))
    conditional=joint[1]/sum(joint)
    observations=[]
    for sign in (0,1):
        a,b=joint[0]*(1-eta if sign else eta),joint[1]*(eta if sign else 1-eta)
        observations.append(("accept" if ca*a<cr*b else "reject",min(ca*a,cr*b)))
    risks={"reject":cr*conditional,"accept":ca*(1-conditional),"abstain":abstain,
           "verify":cost+sum(p[1] for p in observations)/sum(joint)}
    selected=min(risks,key=risks.get)
    report=conditional**2/(conditional**2+(1-conditional)**2)
    return conditional,report,selected,[o[0] for o in observations]


def actual_loss(action, observed, truth):
    if action=="accept":
        return ca*(1-truth)
    if action=="reject":
        return cr*truth
    if action=="abstain":
        return abstain
    return cost+sum(m*actual_loss(observed[s],(),truth) for s,m in pair(eta if truth else 1-eta))


def study():
    cells,expected=[],[]
    rows={}
    for law,delay in product(cfg["laws"],(cfg["shortLag"],cfg["longLag"])):
        data,mode,mean,joint=worlds(law,delay)
        store={}
        for policy in cfg["policies"]:
            totals=defaultdict(F)
            calibration=[defaultdict(F),defaultdict(F)]
            for (bits,reports),truth in data.items():
                mass=sum(truth)
                p,q,selected,then=calculation(policy,law,reports,mode[bits])
                if policy=="adaptive-aware":
                    assert p==truth[1]/mass
                cells.append({"law":law,"delay":delay,"bits":bits,"reports":reports,"policy":policy})
                expected.append((p,q,selected,then))
                totals[selected]+=mass
                for y,w in enumerate(truth):
                    totals["loss"]+=w*actual_loss(selected,then,y)
                    totals["internalBrier"]+=w*(p-y)**2
                    totals["reportedBrier"]+=w*(q-y)**2
                    for mapping,z in zip(calibration,(p,q),strict=True):
                        mapping[min(9,int(z*10))]+=w*(z-y)
            assert sum(totals[k] for k in ("accept","reject","verify","abstain"))==1
            store[policy]={**totals,"coverage":1-totals["abstain"],
                           "internalECE":sum(map(abs,calibration[0].values())),
                           "reportedECE":sum(map(abs,calibration[1].values()))}
        rows[f"{law}:{delay}"]={"policies":store,"observationCells":len(data),
                               "marginalPrimaryCorrectness":mean,"jointPrimaryCorrectness":joint}
    actual=json.loads(subprocess.run(["node",str(HERE/"engine-check.mjs")],
        input=json.dumps(cells),capture_output=True,text=True,check=True).stdout)
    for j,((p,q,action,choices),result) in enumerate(zip(expected,actual,strict=True)):
        assert isclose(float(p),result["posterior"],rel_tol=0,abs_tol=1e-12), j
        assert isclose(float(q),result["reported"],rel_tol=0,abs_tol=1e-12), j
        assert (action,choices)==(result["selected"],result["after"]), (j,cells[j],action,choices,result)
    def difference(delay):
        p=rows[f"duplicate:{delay}"]["policies"]
        return p["adaptive-naive"]["loss"]-p["adaptive-aware"]["loss"]
    interaction=difference(cfg["longLag"])-difference(cfg["shortLag"])
    return {"id":cfg["id"],"evidence":"A","cellsChecked":len(cells),"scenarios":rows,
            "primary":{"interaction":interaction,"shortLagIndependencePenalty":difference(cfg["shortLag"]),
                       "longLagIndependencePenalty":difference(cfg["longLag"])}}


def encode(value):
    return (json.dumps(value,indent=2,sort_keys=True,default=str)+"\n").encode()


def fingerprint(data):
    return {"bytes":len(data),"sha256":sha256(data).hexdigest()}


def main():
    args=argparse.ArgumentParser()
    args.add_argument("mode",choices=("run","verify"))
    args.add_argument("commit",nargs="?")
    parsed=args.parse_args()
    revision=parsed.commit if parsed.mode=="run" else json.loads((archive/"manifest.json").read_bytes())["protocolCommit"]
    if not re.fullmatch("[0-9a-f]{40}",revision or ""):
        args.error("A frozen protocol commit is required.")
    result=study()
    data=encode(result)
    manifest=encode({"id":cfg["id"],"evidence":cfg["evidence"],"status":"completed","protocolCommit":revision,
                     "protocol":fingerprint(spec.read_bytes()),"outputs":{"factorial.json":fingerprint(data)}})
    if parsed.mode=="run":
        archive.mkdir()
    for name,content in (("factorial.json",data),("manifest.json",manifest)):
        path=archive/name
        if parsed.mode=="run":
            with path.open("xb") as file:
                file.write(content)
        else:
            assert content==path.read_bytes(),name
    print(f"Exact joint-state comparison and JavaScript replay agreed on {result['cellsChecked']} visible policy cells.")


if __name__=="__main__":
    main()
