# ALPHA DECAY · Endogenous Strategy Crowding in a Deterministic Maker Market

Synthetic computational study · Independent human review pending

## Question and mechanism

Under what specified market mechanisms does widespread adoption of an initially profitable trading strategy reduce its own net returns? Using the validated `engine/market.mjs` integer maker-taker rules with constant total market capital (`960,000` cash and `96` asset units across 12 traders, plus maker inventory), we evaluate 300 paired 8-round synthetic episodes across adoption levels (`1, 3, 6, 9` `fundamental_value` adopters), a concentrated-capital arm (`3` adopters with 75% of trader capital), and a zero-impact control (`impact = 0`). Alpha is defined relative to the non-adopter portfolio return within the same episode (`alpha = netReturn_adopters - netReturn_nonAdopters`). No empirical equity data or guaranteed investment returns are implied. [Protocol](../research/alpha-decay-confirmatory.md) · [Artifacts](../results/alpha-decay-confirmatory.json)

## Prespecified results

| Confirmatory contrast (9 adopters minus 1 adopter) | Alpha difference | Bonferroni-adjusted 95% CI |
|---|---:|---:|
| Impactful market (`impact = 4`) | −0.4100% | −0.4442% to −0.3757% |
| Zero-impact control (`impact = 0`) | −0.0012% | −0.0388% to +0.0364% |

Under `impact = 4`, adopter alpha declined monotonically from `+0.4473%` (`1` adopter, net `+0.3808%`) to `+0.4454%` (`3` adopters), `+0.3120%` (`6` adopters), and `+0.0373%` (`9` adopters, net `+0.0062%`, Sharpe-like `0.292`). Concentrating 75% of trader capital in `3` adopters (`impact4-concentrated-3`) reduced alpha to `+0.0903%` (net `+0.0227%`), isolating deployed capital rather than headcount alone as a driver of crowding. Under the `impact = 0` control, alpha remained flat (`+0.4391%` vs `+0.4379%`, interval spanning zero), confirming that endogenous quote movement—not a hardcoded penalty—produces the observed decay.

## Reproduction

Run `npm test`, `python scripts/reference_alpha_decay.py`, and `node scripts/alpha-decay.mjs verify`. [Manifest](../results/alpha-decay-confirmatory.manifest.json) · [Learning guide](../docs/alpha-decay-learning.md)
