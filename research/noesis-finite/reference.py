"""Independent exact finite NOESIS reference and expected-risk fixtures."""
from collections import defaultdict
from fractions import Fraction as F
from itertools import product
from math import isclose,log2
from pathlib import Path
import argparse
import json
import subprocess

HERE=Path(__file__).resolve().parent


def engine(arguments):
    return json.loads(subprocess.run(["node",str(HERE/"engine-check.mjs")],input=json.dumps(arguments),
                                   capture_output=True,text=True,check=True).stdout)


def mean(xs):
    return sum(xs)/len(xs)


def prediction(weights,rates):
    return sum(p*r for p,r in zip(weights,rates,strict=True))


def information(weights,groups,rates):
    joint=defaultdict(F)
    for i,g in enumerate(groups):
        for bit in (0,1):
            joint[g,bit]+=weights[i]*(rates[i] if bit else 1-rates[i])
    total={g:joint[g,0]+joint[g,1] for g in groups}
    outcomes=[sum(joint[g,y] for g in total) for y in (0,1)]
    return sum(float(q)*log2(float(q/(total[g]*outcomes[y]))) for (g,y),q in joint.items() if q)


def forecast_risk(w,evaluation):
    return mean([prediction(w,x)*(1-prediction(w,x)) for x in evaluation])


def action_risk(w,focal,cost):
    p=prediction(w,focal)
    return min(cost[0]*(1-p),cost[1]*p)


def objectives(weights,families,rates,evaluation,focal,cost):
    p=prediction(weights,rates)
    result={"hypothesisInformation":information(weights,families,rates),
            "jointInformation":information(weights,range(len(weights)),rates),
            "predictiveVariance":p*(1-p),
            "disagreement":sum(w*(v-p)**2 for w,v in zip(weights,rates,strict=True)),
            "predictionValue":forecast_risk(weights,evaluation),
            "decisionValue":action_risk(weights,focal,cost)}
    for bit,mass in ((0,1-p),(1,p)):
        if mass:
            post=[w*(v if bit else 1-v)/mass for w,v in zip(weights,rates,strict=True)]
            result["predictionValue"]-=mass*forecast_risk(post,evaluation)
            result["decisionValue"]-=mass*action_risk(post,focal,cost)
    return result


def check(actual,expected,tolerance=1e-12):
    assert isclose(actual,float(expected),abs_tol=tolerance,rel_tol=0),(actual,expected)


def fixtures():
    spec=json.loads((HERE/"fixtures.json").read_bytes())
    result={}
    javascript=engine({"fixtures":spec})
    target=list(map(F,spec["target"]))
    weights=list(map(F,spec["prior"]))
    for group,actual in zip(spec["groups"],javascript,strict=True):
        out={}
        for name,query in group["channels"].items():
            exact=objectives(weights,spec["families"],list(map(F,query)),[target],target,list(map(F,group["costs"])))
            for key,value in exact.items():
                check(actual[name][key],value)
            out[name]={key:round(value,12) if isinstance(value,float) else str(value) for key,value in exact.items()}
        result[group["id"]]=out
    a,b=result["information-vs-decision"].values()
    assert a["hypothesisInformation"]==1 and a["decisionValue"]=="0"
    assert b["hypothesisInformation"]<1 and b["decisionValue"]=="1/4"
    coin,biased=result["variance-vs-information"].values()
    assert F(coin["predictiveVariance"])>F(biased["predictiveVariance"])
    assert coin["hypothesisInformation"]<biased["hypothesisInformation"]
    sym,tar=result["prediction-vs-decision"].values()
    assert F(sym["predictionValue"])>F(tar["predictionValue"])
    assert F(sym["decisionValue"])<F(tar["decisionValue"])
    original=list(map(F,spec["garbling"]["before"]))
    degraded=list(map(F,spec["garbling"]["after"]))
    flip=F(spec["garbling"]["flip"])
    assert [q*(1-flip)+(1-q)*flip for q in original]==degraded
    # Any mapping of a two-output channel preserves equal rows. Both channels
    # in the first pair have equal rows that the other channel distinguishes.
    u,v=[list(map(F,x)) for x in spec["groups"][0]["channels"].values()]
    for left,right in ((u,v),(v,u)):
        assert any(left[i]==left[j] and right[i]!=right[j] for i,j in product(range(4),repeat=2))
    return {"id":spec["id"],"evidence":"A","objectives":result,"garbling":{
        "before":list(map(str,original)),"after":list(map(str,degraded)),"flip":str(flip),"rankingPairIncomparable":True}}


if __name__=="__main__":
    print(json.dumps(fixtures(),indent=2))
