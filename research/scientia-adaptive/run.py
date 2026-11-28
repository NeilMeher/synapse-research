"""Matched budget sequential fixture and exact integrated selection and confirmation."""
from argparse import ArgumentParser
from collections import defaultdict
from fractions import Fraction as F
from functools import lru_cache
from hashlib import sha256
from itertools import product
from math import comb
from pathlib import Path
import json
import re
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
spec=HERE/"protocol.json"
cfg=json.loads(spec.read_bytes())
archive=HERE.parent/"evidence"/cfg["id"]
alpha,p0,p1=(F(cfg[k]) for k in ("alpha","null","alternative"))
methods=cfg["verification"]
noesis=HERE.parent/"noesis-finite"
sys.path.insert(0,str(noesis))
from reference import check,engine,objectives,prediction
discovery=json.loads((noesis/"protocol.json").read_bytes())
chooser=cfg["selector"]
focal=discovery["focal"]
costs=list(map(F,discovery["costs"]))


@lru_cache
def reject(method,cap,seen,hits):
    if method=="evidence":
        return (p1/p0)**hits*((1-p1)/(1-p0))**(seen-hits)>=1/alpha
    p=sum(comb(seen,j)*p0**j*(1-p0)**(seen-j) for j in range(hits,seen+1))
    return p<=alpha/cap if method=="spend" else (method=="peek" or seen==cap) and p<=alpha


def independent_rule(path,method):
    n=len(path)
    hits=0
    ratio=F(1)
    for i,y in enumerate(path,1):
        hits+=y
        ratio*=p1/p0 if y else (1-p1)/(1-p0)
        if method=="evidence":
            if ratio>=1/alpha:
                return True,i
            continue
        # Count fair-coin words with at least the realized number of successes.
        limit=alpha/n if method=="spend" else alpha
        if method=="fixed" and i<n:
            continue
        upper=sum(comb(i,k) for k in range(hits,i+1))/F(2**i)
        if upper<=limit:
            return True,i
    return False,n


@lru_cache
def complete_paths(cap):
    return list(product((0,1),repeat=cap))


@lru_cache
def exercise(cap,rate,method,duplicate=False):
    hits=defaultdict(F)
    if duplicate:
        # Only one event is independently observed. Replicating its value is the stress case.
        for y in (0,1):
            hit,step=independent_rule((y,)*cap,method)
            hits[hit,step]+=rate if y else 1-rate
    else:
        alive={0:F(1)}
        for seen in range(1,cap+1):
            pending=defaultdict(F)
            for earlier,weight in alive.items():
                for bit,p in ((0,1-rate),(1,rate)):
                    current=earlier+bit
                    if reject(method,cap,seen,current):
                        hits[True,seen]+=weight*p
                    elif seen==cap:
                        hits[False,seen]+=weight*p
                    else:
                        pending[current]+=weight*p
            alive=pending
        reproduced=defaultdict(F)
        for path in complete_paths(cap):
            successes=sum(path)
            reproduced[independent_rule(path,method)]+=rate**successes*(1-rate)**(cap-successes)
        assert hits==reproduced
    assert sum(hits.values())==1
    return {"report":sum((p for (yes,_),p in hits.items() if yes),F()),
            "used":sum((k*p for (_,k),p in hits.items()),F())}


def javascript_fixture():
    cases=[]
    expected=[]
    for path,method in product(complete_paths(cfg["fixtureHorizon"]),methods):
        cases.append({"path":path,"method":method})
        report,used=independent_rule(path,method)
        expected.append({"reported":report,"used":used})
    data={"inputs":cases,"parameters":{"alpha":float(alpha),"p0":float(p0),"p1":float(p1)}}
    js=json.loads(subprocess.run(["node",str(HERE/"engine-check.mjs")],
        input=json.dumps(data),text=True,capture_output=True,check=True).stdout)
    assert js==expected
    # The one-step factor is unit mean at the boundary and monotone in the conditional rate.
    assert p0*(p1/p0)+(1-p0)*((1-p1)/(1-p0))==1
    assert p1/p0>(1-p1)/(1-p0)
    return len(cases)


def predicted_probability(model,x):
    return F(1,2)+F(model["amplitude"])*F(x)**model["exponent"]


def visibility():
    points=[discovery["initial"],*discovery["queries"]]
    potential=[dict(zip(points,path,strict=True)) for path in complete_paths(len(points))]
    models=discovery["models"]
    families=[m["family"] for m in models]
    interpolation=discovery["interpolate"]
    rates={x:[predicted_probability(model,x) for model in models] for x in points+interpolation}

    def independently_select(vector,size):
        selected=[discovery["initial"]]
        def weights():
            joint=list(map(F,[m["prior"] for m in models]))
            for x in selected:
                for i,v in enumerate(rates[x]):
                    joint[i]*=v if vector[x] else 1-v
            return [v/sum(joint) for v in joint]
        while len(selected)<size:
            w=weights()
            scores={x:objectives(w,families,rates[x],[rates[z] for z in interpolation],
                                rates[focal],costs)[chooser] for x in points if x not in selected}
            selected.append(next(x for x,v in scores.items() if max(scores.values())-v<=1e-12))
        w=weights()
        family=max(dict.fromkeys(families),key=lambda g:sum(p for p,f in zip(w,families,strict=True) if f==g))
        p=prediction(w,rates[focal])
        action="accept" if costs[0]*(1-p)<costs[1]*p-1e-12 else "reject"
        return selected,family,p,action

    choices={}
    for size in cfg["allocations"]:
        local={**discovery,"budget":size}
        selected=engine({"config":local,"cases":[{"policy":chooser,"answers":vector} for vector in potential]})
        assert len(selected)==len(potential)
        for x,vector in zip(selected,potential,strict=True):
            assert len(x["used"])==len(set(x["used"]))==size
            assert cfg["validateAt"] not in x["used"] and focal not in x["used"]
            used,family,p,action=independently_select(vector,size)
            assert (x["used"],x["family"],x["action"])==(used,family,action)
            check(x["predicted"][focal],p)
        choices[size]=selected
    return potential,choices


