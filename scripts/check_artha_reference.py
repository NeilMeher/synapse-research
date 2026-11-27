"""Run the frozen independent reference with a floating-point demand comparison."""
from math import fsum
from reference_artha import aggregate, compare, read, rounds


def main():
    source = read("data/processed/artha-india.json")
    groups = read("data/processed/artha-groups.json")
    archive = read("results/artha-scenario.json")
    config = read("experiments/artha-scenario.json")
    if archive["config"] != config or [item["year"] for item in archive["panels"]] != config["panels"]:
        raise ValueError("Scenario design changed.")
    count = 0
    for vintage in archive["panels"]:
        original = source["panels"][str(vintage["year"])]
        for resolution, panel in zip(("source", "aggregated"), vintage["comparisons"], strict=True):
            detail = original if resolution == "source" else aggregate(original, groups)
            codes = [item["code"] for item in (original["industries"] if resolution == "source" else groups)]
            if panel["resolution"] != resolution or panel["industryCount"] != len(codes):
                raise ValueError("Comparison resolution changed.")
            for i, gross in enumerate(detail["output"]):
                compare(fsum(detail["transactions"][i]) + detail["finalDemand"][i], gross, "supply identity")
                inputs = [row[i] for row in detail["transactions"]]
                inputs.extend(detail[key][i] for key in ("imports", "valueAdded", "adjustments"))
                compare(fsum(inputs), gross, "use identity")
            for specified, saved in zip(config["shocks"], panel["scenarios"], strict=True):
                if saved["id"] != specified["id"]:
                    raise ValueError("Scenario order changed.")
                key = "sourceCode" if resolution == "source" else "groupCode"
                demand = [config["amount"] if code == specified[key] else 0.0 for code in codes]
                for actual, expected in zip(saved["shock"], demand, strict=True):
                    compare(actual, expected, "registered demand")
                for field, vector in rounds(detail, demand).items():
                    for actual, expected in zip(saved[field], vector, strict=True):
                        compare(actual, expected, field)
                    compare(saved["totals"][field], fsum(vector), f"total {field}")
                count += 1
    print(f"Independent ARTHA production series verified {count} complete scenarios.")


if __name__ == "__main__":
    main()
