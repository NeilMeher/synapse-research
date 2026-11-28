"""Immutable request plans using the registered canonical schedule."""
from collections import Counter
from pathlib import Path
from random import Random

from empirical.inference import digest, json_bytes
from empirical.run import PROTOCOL_FILE, load
from empirical.robustness.design import FAMILIES, IDS, PROMPT_FILE, file_paths, render

ROOT=Path(__file__).resolve().parent
SETTINGS=ROOT/"protocol.json"
INPUTS=ROOT/"inputs"
STAGES=("development","decoding","qwen-development","cross-model")

# Outside the two earlier task populations. Capability checks never enter evaluation.
CONTROLS=(
    ("Copy only the requested choice label in your answer line. The requested label is D.",
     ("circle","square","star","oval"), "reference", "c0", "DABC"),
    ("The parcel label reads 17. What number is on the label?",
     ("17","71","27","7"),"retrieval","c0","BDAC"),
    ("Which number is larger, six or eight?",
     ("eight","six","three","five"),"comparison","c0","CADB"),
    ("How many are two counters plus three counters?",
     ("five","two","three","six"),"arithmetic","c0","ABDC"),
    ("A plain cup is inside a blue box. Which item is outside the cup?",
     ("blue box","paper bag","marker","key"),"mapping","c0","CDAB"),
    ("Choose the stated colour. The sign says green.",
     ("green","blue","brown","white"),"confidence","c0","ADCB"),
    ("Copy only the requested choice label in your answer line. The requested label is C.",
     ("pen","brush","chalk","eraser"),"reference","c0","CBDA"),
    ("The plaque shows 24 visitors. What exact count is shown?",
     ("24","42","20","4"),"retrieval","c0","DABC"),
    ("Which number is smaller, nine or four?",
     ("four","nine","eight","six"),"comparison","c0","ADBC"),
    ("How many are five stickers minus two stickers?",
     ("three","five","two","seven"),"arithmetic","c0","BDCA"),
    ("Mina owns a blue pen and Ari owns a red ball. What does Ari own?",
     ("red ball","blue pen","red pen","blue ball"),"mapping","c0","CBAD"),
    ("Choose the stated shape. The card says triangle.",
     ("triangle","square","pentagon","circle"),"confidence","c0","DBCA"),
)


def controls():
    tasks,keys, rows=[],[],[]
    for i,(question,options,family,truth,label) in enumerate(CONTROLS,1):
        task_id=f"p3-control-{i:02}"
        tasks.append({"id":task_id,"family":family,"question":question,"options":dict(zip(IDS,options,strict=True))})
        keys.append({"id":task_id,"correct":truth})
        rows.append({"taskId":task_id,"family":family,"presentation":"reference","cue":"none","target":None,
                     "mapping":{"physical":"2301","labels":label,"grammar":"ABCD"}})
    return tasks,keys,rows


def referenced(stage):
    task_path, key_path, sequence_path=file_paths("heldout")
    dataset,keys,old_plan=load(task_path),load(key_path),load(sequence_path)
    if stage=="cross-model":
        return dataset["tasks"],keys,old_plan
    request={r["taskId"]:r for r in old_plan if r["presentation"]=="reference" and r["cue"]=="matched"}
    config=load(SETTINGS)["decoding"]
    ordered=sorted(dataset["tasks"],key=lambda r:r["id"])
    tasks=[r for family in FAMILIES for r in [q for q in ordered if q["family"]==family][:config["selectedPerFamily"]]]
    ids={r["id"] for r in tasks}
    return tasks,[k for k in keys if k["id"] in ids],[request[t["id"]] for t in tasks]


def render_request(task, row):
    messages,grammar=render(task,row["design"],load(PROMPT_FILE))
    if row["arm"]=="format":
        grammar=grammar.replace('root ::= ', 'root ::= confidence "\\n" answer\nanswer ::= ',1)
        answer,confidence=grammar.split(' "\\nConfidence: " ')
        grammar=answer+'\nconfidence ::= "Confidence: " '+confidence
        messages[-1]["content"]+=" Write the confidence line first and the selected answer line second."
    return messages,grammar


def build_plan(stage):
    spec=load(SETTINGS)
    if stage in ("development","qwen-development"):
        tasks,keys,old_plan=controls()
        if stage=="development":
            tasks,keys,old_plan=tasks[:4],keys[:4],old_plan[:4]
    else:
        tasks,keys,old_plan=referenced(stage)
    lookup={t["id"]:t for t in tasks}
    legacy=load(PROTOCOL_FILE)["generation"]
    plan=[]
    is_sampling=stage in ("development","decoding")
    sampling=spec["decoding"]
    for r in old_plan:
        payload={k:r[k] for k in ("taskId","family","presentation","cue","target","mapping")}
        if is_sampling:
            arms=sampling["replicates"] if stage=="decoding" else dict.fromkeys(sampling["replicates"],1)
        else:
            arms={"greedy":1}
        for arm,count in arms.items():
            for repeat in range(1,count+1):
                generation=legacy.copy()
                if is_sampling:
                    generation={**sampling["settings"],"temperature":sampling["temperatures"][arm],
                                "seed":sampling["seedStart"]+len(plan)+(10000 if stage=="development" else 0)}
                rec={"studyStage":stage,"arm":arm,"replicate":repeat,"design":payload,"generation":generation}
                messages,grammar=render_request(lookup[r["taskId"]],rec)
                if stage=="cross-model" and digest({"messages":messages,"grammar":grammar})!=r["requestSha256"]:
                    raise ValueError("The visible request differs from the frozen MIRAGE 002 schedule.")
                if stage=="cross-model":
                    rec["referenceSequence"]=r["sequence"]
                rec["requestSha256"]=digest({"messages":messages,"grammar":grammar,"generation":generation})
                plan.append(rec)
    if is_sampling:
        Random(sampling["shuffleSeed"]+(stage=="development")).shuffle(plan)
    for i, r in enumerate(plan,1):
        r["sequence"]=i
    return tasks,keys,plan


def hashes(stage):
    return digest(build_plan(stage)[0]),digest(build_plan(stage)[1]),digest(build_plan(stage)[2])


def compact(stage):
    tasks, keys, plan=build_plan(stage)
    return {"tasks":len(tasks),"requests":len(plan),"taskDigest":digest(tasks),"keyDigest":digest(keys),
            "planDigest":digest(plan),"arms":dict(Counter(r["arm"] for r in plan))}


def request_file(stage):
    return INPUTS/(stage+".json")


def prepare(create=False):
    INPUTS.mkdir(exist_ok=True)
    for stage in STAGES:
        path=request_file(stage)
        data=json_bytes(compact(stage))
        if create and not path.exists():
            with path.open("xb") as dst:
                dst.write(data)
        if path.read_bytes()!=data:
            raise ValueError("The frozen request fingerprint differs for "+stage)