def programmes():
    potentials,selections=visibility()
    groups={
      "boundary":[{"family":"flat","exponent":1,"amplitude":"0","prior":"1"}],
      "specified":discovery["models"],"outOfLibrary":[discovery["stress"]]}
    groups["duplicateBoundary"]=groups["boundary"]
    worlds={}
    for name,models in groups.items():
        allocation={}
        duplicate=name=="duplicateBoundary"
        for D,selection in selections.items():
            N=cfg["horizon"]-D
            tables={method:defaultdict(F) for method in methods}
            total=F()
            for truth in models:
                at_test=predicted_probability(truth,cfg["validateAt"])
                at_action=predicted_probability(truth,focal)
                for potential,trace in zip(potentials,selection,strict=True):
                    mass=F(truth["prior"])
                    for x,y in potential.items():
                        p=predicted_probability(truth,x)
                        mass*=p if y else 1-p
                    total+=mass
                    q=at_test if trace["family"]=="quadratic" else 1-at_test
                    claim_true=q>p0
                    no_action=costs[1]*at_action
                    issued=costs[0]*(1-at_action) if trace["action"]=="accept" else no_action
                    for method,t in tables.items():
                        e=exercise(N,q,method,duplicate)
                        reported,expense=e["report"],D+e["used"]
                        t["reporting"]+=mass*reported
                        t["falseReports"]+=mass*reported*int(not claim_true)
                        t["trueReports"]+=mass*reported*int(claim_true)
                        t["observations"]+=mass*expense
                        t["focalDecisionLoss"]+=mass*(reported*issued+(1-reported)*no_action)
                        t["eligibleTrueSelections"]+=mass*int(claim_true)
            assert total==1
            for method, t in tables.items():
                assert t["observations"]<=cfg["horizon"]
                assert t["reporting"]==t["falseReports"]+t["trueReports"]
                t["FDR"]=t["falseReports"]
                t["totalLoss"]=t["focalDecisionLoss"]+F(cfg["measurementCost"])*t["observations"]+F(cfg["falseClaimCost"])*t["falseReports"]-F(cfg["claimReward"])*t["trueReports"]
            allocation[D]={method:dict(tally) for method,tally in tables.items()}
        worlds[name]=allocation
    return worlds


def study():
    fixture=javascript_fixture()
    values={h:{p:{m:exercise(h,F(p),m) for m in methods} for p in cfg["testRates"]}
            for h in (cfg["fixtureHorizon"],cfg["horizon"])}
    controls=values[cfg["horizon"]]["1/2"]
    assert controls["evidence"]["report"]<=alpha and controls["spend"]["report"]<=alpha
    assert controls["peek"]["report"]>alpha
    integrated=programmes()
    by_method=integrated["boundary"][cfg["allocations"][0]]
    return {"id":cfg["id"],"evidence":"A","javascriptFixturePaths":fixture,
            "scenarios":values,"selectAndConfirm":integrated,
            "standalonePrimary":controls["peek"]["report"]-controls["fixed"]["report"],
            "integratedPrimary":by_method["evidence"]["totalLoss"]-by_method["peek"]["totalLoss"]}


def encode(data):
    return (json.dumps(data,indent=2,sort_keys=True,default=str)+"\n").encode()


def digest(data):
    return {"sha256":sha256(data).hexdigest(),"bytes":len(data)}


def main():
    parser=ArgumentParser(description=__doc__)
    parser.add_argument("mode",choices=("run","verify"))
    parser.add_argument("commit",nargs="?")
    args=parser.parse_args()
    revision=args.commit if args.mode=="run" else json.loads((archive/"manifest.json").read_bytes())["protocolCommit"]
    if not re.fullmatch("[a-f0-9]{40}",revision or ""):
        parser.error("A frozen protocol commit is required.")
    start=time.perf_counter()
    data=encode(study())
    manifest=encode({"id":cfg["id"],"evidence":"A","status":"completed","protocolCommit":revision,
        "protocol":digest(spec.read_bytes()),"inputs":{"noesisProtocol":digest((noesis/"protocol.json").read_bytes())},
        "outputs":{"sequential-and-integrated.json":digest(data)}})
    if args.mode=="run":
        archive.mkdir()
    for name,payload in (("sequential-and-integrated.json",data),("manifest.json",manifest)):
        if args.mode=="run":
            with (archive/name).open("xb") as stream:
                stream.write(payload)
        else:
            assert (archive/name).read_bytes()==payload
    print(f"Verified 1,024 browser procedure paths and exact matched-budget programme probabilities in {time.perf_counter()-start:.3f}s.")


if __name__=="__main__":
    main()
