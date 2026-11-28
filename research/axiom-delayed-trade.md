# AXIOM delayed-settlement decision fixture

`axiom-delayed-trade-fixture-001` · exact mathematical evidence A

A risk-neutral buyer has two rounds to reject, trade, use an escrow contract or pay for an immediate noisy verification before choosing one of those actions. The counterparty transitions exogenously between healthy and faulty; there is no second decision-maker. Healthy and faulty delivery rates are .85 and .30. Round-one settlement becomes visible before round two with delay one and arrives outside the decision horizon with delay two. The buyer updates on its own audit and settlement history. The payoffs and probabilities are hypothetical units. [Frozen fixture](axiom-trust-fixture.json) · [Exact policy values](evidence/axiom-delayed-trade-fixture-001/policy-values.json)

Escrow changes the payoff conditional on delivery but preserves the settlement observation. For delivery probability \(d\), the one-step utility of trade is \((5/2)d-3/2\), that of escrow is \((7/10)d-1/5\), and rejection pays zero. The single-step trade/escrow indifference point is \(d=13/18\). Two rounds allow settlement to change the second choice, so use term-by-term expected utility over accessible histories. The model uses a hypothetical regime audit with accuracy .75. Its cost is subtracted once if requested.

| Initial healthy probability | First-round optimum at verification cost .025 | First-round optimum at cost .10 |
|---|---|---|
| .35 | Escrow | Escrow |
| .65 | Verify, then escrow after a negative signal or trade after a positive signal | Escrow |
| .85 | Verify, then escrow after a negative signal or trade after a positive signal | Trade |

These first-round action plans were identical across the two settlement delays. Value still changed in several cells. With prior .85 and cost .10 the two-round value was 605737/800000 with quicker feedback, versus 14427/20000 with later feedback, a difference of 28657/800000 (about .03582). With prior .35 and cost .10 value was unchanged at 6637/20000. Delaying a signal beyond the horizon can therefore remove option value without changing the first action. This is a finite example under an exogenous failure process, with no equilibrium or real transaction claim.

The reference checks all 12 cells using rational posterior recursion and a separate calculation that enumerates joint state paths and all signal-contingent action plans. It records ties if present. Run `python -B research/axiom-trust-fixture.py verify`. Transfer to a strategic counterparty requires its information, payoff and available actions. Transfer to GAME OF CIVILIZATIONS requires reconciliation with its settlement and resource conservation rules.
