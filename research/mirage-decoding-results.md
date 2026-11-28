# MIRAGE 004 · Does sampling recover reasoning diversity?

**mirage-empirical-decoding-004 · Registered actual-model evidence · 28 November 2026**

The pinned SmolLM2-135M-Instruct Q4_K_M CPU configuration completed 192 actual generations on a fixed 16-task subset of MIRAGE 002, with 183 scorable and nine abstentions. Sixteen development observations and four Vulkan device-probe results remain separate. The evaluated questions used the matched-neutral-text condition and original reference mapping.

## Sampling result

| Outcome | Answer-first greedy | Temperature 0.3 | Temperature 0.7 | Confidence-first greedy |
| --- | ---: | ---: | ---: | ---: |
| Scorable / planned | 16 / 16 | 80 / 80 | 80 / 80 | 7 / 16 |
| A among answered | 16 / 16 | 74 / 80 | 53 / 80 | 3 / 7 |
| Correct per planned | 25.00% | 23.75% | 23.75% | 6.25% |
| Mean expressed confidence | 59.31% | 61.61% | 56.16% | 10.00% |
| Calibration gap | +34.31 pp | +37.86 pp | +32.41 pp | −4.29 pp |
| Brier loss among scorable | 0.46607 | 0.42478 | 0.38144 | 0.21286 |
| Error-positive AUROC | 0.35417 | 0.55263 | 0.52761 | 0.41667 |

The registered temperature 0.7 minus 0.3 contrast was **−26.25 percentage points in A selection** across all 16 canonical tasks, with a 95% within-family task bootstrap interval of **−38.75 to −15.00 pp**. Full-plan label-A bounds coincide because both stochastic arms had complete answer coverage. Mean within-task canonical entropy rose from **0.241 to 0.944 bits**, agreement of two distinct recorded draws fell from **86.25% to 50.00%**, and the number of tasks with more than one canonical answer rose from **5 to 14**. The task-specific estimates use five draws and have small-sample bias. The 95% paired accuracy-change interval was −13.75 to +13.75 pp. The exploratory Brier difference was −0.04334 with interval −0.15522 to +0.07297.

## Response format

Confidence-first produced nine abstentions in 16 requests. The two greedy formats agreed on canonical content in three of seven jointly answered pairs. The apparent Brier reduction among the seven scorable confidence-first results is selection-sensitive. If the nine unobserved losses can range from zero to one, the full-plan Brier difference versus answer-first lies between **−0.373 and +0.190**. Reversing the fields also changes the explicit ordering instruction. The comparison measures that package, with no estimate of a pure formatting effect or its interaction with temperature.

## Reproduction and research decision

The held-out design froze at `35e2a14c57fe76d7218fbff11a953199c719a0c1`. All registered outputs were preserved at `36733d19d9a2ea675acdf899d719576957b44ca5`. The independent reference checked the frozen 192 requests, exact rational scoring and the task bootstrap. Collection took 138.2 seconds at a median request latency of 0.692 second. Peak server working set was about 227 MiB. The extra cost was zero. [Protocol](mirage-decoding-protocol.md) · [Analysis artifact](../empirical/archives/mirage-empirical-decoding-004/analysis.json) · [Run manifest](../empirical/archives/mirage-empirical-decoding-004/manifest.json)

Temperature 0.7 cleared the registered coverage, dominant-label and response-diversity gates. Its accuracy was 23.75%, with a task-level interval of **8.75% to 40.00%**. It failed both the 35% practical accuracy margin and the requirement for the interval to clear the 25% chance reference. These findings support a distinction between sample diversity and successful reasoning on these tasks. ECHO ensemble inference and confidence-weighted consensus remain unexecuted. One checkpoint, one quantization and fixed task families limit transfer. Direct token probabilities were not collected. Independent human review and external replication remain pending.

The next task is to obtain authorized access to the pinned Qwen weights and run 12 separate capability controls under a verified CPU or separately registered GPU configuration. Then collect matched responses if the capability and resource checks support the protocol. [Qwen protocol](mirage-cross-model-protocol.md) · [Access and GPU evidence](mirage-phase3-access.md)
