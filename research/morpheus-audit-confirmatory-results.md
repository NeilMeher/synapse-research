# MORPHEUS confirmatory audit correction and adaptive memory

Study `morpheus-adaptive-reliability-confirmatory-002` · registered synthetic evidence B

In 384 fresh abrupt-failure and restoration histories, an event-time EWMA with known audit-channel correction made **1,398 fewer errors** than an equally corrected cumulative estimator. Over 24,576 decisions per arm, the difference in mean history loss was **−5.69 percentage points**, with a 95% paired interval of **−6.29 to −5.09**. The contrast holds the audit model and observed records fixed. It compares temporal weighting policies, including how each retains its starting estimate. [Frozen protocol](morpheus-confirmatory-protocol.md) · [Manifest](evidence/morpheus-adaptive-reliability-confirmatory-002/manifest.json) · [Structured results](evidence/morpheus-adaptive-reliability-confirmatory-002/summary.json)

## Protection, recovery and stability

All entries are incorrect decisions. Each row uses the same 384 histories for policy comparisons and the same 64 decision steps, unless the window is specified.

| Environment and window | Decisions per policy | Fixed .86 | Known-channel cumulative | Known-channel EWMA |
| --- | ---: | ---: | ---: | ---: |
| Burst, full history | 24,576 | 9,002 | 8,407 | 7,009 |
| Burst, failure | 8,448 | 6,672 | 4,904 | 3,687 |
| Burst, 12-step restoration | 4,608 | 667 | 1,251 | 1,157 |
| Healthy stationary, full | 24,576 | 3,534 | 3,986 | 4,631 |
| Gradual drift, full | 24,576 | 6,407 | 6,665 | 6,392 |
| Burst with .60 accurate audits, full | 24,576 | 9,002 | 8,185 | 7,779 |
| Burst with more six-step delays, full | 24,576 | 9,002 | 8,598 | 7,251 |
| Burst with chance audits, full | 24,576 | 9,002 | 9,002 | 9,002 |

Relative to corrected cumulative estimation, corrected EWMA saved 14.41 points of error during failure [−16.09, −12.72] and 2.04 during the restoration window [−3.22, −0.86]. Relative to fixed trust, that same EWMA incurred **490 extra errors after restoration**. It also increased stationary loss by 4.46 points [4.03, 4.89] versus fixed trust and by 2.62 points [2.22, 3.03] versus corrected cumulative. Drift and .60-accurate audits reduced the EWMA advantage against the same cumulative comparator to 1.11 and 1.65 points respectively. The larger-delay comparison was −5.48 points. These are separate, unadjusted secondary intervals.

## Observation correction is not a decision policy

Within the burst environment, correcting EWMA added 142 errors compared with naive EWMA, while correcting cumulative added 317. The prespecified interaction was **−0.71 percentage points** [−1.14, −0.29]. Correction widened the relative EWMA advantage while increasing full-history loss for both compared policies. With .60 audits, naive EWMA also beat the correctly inverted EWMA in full-history errors, 7,402 versus 7,779. The deliberately misspecified .90 correction yielded 7,473. We did not select a new channel, threshold or learning rate from these observations. The decision threshold and noise both shape this outcome.

For audit accuracy \(\eta\), let \(d=2\eta-1\) and \(m=(1-\eta)+dq\). An independently flipped audit \(A\) is Bernoulli with rate \(m\). Under known \(\eta>.5\), \(A^*=(A-(1-\eta))/d\) has

\[
E[A^*]=q, \qquad \operatorname{Var}(A^*)=m(1-m)/d^2=q(1-q)+\eta(1-\eta)/d^2.
\]

The last identity follows from conditional variance given the true report outcome. Under stationary independent audits and constant \(\alpha\), the unclipped EWMA variance is \(\alpha\operatorname{Var}(A^*)/(2-\alpha)\). With \(q=.20,\eta=.60\), the audit mean is .44 and the transformed observations are −2 and 3. Their variance is 6.16. At \(\alpha=.35\), stationary variance is \(98/75\). Clipping each observation would turn those values into 0 and 1, returning mean .44 and bias +.24. The experiment clips only the final value at routing. This yields a valid bounded decision input and leaves the underlying accumulation untruncated. Clipping cannot change routing at the interior .69 cutoff.

With assumed accuracy \(\eta'\), expected corrected reliability is \(.5+[(2\eta-1)/(2\eta'-1)](q-.5)\). One audit rate identifies this product relation only. At .50 the audit carries no information about \(q\), and inversion is undefined. The cumulative, rolling and EWMA known-channel arms skip those audits. Chance-audit Markov still changes its decisions because the declared transition model moves its reliability estimate below the threshold at time 10 even with no informative emissions. That result comes from its assumed latent dynamics. It does not establish that chance audits helped.

Event-order minus arrival-order EWMA differences were +0.05 points in burst [−0.19, +0.29], +0.11 with lower accuracy [−0.14, +0.35], and −0.12 with more long delays [−0.37, +0.13]. Timing correction is logically necessary to interpret a Markov emission. The tested EWMA route choices offered little precision for a performance difference from sorting currently visible audits. Markov versus EWMA had bundled differences in noise handling and dynamical assumptions. The known-channel Markov had 140 fewer burst errors overall than known-channel EWMA and 75 more after restoration. The data generator uses deterministic regime timing, so Markov's transitions were misspecified by design.

## Verification and scope

The protocol froze at `36b2ea4d4998335970c05ecc67b74b3efc6cb5f2`. The runner archived 2,304 environment-history realizations and 2,801,664 decisions across 19 policies. The independent Python reference reconstructed the random stream, report and audit history, every route and loss, and all 17 paired analysis rows. It used backward probabilities for the hidden state, exact small path enumeration for timing, and an absolute numerical tolerance of \(10^{-12}\). Two distinct audit events arriving together were checked alongside out-of-order and beyond-horizon arrivals. Environments share random draws and have 384 histories each, so the 2,304 realizations do not constitute independent cross-environment samples.

This isolates correction and timing inside matched estimator families. It does not separate all assumptions between exponential, rolling and latent-state models. The audit accuracy in the known arm is an external parameter supplied by the simulator. Field use would require independent calibration or additional joint observations. Fixed costs, tell-tale regime schedules, conditional independence and fixed alternatives delimit the result. The strongest contribution is the controlled computational separation and the observed recovery, stationarity and correction trade-offs. Standard misclassification inversion, exponentially weighted moments and hidden-state filtering predate the study. Independent human review remains pending. [Primary literature and protocol](morpheus-confirmatory-protocol.md#prior-work)
