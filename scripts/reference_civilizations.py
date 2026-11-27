"""Replay the conserved economy independently in Python and check every world aggregate."""
from fractions import Fraction
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import mean, stdev

from reference_noesis import stream

ROOT = Path(__file__).resolve().parents[1]
POPULATION = 8
NEED = 3
PROPORTIONS = {"needsSatisfied", "unmet", "giniConsumed", "giniTerminalStock", "cooperation",
               "networkShare", "specializedTime", "shockSatisfaction"}


def close(actual, archived):
    if actual is None or archived is None:
        assert actual is archived, (actual, archived)
    elif isinstance(actual, dict):
        assert actual.keys() == archived.keys(), (actual.keys(), archived.keys())
        for key in actual:
            close(actual[key], archived[key])
    elif isinstance(actual, (list, tuple)):
        assert len(actual) == len(archived)
        for value, saved in zip(actual, archived, strict=True):
            close(value, saved)
    elif isinstance(actual, float):
        assert math.isclose(actual, archived, rel_tol=1e-10, abs_tol=1e-10), (actual, archived)
    else:
        assert actual == archived, (actual, archived)


def world_at(seed, climate, steps):
    rand = stream(seed)
    rates = [0.95] * 4 + [0.25] * 4
    for i in reversed(range(1, POPULATION)):
        j = int(next(rand) * (i+1))
        rates[j], rates[i] = rates[i], rates[j]
    agents = [dict(id=i, location=i, stock=[int(4*next(rand)) for _ in range(2)],
                   technology=[4, 2] if i % 2 == 0 else [2, 4], reliability=rates[i])
              for i in range(POPULATION)]
    schedule = []
    for _ in range(steps):
        labor = 1 if next(rand) < {"moderate": 0.15, "stress": 0.50}[climate] else 2
        offset = int(next(rand) * POPULATION)
        meetings = []
        for k in range(0, POPULATION, 2):
            a, b = (offset+k) % POPULATION, (offset+k+1) % POPULATION
            if next(rand) < 0.5:
                a, b = b, a
            meetings.append(dict(payer=a, supplier=b, deliveryDraw=next(rand), choiceDraw=next(rand)))
        schedule.append(dict(labor=labor, meetings=meetings))
    return dict(seed=seed, climate=climate, agents=agents, schedule=schedule)


def resource_totals(stocks):
    return [sum(row[resource] for row in stocks) for resource in range(2)]


def inequality(values):
    total = sum(values)
    return sum(abs(x-y) for x in values for y in values)/(2*len(values)*total) if total else 0


def make_plan(row, technology, labor):
    candidates = [(technology[0]*hours, technology[1]*(labor-hours)) for hours in range(labor+1)]

    def value(plan):
        stock = [current+extra for current, extra in zip(row, plan, strict=True)]
        return sum(3*min(amount, NEED)+2*max(0, amount-NEED) for amount in stock)

    hours = max(range(labor+1), key=lambda i: value(candidates[i]))
    return hours, candidates[hours]


def material(buyer_gain, seller_gain, draw, count, deliveries):
    return buyer_gain > 0 or (buyer_gain == 0 and draw < 0.5)


