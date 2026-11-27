"""Independent exact contract simulation with the already verified world generator."""
from fractions import Fraction
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import mean, stdev

from reference_civilizations import world_at, make_plan, resource_totals, inequality, close
from reference_noesis import stream

ROOT = Path(__file__).resolve().parents[1]
POLICIES = ("material", "joint", "fixedPrior", "cautious")


def replay(world, terms, valuation, policy):
    n = len(world["agents"])
    stores = [person["stock"].copy() for person in world["agents"]]
    funding = resource_totals(stores)
    made, used, spoiled = ([0, 0] for _ in range(3))
    history = [[] for _ in stores]
    ate = [0] * n
    attempts = completed = rejected = transfer = ties = 0
    for day in world["schedule"]:
        for i, person in enumerate(world["agents"]):
            _, output = make_plan(stores[i], person["technology"], day["labor"])
            for r in range(2):
                stores[i][r] += output[r]
                made[r] += output[r]
        for meeting in day["meetings"]:
            buyer, seller = meeting["payer"], meeting["supplier"]
            a, b = stores[buyer], stores[seller]
            valid = [(r, min(2,a[r]-3,3-b[r],b[1-r]-3,3-a[1-r])) for r in range(2)]
            options = [(r,q) for r,q in valid if q>0]
            if not options:
                continue
            r, q = options[0]
            records = history[seller] if policy != "fixedPrior" else []
            p = Fraction(3+sum(records),4+len(records))
            good = 3-valuation
            fail_payer = -valuation if terms=="prepay" else 0
            fail_supplier = 3 if terms=="prepay" else 0
            buyer_mean = p*good+(1-p)*fail_payer
            seller_mean = p*good+(1-p)*fail_supplier
            score = buyer_mean + seller_mean if policy=="joint" else buyer_mean
            ties += score==0
            if (policy=="cautious" and False in records) or not (score>0 or score==0 and meeting["choiceDraw"]<0.5):
                rejected += 1
                continue
            succeeds = meeting["deliveryDraw"]<world["agents"][seller]["reliability"]
            if succeeds or terms=="prepay":
                a[r] -= q
                b[r] += q
                transfer += q
            if succeeds:
                a[1-r] += q
                b[1-r] -= q
                transfer += q
            attempts += 1
            completed += succeeds
            history[seller].append(succeeds)
        for i,row in enumerate(stores):
            for r, stock in enumerate(row):
                consumed = min(3,stock)
                overflow = max(0,stock-consumed-10)
                row[r] = stock-consumed-overflow
                used[r] += consumed
                spoiled[r] += overflow
                ate[i] += consumed
        assert all(0<=value<=10 for row in stores for value in row)
        assert resource_totals(stores)==[funding[r]+made[r]-used[r]-spoiled[r] for r in range(2)]
    balance = dict(initial=funding,produced=made,consumed=used,losses=spoiled,terminal=resource_totals(stores))
    return dict(intake=ate,accounting=balance,metric=dict(needsSatisfied=sum(ate)/(n*6*len(world["schedule"])),
        lowestConsumption=min(ate),gini=inequality(ate),attempts=attempts,completed=completed,rejected=rejected,
        transfer=transfer,ties=ties,completionRate=completed/attempts if attempts else None))


def stats(values, lo=-math.inf, hi=math.inf):
    if not values:
        return None
    result = dict(trials=len(values),estimate=float(mean(values)),sd=None,interval=None)
    if len(values)>1:
        average, sd = result["estimate"], stdev(values)
        half = 1.959963984540054*sd/math.sqrt(len(values))
        result.update(sd=sd,interval=[max(lo,average-half),min(hi,average+half)])
    return result


def check(phase):
    file = ROOT/"results"/f"polis2-{phase}.json"
    if not file.exists():
        return
    raw=file.read_bytes()
    manifest=json.loads(file.with_suffix(".manifest.json").read_bytes())
    assert len(raw)==manifest["output"]["bytes"] and sha256(raw).hexdigest()==manifest["output"]["sha256"]
    result=json.loads(raw)
    c=result["config"]
    source=stream(c["seed"])
    worlds=[world_at(1+int(next(source)*4294967295),c["climate"],c["steps"]) for _ in range(c["trials"])]
    effects={}
    for cell in result["cells"]:
        terms,s=cell["payment"],cell["surplus"]
        summaries={policy:{} for policy in POLICIES}
        contrasts=[]
        equal=0
        for i,world in enumerate(worlds):
            runs={policy:replay(world,terms,s,policy) for policy in POLICIES}
            if i==0:
                close(runs,cell["example"])
            material,joint,fixed=(runs[p] for p in ("material","joint","fixedPrior"))
            contrasts.append(joint["metric"]["needsSatisfied"]-material["metric"]["needsSatisfied"])
            equal+=joint["intake"]==fixed["intake"] and joint["accounting"]==fixed["accounting"] and all(
                joint["metric"][k]==fixed["metric"][k] for k in ("attempts","completed","transfer"))
            for policy,run in runs.items():
                losses=[a-b for a,b in zip(material["intake"],run["intake"],strict=True) if a>b]
                metrics=dict(run["metric"],losingAgents=len(losses),lossFraction=len(losses)/8,
                             largestLoss=max(losses,default=0),meanLossAmongLosers=float(mean(losses)) if losses else None)
                for key,value in metrics.items():
                    bag=summaries[policy].setdefault(key,[])
                    if value is not None:
                        bag.append(value)
        assert equal==cell["sameJointFixed"]
        if terms=="delivery":
            assert contrasts==[0]*len(worlds) and equal==len(worlds)
        close(stats(contrasts,-1,1),cell["contrast"])
        close({p:{k:stats(series) for k,series in m.items()} for p,m in summaries.items()},cell["policies"])
        effects[terms,s]=contrasts
    close(stats([y-x for x,y in zip(effects["prepay",2],effects["delivery",2],strict=True)],-2,2),result["interaction"])
    print(f"{file.stem}: {len(worlds)} paired worlds, all 24 arms independently reconstructed",flush=True)


if __name__=="__main__":
    check("pilot")
    check("confirmatory")
