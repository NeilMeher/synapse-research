"""Independently replay registered MORPHEUS histories, timing and decision loss."""
from collections import Counter
from fractions import Fraction as F
from hashlib import sha256
from itertools import product
from math import isclose, sqrt
from pathlib import Path
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
protocol = HERE / "protocol.json"
cfg = json.loads(protocol.read_bytes())
archive = HERE.parent / "evidence" / cfg["id"]


def artifact(path):
    data = path.read_bytes()
    return {"sha256":sha256(data).hexdigest(),"bytes":len(data)}


def words(seed):
    mask = (1<<32)-1
    while True:
        seed = (seed+0x6d2b79f5)&mask
        a = ((seed^(seed>>15))*(seed|1))&mask
        b = ((a^(a>>7))*(a|61))&mask
        c = a^((a+b)&mask)
        yield (c^(c>>14))/(mask+1)


def regenerate(env, source):
    latent = []
    reports = [[],[]]
    events = []
    low, high = cfg["faultRate"],cfg["baseRate"]
    start,end = cfg["failureStart"],cfg["restoredAt"]
    for t in range(cfg["steps"]):
        u = [next(source) for _ in range(6)]
        rate = high
        if start<=t<end and env["shape"]!="stationary":
            rate = low if env["shape"]=="burst" else high-(high-low)*((t+1-start)/(end-start))
        y = int(u[0]<.5)
        wrong = int(u[1]>=rate)
        latent.append(y)
        reports[0].append(y^wrong)
        reports[1].append(y^int(u[2]>=cfg["controlRate"]))
        if u[3]<cfg["auditProbability"]:
            received = t+cfg["shortDelay"]+int(u[5]<env["lateProbability"])*cfg["extraDelay"]
            events.append([t,received,1^wrong^int(u[4]>=env["accuracy"])])
    return tuple("".join(map(str,x)) for x in [latent,*reports])+(events,)


def regime_mean(event_data, time, model, accuracy):
    # Backward conditional likelihood with the terminal state pinned in turn.
    def likelihood(terminal):
        scores = [float(terminal==0),float(terminal==1)]
        rates = [model["faultyRate"],model["healthyRate"]]
        for s in range(time,-1,-1):
            if s in event_data:
                observed = event_data[s]
                for i, rate in enumerate(rates):
                    match = rate if observed else 1-rate
                    scores[i] *= (1-accuracy)*(1-match)+accuracy*match
            if s:
                a,b = scores
                scores = [a*(1-model["restore"])+b*model["restore"],a*model["fail"]+b*(1-model["fail"])]
        return scores[0]*(1-model["prior"])+scores[1]*model["prior"]
    f,h = likelihood(0),likelihood(1)
    return (h*model["healthyRate"]+f*model["faultyRate"])/(f+h)


def path_mean(model, accuracy, latest, audits):
    # Exact small-history joint-path sum for a filter timing edge case.
    rates = [F(str(model["faultyRate"])),F(str(model["healthyRate"]))]
    fail,restore,prior = (F(str(model[a])) for a in ("fail","restore","prior"))
    transition = [[1-restore,restore],[fail,1-fail]]
    emission = [(1-accuracy)+(2*accuracy-1)*q for q in rates]
    joint = Counter()
    for path in product((0,1),repeat=latest+1):
        probability = prior if path[0] else 1-prior
        for current,following in zip(path,path[1:]):
            probability *= transition[current][following]
        for audit in audits:
            if audit["arrival"]<=latest:
                p = emission[path[audit["event"]]]
                probability *= p if audit["outcome"] else 1-p
        joint[path[-1]] += probability
    return sum(q*joint[i] for i,q in enumerate(rates))/sum(joint.values())


def fixtures():
    # Both inverted audit outputs and their stationary second moment, checked exactly.
    q,eta,a = F(1,5),F(3,5),F(7,20)
    p = eta*q+(1-eta)*(1-q)
    outcome = [F(-2),F(3)]
    assert sum(m*x for m,x in zip((1-p,p),outcome))==q
    variance = sum(m*(x-q)**2 for m,x in zip((1-p,p),outcome))
    assert variance == F(154,25) == q*(1-q)+eta*(1-eta)/(2*eta-1)**2
    assert a/(2-a)*variance == F(98,75)
    model = cfg["markov"]
    data = [{"event":0,"arrival":4,"outcome":1},{"event":1,"arrival":3,"outcome":0},
            {"event":2,"arrival":4,"outcome":0},{"event":5,"arrival":11,"outcome":1}]
    js = """
import {filterReliability} from './engine/adaptive-trust.mjs';
import {auditMoments,auditCorrection} from './engine/morpheus-audit.mjs';
const [model,audits] = JSON.parse(process.argv[1]);
console.log(JSON.stringify([.5,.8].map(auditAccuracy =>
  [0,1,3,4,6,8].map(time => filterReliability({...model,auditAccuracy},time,audits).reliability))));
console.log(JSON.stringify([auditMoments(.2,.6),auditMoments(.2,.5),auditCorrection(0,.6),auditCorrection(1,.6)]));
"""
    result = subprocess.check_output(["node","--input-type=module","-e",js,json.dumps([model,data],separators=(",",":"))],cwd=HERE.parents[1],text=True)
    first,second = list(map(json.loads,result.splitlines()))
    for eta,values in zip((F(1,2),F(4,5)),first,strict=True):
        for time,actual in zip((0,1,3,4,6,8),values,strict=True):
            check(actual,path_mean(model,eta,time,data))
    check(second[0]["correctedVariance"],variance)
    assert second[1]["correctedVariance"] is None
    check(second[2],outcome[0])
    check(second[3],outcome[1])


