"""Task-level contrasts for repeated decoding and matched model comparisons."""
from collections import Counter, defaultdict
from math import log2
from statistics import mean

from empirical.analysis import brier, contrast, summary

ARMS=("greedy","low","moderate","format")


def grouped(rows, field):
    groups=defaultdict(list)
    for row in rows:
        groups[row[field]].append(row)
    return groups


def avg(x):
    return mean(x) if x else None


def profile(rows, bins):
    values=summary(rows,bins)
    labels=Counter(r["answer"] for r in rows if r["answer"] is not None)
    canonical=Counter(r["canonical"] for r in rows if r["canonical"] is not None)
    positions=Counter(str(r["position"]) for r in rows if r["position"] is not None)
    return {**values,"labelCounts":dict(labels),"canonicalCounts":dict(canonical),"positionCounts":dict(positions),
            "correctPerPlanned":sum(r["correct"] or 0 for r in rows)/len(rows)}


def entropy(counts):
    n=sum(counts.values())
    return -sum((c/n)*log2(c/n) for c in counts.values()) if n>=2 else None


def agreement(counts):
    n=sum(counts.values())
    return sum(c*(c-1) for c in counts.values())/(n*(n-1)) if n>=2 else None


def value_for(rows, outcome):
    if outcome=="labelA":
        return avg([r["answer"]=="A" for r in rows if r["answer"] is not None])
    if outcome=="accuracy":
        return avg([r["correct"] for r in rows if r["correct"] is not None])
    if outcome=="confidence":
        return avg([r["confidence"] for r in rows if r["confidence"] is not None])
    return avg([brier(r) for r in rows if r["confidence"] is not None and r["correct"] is not None])


def pair_tasks(groups, left, right, outcome, spec):
    values=[]
    for arms in groups.values():
        a,b=value_for(arms[left],outcome),value_for(arms[right],outcome)
        if a is not None and b is not None:
            values.append((arms[left][0]["family"],b-a))
    return contrast(values,len(groups),spec)


