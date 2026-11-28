# The Limits of AI Consensus

## Accuracy, Error Dependence and Collective Decisions Across Language Models

**ECHO public empirical studies 001 and 002 · Retrospective archival analysis · 28 November 2026**

### Abstract

We aligned 14,994 genuine archived predictions from seven configurations in five model families across 2,142 MMLU-ProX English economics and physics questions. We froze a grouped question split and selected the single-model comparator and alternative committees using calibration questions. On 1,074 held-out questions, the fixed seven-model strict majority scored 44.23% full-plan accuracy versus 71.88% for calibration-selected Qwen3.5-9B. The paired difference was −27.65 percentage points, with a 95% group-bootstrap interval of −30.45 to −24.91. Full-panel plurality scored 63.41%. All seven failed on 144 items. Exhaustive calibration-based selection did not improve on the equal-size accuracy-selected trio or quintet with the registered complementarity objective. The distinct-family quintet increased accuracy by 0.56 points, with a descriptive interval spanning zero.

### Scope and prior work

Ladha’s correlated-vote treatment of the Condorcet jury theorem distinguishes majority accuracy under independence from majority accuracy under dependence. Hong and Page’s result concerns functional diversity under specific assumptions about search. These results give context for separating pooled accuracy, joint failure, and model family labels in this archival panel. [Ladha](https://doi.org/10.2307/2111584) · [Hong and Page](https://doi.org/10.1073/pnas.0403723101)

Kim, Garg, Peng and Garg (2025), §3 and Figure 1, already measured shared errors on HELM and Hugging Face leaderboards. Goel et al. used chance-adjusted overlap of wrong answers to study oversight. Kuncheva and Whitaker compared pairwise and non-pairwise diversity measures. Tekin et al. developed diversity-driven LLM committee pruning. FrugalGPT and RouteLLM study learned selection or routing. ECHO replicates a measurement of overlapping errors on a different benchmark and extends the comparison to grouped held-out strict voting, heterogeneous independence references and frozen subset selection. A fixed voting ensemble and an input-dependent router answer different questions. [Kim et al.](https://proceedings.mlr.press/v267/kim25e.html) · [Goel et al.](https://arxiv.org/abs/2502.04313) · [Kuncheva and Whitaker](https://doi.org/10.1023/A:1022859003006) · [LLM-TOPLA](https://arxiv.org/abs/2410.03953) · [FrugalGPT](https://arxiv.org/abs/2305.05176) · [RouteLLM](https://arxiv.org/abs/2406.18665)

### Cohort and methods

The prediction archive documents 25 checkpoints, 29 languages and 14 subjects. The Hub viewer estimates about 9.12 million rows across the archive. The bounded slice used seven English runs and the official English test Parquet, totaling 22 files and 101,539,044 bytes. The official test file has 11,759 questions across 14 categories. English economics and physics contribute 844 and 1,299 questions before alignment. We matched complete documents and declared keys against the pinned benchmark, matched exact rendered prompts across models, checked eligible option count and order, and independently reapplied the archived answer filter to raw text. One physics question had duplicate option text and was excluded for all seven models. The remaining 2,142 items formed 2,132 source-question groups. No other observation was excluded. [Prediction card](https://huggingface.co/datasets/gililior/mmlu-prox-eval-predictions) · [Benchmark paper](https://arxiv.org/abs/2503.10497) · [Source manifest](../empirical/echo-public/sources.json) · [Alignment audit](../empirical/echo-public/alignment.json)

| Partition | Items | Groups | Economics | Physics |
| --- | ---: | ---: | ---: | ---: |
| Development | 426 | 426 | 168 | 258 |
| Calibration | 642 | 639 | 253 | 389 |
| Held-out | 1,074 | 1,067 | 423 | 651 |

The original runs used English test, five fixed validation examples, identical archived rendered prompts, the same extraction regex, and greedy generation settings with a 512-token cap. Six checkpoints used an 8,192 context limit and Olmo used 65,536. Qwen used Transformers 5.3.0 and the others reported 5.3.0.dev0. Weight snapshots, the original benchmark revision and the harness git hash were unrecorded. Exact content matching establishes the pinned alignment for these items. Any model comparison is for the collected evaluation configurations. Source-question groups are the unit for 4,000 paired, subject-stratified bootstrap replicates. The primary comparison has one interval. Secondary results are descriptive. [Protocol](../research/echo-public-protocol.md)

### ECHO 001 · Individual and collective accuracy

| Configuration | Correct / 1,074 | Full-plan accuracy | Valid-answer coverage |
| --- | ---: | ---: | ---: |
| Qwen3.5-9B | 772 | 71.88% | 95.72% |
| Olmo-3-7B-Instruct | 396 | 36.87% | 77.19% |
| Gemma-3-12B-IT | 619 | 57.64% | 86.87% |
| Gemma-3-4B-IT | 401 | 37.34% | 82.68% |
| Llama-3.1-8B-Instruct | 470 | 43.76% | 89.20% |
| Llama-3.2-3B-Instruct | 338 | 31.47% | 90.88% |
| Phi-4-mini-instruct | 520 | 48.42% | 98.79% |

| Seven-member policy | Correct / 1,074 | Full-plan accuracy | Valid votes | Accuracy when voting |
| --- | ---: | ---: | ---: | ---: |
| Strict majority | 475 | 44.23% | 590 | 80.51% |
| Seeded plurality | 681 | 63.41% | 1,073 | 63.47% |
| Plurality with tie abstention | 628 | 58.47% | 912 | 68.86% |
| Unanimity | 116 | 10.80% | 125 | 92.80% |

The seven-model strict vote abstained on 484 questions. The calibrated Qwen comparator had 46 invalid results and 75.10% correct among its own valid answers. The two conditional accuracies use different questions. Across model outputs, 842 held-out responses yielded no filter match and three yielded a label outside the eligible range. Economics showed 57.21% versus 74.23% and physics 35.79% versus 70.35% for strict majority and the single baseline. The paired primary difference was negative in both subjects.

Across 21 pairs, phi ranged from 0.232 to 0.486 with mean 0.361. Subtracting calibration-derived source-specific failure rates reduced mean residual correlation to 0.320. Shared difficulty at this coarse grouping can explain some apparent dependence. Item-specific difficulty, training overlap and other common factors remain possible. Among jointly wrong valid responses, pairwise same-option rates ranged from 27.96% to 53.59% with an unweighted mean of 37.08%. The seven-member wrong-count histogram from zero through seven is [116, 125, 111, 123, 151, 150, 154, 144]. The panel failed unanimously on 13.41% of held-out questions. The 144 unanimous failures include invalid outputs and distinct wrong alternatives.

### Mathematical references

Calibration-fitted independent majorities gave 43.36% under a common success probability, 43.04% under heterogeneous Poisson-binomial probabilities, 39.57% under categorical independence, and 43.45% under stratified re-pairing. The heterogeneous reference assigned 0.92% probability to zero correct members. Categorical independence projected 82.53% plurality accuracy. Stratified re-pairing projected 83.41% on the strata covering 1,071 of 1,074 held-out items. The observed plurality accuracy was 63.41%. The proximity of some strict-majority rates coexists with large differences in tail failure and multiclass agreement. These are fitted mathematical counterfactuals. The pooled binary models do not condition on item difficulty and the categorical fit smooths sparse answer categories. The exchangeable ECHO 2.0 moment bounds are available as theory outside these heterogeneous observations. [ECHO 2.0 mathematics](../research/echo2-mathematics.md)

### ECHO 002 · Selecting committees

We enumerated 35 trios and 21 quintets on calibration. For each size we froze the highest marginal-accuracy set, one seeded random set, a distinct-family set, a complementarity-penalized set and a strict-vote-optimized set. All used strict majority on holdout. The table groups methods that selected exactly the same members.

| Size | Selection methods | Members | Held-out accuracy | Difference versus accuracy-selected |
| --- | --- | --- | ---: | --- |
| 3 | Accuracy, distinct families, complementarity, direct voting | Qwen 9B, Gemma 12B, Phi Mini | 59.96% | 0.00 pp, same team |
| 3 | Seeded random | Llama 8B, Llama 3B, Phi Mini | 39.85% | −20.11 pp [−23.06, −17.36] |
| 5 | Accuracy, complementarity, direct voting | Qwen 9B, Gemma 12B, Gemma 4B, Llama 8B, Phi Mini | 50.37% | 0.00 pp, same team |
| 5 | Distinct families | Qwen 9B, Olmo 7B, Gemma 12B, Llama 8B, Phi Mini | 50.93% | +0.56 pp [−1.02, +2.15] |
| 5 | Seeded random | Olmo 7B, Gemma 12B, Gemma 4B, Llama 8B, Llama 3B | 38.36% | −12.01 pp [−14.22, −9.81] |

The seeded examples represent one draw at each size. Four of 595 calibration trio pairs passed the prespecified similarity tolerances. The closest pair shared Qwen 9B and Llama 3B, with Olmo 7B in one and Gemma 4B in the other. Held-out majority accuracy was 44.60% and 43.85%, with 228 and 238 all-wrong outcomes. The pair is descriptive, partly overlapping and matched approximately on calibration moments. These observations do not isolate a higher-order contribution.

### Reproducibility and limits

The protocol froze at `fb0c9764c11e060073c6baa601755f0f22809f75`. Calibration selection froze at `eefce10034c1375f4fc502953865bb6cd7a6a6bd`. The deterministic replay archives were preserved at `032cd147f2d2b93bb72bbf72d775bddedab6864b`. Separate Python code reproduced canonical scoring from all included original records, the policies, subset searches, dependence statistics, the paired intervals and the independent references. No comparable expressed-confidence data was available. No confidence-weighted outcome, new model inference, or external human review was performed. Generalization beyond this panel, archive and two subjects remains open. [Scientific audit](../research/echo-public-audit.md) · [Run manifest](../empirical/archives/echo-public-empirical-001/manifest.json) · [Reproduce the analysis](../REPRODUCIBILITY.md)
