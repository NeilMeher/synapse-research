"""Independent raw-record synthesis without loading an inference runtime."""
from collections import Counter, defaultdict
from fractions import Fraction as Q
from hashlib import sha256
from math import log2
from pathlib import Path
from random import Random
import argparse
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUTPUT = ROOT / "research/evidence/mirage-measurement-synthesis-001"
LETTERS = "ABCD"
# The literal control truth in each selected mapping is c0; verify the named labels too.
CONTROL = dict(zip((f"p3-control-{i:02}" for i in range(1, 13)), "DBCACACDABCD", strict=True))


def read(file):
    return json.loads(file.read_bytes())


def digest(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": sha256(data).hexdigest()}


def exact_json(value):
    def encode(item):
        if isinstance(item, Q):
            return float(item)
        raise TypeError(type(item).__name__)
    return (json.dumps(value, indent=2, ensure_ascii=False, default=encode, sort_keys=True) + "\n").encode()


def avg(values):
    values = list(values)
    return sum(values) / len(values) if values else None


def fields(text, format_first):
    marker = (r"Confidence: (100|[0-9]{1,2})%\nAnswer: ([A-D]|ABSTAIN)" if format_first
              else r"Answer: ([A-D]|ABSTAIN)\nConfidence: (100|[0-9]{1,2})%")
    match = re.fullmatch(marker, text or "")
    if not match:
        raise ValueError("Unrecognized original response format")
    label, number = match.groups()[::-1] if format_first else match.groups()
    return (None if label == "ABSTAIN" else label), Q(int(number), 100)


def reconstruct(spec):
    stem = ROOT / "empirical/archives" / spec["dir"]
    manifest = read(stem / "manifest.json")
    for name, item in manifest["outputs"].items():
        assert digest(stem/name) == item, name
    source = ROOT/spec["input"] if spec["input"] != "schedule.json" else stem/"schedule.json"
    planned = read(source)
    is_pilot = spec["key"] == "pilot"
    truth = {} if spec["truth"] == "literal capability controls" else {
        x["id"]: x["correct"] for x in read(ROOT/spec["truth"])}
    tasks = {r["id"]: r for r in planned["tasks"]} if is_pilot else None
    archived = read(stem/"scores.json")["rows"]
    raw = [json.loads(x) for x in (stem/"responses.ndjson").read_bytes().splitlines()]
    assert len(raw) == len(archived) == spec["n"]
    assert len({o["id"] for o in raw}) == len({o["requestSha256"] for o in raw}) == len(raw)
    rows = []
    for i, (o, old) in enumerate(zip(raw, archived, strict=True)):
        assert o["sequence"] == i+1
        if is_pilot:
            task = tasks[o["taskId"]]
            design = {"taskId": task["id"], "family": task["family"], "cue":o["condition"],
                      "presentation":"reference", "target":task["incorrectCueOption"]}
            arm = o["condition"]
            mapping = {"labels":LETTERS,"physical":"0123","grammar":LETTERS}
        else:
            plan = planned[i]
            assert plan["sequence"] == o["sequence"] and plan["requestSha256"] == o["requestSha256"]
            design = plan.get("design", plan)
            mapping = design["mapping"]
            arm = plan.get("arm", design["cue"])
        task_id = design["taskId"]
        answer, literal = fields(o["raw"], arm == "format")
        p = literal if answer is not None else None
        assert o["status"] == old["status"] == ("scorable" if p is not None else "abstention")
        label_truth = truth.get(task_id, "c0")
        if not is_pilot and not truth:
            assert mapping["labels"][0] == CONTROL[task_id]
        if not is_pilot:
            assert set(mapping["labels"]) == set(mapping["grammar"]) == set(LETTERS)
            assert set(mapping["physical"]) == set("0123")
        slot = mapping["labels"].index(answer) if answer is not None else None
        physical = mapping["physical"].index(str(slot))+1 if slot is not None else None
        canonical = f"c{slot}" if slot is not None else None
        if is_pilot:
            key = ord(label_truth)-65
            label_truth = f"c{key}"
            target = f"c{ord(design['target'])-65}"
        else:
            target = design["target"]
        correctness = int(canonical == label_truth) if answer is not None else None
        assert task_id == old["taskId"] and ("taskFamily" not in old or old["taskFamily"] == design["family"])
        assert answer == old["answer"] == o["answer"]
        assert (float(p) if p is not None else None) == old["confidence"] == o["confidence"]
        assert correctness == old["correct"]
        if not is_pilot:
            assert canonical == old["canonical"] and old["position"] == physical
            assert old["truth"] == label_truth and old["cue"] == design["cue"]
            assert old["presentation"] == design["presentation"] and old["family"] == design["family"]
            assert old["grammarPosition"] == (mapping["grammar"].index(answer)+1 if answer else None)
            if "arm" in old:
                assert arm == old["arm"]
            if "rawSha256" in old:
                assert sha256((json.dumps(o["raw"], ensure_ascii=False) + "\n").encode()).hexdigest() == old["rawSha256"]
        rows.append({"task":task_id,"family":design["family"],"arm":arm,"present":design["presentation"],
                     "label":answer,"canonical":canonical,"position":physical,"correct":correctness,
                     "literal":literal,"p":p,"loss":(p-correctness)**2 if p is not None else None,
                     "target":target,"raw":o["raw"],"tokens":o["tokens"]["input"]})
    meta = {"archive":spec["dir"],"evidence":"E","stage":spec["stage"],
            "model":manifest["execution"]["model"]["id"],"runtime":manifest["execution"]["model"]["runtime"],
            "quantization":manifest["execution"]["model"]["quantization"],
            "prompt":spec["prompt"],"taskInput":spec["input"],"answerKey":spec["truth"],
            "execution":manifest["execution"].get("classification",manifest.get("classification")),
            "archivedOutputs":manifest["outputs"]}
    return rows, meta, stem


def summary(rows):
    n = len(rows)
    answered = [r for r in rows if r["correct"] is not None]
    proper = [r for r in answered if r["p"] is not None]
    k = len(proper)
    hit = sum(r["correct"] for r in answered)
    errors = [r["p"] for r in proper if not r["correct"]]
    hits = [r["p"] for r in proper if r["correct"]]
    loss_sum = sum(r["loss"] for r in proper)
    return {"planned":n,"answered":len(answered),"scorable":k,
            "answerCoverage":Q(len(answered),n),"confidenceCoverage":Q(k,n),
            "numericFields":sum(r["literal"] is not None for r in rows),
            "unscoredNumericFields":n-k,"fullPlanCorrect":hit,"fullPlanAccuracy":Q(hit,n),
            "answeredAccuracy":Q(hit,len(answered)) if answered else None,
            "meanConfidence":avg(r["p"] for r in proper),
            "calibrationGap":avg(r["p"]-r["correct"] for r in proper),
            "brier":Q(loss_sum,k) if k else None,
            "missingBrierBounds":[Q(loss_sum,n),Q(loss_sum+n-k,n)],
            "errorAUROC":Q(sum(2*(e<c)+(e==c) for e in errors for c in hits),2*len(errors)*len(hits)) if errors and hits else None,
            "choices":{axis:dict(Counter(str(r[axis]) for r in answered)) for axis in ("label","canonical","position")},
            "unscoredLiteralHistogram":dict(Counter(str(int(100*r["literal"])) for r in rows if r["p"] is None))}


def nested(rows, fields):
    groups = defaultdict(list)
    for row in rows:
        groups[tuple(row[f] for f in fields)].append(row)
    return groups


def interval(values, spec):
    strata = defaultdict(list)
    for family, value in values:
        strata[family].append(value)
    rng = Random(spec["bootstrapSeed"])
    n = len(values)
    if not n:
        return {"eligibleTasks":0,"estimate":None,"interval95":None}
    draws = sorted(sum(sum(group[int(rng.random()*len(group))] for _ in group)
                       for group in strata.values())/n for _ in range(spec["bootstrapReplicates"]))
    def at(quantile):
        x = (len(draws)-1)*quantile
        j = int(x)
        return draws[j]+(x-j)*(draws[j+1]-draws[j])
    return {"eligibleTasks":n,"estimate":avg(v for _,v in values),
            "interval95":[at(Q(1,40)),at(Q(39,40))],
            "tasksByFamily":{k:len(v) for k,v in strata.items()}}


def pair_groups(rows, left, right, across):
    grouping = nested(rows, ("task","present") if across == "arm" else ("task","arm"))
    return [tuple([r for r in group if r[across] == arm] for arm in (left,right))
            for group in grouping.values()]


def compare(pairs, cfg, outcomes):
    n = len(pairs)
    assert all(a and b for a,b in pairs)
    data = {"plannedPairs":n,"plannedTasks":len({a[0]["task"] for a,_ in pairs})}
    for outcome in outcomes:
        task_deltas = defaultdict(list)
        families = {}
        for a,b in pairs:
            key = a[0]["task"]
            assert b[0]["task"] == key
            families[key] = a[0]["family"]
            def value(r):
                return int(r["label"] == "A") if outcome == "labelA" and r["label"] is not None else r.get(outcome)
            av,bv = (avg(Q(value(x)) for x in group if value(x) is not None) for group in (a,b))
            if av is not None and bv is not None:
                task_deltas[key].append(bv-av)
        vals = [(families[k],avg(d)) for k,d in task_deltas.items()]
        data[outcome] = {**interval(vals,cfg),"eligiblePairs":sum(map(len,task_deltas.values()))}
    endpoints = []
    for low,high in pairs:
        wl,wh = (summary(arm)["missingBrierBounds"] for arm in (low,high))
        endpoints.append((wh[0]-wl[1],wh[1]-wl[0]))
    data["fullPlanBrierDifferenceBounds"] = [avg(x) for x in zip(*endpoints)]
    if all(len(a)==len(b)==1 for a,b in pairs):
        transitions = Counter()
        same = Counter()
        switched = eligible = target_hits = 0
        for (a,),(b,) in pairs:
            x,y = ("absent" if r["correct"] is None else "correct" if r["correct"] else "wrong" for r in (a,b))
            transitions[f"{x}->{y}"] += 1
            same["raw"] += a["raw"]==b["raw"]
            if a["label"] is None or b["label"] is None:
                continue
            for axis in ("label","canonical","position"):
                same[axis] += a[axis]==b[axis]
            if b["target"] is not None:
                target_hits += b["canonical"]==b["target"]
                if a["canonical"]!=b["target"]:
                    eligible += 1
                    switched += b["canonical"]==b["target"]
        data.update({"correctnessTransitions":transitions,"sameFields":same,
                     "cueAdoption":{"targetHitsJoint":target_hits,"initiallyDifferent":eligible,"switches":switched}})
    return data


def exact_match(expected, current):
    assert expected["pairs"] == current["eligibleTasks"]
    assert abs(expected["difference"]-float(current["estimate"])) < 1e-12
    assert all(abs(x-float(y))<1e-12 for x,y in zip(expected["interval95"],current["interval95"],strict=True))


def synthesis(protocol):
    by = {}
    results = {}
    for spec in protocol["archives"]:
        rows, meta, folder = reconstruct(spec)
        by[spec["key"]] = rows
        result = {"metadata":meta,"total":summary(rows),
                  "conditions":{arm:summary(r) for (arm,),r in nested(rows,("arm",)).items()},
                  "tasks":len({r["task"] for r in rows})}
        results[spec["key"]] = result
        if not spec.get("config"):
            continue
        config = read(ROOT/spec["config"])["analysis"]
        legacy = read(folder/"analysis.json")
        arms = result["conditions"]
        for key, metrics in legacy.get("conditions", legacy.get("armMetrics", {})).items():
            for name, old in {"brier":"brier","calibrationGap":"calibrationGap","errorAUROC":"errorAUROC",
                              "confidenceCoverage":"confidenceCoverage","scorable":"scorable"}.items():
                a,b = arms[key][name],metrics[old]
                assert a is None and b is None or abs(float(a)-b)<1e-12
        key = spec["key"]
        if key == "pilot":
            order = {r["id"]:i for i,r in enumerate(read(ROOT/spec["input"])["tasks"])}
            pairs = pair_groups(sorted(rows,key=lambda r:order[r["task"]]),"neutral","incorrectCue","arm")
            result["contrasts"] = {"incorrectCue":compare(pairs,config,("loss","correct","p"))}
            check = result["contrasts"]["incorrectCue"]
            exact_match(legacy["paired"]["brier"],check["loss"])
        elif key == "robustness":
            result["contrasts"] = {}
            for contrast,left,right in (("incorrect","matched","incorrect"),("correct","matched","correct"),("addedText","none","matched")):
                pairs = pair_groups(rows,left,right,"arm")
                z = compare(pairs,config,("loss","correct","p"))
                if contrast != "addedText":
                    exact_match(legacy["paired"][contrast]["brier"],z["loss"])
                    z["matchedTokenCounts"] = sum(a[0]["tokens"]==b[0]["tokens"] for a,b in pairs)
                result["contrasts"][contrast] = z
            result["presentation"] = {}
            for variant in ("labels","physical","grammar"):
                joined = pair_groups(rows,"reference",variant,"present")
                z = compare(joined,config,())
                prior = legacy["presentations"][variant]
                for field,old in (("label","sameLabel"),("position","samePosition"),("canonical","sameCanonical"),("raw","sameRaw")):
                    assert z["sameFields"][field]==sum(x[old] for x in prior.values())
                result["presentation"][variant] = z
        else:
            result["contrasts"] = {}
            for name,a,b in (("sampling","low","moderate"),("format","greedy","format")):
                result["contrasts"][name]=compare(pair_groups(rows,a,b,"arm"),config,("loss","correct","p","labelA"))
            for field,name in (("loss","brier"),("correct","accuracy"),("labelA","labelA")):
                exact_match(legacy["pairedStochastic"][name],result["contrasts"]["sampling"][field])
            exact_match(legacy["comparedWithGreedy"]["format"]["brier"],result["contrasts"]["format"]["loss"])
            for arm in ("low","moderate"):
                values=[]
                for grp in nested([r for r in rows if r["arm"]==arm],("task",)).values():
                    c=Counter(x["canonical"] for x in grp if x["canonical"] is not None)
                    n=sum(c.values())
                    values.append(-sum(k/n*log2(k/n) for k in c.values()))
                ent=avg(values)
                assert abs(ent-legacy["sampling"][arm]["meanCanonicalEntropyBits"])<1e-12
                result["conditions"][arm]["meanCanonicalEntropyBits"]=ent
    reference={r["task"]:r for r in by["decodingDevelopment"] if r["arm"]=="greedy"}
    partner=[(reference[r["task"]],r) for r in by["qwen"] if r["task"] in reference]
    qwenGate=read(ROOT/"empirical/qwen/capability-review.json")
    assert len(partner)==qwenGate["sharedDevelopment"]["n"]==4
    matched=[{"taskId":b["task"],"smolCorrect":a["correct"],"qwenCorrect":b["correct"],
              "smolLabel":a["label"],"qwenLabel":b["label"]} for a,b in partner]
    assert sum(x["smolCorrect"] for x in matched)==2 and sum(x["qwenCorrect"] for x in matched)==2
    d=read(ROOT/"empirical/phase3/vulkan-development.json")
    probe=[]
    for row in d["records"]:
        cpu=reference[row["taskId"]]; gpu=row["response"]
        choice,p=fields(gpu["raw"],False)
        probe.append({"taskId":row["taskId"],"sameRaw":gpu["raw"]==cpu["raw"],
                      "sameLabel":choice==cpu["label"],"gpuLiteral":p,"cpuLiteral":cpu["literal"]})
    return {"study":protocol["id"],"evidence":"E","newInferenceRequests":0,
            "archivedRequests":sum(len(r) for r in by.values()),"sourceResults":results,
            "sameFourDevelopmentControls":matched,
            "deviceProbe":{"n":len(probe),"rows":probe,"source":digest(ROOT/"empirical/phase3/vulkan-development.json")},
            "matchedMIRAGE003":{"planned":512,"executed":0},"estimandDefinitions":protocol["estimands"]}


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument("mode",choices=("run","verify"))
    cli.add_argument("protocol_commit",nargs="?")
    args=cli.parse_args()
    spec=HERE/"protocol.json"
    p=read(spec)
    report=synthesis(p)
    existing=read(OUTPUT/"manifest.json") if args.mode=="verify" else None
    commit=existing["protocolCommit"] if existing else args.protocol_commit
    if not re.fullmatch("[a-f0-9]{40}",commit or ""):
        cli.error("a frozen protocol commit is required")
    payload=exact_json(report)
    manifest={"id":p["id"],"evidence":p["evidence"],"analysis":"retrospective",
              "status":"completed","protocolCommit":commit,"protocol":digest(spec),
              "outputs":{"estimand-register.json":{"sha256":sha256(payload).hexdigest(),"bytes":len(payload)}}}
    if args.mode=="run":
        OUTPUT.mkdir(parents=True,exist_ok=True)
    for file,content in (("manifest.json",exact_json(manifest)),("estimand-register.json",payload)):
        path=OUTPUT/file
        if args.mode=="verify" or path.exists():
            assert path.read_bytes()==content, file
        else:
            with path.open("xb") as destination:
                destination.write(content)
    print(f"Verified {report['archivedRequests']} original archived requests in six groups and four device probes.")


if __name__=="__main__":
    main()
