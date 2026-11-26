"""Independently reconstruct the archived causal chain and accounting."""
import json
import math
from pathlib import Path
from reference_reflex import check

ROOT=Path(__file__).resolve().parents[1]

for path in sorted((ROOT/"results").glob("convergence-*.json")):
    if path.name.endswith((".manifest.json",".failure.json")):
        continue
    data=json.loads(path.read_text(encoding="utf-8"))
    total_fills=0
    q=data["reportReliability"]
    hint=data["hintReliability"]
    qagree=q*hint+(1-q)*(1-hint)
    assert math.isclose(qagree,data["agreementRate"])
    start=data["arms"][0]["replay"]
    tol=math.sqrt(math.log(100/.001)/(2*data["config"]["trials"]))
    for arm in data["arms"]:
        replay=arm["replay"]
        ledger=replay["ledger"]
        total_fills += check({"replay":ledger})
        assert replay["truth"] == start["truth"] and replay["fundamental"] == start["fundamental"]
        assert ledger["initial"] == start["ledger"]["initial"]
        truth=replay["truth"]
        assert replay["fundamental"] == ledger["policy"]["anchor"]+120*(2*truth-1)
        reports=ledger["frames"][0]["trades"]
        for idx,view in enumerate(reports):
            correct=view["report"]==truth
            assert view["correct"]==correct
            if arm["confidence"]=="calibrated":
                same=view["report"]==view["hint"]
                r=hint if same else 1-hint
                odds=q/(1-q)*r/(1-r)
                probability=odds/(1+odds)
            elif arm["confidence"]=="style":
                probability=.95 if view["styleHigh"] else .65
            else:
                probability=q
            assert math.isclose(view["confidence"], probability, abs_tol=1e-12)
            assert view["event"]["order"]["quantity"] == 1+int(probability>=.75)
            action=view["report"]
            if arm["communication"]!="none":
                peers=[reports[(idx+i)%len(reports)] for i in (-1,0,1)]
                score=sum((2*peer["report"]-1)*(peer["confidence"] if arm["communication"]=="weighted" else 1)
                          for peer in peers)
                if abs(score)>1e-12:
                    action=int(score>0)
            assert view["action"]==action and view["event"]["order"]["side"]==("buy" if action else "sell")
        inner_correlation=0 if arm["law"]=="independent" else data["config"]["correlation"]
        expected_pairs=q*q+inner_correlation*q*(1-q)
        assert abs(arm["metrics"]["reportAccuracy"]["estimate"]-q)<tol
        assert abs(arm["metrics"]["correctPair"]["estimate"]-expected_pairs)<tol
    print(data["config"]["id"],len(data["arms"]),"matched mechanism and ledger traces checked,",total_fills,"fills")
