# ECHO confirmatory protocol v1

Frozen in Git after reviewing the exploratory pilot and before opening the confirmatory simulation. The pilot used 400 trials from seed 20261126. It completed in 144.12 ms with 52,150,272 bytes of observed process RSS. Its widest three-contrast margin was about 3.65 percentage points. Doubling the scale by a factor of 20 in task count projects the widest pilot-based margin to about 0.82 pp and runtime to about 2.9 seconds. The fixed 8,000 tasks therefore target roughly 1 pp Monte Carlo precision for the largest observed standard deviation. This is a precision calculation, with budget headroom, and has no human population power interpretation. The other endpoint effects and exact references were visible in the pilot.

## Question and design

Can shared signal error reduce majority benefit, does one fixed influence structure reduce accuracy, and can a budget-matched verification rule improve it? H1 predicts diminished majority gain at high correlation. H2 predicts a loss under concentrated influence. H3 predicts higher accuracy after replacing dependent signals with independently sourced ones. For each, the scientific null in this simulator is an expected paired difference of zero or the opposite sign.

The unit is one synthetic task with binary truth. Generate 8,000 tasks with Mulberry32 seed 20261127 and no file, network, training or participant input. One task contributes one outcome per policy and correlation. Reuse its truth, conditional draws and fair tie draw across policies and correlations. Complete, ring and hub use fixed DeGroot weights and score the mean of their final beliefs. The weighted bounded-confidence ring is a negative control. Its fixed 0.2 radius preserves initially separated binary beliefs in this configuration. The setting 15 agents and reliability 0.68 is a design choice. Topology, correlation, belief rule and verification are treatments. The hub uses self-weight 0.75, leaves weight the hub at 0.5, and the experiment uses 12 rounds. Compare rho 0, 0.25, 0.50, 0.75 and 1.00.

A no-communication baseline averages individual correctness. Majority thresholds the initial mean. The naive Bayesian comparator assumes independence. Both source-aware Bayesian arms know the generator and the correlation and do not observe the latent shared-mode realization. At verification, replace the last three original slots with fresh independent signals at the same marginal reliability, keeping the total at 15. The intervention does not estimate a change in empirical fact-checking accuracy.

## Inference and stopping

The three confirmatory contrasts form one family. All are accuracy proportions. Their paired sample mean, sample standard deviation and two-sided normal interval with Bonferroni critical value 2.3939797998 are recorded. Positive direction was specified for all.

1. At rho=0 minus rho=.75, measure the change in majority gain over the average individual.
2. At rho=.75, compare complete minus hub DeGroot group accuracy after round 12.
3. At rho=.75, compare budget-matched verification minus unverified source-aware Bayesian accuracy.

Intervals excluding zero support the prespecified direction when the lower endpoint is above zero. Normal approximations are checked against the size of the fixed task sample and exact reference means. No independent trial is removed. Stop at 8,000 or fail on the 30-second limit, invalid config, non-finite outcomes, inconsistent output, or analytical validation failure. No interim stopping on effect size. Reproduce digests and compare each estimated mean and contrast against the independent Python reference. Toggle rho through its defined range and examine Brier loss and all policy accuracies as descriptive sensitivity checks. Complete/ring equality and independent/shared endpoints are invariants. Descriptive pointwise normal intervals carry no simultaneous coverage claim. No holdout split is necessary because none of these policies fits data.

This is a procedure check and controlled comparison within one specified joint model. Shared causal dependence, influence shape and knowledge of the generator limit generalization. Select the first task only for archived trajectory comparison and publish all aggregate conditions.
