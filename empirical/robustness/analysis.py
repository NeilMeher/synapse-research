"""Registered task-level contrasts and presentation diagnostics."""
from collections import Counter, defaultdict
from statistics import mean

from empirical.analysis import brier, contrast, summary
from empirical.robustness.design import CUES, IDS, VERSIONS


def eligible(row):
    return row["correct"] is not None and row["confidence"] is not None


def metrics(rows, bins):
    base = summary(rows,bins)
    total = len(rows)
    counts = {axis: dict(Counter(str(r[axis]) for r in rows if r[axis] is not None))
              for axis in ("answer","canonical","position","grammarPosition")}
    return {**base,"completed":sum(r["rawPresent"] for r in rows),
            "correctPerPlanned":sum(r["correct"] or 0 for r in rows)/total if total else None,
            "choices":counts,"correctCount":sum(r["correct"] or 0 for r in rows)}


def paired(groups, config, outcome, cue_a="matched", cue_b="incorrect"):
    per_task=defaultdict(list)
    family={}
    bounds=[]
    for (task, _), arms in groups.items():
        left,right=arms[cue_a],arms[cue_b]
        family[task]=left["family"]
        if outcome=="brier":
            u=brier(left) if eligible(left) else None
            v=brier(right) if eligible(right) else None
            bounds.append([(v if v is not None else 0)-(u if u is not None else 1),
                           (v if v is not None else 1)-(u if u is not None else 0)])
        elif outcome=="confidence":
            u,v=left["confidence"],right["confidence"]
        else:
            u,v=left["correct"],right["correct"]
        if u is not None and v is not None:
            per_task[task].append(v-u)
    observed=[(family[task],mean(ds)) for task,ds in per_task.items() if ds]
    result={**contrast(observed,len(family),config),"plannedPresentationPairs":len(groups),
            "eligiblePresentationPairs":sum(len(ds) for ds in per_task.values()),
            "completeTasks":sum(len(ds)==len(VERSIONS) for ds in per_task.values())}
    if bounds:
        result["allPlannedBounds"]=[mean(x) for x in zip(*bounds)]
    return result


def option_preferences(rows):
    grids = {"canonicalByLabel":Counter(),"canonicalByPosition":Counter(),
             "labelByGrammarPosition":Counter(),"cueLabelByAnswer":Counter()}
    for row in rows:
        if row["answer"] is None:
            continue
        grids["canonicalByLabel"][row["canonical"],row["answer"]]+=1
        grids["canonicalByPosition"][row["canonical"],str(row["position"])]+=1
        grids["labelByGrammarPosition"][row["answer"],str(row["grammarPosition"])]+=1
        if row["targetLabel"] is not None:
            grids["cueLabelByAnswer"][row["targetLabel"],row["answer"]]+=1
    return {grid:{f"{a}/{b}":count for (a,b),count in cells.items()} for grid,cells in grids.items()}


def study(scores, plan, config):
    by_cue={key:[row for row in scores if row["cue"]==key] for key in CUES}
    bins=config["confidenceBins"]
    groups=defaultdict(dict)
    refs=defaultdict(dict)
    for row in scores:
        groups[row["taskId"],row["presentation"]][row["cue"]]=row
        refs[row["taskId"],row["cue"]][row["presentation"]]=row
    additional={c:{metric:paired(groups,config,metric,"matched",c) for metric in ("brier","accuracy","confidence")}
                for c in ("none","correct","incorrect")}
    adoption={}
    for cue in ("correct","incorrect"):
        answered=[r for r in by_cue[cue] if r["canonical"] is not None]
        same=[r for r in answered if r["canonical"]==r["target"]]
        pairs=[(arms["matched"],arms[cue]) for arms in groups.values() if arms["matched"]["canonical"] is not None
               and arms[cue]["canonical"] is not None]
        candidates=[b for a,b in pairs if a["canonical"]!=b["target"]]
        adoption[cue]={"selectedTarget":len(same),"answered":len(answered),"planned":len(by_cue[cue]),
                       "validPairs":len(pairs),"initiallyDifferent":len(candidates),
                       "switchedToTarget":sum(r["canonical"]==r["target"] for r in candidates),
                       "targetByLabel":dict(Counter(r["targetLabel"] for r in same))}
    variants={}
    for version in VERSIONS[1:]:
        by_arm={}
        for cue in CUES:
            pairs=[(arms["reference"],arms[version]) for (_,c),arms in refs.items() if c==cue]
            answered=[(a,b) for a,b in pairs if a["canonical"] is not None and b["canonical"] is not None]
            by_arm[cue]={"pairs":len(pairs),"bothAnswered":len(answered),
                         "sameCanonical":sum(a["canonical"]==b["canonical"] for a,b in answered),
                         "sameLabel":sum(a["answer"]==b["answer"] for a,b in answered),
                         "samePosition":sum(a["position"]==b["position"] for a,b in answered),
                         "sameStatus":sum(a["status"]==b["status"] for a,b in pairs),
                         "sameParsedFields":sum((a["answer"],a["confidence"],a["status"])==
                                                (b["answer"],b["confidence"],b["status"]) for a,b in pairs),
                         "sameRaw":sum(a["rawPresent"] and b["rawPresent"] and a["rawSha256"]==b["rawSha256"] for a,b in pairs)}
        variants[version]=by_arm
    baselines={}
    for cue in CUES:
        requests=[r for r in plan if r["cue"]==cue]
        truth=[r["truth"] for r in by_cue[cue]]
        maps=[r["mapping"] for r in requests]
        baselines[cue]={"n":len(truth),"uniformExpectedAccuracy":.25,"uniformBrierAtConstant25":.1875,"solverAccuracy":1,
                        "alwaysA":mean(m["labels"][IDS.index(y)]=="A" for y,m in zip(truth,maps)),
                        "alwaysPhysicalFirst":mean(m["physical"][0]==str(IDS.index(y)) for y,m in zip(truth,maps)),
                        "alwaysGrammarFirst":mean(m["labels"][IDS.index(y)]==m["grammar"][0] for y,m in zip(truth,maps))}
    primary=additional["incorrect"]["brier"]
    return {"version":"mirage-robustness-analysis-v1","evidence":"registered-actual-model",
            "primary":primary,"eligibleTaskCoverageMet":primary["coverage"]>=config["minCompleteTaskFraction"],
            "armMetrics":{cue:metrics(arm,bins) for cue,arm in by_cue.items()},
            "familyMetrics":{f:{cue:metrics([r for r in group if r["family"]==f],bins) for cue,group in by_cue.items()}
                             for f in sorted({r["family"] for r in scores})},
            "paired":additional,"cueAdoption":adoption,"presentations":variants,
            "matrices":{cue:option_preferences(arm) for cue,arm in by_cue.items()},
            "mathematicalBaselines":baselines}
