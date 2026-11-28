# ECHO technical supplement · Coverage and cross-language transfer

**ECHO Hindi economics 001 · Class F, genuine archived model predictions.** No inference was executed. Source and cohort were frozen at `21ffd681f1206008a561dee48a1d40233f839105` before reading the held-out Hindi scores. The paired group comparison reuses historical English outcomes. The two arms differ in language, translations, and extractor and stop strings. The archive cannot isolate a causal effect of language.

## Primary comparison

Six compatible configurations answered 402 aligned held-out questions in 399 original source groups. Strict majority accuracy was 219/402 (54.48%) in English and 99/402 (24.63%) in Hindi. The paired difference was **−29.85 percentage points**, with a **95% group-bootstrap interval of −34.75 to −25.00 pp**. English strict voting produced 219 correct, 43 wrong and 140 abstentions. Hindi produced 99 correct, 28 wrong and 275 abstentions. The historical Qwen3.5-9B comparator scored 304/402 and 249/402, respectively.

For any policy with positive coverage C and conditional accuracy a, full-plan accuracy is Ca. The exact symmetric decomposition of the cross-language difference is (C_H − C_E)(a_H + a_E)/2 + (a_H − a_E)(C_H + C_E)/2. Here the two terms are −27.12 and −2.73 pp. Coverage was 65.17% and 31.59%, and accuracy when voting was 83.59% and 77.95%. This accounting identity quantifies the observed change. It does not identify why the vote coverage changed or how a policy would perform at an experimentally imposed coverage.

The fixed Qwen baseline scored 223/262 on the same English questions where majority answered 219 correctly. It scored 105/127 on the same Hindi questions where majority answered 99 correctly. This comparison aligns question support and counts one English Qwen invalid answer in that matched denominator. It addresses selection into voting more directly than comparing two conditional accuracies over different items.

## Selective policies

| Policy | English correct / wrong / abstain | Hindi correct / wrong / abstain | Implied calls per item |
| --- | --- | --- | ---: |
| Historical Qwen baseline | 304 / 88 / 10 | 249 / 140 / 13 | 1 |
| Strict majority | 219 / 43 / 140 | 99 / 28 / 275 | 6 |
| Seeded plurality | 286 / 116 / 0 | 210 / 192 / 0 | 6 |
| Unanimity | 90 / 9 / 303 | 21 / 1 / 380 | 6 |
| Majority with Qwen fallback | 300 / 93 / 9 | 243 / 146 / 13 | 6 |
| Calibration reliability weights | 286 / 116 / 0 | 232 / 170 / 0 | 6 |
| Calibration-selected quorum | 264 / 86 / 52 | 164 / 108 / 130 | 6 |

The selected quorum was three votes in both languages. At wrong-decision cost one and abstention payoff zero, strict majority yielded 0.438 and 0.177 per item. Historical Qwen yielded 0.537 and 0.271. Different cost assumptions can reorder policies. If a decision has correctness probability p with payoff 1 for right and −c for wrong, the expected utility exceeds zero when p exceeds c/(1+c). This interpretation concerns a calibrated probability on the relevant population. Aggregation on this archive incurs no new calls, and prospective calls in the table are policy inputs.

The frozen English accuracy-selected trio transferred from 279/402 correct to 207/402. The quintet transferred from 251/402 to 155/402. Selection stayed fixed. Adding the differently configured Olmo in sensitivity gave 235 and 109 correct strict decisions. These comparisons are descriptive.

## Error dependence and agreement as a signal

Mean within-language pairwise error phi declined from 0.412 to 0.276 while all-member failures rose from 47 to 75. Lower average dependence can accompany weaker marginal performance and more joint failures. Same-checkpoint cross-language error phi ranged from 0.219 to 0.554. Invalid output grew from 19 to 84 for Llama 3.1 and from 32 to 116 for Llama 3.2. This archive cannot distinguish refusal, completion format and the filter mechanisms using label validity alone. Full records stay available under publisher terms for separate analysis.

On the full 402 valid plurality decisions per language, posterior-smoothed calibration of correctness by supporting-vote count reduced Brier from 0.20538 to 0.17141 in English and from 0.25057 to 0.21701 in Hindi. This is ECHO–MIRAGE reuse through a defined outcome and proper scoring rule. ECHO's vote count becomes a calibration input. The fitted probability is conditional on the task population and the plurality decision. It carries no expressed confidence. Generalization, calibration under shift and differences between alternatives agreeing on a wrong answer remain open. [Selective classification foundations](https://www.jmlr.org/papers/v11/el-yaniv10a.html) · [Selective neural classification](https://proceedings.neurips.cc/paper_files/paper/2017/hash/4a8423d5e91fda00bb7e46540e2b0cf1-Abstract.html)

## Adversarial review and reproduction

The pre-outcome translation screen caught missing question scaffolding and excluded 38 pairs in total. The remaining 806 pairs preserve original source groups. Hidden translation defects, changed wording, format effects, already viewed English outcomes, and checkpoint revision ambiguity limit claims. The pairwise correlation comparison conditions on a small fixed panel. The observed conditional differences and utility rankings should be treated as retrospective archival diagnostics. A new optimizer requires unexposed, aligned questions. Even one subject in Marathi for these seven checkpoints would need 93,244,603 bytes. The current balance is 59,334,795 bytes. Independent bilingual and human scientific review remain pending.

[Alignment](echo-hindi-alignment.md) · [Protocol](echo-hindi-protocol.md) · [Archive manifest](../empirical/archives/echo-hindi-economics-001/manifest.json) · [Complete analysis](../empirical/archives/echo-hindi-economics-001/results.json)
