# Development state

Milestones 0 and 1 have working deliverables. Milestone 2 ECHO has an executed, computationally validated first slice with human review pending. Eleven other laboratories were proposed at the v0.1.0 baseline.

| ID | Evidence | Status |
|---|---|---|
| S-001 | [Portfolio audit](PORTFOLIO_AUDIT.md) with exact public revisions. Four selected suites passed 13 tests. | Initial source audit complete |
| S-002 | [Literature](research/echo-literature.md), [model](research/echo-mathematics.md), [pilot protocol](research/echo-protocol-pilot.md), [confirmatory protocol](research/echo-protocol-confirmatory.md) | Protocol frozen |
| S-003 | Engine, schema, eight math/contract tests, [pilot artifacts](results/pilot.manifest.json) | Computationally validated |
| S-004 | [Confirmatory run](results/confirmatory.manifest.json), separate exact Python reference and checked digests | Experiments executed |
| S-005 | Static research map, interactive scenario, comparison, archive and export, results linked to actual artifacts | Implemented |
| S-006 | [Manuscript](papers/echo.md), [audit](research/echo-audit.md), release pipeline and [reproduction steps](REPRODUCIBILITY.md) | Human review pending |

## Reproduction and provenance

- Pilot `echo-pilot-001` used 400 tasks and source commit `801a459`.
- Confirmatory run `echo-confirmatory-001` used 8,000 tasks and protocol commit `f7baa9a`. The observed batch runtime was 2.94 seconds and process RSS was about 68 MB on the recorded host.
- Use `git log -1 --format=%H` for the current source revision. Generated run metadata has the full frozen commit IDs.
- Local scientific gates passed `npm test`, `npm run reference` and `npm run verify`. The static bundle passed `npm run build`. Chrome 158 local smoke checks passed at 360, 390, 768 and 1440 px, including the 503 artifact fallback. Deployment status follows the repository workflow.

## Next work

1. Independent human review of the mathematics and code. Follow the [learning checks](docs/echo-learning.md).
2. Specify a second dependence law with matched marginals and pairwise correlation, and add weight sensitivity in a new protocol before running it.
3. Establish portfolio reuse permissions and extend the shared foundation to MIRAGE and REFLEX only after defining their control and reference cases.

The first slice is open software for research and education. Use of human data, paid resources, and verified external replication would require separate work.

## Phase II · ECHO dependence milestone

The v0.1.0 archived release is the baseline. Its CI run 45879539759 passed on commit 7d0d9cc7780bf1ffebc69cfec0fb61b81063ed22 and its live confirmatory checksum matched e102516726740cf13d140c35bc35a3c5a2fa5de5de761e253a03f2ec118212ec. Local npm ci, test, reference, verify and build also passed at that baseline. ECHO v1 and v2 use separate frozen configs, protocols, run IDs and artifacts.

| Phase II gate | Evidence |
|---|---|
| Preserve v1 and audit published state | v0.1.0 tag, verified run and byte-identical v1 archives |
| Matched dependence and sharp moment bounds | [Mathematics](research/echo2-mathematics.md), independent Fraction reference and unit tests |
| ECHO 2.0 pilot and confirmatory | [Pilot](results/echo2-pilot.manifest.json), [protocol](research/echo2-confirmatory.md), [run](results/echo2-confirmatory.manifest.json) and [manuscript](papers/echo2.md) |
| ECHO 2.0 site | Matched-law explorer and archived study at #robustness |
| Review | [Internal adversarial audit](research/echo2-audit.md). Human review pending. |

The first Phase II confirmatory study used 16,000 simulations at each of six correlations and completed its local batch in 337 ms with observed RSS of 24,965,120 bytes. The main results are exact. The paired samples cross-check the calculation and provide sampling error separately.

Phase II continued through the integrated slice below. The next scientific extension to ECHO is a heterogeneous reliability and information-source model with feasible joint moments. Clustered dependence, adaptive trust and empirical LLM experiments remain open.

## Phase II · Integrated slice

The Phase II requested sequence reached CONVERGENCE. The reviewed ECHO 2.0 tag is v0.2.0 at 6cfb2ab with successful GitHub Pages deployment 45882798690 and verified live v1/v2 checksums. The next release integrates three additional versioned task families.

| Milestone | Actual output | Reproduction |
|---|---|---|
| MIRAGE v0.1 | 350-case pilot and 6,000-task confirmatory evaluation per regime. First-order accuracy was 71.97%; trained error AUROC fell from .7355 to .4894 under misleading cues. | python scripts/reference_mirage.py and node scripts/mirage.mjs verify |
| REFLEX v0.1 | 40-episode pilot and 400 paired six-round confirmatory markets. Higher impact reduced simulated error by 6.43 ticks. Reference replay checked 207 archived confirmatory fills and all balances. | python scripts/reference_reflex.py and node scripts/reflex.mjs verify |
| CONVERGENCE | 48-episode pilot and 1,200 paired confirmatory episodes across 22 arms. Both adjusted primary intervals include zero. Independent reconstruction checked 478 confirmatory fills, source moments and archived decision traces. | python scripts/reference_convergence.py and node scripts/convergence.mjs verify |
| Review | [Phase II audit](research/phase2-audit.md) with corrected pre-release issues. | Confirm no byte differences in v1 artifacts and review one witness, estimate and ledger by hand. |

The integrated pages link to all run manifests, protocols, published metrics, manuscripts and learning guides. The original ECHO controls remain available. Use the current branch's GitHub CI and deployed release.json to identify the latest revision. Human peer review is pending. Future scope includes heterogeneous/confounded cues, clustered dependence, more realistic source provenance, varied communication strength and longer-horizon market outcomes. The seven remaining labs remain proposed.

## Phase III · MORPHEUS & ALPHA DECAY

| Milestone | Actual output | Reproduction |
|---|---|---|
| Phase II preservation & audit | Verified all 21 tests, 5 Python references, and 10 manifests at `5bc45f9`; pushed `codex/phase2-integration`, `codex/phase2-mirage`, and tag `v0.3.0` to GitHub. | [PHASE2_VERIFICATION.md](PHASE2_VERIFICATION.md) |
| MORPHEUS v0.1 | 60-history pilot and 400 paired 16-step confirmatory histories across 8 architectures & 4 ablations (`K=4`). Under corruption, `provenance` beat `keyword` by `+27.39 pp` (`[25.85, 28.93] pp`, `100%` goal preservation); on clean histories, `provenance` scored `-11.61 pp` (`[-12.46, -10.76] pp`) due to static trust weighting over un-flagged `direct_observation` updates. | `python scripts/reference_morpheus.py` and `node scripts/morpheus.mjs verify` |
| ALPHA DECAY v0.1 | 40-episode pilot and 300 paired 8-round confirmatory episodes across 7 arms reusing `engine/market.mjs`. At `impact=4`, `9` vs `1` adopters reduced alpha by `-0.4100%` (`[-0.4442%, -0.3757%]`); `impact=0` control showed `-0.0012%` (`[-0.0388%, +0.0364%]`). Python replayed 1,223 confirmatory fills. | `python scripts/reference_alpha_decay.py` and `node scripts/alpha-decay.mjs verify` |
