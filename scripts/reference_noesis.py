import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def evaluate_basis(family, x):
    if family == "poly":
        return [1.0, x, x * x]
    elif family == "harm":
        return [1.0, math.sin(math.pi * x), math.cos(math.pi * x)]
    elif family == "exp":
        return [1.0, math.exp(-x * x), math.exp(-abs(x))]
    elif family == "rat":
        denom = 1.0 + x * x
        return [1.0, 1.0 / denom, x / denom]
    raise ValueError(f"Unknown family: {family}")


def invert_sym3(a00, a01, a02, a11, a12, a22):
    c00 = a11 * a22 - a12 * a12
    c01 = a02 * a12 - a01 * a22
    c02 = a01 * a12 - a02 * a11
    c11 = a00 * a22 - a02 * a02
    c12 = a01 * a02 - a00 * a12
    c22 = a00 * a11 - a01 * a01
    det = a00 * c00 + a01 * c01 + a02 * c02
    assert det > 0
    inv_det = 1.0 / det
    return det, [
        c00 * inv_det,
        c01 * inv_det,
        c02 * inv_det,
        c11 * inv_det,
        c12 * inv_det,
        c22 * inv_det,
    ]


def fit_model(family, observations, alpha=1.0, beta=25.0):
    n = len(observations)
    a00 = a11 = a22 = alpha
    a01 = a02 = a12 = 0.0
    b0 = b1 = b2 = 0.0

    phis = []
    for obs in observations:
        x, y = obs["x"], obs["y"]
        phi = evaluate_basis(family, x)
        phis.append(phi)
        p0, p1, p2 = phi
        a00 += beta * p0 * p0
        a01 += beta * p0 * p1
        a02 += beta * p0 * p2
        a11 += beta * p1 * p1
        a12 += beta * p1 * p2
        a22 += beta * p2 * p2
        b0 += beta * p0 * y
        b1 += beta * p1 * y
        b2 += beta * p2 * y

    det_sn_inv, s_inv = invert_sym3(a00, a01, a02, a11, a12, a22)
    s00, s01, s02, s11, s12, s22 = s_inv

    m0 = s00 * b0 + s01 * b1 + s02 * b2
    m1 = s01 * b0 + s11 * b1 + s12 * b2
    m2 = s02 * b0 + s12 * b1 + s22 * b2

    sum_sq_err = 0.0
    for i, obs in enumerate(observations):
        p0, p1, p2 = phis[i]
        diff = obs["y"] - (p0 * m0 + p1 * m1 + p2 * m2)
        sum_sq_err += diff * diff

    em_n = beta * sum_sq_err + alpha * (m0 * m0 + m1 * m1 + m2 * m2)

    ln_p = (
        1.5 * math.log(alpha)
        + 0.5 * n * math.log(beta)
        - 0.5 * n * math.log(2.0 * math.pi)
        - 0.5 * math.log(det_sn_inv)
        - 0.5 * em_n
    )
    return ln_p


def verify_arm(arm):
    replay = arm["replay"]
    observations = replay["observations"]
    families = ["poly", "harm", "exp", "rat"]
    log_evidences = [fit_model(fam, observations) for fam in families]
    max_log = max(log_evidences)
    exps = [math.exp(ev - max_log) for ev in log_evidences]
    sum_exp = sum(exps)
    posteriors = {fam: e / sum_exp for fam, e in zip(families, exps)}

    stored_post = replay["finalEnsemble"]["posteriors"]
    for fam in families:
        diff = abs(posteriors[fam] - stored_post[fam])
        assert diff < 1e-5, f"{arm['id']} {fam} posterior diff {diff} exceeds tolerance"
    return len(observations)


def verify_study(phase):
    path = ROOT / "results" / f"noesis-{phase}.json"
    if not path.exists():
        print(f"Skipping noesis-{phase}: file not yet created")
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    total_obs = sum(verify_arm(arm) for arm in data["arms"])
    print(f"noesis-{phase}-001 {len(data['arms'])} arms, {total_obs} observations independently verified")


if __name__ == "__main__":
    for phase in ("confirmatory", "pilot"):
        verify_study(phase)
