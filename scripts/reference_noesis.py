"""Reproduce both archived NOESIS v1 studies in observation space."""
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import mean, stdev

ROOT = Path(__file__).resolve().parents[1]
FAMILIES = ("poly", "harm", "exp", "rat")
ARMS = ("random", "uniform_grid", "active_uncertainty", "active_ig")
GRID = [j / 5 for j in range(-10, 11)]
EVALUATION = [j / 10 for j in range(-20, 21)]
METRICS = ("family_recovery", "posterior_at_truth", "log_loss", "test_rmse")
MASK = 2**32 - 1


def stream(state):
    """Independent translation of the archived 32-bit Mulberry generator."""
    while True:
        state = (state + int("6d2b79f5", 16)) & MASK
        mixed = ((state ^ (state >> 15)) * (state | 1)) & MASK
        hashed = ((mixed ^ (mixed >> 7)) * (mixed | 61)) & MASK
        mixed ^= (mixed + hashed) & MASK
        yield (mixed ^ (mixed >> 14)) / (MASK + 1)


def normal(draws):
    first = next(draws)
    while first <= 1e-15:
        first = next(draws)
    return math.sqrt(-2 * math.log(first)) * math.cos(math.tau * next(draws))


def basis(family, x):
    if family == "poly":
        return 1, x, x*x
    if family == "harm":
        return 1, math.sin(math.pi*x), math.cos(math.pi*x)
    if family == "exp":
        return 1, math.exp(-x*x), math.exp(-abs(x))
    return 1, 1/(1+x*x), x/(1+x*x)


def dot(left, right):
    return sum(a*b for a, b in zip(left, right, strict=True))


def forward(lower, right):
    values = []
    for row, value in zip(lower, right, strict=True):
        i = len(values)
        values.append((value - dot(row[:i], values)) / row[i])
    return values


def fit(family, observations, variance):
    vectors = [basis(family, x) for x, _ in observations]
    lower = []
    for i, vector in enumerate(vectors):
        row = []
        for j in range(i):
            cross = dot(vector, vectors[j]) - dot(row, lower[j][:j])
            row.append(cross / lower[j][j])
        row.append(math.sqrt(variance + dot(vector, vector) - dot(row, row)))
        lower.append(row)
    whitened = forward(lower, [y for _, y in observations])
    likelihood = -sum(math.log(row[i]) for i, row in enumerate(lower)) - dot(whitened, whitened)/2

    def project(x):
        features = basis(family, x)
        return forward(lower, [dot(features, row) for row in vectors])

    def prediction(x):
        whitened_x = project(x)
        return dot(whitened_x, whitened), variance + dot(basis(family, x), basis(family, x)) - dot(whitened_x, whitened_x)

    return likelihood, prediction


def ensemble(observations, variance):
    models = [fit(family, observations, variance) for family in FAMILIES]
    largest = max(score for score, _ in models)
    weights = [math.exp(score-largest) for score, _ in models]
    probabilities = [weight/sum(weights) for weight in weights]
    best = max(range(len(weights)), key=probabilities.__getitem__)
    return probabilities, best, [predict for _, predict in models]


def choose(policy, budget, step, draws, state):
    probabilities, leader, predictions = state
    if policy == "random":
        return GRID[int(len(GRID)*next(draws))]
    if policy == "uniform_grid":
        return GRID[math.floor(step*(len(GRID)-1)/(budget-1)+0.5)]
    top_score = -math.inf
    choice = GRID[0]
    for x in GRID:
        if policy == "active_uncertainty":
            score = predictions[leader](x)[1]
        else:
            expected = [predict(x)[0] for predict in predictions]
            center = dot(probabilities, expected)
            score = dot(probabilities, [(value-center)**2 for value in expected])
        if score > top_score + 1e-12:
            top_score, choice = score, x
    return choice


