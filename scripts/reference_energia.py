"""Independent engineering and present-value reference for the registered scenarios."""
from math import ceil, fsum, isclose
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_bytes())


def equal(observed, expected):
    if expected is None or isinstance(expected, (bool, str)):
        if observed != expected:
            raise ValueError(f"Expected {expected}, observed {observed}")
    elif observed is None or not isclose(observed, expected, rel_tol=3e-10, abs_tol=2e-7):
        raise ValueError(f"Expected {expected}, observed {observed}")


def extend(base, changes):
    return {section: value | changes.get(section, {}) if isinstance(value, dict) else value
            for section, value in base.items()}


def npv(entries, rate):
    discount = 1 / (1 + rate)
    return fsum(cash * discount**year for year, cash in enumerate(entries))


def watts_and_utilities(model, ramp, reserved):
    c, t, o = (model[key] for key in ("capacity", "tariff", "operations"))
    servers = c["gpus"] // c["gpusPerServer"]
    active = 8760 * c["gpus"] * c["availability"] * c["workFraction"] * ramp
    blocks = [c["gpus"] * c["gpuIdleW"] / 1000, servers * c["serverOtherKW"], c["sharedITKW"]]
    idle = fsum(blocks)
    peak = c["gpus"] * c["gpuLoadedW"] / 1000 + fsum(blocks[1:])
    annual = (c["gpuLoadedW"] - c["gpuIdleW"]) * active / 1000 + 8760 * idle
    site = annual * c["pue"]
    peak_kva = peak * c["pue"] / c["powerFactor"]
    water = annual * c["siteWue"] / 1000
    billing = max(c["contractKVA"], peak_kva)
    power = fsum((site * t["energyPerKWh"], 12 * billing * t["demandPerKVAmonth"], 12 * t["fixedPerMonth"]))
    reserved_hours = 8760 * c["gpus"] * c["availability"] * reserved
    spot_hours = (8760 * c["gpus"] * c["availability"] - reserved_hours) * ramp * c["billFraction"]
    rack = min(servers, c["serversPerRack"]) * (c["serverOtherKW"] + c["gpusPerServer"] * c["gpuLoadedW"] / 1000)
    return (dict(servers=servers, racks=ceil(servers / c["serversPerRack"]), maxRackKW=rack,
                 activeGPUHours=active, reservedGPUHours=reserved_hours, spotGPUHours=spot_hours,
                 billableGPUHours=reserved_hours + spot_hours, idleITKW=idle, peakITKW=peak, itKWh=annual,
                 facilityKWh=site, peakFacilityKW=peak*c["pue"], siteWaterM3=water, peakKVA=peak_kva, billingKVA=billing,
                 installedGPUHours=8760*c["gpus"], availableGPUHours=8760*c["gpus"]*c["availability"]),
            power, water * t["waterPerM3"])


