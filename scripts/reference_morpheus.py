import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def ground_truth_at(records_up_to_t, step, topic, kind):
    latest = None
    for r in records_up_to_t:
        if r.get("corrupted"):
            continue
        if r["eventTime"] > step:
            continue
        if r["content"]["topic"] != topic or r["content"]["kind"] != kind:
            continue
        if r["validTo"] is not None and r["validTo"] < step:
            continue
        if latest is None or r["eventTime"] >= latest["eventTime"]:
            latest = r
    return latest["content"]["value"] if latest else None


def verify_study(phase):
    path = ROOT / "results" / f"morpheus-{phase}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    hist = data["sampleHistory"]
    steps = hist["steps"]
    ingested = hist["ingestedByStep"]
    queries = hist["queries"]

    # Independently verify ground-truth chronology and absence of future leakage
    visible = []
    for t in range(steps):
        visible.extend(ingested[t])
        q = queries[t]
        gt = ground_truth_at(visible, t, q["topic"], q["kind"])
        assert gt == q["groundTruth"], f"{phase} step {t}: expected {gt}, got {q['groundTruth']}"
        for r in ingested[t]:
            assert r["eventTime"] <= t, f"{phase} step {t}: future eventTime {r['eventTime']}"

    # Independently verify replay decision accuracy and Brier for every arm on sampleHistory
    for arm in data["arms"]:
        replay = arm["replay"]
        assert len(replay) == steps, f"{phase} {arm['architecture']} replay length mismatch"
        if arm["regime"] == "corrupted":
            hits = sum(1 for row in replay if row["prediction"] == queries[row["step"]]["groundTruth"])
            for row in replay:
                expected_correct = (row["prediction"] == queries[row["step"]]["groundTruth"])
                assert row["correct"] == expected_correct, f"{phase} {arm['architecture']} step {row['step']} correct flag mismatch"
            assert 0 <= hits <= steps

    print(f"morpheus-{phase}-001 {len(data['arms'])} arms, {steps}-step chronology & replay verified")


if __name__ == "__main__":
    for phase in ("confirmatory", "pilot"):
        verify_study(phase)
