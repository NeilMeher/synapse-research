# What pairwise error correlation leaves unidentified

SYNAPSE · ECHO 2.0 · Synthetic computational study · Human review pending

## Question

Can equally reliable binary reports with the same pairwise error correlation yield different majority accuracy and extreme group failures? Prior work already proves underidentification and computes sharp exchangeable tail bounds. This study connects a concrete two-law example to calibrated forecasts, finite network weights, and verification costs. [Literature and novelty matrix](../research/echo2-literature.md)

## Design

An exploratory run used 500 paired tasks at n=15 and q=.68. The confirmatory protocol was committed independently of its output, with n=21, q=.65 and a new grid of rho values. It records the primary contrast at rho=.30 and the secondary analyses. The two exchangeable laws match individual accuracy and every distinct pair's error correlation. The shared-source mixture alternates between independent and wholly shared reports. The beta-binomial instead draws a common latent reliability and allows conditional report disagreement. Exact comparisons use the entire count distribution. A separate Python implementation uses rational rising factorials and exact moment arithmetic. The 16,000 paired samples per setting reproduce the target population with simulation error only.

## Primary and diagnostic outcomes

| Outcome at rho=.30 | Shared-source mixture | Beta-binomial |
|---|---:|---:|
| Exact majority accuracy | 84.10% | 70.34% |
| All 21 wrong | 10.50% | 0.95% |
| All 21 correct | 19.51% | 10.59% |
| Brier with correct likelihood | 0.10885 | 0.19248 |
| Brier using the other likelihood | 0.20415 | 0.27270 |

The primary exact difference was **−13.75 percentage points** (beta minus shared). Monte Carlo estimated −13.72 pp, with a pointwise 95% sampling interval of −14.55 to −12.89 pp. The shared-source law had both higher majority accuracy and more unanimous errors. The all-wrong rate alone does not characterize performance. The two laws agreed at rho=0 and rho=1, as expected. The beta-binomial had lower exact majority accuracy at all four interior points in the frozen grid.

Under the same first and second moments the sharp finite-exchangeable accuracy range was **36.05% to 93.95%**. The lower distribution has positive mass at K=0,10,21. The upper has positive mass at 0,11,21. These are feasible extremizers, not Monte Carlo uncertainty limits. At rho=0 each particular law is independent, while the moment-constrained feasible set also admits dependent laws with zero pairwise correlation.

## Secondary outcomes

- The two matched likelihood families selected the same majority decision at the primary cell, and using the other law worsened probability scores. The difference between confidence and classification is material. For instance, the beta-binomial's high-confidence error rate grew from 0.95% to 20.75% under the shared likelihood.
- A finite-time hub sweep distinguishes the network's communication weights from voting competence. For a hub self-weight of .75, the effective hub share exceeds .5 after the first round and its signal then determines the decision. Its accuracy is the single report's 65%. The complete and ring mean preserve majority under the same threshold.
- At .82 independent verifier reliability and .02 cost per replacement, among the prespecified budgets of 0–5, the shared-source law maximized synthetic utility at three replacements (0.89057). The beta-binomial maximized it at four (0.86086), a difference of just 0.00029 from three for the latter law. The ranking could change with cost, error losses and available information.

## Review and limitations

The rational reference checked every count probability, moments, sharp bound, forecast summary, hub accuracy, and verification utility. The matched samples passed simultaneous Hoeffding checks on all count cells. Financial, empirical, human or external LLM results are outside this study. Reporters have equal reliability, the truth is symmetric, and the verification sources are independent by design. Comparison proxies do not estimate causal effects of actual social or organizational networks. Independent human review is pending. [Audit](../research/echo2-audit.md)

## Reproduction

Use `npm test`, `python scripts/reference_echo2.py`, and `node scripts/echo2.mjs verify`. The exact outputs and Monte Carlo diagnostics are in the [confirmatory artifact](../results/echo2-confirmatory.json). The [manifest](../results/echo2-confirmatory.manifest.json) records the frozen commit, seed, input digests and resource measurements. [Protocol](../research/echo2-confirmatory.md) · [Derivations](../research/echo2-mathematics.md)