def recalculate(model):
    c, o, f = (model[k] for k in ("costs", "operations", "finance"))
    installed = model["capacity"]["gpus"]
    capital = fsum(c[k] for k in ("civil", "electrical", "cooling", "network", "professional")) + c["gpuPerDevice"] * installed
    loan = capital * f["debtShare"]
    q = f["debtRate"]
    term = f["tenor"]
    payment = loan / fsum((1 + q)**(-j) for j in range(1, term + 1)) if loan else 0
    delay = o["constructionDelay"]
    last = o["years"] + delay
    reserve = 0.0
    rows = []
    for y in range(last + 1):
        k = y - delay
        completed_payments = max(0, min(term, k - 1))
        balance = payment * fsum((1+q)**(-i) for i in range(1, term-completed_payments+1))
        commission = y == delay
        capex = 0
        if delay:
            if y == 0:
                capex = capital * o["initialShare"]
            elif commission:
                capex = capital - capital * o["initialShare"]
        elif commission:
            capex = capital
        wc = -c["workingCapital"] if commission else c["workingCapital"] if y == last else 0
        terminal = c["residual"] - c["decommission"] if y == last else 0
        draw = loan if commission else 0
        provision = f["reserveUSD"] if commission else 0
        reserve += provision
        billed = revenue = costs = replacement = interest = principal = 0
        if y > delay:
            phys, electricity, watercost = watts_and_utilities(
                model, o["yearOneRamp"] if k == 1 else 1,
                o["reserveShare"] if k <= o["contractYears"] else 0)
            billed = phys["billableGPUHours"]
            revenue = phys["spotGPUHours"] * o["spotPerHour"] * o["annualPriceFactor"]**(k-1)
            revenue += phys["reservedGPUHours"] * o["reservedPerHour"]
            costs = electricity + watercost + phys["activeGPUHours"]*c["variablePerActiveHour"] + c["annualFixed"]
            if k == o["replacementYear"]:
                replacement = installed*c["replacementPerGPU"]
            if 1 <= k <= term:
                interest = balance * q
                principal = payment-interest
        ds = interest+principal
        cfads = revenue-costs-replacement
        free = cfads-capex+wc+terminal
        gap_before_reserve = max(0, ds-max(0, cfads+max(0, wc+terminal) if y == last else cfads))
        used = min(reserve, gap_before_reserve)
        reserve -= used
        released = reserve if y == last else 0
        reserve -= released
        e = free+draw-ds-provision+used+released
        closing_balance = balance-principal if y >= delay else 0
        rows.append(dict(year=y, operatingYear=k, capex=capex, workingCapital=wc, terminal=terminal, debtDraw=draw,
                         debtBalance=closing_balance, interest=interest, principal=principal, debtService=ds,
                         dscr=cfads/ds if ds else None, billed=billed, revenue=revenue, operatingCosts=costs,
                         replacement=replacement, ebitda=revenue-costs, cfads=cfads, projectCash=free, equityCash=e,
                         reserveFunding=provision, reserveDraw=used, reserveRelease=released, reserveBalance=reserve,
                         paymentGap=gap_before_reserve-used, additionalEquityRequired=max(0,-e) if y>delay else 0))
    ratio = [row["dscr"] for row in rows if row["dscr"] is not None]
    years = [row["year"] for row in rows if row["paymentGap"] > 1e-7]
    discounts = npv([row["billed"] for row in rows], f["projectRate"])
    lifecycle = [row["capex"] + row["operatingCosts"] + row["replacement"] - row["workingCapital"] - row["terminal"] for row in rows]
    present = dict(projectNPV=npv([row["projectCash"] for row in rows],f["projectRate"]),
                   equityNPV=npv([row["equityCash"] for row in rows],f["equityRate"]),
                   minDSCR=min(ratio) if ratio else None,
                   averageDSCR=fsum(ratio)/len(ratio) if ratio else None,
                   covenantBreaches=sum(value < f["minimumDSCR"] for value in ratio),
                   firstPaymentGapYear=min(years) if years else None, unmetPayments=fsum(row["paymentGap"] for row in rows),
                   additionalEquity=fsum(row["additionalEquityRequired"] for row in rows),
                   costPerBillableHour=npv(lifecycle,f["projectRate"])/discounts if discounts else None)
    return rows,present,capital


