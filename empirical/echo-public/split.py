"""Freeze a grouped structural split without importing any prediction data."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    cfg = json.loads((ROOT / "protocol.json").read_text(encoding="utf-8"))
    eligible = json.loads((ROOT / "eligible.json").read_text(encoding="utf-8"))
    if len(eligible) < cfg["scope"]["minimumMatchedItems"]:
        raise ValueError("Insufficient matched source items")
    groups = {}
    for row in eligible:
        subject = groups.setdefault(row["group"], row["subject"])
        if subject != row["subject"]:
            raise ValueError("A source group crosses subject strata")
    split = {}
    for subject in cfg["scope"]["subjects"]:
        ids = [g for g, s in groups.items() if s == subject]
        prefix = cfg["partition"]["seed"] + "|" + subject + "|"
        ids.sort(key=lambda group: hashlib.sha256(f"{prefix}{group}".encode()).digest())
        development = int(len(ids) * cfg["partition"]["development"])
        calibration = int(len(ids) * cfg["partition"]["calibration"])
        for i, group in enumerate(ids):
            part = "development" if i < development else (
                "calibration" if i < development + calibration else "heldout")
            split[group] = part
    output = {str(row["id"]): split[row["group"]] for row in eligible}
    (ROOT / "splits.json").write_text(
        json.dumps(output, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    for partition in cfg["partitions"]:
        ids = [row for row in eligible if split[row["group"]] == partition]
        print(partition, len(ids), len({row["group"] for row in ids}))


if __name__ == "__main__":
    main()
