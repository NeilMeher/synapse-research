"""Independent ECHO replay with a separate voting and statistics implementation."""
from collections import Counter, defaultdict
from fractions import Fraction
from hashlib import sha256
from itertools import combinations, product
import json
from math import isclose, sqrt
from pathlib import Path
import re
from statistics import correlation, StatisticsError
import sys

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT.parent / "archives" / "echo-public-empirical-001"
POLICY = ("majority", "plurality", "unanimity", "tieAbstain")


def load(directory, name):
    return json.loads((directory / name).read_bytes())


def require(condition, explanation):
    if not condition:
        raise ValueError(explanation)


def close(expected, observed, context, tolerance=1e-12):
    if expected is None or observed is None:
        require(expected is observed, context)
    else:
        require(isclose(expected, observed, rel_tol=0, abs_tol=tolerance),
                f"{context}: {expected} != {observed}")


def draw(seed):
    while True:
        seed ^= (seed << 13) & 0xffffffff
        seed ^= seed >> 17
        seed ^= (seed << 5) & 0xffffffff
        yield seed


def index(stream, n):
    max_word = (2**32 // n) * n
    for value in stream:
        if value < max_word:
            return value % n


def decide(row, team, policy, seed):
    counts = Counter(row["predictions"][i] for i in team if row["predictions"][i] >= 0)
    if not counts:
        return None
    highest = max(counts.values())
    leaders = sorted(key for key, count in counts.items() if count == highest)
    if policy == "majority":
        return leaders[0] if highest > len(team) // 2 else None
    if policy == "unanimity":
        return leaders[0] if highest == len(team) else None
    if policy == "tieAbstain":
        return leaders[0] if len(leaders) == 1 else None
    mix = (2654435761 * (row["id"] ^ seed)) & 0xffffffff
    return leaders[mix % len(leaders)]


def binary(rows, member):
    return [int(row["predictions"][member] == row["gold"]) for row in rows]


def score(rows, answers, recorded):
    hits = [int(a == row["gold"]) for row, a in zip(rows, answers, strict=True)]
    correct = sum(hits)
    valid = sum(a is not None and a >= 0 for a in answers)
    n = len(rows)
    for field, count in (("n", n), ("correct", correct), ("valid", valid),
                         ("abstentions", n - valid)):
        require(recorded[field] == count, f"Count {field}")
    close(correct / n, recorded["accuracy"], "accuracy")
    close(valid / n, recorded["coverage"], "coverage")
    close(correct / valid if valid else None, recorded["validAccuracy"], "valid accuracy")
    return hits


def paired(a, b):
    return [x - y for x, y in zip(a, b, strict=True)]


def pair(rows, i, j):
    table = Counter((row["predictions"][i] != row["gold"],
                     row["predictions"][j] != row["gold"]) for row in rows)
    aa, ab, ba, bb = (table[key] for key in ((False, False), (False, True),
                                           (True, False), (True, True)))
    denominator = sqrt((aa + ab) * (aa + ba) * (bb + ab) * (bb + ba))
    excess = Fraction(aa * bb - ab * ba, len(rows)**2)
    phi = (aa * bb - ab * ba) / denominator if denominator else None
    return phi, excess, bb, ba + bb, ab + bb


def verify_selection(calibration, models, cfg, recorded):
    n = len(calibration)
    members = range(len(models))
    seed = cfg["voting"]["tieSeed"]
    scores = [Fraction(sum(binary(calibration, i)), n) for i in members]
    require(recorded["baseline"] == max(members, key=lambda i: scores[i]), "Baseline")
    for a, b in zip(scores, recorded["individual"], strict=True):
        close(float(a), b, "calibration accuracy")
    random = draw(cfg["selection"]["randomSeed"])
    triples = []
    for size in cfg["selection"]["sizes"]:
        candidates = list(combinations(members, size))
        observed = recorded["selections"][str(size)]
        family = [c for c in candidates if len({models[i]["family"] for i in c}) == size]
        require(observed["evaluated"] == len(candidates) and
                observed["familyEligible"] == len(family), "Candidate counts")
        metrics = {}
        for c in candidates:
            marginal = sum(scores[i] for i in c) / size
            joints = [pair(calibration, *p) for p in combinations(c, 2)]
            excess = sum(p[1] for p in joints) / len(joints)
            correct = sum(decide(row, c, "majority", seed) == row["gold"] for row in calibration)
            metrics[c] = marginal, excess, correct
            if size == cfg["higherOrder"]["committeeSize"]:
                triples.append((c, sorted(float(scores[i]) for i in c), [p[0] for p in joints]))
        exact = {
            "topAccuracy": max(candidates, key=lambda c: metrics[c][0]),
            "seededRandom": candidates[index(random, len(candidates))],
            "distinctFamilies": max(family, key=lambda c: metrics[c][0]),
            "complementarity": max(candidates, key=lambda c: metrics[c][0] - metrics[c][1] / 2),
            "directVote": max(candidates, key=lambda c: metrics[c][2]),
        }
        for name, expected in exact.items():
            require(tuple(observed[name]) == expected, "Frozen selection " + name)
        for row in observed["calibration"]:
            accuracy, excess, correct = metrics[tuple(row["members"])]
            require(row["calibrationCorrect"] == correct, "Calibration vote count")
            close(float(accuracy), row["meanAccuracy"], "Calibration marginal")
            close(float(excess), row["excess"], "Calibration excess")
    qualified = []
    high = cfg["higherOrder"]
    for a, b in combinations(triples, 2):
        if None in a[2] or None in b[2]:
            continue
        acc = [abs(x - y) for x, y in zip(a[1], b[1], strict=True)]
        phi = [abs(x - y) for x, y in zip(sorted(a[2]), sorted(b[2]), strict=True)]
        if max(acc) <= high["marginalTolerance"] and max(phi) <= high["phiTolerance"]:
            qualified.append((sum(acc + phi), a[0], b[0]))
    expected = min(qualified) if qualified else None
    actual = recorded["higherOrder"]
    require(actual["eligiblePairs"] == len(qualified), "Higher-order eligible pairs")
    if expected:
        require(tuple(actual["matched"]["left"]) == expected[1] and
                tuple(actual["matched"]["right"]) == expected[2], "Higher-order calibration pair")
        close(expected[0], actual["matched"]["distance"], "Higher-order calibration distance")
    else:
        require(actual["matched"] is None, "No higher-order match")


def confidence_intervals(heldout, vectors, bootstrap):
    groups = defaultdict(dict)
    for pos, row in enumerate(heldout):
        subject = groups[row["subject"]]
        subject.setdefault(row["group"], []).append(pos)
    strata = [list(groups[key].values()) for key in sorted(groups)]
    sizes = [[len(group) for group in stratum] for stratum in strata]
    sums = [[[sum(v[i] for i in group) for group in stratum] for stratum in strata]
            for v in vectors]
    results = [[] for _ in vectors]
    rng = draw(bootstrap["seed"])
    for _ in range(bootstrap["replicates"]):
        sample = [Counter(index(rng, len(stratum)) for _ in stratum) for stratum in strata]
        n = sum(sizes[s][i] * count for s, group in enumerate(sample) for i, count in group.items())
        for z, series in enumerate(sums):
            results[z].append(sum(series[s][i] * count for s, group in enumerate(sample)
                                  for i, count in group.items()) / n)
    for vector, sample in zip(vectors, results, strict=True):
        sample.sort()
        yield sum(vector) / len(vector), [sample[int((len(sample) - 1) * q)]
                                          for q in bootstrap["interval"]]


def exact_independence(probabilities):
    count = [Fraction(0) for _ in range(1 + len(probabilities))]
    for mask in product((False, True), repeat=len(probabilities)):
        mass = Fraction(1)
        for p, bit in zip(probabilities, mask, strict=True):
            mass *= p if bit else 1 - p
        count[sum(mask)] += mass
    return count


def exact_categorical(rows, width, team, pseudocount):
    # Sum over count-vector states, treating category 0 as the gold label.
    # Uniform splitting of tied plurality mass checks the seeded Monte Carlo reference.
    state = {(0,) * width: 1.0}
    for member in team:
        frequency = Counter()
        for row in rows:
            vote, gold = row["predictions"][member], row["gold"]
            rank = -1 if vote < 0 else (0 if vote == gold else vote + int(vote < gold))
            if rank < width:
                frequency[rank] += 1
        options = [-1, *range(width)]
        probabilities = [(k, frequency[k] + pseudocount) for k in options
                         if frequency[k] + pseudocount]
        total = sum(c for _, c in probabilities)
        expanded = defaultdict(float)
        for pattern, mass in state.items():
            for option, count in probabilities:
                vote_counts = pattern if option < 0 else (
                    pattern[:option] + (pattern[option] + 1,) + pattern[option + 1:])
                expanded[vote_counts] += mass * (count / total)
        state = expanded
    result = dict.fromkeys(POLICY, 0.0)
    for pattern, mass in state.items():
        gold = pattern[0]
        if gold > len(team) // 2:
            result["majority"] += mass
        if gold == len(team):
            result["unanimity"] += mass
        if gold and gold == max(pattern):
            leaders = pattern.count(gold)
            result["plurality"] += mass / leaders
            if leaders == 1:
                result["tieAbstain"] += mass
    return result


def verify_references(calibration, heldout, team, result):
    observed = result["independence"]
    p = [Fraction(sum(binary(calibration, i)), len(calibration)) for i in team]
    independent = exact_independence(p)
    homogeneous = exact_independence([sum(p) / len(p)] * len(p))
    threshold = len(team) // 2 + 1
    for a, b in zip(independent, observed["correctCountDistribution"], strict=True):
        close(float(a), b, "Poisson-binomial mass")
    close(float(sum(independent[threshold:])), observed["heterogeneous"], "Poisson-binomial majority")
    close(float(sum(homogeneous[threshold:])), observed["homogeneous"], "Binomial majority")

    target = Counter((r["subject"], r["options"]) for r in heldout)
    categorical = Counter()
    repair = Counter()
    supported = 0
    for (subject, options), count in target.items():
        control = [r for r in calibration if r["subject"] == subject]
        stratum = [r for r in control if r["options"] == options]
        fit = stratum if len(stratum) >= 20 else control
        for key, probability in exact_categorical(fit, options, team, 1).items():
            categorical[key] += probability * count
        if stratum:
            supported += count
            for key, probability in exact_categorical(stratum, options, team, 0).items():
                repair[key] += probability * count
    require(supported == result["repairCoverage"], "Repair stratum coverage")
    for key in POLICY:
        close(categorical[key] / len(heldout), result["categorical"][key], key + " categorical expectation", 0.012)
        close(repair[key] / supported, result["rePair"][key], key + " re-pair expectation", 0.012)


def verify_split(data, cfg, eligible):
    flat = {r["id"]: r for part in data.values() for r in part}
    require(len(flat) == sum(map(len, data.values())), "Duplicate question across splits")
    require(set(flat) == {r["id"] for r in eligible}, "Cohort identity")
    matches = {}
    for row in eligible:
        require(all(flat[row["id"]][field] == value for field, value in row.items()),
                "Canonical fingerprint linkage")
    for subject in cfg["scope"]["subjects"]:
        groups = {r["group"] for r in eligible if r["subject"] == subject}
        seed = cfg["partition"]["seed"]
        order = sorted(groups, key=lambda g: sha256(f"{seed}|{subject}|{g}".encode()).hexdigest())
        bounds = [int(len(groups) * cfg["partition"][key]) for key in ("development", "calibration")]
        for i, group in enumerate(order):
            matches[group] = cfg["partitions"][int(i >= bounds[0]) + int(i >= sum(bounds))]
    require(all(matches[row["group"]] == part for part in data for row in data[part]), "Grouped split")


def source_residuals(calibration, heldout, members):
    blocks = defaultdict(list)
    for row in calibration:
        blocks[(row["subject"], None)].append(row)
        blocks[(row["subject"], row["source"])].append(row)
    rates = {key: [1 - sum(binary(rows, member)) / len(rows) for member in members]
             for key, rows in blocks.items() if key[1] is None or len(rows) >= 15}
    return [[float(row["predictions"][i] != row["gold"]) -
             rates.get((row["subject"], row["source"]), rates[(row["subject"], None)])[i]
             for row in heldout] for i in members]


def verify_raw(path, data, sources):
    import duckdb
    canonical = {}
    benchmark_file = next(spec["file"] for spec in sources["files"] if spec["kind"] == "benchmark")
    with duckdb.connect() as con:
        result = con.execute("SELECT * FROM read_parquet(?)", [str(path / benchmark_file)])
        fields = [col[0] for col in result.description]
        for row in result.fetchall():
            item = dict(zip(fields, row, strict=True))
            canonical[item["question_id"]] = item
    rows = {row["id"]: row for part in data.values() for row in part}
    index_by_model = {model["id"]: i for i, model in enumerate(sources["models"])}
    for key, row in rows.items():
        item = canonical[key]
        option_text = [value for i in range(10) if (value := item["option_" + str(i)]) is not None]
        fingerprint = sha256(json.dumps([item["question"], option_text, item["answer_index"]],
                                       ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        require((item["answer_index"], len(option_text), fingerprint, item["category"]) ==
                (row["gold"], row["options"], row["contentHash"], row["subject"]), "Official content linkage")
    verified = 0
    for spec in sources["files"]:
        file = path / spec["file"]
        require(file.stat().st_size == spec["size"] and
                sha256(file.read_bytes()).hexdigest() == spec["sha256"], "Source digest")
        if spec["kind"] != "prediction":
            continue
        column = index_by_model[spec["model"]]
        with file.open(encoding="utf-8") as stream:
            for line in stream:
                raw = json.loads(line)
                key = raw["doc"]["question_id"]
                if key not in rows:
                    continue
                row = rows[key]
                require(canonical[key] == raw["doc"], "Raw document identity")
                require(raw["doc_id"] == row["sourceRows"][column], "Original record ID")
                for match in re.finditer("answer is [(]?([A-J])[)]?", raw["resps"][0][0]):
                    label = match[1]
                    break
                else:
                    label = "[invalid]"
                require(label == raw["filtered_resps"][0] and
                        (label == canonical[key]["answer"]) == raw["exact_match"], "Publisher scoring")
                choice = ord(label) - ord("A") if len(label) == 1 else -1
                if choice >= row["options"]:
                    choice = -2
                require(choice == row["predictions"][column], "Archived canonical prediction")
                verified += 1
    require(verified == len(rows) * len(index_by_model), "Raw prediction count")
    print(f"Independently matched and rescored all {verified} genuine raw publisher predictions.")


def main():
    manifest = load(ARCHIVE, "manifest.json")
    for directory, files in ((ROOT, manifest["inputs"]), (ARCHIVE, manifest["outputs"])):
        for name, record in files.items():
            payload = (directory / name).read_bytes()
            require(len(payload) == record["bytes"] and sha256(payload).hexdigest() == record["sha256"],
                    "Archive/input digest " + name)
    data = load(ARCHIVE, "predictions.json")
    results = load(ARCHIVE, "results.json")
    sources = load(ROOT, "sources.json")
    cfg = load(ROOT, "protocol.json")
    selection = load(ROOT, "selection.json")
    models = sources["models"]
    team = tuple(range(len(models)))
    seed = cfg["voting"]["tieSeed"]
    calibration = data["calibration"]
    heldout = data["heldout"]
    verify_split(data, cfg, load(ROOT, "eligible.json"))
    verify_selection(calibration, models, cfg, selection)
    for i, member in enumerate(results["models"]):
        score(heldout, [r["predictions"][i] for r in heldout], member)
    for policy in POLICY:
        score(heldout, [decide(row, team, policy, seed) for row in heldout], results["policies"][policy])
    baseline = selection["baseline"]
    control = score(heldout, [r["predictions"][baseline] for r in heldout], results["baseline"])
    panel_vote = [int(decide(r, team, "majority", seed) == r["gold"]) for r in heldout]
    vectors = [paired(panel_vote, control)]
    targets = [results["primary"]]
    for record in results["optimization"]:
        members = record["members"]
        same_size = selection["selections"][str(record["size"])]["topAccuracy"]
        answers = [decide(r, members, "majority", seed) for r in heldout]
        hits = score(heldout, answers, record["heldout"])
        top = [int(decide(r, same_size, "majority", seed) == r["gold"]) for r in heldout]
        vectors.append(paired(hits, top))
        targets.append(record["vsTopAccuracy"])
    for (estimate, bounds), target in zip(confidence_intervals(heldout, vectors, cfg["bootstrap"]),
                                           targets, strict=True):
        close(estimate, target["estimate"], "Paired difference")
        for a, b in zip(bounds, target["interval"], strict=True):
            close(a, b, "Paired bootstrap quantile")
    failures = Counter(sum(r["predictions"][i] != r["gold"] for i in team) for r in heldout)
    require([failures[i] for i in range(len(team) + 1)] == results["incorrectMemberCounts"],
            "Higher-order failure histogram")
    residuals = source_residuals(calibration, heldout, team)
    for recorded in results["pairs"]:
        a, b = recorded["members"]
        phi, excess, joint, left, right = pair(heldout, a, b)
        close(phi, recorded["phi"], "Error dependence")
        close(float(excess), recorded["excess"], "Joint excess")
        try:
            adjusted = correlation(residuals[a], residuals[b])
        except StatisticsError:
            adjusted = None
        close(adjusted, recorded["residualPhi"], "Source-adjusted dependence")
        require((joint, left, right) == (recorded["jointErrors"], recorded["leftErrors"],
                                        recorded["rightErrors"]), "Joint error counts")
        votes = [(r["predictions"][a], r["predictions"][b], r["gold"]) for r in heldout
                 if min(r["predictions"][a], r["predictions"][b]) >= 0]
        wrong = [(x, y) for x, y, gold in votes if gold not in (x, y)]
        require((len(votes), sum(x == y for x, y, _ in votes), len(wrong), sum(x == y for x, y in wrong)) ==
                (recorded["bothValid"], recorded["agree"], recorded["bothWrongValid"], recorded["wrongAgree"]),
                "Answer agreement counts")
    if results["higherOrder"]:
        for key, record in zip(("left", "right"), results["higherOrder"], strict=True):
            panel = selection["higherOrder"]["matched"][key]
            require(panel == record["members"], "Higher-order frozen members")
            score(heldout, [decide(r, panel, "majority", seed) for r in heldout], record["majority"])
            counts = Counter(sum(r["predictions"][i] != r["gold"] for i in panel) for r in heldout)
            require([counts[i] for i in range(len(panel) + 1)] == record["errorCounts"],
                    "Matched-committee joint failure")
    verify_references(calibration, heldout, team, results["references"])
    print("Independent split, scoring, voting, selection, higher-order counts, bootstrap and reference checks passed.")
    if len(sys.argv) == 3 and sys.argv[1] == "--sources":
        verify_raw(Path(sys.argv[2]), data, sources)


if __name__ == "__main__":
    main()
