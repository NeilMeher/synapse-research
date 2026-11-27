"""Independent Decimal calculations from the reviewed Railway Board transcription."""
import csv
from decimal import Decimal as D, localcontext
import json
from pathlib import Path
from statistics import correlation

ROOT=Path(__file__).resolve().parents[1]


def close(actual,value):
    if value is None:
        if actual is not None:
            raise ValueError("Missing or excluded observations must stay null.")
        return
    if actual is None or abs(D(str(actual))-value)>D("3e-13")*max(D(1),abs(value)):
        raise ValueError(f"Historical value differs: {actual} vs {value}")


def main():
    with (ROOT/"data/chronos/railboard-summary-transcription.csv").open(encoding="utf8") as f:
        rows=list(csv.DictReader(f))
    years=[int(r["fiscal"][:4])+1 for r in rows]
    variables={}
    for key,column in (("route","route_km"),("electric","electrified_route_km"),
                       ("tonnes","revenue_originating_million_tonnes"),("ntkm","revenue_net_tonne_km_million")):
        variables[key]={year:D(row[column])/(1000 if key=="ntkm" else 1) for year,row in zip(years,rows,strict=True)}
    variables["lead"]={y:1000*variables["ntkm"][y]/variables["tonnes"][y] for y in years}
    variables["share"]={y:100*variables["electric"][y]/variables["route"][y] for y in years}
    result=json.loads((ROOT/"results/chronos-scenario.json").read_bytes())
    cfg=json.loads((ROOT/"experiments/chronos-scenario.json").read_bytes())
    if result["config"]!=cfg or not result["historicalCausalStatus"].startswith("withheld"):
        raise ValueError("Historical evidence classification or protocol changed.")
    annual={}
    for key,panel in result["metrics"].items():
        values=variables[key]
        annual[key]={year:100*(values[year]-values[year-1])/values[year-1]
                     for year in years if year-1 in values}
        for y,row in zip(years,panel["series"],strict=True):
            if (int(row["fiscal"][:4])+1,row["endYear"])!=(y,y):
                raise ValueError("Fiscal labels moved.")
            close(row["value"],values[y])
            close(row["growth"],annual[key].get(y))
            close(row["index"],100*values[y]/values[cfg["indexYear"]])
        for w in cfg["windows"]:
            a,b=w["start"],w["end"]
            span=panel["spans"][w["id"]]
            if (span["from"],span["to"],span["years"])!=(a,b,b-a):
                raise ValueError("Wrong span endpoints.")
            ratio=values[b]/values[a]
            close(span["start"],values[a])
            close(span["end"],values[b])
            close(span["change"],values[b]-values[a])
            close(span["growth"],100*(ratio-1))
            with localcontext() as ctx:
                ctx.prec=36
                close(span["cagr"],100*((ratio.ln()/D(b-a)).exp()-1))
    pair=cfg["association"]
    used=[y for y in years if pair["start"]<=y<=pair["end"] and all(y in annual[k] for k in (pair["left"],pair["right"]))]
    pearson=correlation(*[[float(annual[k][y]) for y in used] for k in (pair["left"],pair["right"])])
    if result["association"]["years"]!=used or result["association"]["n"]!=len(used):
        raise ValueError("Association year matching differs.")
    close(result["association"]["pearson"],D(str(pearson)))
    a=cfg["conditionalScenario"]
    for scenario,factor in zip(result["alternatives"],a["factors"],strict=True):
        close(scenario["factor"],D(str(factor)))
        base=variables["electric"][a["start"]]/variables["route"][a["start"]]
        for row,y in zip(scenario["rows"],range(a["start"],a["end"]+1),strict=True):
            if row["year"]!=y:
                raise ValueError("Teaching year moved.")
            expected=D(str(factor))*variables["share"][y]+(1-D(str(factor)))*base*100
            close(row["observed"],variables["share"][y])
            close(row["scenario"],expected)
            close(row["assumedRouteKM"],variables["route"][y])
            close(row["scenarioElectricKM"],expected*variables["route"][y]/100)
    for row,spec in zip(result["synthetic"],cfg["synthetic"],strict=True):
        c=spec["inputs"]
        if row["id"]!=spec["id"]:
            raise ValueError("Synthetic case order changed.")
        effect=c["effect"]
        bias=c["trendGap"]-c["anticipation"]-c["spillover"]
        if (row["truth"],row["bias"],row["did"])!=(effect,bias,effect+bias):
            raise ValueError("Synthetic exact-effect or bias identity differs.")
    print("CHRONOS reference checked 102 measures, 18 windows, all association pairs, four conditional scenarios and five benchmark cases.")


if __name__=="__main__":
    main()
