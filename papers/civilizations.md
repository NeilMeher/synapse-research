# GAME OF CIVILIZATIONS · Delivery information and local resource exchange

## Research question

Does observing more past deliveries improve need satisfaction in a decentralized artificial barter economy under scarce labor? This model links exact physical resource accounts to local offer selection. The [novelty matrix](../research/civilizations-literature.md) distinguishes the comparison from established work on specialization, artificial societies and governance.

## Design

Each world has eight agents at fixed sites on a ring, alternating production technologies [4,2] and [2,4], two consumable resources, and a 24-day horizon. Days contain production, disjoint pair encounters, consumption and storage. Each treatment shares the same initial stocks, tech, scarcity shocks, roles and potential delivery draws. Payers can decline based on a fixed reliability prior, own dealings or a pooled past record. The funded trade can fail at the delivery leg. The paid resource remains in the supplier's inventory. No exchange serves as a control. Accounting is exact in integer resource units.

The pilot used 60 independent worlds per scarcity regime. A separate master seed generated a frozen confirmation of 400 worlds in each regime. The primary contrast is paired pooled minus fixed-prior need satisfaction in the stress regime. The interval is over world trajectories.

## Confirmatory results

| Stress regime metric | No exchange | Fixed prior | Own delivery history | Pooled history |
| --- | ---: | ---: | ---: | ---: |
| Need satisfied | 51.05% | 76.90% | 68.65% | 67.29% |
| Attempts per world | 0.00 | 94.27 | 57.51 | 51.29 |
| Completed trades per world | 0.00 | 56.70 | 45.65 | 43.95 |
| Consumption of worst-served agent | 72.10 | 100.17 | 83.72 | 80.73 |
| Gini of total agent consumption | 0.0075 | 0.0310 | 0.0559 | 0.0629 |

Pooled history reduced need satisfaction by **9.61 percentage points** (95% interval **−9.80 to −9.41 pp**). The moderate-regime descriptive difference was −9.79 pp. Under stress, pooled history had fewer successful trades despite a higher proportion of attempted trades completing. Rejection eliminated funded offers whose payoff could have been positive at the aggregate level under the prescribed scoring. The design does not isolate how this trade-off would change with alternative payment enforcement.

## Verification and limits

The Python reference regenerated all 920 pilot and confirmatory worlds and evaluated each of the four treatments independently. It checked exact balances after all days and the first replay in each condition. The confirmatory Node run used 1.997 seconds and observed process RSS of 72,019,968 bytes. The model's own production objective always chose the more productive side of each technology in these runs. Specialization is an output of this objective and its parameters. The capital-free consumption score equally weights the two units and remains a model quantity. The implemented ring, information modes and prepayment rule are imposed mechanisms. Human review is pending.

[Confirmed archive](../data/civilizations-confirmatory.json) · [Manifest](../data/civilizations-confirmatory.manifest.json) · [Frozen protocol](../research/civilizations-confirmatory.md) · [Audit](../research/civilizations-audit.md)
