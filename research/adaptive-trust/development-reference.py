"""Rebuild every development history and decision using a separate implementation."""
from hashlib import sha256
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
config_path = HERE / "development.json"
config = json.loads(config_path.read_bytes())
archive = HERE.parent / "evidence" / config["id"]


def digest(path):
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": sha256(data).hexdigest()}


def random_words(state):
    modulus = 1 << 32
    while True:
        state = (state + 0x6D2B79F5) % modulus
        word = ((state ^ (state >> 15)) * (state | 1)) % modulus
        mixed = ((word ^ (word >> 7)) * (word | 61)) % modulus
        word = word ^ ((word + mixed) % modulus)
        yield (word ^ (word >> 14)) / modulus


def regenerate(fields, rng):
    states, reports, audits = [], [], []
    start, restore = config["failureStart"], config["restoredAt"]
    base, fault = config["baseRate"], config["faultRate"]
    for t in range(config["steps"]):
        u, a, b, audit, flip, lag = [next(rng) for _ in range(6)]
        rate = base
        if start <= t < restore:
            if fields["regime"] == "burst":
                rate = fault
            elif fields["regime"] == "drift":
                rate = base + (fault-base)*(t-start+1)/(restore-start)
        state = int(u < .5)
        wrong = int(a >= rate)
        states.append(state)
        reports.append([state ^ wrong, state ^ int(b >= config["controlRate"])])
        if audit < config["auditProbability"]:
            arrival = t + config["auditDelay"]
            if lag < fields["lateProbability"]:
                arrival += config["extraAuditDelay"]
            audits.append({"event":t,"arrival":arrival,"outcome":1 ^ wrong ^ int(flip >= fields["auditAccuracy"])})
    return states, reports, audits


def current_rate(model, time, arrived):
    visible = {a["event"]:a["outcome"] for a in arrived}
    fail, restore, prior = (model[k] for k in ("fail","restore","prior"))
    def endpoint(healthy):
        likelihood = [float(healthy), float(not healthy)]
        for event in range(time, -1, -1):
            if event in visible:
                observation = visible[event]
                for i, rate in enumerate((model["healthyRate"],model["faultyRate"])):
                    eta = model["auditAccuracy"]
                    agreement = rate if observation else 1-rate
                    likelihood[i] *= eta*agreement+(1-eta)*(1-agreement)
            if event:
                good,bad = likelihood
                likelihood = [(1-fail)*good+fail*bad, restore*good+(1-restore)*bad]
        return prior*likelihood[0]+(1-prior)*likelihood[1]
    h,f = endpoint(True),endpoint(False)
    return (h*model["healthyRate"]+f*model["faultyRate"])/(h+f)


def trust_estimates(time, audits):
    visible = sorted((a for a in audits if a["arrival"]<=time),key=lambda a:(a["arrival"],a["event"]))
    outcomes = [a["outcome"] for a in visible]
    base, strength = config["baseRate"], config["priorStrength"]
    rolling = outcomes[-config["rollingLength"]:]
    policies = {"static":base,"cumulative":(base*strength+sum(outcomes))/(strength+len(outcomes)),
                "rolling":(base*strength+sum(rolling))/(strength+len(rolling))}
    for a in config["ewma"]:
        n = len(outcomes)
        policies[f"ewma_{a}"] = (1-a)**n*base + a*sum((1-a)**i*z for i,z in enumerate(reversed(outcomes)))
    policies["markov"] = current_rate(config["regime"],time,visible)
    return policies


def main():
    manifest = json.loads((archive/"manifest.json").read_bytes())
    assert digest(config_path) == manifest["protocol"]
    assert digest(archive/"histories.json") == manifest["outputs"]["histories.json"]
    artifact = json.loads((archive/"histories.json").read_bytes())
    assert artifact["evidence"] == config["evidence"] == "B"
    assert artifact["stage"] == config["stage"] == "development"
    windows = {"all":range(config["steps"]),"before":range(config["failureStart"]),
               "affected":range(config["failureStart"],config["restoredAt"]),
               "recovery":range(config["restoredAt"],config["recoveryEnd"])}
    histories_checked = 0
    decisions_checked = 0
    expected_environments = {e["id"]:e for e in config["environments"]}
    assert artifact["environment"].keys() == expected_environments.keys()
    for name, field in expected_environments.items():
        data = artifact["environment"][name]
        histories = data["histories"]
        assert len(histories) == config["historiesPerEnvironment"]
        rng = random_words(config["seed"])
        for history in histories:
            truth,reports,audits = regenerate(field,rng)
            assert (truth,reports,audits) == (history["truth"],history["reports"],history["audits"])
            for time,pair in enumerate(reports):
                scores = trust_estimates(time,audits)
                assert scores.keys() == history["route"].keys()
                for policy, score in scores.items():
                    routing = int(pair[0]!=pair[1] and score<=config["controlRate"]+1e-12)
                    assert routing == history["route"][policy][time], (name,time,policy)
                    decisions_checked += 1
            for policy, route in history["route"].items():
                for window, times in windows.items():
                    expected = {"incorrect":sum(reports[t][route[t]]!=truth[t] for t in times),
                                "control":sum(route[t] for t in times),
                                "disagreements":sum(reports[t][0]!=reports[t][1] for t in times),
                                "steps":len(times)}
                    assert history["loss"][policy][window] == expected
            histories_checked += 1
        for policy, results in data["totals"].items():
            for window, result in results.items():
                expected = {key:sum(h["loss"][policy][window][key] for h in histories)
                            for key in ("incorrect","control","disagreements","steps")}
                pairs = [h["loss"][policy][window]["incorrect"]-h["loss"]["static"][window]["incorrect"]
                         for h in histories]
                assert result == {**expected,"pairedIncorrectDelta":sum(pairs),
                                  "pairedHistoryRange":[min(pairs),max(pairs)]}
    print(f"Independently reconstructed {histories_checked} histories and {decisions_checked} policy decisions.")


if __name__ == "__main__":
    main()
