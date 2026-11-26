# CONVERGENCE learning and independent review

The chain joins a matched ECHO report, a MIRAGE probability conditional on another hint, and the REFLEX order and cash/asset ledger. Start with q=.65 and hint reliability .70. Agreement probability is .65×.70+.35×.30=.56. Conditional correctness is .455/.56 when the reports agree. For disagreement it is .195/.44. Verify why a style flag high on .56 of tasks supplies the same expected order size as thresholded calibration. The style flag is independent of the signals. Realized order sizes can correlate across agents even when means match.

Read engine/convergence.mjs in order. The task contains a truth bit for generating observations and scoring outcomes. The order decision sees reports and their reported probabilities. Its size mapping is part of the model, so confidence has no direct financial effect without that rule. The fixed arm requests one unit. Communication ablations change choices via equal or confidence-based neighbour weights. Confidence refers to the original report even after an action changes.

1. Open the archive and inspect an order in two arms. Compare the known synthetic truth, report, forecast, quantity, executed ordinals and midpoint change. Explain any differences.
2. Predict the first unit's fill price and fee from the independent REFLEX ledger. Verify the next quote using the maker inventory movement. Check cash and asset conservation.
3. Derive the paired interaction as (beta calibrated − shared calibrated) minus (beta style − shared style). Explain why each draw is a single episode, with reports and order steps dependent within it.
4. Run the separate reference and deterministic reproduction. Decide what evidence would justify studying longer-horizon volatility or contagion. A small static-market pricing error is a different outcome.
5. Design a blinded extension that changes whether hint reliability is known to forecasts and controls the mean submitted quantity, while keeping initial capital and information budgets fixed.

Independent human reproduction remains open.
