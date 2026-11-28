"""Independent route from printed task, raw response and mapping to verified aggregates."""
import argparse
from collections import Counter, defaultdict
from fractions import Fraction as F
from itertools import permutations
import json
from pathlib import Path
from random import Random
import re

ROOT=Path(__file__).resolve().parent
INPUTS=ROOT/"inputs"
ARCHIVE=ROOT.parent/"archives/mirage-empirical-robustness-002"
LABELS="ABCD"
IDS=["c0","c1","c2","c3"]
ARMS={"none","matched","correct","incorrect"}
VERSIONS={"reference","physical","labels","grammar"}


def load(path):
    return json.loads(path.read_bytes())


def solve(row):
    text=row["question"]
    nums=list(map(int,re.findall(r"\d+",text)))
    family=row["family"]
    if family=="change":
        have, removed, packs, each=nums
        return str(len([1]*have+[1]*packs*each)-removed)
    if family=="wood":
        plain, spotted, stone=nums
        pool=["plain wood"]*plain+["spotted wood"]*spotted+["plain stone"]*stone
        wooden=[x for x in pool if x.endswith("wood")]
        return str(F(wooden.count("plain wood"),len(wooden)))
    if family=="ordering":
        scene=text.split("Four people ")[1].split(" at distinct times")[0]
        before=re.findall(r"(\w+) "+scene+r" before (\w+)",text)
        after=re.findall(r"(\w+) "+scene+r" after (\w+)",text)
        feasible,=[p for p in permutations(row["options"].values())
                   if all(p.index(a)<p.index(b) for a,b in before+[(y,x) for x,y in after])]
        return feasible[1]
    holders=dict(re.findall(r"(\w+) holds the ([a-z]+ [a-z]+)",text))
    who=re.search(r"What does (\w+) hold\?",text)[1]
    return holders[who]


def read_inputs(split):
    tasks=load(INPUTS/f"{split}.tasks.json")["tasks"]
    keys={row["id"]:row for row in load(INPUTS/f"{split}.keys.json")}
    plan=load(INPUTS/f"{split}.schedule.json")
    truth={}
    for task in tasks:
        answer=solve(task)
        assert len(set(task["options"].values()))==4
        ident,=[key for key,val in task["options"].items() if val==answer]
        assert ident==keys[task["id"]]["correct"] and ident!=keys[task["id"]]["incorrectTarget"]
        truth[task["id"]]=ident
    requests=defaultdict(dict)
    counts=defaultdict(Counter)
    for i,row in enumerate(plan,1):
        assert i==row["sequence"]
        key=(row["presentation"],row["cue"],row.get("instructionOrder"))
        assert key not in requests[row["taskId"]]
        requests[row["taskId"]][key]=row
        target=truth[row["taskId"]] if row["cue"]=="correct" else keys[row["taskId"]]["incorrectTarget"] if row["cue"]=="incorrect" else None
        assert target==row["target"]
        mp=row["mapping"]
        assert set(mp["labels"])==set(mp["grammar"])==set("ABCD") and set(mp["physical"])==set("0123")
        correct=truth[row["taskId"]][-1]
        base=counts[row["presentation"]]
        if row["cue"]=="incorrect":
            which=target[-1]
            for name, value in (("wrongLabel",mp["labels"][int(which)]),("wrongPosition",mp["physical"].index(which)+1),
                                ("correctLabel",mp["labels"][int(correct)]),("correctPosition",mp["physical"].index(correct)+1)):
                base[name,value]+=1
            for cid, label in zip(IDS,mp["labels"]):
                base[cid+"ByLabel",label]+=1
                base[cid+"ByPosition",mp["physical"].index(cid[-1])+1]+=1
            for index, label in enumerate(mp["grammar"],1):
                base["grammar"+str(index),label]+=1
            first_pos=mp["labels"][int(mp["physical"][0])]
            base["physicalFirstByGrammarFirst",first_pos+mp["grammar"][0]]+=1
    if split=="heldout":
        assert len(tasks)==32 and len(plan)==512
        assert set(Counter(x["family"] for x in tasks).values())=={8}
        assert set(counts)==VERSIONS
        for name, group in counts.items():
            assert set(group["physicalFirstByGrammarFirst",a+b] for a in LABELS for b in LABELS)=={2}
            for (axis,key), value in group.items():
                assert value==(2 if axis=="physicalFirstByGrammarFirst" else 8)
        for rows in requests.values():
            assert set(rows)=={(v,c,None) for v in VERSIONS for c in ARMS}
            for cue in ARMS:
                base=rows["reference",cue,None]["mapping"]
                for version,factor in (("physical","physical"),("labels","labels"),("grammar","grammar")):
                    test=rows[version,cue,None]["mapping"]
                    assert [axis for axis in base if base[axis]!=test[axis]]==[factor]
    return tasks, truth, plan, {key:dict(sorted((f"{axis}/{value}",n) for (axis,value),n in group.items())) for key,group in counts.items()}


