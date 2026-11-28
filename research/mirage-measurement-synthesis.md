# Confidence Without Competence? Measurement Validity in Constrained Language-Model Evaluation

MIRAGE M1 · `mirage-measurement-synthesis-001` · evidence E, retrospective actual-model archive analysis

## Instrument and population

MIRAGE elicited an answer token and a percentage from small, locally run quantized checkpoints under constrained response grammars. This measures the probability the checkpoint **reports** for its selected answer, conditional on supplying one. It does not observe an internal belief or identify whether a high percentage arises from a stable probability forecast, instruction following or a typical completion. The primary studies use synthetic reasoning tasks and the development sets include literal controls. The [estimand register](evidence/mirage-measurement-synthesis-001/estimand-register.json) records configuration, mappings, denominators and evidence separately. The corresponding [manifest](evidence/mirage-measurement-synthesis-001/manifest.json) fingerprints this analysis. No models ran for M1.

| Archive | Requests with literal percentage | Scorable answer forecasts | Full-plan correct | Stage |
|---|---:|---:|---:|---|
| SmolLM2 001 | 128/128 | 116/128 | 28/128 | Exploratory |
| SmolLM2 002 | 512/512 | 512/512 | 125/512 | Registered |
| SmolLM2 004 | 192/192 | 183/192 | 43/192 | Registered |
| SmolLM2 002 development | 36/36 | 36/36 | 31/36 | Development |
| SmolLM2 004 development | 16/16 | 15/16 | 7/16 | Development |
| Qwen 003 development | 12/12 | 12/12 | 5/12 | Development |

The four paired SmolLM2 CPU/Vulkan probes are separate. Historical analyses did not count a percentage beside an explicit abstention as confidence in a selected answer. The raw records confirm the distinction, including eight pilot abstentions carrying 100% and nine registered format-arm abstentions carrying percentages between 0% and 50%. The original scores and archives stand.

## What each comparison identifies

| Intervention and comparison | Unit and evidence | Result and interpretation |
|---|---|---|
| 001 wrong suggestion versus no extra text | 64 paired tasks, 52 scorable pairs, exploratory and partly confounded | Paired Brier difference +0.1783, 95% task-family bootstrap interval [+0.0617, +0.2962]. The extra text and advice change together. All 12 neutral abstentions originated in the conditional family. One of 38 initially different scorable choices switched to the offered target. Letters and physical position coincide in this pilot. |
| 002 wrong advice versus matched neutral text | 32 tasks × 4 presentations, all 128 pairs scorable, registered controlled package | Brier −0.0222 [−0.0885, +0.0410]. Every canonical choice was unchanged. The target appeared in 33 wrong-advice responses but had already been selected in all 33 corresponding controls. Zero of 95 initially different choices moved to it. All 128 pairs matched input token count. |
| 002 correct advice versus matched neutral text | Same unit and coverage, registered controlled package | Brier +0.0315 [−0.0443, +0.1108]. One of 97 initially different choices switched to the correct target. All 128 pairs matched input token count. |
| 002 matched neutral text versus no text | Same unit and coverage, retrospective contrast of registered arms | Mean report +35.74 percentage points [29.43, 42.13]. Brier +0.1074 [0.0136, 0.1982]. Correctness was 31/128 in each arm. Length and wording changed jointly. Measuring a pure length effect would require crossing token length with several prespecified neutral and advice templates. |
| 002 relabel options with physical content order fixed | 128 pairs, controlled presentation contrast | The same letter occurred in 122/128 pairs, the same canonical option in 2/128. A appeared 490/512 times across the study, while the physical first slot appeared 124/512 times. This distinguishes displayed-label bias from physical first-position bias for this design. |
| 002 move physical positions with label-content mapping fixed | 128 pairs, controlled presentation contrast | The same label and canonical content occurred in 120/128 pairs, the same physical position in 2/128. |
| 002 reorder equivalent grammar alternatives | 128 pairs, controlled presentation contrast | Raw replies were identical in 128/128 pairs for this grammar and greedy configuration. |
| 004 moderate versus low stochastic decoding | 16 tasks, five registered seeded draws per task per arm, 80/80 scorable per arm | A fell from 74/80 to 53/80. Mean within-task empirical canonical entropy increased from 0.241 to 0.944 bits. Correctness was 19/80 in both arms, with interval [−13.75, +13.75] percentage points for the task-paired difference. Increased observed diversity did not increase observed accuracy. |
| 004 confidence-first package versus greedy comparison | 16 paired tasks, seven complete cases, registered but bundled | Complete-case Brier −0.5057 [−0.6971, −0.3143]. The full-plan sensitivity range is [−0.37294, +0.18956]. Confidence-first had 1/16 correct and 7/16 scorable, versus 4/16 correct and 16/16 scorable. The manipulation bundles field order and accompanying instructions. Cross instruction order with output-grammar order to isolate each. |
| Qwen versus SmolLM2 | Four shared controls, descriptive development comparison | Both scored 2/4. Qwen scored 5/12 overall with 92.08% mean reported confidence. Checkpoint, tokenizer, quantization and environment are part of the comparison. A common runtime on a balanced task set could identify a checkpoint-plus-tokenizer contrast, with stronger controls needed to isolate architecture. The matched MIRAGE 003 replication remains 0/512. |
| SmolLM2 Vulkan versus CPU | Four development controls, retrospective feasibility evidence | Raw replies matched in three of four probes. The fourth changed its selected answer and percentage. This is one device and configuration comparison with different load histories. Isolating a backend effect requires holding artifact, prompts, decoding settings and run conditions fixed while varying backend, with repeated measurements. |

