import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def replay_arm(arm):
    replay = arm["replay"]
    initial = replay["initial"]
    policy = replay["policy"]
    book = {k: {"cash": v["cash"], "assets": v["assets"]} for k, v in initial.items()}
    init_cash = sum(v["cash"] for v in book.values())
    init_assets = sum(v["assets"] for v in book.values())
    maker_init = book["maker"]["assets"]
    fills = 0
    for frame in replay["frames"]:
        for tr in frame["trades"]:
            ev = tr["event"]
            for fill in ev["fills"]:
                fills += 1
                p = fill["price"]
                fee = fill["fee"]
                buyer = fill["buyer"]
                seller = fill["seller"]
                if fill["payer"] == buyer:
                    book[buyer]["cash"] -= (p + fee)
                    book[seller]["cash"] += p
                else:
                    book[buyer]["cash"] -= p
                    book[seller]["cash"] += (p - fee)
                book[buyer]["assets"] += 1
                book[seller]["assets"] -= 1
                book["fees"]["cash"] += fee
    assert sum(v["cash"] for v in book.values()) == init_cash
    assert sum(v["assets"] for v in book.values()) == init_assets
    for k, v in book.items():
        assert v["cash"] == replay["final"][k]["cash"], f"{arm['id']} {k} cash mismatch"
        assert v["assets"] == replay["final"][k]["assets"], f"{arm['id']} {k} assets mismatch"
        assert v["cash"] >= 0 and v["assets"] >= 0
    assert book["maker"]["assets"] >= 0 and maker_init >= 0
    return fills


def verify_study(phase):
    path = ROOT / "results" / f"alpha-decay-{phase}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    total_fills = 0
    for arm in data["arms"]:
        total_fills += replay_arm(arm)
    print(f"alpha-decay-{phase}-001 {len(data['arms'])} arms, {total_fills} fills independently replayed and reconciled")


if __name__ == "__main__":
    for phase in ("confirmatory", "pilot"):
        verify_study(phase)
