"""Canonical questions, independent rotations and the immutable request schedule."""
from collections import Counter
from fractions import Fraction
from pathlib import Path
from random import Random

from empirical.inference import digest, json_bytes
from empirical.run import load

HERE = Path(__file__).resolve().parent
INPUTS = HERE / "inputs"
SETTINGS = HERE / "protocol.json"
PROMPT_FILE = HERE / "prompt.json"
LABELS = "ABCD"
IDS = tuple(f"c{i}" for i in range(4))
FAMILIES = ("change", "wood", "ordering", "lookup")
CUES = ("none", "matched", "correct", "incorrect")
VERSIONS = ("reference", "physical", "labels", "grammar")
MUL2 = (0, 2, 3, 1)
MUL3 = tuple(b ^ MUL2[b] for b in range(4))


def make_task(family, index, split):
    i = index + (12 if split == "development" else 0)
    if family == "change":
        a, b, c = 18+2*i, 3+i%4, 2+i%3
        text = f"A box holds {a} red tiles. You remove {b} tiles and add {c} packets of 4 red tiles each. How many tiles are in the box now?"
        truth = a-b+4*c
        answers = (truth, a-b+c, a+b+4*c, a-b+c*3)
        derivation = f"{a} − {b} + 4 × {c} = {truth}."
    elif family == "wood":
        a, b, c = 2+i%4, 3+(i//4), 10+i
        text = (f"A bag has {a} plain wooden beads, {b} spotted wooden beads, and {c} plain stone beads. "
                "One bead is drawn uniformly. Given that it is wooden, what is the chance that it is plain?")
        truth = Fraction(a, a+b)
        choices = [Fraction(a, a+b+c), Fraction(c, a+b+c), Fraction(b+c, a+b+c), Fraction(1, a+b+c)]
        distractors = list(dict.fromkeys(value for value in choices if value != truth))
        answers = (truth, *distractors[:3])
        derivation = f"Among {a+b} wooden beads, {a} are plain. The chance is {truth}."
    elif family == "ordering":
        people = ("Finn", "Gia", "Hana", "Joel") if split == "development" else ("Ira", "Kai", "Noa", "Sid")
        first, last, second, third = (people[(i+k) % 4] for k in ((0, 3, 1, 2) if i//4 % 2 == 0 else (0, 2, 3, 1)))
        scene = ("arrived", "finished", "checked in", "crossed the line")[i % 4]
        text = (f"Four people {scene} at distinct times. {first} {scene} before {second}. "
                f"{last} {scene} after {third}. {third} {scene} after {second}. Who was second?")
        answers = (second, first, third, last)
        derivation = f"The order is {first}, {second}, {third}, {last}."
    elif family == "lookup":
        people = ("Lea", "Min", "Omar", "Pia")
        objects = ("green card", "white clip", "blue pen", "red key")
        rotated = [objects[(j+i)%4] for j in range(4)]
        owner = (i+i//4+i//8) % 4
        groups = "; ".join(f"{name} holds the {thing}" for name, thing in zip(people, rotated))
        text = f"In room {11+i}, {groups}. What does {people[owner]} hold?"
        answers = (rotated[owner], *(value for j, value in enumerate(rotated) if j != owner))
        derivation = f"The statement gives {people[owner]} the {answers[0]}."
    else:
        raise ValueError("Unknown family")
    if len(set(answers)) != 4:
        raise ValueError("Answer values must be distinct")
    task = {"id": f"{split}-{family}-{index+1:02}", "family": family, "template": family+"-v1",
            "difficulty": "direct retrieval" if family == "lookup" else "elementary multi-step",
            "question": text, "options": dict(zip(IDS, map(str, answers)))}
    key = {"id": task["id"], "correct": IDS[0], "derivation": derivation}
    return task, key


def presentation(a, b, version, block=0):
    if version not in VERSIONS:
        raise ValueError("Unknown presentation")
    step = 1+block
    p = a ^ (step if version == "physical" else 0)
    l = b ^ (step if version == "labels" else 0)
    g = (a ^ MUL2[b]) ^ (step if version == "grammar" else 0)
    return {"physical": "".join(str(i ^ p) for i in range(4)),
            "labels": "".join(LABELS[i ^ l] for i in range(4)),
            "grammar": "".join(LABELS[i ^ g] for i in range(4))}


def validate_presentation(mapping):
    for name, symbols in (("physical", "0123"), ("labels", LABELS), ("grammar", LABELS)):
        value = mapping[name]
        if len(value) != 4 or set(value) != set(symbols):
            raise ValueError(f"Invalid {name} permutation")


def options_for(task, mapping):
    validate_presentation(mapping)
    return [(IDS[int(i)], mapping["labels"][int(i)], task["options"][IDS[int(i)]])
            for i in mapping["physical"]]


def render(task, row, prompt):
    options = options_for(task, row["mapping"])
    option_text = "\n".join(f"{label}. {content}" for _, label, content in options)
    target = row["target"]
    cue = ""
    if row["cue"] == "matched":
        cue = prompt["matched"]
    elif target is not None:
        label = row["mapping"]["labels"][IDS.index(target)]
        cue = prompt["advice"].format(label=label)
    instruction = prompt["instruction"]
    if row.get("instructionOrder"):
        instruction += " Allowed labels in this list are " + ", ".join(row["instructionOrder"]) + "."
    user = "\n".join(part for part in (task["question"], option_text, cue, instruction) if part)
    grammar = prompt["grammar"].replace("{labels}", " | ".join(f'"{label}"' for label in row["mapping"]["grammar"]))
    return [{"role": "system", "content": prompt["system"]}, {"role": "user", "content": user}], grammar


def choose_cues(cells):
    """Balance wrong-option targets without changing the presentations or the answers."""
    rng = Random(7421)
    contributions = []
    for a, b, block, family in cells:
        per_option = []
        for idx in range(1, 4):
            counts = Counter({(family, idx): 1})
            for version in VERSIONS:
                mp = presentation(a, b, version, block)
                counts[version, "label", mp["labels"][idx]] += 1
                counts[version, "position", mp["physical"].index(str(idx))] += 1
            per_option.append(counts)
        contributions.append(per_option)
    def penalty(key, value):
        ideal = 8/3 if len(key) == 2 else len(cells)/4
        return (value-ideal)**2
    best = (float("inf"), [])
    for _ in range(24):
        assignment = [rng.randrange(3) for _ in cells]
        counts = sum((per_option[i] for i, per_option in zip(assignment, contributions)), Counter())
        all_keys = set().union(*(set(c) for per_option in contributions for c in per_option))
        for _ in range(12):
            indices = list(range(len(cells)))
            rng.shuffle(indices)
            changes = 0
            for idx in indices:
                prev = assignment[idx]
                choices = list(range(3))
                rng.shuffle(choices)
                for i in choices:
                    if i == prev:
                        continue
                    delta = contributions[idx][i].copy()
                    delta.subtract(contributions[idx][prev])
                    if sum(penalty(k, counts[k]+v)-penalty(k, counts[k]) for k, v in delta.items()) < -1e-9:
                        counts.update(delta)
                        assignment[idx] = i
                        changes += 1
                        break
            if not changes:
                break
        loss = sum(penalty(k, counts[k]) for k in all_keys)
        if loss < best[0]:
            best = loss, assignment
    return [IDS[i+1] for i in best[1]]


def design(split, prompt):
    if split == "heldout":
        cells = [(a, b, block, FAMILIES[a ^ MUL3[b]]) for block in range(2) for a in range(4) for b in range(4)]
        wrongs = choose_cues(cells)
    elif split == "development":
        cells = [(0, 0, 0, family) for family in FAMILIES]
        wrongs = ["c1", "c2", "c3", "c1"]
    else:
        raise ValueError("Unknown split")
    rng = Random(63081 if split == "heldout" else 63098)
    questions, answers, schedule = [], [], []
    family_counts = Counter()
    for (a,b,block,family), wrong in zip(cells, wrongs):
        index = family_counts[family]
        family_counts[family] += 1
        task, key = make_task(family, index, split)
        key["incorrectTarget"] = wrong
        questions.append(task)
        answers.append(key)
        if split == "development":
            arms = [(version, "matched", None) for version in VERSIONS]
            arms += [("reference", cue, None) for cue in CUES if cue != "matched"]
            arms += [("reference", "matched", order) for order in ("ABCD", "DCBA")]
        else:
            arms = [(version, cue, None) for version in VERSIONS for cue in CUES]
        rng.shuffle(arms)
        for version,cue,order in arms:
            experiment = {"taskId": task["id"], "family": family, "presentation": version,"cue": cue,
                          "target": key["correct"] if cue == "correct" else wrong if cue == "incorrect" else None,
                          "mapping": presentation(a,b,version,block)}
            if order:
                experiment["instructionOrder"] = order
            messages, grammar = render(task, experiment, prompt)
            schedule.append({**experiment,"requestSha256": digest({"messages":messages,"grammar":grammar}),
                             "grammarSha256": digest(grammar)})
    # Shuffle pair groups to balance time, then shuffle execution order within each task above.
    groups = [schedule[i:i+(16 if split == "heldout" else 9)]
              for i in range(0,len(schedule),16 if split == "heldout" else 9)]
    rng.shuffle(groups)
    schedule = [row for group in groups for row in group]
    for index,row in enumerate(schedule,1):
        row["sequence"] = index
    return {"version":"mirage-canonical-v1","split":split,"tasks":questions}, answers, schedule


def file_paths(split):
    return tuple(INPUTS / f"{split}.{suffix}.json" for suffix in ("tasks","keys","schedule"))


def prepare(create=False):
    prompt = load(PROMPT_FILE)
    INPUTS.mkdir(exist_ok=True)
    for split in ("development","heldout"):
        for path, data in zip(file_paths(split), design(split, prompt)):
            computed = json_bytes(data)
            if create and not path.exists():
                with path.open("xb") as stream:
                    stream.write(computed)
            if path.read_bytes() != computed:
                raise ValueError(f"Changed frozen study input: {path.name}")
