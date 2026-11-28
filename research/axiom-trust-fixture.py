"""Exact finite-horizon verification and trade against an exogenous counterparty."""
import argparse
from collections import defaultdict
from fractions import Fraction as Q
from hashlib import sha256
from itertools import product
from pathlib import Path
import json
import re

HERE = Path(__file__).resolve().parent
spec = HERE / "axiom-trust-fixture.json"
cfg = json.loads(spec.read_bytes())
directory = HERE / "evidence" / cfg["id"]
delivery = [Q(cfg["deliveryGivenFaulty"]),Q(cfg["deliveryGivenHealthy"])]
audit = Q(cfg["verificationAccuracy"])
fail,restore = Q(cfg["healthyToFaulty"]),Q(cfg["faultyToHealthy"])
transition = [[1-restore,restore],[fail,1-fail]]
utility = {action:list(map(Q,values)) for action,values in cfg["utilities"].items()}
actions = tuple(utility)
plans = tuple((a,) for a in actions) + tuple(product(actions,repeat=2))


def law(rate):
    return tuple(enumerate([1-rate,rate]))


def optimize(risks):
    best = max(risks.values())
    return {"expectedUtility":best,"optimalPlans":[list(k) for k,v in risks.items() if v==best]}


def recurse(prior,cost,delay):
    def state_weights(p):
        return [1-p,p]

    def bayes(p, likelihood):
        weights = [r*s for r,s in zip(state_weights(p),likelihood,strict=True)]
        return sum(weights),weights[1]/sum(weights)

    def immediate(p,action):
        rate = sum(x*r for x,r in zip(state_weights(p),delivery,strict=True))
        return sum(m*utility[action][y] for y,m in law(rate))

    def values(p,remaining):
        def act(p,action):
            now = immediate(p,action)
            if remaining==1:
                return now
            if action=="reject" or delay==2:
                next_p = restore+(1-fail-restore)*p
                return now+max(values(next_p,1).values())
            total = now
            for y in (0,1):
                prob,after = bayes(p,[r if y else 1-r for r in delivery])
                next_p = restore+(1-fail-restore)*after
                total += prob*max(values(next_p,1).values())
            return total
        measured = [bayes(p,[audit,1-audit]),bayes(p,[1-audit,audit])]
        return {plan:act(p,plan[0]) if len(plan)==1 else -cost+sum(
            mass*act(after,action) for (mass,after),action in zip(measured,plan,strict=True))
            for plan in plans}
    return optimize(values(prior,2))


def enumerate_paths(prior,cost,delay):
    # Keep raw joint mass in each observable branch. Integrate out hidden states explicitly.
    def second_round(state_mass):
        return max(sum(mass*prob*draw*(utility[plan[z if len(plan)==2 else 0]][y]-
                                       (cost if len(plan)==2 else 0))
                       for h,mass in enumerate(state_mass)
                       for z,prob in law(audit if h else 1-audit)
                       for y,draw in law(delivery[h]))
                   for plan in plans)

    scores = {}
    for plan in plans:
        root_payoff = Q()
        leaves = defaultdict(lambda:[Q(),Q()])
        verifies = len(plan)==2
        for state,state_mass in law(prior):
            for signal,signal_mass in (law(audit if state else 1-audit) if verifies else [(None,Q(1))]):
                action = plan[signal] if verifies else plan[0]
                for outcome,outcome_mass in law(delivery[state]):
                    weight = state_mass*signal_mass*outcome_mass
                    root_payoff += weight*(utility[action][outcome]-(cost if verifies else 0))
                    key = (signal,outcome if action!="reject" and delay==1 else None)
                    for next_state,step in enumerate(transition[state]):
                        leaves[key][next_state] += weight*step
        scores[plan] = root_payoff+sum(second_round(mass) for mass in leaves.values())
    return optimize(scores)


def encode(value):
    return (json.dumps(value,indent=2,default=str,sort_keys=True)+"\n").encode()


def identity(data):
    return {"sha256":sha256(data).hexdigest(),"bytes":len(data)}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("mode",choices=("run","verify"))
    cli.add_argument("commit",nargs="?")
    args = cli.parse_args()
    commit = args.commit if args.mode=="run" else json.loads((directory/"manifest.json").read_bytes())["protocolCommit"]
    if not re.fullmatch(r"[a-f0-9]{40}",commit or ""):
        cli.error("A frozen protocol commit is required")
    rows = []
    for prior,cost,delay in product(cfg["priors"],cfg["verificationCosts"],cfg["settlementDelays"]):
        result = recurse(Q(prior),Q(cost),delay)
        assert result == enumerate_paths(Q(prior),Q(cost),delay)
        rows.append({"prior":prior,"verificationCost":cost,"delay":delay,**result})
    payload = encode({"id":cfg["id"],"evidence":"A","results":rows})
    manifest = encode({"id":cfg["id"],"evidence":"A","status":"completed","protocolCommit":commit,
                       "protocol":identity(spec.read_bytes()),"outputs":{"policy-values.json":identity(payload)}})
    if args.mode=="run":
        directory.mkdir()
    for name,data in (("policy-values.json",payload),("manifest.json",manifest)):
        path = directory/name
        if args.mode=="run":
            with path.open("xb") as stream:
                stream.write(data)
        else:
            assert path.read_bytes()==data
    print(f"Verified {len(rows)} finite two-period trade choices by exact posterior recursion and joint path enumeration.")


if __name__=="__main__":
    main()
