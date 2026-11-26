# Shared evidence, influence concentration and verification in ECHO

Initial SYNAPSE research manuscript · Synthetic computational experiment · Human review pending

## Abstract

We compare nine individual, voting, network and Bayesian policies on 8,000 paired synthetic binary decisions across five shared-error correlations. Increasing correlation from 0 to 0.75 reduced majority voting's gain over individual accuracy by 18.9 percentage points. At correlation 0.75, a complete network outperformed a concentrated hub by 6.3 pp, and replacing three correlated-source report slots with equally reliable independent signals improved source-aware Bayesian accuracy by 6.0 pp. An independent finite enumeration agreed with the Monte Carlo calculations within the specified diagnostic tolerances. Results apply to one stylized joint model.

## Introduction and related work

DeGroot averaging makes it possible to measure consensus independently of correctness. Golub and Jackson characterize when independent signals aggregate effectively under diffuse social influence. Hegselmann and Krause provide a confidence threshold that can instead preserve divergent opinions. Ladha and Kao et al. address dependent cues or votes directly. ECHO contributes a reproducible controlled comparison and public teaching interface across these mechanisms. The preliminary review supports no priority claim. See [primary sources and comparison](../research/echo-literature.md).

## Questions and hypotheses

H1 predicts that shared correctness correlation reduces majority's accuracy gain over individuals. H2 predicts that an influence-concentrated hub underperforms a complete network. H3 predicts that a verification policy with three replacements improves accuracy under correlated reporting. The null for each model contrast is an expected paired effect of zero or the opposite sign.

## Model, dataset and design

Each task has Bernoulli(1/2) truth and 15 reports at reliability 0.68. A mixture uses a shared correctness bit with probability rho and independent bits otherwise. DeGroot runs for 12 rounds on complete, ring and hub topologies. The hub self-weight is 0.75; leaves give it weight 0.5. The bounded-confidence ring uses a radius of 0.2. Individual decisions, majority, naive Bayes and source-aware Bayes are controls. The verification policy exchanges three report slots and preserves marginal reliability and total signal count. No third-party dataset, training, empirical model or human subject enters the design. See [mathematical formulation](../research/echo-mathematics.md) and [protocol](../research/echo-protocol-confirmatory.md).

The 400-task exploratory pilot used a separate seed. The protocol was committed before generating 8,000 confirmatory task draws. Each draw is matched over policies and correlation values. Paired task differences are summarized using sample variance and a Bonferroni-adjusted family of three normal intervals. Secondary estimates use pointwise intervals and are descriptive. The finite reference conditions on truth and enumerates binomial counts and hub correctness independently.

## Results

| Confirmatory contrast | Estimated effect | Bonferroni-adjusted interval | Exact model expectation |
|---|---:|---:|---:|
| Majority gain lost from rho 0 to 0.75 | 18.86 pp | 18.29 to 19.43 pp | 18.67 pp |
| Complete minus hub at rho 0.75 | 6.30 pp | 5.57 to 7.03 pp | 6.22 pp |
| Matched verification gain at rho 0.75 | 6.04 pp | 5.19 to 6.89 pp | 5.87 pp |

All prespecified directional contrasts had adjusted intervals above zero in this simulator. At full shared error, majority exact accuracy is 68%; under independence it is 92.8871%. The exact check covered accuracy and Brier loss for all nine policies at each rho. Download the values and uncertainty from the [actual result file](../results/confirmatory.json) and [manifest](../results/confirmatory.manifest.json).

## Discussion and failure cases

Complete and ring preserve the same mean and decision. Their trajectories differ. In the default hub, the effective hub weight at round 12 exceeds one half. With symmetric binary initial beliefs this makes the hub signal decide the group result. Its exact accuracy stays at 68% across the entire grid regardless of other reports. The bounded-confidence rule at radius 0.2 also preserves initial disagreement and retains the majority decision. At full dependence, an erroneous shared report makes all original agents agree on the wrong answer. These properties explain the controlled results and motivate varying initial opinion scales, hub weights and dependence structure in future work.

## Limits and future work

The continuous family controls one kind of binary dependence and cannot identify the effect of arbitrary pairwise correlation. Bayesian agents know the correctness model and the provenance of replacements. Policy and topology advantages may change with heterogeneous reliability, partial metadata, persistent bias or costly verification. Future work should test distinct joint distributions with matched marginals and correlations, additional networks, and causal changes to communication rules. Empirical claims are unresolved.

## Reproducibility and contribution disclosure

Run `npm test`, `npm run reference`, then `npm run verify` using the pinned runtime. Figure and table inputs are field-level values in the confirmatory result file. Code, design formalization, computation, analysis and manuscript were AI-assisted. Neil Meher proposed the programme and ECHO lab. Independent human review and external peer review are pending. [Contribution register](../CONTRIBUTION_REGISTER.md) · [Reproduction guide](../REPRODUCIBILITY.md)
