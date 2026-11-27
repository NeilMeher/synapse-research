# EPISTEME — From discovery to validation

## Abstract

We connected a Bayesian hidden-law selector to two reserved, independently measured residual checks. In 1,200 synthetic tasks per regime, adaptive predictive-mean disagreement increased correct provisionally accepted claims by 4.00 percentage points when the candidate dictionary contained the true family. When every listed family was wrong, adaptive selection increased incorrect proposals by 4.25 points. After both gates, 11.50% of the disagreement tasks in that regime still ended in a wrong named claim.

## Methods

Each hidden law had three independent unit-normal coefficients. The closed regime sampled uniformly among four candidate families. The misspecified regime generated a sine-plus-quadratic law. Every observation used Gaussian noise with known standard deviation 0.20. Each policy had six discovery queries, including the same noisy observation at zero, and the same two reserved blocks of four measurements. Random selected without replacement, and disagreement chose the unmeasured input at which posterior-weighted predictive means spread most. Each run used the complete ordered discovery path. Observation location can depend on the visible history. The conditional likelihood multiplies the Gaussian density at each chosen location. Policy probabilities conditional on that history and independent randomization cancel from candidate ratios.

A decision rule proposed the leading family if its posterior was at least 0.70. Its posterior-mean predictor was frozen before the reserved blocks. Each block tested that predictor's four means under the sharp known-variance Gaussian null. Both blocks had to pass at p ≥ 0.05 for provisional acceptance. The observed family is compared with simulation truth, and absence of a final family is the correct abstention outcome outside the dictionary. RMSE uses a separate set of noiseless, in-domain sites that never enter discovery or the two checks.

## Findings

| Frozen paired comparison, disagreement minus random | Estimate | Adjusted interval |
| --- | ---: | ---: |
| Correct final named claim, in library | +4.00 pp | +0.41 to +7.59 pp |
| False proposal, outside library | +4.25 pp | +1.78 to +6.72 pp |

In the closed library, random and adaptive policies made correct final named claims in 38.75% and 42.75% of tasks. They made incorrect final claims in 1.92% and 2.75%. Mean RMSE was 0.1907 and 0.1918. Outside the library, false proposals were 83.75% and 88.00%, false final claims were 12.17% and 11.50%, and mean RMSE was 0.7184 and 0.6764. Those secondary contrasts are descriptive. The mean first confidence step, with seven assigned to tasks never crossing the threshold, was 4.67 versus 4.08 in library and 3.78 versus 3.58 outside the library.

## Limits and reproducibility

A model posterior is conditional on the supplied library. High posterior weight can coincide with bad absolute fit. Passing either check means the discrepancies were compatible with the sampled noise at the tested points. Four fixed measurements may miss errors elsewhere. Even a correct family can fail its check because the fitted coefficients produce a poor prediction. The gates reuse the same frozen predictor and apply separate observations. The simulated condition, sharp check and result do not establish a universal discovery benefit or valid claims in a new domain.

An independent Python implementation uses sequential Gaussian coefficient updates and reconstructs all discovery selections, posterior replays, gate decisions and aggregate metrics. JavaScript also reproduced both archived outputs. The 2,400-task confirmatory simulation ran in 1.189 seconds with an observed 53,628,928 bytes RSS. The 200-task pilot was archived separately. Human review is pending.

[Confirmatory results](../data/episteme-confirmatory.json) · [Manifest](../data/episteme-confirmatory.manifest.json) · [Frozen protocol](../research/episteme-confirmatory.md)