Intervals resample task families using the original per-study seeds and procedures, averaging repeated presentations or draws within a task. The neutral-text interval is retrospective. Finite-archive equality and zero observed adoption have limited reach. Each contrast refers to these checkpoints, artifacts, tasks and response settings.

## Scoring when the answer is missing

For an answered request use squared loss \((p-y)^2\), where \(y=1\) if the selected canonical option is correct. Coverage measures how often that forecast event exists. Full-plan correctness counts correct responses over all planned requests. Averages over scorable responses, including calibration gap and discrimination, condition on a potentially treatment-dependent outcome.

For \(m\) observed losses with total \(S\) in \(N\) planned requests, each unobserved loss can contribute anywhere in \([0,1]\). All-zero and all-one hypothetical completions attain the bounds \([S/N,(S+N-m)/N]\). For a paired contrast subtract the comparator’s upper limit from treatment’s lower limit and the comparator’s lower limit from treatment’s upper limit. These are identification ranges for hypothetical losses. They are distinct from a confidence interval, and no loss was assigned to a real abstention. In 001 the full-plan Brier difference ranges from +0.06050 to +0.24800, which still concerns the bundled prompt comparison. In the format comparison the sign becomes unidentified under the same assumptions. A deployment decision would require a separately specified cost of abstention or verification.

## Scientific scope

The clearest effects concern the measurement instrument. Shuffling labels changes what a letter-biased model chooses. Sampling can increase diversity while leaving measured competence unchanged, and altering the response package can change who enters the calibration analysis. A stronger follow-up would establish capability first, prospectively separate the elicitation factors, fix a consequential abstention policy, and evaluate held-out performance across checkpoints. The results qualify the exploratory advice interpretation and establish no general property of language models. Work on strictly proper scores explains what Brier elicits for a specified event. Tian and colleagues examine verbalized probabilities in different models and tasks, motivating comparison across instruments without assuming equivalent capability. [Gneiting and Raftery, 2007](https://doi.org/10.1198/016214506000001437) · [Tian et al., 2023](https://aclanthology.org/2023.emnlp-main.330/)

## Reproduction and review

Run `python -B research/mirage-measurement/replay.py verify` from the repository root. The independent parser and canonical mapper check archived scores and recover the registered intervals, then check the replayed artifact byte for byte. The review of identification and limitations is documented here. Independent human review remains pending.
