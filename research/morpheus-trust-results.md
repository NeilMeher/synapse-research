# MORPHEUS technical report · Adaptation under delayed source verification

**Class B synthetic computation.** The experiment froze at `ca71901640e6c78cfbe7590e1ea287225dc1bc27`. Each comparison used the same 480 synthetic 64-step histories and common source-event, delivery, and audit draws. The separate four-history development fixture checked matching. Independent Python rebuilt 1,920 history–arm evaluations and matched the per-history counts and paired intervals. [Frozen protocol](morpheus-trust-protocol.md) · [Result manifest](evidence/morpheus-dynamic-trust-001/manifest.json)

| Comparison of rolling trust with identical fixed age attenuation | Rolling accuracy | Fixed accuracy | Paired difference and 95% interval |
| --- | ---: | ---: | --- |
| Source burst, three-step audit delay, primary | 56.67% | 27.23% | +29.43 pp [28.26, 30.61] |
| Source burst, eight-step audit delay | 49.24% | 27.23% | +22.01 pp [20.87, 23.15] |
| Legitimate state changes in clean histories, three-step delay | 73.06% | 75.02% | −1.97 pp [−2.84, −1.10] |
| Eight steps after source restoration, three-step delay | 71.25% | 85.00% | −13.75 pp [−15.89, −11.61] |
| Full burst-containing history, three-step delay | 70.12% | 60.28% | +9.84 pp [9.20, 10.48] |

The primary rolling policy issued decisions on 99.90% of the burst window. Its gain remains a full-plan reduction in incorrect or missing decisions. The cumulative-feedback comparator achieved 51.24% during the burst and 73.98% during recovery. Recency alone achieved 78.80% around clean legitimate state changes. Intervals outside the single primary comparison are descriptive. Full-history averages can conceal opposite effects at onset and recovery.

## Explanation and counterexample

The policy keeps the latest in-window report from each of three sources. Its belief score sums source log odds with age attenuation. Reliability is learned from delayed audits of whether an earlier report matched the latent state at its event time. This does not expose the current state to the estimator. An independent truth stream supplies the verification labels under an optimistic assumption.

Consider the most trusted source with prior strength four and clean reliability .90. After a full window of eight audits, it gets a positive report weight only when (3.6+s)/12>.5, so at least three successes are necessary. A recently restored source can remain neutral until new successes arrive and displace burst-era failures. The fixed policy starts using restored reports immediately. In this simulation the overall gain and recovery loss coexist. The derivation explains a mechanism available to the estimator. It does not prove that the recovery gap is attributable to a single component throughout the full stochastic traces.

The clean state-change contrast provides a check against a simpler claim that learning always improves adaptation. Better time alignment and reliable source verification are separate interventions. Static age attenuation is the primary comparison because the dynamic policy has the same age rule and candidate reports. Known clean priors favor both policies. The rolling update also assumes recent audit outcomes stand in for source quality and clips below-chance estimates to neutral. Persistent adversarial inversion, correlated errors, selective verification and audit mistakes were outside this frozen experiment. A dependence-aware or change-point estimator needs a new design.

## Owner review

- Describe which state a delayed audit verifies, and why it must not reveal the decision-time state.
- Derive the first positive log-odds contribution after consecutive failures, and test what happens if the audit delay rises.
- Explain why the paired unit is the entire history and why the recovery loss remains visible even with a positive full-history effect.
- Identify an observation process in which the dynamic policy should lose, such as selectively auditing only the reports a policy uses.

The code-level candidate for ECHO or CIVILIZATIONS is the map from a verified report's past correctness to the next retrieval weight. Transfer requires a matched feedback channel, the same interpretation of correctness and testing under correlated streams. This release establishes the MORPHEUS result inside its simulator. External human review and the transfer remain pending.
