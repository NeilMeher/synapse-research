# MIRAGE 003 · Qwen capability gate report

**Actual development evidence · 28 November 2026**

The authorized official Qwen2.5-0.5B-Instruct Q4_K_M download matched all 491,400,032 bytes, revision `9217f5db79a29953eb74d5343926648285ec7e67`, Apache-2.0 metadata and SHA-256 `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`. The model stayed outside Git. No other model was downloaded and additional monetary cost was zero. [Publisher artifact](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/tree/9217f5db79a29953eb74d5343926648285ec7e67)

## Resource evidence

V1.3.0 matched the local checkout, GitHub and Pages at `3022959cb34f080f31b3358079bb54243ba245d3`. The machine had 0.915 GiB free host RAM, 3,372 MiB free VRAM and 109.99 GiB free storage in the initial check. This was below the 1.1 GiB CPU launch threshold. The existing b12823 portable loader enumerated the GTX 1650, verified expected executable and backend hashes and used its existing system Vulkan loader. No drivers or system settings changed.

The original memory-mapped Vulkan startup stopped when host working set exceeded 640 MiB, with a sampled peak of 648.81 MiB. It produced zero model responses. One later preflight saw 862 MiB host memory, below the GPU route's 870 MiB startup floor, so it launched no model. The separately committed non-mapped loading configuration preserved every guard. Its successful run confirmed `--load-mode none` and 25 of 25 layers offloaded. Peak host working set was 343.10 MiB, minimum sampled free host RAM was 790 MiB, and minimum sampled free VRAM was 2,919 MiB. Startup took 3.38 seconds. The conservative full-run projection was 390.38 seconds against the 1,800-second ceiling. This supports hardware feasibility of this exact route. [Frozen safety limits](mirage-qwen-vulkan-protocol.md) · [Non-mapped configuration](mirage-qwen-vulkan-streamed.md) · [Stopped startup](../empirical/qwen/mmap-startup-stop.json)

## Capability results

| Family | Correct / planned |
| --- | ---: |
| Copy requested label | 2 / 2 |
| Retrieve stated value | 0 / 2 |
| Compare two numbers | 1 / 2 |
| Simple arithmetic | 1 / 2 |
| Map answer content to a label | 0 / 2 |
| Report confidence on a stated fact | 1 / 2 |
| **Total** | **5 / 12** |

All 12 genuine outputs were scorable. There were no refusals, truncations, abstentions, or inference infrastructure failures on the successful route. For these controls, accuracy was 41.67%, mean reported confidence 92.08%, calibration gap +50.42 percentage points, and Brier loss 0.524. Five of seven wrong answers reported 100% confidence. These are descriptive statistics on deliberately selected development controls. The model failed the prespecified minimum of eight correct and at least one correct in each family. The primary matched benchmark was left unopened. [Run manifest](../empirical/archives/mirage-empirical-cross-model-003-development/manifest.json) · [Independent review data](../empirical/qwen/capability-review.json)

## SmolLM2 comparison and ECHO decision

The archive contains four shared development questions under the same visible prompts and answer mappings. Qwen and archived SmolLM2 each answered two correctly. Qwen used Vulkan, while SmolLM2 used the earlier CPU greedy configuration. This small retrospective development comparison leaves general model capability open. No new SmolLM2 requests were issued. No Qwen benchmark responses were generated on the 512-request plan, so the registered cross-model Brier contrast and matched joint coverage are undefined.

The historical SmolLM2 benchmark scored 24.41% across 512 planned presentations and chose its dominant label on 95.70%. Its family-stratified task-bootstrap accuracy lower bound was 14.45%. Full-plan threshold, lower-bound threshold, and label-concentration threshold all fail the prospective ECHO criteria. Qwen lacks a qualifying matched benchmark, so no ensemble or confidence-weighted inference was executed. Independent human review and external replication remain pending. [Prepared matched protocol](mirage-cross-model-protocol.md) · [Public-response alternative](public-response-feasibility.md)

The Vulkan safety envelope was frozen at `25c51a981af0f94032de0bc13495422073924da1`, the non-mapped version at `aa0b0215b8d843d0b7783b03e3f2ebfd82642975`, and the 12 actual Qwen replies preserved at `9ddd112402822d0d689ddbcb31119898ebd29cbb`. The independent reference checks archived hashes and literal controls, remaps canonical answers, computes rational scores and verifies the small shared development comparison. [Reproduction](../REPRODUCIBILITY.md)
