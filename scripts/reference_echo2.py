"""Independent rising-factorial and rational LP checks for archived ECHO 2.0."""
import json
from fractions import Fraction as F
from itertools import combinations
from math import comb, isclose, log, prod, sqrt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def number(x):
    return F(str(x))


def masses(n, q, rho, law):
    if n == 0:
        return [F(1)]
    if rho == 1:
        return [1-q] + [F(0)]*(n-1) + [q]
    if law == "shared" or rho == 0:
        pmf = [(1-rho)*comb(n,k)*q**k*(1-q)**(n-k) for k in range(n+1)]
        pmf[0] += rho*(1-q)
        pmf[n] += rho*q
        return pmf
    alpha = q*(1/rho-1)
    beta = (1-q)*(1/rho-1)
    rising = lambda a, k: prod(a+j for j in range(k))
    denominator = rising(alpha+beta, n)
    return [comb(n,k)*rising(alpha,k)*rising(beta,n-k)/denominator for k in range(n+1)]


def credit(k, n):
    return F(1,2) if 2*k == n else int(2*k > n)


def exact_bounds(n, mean, second):
    """Solve the three equality rows by elimination over exact rationals."""
    extrema = [F(1), F(0)]
    for a,b,c in combinations(range(n+1), 3):
        wz = (second-a*a-(a+b)*(mean-a))/((c-a)*(c-b))
        wy = (mean-a-(c-a)*wz)/(b-a)
        wx = 1-wy-wz
        if min(wx,wy,wz) < 0:
            continue
        value = wx*credit(a,n)+wy*credit(b,n)+wz*credit(c,n)
        extrema = [min(extrema[0],value), max(extrema[1],value)]
    return extrema


def forecast(actual, assumed, extra=(F(1),)):
    accuracy = brier = impossible = extreme_wrong = F(0)
    loss = 0.0
    for k, mass in enumerate(actual):
        for j, extra_mass in enumerate(extra):
            weight = mass*extra_mass
            if not weight:
                continue
            one = assumed[k]*extra[j]
            zero = assumed[-1-k]*extra[-1-j]
            if not one+zero:
                impossible += weight
                continue
            p = one/(one+zero)
            correct = F(1,2) if p == F(1,2) else int(p > F(1,2))
            accuracy += weight*correct
            brier += weight*(1-p)**2
            loss = loss - float(weight)*log(p) if p else float("inf")
            if max(p,1-p) >= F(9,10):
                extreme_wrong += weight*(1-correct)
    return accuracy,brier,loss,impossible,extreme_wrong


def close(observed, expected, name, tol=3e-10):
    if not isclose(observed, float(expected), rel_tol=0, abs_tol=tol):
        raise AssertionError((name, observed, float(expected)))


def check(path):
    result = json.loads(path.read_text(encoding="utf-8"))
    config = result["config"]
    n, q, trials = config["agents"], number(config["reliability"]), config["trials"]
    # Simultaneous multinomial mean screen. Gaussian approximation is avoided for rare cells.
    tol = sqrt(log(2*len(result["conditions"])*2*(n+1)/0.001)/(2*trials))
    for row in result["conditions"]:
        rho = number(row["correlation"])
        original = [masses(n,q,rho,law) for law in ("shared","beta")]
        mu = n*q
        second = n*(n-1)*(q*q+rho*q*(1-q))+mu
        lower, upper = exact_bounds(n,mu,second)
        for boundary, exact in (("lower",lower),("upper",upper)):
            witness = row["bounds"][boundary]
            close(witness["accuracy"],exact,boundary)
            for order, moment in enumerate((1,mu,second)):
                value = sum(w["probability"]*w["count"]**order for w in witness["support"])
                close(value,moment,(boundary,order))
        exact_accuracy = []
        for i, model in enumerate(row["models"]):
            law = model["law"]
            pmf = original[i]
            if sum(pmf) != 1 or sum(k*p for k,p in enumerate(pmf)) != mu or sum(k*k*p for k,p in enumerate(pmf)) != second:
                raise AssertionError("Independent rational moments failed.")
            for actual, target, observed in zip(model["pmf"],pmf,model["sampledCounts"],strict=True):
                close(actual,target,"count mass")
                close(observed/trials,target,"Monte Carlo count sanity",tol)
            accuracy = sum(p*credit(k,n) for k,p in enumerate(pmf))
            close(model["exact"]["majority"],accuracy,"majority")
            exact_accuracy.append(accuracy)
            assumptions = {
                "specified": pmf, "wrongFamily":original[1-i],
                "independent":masses(n,q,F(0),"shared"),
                "underestimates":masses(n,q,rho/2,law),
                "overestimates":masses(n,q,(1+rho)/2,law),
            }
            for policy, assumed in assumptions.items():
                a,b,l,m,e = forecast(pmf,assumed)
                row_score = model["forecasts"][policy]
                close(row_score["impossibleMass"],m,(policy,"impossible"))
                if not m:
                    close(row_score["accuracy"],a,(policy,"accuracy"))
                    close(row_score["brier"],b,(policy,"Brier"))
                    close(row_score["logLoss"],l,(policy,"log loss"))
                    close(row_score["overconfidentError"],e,(policy,"overconfidence"))
            for case in model["hub"]:
                h,t = number(case["weight"]),case["rounds"]
                expected = F(1,n)
                for _ in range(t):
                    expected = h*expected+(1-expected)/2
                close(case["effective"],expected,"finite hub")
                def vote(weight):
                    return F(1,2) if weight == F(1,2) else int(weight > F(1,2))
                exact = sum(p*(F(k,n)*vote(expected+(1-expected)*F(k-1,n-1))
                                        + F(n-k,n)*vote((1-expected)*F(k,n-1)))
                            for k,p in enumerate(pmf))
                close(case["accuracy"],exact,"hub accuracy")
            for scenario in model["verification"]:
                m = scenario["replacements"]
                block = masses(n-m,q,rho,law)
                fresh = masses(m,number(scenario["verifierReliability"]),F(0),"shared")
                a,b,_,_,_ = forecast(block,block,fresh)
                close(scenario["accuracy"],a,"verification accuracy")
                close(scenario["brier"],b,"verification Brier")
                close(scenario["utility"],a-m*number(scenario["cost"]),"verification utility")
        close(row["betaMinusShared"],exact_accuracy[1]-exact_accuracy[0],"exact contrast")
        print(f"{config['id']} rho={float(rho):.2f} reference & sampling checks passed "
              f"[{float(lower):.6f}, {float(upper):.6f}]")


if __name__ == "__main__":
    for result_path in sorted((ROOT / "results").glob("echo2-*.json")):
        if not result_path.name.endswith((".manifest.json", ".failure.json")):
            check(result_path)
