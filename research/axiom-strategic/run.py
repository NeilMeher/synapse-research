"""Exact buyer commitment and strategic seller effort under delayed verification."""
import argparse
from fractions import Fraction as F
from hashlib import sha256
from itertools import product
from pathlib import Path
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
protocol = HERE/"protocol.json"
cfg = json.loads(protocol.read_bytes())
archive = HERE.parent/"evidence"/cfg["id"]
value, price, rate = (F(cfg[k]) for k in ("buyerValue","price","deliveryIfEffort"))
choices = ("decline","shirk","effort")


def immediate(contract, choice, cost):
    if choice=="decline":
        return F(),F(),F()
    q = rate if choice=="effort" else F()
    pay = price if contract=="prepay" else price*q
    return pay-(cost if choice=="effort" else 0),q*value-pay,q


def best(scores):
    target = max(s[1] for s in scores)
    return [s for s in scores if s[1]==target]


def recursion(plan, cost, eta, delay, fee):
    contract, tick = plan
    terminal = best([(a,*immediate("delivery",a,cost)) for a in choices])
    first = ["decline"] if contract=="reject" else choices
    rows = []
    for a,b in product(first,terminal):
        supplier,buyer,q = immediate(contract,a,cost)
        chance = F(1) if tick=="always" else F()
        if tick=="positive" and delay==1 and a!="decline":
            chance = (1-eta)+(2*eta-1)*q
        if chance==0 and b[0]!=terminal[0][0]:
            continue
        rows.append(((a,b[0]),supplier+chance*b[1],buyer+chance*b[2]-(fee if tick=="positive" else 0)))
    winners = best(rows)
    assert [row[0] for row in winners] == [row[0] for row in best([(a,3*s+2,b) for a,s,b in rows])]
    return winners


def enumeration(plan, cost, eta, delay, fee):
    contract,tick = plan
    first = ["decline"] if contract=="reject" else choices
    # Independent pure-policy integration over delivery and signal branches. Check seller incentives even off path.
    def paid(turn, action, delivered):
        return price*int(action!="decline" and (turn=="prepay" or delivered==1))
    def outcomes(action):
        q = rate if action=="effort" else 0
        return ((0,1-q),(1,q))
    def payoffs(turn,action,deliver):
        payment = paid(turn,action,deliver)
        return payment-cost*int(action=="effort"),value*deliver-payment

    terminal = best([(b,sum(m*payoffs("delivery",b,y)[0] for y,m in outcomes(b))) for b in choices])
    rows = []
    for a,(b,_) in product(first,terminal):
        u,v,probability_of_offer = F(),F(),F()
        for delivered,p in outcomes(a):
            for positive in (0,1):
                chance = eta if positive==delivered else 1-eta
                weight = p*chance
                one,two = payoffs(contract,a,delivered)
                offered = tick=="always" or (tick=="positive" and delay==1 and a!="decline" and positive==1)
                probability_of_offer += weight*int(offered)
                for later,p_later in outcomes(b if offered else "decline"):
                    x,y = payoffs("delivery",b if offered else "decline",later)
                    u += weight*p_later*(one+x)
                    v += weight*p_later*(two+y-(fee if tick=="positive" else 0))
        if probability_of_offer or b==terminal[0][0]:
            rows.append(((a,b),u,v))
    return best(rows)


def ledger():
    actual = json.loads(subprocess.check_output(["node",str(HERE/"ledger.mjs")]))
    expected = []
    for contract,delivery in product(("prepay","delivery"),(False,True)):
        pay = int(contract=="prepay" or delivery)
        moved = int(delivery)
        expected.append({"contract":contract,"success":delivery,"buyer":[2-pay,moved],
                         "seller":[pay,2-moved],"moved":pay+moved,"conserved":[2,2]})
    assert actual==expected
    return actual


def study():
    cases = []
    for channel,fee_text in product(cfg["auditSettings"],cfg["auditCosts"]):
        eta,delay,fee = F(channel["eta"]),channel["delay"],F(fee_text)
        rows = {}
        for plan in cfg["plans"]:
            states = {}
            low,high = F(),F()
            for seller in cfg["sellerTypes"]:
                c,p = F(seller["cost"]),F(seller["prior"])
                answer = recursion(plan,c,eta,delay,fee)
                assert answer==enumeration(plan,c,eta,delay,fee), (plan,seller,channel,fee)
                lower,upper = (f(x[2] for x in answer) for f in (min,max))
                low += p*lower
                high += p*upper
                states[seller["id"]] = [{"first":a[0],"secondIfOffered":a[1],"seller":s,"buyer":b} for a,s,b in answer]
            rows["/".join(plan)] = {"responses":states,"buyerRange":[low,high]}
        guaranteed = max(x["buyerRange"][0] for x in rows.values())
        optimum = [k for k,x in rows.items() if x["buyerRange"][0]==guaranteed]
        assert optimum==[k for k,x in rows.items() if 2*x["buyerRange"][0]+1==2*guaranteed+1]
        cases.append({"audit":channel,"cost":fee,"menu":rows,"buyerMaximin":guaranteed,"optimalPlans":optimum})
    return {"id":cfg["id"],"evidence":cfg["evidence"],"cases":cases,"transferLedger":ledger()}


def identity(data):
    return {"bytes":len(data),"sha256":sha256(data).hexdigest()}


def encode(value):
    return (json.dumps(value,indent=2,sort_keys=True,default=str)+"\n").encode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode",choices=("run","verify"))
    ap.add_argument("commit",nargs="?")
    args = ap.parse_args()
    m = archive/"manifest.json"
    revision = args.commit if args.mode=="run" else json.loads(m.read_bytes())["protocolCommit"]
    if not re.fullmatch("[0-9a-f]{40}",revision or ""):
        ap.error("A frozen protocol commit is required.")
    data = encode(study())
    meta = encode({"id":cfg["id"],"evidence":cfg["evidence"],"status":"completed","protocolCommit":revision,
                   "protocol":identity(protocol.read_bytes()),"outputs":{"commitment.json":identity(data)}})
    if args.mode=="run":
        archive.mkdir()
    for path,content in ((archive/"commitment.json",data),(m,meta)):
        if args.mode=="run":
            with path.open("xb") as destination:
                destination.write(content)
        else:
            assert path.read_bytes()==content
    print("Verified 96 exact strategic seller responses and 4 POLIS settlement branches.")


if __name__=="__main__":
    main()
