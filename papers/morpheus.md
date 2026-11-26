# MORPHEUS · Provenance, Revision, and Corruption in Artificial Memory

Synthetic computational benchmark · Independent human review pending

## Question and method

Can provenance-aware memory systems preserve correct decisions and persistent goals more effectively than conventional retrieval systems when exposed to contradictory, incomplete, or misleading memories? We evaluate eight deterministic memory architectures (`stateless`, `full_history`, `recency`, `keyword`, `episodic`, `provenance`, `event_sourced`, `semantic_hash`) and four ablations (`no_provenance`, `no_temporal`, `no_revision`, `no_confidence`) at retrieval budget $K = 4$ across 400 paired 16-step synthetic histories in `clean` and `corrupted` regimes. Ground truth is evaluated separately using only non-corrupted events with `eventTime <= step`, preventing future leakage. This study models artificial provenance metadata and does not claim equivalence to human neurological or psychological memory disorders. [Protocol](../research/morpheus-confirmatory.md) · [Artifacts](../results/morpheus-confirmatory.json)

## Prespecified results

| Confirmatory contrast (provenance minus keyword, $K=4$) | Estimate | Bonferroni-adjusted 95% CI |
|---|---:|---:|
| Corrupted regime decision accuracy | +27.39 pp | +25.85 to +28.93 pp |
| Clean regime decision accuracy | −11.61 pp | −12.46 to −10.76 pp |

In the `corrupted` regime, `keyword`, `full_history`, and `semantic_hash` achieved `61.33%` decision accuracy (`34.37%` goal preservation, `46.13%` adaptation accuracy, `0.2850` Brier). `recency` fell to `56.19%` (`30.50%` goal preservation, `0.3036` Brier), and `episodic` reached `73.61%` (`34.37%` goal preservation). `provenance` and `event_sourced` reached `88.72%` decision accuracy, `100.00%` goal preservation, `100.00%` adaptation accuracy, `86.57%` recovery after corruption, and `0.1107` Brier.

## Negative finding and mechanism

In the `clean` regime, `keyword`, `full_history`, `episodic`, and `semantic_hash` achieved `100.00%` decision accuracy (`0.0079` Brier), whereas `provenance` and `event_sourced` scored `88.39%` (`−11.61 pp`, `0.1139` Brier). Inspection of the scoring rule explains this negative trade-off: `verified_correction` records carry a static trust premium (`evidenceClass` + `confidence`) larger than the `0.002 * eventTime` recency term, so an older `verified_correction` outranks a newer `direct_observation` that updates a fact without an explicit `supersedes` link. Removing provenance weights (`no_provenance`) degraded Brier from `0.1107` to `0.1662` in the `corrupted` regime and from `0.1139` to `0.1673` in the `clean` regime.

## Reproduction

Run `npm test`, `python scripts/reference_morpheus.py`, and `node scripts/morpheus.mjs verify`. [Manifest](../results/morpheus-confirmatory.manifest.json) · [Learning guide](../docs/morpheus-learning.md)
