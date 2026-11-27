# POLIS 2.0 · Payment, surplus value and need satisfaction

## Research question

Does the gap between joint-gain and payer-gain decision rules persist when the contract settles on delivery? The original [POLIS](../papers/polis.md) compared choice objectives under prepayment. This study crosses the payment mechanism with surplus valuations while preserving the physical economy, original production policy, and matched potential observations. Atomic delivery is an imposed computational rule. [Repeated cooperation](https://doi.org/10.1126/science.7466396) · [Institutional antecedents](https://doi.org/10.1017/CBO9780511807763)

## Design and mechanism

At delivery probability p and surplus value s, prepayment gives expected unit gains (3p−s, 3−ps). Payment on delivery gives both agents p(3−s). The latter yields identical buyer and joint decisions under the common tie draw. Deliberate failure leaves both inventories unchanged under that contract. Prepayment preserves the first transfer. The physical totals reconcile each day under both. Four policies receive matched initial stocks, technology, labor, meetings and potential draws. Their records can diverge through their earlier choices.

The 32-world pilot set the sample size. A new seed produced 160 independent stress trajectories with 24 matched arms each. Primary inference compares the joint-minus-material need-satisfaction effect at s=2 under delivery minus prepayment.

| Surplus value | Joint minus payer gain under prepayment | Under payment on delivery |
| ---: | ---: | ---: |
| 1 | +1.51 pp | 0.00 pp |
| 2 | +9.60 pp | 0.00 pp |
| 3 | +12.87 pp | 0.00 pp |

The interaction is **−9.60 percentage points**, with paired 95% interval **−9.89 to −9.31 pp**. The delivery equality follows analytically under matched choices. At s=2, five prepayment agent-world observations consumed less under joint gain than under payer gain. Under delivery there were zero such losses in these arms. Joint and fixed-prior material decisions yielded matching physical outcomes in all 160 original-valuation prepayment worlds, and in each delivery cell. The two policies diverged in the prepayment s=3 cell, where payer gain is negative while joint gain ties.

## Verification and scope

The independent rational Python implementation reconstructed all 192 worlds and 24 arms per world, including exact ledgers, individual loss metrics and the paired interaction. The confirmation took 2.951 seconds in the archived environment. Original POLIS runs stay unchanged. The interaction compares the modelled mechanisms; actual contracts, strategic delivery effort and human welfare remain separate questions. Human scientific review is pending.

[Frozen protocol](../research/polis2-confirmatory.md) · [Results](../results/polis2-confirmatory.json) · [Manifest](../results/polis2-confirmatory.manifest.json) · [Audit](../research/polis2-audit.md)
