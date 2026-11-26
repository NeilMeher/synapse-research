"""Replay archived maker ledgers without executing the JavaScript market kernel."""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def check(arm):
    archive = arm["replay"]
    policy = archive["policy"]
    state = deepcopy(archive["initial"])
    for account in state.values():
        account.pop("markedWealth")
    start_inventory = state["maker"]["assets"]
    seq = 0
    last = policy["anchor"]

    def check_quote(supplied):
        displacement = start_inventory-state["maker"]["assets"]
        centre = max(policy["anchor"]+policy["impact"]*displacement,
                     1+policy["halfSpread"]+policy["fee"])
        assert supplied["midpoint"] == centre
        assert supplied["bid"] == centre-policy["halfSpread"]
        assert supplied["ask"] == centre+policy["halfSpread"]
        assert supplied["askUnits"] == state["maker"]["assets"]
        return centre

    for frame in archive["frames"]:
        for record in frame["trades"]:
            event = record["event"]
            order = event["order"]
            last = check_quote(event["before"])
            assert len(event["fills"])+event["unfilled"] == order["quantity"]
            for fill in event["fills"]:
                seq += 1
                buyer = state[fill["buyer"]]
                seller = state[fill["seller"]]
                expected = (max(policy["anchor"]+policy["impact"]*(start_inventory-state["maker"]["assets"]),
                                1+policy["halfSpread"]+policy["fee"]))
                sign = 1 if order["side"]=="buy" else -1
                assert fill["quantity"] == 1 and fill["sequence"] == seq
                assert fill["price"] == expected+sign*policy["halfSpread"]
                assert sign*(order["limit"]-fill["price"]) >= 0
                assert fill["payer"] == order["actor"] and fill["fee"]==policy["fee"]
                assert fill["buyer" if sign==1 else "seller"] == order["actor"]
                buyer["cash"] -= fill["price"]
                buyer["assets"] += 1
                seller["cash"] += fill["price"]
                seller["assets"] -= 1
                state[fill["payer"]]["cash"] -= fill["fee"]
                state["fees"]["cash"] += fill["fee"]
                assert all(entry[key] >= 0 for entry in state.values() for key in ("cash", "assets"))
            last = check_quote(event["after"])
        assert frame["midpoint"] == last == check_quote(frame["quote"])
    for label,account in state.items():
        expect = {**account, "markedWealth":account["cash"]+last*account["assets"]}
        assert archive["final"][label] == expect
    for key in ("cash","assets"):
        assert archive["totals"][key] == sum(a[key] for a in state.values())
        assert archive["totals"][key] == sum(a[key] for a in archive["initial"].values())
    return seq


if __name__ == "__main__":
    for path in sorted((ROOT/"results").glob("reflex-*.json")):
        if path.name.endswith((".manifest.json",".failure.json")):
            continue
        data=json.loads(path.read_text(encoding="utf-8"))
        for arm in data["arms"]:
            print(data["config"]["id"], arm["impact"], check(arm), "fills independently replayed and reconciled")
        a,b=data["arms"]
        assert [f["fundamental"] for f in a["replay"]["frames"]] == [f["fundamental"] for f in b["replay"]["frames"]]
