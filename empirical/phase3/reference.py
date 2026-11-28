"""Independent raw-response and probability checks for the registered decoding study."""
from collections import Counter, defaultdict
from fractions import Fraction
from pathlib import Path
from random import Random
import argparse
import json
import re

DIR=Path(__file__).resolve().parent
ARCHIVE=DIR.parent/"archives/mirage-empirical-decoding-004"
UPSTREAM=DIR.parent/"robustness/inputs"


def read(path):
    return json.loads(path.read_bytes())


def main(only_design):
    from empirical.phase3.design import build_plan, prepare
    from empirical.robustness.reference import read_inputs
    prepare()
    tasks,truth,original,_=read_inputs("heldout")
    _,_,matched=build_plan("cross-model")
    assert len(matched)==512 and [r["referenceSequence"] for r in matched]==list(range(1,513))
    subset,_,planned=build_plan("decoding")
    assert len(subset)==16 and set(Counter(t["family"] for t in subset).values())=={4}
    assert len({r["generation"]["seed"] for r in planned})==192
    source={(row["taskId"],row["presentation"],row["cue"]):row for row in original}
    for row in planned:
        design=row["design"]
        reference=source[design["taskId"],"reference","matched"]
        assert design["mapping"]==reference["mapping"]
    if only_design:
        print("Design checks verified 192 sampling requests and 512 prepared cross-model matches.")
        return
    assert planned==read(ARCHIVE/"schedule.json")
    observations=[json.loads(line) for line in (ARCHIVE/"responses.ndjson").read_bytes().splitlines()]
    dataset=read(ARCHIVE/"scores.json")["rows"]
    analysis=read(ARCHIVE/"analysis.json")
    acc=defaultdict(list)
    by_task=defaultdict(lambda:defaultdict(list))
    for source,raw,data in zip(planned,observations,dataset,strict=True):
        design=source["design"]
        assert raw["requestSha256"]==source["requestSha256"]
        assert raw["sequence"]==data["sequence"]==source["sequence"]
        arr=by_task[design["taskId"]][data["arm"]]
        if raw["status"]!="scorable":
            assert data["status"]==raw["status"]
            if data["answer"] is not None:
                arr.append(data["answer"]=="A")
            continue
        pattern=r"Confidence: ([0-9]+)%\nAnswer: ([A-D])" if source["arm"]=="format" else r"Answer: ([A-D])\nConfidence: ([0-9]+)%"
        fields=re.fullmatch(pattern,raw["raw"]).groups()
        label,num=fields[::-1] if source["arm"]=="format" else fields
        inverse=dict(zip(design["mapping"]["labels"],("c0","c1","c2","c3")))
        choice=inverse[label]
        correct=int(choice==truth[design["taskId"]])
        probability=Fraction(int(num),100)
        assert choice==data["canonical"] and label==data["answer"] and data["correct"]==correct
        assert float(probability)==data["confidence"]
        arr.append(label=="A")
        acc[source["arm"]].append((correct,probability))
    facts_by_arm=analysis["conditions"]
    for arm,n in acc.items():
        assert len(n)==facts_by_arm[arm]["scorable"]
        brier=sum(c-2*p*c+p*p for c,p in n)/len(n)
        assert abs(float(brier)-facts_by_arm[arm]["brier"])<1e-12
    pairs=[]
    task_families={t["id"]:t["family"] for t in tasks}
    strata=defaultdict(list)
    for task, arms in by_task.items():
        low,high=arms["low"],arms["moderate"]
        if low and high:
            delta=Fraction(sum(high),len(high))-Fraction(sum(low),len(low))
            strata[task_families[task]].append(delta)
            pairs.append(delta)
    p=analysis["primary"]
    assert p["pairs"]==len(pairs)
    if pairs:
        assert abs(float(sum(pairs)/len(pairs))-p["difference"])<1e-12
        settings=read(DIR/"protocol.json")["analysis"]
        random=Random(settings["bootstrapSeed"])
        samples=sorted(sum(group[int(random.random()*len(group))] for group in strata.values() for _ in group)/len(pairs)
                       for _ in range(settings["bootstrapReplicates"]))
        for i, q in enumerate((Fraction(1,40),Fraction(39,40))):
            position=q*(len(samples)-1)
            index=int(position)
            value=samples[index]+(position-index)*(samples[index+1]-samples[index])
            assert abs(float(value)-p["interval95"][i])<1e-12
    print(f"Independent parsing, canonical scoring, rational Brier loss and task bootstrap verified on {len(dataset)} planned responses.")


if __name__=="__main__":
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--design-only",action="store_true")
    args=cli.parse_args()
    main(args.design_only)
