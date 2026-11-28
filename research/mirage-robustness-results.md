# MIRAGE 002 · Disentangling confidence from response bias

**mirage-empirical-robustness-002 · Registered actual-model study · 28 November 2026**

## Primary result

On all 32 canonical tasks and 128 scorable presentation pairs, the task-weighted Brier difference, **incorrect advice minus length-matched nonadvisory text**, was **−0.02217**. The task-level stratified bootstrap interval was **−0.08851 to +0.04096**. The interval spans zero. The earlier pilot's positive contrast against a shorter, no-advice prompt is a different estimand. This narrower follow-up leaves the direction of the advice-content effect unresolved. All 512 genuine responses were scorable, with no abstentions, malformed outputs, incomplete requests, refusals or infrastructure failures. The full-plan missing-loss bounds coincide at −0.02217.

| Outcome | No cue | Matched text | Correct advice | Incorrect advice |
| --- | ---: | ---: | ---: | ---: |
| Correct out of 128 planned | 31 | 31 | 32 | 31 |
| Accuracy | 24.22% | 24.22% | 25.00% | 24.22% |
| Mean confidence | 31.69% | 67.43% | 60.31% | 60.91% |
| Calibration gap | +7.47 pp | +43.21 pp | +35.31 pp | +36.70 pp |
| Brier loss | 0.34749 | 0.45485 | 0.48638 | 0.43269 |
| Error-positive AUROC | 0.47655 | 0.47373 | 0.39665 | 0.48171 |

Incorrect advice and matched text produced the same canonical answer in all 128 pairs. Mean confidence changed by −6.52 pp for incorrect advice versus matched text (exploratory 95% interval −13.64 to +0.13 pp). All 128 matched triplets of matched text, correct advice and incorrect advice used exactly the same input token count. Each had 12 more tokens than its no-cue prompt. Adding the particular neutral text increased mean confidence by 35.74 pp and Brier loss by 0.10736 relative to no cue. For Brier, the exploratory interval was +0.01356 to +0.19820. This comparison changes contextual wording and prompt length together.

## Letter, position and grammar

| Single change from the reference | Matched pairs | Same letter | Same canonical answer | Identical raw answer and confidence |
| --- | ---: | ---: | ---: | ---: |
| Physical order | 128 | 120 | 120 | 46 |
| Letter assignment | 128 | 122 | 2 | 46 |
| Equivalent grammar alternative order | 128 | 128 | 128 | 128 |

Across conditions A accounted for **490/512 responses**. Physical position one accounted for **124/512**. Under the registered perturbations, letter preference explains the observed choices more directly than physical first-position preference. The grammar-only comparison changed the order of the same allowed alternatives, with the prompt held fixed. It provides a precise empirical no-change result for those 128 pairs, with no inference about unconstrained decoding, numerical-format changes, or stochastic runs. Explicit instruction-list order was varied only in the four development pairs.

Incorrect advice selected its canonical target **33/128** times. Thirty-two such targets carried label A. Among **95** trials where the matched text response picked different content, **none** switched to the incorrect suggestion. Correct advice selected its target **32/128** times and switched to it on **1/97** eligible initially different comparisons. These checks separate target coincidence from a switch toward its content. [Analysis](../empirical/archives/mirage-empirical-robustness-002/analysis.json) · [Original archive audit and grammar source](mirage-robustness-background.md)

## Design and verification

The 32 fresh canonical items comprised eight per family, four presentations and four cues per item. An independent solver verified the printed question and distinct truth for each item. The realized design placed every correct answer and designated wrong target under every label and in every position eight times per presentation. The separate replay independently verified all 512 canonical mappings and rational scores. The complete 32-task bootstrap used 4,000 stratified resamples. The model ran in about 6.5 minutes on the original b12823 CPU runtime, median request 0.732 second, peak server working set about 198 MiB, at zero additional cost. The held-out plan was frozen at `22c5d8bec4858320e33de6e8715f1eb28243f855`. Responses are preserved at `813052b273a2dc6dc6bcc8097a302e33af7329c8`. The raw-response digest is `92307ab0ad0ea3e9e5d854298e444eacd687ce871c4062b45c2defb054c8ef30`. [Frozen protocol](mirage-robustness-protocol.md) · [Realized design](../empirical/robustness/inputs/heldout.balance.json) · [Run manifest](../empirical/archives/mirage-empirical-robustness-002/manifest.json)

## Readiness and next task

Canonical scoring and separation of presentation factors passed the measurement checks. Observed accuracy remains near the exact 25% uniform and fixed-letter control, even in the direct-retrieval family. Near-constant letters, one model checkpoint and single greedy generations per cell leave too little evidence of meaningful independent reasoning votes for ECHO. No cross-model or actual ensemble data enters this release. Human scientific review and outside replication remain pending.

The precise next model milestone is a prespecified cross-model replication on the same frozen canonical items and mappings, starting with resource and capability checks for the pinned Qwen 0.5B GGUF. It requires approval for a 491 MB download and enough available memory. Reassess label collapse, coverage, cue effects and ability before freezing an ensemble comparison. [Model feasibility](mirage-robustness-model-access.md) · [External review package](external-review.md)
