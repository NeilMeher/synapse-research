"""Separate end-to-end reconciliation of the engineering-to-national-accounts bridge."""
from math import fsum
from reference_artha import rounds
from reference_energia import extend, read, recalculate, watts_and_utilities, equal


def main():
    settings = read("experiments/nexus-scenario.json")
    design = read("experiments/energia-scenario.json")["base"]
    national = read("data/processed/artha-india.json")["panels"]["2024"]
    mapping = read("data/processed/nexus-capital-map.json")
    archive = read("results/nexus-scenario.json")
    if settings != archive["config"] or mapping["year"] != settings["year"] or national["year"] != 2024:
        raise ValueError("Incompatible national and facility vintage.")
    codes = [sector["code"] for sector in national["industries"]]
    for spec, saved in zip(settings["pairs"],archive["cases"],strict=True):
        equal(saved["id"],spec["id"])
        model = extend(design,settings["designs"][spec["design"]])
        ledger, financial, total = recalculate(model)
        physical,power,_ = watts_and_utilities(model,1,model["operations"]["reserveShare"])
        capital = dict(model["costs"])
        capital["gpu"] = capital["gpuPerDevice"] * model["capacity"]["gpus"]
        by_sector = dict.fromkeys(codes,0.0)
        amounts = []
        for policy,line in zip(mapping["categories"],saved["procurement"]["lines"],strict=True):
            key = policy["capitalKey"]
            code = policy["industry"]
            amount = capital[key]
            ratio = policy["higher"] if spec["profile"] else policy["lower"]
            domestic = amount * ratio
            direct_import = amount-domestic
            if key=="gpu":
                equal(direct_import,amount)
                equal(domestic,0)
                if code is not None:
                    raise ValueError("Direct GPU purchases mapped into domestic demand.")
            if code is not None:
                by_sector[code] += domestic / 1_000_000
            amounts.append((domestic,direct_import))
            for field,expected in (("amount",amount),("share",ratio),("domestic",domestic),("imported",direct_import),
                                   ("capitalKey",key),("industry",code)):
                equal(line[field],expected)
        domestic = fsum(a for a,b in amounts)
        imported = fsum(b for a,b in amounts)
        equal(total,domestic+imported)
        equal(saved["procurement"]["domestic"],domestic)
        equal(saved["procurement"]["directImports"],imported)
        demand = list(by_sector.values())
        for actual,expected in zip(saved["procurement"]["demand"],demand,strict=True):
            equal(actual,expected)
        for key,values in rounds(national,demand).items():
            for actual,expected in zip(saved["economic"][key],values,strict=True):
                equal(actual,expected)
            equal(saved["economic"]["totals"][key],fsum(values))

        links = {}
        for i, row in enumerate(national["transactions"]):
            for j, amount in enumerate(demand):
                effect = row[j]/national["output"][j]*amount
                if effect > 0:
                    links[codes[i],codes[j]] = effect
        if len(links)!=len(saved["supplierLinks"]):
            raise ValueError("First production round link count differs.")
        for row in saved["supplierLinks"]:
            equal(row["value"],links.pop((row["supplier"],row["buyer"])))
        for key,saved_key in (("facilityKWh","energyKWh"),("peakKVA","peakKVA"),("siteWaterM3","waterM3"),
                              ("billableGPUHours","contractBillableHours")):
            equal(saved["physical"][saved_key],physical[key])
        equal(saved["physical"]["electricity"],power)
        operating = ledger[model["operations"]["constructionDelay"]+2]
        for key in ("revenue","operatingCosts"):
            equal(saved["finance"][key],operating[key])
        for key in ("projectNPV","equityNPV","costPerBillableHour","minDSCR","firstPaymentGapYear"):
            equal(saved["finance"][key],financial[key])
    b_lo,b_hi,e_lo,e_hi = archive["cases"]
    for left,right in ((b_lo,e_lo),(b_hi,e_hi)):
        if left["economic"] != right["economic"] or left["procurement"] != right["procurement"]:
            raise ValueError("Matched efficiency moved the capital shock.")
    for left,right in ((b_lo,b_hi),(e_lo,e_hi)):
        if left["physical"] != right["physical"] or left["finance"] != right["finance"]:
            raise ValueError("Matched procurement moved engineering or financing.")
    print("NEXUS independent reference verified four expense bridges, engineering and finance ledgers, supplier links and full economic vectors.")


if __name__=="__main__":
    main()
