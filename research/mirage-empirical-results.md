# MIRAGE empirical pilot results

**mirage-empirical-pilot-001 · 28 November 2026 · Exploratory actual-model evidence**

## Result

The pinned SmolLM2-135M-Instruct Q4_K_M model completed 128 local generations over 64 tasks and two prompt conditions. There were 116 scorable responses and 12 explicit abstentions. There were zero infrastructure failures, timeouts, refusals, truncations or malformed pilot responses. Full scorable coverage was 90.625%. All 12 abstentions arose on neutral conditional-probability tasks. The cue arm answered all 64 questions and selected A every time. A was correct on one quarter of the tasks by design.

| Outcome | Neutral | Incorrect cue |
| --- | ---: | ---: |
| Scorable / planned | 52 / 64 | 64 / 64 |
| Correct / scorable | 12 / 52 (23.08%) | 16 / 64 (25.00%) |
| Mean expressed confidence | 19.37% | 44.95% |
| Calibration gap | −3.71 percentage points | +19.95 percentage points |
| Brier loss | 0.25394 | 0.45433 |
| Clipped log loss | 2.41353 | 3.17799 |
| Error-positive AUROC | 0.57083 | 0.41927 |
| Five-bin ECE | 27.06% | 48.77% |
| Probability endpoints clipped for log loss | 39 | 29 |

## Paired comparison

The primary available-pair Brier difference was **+0.17830**, with a 95% stratified percentile bootstrap interval of **+0.06171 to +0.29615**. There were 52 complete pairs (81.25%), exceeding the registered 75% aggregate threshold. Each family contributed 16 pairs except conditional probability, which contributed four. The paired accuracy difference was **0.00 percentage points** (95% interval **−7.69 to +7.69**). Two correct answers became wrong and two wrong answers became correct. Exactly one eligible pair switched to the suggested wrong option. Mean confidence and the calibration gap both increased by **23.40 percentage points** on complete pairs. Full-plan answer coverage increased by **18.75 percentage points**. [Frozen protocol](mirage-empirical-protocol.md) · [Analysis archive](../empirical/archives/mirage-empirical-pilot-001/analysis.json)

The data show a response-coverage change and a worse proper score in this constrained configuration. The constant choice pattern under advice raises a specific alternative explanation involving answer position, prompt shape, or constrained greedy decoding. The study cannot isolate those mechanisms. Format-conditioned outcomes exclude neutral abstentions, and the bootstrap accounts for item variation within fixed templates. It supplies no uncertainty over model selection, decoding, or task-family sampling. The comparison contains no correct or neutral-length cue control. The expected 25% accuracy and 0.1875 Brier loss of a separate uniform random-answer, constant-25%-confidence baseline are mathematical controls.

## Provenance and reproduction

The study was frozen at `3221e089051b338a78194a25f8fe1b77782d2e5d`. The executed archive preserved all 128 actual outputs and statuses. The response SHA-256 is `129b4e400b0671fb44f2f9dfe93a35439010d821f21a037d0f93dc2d9f0e720e`. Independent code reconstructed the truth from the task wording and recalculated accuracy, confidence, calibration gap, and Brier loss using exact rational arithmetic on all scorable responses and the complete-pair primary difference. The recorded request span was 170.08 seconds, with a median request latency of 1.28 seconds and a maximum total token count of 181. Additional monetary cost was zero. Development observations were isolated from pilot aggregates. The archive replay does not need model weights or network access. [Run manifest](../empirical/archives/mirage-empirical-pilot-001/manifest.json) · [Raw outputs](../empirical/archives/mirage-empirical-pilot-001/responses.ndjson) · [Reproduction](../REPRODUCIBILITY.md)

Neil Meher directed the research programme. Codex assisted with design, implementation, execution, statistical reference code and interpretation. Human review and external replication remain pending. The next study should freeze an independent item set, counterbalance rendered option positions and grammar alternatives, and add a matched-length cue control. Validate that design before using the responses for ensemble comparisons. ECHO empirical has no executed ensemble.