def main():
    saved = read("results/energia-scenario.json")
    config = read("experiments/energia-scenario.json")
    if saved["config"] != config:
        raise ValueError("Unregistered scenario config")
    base = config["base"]
    for case, archived in zip(config["cases"],saved["cases"],strict=True):
        equal(archived["id"],case["id"])
        model = extend(base,case["settings"])
        rows,metrics,capex = recalculate(model)
        phys,power,cooling_cost = watts_and_utilities(model,1,model["operations"]["reserveShare"] if model["operations"]["contractYears"] else 0)
        for key, expected in phys.items():
            equal(archived["physical"][key],expected)
        equal(archived["physical"]["electricity"]["total"],power)
        equal(archived["physical"]["waterCost"],cooling_cost)
        equal(archived["capital"]["total"],capex)
        equal(archived["funding"]["uses"],archived["funding"]["debt"]+archived["funding"]["equity"])
        for expected, actual in zip(rows,archived["timeline"],strict=True):
            for key, value in expected.items():
                equal(actual[key],value)
        for key, expected in metrics.items():
            equal(archived["metrics"][key],expected)
        for key, field in (("projectIRR","projectCash"),("equityIRR","equityCash")):
            rate = archived["metrics"][key]["value"]
            if rate is not None:
                equal(npv([row[field] for row in rows],rate),0)

    grid_dims = {"utilizationEnergy":("capacity","billFraction","tariff","energyPerKWh"),
                 "utilizationRevenue":("capacity","billFraction","operations","spotPerHour"),
                 "debtHardware":("finance","debtRate","costs","gpuPerDevice")}
    cells = 0
    for name, (a,ka,b,kb) in grid_dims.items():
        coords = [(x,y) for x in config["sensitivity"][ka] for y in config["sensitivity"][kb]]
        for (x,y), cell in zip(coords,saved["grids"][name],strict=True):
            equal(cell["x"],x)
            equal(cell["y"],y)
            _, metrics, _ = recalculate(extend(base,{a:{ka:x},b:{kb:y}}))
            for key in ("projectNPV","equityNPV","minDSCR","firstPaymentGapYear"):
                equal(cell[key],metrics[key])
            cells += 1
    for section,key in (("capacity","billFraction"),("tariff","energyPerKWh"),("operations","spotPerHour")):
        record = saved["roots"][key]
        if record["value"] is not None:
            _, metrics, _ = recalculate(extend(base,{section:{key:record["value"]}}))
            equal(metrics["projectNPV"],0)
        else:
            lo,hi = config["breakEven"][key]
            tests = [recalculate(extend(base,{section:{key:point}}))[1]["projectNPV"] for point in (lo,hi)]
            if tests[0]*tests[1] <= 0:
                raise ValueError("A reported absent root was bracketed")
    for cabinet, limit_key in (("optimization","limits"),("infeasibleControl","controlLimits")):
        limits = config["optimization"][limit_key]
        feasible = {}
        for option, archived in zip(config["optimization"]["options"],saved[cabinet]["candidates"],strict=True):
            model = extend(base,option["settings"])
            _, metrics, capex = recalculate(model)
            p,_,_ = watts_and_utilities(model,1,model["operations"]["reserveShare"] if model["operations"]["contractYears"] else 0)
            equal(archived["id"],option["id"])
            expected = dict(capital=capex,peakKVA=p["peakKVA"],siteWaterM3=p["siteWaterM3"],
                            minDSCR=metrics["minDSCR"],costPerBillableHour=metrics["costPerBillableHour"],
                            projectNPV=metrics["projectNPV"])
            failed = [name for name,flag in (("capital",capex>limits["capital"]),("electrical",p["peakKVA"]>limits["peakKVA"]),
                      ("water",p["siteWaterM3"]>limits["siteWaterM3"]),("rack",p["maxRackKW"]>model["capacity"]["rackLimitKW"]),
                      ("coverage",metrics["minDSCR"] is not None and metrics["minDSCR"]<limits["minimumDSCR"]),
                      ("liquidity",metrics["firstPaymentGapYear"] is not None)) if flag]
            for key, value in expected.items():
                equal(archived[key],value)
            if archived["failures"] != failed:
                raise ValueError("Optimization feasibility differs")
            if not failed and metrics["costPerBillableHour"] is not None:
                feasible[option["id"]] = (p["peakKVA"],p["siteWaterM3"],metrics["costPerBillableHour"])
        front = [name for name,p in feasible.items()
                 if not any(q != p and all(b <= a for a,b in zip(p,q)) for q in feasible.values())]
        if saved[cabinet]["frontier"] != front:
            raise ValueError("Pareto set differs")
    for item in saved["profile"]:
        rows, _ , _ = recalculate(base)
        equal(item["projectNPV"],npv([row["projectCash"] for row in rows],item["rate"]))
        equal(item["equityNPV"],npv([row["equityCash"] for row in rows],item["rate"]))
    print(f"ENERGIA independent cash-flow reference verified {len(saved['cases'])} ledgers, {cells} grid cells, roots, and both bounded decision sets.")


if __name__ == "__main__":
    main()
