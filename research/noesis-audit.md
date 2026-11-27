# NOESIS v1 evidence audit

The recovered pilot and confirmatory archives, run configs, frozen protocols and executable generator remain byte-identical to the archival snapshot. The generator commit is 3f2843f. Both studies are synthetic four-family benchmark comparisons. The protocols stay frozen as historical records. The living mathematical note and manuscript describe the executable study.

| Issue | Recorded behaviour | Interpretation |
|---|---|---|
| Initial measurement | The first measurement is exact at x=0 for all arms. The inference likelihood gives it the same 0.20 noise SD as the seven noisy measurements. | This is a common, undocumented misspecification. The comparison is valid as a benchmark of the shared simulator and working likelihood. Its posterior is not a calibrated posterior under the true observation model. |
| Generating scales | The independent generating coefficient SDs are 1, 1.2, 1.2. All candidate models use independent unit prior SDs. | The generating variance is 44% higher than prior variance for two coefficients. Evidence and recovery are specific to this mismatch. Its effect size is unresolved without a sensitivity experiment. |
| Prediction grid | The 41 fixed noiseless evaluation inputs contain every possible query input. | The reported in-domain RMSE mixes previously measured locations and unseen locations. It is neither a strictly held-out-input error nor extrapolation. Overlap can favor some query strategies. |
| Acquisition | Archived ID active_ig maximizes the posterior-weighted variance of predictive means. | Use model disagreement as the display label. True expected information gain integrates the reduction in model uncertainty over potential observations, including observation noise and predictive distributions. |
| RMSE and uncertainty | Active uncertainty 0.1203, uniform grid 0.1219, random 0.1525 and disagreement 0.2799. | These are descriptive means. No prespecified paired RMSE interval exists. |
| Primary inference | Both Bonferroni-adjusted family recovery contrasts include zero. | No demonstrated advantage against either passive baseline. This does not establish equivalence. |

## Verification

File integrity binds each archive to the recorded sources. The original JavaScript verifies deterministic reproduction. The replacement Python checker independently implements the 32-bit seed stream, Box–Muller generation, query selection, and Bayesian regression using observation-space Cholesky rather than a parameter-space matrix inverse. It reconstructs all 400 worlds, every arm's aggregate metrics, and both paired intervals in each run. It also matches the archived first trajectories, including measurements and model probabilities, for every arm. The separate implementation shares authorship with the recovery and is not human peer review.

No second NOESIS study was run merely to remove the null finding. A new protocol for actual mutual information or a matched-model sensitivity study should include noisy initial observations, explicit coefficient priors, disjoint interpolation inputs and separate extrapolation endpoints. The manual browser challenge is educational and uses its own explicitly labelled data-generating setup. [Literature](noesis-literature.md) · [Manuscript](../papers/noesis.md)
