"""Independently compare POLIS policies using the rational economy reference."""
from reference_civilizations import material, replay, verify


def joint(buyer, supplier, draw, _count, _deliveries):
    value = buyer + supplier
    return value > 0 or (value == 0 and draw < 0.5)


def cautious(buyer, supplier, draw, count, deliveries):
    return count == deliveries and material(buyer, supplier, draw, count, deliveries)


def matched(world, record, visibility, selector):
    anchor = replay(world, "pooled", False)
    active = replay(world, visibility, record, selector)
    differences = [trial-control for trial, control in zip(active["received"], anchor["received"], strict=True)]
    active["metric"].update(
        betterOff=sum(x>0 for x in differences), worseOff=sum(x<0 for x in differences),
        largestLoss=max(0,-min(differences)), largestGain=max(0,max(differences)),
    )
    return active


def contrast(arms):
    for key in ("accounting", "received", "metric"):
        assert arms["joint"][key] == arms["fixedPrior"][key]
    return arms["joint"]["metric"]["needsSatisfied"]-arms["material"]["metric"]["needsSatisfied"]


if __name__ == "__main__":
    verify("polis", {
        "material":lambda world, record:matched(world, record, "pooled", material),
        "joint":lambda world, record:matched(world, record, "pooled", joint),
        "cautious":lambda world, record:matched(world, record, "pooled", cautious),
        "fixedPrior":lambda world, record:matched(world, record, "unaware", material),
    }, contrast)