def simulate(config, truth, coefficients, trial, arm_index, replay):
    policy = ARMS[arm_index]
    seed = (config["seed"] + trial*7919 + arm_index*997) & MASK or 1
    draws = stream(seed)
    variance = config["noiseSigma"]**2
    hidden = lambda x: dot(basis(FAMILIES[truth], x), coefficients)
    observations = [(0, hidden(0))]
    state = ensemble(observations, variance)
    for step in range(config["budget"]):
        if step:
            x = choose(policy, config["budget"], step, draws, state)
            observations.append((x, hidden(x) + config["noiseSigma"]*normal(draws)))
            state = ensemble(observations, variance)
        if replay is not None:
            x, y = observations[-1]
            archived = replay["observations"][step]
            close(x, archived["x"], "query")
            close(y, archived["y"], "measurement")
            close(hidden(x), archived["yExact"], "hidden function")
            probabilities, best, _ = state
            assert replay["trace"][step]["bestFamily"] == FAMILIES[best]
            for family, probability in zip(FAMILIES, probabilities, strict=True):
                close(probability, replay["trace"][step]["posteriors"][family], "posterior")

    probabilities, leader, fitted = state
    rmse = math.sqrt(mean((hidden(x)-fitted[leader](x)[0])**2 for x in EVALUATION))
    return int(leader == truth), probabilities[truth], -math.log(max(probabilities[truth], 1e-12)), rmse


def close(actual, expected, label):
    assert math.isclose(actual, expected, rel_tol=1e-8, abs_tol=1e-9), (label, actual, expected)


def compare_summary(samples, archived, critical, label):
    estimate, deviation = mean(samples), stdev(samples)
    half = critical*deviation/math.sqrt(len(samples))
    assert archived["trials"] == len(samples)
    close(estimate, archived["estimate"], label)
    close(deviation, archived["sd"], label)
    close(estimate-half, archived["interval"][0], label)
    close(estimate+half, archived["interval"][1], label)


def verify(phase):
    stem = f"noesis-{phase}"
    raw = (ROOT / "results" / f"{stem}.json").read_bytes()
    data = json.loads(raw)
    manifest = json.loads((ROOT / "results" / f"{stem}.manifest.json").read_bytes())
    assert manifest["status"] == "completed"
    assert manifest["output"]["sha256"] == sha256(raw).hexdigest()
    assert manifest["output"]["bytes"] == len(raw)
    for path, digest in manifest["inputs"].items():
        assert sha256((ROOT / path).read_bytes()).hexdigest() == digest, path
    config = data["config"]
    assert config == json.loads((ROOT / "experiments" / f"{stem}.json").read_bytes())
    result_arms = data["arms"]
    assert [arm["id"] for arm in result_arms] == list(ARMS)
    draws = stream(config["seed"])
    by_arm = [[] for _ in ARMS]
    for trial in range(config["trials"]):
        truth = int(next(draws)*len(FAMILIES))
        coefficients = [normal(draws)*scale for scale in (1, 1.2, 1.2)]
        for arm_index, arm in enumerate(result_arms):
            replay = arm["replay"] if trial == 0 else None
            if replay is not None:
                assert replay["groundTruth"]["family"] == FAMILIES[truth]
                for actual, expected in zip(coefficients, replay["groundTruth"]["params"], strict=True):
                    close(actual, expected, "generator coefficients")
                assert len(replay["observations"]) == config["budget"]
            by_arm[arm_index].append(simulate(config, truth, coefficients, trial, arm_index, replay))
    for arm, samples in zip(result_arms, by_arm, strict=True):
        for metric, values in zip(METRICS, zip(*samples, strict=True), strict=True):
            compare_summary(values, arm["metrics"][metric], 1.959963984540054, (arm["id"], metric))
    for baseline, contrast in zip(by_arm[:2], data["contrasts"], strict=True):
        differences = [active[0]-passive[0] for active, passive in zip(by_arm[3], baseline, strict=True)]
        compare_summary(differences, contrast, 2.241402727604947, contrast["id"])
    print(f"{config['id']} | {config['trials']} tasks, {len(ARMS)} policies, all aggregate moments and paired intervals reproduced")


if __name__ == "__main__":
    for phase in ("pilot", "confirmatory"):
        verify(phase)