def replay(world, visibility, record, choose=material):
    stocks = [agent["stock"].copy() for agent in world["agents"]]
    initial = resource_totals(stocks)
    produced, consumed, lost = ([0, 0] for _ in range(3))
    stores, ties, network, timeline = {}, {}, set(), []
    received = [0] * POPULATION
    committed = completed = refused = volume = special = worked = shock_days = shock_consumed = 0
    for day, shift in enumerate(world["schedule"], 1):
        labor = shift["labor"]
        plans, hours = [], []
        for i, agent in enumerate(world["agents"]):
            allocation, plan = make_plan(stocks[i], agent["technology"], labor)
            stocks[i] = [amount+added for amount, added in zip(stocks[i], plan, strict=True)]
            plans.append(plan)
            hours.append(allocation)
            special += allocation if agent["technology"][0] > agent["technology"][1] else labor-allocation
            worked += labor

        events = []
        if visibility != "autarky":
            for m in shift["meetings"]:
                payer, supplier = m["payer"], m["supplier"]
                a, b = stocks[payer], stocks[supplier]
                possible = [max(0, min(a[r]-NEED, NEED-b[r], b[1-r]-NEED, NEED-a[1-r], 2)) for r in range(2)]
                if not any(possible):
                    continue
                give = next(i for i, quantity in enumerate(possible) if quantity)
                q = possible[give]
                if visibility == "pooled":
                    evidence = stores.get(supplier, [])
                elif visibility == "local":
                    evidence = ties.get((payer, supplier), [])
                else:
                    evidence = []
                belief = Fraction(3+sum(evidence), 4+len(evidence))
                first_net = q*(3*belief-2)
                second_net = q*(3-2*belief)
                if choose(first_net, second_net, m["choiceDraw"], len(evidence), sum(evidence)):
                    assert a[give] >= q and b[1-give] >= q
                    delivery = m["deliveryDraw"] < world["agents"][supplier]["reliability"]
                    before = resource_totals((a, b))
                    a[give] -= q
                    b[give] += q
                    if delivery:
                        a[1-give] += q
                        b[1-give] -= q
                        network.add(tuple(sorted((supplier, payer))))
                    assert resource_totals((a, b)) == before
                    committed += 1
                    completed += delivery
                    volume += q*(1+delivery)
                    stores.setdefault(supplier, []).append(delivery)
                    ties.setdefault((payer, supplier), []).append(delivery)
                    status = "delivered" if delivery else "defaulted"
                else:
                    refused += 1
                    status = "rejected"
                if record:
                    events.append(dict(payer=payer,supplier=supplier,give=give,quantity=q,belief=float(belief),status=status))

        eaten, discarded = [], []
        for i, stock in enumerate(stocks):
            intake = [min(NEED, amount) for amount in stock]
            remaining = [amount-use for amount, use in zip(stock, intake, strict=True)]
            saved = [min(10, value) for value in remaining]
            eaten.append(intake)
            discarded.append([left-keep for left, keep in zip(remaining, saved, strict=True)])
            stocks[i] = saved
            received[i] += sum(intake)

        flows = dict(produced=resource_totals(plans), consumed=resource_totals(eaten), loss=resource_totals(discarded))
        prior = (produced, consumed, lost)
        for vector, increments in zip(prior, flows.values(), strict=True):
            vector[0] += increments[0]
            vector[1] += increments[1]
        terminal = resource_totals(stocks)
        assert terminal == [initial[r]+produced[r]-consumed[r]-lost[r] for r in range(2)]
        assert all(0 <= amount <= 10 for stock in stocks for amount in stock)
        if labor == 1:
            shock_days += 1
            shock_consumed += sum(flows["consumed"])
        if record:
            population = []
            for i in range(POPULATION):
                deliveries = stores.get(i, [])
                population.append(dict(id=i, stock=stocks[i].copy(), production=plans[i], hours=hours[i],
                                       consumed=eaten[i], totalConsumed=received[i],
                                       reputation=dict(attempts=len(deliveries), delivered=sum(deliveries))))
            timeline.append(dict(day=day, labor=labor, exchanges=events, flows=flows,
                                 accounting=terminal, population=population))

    possible = POPULATION*len(world["schedule"])*2*NEED
    total_consumption = sum(consumed)
    metric = dict(needsSatisfied=total_consumption/possible, unmet=(possible-total_consumption)/possible,
                  welfare=total_consumption/POPULATION, lowestConsumption=min(received),
                  giniConsumed=inequality(received), giniTerminalStock=inequality([sum(row) for row in stocks]),
                  production=sum(produced),totalConsumption=total_consumption,loss=sum(lost),exchangeVolume=volume,
                  attempts=committed,deliveries=completed,rejected=refused,
                  cooperation=completed/(POPULATION/2*len(world["schedule"])),
                  networkShare=len(network)/POPULATION,specializedTime=special/worked,
                  shockSatisfaction=shock_consumed/(shock_days*POPULATION*2*NEED) if shock_days else None)
    accounting = dict(initial=initial,produced=produced,consumed=consumed,losses=lost,terminal=resource_totals(stocks))
    return dict(metric=metric, accounting=accounting, received=received, timeline=timeline)


def verify_summaries(values, expected, lower=0, upper=math.inf):
    assert len(values) == expected["trials"]
    center = mean(values)
    close(center, expected["estimate"])
    if len(values) > 1:
        sd = stdev(values)
        half = 1.959963984540054*sd/math.sqrt(len(values))
        close(sd, expected["sd"])
        close([max(lower, center-half), min(upper, center+half)], expected["interval"])
    else:
        assert expected["sd"] is None and expected["interval"] is None


def verify(study, arms, contrast):
    for phase in ("pilot", "confirmatory"):
        stem = f"{study}-{phase}"
        file = ROOT / "results" / f"{stem}.json"
        if not file.exists():
            continue
        raw = file.read_bytes()
        manifest = json.loads(file.with_suffix(".manifest.json").read_bytes())
        assert sha256(raw).hexdigest() == manifest["output"]["sha256"]
        archive = json.loads(raw)
        config = archive["config"]
        master = stream(config["seed"])
        for cell in archive["cells"]:
            summaries = {arm: {} for arm in arms}
            paired = []
            for i in range(config["trials"]):
                seed = 1 + int(next(master) * 4294967295)
                world = world_at(seed, cell["climate"], config["steps"])
                runs = {key: callback(world, i==0) for key, callback in arms.items()}
                if not i:
                    close(world, cell["first"]["world"])
                    close(runs, cell["first"]["arms"])
                paired.append(contrast(runs))
                for arm, result in runs.items():
                    for key, value in result["metric"].items():
                        if value is not None:
                            summaries[arm].setdefault(key, []).append(value)
            for arm in arms:
                assert summaries[arm].keys() == cell["summaries"][arm].keys()
                for key, values in summaries[arm].items():
                    verify_summaries(values, cell["summaries"][arm][key], upper=1 if key in PROPORTIONS else math.inf)
            verify_summaries(paired, cell["contrast"], -1, 1)
            print(stem, cell["climate"], config["trials"], "paired worlds and exact ledgers verified", flush=True)


if __name__ == "__main__":
    assert (Fraction(2,4), Fraction(4,2)) == (Fraction(1,2), Fraction(2))
    assert (min(4,4)+min(2,4), min(2,4)+min(4,4)) == (6,6)
    assert resource_totals(((8-4,0+4),(0+4,8-4))) == [8,8]
    verify("civilizations", {key: (lambda world, record, visibility=key: replay(world, visibility, record))
                             for key in ("autarky", "unaware", "local", "pooled")},
           lambda runs: runs["pooled"]["metric"]["needsSatisfied"]-runs["unaware"]["metric"]["needsSatisfied"])
