"""Independent literal-control scoring and retrospective matched development checks."""
from argparse import ArgumentParser
from collections import Counter, defaultdict
from fractions import Fraction
from hashlib import sha256
import json
from random import Random
import re

from empirical.inference import json_bytes
from empirical.phase3.archive import BASE
from empirical.qwen.core import ROOT
from empirical.robustness.archive import REGISTERED

REPORT=ROOT/"capability-review.json"
QWEN="mirage-empirical-cross-model-003-development"
SMOL="mirage-empirical-decoding-004-development"
MANUAL=(
    ("D","reference","copy D"),("B","retrieval","17"),("C","comparison","eight"),
    ("A","arithmetic","five"),("C","mapping","blue box"),("A","confidence","green"),
    ("C","reference","copy C"),("D","retrieval","24"),("A","comparison","four"),
    ("B","arithmetic","three"),("C","mapping","red ball"),("D","confidence","triangle"),
)
LINE=re.compile(r"Answer: ([A-D])\nConfidence: ([0-9]{1,3})%")


def read(path):
    return json.loads(path.read_bytes())


def checked_archive(directory):
    manifest=read(directory/"manifest.json")
    for name, reported in manifest["outputs"].items():
        contents=(directory/name).read_bytes()
        assert {"sha256":sha256(contents).hexdigest(),"bytes":len(contents)}==reported
    return manifest,[json.loads(row) for row in (directory/"responses.ndjson").read_bytes().splitlines()]


def control_review():
    folder=BASE/QWEN
    manifest, raw=checked_archive(folder)
    score=read(folder/"scores.json")["rows"]
    plan=read(folder/"schedule.json")
    assert len(raw)==len(score)==len(plan)==len(MANUAL)
    count=Counter()
    families=Counter({family:0 for _, family, _ in MANUAL})
    wrong_confidence=[]
    probabilities=[]
    results=[]
    for i,(record,scored,request,manual) in enumerate(zip(raw,score,plan,MANUAL,strict=True),1):
        truth,family,actual_answer=manual
        task_id=f"p3-control-{i:02}"
        assert record["sequence"]==scored["sequence"]==request["sequence"]==i
        assert scored["taskId"]==request["design"]["taskId"]==task_id
        assert record["requestSha256"]==request["requestSha256"]
        label,number=LINE.fullmatch(record["raw"]).groups()
        correctness=int(label==truth)
        confidence=Fraction(int(number),100)
        assert confidence<=1 and scored["confidence"]==float(confidence)
        assert record["status"]==scored["status"]=="scorable"
        assert request["design"]["mapping"]["labels"][0]==truth
        inverse=dict(zip(request["design"]["mapping"]["labels"],("c0","c1","c2","c3"),strict=True))
        assert scored["canonical"]==inverse[label] and scored["correct"]==correctness
        assert scored["family"]==family
        probabilities.append((confidence,correctness))
        families[family]+=correctness
        count[label]+=1
        if correctness==0:
            wrong_confidence.append(confidence)
        results.append({"taskId":task_id,"family":family,"expectedAnswer":actual_answer,"expectedLabel":truth,
                        "label":label,"correct":bool(correctness),"reportedConfidence":float(confidence)})
    assert manifest["capabilityGate"]["correct"]==sum(families.values())
    assert manifest["capabilityGate"]["correctByFamily"]==dict(families)
    _, smol_raw=checked_archive(BASE/SMOL)
    smol_plan=read(BASE/SMOL/"schedule.json")
    matched=[]
    for old,req in zip(smol_raw,smol_plan,strict=True):
        if req["arm"]!="greedy":
            continue
        index=int(req["design"]["taskId"].rsplit("-",1)[1])-1
        assert req["design"]==plan[index]["design"]
        m=LINE.fullmatch(old["raw"] or "")
        smol_label=m[1] if m else None
        matched.append({"taskId":results[index]["taskId"],"smolLabel":smol_label,"qwenLabel":results[index]["label"],
                        "smolCorrect":smol_label==MANUAL[index][0],"qwenCorrect":results[index]["correct"]})
    assert len(matched)==4
    mean_confidence=sum(conf for conf,_ in probabilities)/len(probabilities)
    accuracy=Fraction(sum(families.values()),len(probabilities))
    readiness=smol_readiness()
    return {"classification":"development-actual-model-review","n":len(results),"correct":int(accuracy*len(probabilities)),
            "accuracy":float(accuracy),"meanConfidence":float(mean_confidence),
            "calibrationGap":float(mean_confidence-accuracy),
            "brier":float(sum((conf-correct)**2 for conf,correct in probabilities)/len(probabilities)),
            "wrongMeanConfidence":float(sum(wrong_confidence)/len(wrong_confidence)),
            "wrongAt100":sum(p==1 for p in wrong_confidence),"selectedLabels":dict(count),
            "familyCorrect":dict(families),"controls":results,
            "sharedDevelopment":{"n":len(matched),"pairs":sorted(matched,key=lambda r:r["taskId"]),
                                 "qwenCorrect":sum(r["qwenCorrect"] for r in matched),"smolCorrect":sum(r["smolCorrect"] for r in matched)},
            "matchedResearch":{"plannedQwen":512,"actualQwen":0,"newSmol":0},
            "echo":{"status":"gate-not-met","jointCoverage":None,"smol":readiness},
            "sourceResponseSha256":manifest["outputs"]["responses.ndjson"]["sha256"]}


def smol_readiness():
    checked_archive(REGISTERED)
    scores=read(REGISTERED/"scores.json")["rows"]
    assert len(scores)==512
    groups=defaultdict(list)
    labels=Counter(r["answer"] for r in scores if r["answer"] is not None)
    strata=defaultdict(list)
    for rec in scores:
        groups[(rec["taskId"],rec["family"])].append(rec["correct"] or 0)
    for (_,family),values in groups.items():
        strata[family].append(Fraction(sum(values),len(values)))
    rng=Random(42381)
    draws=sorted(sum(v[int(rng.random()*len(v))] for v in strata.values() for _ in v)/len(groups) for _ in range(4000))
    q=Fraction(3999,40)
    lo=int(q)
    lower=draws[lo]+(q-lo)*(draws[lo+1]-draws[lo])
    return {"n":len(scores),"accuracy":sum(r["correct"] or 0 for r in scores)/len(scores),
            "accuracyLower95":float(lower),"scorableCoverage":sum(r["status"]=="scorable" for r in scores)/len(scores),
            "dominantLabelShare":max(labels.values())/sum(labels.values())}


if __name__=="__main__":
    cli=ArgumentParser(description=__doc__)
    cli.add_argument("--create",action="store_true")
    args=cli.parse_args()
    calculated=json_bytes(control_review())
    if args.create:
        with REPORT.open("xb") as file:
            file.write(calculated)
    if REPORT.read_bytes()!=calculated:
        raise ValueError("Independent control scoring differs from published evidence.")
    print("Verified 12 exact Qwen controls, four shared development comparisons and historical SmolLM2 readiness.")