def decode(scores, spec, gate):
    task_pairs={name:grouped(rows,"arm") for name,rows in grouped(scores,"taskId").items()}
    categories=grouped(scores,"arm")
    profiles={arm:profile(rows,spec["confidenceBins"]) for arm,rows in categories.items()}
    possible=[]
    for arms in task_pairs.values():
        a,b=(arms[name] for name in ("low","moderate"))
        bounds=[]
        for rows in (a,b):
            known=sum(row["answer"]=="A" for row in rows)
            missing=sum(row["answer"] is None for row in rows)
            bounds.append((known/len(rows),(known+missing)/len(rows)))
        possible.append((bounds[1][0]-bounds[0][1],bounds[1][1]-bounds[0][0]))
    sample_details={}
    for arm in ("low","moderate"):
        items={}
        for task,groups in task_pairs.items():
            rows=groups[arm]
            counts=Counter(r["canonical"] for r in rows if r["canonical"] is not None)
            labels=Counter(r["answer"] for r in rows if r["answer"] is not None)
            items[task]={"counts":dict(counts),"labelCounts":dict(labels),"answered":sum(counts.values()),
                         "canonicalEntropyBits":entropy(counts),"labelEntropyBits":entropy(labels),
                         "canonicalAgreement":agreement(counts)}
        sample_details[arm]={"tasks":items,"diverseTasks":sum(len(r["counts"])>1 for r in items.values()),
                             "eligibleEntropyTasks":sum(r["canonicalEntropyBits"] is not None for r in items.values()),
                             "meanCanonicalEntropyBits":avg([r["canonicalEntropyBits"] for r in items.values()
                                                            if r["canonicalEntropyBits"] is not None]),
                             "meanCanonicalAgreement":avg([r["canonicalAgreement"] for r in items.values()
                                                          if r["canonicalAgreement"] is not None])}
    comparison={outcome:pair_tasks(task_pairs,"low","moderate",outcome,spec)
                for outcome in ("labelA","accuracy","confidence","brier")}
    reference={arm:{outcome:pair_tasks(task_pairs,"greedy",arm,outcome,spec)
                    for outcome in ("labelA","accuracy","confidence","brier")}
               for arm in ("low","moderate","format")}
    format_pairs=[(d["greedy"][0],d["format"][0]) for d in task_pairs.values()]
    fmt={"eligibleAnswers":sum(a["canonical"] is not None and b["canonical"] is not None for a,b in format_pairs),
         "sameCanonical":sum(a["canonical"] is not None and a["canonical"]==b["canonical"] for a,b in format_pairs),
         "sameStatus":sum(a["status"]==b["status"] for a,b in format_pairs)}
    registered=gate["registeredSamplingArm"]
    r=profiles[registered]
    observed_accuracy=[]
    for groups in task_pairs.values():
        rows=groups[registered]
        observed_accuracy.append((rows[0]["family"],sum(x["correct"] or 0 for x in rows)/len(rows)))
    accuracy=contrast(observed_accuracy,len(task_pairs),spec)
    dominant=max(r["labelCounts"].values(),default=0)/max(1,r["answered"])
    checks={"coverage":r["confidenceCoverage"]>=gate["minimumScorableCoverage"],
            "dominantLabel":bool(r["answered"]) and dominant<=gate["maximumDominantLabelShare"],
            "withinTaskDiversity":sample_details[registered]["diverseTasks"]>=gate["minimumTasksWithDiversity"],
            "accuracyMargin":r["correctPerPlanned"]>=gate["minimumAccuracy"],
            "accuracyInterval":accuracy["interval95"][0]>gate["minimumTaskBootstrapLower"]}
    return {"stage":"decoding","classification":"registered-actual-model","analysisVersion":"mirage-phase3-v1",
            "conditions":profiles,"primary":{**comparison["labelA"],"allPlannedBounds":[mean(v) for v in zip(*possible)]},
            "pairedStochastic":comparison,"comparedWithGreedy":reference,"formatAgreement":fmt,
            "sampling":sample_details,"ensembleGate":{"passed":all(checks.values()),"criteriaMet":checks,
             "dominantLabelShare":dominant,"fullPlanAccuracy":accuracy,"criteria":gate}}


def compare_models(scores, baseline, spec):
    """Pair four observations by canonical task and original presentation."""
    keys={(r["taskId"],r["presentation"],r["cue"]):r for r in baseline}
    by_task=defaultdict(list)
    bounds=[]
    matched=defaultdict(dict)
    for row in scores:
        cue=row["cue"]
        if cue in ("matched","incorrect"):
            partner=keys[row["taskId"],row["presentation"],cue]
            matched[row["taskId"],row["presentation"]][cue]=(row,partner)
    families={row["taskId"]:row["family"] for row in scores}
    for (task,_), values in matched.items():
        match,wrong=values["matched"],values["incorrect"]
        terms=[(wrong[0],1),(match[0],-1),(wrong[1],-1),(match[1],1)]
        lo=hi=total=0
        complete=True
        for row,sign in terms:
            if row["confidence"] is None or row["correct"] is None:
                complete=False
                lo+=min(0,sign)
                hi+=max(0,sign)
            else:
                total+=sign*brier(row)
        bounds.append((total+lo,total+hi))
        if complete:
            by_task[task].append(total)
    result={**contrast([(families[t],mean(v)) for t,v in by_task.items()],len(families),spec),
            "eligiblePresentationPairs":sum(map(len,by_task.values())),
            "plannedPresentationPairs":len(matched),"fullyMatchedTasks":sum(len(v)==4 for v in by_task.values()),
            "allPlannedBounds":[mean(v) for v in zip(*bounds)]}
    bins=spec["confidenceBins"]
    return {"stage":"cross-model","classification":"registered-actual-model","analysisVersion":"mirage-phase3-v1",
            "primary":result,"newQwenRequests":len(scores),"newSmolLM2Requests":0,
            "reusedSmolLM2Rows":len(baseline),"qwen":{k:profile(v,bins) for k,v in grouped(scores,"cue").items()},
            "smol":{k:profile(v,bins) for k,v in grouped(baseline,"cue").items()}}
