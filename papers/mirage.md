# MIRAGE · Confidence on matched decisions

Synthetic computational benchmark · Independent human review pending

## Question and method

Does an independent expression of confidence provide the same error detection and calibration as a cue-based estimator? We use binary synthetic decisions and three noisy cue-quality tiers. Every policy evaluates the same selected primary answer. A second cue is informative in the normal regime and has reversed reliability in the misleading regime. There are no human or LLM participants. Confidence denotes the probability of correctness of that already selected answer. Distinguishing calibration from discrimination follows the definitions discussed by [Fleming and Lau](https://pmc.ncbi.nlm.nih.gov/articles/PMC4097944/). Proper scoring uses the [Brier score](https://doi.org/10.1175/1520-0493(1950)078%3C0001:VOFEIT%3E2.0).

A 350-case exploratory pilot informed a frozen design with 3,000 normal training cases and 6,000 matched evaluation cases per regime from separate seeds. The five estimates are a constant training rate, an unrelated style flag, a declared-quality Bayes forecast, a six-cell estimator with Laplace smoothing, and an oracle that knows the true cue reliabilities. The independent script enumerates the finite observation states to verify Brier and log loss. [Protocol](../research/mirage-confirmatory.md) · [Artifacts](../results/mirage-confirmatory.json)

## Results

All policies and both regimes had identical first-order accuracy of 71.97%. In the normal regime, style Brier was 0.2296 and trained Brier was 0.1743. Their paired difference was 0.05525 with Bonferroni interval 0.04917 to 0.06133. In the misleading regime, style Brier stayed at 0.2296 and trained Brier worsened to 0.2202. Their difference shrank to 0.00934 (0.00338 to 0.01529). Error AUROC of the trained estimator fell from 0.7355 to 0.4894. Its ranking on the shifted regime was near chance in this synthetic sample. The oracle's shifted error AUROC was 0.7012 and Brier was 0.1809. The constant benchmark achieved shifted Brier 0.2017 while remaining unable to rank errors.

The contrast illustrates why aggregate calibration, ranking and first-order accuracy need different metrics. A constant can have low average calibration error despite offering no selective judgment. The learned estimate uses available training features and did not learn to recognize the shift. The oracle is an upper-information comparison, with no current truth bit in inference. The style baseline operationalizes an unrelated confidence signal. These results assess functional reporting under a known cue process. They do not establish claims about consciousness, human self-awareness or LLMs.

## Reproduction

Run `node scripts/mirage.mjs verify` and `python scripts/reference_mirage.py`. The build serves the exact archived samples, reliability bins and risk-coverage points. [Run metadata](../results/mirage-confirmatory.manifest.json) · [Learning guide](../docs/mirage-learning.md)
