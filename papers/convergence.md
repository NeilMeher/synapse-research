# CONVERGENCE · From dependent evidence to synthetic pricing error

## Mechanism and controls

A binary synthetic truth determines each market's hidden fundamental. Fifteen traders receive ECHO private reports with 65% marginal correctness and one independent 70% hint. Shared-source and beta-binomial laws both have 0.30 private-error correlation. The independent arm sets it to zero. Within a task, truth, hints, other random draws, capital and order sequence are coupled. A trader's confidence refers to the correctness of the original report. The calibrated policy uses the marginal conditional formula from MIRAGE. The style mechanism has the same probability of requesting two units in expectation with an outcome-independent style signal. The fixed baseline requests one unit. Each market executes through the same REFLEX accounting rules.

The 48-episode pilot preceded the frozen 1,200-episode confirmatory study. It uses 22 arms to distinguish source law, size mechanism, price impact and neighbour communication. Twenty-two first-episode mechanism timelines were independently checked for the confirmatory run, including 478 fills. No real-world observations enter the model. [Protocol](../research/convergence-confirmatory.md) · [Manifest](../results/convergence-confirmatory.manifest.json)

## Prespecified results

| Paired effect on terminal absolute pricing error | Estimate in ticks | Adjusted interval |
|---|---:|---:|
| Beta-binomial minus shared source, calibrated sizing at high impact | 1.89 | −2.24 to 6.02 |
| Difference in that gap under calibrated versus style sizing | −0.09 | −0.63 to 0.45 |

Neither adjusted interval excluded zero. This does not establish equivalence. The first result is compatible with a few ticks in either direction under this design. The distinct ECHO majority performance does not determine this market's terminal error: our market uses signed individual order flow instead of a majority vote.

Descriptively, under high impact and calibrated sizes, the shared-source arm averaged 78.93 ticks of absolute pricing error and the beta-binomial arm 80.82. Style sizing averaged 90.05 and 92.03 in those same laws. Submitted sizes were similar in expectation, with realized means of 23.51, 23.41 and 23.46 for both style arms. These descriptive comparisons do not carry the primary family inference. Individual realized accuracy differs by finite-sample variation despite the generating marginals matching exactly.

Equal and confidence-weighted communication produced identical actions in these two arms. This is a predicted mechanical property of the chosen weights once their values are inspected. Two disagreement confidences of .44318 outweigh one agreement confidence of .81250, so the 2-to-1 direction cannot flip. The null communication contrast exposes a modelling limit. Record this when designing future strength variation.

## Scope and reproduction

Confidence affects execution only through specified sizing and communication rules. Realized order sizes need not match by episode despite matching means. The impact parameter controls quote responsiveness and is not a full market liquidity model. Terminal pricing error in a one-episode synthetic maker market does not measure systemic instability. Human or empirical validation remains open.

Run `node scripts/convergence.mjs verify` and `python scripts/reference_convergence.py`. [Results and archived mechanism traces](../results/convergence-confirmatory.json) · [Learning guide](../docs/convergence-learning.md). Scientific implementation, execution and writing were AI-assisted.