def verify_results(truth,plan):
    analysis=load(ARCHIVE/"analysis.json")
    raw=[json.loads(line) for line in (ARCHIVE/"responses.ndjson").read_bytes().splitlines()]
    score=load(ARCHIVE/"scores.json")["rows"]
    valid=defaultdict(list)
    mapping_rows=defaultdict(dict)
    found=Counter()
    by_request={}
    family_by_task={}
    for r,p,s in zip(raw,plan,score,strict=True):
        assert p["sequence"]==s["sequence"]==r["sequence"]
        family_by_task[p["taskId"]]=p["family"]
        mapping_rows[p["taskId"],p["presentation"]]
        by_request[p["taskId"],p["presentation"],p["cue"]]=r,s
        if r["status"]!="scorable":
            assert r["status"]==s["status"]
            continue
        m=re.fullmatch(r"Answer: ([A-D])\nConfidence: ([0-9]{1,3})%",r["raw"])
        confidence=F(int(m[2]),100)
        label=m[1]
        lookup=dict(zip(p["mapping"]["labels"], IDS))
        canonical=lookup[label]
        which=list(map(int,p["mapping"]["physical"]))
        displayed=list(map(IDS.__getitem__,which))
        correct=int(canonical==truth[p["taskId"]])
        assert s["correct"]==correct and s["canonical"]==canonical and float(confidence)==s["confidence"]
        assert s["position"]==1+displayed.index(canonical)
        assert s["grammarPosition"]==1+p["mapping"]["grammar"].index(label)
        assert s["target"]==p["target"] and s["answer"]==label
        loss=confidence**2+correct*(1-2*confidence)
        valid[p["cue"]].append((loss,confidence,correct))
        found[p["cue"],"answer",label]+=1
        found[p["cue"],"position",str(s["position"])]+=1
        found[p["cue"],"grammarPosition",str(s["grammarPosition"])]+=1
        if p["target"]==canonical:
            found[p["cue"],"selectedTarget"]+=1
        cell=mapping_rows[p["taskId"],p["presentation"]]
        cell[p["cue"]]=loss
    for arm,v in valid.items():
        assert analysis["armMetrics"][arm]["scorable"]==len(v)
        assert analysis["armMetrics"][arm]["correctCount"]==sum(x[2] for x in v)
        mean_loss, mean_conf, accuracy=[sum(x)/len(v) for x in zip(*v)]
        for key, value in (("brier",mean_loss),("confidence",mean_conf),("scorableAccuracy",accuracy),("calibrationGap",mean_conf-accuracy)):
            assert abs(analysis["armMetrics"][arm][key]-float(value))<1e-12
        for (cue,axis,bucket), n in ((k,v) for k,v in found.items() if len(k)==3 and k[0]==arm):
            assert analysis["armMetrics"][cue]["choices"][axis][bucket]==n
        if arm in ("correct","incorrect"):
            assert analysis["cueAdoption"][arm]["selectedTarget"]==found[arm,"selectedTarget"]
    per_task=defaultdict(list)
    for (task,_), arms in mapping_rows.items():
        if "matched" in arms and "incorrect" in arms:
            per_task[task].append(arms["incorrect"]-arms["matched"])
    assert sum(map(len,per_task.values()))==analysis["primary"]["eligiblePresentationPairs"]
    assert len(per_task)==analysis["primary"]["pairs"]
    if per_task:
        expected=sum(sum(ds)/len(ds) for ds in per_task.values())/len(per_task)
        assert abs(analysis["primary"]["difference"]-float(expected))<1e-12
        config=load(ROOT/"protocol.json")["analysis"]
        strata=defaultdict(list)
        for task, differences in per_task.items():
            strata[family_by_task[task]].append(sum(differences)/len(differences))
        rng=Random(config["bootstrapSeed"])
        draws=[]
        for _ in range(config["bootstrapReplicates"]):
            samples=[group[int(rng.random()*len(group))] for group in strata.values() for _ in group]
            draws.append(sum(samples)/len(samples))
        draws.sort()
        for i, q in enumerate((F(1,40),F(39,40))):
            offset=q*(len(draws)-1)
            lower=offset.numerator//offset.denominator
            expected=draws[lower]+(offset-lower)*(draws[lower+1]-draws[lower])
            assert abs(analysis["primary"]["interval95"][i]-float(expected)) < 1e-12
    token_pairs=canonical_agreement=0
    matched_additions=Counter()
    for task, version in mapping_rows:
        group={cue:by_request[task,version,cue] for cue in ARMS}
        if all(r["tokens"] for r,s in group.values()):
            token=[group[cue][0]["tokens"]["input"] for cue in ("none","matched","correct","incorrect")]
            token_pairs+=token[1]==token[2]==token[3]
            matched_additions[token[1]-token[0]]+=1
        m,c=(group[cue][1] for cue in ("matched","incorrect"))
        canonical_agreement+=m["canonical"] is not None and m["canonical"]==c["canonical"]
    for version in ("physical","labels","grammar"):
        for cue in ARMS:
            pairs=[(by_request[task,"reference",cue],by_request[task,version,cue]) for task in truth]
            count=sum(a["raw"] is not None and a["raw"]==b["raw"] for (a,_),(b,_) in pairs)
            assert count==analysis["presentations"][version][cue]["sameRaw"]
    print(f"Verified rational losses, task bootstrap and canonical mapping for {sum(map(len,valid.values()))} responses.")
    print(f"Matched advisory token counts: {token_pairs}. Added tokens: {dict(matched_additions)}. Matched/incorrect canonical agreement: {canonical_agreement}.")


if __name__=="__main__":
    import sys
    dev,*_=read_inputs("development")
    tasks,truth,plan,counts=read_inputs("heldout")
    assert not {row["question"] for row in dev}.intersection(row["question"] for row in tasks)
    balance=INPUTS/"heldout.balance.json"
    content=(json.dumps({"tasks":len(tasks),"requests":len(plan),"groups":counts},sort_keys=True,separators=(",",":"))+"\n").encode()
    if "--create-balance" in sys.argv and not balance.exists():
        with balance.open("xb") as stream:
            stream.write(content)
    assert balance.read_bytes()==content
    print("Independently verified 36 printed task keys, remaps and all 512 realized schedule rows.")
    if "--design-only" not in sys.argv:
        verify_results(truth,plan)
