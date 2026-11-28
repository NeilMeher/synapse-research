# MORPHEUS adaptive trust development

`morpheus-adaptive-development-001` · synthetic development evidence B

The frozen study used 16 shared 64-step random histories per environment and five environment realizations, giving 80 environment-history pairs. The six policies were static, cumulative Beta counts, the last eight audits, two EWMA rates (.15 and .35), and an assumed two-regime Markov filter. All compared decisions within an environment used identical reports and audits. The environments also share underlying draws, so 80 environment-history pairs do not constitute 80 independent seeds. The policy sees contemporaneous reports and only audits whose arrival has occurred. Truth and simulated source regime remain hidden. A fixed alternative source is 69% reliable, so the action follows it on disagreements when estimated reliability of the changing source is at or below 69%. The Markov filter accounts for original report timestamps. The simpler estimators update in audit arrival order. [Frozen configuration](adaptive-trust/development.json) · [Manifest](evidence/morpheus-adaptive-development-001/manifest.json)

## Incorrect decisions over the full 1,024 steps per environment

| Environment | Static | Cumulative | Rolling | EWMA .15 | EWMA .35 | Markov |
|---|---:|---:|---:|---:|---:|---:|
| Stationary .86 | 132 | 187 | 166 | 182 | 186 | 180 |
| Abrupt drop to .22, then restoration | 358 | 314 | 279 | 264 | 250 | 257 |
| Gradual drift to .22, then restoration | 248 | 276 | 235 | 239 | 235 | 242 |
| Abrupt failure, 60%-accurate audits | 358 | 292 | 275 | 278 | 277 | 284 |
| Abrupt failure, more frequent long delays | 358 | 320 | 298 | 278 | 273 | 274 |

For the abrupt failure and restoration, EWMA .35 reduced overall loss by 108/1,024, or 10.55 percentage points. Its paired per-history loss-count difference ranged from −13 to +2. It reduced errors during the failure window from 271/352 to 124/352 but raised errors in the ensuing 12-step recovery window from 23/192 to 30/192. Cumulative trust raised recovery errors further to 51/192. In the stationary environment all five updating policies made more errors than static. Under gradual drift the cumulative rule made 28 more errors than static. Under noisier audits the Markov policy's advantage fell from 101 to 74 fewer errors. Under the longer-lag setting the advantage fell to 84 fewer errors. These are descriptive development results.

The uncorrected rolling, cumulative and exponential rules track the **observed audit rate**, which shrinks toward one half when audit accuracy falls. The Markov model declares an 80%-accurate audit channel and therefore misspecifies the 60% environment. Comparing the resulting deployed rules in this development can identify sensitivity to those assumptions. It cannot identify whether model class, audit correction, or timing accounts for all differences between policies. Fixed transition schedules are also outside the assumed Markov generating process. Only one competing source, symmetric decision costs and one routing threshold were used. There is no tuned winner or held-out inference.

## Checks and next decision

Run `node research/adaptive-trust/development.mjs verify` and `python -B research/adaptive-trust/development-reference.py`. The independent reference rebuilds the random histories and every one of 30,720 decisions using separate random-word, exponential and backward-likelihood calculations. The original local generation took about 71 milliseconds, excluding process startup. The full archive includes audits even when their arrival falls beyond the decision horizon.

The confirmatory design should explicitly separate observation-channel correction from the memory mechanism. Use a new seed and common per-history draws with locked static, cumulative, rolling, EWMA and Markov settings. Freeze a primary full-history decision-loss contrast on abrupt failure/restoration before drawing new histories. Measure clean and restoration loss separately. Register audit-noise calibration and model-misspecification comparisons separately from selection. Review the routing threshold and audit budget prospectively. No confirmatory histories have been generated for MO2.
