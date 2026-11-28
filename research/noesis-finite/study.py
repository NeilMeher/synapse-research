"""Prospectively fixed, exact potential-observation evaluation for NOESIS."""
from collections import defaultdict
from fractions import Fraction as F
from hashlib import sha256
from itertools import product
from pathlib import Path
import argparse
import json
import re
import time

from reference import check,engine,fixtures,mean,objectives,prediction

HERE=Path(__file__).resolve().parent
protocol=HERE/"protocol.json"
config=json.loads(protocol.read_bytes())
archive=HERE.parent/"evidence"/config["id"]
models=config["models"]
families=[m["family"] for m in models]
ordered=list(dict.fromkeys(families))
prior=list(map(F,[m["prior"] for m in models]))
initial=config["initial"]
queries=config["queries"]
interpolate,extrapolate=config["interpolate"],config["extrapolate"]
points=[initial,*queries]
evaluation=interpolate+extrapolate
costs=list(map(F,config["costs"]))
tolerance=config["tolerance"]


def probability(model,x):
    return F(1,2)+F(model["amplitude"])*F(x)**model["exponent"]


lookup={x:[probability(m,x) for m in models] for x in points+evaluation}


def sequential(policy,answers):
    def reweight(seen):
        joint=[]
        for model,p in zip(models,prior,strict=True):
            for x in seen:
                q=probability(model,x)
                p*=q if answers[x] else 1-q
            joint.append(p)
        return [p/sum(joint) for p in joint]
    acquired=[initial]
    for step in range(config["budget"]-1):
        if policy=="uniform":
            query=config["uniform"][step]
        else:
            w=reweight(acquired)
            best=-float("inf")
            for x in queries:
                if x in acquired:
                    continue
                score=objectives(w,families,lookup[x],[lookup[z] for z in interpolate],lookup[config["focal"]],costs)[policy]
                if score>best+tolerance:
                    best=score
                    query=x
        acquired.append(query)
    w=reweight(acquired)
    mass={family:sum(x for x,y in zip(w,families,strict=True) if y==family) for family in ordered}
    best=max(mass.values())
    family=next(g for g,x in mass.items() if best-x<=tolerance)
    predicted={x:prediction(w,lookup[x]) for x in evaluation}
    p=predicted[config["focal"]]
    action="accept" if costs[0]*(1-p)<costs[1]*p-tolerance else "reject"
    return {"used":acquired,"weights":w,"predicted":predicted,"family":family,"action":action,"familyMass":mass}


def potential_mass(model,answers):
    total=F(model["prior"])
    for x,y in answers.items():
        p=probability(model,x)
        total*=p if y else 1-p
    return total


def outcomes(generator,answers,trace,groups):
    group=generator["family"]
    p=trace["predicted"]
    conditional={x:probability(generator,x) for x in evaluation}
    vals={}
    for label,locations in groups.items():
        vals[label+"Brier"]=mean([conditional[x]*(1-p[x])**2+(1-conditional[x])*p[x]**2 for x in locations])
        vals[label+"Regret"]=mean([(p[x]-conditional[x])**2 for x in locations])
    q=conditional[config["focal"]]
    vals["decisionLoss"]=costs[0]*(1-q) if trace["action"]=="accept" else costs[1]*q
    vals["acceptance"]=int(trace["action"]=="accept")
    if group in ordered:
        vals["recovery"]=int(trace["family"]==group)
        vals["posteriorAtTrueFamily"]=trace["familyMass"][group]
    vals["strongFamilyPosterior"]=int(max(trace["familyMass"].values())>=F(config["otherMetrics"]["strongFamilyPosterior"]))
    return vals


def study():
    assert sum(prior)==1 and len(set(points+evaluation))==len(points+evaluation)
    assert config["focal"] in interpolate and len(config["uniform"])==config["budget"]-1
    assert all(min(lookup[x])>0 and max(lookup[x])<1 for x in lookup)
    assert all(0<probability(config["stress"],x)<1 for x in lookup)
    observations=[dict(zip(points,bits,strict=True)) for bits in product((0,1),repeat=len(points))]
    cases=[{"answers":answers,"policy":policy} for answers,policy in product(observations,config["policies"])]
    traces={}
    for case,actual in zip(cases,engine({"config":config,"cases":cases}),strict=True):
        answer,policy=case["answers"],case["policy"]
        reference=sequential(policy,answer)
        assert len(set(reference["used"]))==config["budget"]
        assert all(x in points for x in reference["used"])
        for key in ("used","family","action"):
            assert reference[key]==actual[key], (key,case,reference,actual)
        for a,b in zip(actual["weights"],reference["weights"],strict=True):
            check(a,b)
        for key,p in reference["predicted"].items():
            check(actual["predicted"][key],p)
        traces["".join(map(str,answer.values())),policy]=reference
    aggregate={}
    for name,world_catalog in (("specified",models),("outOfLibrary",[config["stress"]])):
        quantified={}
        probabilities={(m["family"],m["amplitude"]):sum(potential_mass(m,a) for a in observations) for m in world_catalog}
        for m in world_catalog:
            assert probabilities[m["family"],m["amplitude"]]==F(m["prior"])
        assert sum(probabilities.values())==1
        for policy in config["policies"]:
            totals=defaultdict(F)
            for m,a in product(world_catalog,observations):
                mass=potential_mass(m,a)
                tracing=traces["".join(map(str,a.values())),policy]
                for field,x in outcomes(m,a,tracing,{"interpolation":interpolate,"extrapolation":extrapolate}).items():
                    totals[field]+=mass*x
            quantified[policy]=dict(totals)
        aggregate[name]={"cells":len(world_catalog)*len(observations),"policy":quantified}
    primary=aggregate["specified"]["policy"]
    return {"id":config["id"],"evidence":"A","stage":config["stage"],"tracesChecked":len(traces),
            "acquisitionsPerPolicy":config["budget"],"maxObjectiveEvaluationsPerAdaptivePolicy":sum(
                len(queries)-s for s in range(config["budget"]-1)),
            "scenarios":aggregate,
            "primaryDifference":primary["decisionValue"]["decisionLoss"]-primary["hypothesisInformation"]["decisionLoss"]}


def encode(data):
    return (json.dumps(data,indent=2,sort_keys=True,default=str)+"\n").encode()


def digest(data):
    return {"sha256":sha256(data).hexdigest(),"bytes":len(data)}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode",choices=("run","verify"))
    parser.add_argument("commit",nargs="?")
    args=parser.parse_args()
    revision=args.commit if args.mode=="run" else json.loads((archive/"manifest.json").read_bytes())["protocolCommit"]
    if not re.fullmatch("[0-9a-f]{40}",revision or ""):
        parser.error("A frozen protocol commit is required.")
    start=time.perf_counter()
    output={"acquisition-fixtures.json":encode(fixtures()),"evaluation.json":encode(study())}
    inputs={name:digest((HERE/name).read_bytes()) for name in ("protocol.json","fixtures.json")}
    output["manifest.json"]=encode({"id":config["id"],"evidence":"A","status":"completed","protocolCommit":revision,
                                    "protocol":inputs["protocol.json"],"inputs":inputs,
                                    "outputs":{k:digest(v) for k,v in output.items()}})
    if args.mode=="run":
        archive.mkdir()
    for file,data in output.items():
        if args.mode=="run":
            with (archive/file).open("xb") as stream:
                stream.write(data)
        else:
            assert (archive/file).read_bytes()==data, file
    print(f"Verified six objective fixtures, 384 policy traces and all 320 latent potential-outcome cells in {time.perf_counter()-start:.3f}s.")


if __name__=="__main__":
    main()
