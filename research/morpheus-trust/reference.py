"""Independent generation and scoring for the MORPHEUS delayed source-trust study."""
from collections import Counter
from hashlib import sha256
import json
from math import isclose, log, sqrt
from pathlib import Path
from statistics import mean, stdev

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT.parent / "evidence/morpheus-dynamic-trust-001"
MASK = (1 << 32) - 1


def stream(seed):
    state = seed
    while True:
        state = (state + 1831565813) & MASK
        word = ((state ^ (state >> 15)) * (state | 1)) & MASK
        word ^= (word + ((word ^ (word >> 7)) * (word | 61))) & MASK
        yield (word ^ (word >> 14)) / 2**32


def build(cfg, random, regime, delay):
    initial = int(next(random) < 0.5)
    reports, verified, truth = [], [], []
    burst = cfg["burst"]
    for event in range(cfg["steps"]):
        current = initial ^ (sum(p <= event for p in cfg["changes"]) % 2)
        truth.append(current)
        for source, regular in enumerate(cfg["sourceReliability"]):
            present, correct, lag, audited = [next(random) for _ in range(4)]
            if present >= cfg["reportAvailability"][source]:
                continue
            received = event + sum(lag >= p for p in cfg["delayThresholds"])
            if received >= cfg["steps"]:
                continue
            fault = (regime == "burst" and source == burst["source"]
                     and burst["from"] <= event < burst["to"])
            ok = correct < (burst["reliability"] if fault else regular)
            reports.append((received, event, source, current if ok else 1-current))
            if audited < cfg["auditChance"] and received + delay < cfg["steps"]:
                verified.append((received+delay, event, source, int(ok)))
    return truth, reports, verified


def decisions(cfg, reports, verified):
    predictions = {policy: [] for policy in cfg["policies"]}
    for step in range(cfg["steps"]):
        memory = []
        for i in range(cfg["memoryBudget"]):
            records = [(event, i, value) for arrival, event, source, value in reports
                       if source == i and arrival <= step and step-event <= cfg["maxReportAge"]]
            if records:
                memory.append(max(records))
        recent = sorted(memory, key=lambda row: (-row[0], row[1]))
        predictions["recency"].append(recent[0][2] if recent else None)
        eligible = sorted(row for row in verified if row[0] <= step)
        for policy in cfg["policies"][1:]:
            score = 0
            for event, source, value in memory:
                prior = cfg["sourceReliability"][source]
                feedback = [int(ok) for _, _, s, ok in eligible if s == source]
                if policy == "rollingAge":
                    feedback = feedback[-cfg["feedbackWindow"]:]
                if policy in ("cumulativeAge", "rollingAge"):
                    strength = cfg["priorStrength"]
                    p = (strength*prior + sum(feedback)) / (strength + len(feedback))
                else:
                    p = prior
                p = min(cfg["maximumReliability"], max(0.5, p))
                attenuate = 1 if policy == "static" else cfg["ageFactor"]**(step-event)
                score += log(p/(1-p)) * (2*value-1) * attenuate
            predictions[policy].append(None if abs(score) < 1e-12 else int(score > 0))
    return predictions


def response_windows(c):
    subsets = {"full": set(range(c["steps"])), "duringBurst": set(range(c["burst"]["from"], c["burst"]["to"])),
               "adaptation": {p+j for p in c["changes"] for j in range(c["adaptationWindow"])},
               "recovery": set(range(c["burst"]["to"], c["burst"]["to"]+c["recoveryWindow"]))}
    subsets["stable"] = subsets["full"] - subsets["adaptation"]
    return subsets


def verify():
    cfg_raw = (ROOT / "protocol.json").read_bytes()
    cfg = json.loads(cfg_raw)
    raw = (ARCHIVE / "results.json").read_bytes()
    manifest = json.loads((ARCHIVE / "manifest.json").read_bytes())
    assert sha256(cfg_raw).hexdigest() == manifest["configSha256"]
    assert sha256((ROOT.parent.parent / "engine/morpheus-trust.mjs").read_bytes()).hexdigest() == manifest["engineSha256"]
    assert manifest["outputs"]["results.json"] == {"bytes":len(raw), "sha256":sha256(raw).hexdigest()}
    archived = json.loads(raw)
    windows = response_windows(cfg)
    runs = 0
    for lag in cfg["auditDelays"]:
        for regime in cfg["regimes"]:
            random = stream(cfg["seed"])
            arm = archived["arms"][f"{regime}:{lag}"]
            totals = Counter()
            contrast = {name: [] for name in windows}
            for trial, expected in enumerate(arm["histories"]):
                truth, reports, verifies = build(cfg, random, regime, lag)
                actual = decisions(cfg, reports, verifies)
                if trial == 0:
                    assert arm["first"] == {"truth":truth, "decisions":actual,
                                            "reportCount":len(reports), "auditCount":len(verifies)}
                for name, times in windows.items():
                    for p, answers in actual.items():
                        correct = sum(answers[t] == truth[t] for t in times)
                        valid = sum(answers[t] is not None for t in times)
                        assert expected[p][name] == {"correct":correct, "decided":valid}
                        totals[p,name,"correct"] += correct
                        totals[p,name,"decided"] += valid
                    delta = (expected["rollingAge"][name]["correct"] - expected["staticAge"][name]["correct"])
                    contrast[name].append(delta / len(times))
                runs += 1
            for name, times in windows.items():
                assert len(arm["histories"]) == cfg["histories"]
                for p in cfg["policies"]:
                    reported = arm["summary"][p][name]
                    assert reported["correct"] == totals[p,name,"correct"]
                    assert reported["decided"] == totals[p,name,"decided"]
                    assert reported["questions"] == len(times)*cfg["histories"]
                rows = contrast[name]
                estimate = mean(rows)
                se = stdev(rows)/sqrt(len(rows))
                expected = [estimate, estimate-1.959963984540054*se, estimate+1.959963984540054*se]
                recorded = arm["paired"][name]
                assert all(isclose(a,b,rel_tol=0,abs_tol=1e-12) for a,b in zip(
                    expected,[recorded["estimate"],*recorded["interval"]],strict=True))
    print(f"Independently rebuilt {runs} history–arm evaluations, all decision counts and paired intervals.")


if __name__ == "__main__":
    verify()
