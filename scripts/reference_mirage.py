"""Independent finite-cue calculation for the MIRAGE benchmark."""
from itertools import product
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def expected(study, mode):
    train = study["calibrator"]
    expected_scores = {}
    for tier, strengths in enumerate(study["strengths"]):
        ans, hint = strengths["answer"], strengths["hint"]
        effective_hint = hint if mode == "normal" else 1-hint
        for a,b,style in product((0,1), repeat=3):
            weight = (ans if a else 1-ans)*(effective_hint if b else 1-effective_hint)/6
            likelihood = lambda r: (ans if a == b else 1-ans)*r
            complement = lambda r: (1-(ans if a == b else 1-ans))*(1-r)
            def confidence(r):
                agreement_posterior = likelihood(r)/(likelihood(r)+complement(r))
                return agreement_posterior if a==b else 1-agreement_posterior
            forecasts = {"constant":train["constant"], "style":.95 if style else .65,
                         "nominal":confidence(hint), "oracle":confidence(effective_hint),
                         "calibrated":train["cells"][tier][int(a==b)]["estimate"]}
            for label,p in forecasts.items():
                scores = expected_scores.setdefault(label,[0,0,0])
                scores[0] += weight*a
                scores[1] += weight*(p-a)**2
                scores[2] -= weight*math.log(p if a else 1-p)
    return expected_scores


for source in sorted((ROOT / "results").glob("mirage-*.json")):
    if source.name.endswith((".manifest.json",".failure.json")):
        continue
    study=json.loads(source.read_text(encoding="utf-8"))
    for region in study["regions"]:
        n=study["config"]["trials"]
        metrics=region["metrics"]
        exact=expected(study,region["mode"])
        tolerance=math.sqrt(math.log(60/.001)/(2*n))
        for label,(accuracy,brier,nll) in exact.items():
            assert abs(accuracy-metrics[label]["accuracy"]) < tolerance
            assert abs(brier-metrics[label]["brier"]) < tolerance
            assert abs(nll-metrics[label]["nll"]) < 4*tolerance
            assert metrics[label]["trials"] == n
        assert len({m["accuracy"] for m in metrics.values()}) == 1
        assert abs(exact["style"][1]-exact["calibrated"][1]-
                   region["styleMinusCalibratedBrier"]["estimate"]) < 2*tolerance
        if region["mode"]=="normal":
            assert metrics["nominal"] == metrics["oracle"]
        print(f"{study['config']['id']} {region['mode']} exact Brier and log-loss check passed")
    normal,shifted=study["regions"]
    assert normal["metrics"]["oracle"]["accuracy"] == shifted["metrics"]["oracle"]["accuracy"]
    assert all(a["selected"]==b["selected"] and a["truth"]==b["truth"]
               for a,b in zip(normal["examples"],shifted["examples"],strict=True))