def decisions(row, env):
    length = cfg["steps"]
    yes, no = row["suspect"],row["alternative"]
    series = {policy["id"]:[] for policy in cfg["policies"]}
    channels = {"naive":1,"known":env["accuracy"],"assumed":cfg["assumedAccuracy"]}
    for t in range(length):
        event = [(s,a,z) for s,a,z in row["audits"] if a<=t]
        by_arrival = sorted(event,key=lambda a:(a[1],a[0]))
        emissions = {s:z for s,_,z in event}
        for arm in cfg["policies"]:
            method = arm["memory"]
            mean = cfg["baseRate"]
            accuracy = channels.get(arm.get("correction"),1)
            source = by_arrival if arm.get("timing")=="arrival" else event
            if method=="markov":
                mean = regime_mean(emissions,t,cfg["markov"],accuracy)
            elif method!="fixed" and accuracy>.5 and source:
                data = [x[2] for x in source]
                if method=="exponential":
                    alpha = cfg["alpha"]
                    weights = [alpha*(1-alpha)**i for i in range(len(data))]
                    old = (1-alpha)**len(data)
                    mean = old*mean+sum(v*(z-(1-accuracy))/(2*accuracy-1) for v,z in zip(weights,reversed(data),strict=True))
                else:
                    if method=="rolling":
                        data = data[-cfg["window"]:]
                    prior_weight = cfg["priorStrength"]
                    n = len(data)
                    mean = (prior_weight*mean+(sum(data)-n*(1-accuracy))/(2*accuracy-1))/(prior_weight+n)
            switch = yes[t]!=no[t] and min(1,max(0,mean))<=cfg["controlRate"]+cfg["tolerance"]
            series[arm["id"]].append("1" if switch else "0")
    return series


def check(actual, expected):
    assert isclose(actual,float(expected),rel_tol=0,abs_tol=cfg["tolerance"]), (actual,expected)


def verify():
    manifest = json.loads((archive/"manifest.json").read_bytes())
    assert manifest["id"] == cfg["id"] and manifest["evidence"] == cfg["evidence"] == "B"
    assert re.fullmatch("[a-f0-9]{40}",manifest["protocolCommit"])
    assert manifest["protocol"]==artifact(protocol)
    for name,entry in manifest["outputs"].items():
        assert entry == artifact(archive/name)
    summary = json.loads((archive/"summary.json").read_bytes())
    independent = {}
    counts = {}
    with (archive/"histories.ndjson").open(encoding="utf-8") as stream:
        for env in cfg["environments"]:
            name = env["id"]
            source = words(cfg["confirmatorySeed"])
            scores = {}
            counts[name] = scores
            independent[name] = []
            for index in range(cfg["histories"]):
                row = json.loads(next(stream))
                assert (row["environment"],row["index"]) == (name,index)
                assert tuple(row[key] for key in ("truth","suspect","alternative","audits"))==regenerate(env,source)
                losses = {}
                for policy,bits in decisions(row,env).items():
                    labels = (row["suspect"],row["alternative"])
                    assert "".join(bits) == row["losses"][policy]["route"], (name,index,policy)
                    errors = [labels[int(b)][t]!=row["truth"][t] for t,b in enumerate(bits)]
                    inc = Counter({name:sum(errors[start:end]) for name,(start,end) in cfg["windows"].items()})
                    assert inc == row["losses"][policy]["incorrect"]
                    scores.setdefault(policy,Counter()).update(inc)
                    losses[policy] = inc
                independent[name].append(losses)
        assert not stream.read(1)
    assert summary["totals"]==counts
    for comparison in [cfg["primary"],*cfg["secondary"]]:
        result = summary["contrasts"][comparison["id"]]
        key,window,signs = (comparison[k] for k in ("environment","window","coefficients"))
        start,end = cfg["windows"][window]
        fractions = [F(sum(direction*row[arm][window] for arm,direction in signs.items()),end-start)
                     for row in independent[key]]
        n = len(fractions)
        mean = sum(fractions)/n
        sd = sqrt(sum((x-mean)**2 for x in fractions)/(n-1))
        check(result["estimate"],mean)
        check(result["se"],sd/sqrt(n))
        check(result["interval95"][0],float(mean)-cfg["critical"]*sd/sqrt(n))
        check(result["interval95"][1],float(mean)+cfg["critical"]*sd/sqrt(n))
    print(f"Independently rebuilt {len(counts)*cfg['histories']} full histories, all routes and {len(summary['contrasts'])} paired contrasts.")


if __name__=="__main__":
    fixtures()
    print("Checked exact audit moments and 12 hidden-state timing fixtures.")
    verify()
