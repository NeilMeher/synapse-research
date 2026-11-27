"""Independent normal-tail, allocation, and aggregate checks for SCIENTIA."""
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import mean, stdev

from reference_noesis import normal, stream

ROOT = Path(__file__).resolve().parents[1]
Z95 = 1.959963984540054


def run_workflows(first, second, full, alpha):
    def p(z):
        return math.erfc(abs(z) / math.sqrt(2))

    combined = list(map(p, full))
    m = len(combined)
    rank = sorted(range(m), key=combined.__getitem__)
    holm = []
    for rank_index, i in enumerate(rank):
        if combined[i] > alpha/(m-rank_index):
            break
        holm.append(i)
    bh = [k+1 for k, i in enumerate(rank) if combined[i] <= (k+1)*alpha/m]
    full_choices = {
        "primary": [0] if combined[0] <= alpha else [],
        "unadjusted": [i for i in rank if combined[i] <= alpha],
        "selected": rank[:1] if combined[rank[0]] <= alpha else [],
        "bonferroni": [i for i in rank if combined[i] <= alpha/m],
        "holm": holm,
        "bh": rank[:max(bh, default=0)],
    }
    result = {policy: (indices, full, 1, None) for policy, indices in full_choices.items()}
    first_p = list(map(p, first))
    sorted_first = sorted(range(m), key=first_p.__getitem__)
    first_id = sorted_first[0]
    for policy, screened, limit in (
        ("holdout", [first_id] if first_p[first_id] <= alpha else [], alpha),
        ("replicate", [i for i in sorted_first if first_p[i] <= alpha/m], alpha/m),
    ):
        accepted = [i for i in screened if p(second[i]) <= limit and first[i]*second[i] > 0]
        result[policy] = (accepted, second, 0.5, screened)
    return result


def world(design, rng):
    m, n = design["hypotheses"], design["n"]
    k, rho = design["signals"], design["rho"]
    labels = [design["effect"]]*k + [0]*(m-k)
    for i in range(m-1, 0, -1):
        j = int(next(rng)*(i+1))
        labels[i], labels[j] = labels[j], labels[i]
    blocks = []
    for _ in range(2):
        common = math.sqrt(rho)*normal(rng)
        blocks.append([value*math.sqrt(n/2)+common+math.sqrt(1-rho)*normal(rng) for value in labels])
    a,b = blocks
    return labels,a,b,[(x+y)/math.sqrt(2) for x,y in zip(a,b,strict=True)]


def outcomes(truth, n, indices, z, fraction, screened):
    effects = sum(value != 0 for value in truth)
    false = sum(truth[i] == 0 for i in indices)
    hits = len(indices)-false
    se = 1/math.sqrt(n*fraction)
    errors = [z[i]*se-truth[i] for i in indices]
    return {
        "fwer": int(false>0), "fdp": false/len(indices) if indices else 0,
        "type1": false/(len(truth)-effects) if effects < len(truth) else None,
        "power": hits/effects if effects else None,
        "type2": (effects-hits)/effects if effects else None,
        "anyReport": int(bool(indices)), "reportCount": len(indices),
        "replication": len(indices)/len(screened) if screened else None,
        "reportedBias": mean(errors) if errors else None,
        "reportedCoverage": mean(abs(error)<=Z95*se for error in errors) if errors else None,
    }


def check_summary(values, summary, critical=Z95):
    if not values:
        assert summary is None
        return
    assert summary["trials"] == len(values)
    average = mean(values)
    assert math.isclose(average, summary["estimate"], abs_tol=2e-10)
    if len(values)>1:
        sigma=stdev(values)
        half=critical*sigma/math.sqrt(len(values))
        assert math.isclose(sigma, summary["sd"], abs_tol=2e-10)
        for target,actual in zip([average-half,average+half],summary["interval"],strict=True):
            assert math.isclose(min(1,max(-1,target)) if critical!=Z95 else target,actual,abs_tol=2e-10)
    else:
        assert summary["interval"] is None


def verify(phase):
    stem=f"scientia-{phase}"
    raw=(ROOT/"results"/f"{stem}.json").read_bytes()
    artifact=json.loads(raw)
    manifest=json.loads((ROOT/"results"/f"{stem}.manifest.json").read_bytes())
    assert sha256(raw).hexdigest()==manifest["output"]["sha256"]
    config=artifact["config"]
    rng=stream(config["seed"])
    for registered,cell in zip(config["cells"],artifact["cells"],strict=True):
        assert cell["design"]==registered
        scores = {policy: {key: [] for key in info} for policy,info in cell["policies"].items()}
        differences=[]
        for trial in range(config["trials"]):
            truth,a,b,full=world(registered,rng)
            choices=run_workflows(a,b,full,registered["alpha"])
            if trial==0:
                for key,actual in zip(("truth","first","second","full"),(truth,a,b,full),strict=True):
                    for x,y in zip(actual,cell["replay"]["data"][key],strict=True):
                        assert math.isclose(x,y,abs_tol=1e-10)
                for policy, (indices,_,_,screened) in choices.items():
                    archived=cell["replay"]["claims"][policy]
                    assert indices==archived["indices"]
                    assert screened==archived.get("screened")
            row={}
            for policy,choice in choices.items():
                row[policy]=outcomes(truth,registered["n"],*choice)
                for key,value in row[policy].items():
                    if value is not None:
                        scores[policy][key].append(value)
            if registered["signals"]:
                differences.append(row["unadjusted"]["fdp"]-row["bh"]["fdp"])
            else:
                differences.append(row["unadjusted"]["fwer"]-row["holm"]["fwer"])
        for policy,info in scores.items():
            for key,values in info.items():
                try:
                    check_summary(values,cell["policies"][policy][key])
                except AssertionError as exc:
                    raise AssertionError((stem,registered["id"],policy,key,len(values),cell["policies"][policy][key])) from exc
        check_summary(differences,cell["contrast"],2.241402727604947)
        if cell["reference"]:
            alpha,m=registered["alpha"],registered["hypotheses"]
            expected=1-(1-alpha)**m
            measured=mean(scores["unadjusted"]["fwer"])
            assert math.isclose(cell["reference"]["unadjustedFwer"],expected)
            assert abs(measured-expected)<5*math.sqrt(expected*(1-expected)/config["trials"])
            for method,value in {
                "primary":alpha, "holm":1-(1-alpha/m)**m,
                "holdout":expected*alpha/2, "replicate":1-(1-(alpha/m)**2/2)**m,
            }.items():
                observed=mean(scores[method]["fwer"])
                se=math.sqrt(value*(1-value)/config["trials"])
                assert abs(observed-value)<5*se+1/config["trials"]
        print(stem, registered["id"], "all eight policies and replay verified")


if __name__=="__main__":
    for phase in ("pilot","confirmatory"):
        if (ROOT/"results"/f"scientia-{phase}.json").exists():
            verify(phase)
