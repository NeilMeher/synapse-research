"""Independently reconstruct EPISTEME via sequential Gaussian updates."""
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import mean, stdev

from reference_noesis import FAMILIES, GRID, basis, dot, normal, stream

ROOT=Path(__file__).resolve().parents[1]
Z95=1.959963984540054
ADJUSTED=2.241402727604947


def close(actual, expected):
    assert math.isclose(actual, expected, rel_tol=2e-9, abs_tol=2e-9), (actual, expected)


def draw_task(rng, regime):
    position=int(next(rng)*len(FAMILIES))
    family=FAMILIES[position] if regime=="inLibrary" else "outside"
    return (family, [normal(rng) for _ in range(3)], [next(rng) for _ in range(5)],
            [0.2*normal(rng) for _ in range(14)])


class Regressor:
    def __init__(self, family):
        self.family=family
        self.coefficient=[0,0,0]
        self.covariance=[[float(i==j) for j in range(3)] for i in range(3)]
        self.log_likelihood=0

    def predict(self,x):
        features=basis(self.family,x)
        return dot(self.coefficient,features)

    def update(self,x,y,variance):
        features=basis(self.family,x)
        projected=[dot(row,features) for row in self.covariance]
        prediction=dot(self.coefficient,features)
        uncertainty=variance+dot(features,projected)
        difference=y-prediction
        self.log_likelihood-=0.5*(math.log(uncertainty)+difference**2/uncertainty)
        self.coefficient=[value+difference*d/uncertainty for value,d in zip(self.coefficient,projected,strict=True)]
        self.covariance=[[value-projected[i]*projected[j]/uncertainty for j,value in enumerate(row)]
                         for i,row in enumerate(self.covariance)]


def run_case(task, policy, design, replay):
    family, coefficients, choices, errors=task
    sigma, alpha, confidence=(design[k] for k in ("noise","alpha","confidence"))

    def hidden(x):
        features=(1,math.sin(math.pi*x),x*x) if family=="outside" else basis(family,x)
        return dot(features,coefficients)

    candidates=[Regressor(f) for f in FAMILIES]
    options=GRID.copy()
    probabilities=[0.25]*4
    first=7
    for step in range(6):
        if step==0:
            x=0
        elif policy=="random":
            x=options[int(choices[step-1]*len(options))]
        else:
            best=-math.inf
            for x_next in options:
                predictions=[model.predict(x_next) for model in candidates]
                blended=dot(predictions,probabilities)
                dispersion=dot(probabilities,[(p-blended)**2 for p in predictions])
                if dispersion>best+1e-12:
                    x,best=x_next,dispersion
        options.remove(x)
        y=hidden(x)+errors[step]
        for model in candidates:
            model.update(x,y,sigma**2)
        champion=max(candidates,key=lambda model:model.log_likelihood)
        raw=[math.exp(model.log_likelihood-champion.log_likelihood) for model in candidates]
        probabilities=[value/sum(raw) for value in raw]
        if max(probabilities)>=confidence:
            first=min(first,step+1)
        if replay is not None:
            close(x,replay["observations"][step]["x"])
            close(y,replay["observations"][step]["y"])
            assert replay["updates"][step]["family"]==champion.family
            for key, probability in zip(FAMILIES,probabilities,strict=True):
                close(probability,replay["updates"][step]["weights"][key])

    def gate(key, noise):
        statistic=sum(((hidden(x)+error-champion.predict(x))/sigma)**2
                      for x,error in zip(design[key+"Grid"],noise,strict=True))
        tail=math.exp(-statistic/2)*(1+statistic/2)
        if replay is not None:
            close(statistic,replay[key]["statistic"])
            close(tail,replay[key]["p"])
            assert replay[key]["passes"]==(tail>=alpha)
        return tail>=alpha

    proposed=champion.family if max(probabilities)>=confidence else None
    validate=gate("validation",errors[6:10])
    replicate=gate("replication",errors[10:])
    validated=proposed if validate else None
    accepted=validated if replicate else None
    if replay is not None:
        assert replay["proposed"]==proposed and replay["validated"]==validated and replay["replicated"]==accepted
        for x,row in zip(design["evaluationGrid"],replay["evalRows"],strict=True):
            close(x,row["x"])
            close(hidden(x),row["truth"])
            close(champion.predict(x),row["predicted"])
    return {
        "correctProposal":int(proposed==family),"falseProposal":int(proposed is not None and proposed!=family),
        "correctValidated":int(validated==family),"falseValidated":int(validated is not None and validated!=family),
        "correctAccepted":int(accepted==family),"falseAccepted":int(accepted is not None and accepted!=family),
        "rejected":int(accepted is None),"validationPassed":int(validated is not None),
        "replicationPassed":int(accepted is not None),"noProposal":int(proposed is None),
        "rmse":math.sqrt(mean((hidden(x)-champion.predict(x))**2 for x in design["evaluationGrid"])),
        "firstConfidentMeasurement":first,
    }


def summarise(data, actual, critical, low, high):
    centre=mean(data)
    sd=stdev(data)
    half=critical*sd/math.sqrt(len(data))
    assert actual["trials"]==len(data)
    for value, expected in zip((centre,sd,max(low,centre-half),min(high,centre+half)),
                               (actual["estimate"],actual["sd"],*actual["interval"]),strict=True):
        close(value,expected)


def verify(phase):
    stem="episteme-"+phase
    path=ROOT/"results"/f"{stem}.json"
    if not path.exists():
        return
    raw=path.read_bytes()
    artifact=json.loads(raw)
    manifest=json.loads(path.with_suffix(".manifest.json").read_bytes())
    assert sha256(raw).hexdigest()==manifest["output"]["sha256"]
    design=artifact["design"]
    sites=GRID+design["validationGrid"]+design["replicationGrid"]+design["evaluationGrid"]
    assert len(set(sites))==len(sites)
    rng=stream(artifact["config"]["seed"])
    for cell in artifact["cells"]:
        tables={policy:{metric:[] for metric in report} for policy,report in cell["policies"].items()}
        differences=[]
        for idx in range(artifact["config"]["trials"]):
            task=draw_task(rng,cell["regime"])
            if idx==0:
                first=cell["firstTask"]
                assert task[0]==first["family"]
                for value,archive in zip(task[1]+task[2]+task[3],first["coefficients"]+first["randomChoices"]+
                                         first["observationNoise"]+first["validationNoise"]+first["replicationNoise"],strict=True):
                    close(value,archive)
            scores={policy:run_case(task,policy,design,cell["replay"][policy] if idx==0 else None) for policy in tables}
            for policy in tables:
                for metric,value in scores[policy].items():
                    tables[policy][metric].append(value)
            outcome=cell["contrast"]["outcome"]
            differences.append(scores["disagreement"][outcome]-scores["random"][outcome])
        for policy, table in tables.items():
            for metric, values in table.items():
                low,high=(1,7) if metric=="firstConfidentMeasurement" else (0,math.inf) if metric=="rmse" else (0,1)
                summarise(values,cell["policies"][policy][metric],Z95,low,high)
        summarise(differences,cell["contrast"],ADJUSTED,-1,1)
        print(stem,cell["regime"],"replays, paired comparisons and all aggregates verified",flush=True)


if __name__=="__main__":
    verify("pilot")
    verify("confirmatory")
