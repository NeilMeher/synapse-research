# AXIOM · Strategic consistency under equivalent presentation

## Question and prior work

When can an observed decision shift be attributed to presentation when incentives and beliefs are held fixed? Tversky and Kahneman report human decisions under alternative descriptions of choice problems. AXIOM instead tests the technical invariance of explicit synthetic policies under permutation. McKelvey and Palfrey solve joint quantal-response equilibrium conditions. The logit policy here responds to a stipulated opponent belief. [Framing study](https://doi.org/10.1126/science.7455683) · [Quantal response equilibria](https://doi.org/10.1006/game.1995.1023)

| Established approach | Role in AXIOM |
| --- | --- |
| Expected utility and action relabeling | Exact invariant and hand-calculated fixtures |
| Logit response | Stable stochastic policy at fixed sensitivity, conditional on a stipulated belief |
| Experimental framing | Motivation for a future separate behavioural study |

## Method

The frozen benchmark exhausts four two-player games, five quarter-valued opponent distributions and four axis permutations. Every cell holds both players' material payoffs. We transform probability weights together with the column identities and map displayed decisions back using the inverse row permutation. Utility is represented as an integer numerator over four. The utility policy mixes uniformly on exact ties. The logit policy uses beta = 1. Total variation is half the sum of absolute probability differences. Two intentional controls add a position-only policy and an incorrect belief-remapping path.

## Executed results

| Diagnostic | Result |
| --- | --- |
| Exact task and presentation counts | 20 tasks, 80 presentations |
| Valid presentation mismatches | 0 |
| Exact utility and tie failures | 0 |
| Maximum canonical utility and logit distribution changes | 0 total variation for each |
| Position-only changes | 40, one for every row-swapped view |
| Incorrect remapping | 32 inequivalent games in 40 attempts, 24 changed utility vectors and 16 changed best-response distributions |

The eight equal-weight fault attempts preserved beliefs because swapping two equal weights leaves the vector fixed. Other faults can alter a belief without affecting payoffs or the winning action. The Python Fraction reference checked payoff coordinates, expected utilities, ties, probability distributions and all 40 fault traces independently. The Node verifier reproduced the exact deterministic payload and checked its output digest. The manifest records execution time and process RSS.

## Interpretation

The utility invariant follows from the indexing identity. The positive controls verify that the diagnostics distinguish an order-sensitive policy from a change in the decision problem. This is a finite implementation benchmark with no sampling uncertainty. Policy parameters remain assumptions, human review is pending, and neither morality nor human framing behaviour was observed.

[Protocol](../research/axiom-pilot.md) · [Results](../data/axiom-pilot.json) · [Manifest](../data/axiom-pilot.manifest.json) · [Audit](../research/axiom-audit.md)
