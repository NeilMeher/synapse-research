# Cross-Agent Handoff (`HANDOFF.md`)

**Updated:** 2026-11-27  
**Current continuation** · codex/phase5-social-systems

Use the latest empirical checkpoint at the end for current execution and deployment. The Phase III handoff below records the state Antigravity left for Codex.

---

## 1. Historical repository and branch state

- **Authoritative Workspace:** `c:\Users\neilm\Documents\Codex\2026-11-25\i-want-to-build-which-can\itihasa\.tools\synapse-phase2`
- **Origin URL:** `https://github.com/NeilMeher/synapse-research.git`
- **Starting Branch (from Codex):** `codex/phase2-integration` at `5bc45f937f468c0e2465dee15f148f54ae069a8f` (`v0.3.0`)
- **Current Phase III Branch:** `antigravity/phase3-integration`
- **Backup Bundle (outside repo):** `C:\Users\neilm\.gemini\antigravity\brain\bb8ad985-a321-405c-a10b-c6550fb89d1c\scratch\synapse-phase2-5bc45f9.bundle` (verified with `git bundle verify`)

---

## 2. Work Inherited from Codex & Recovered

Antigravity recovered the local Phase II workspace where `codex/phase2-integration` (`5bc45f9`, version `0.3.0`) was 8 commits ahead of GitHub (`6cfb2ab`, `v0.2.0`).
- **Preserved Codex commits:** `590cd12`, `8e2789d`, `03d7e47` (MIRAGE), `c58a902`, `1c6c4ba` (REFLEX), `da04837`, `7b068ad` (CONVERGENCE), `5bc45f9` (Phase II integrated release).
- **Published to GitHub:** Pushed `codex/phase2-integration`, `codex/phase2-mirage`, and annotated tag `v0.3.0` (`5bc45f9`) to `origin`.

---

## 3. Work Completed by Antigravity

1. **Phase II Forensic Audit (`PHASE2_VERIFICATION.md`):** Verified all 21 unit tests, all 5 Python reference checkers, all 10 experiment manifests/hashes, and `npm run build` (97 files).
2. **MORPHEUS v0.1 (`engine/memory.mjs`, `engine/morpheus.mjs`, `apps/web/morpheus.html`, `papers/morpheus.md`):**
   - Bitemporal record schema (`eventTime` vs `ingestionTime`), source provenance, revision (`supersedes`), and contradiction tracking.
   - 8 memory architectures + 4 ablations across 400 paired 16-step histories (`K=4`).
   - **Key finding:** Under corruption, `provenance` beat `keyword` by `+27.39 pp` (`[+25.85, +28.93] pp`, `100%` goal preservation). On clean histories, `provenance` scored `-11.61 pp` (`[-12.46, -10.76] pp`) because static `verified_correction` trust weights outweighed `eventTime` recency on un-flagged `direct_observation` updates (explicitly reported negative trade-off).
3. **ALPHA DECAY v0.1 (`engine/alpha-decay.mjs`, `apps/web/alpha-decay.html`, `papers/alpha-decay.md`):**
   - Reuses `engine/market.mjs` (`REFLEX`) integer accounting with matched total trader capital (`960,000` cash, `96` assets).
   - 300 paired 8-round episodes across `1, 3, 6, 9` adopters, `3`-adopter concentrated capital (`75%` share), and `impact=0` control.
   - **Key finding:** At `impact=4`, `9` vs `1` adopters reduced alpha by `-0.4100%` (`[-0.4442%, -0.3757%]`), while `impact=0` control showed `-0.0012%` (`[-0.0388%, +0.0364%]`), proving endogenous price impact drives the decay.
4. **Website & CI Integration:** Updated `apps/web/map.mjs`, `apps/web/library.html`, `scripts/build.mjs`, and `.github/workflows/checks.yml`.

---

## 4. Known Blockers & Unfinished Scope

- **GitHub Pages Deployment:** `https://neilmeher.github.io/synapse-research/` is currently still serving `v0.2.0` (`release.json` returns 404) because `.github/workflows/checks.yml` gates `deploy_pages` behind a manual `workflow_dispatch` input (`deploy_pages: true`), and `gh` CLI is not installed locally. Trigger `ECHO verification` workflow manually in GitHub Actions with `deploy_pages: true` to publish the latest build.
- **Local Playwright Binary:** `node tests/browser-smoke.mjs` requires `npx playwright install chromium` locally (runs automatically in GitHub Actions CI).
- **Remaining Proposed Laboratories (7 of 12):** `NOESIS`, `SCIENTIA`, `AXIOM`, `GAME OF CIVILIZATIONS`, `ARTHA`, `ENERGIA`, `CHRONOS`.
- **Website & Academy Enhancements:** Expand the interactive mind map with zoom/pan/focus mode/guided journeys and build the structured Mathematical Academy section.

---

## 5. Historical Phase III continuation instructions

1. Verify clean state: `git status`, `npm test`, `npm run verify`, `node scripts/morpheus.mjs verify`, `node scripts/alpha-decay.mjs verify`, `npm run build`.
2. Trigger GitHub Actions `workflow_dispatch` (`deploy_pages: true`) via GitHub UI or `gh workflow run` to update `https://neilmeher.github.io/synapse-research/`.
3. Next scientific milestone: Implement **NOESIS** (controlled hidden-law discovery) or **SCIENTIA** (workflow reliability & preregistration), or expand **MORPHEUS** (adaptive provenance + ECHO/MIRAGE cross-lab study) under a new frozen protocol.

## Phase III release preparation

Local verification passed 27 unit tests, all seven reference and archive suites, production build and browser smoke checks at 360, 390, 768 and 1440 pixels. Browser tests now verify the seven distinct evidence entries and both new laboratory workflows, including the MORPHEUS intervention and ALPHA DECAY scenario and round controls. The production build contains 134 checked files. The expected Pages target is this reviewed Phase III branch after passing GitHub CI.

Phase III v0.3.1 was deployed from a9f1cb0 by [Pages run 45954910522](https://github.com/NeilMeher/synapse-research/actions/runs/45954910522). The public revision, artifact hashes and four browser widths were verified.

## Phase IV recovery through SCIENTIA

The recovered input snapshot is archived at 7670acf on [wip/phase4-recovered-archive](https://github.com/NeilMeher/synapse-research/tree/wip/phase4-recovered-archive). Phase III is tagged v0.3.1. NOESIS v0.4.0 is available on Pages from 4dba5a1 through [run 45956303714](https://github.com/NeilMeher/synapse-research/actions/runs/45956303714). Both original NOESIS result hashes were verified against public assets.

The standalone SCIENTIA implementation, frozen studies and lab are on codex/phase4-recovery. Run both commands in REPRODUCIBILITY.md. Its archived approximation changes one audited BH decision relative to erfc. The results and pre-run protocol are immutable. Follow the scientific gates documented for each new study. No independent human review has been completed.

## Phase IV public continuation

SCIENTIA v0.4.1 was built from b232fd3 by [Pages workflow 45958470019](https://github.com/NeilMeher/synapse-research/actions/runs/45958470019). The public release.json showed that exact revision. EPISTEME's independently reconstructed pilot and confirmation are archived in results. Its confirmatory design was frozen at b2a193d before execution. The Phase IV final release adds EPISTEME, the registry-backed atlas and Mathematical Academy.

Use the Pages release metadata and GitHub Actions to confirm deployed revision and verified jobs. For scientific continuation, begin AXIOM with a small game-theoretic consistency benchmark using equivalent payoff structures and explicit utility assumptions. See ROADMAP.md for dependencies. Human review of the protocol and manuscripts remains pending.

## Phase IV continuation checkpoint · superseded by Phase V below

The deployed release is [v0.5.0](https://github.com/NeilMeher/synapse-research/releases/tag/v0.5.0) at e5e40c3. The [release metadata](https://neilmeher.github.io/synapse-research/release.json) and [Pages run 45962338932](https://github.com/NeilMeher/synapse-research/actions/runs/45962338932) identify the shipped revision. All four live browser widths and six public Phase IV JSON downloads passed. For a future scientific slice start from [the AXIOM design](research/axiom-design.md) and build its independent payoff-permutation controls. This documentation checkpoint is on the recovery branch. The public deployment remains at the verified release commit.

## Phase V · AXIOM milestone

Continue on codex/phase5-social-systems. The executable, input configuration, independent reference and finite protocol were committed at f0fce74 before running. The [AXIOM pilot manifest](results/axiom-pilot.manifest.json) records the original run and fixed checksum. Its [audit](research/axiom-audit.md) explains expected positive-control failures. AXIOM's finite benchmark exposes implementation invariance and does not estimate behavioural or moral effects. Next, validate exact resource flows, atomic transfers, contingent delivery and information timing in GAME OF CIVILIZATIONS. Preserve the finite benchmark as a standalone release.

## Phase V · GAME OF CIVILIZATIONS

Validated exact two-good accounting, immutable matched world schedules and contingent delivery under three information regimes plus no exchange. The frozen confirmation shows lower aggregate fulfillment with pooled history in the simulated stress regime. Retain this result and its distributional diagnostics. [Archive](results/civilizations-confirmatory.manifest.json) · [Audit](research/civilizations-audit.md). The next comparison should hold world schedules and the history visible to agents fixed while substituting AXIOM-derived decision rules.

AXIOM v0.6.0 was publicly verified at ab946afc19b03c9e12663b24327ad36d7fe08ae3 with [review CI 45965202160](https://github.com/NeilMeher/synapse-research/actions/runs/45965202160) and [Pages run 45965441266](https://github.com/NeilMeher/synapse-research/actions/runs/45965441266). Public metadata, the downloaded finite archive and four browser widths agreed with the release.

## Phase V · Integrated release candidate

The POLIS pilot froze at ca3fa00 and the confirmatory protocol at 0205577. The validated world states, population distribution results, execution hashes and numerical reference correction are recorded in [the audit](research/polis-audit.md). The three new studies, registry relationships, guided journey and eight total Academy modules are bundled for the Phase V release. The exact public release commit is reported by release.json. The next research task is to freeze a payment-enforcement and surplus-value sensitivity protocol. ARTHA, ENERGIA and CHRONOS remain proposed.

GAME OF CIVILIZATIONS v0.7.0 was publicly verified at 7eb6415d2f1c8be62aa8c8b5ab03cb81ab01e92c. The public pilot and confirmation matched their manifest hashes, and the live browser suite passed at four widths. [Review CI 45966426532](https://github.com/NeilMeher/synapse-research/actions/runs/45966426532) · [Pages deployment 45966706836](https://github.com/NeilMeher/synapse-research/actions/runs/45966706836) · [v0.7.0](https://github.com/NeilMeher/synapse-research/releases/tag/v0.7.0)

## Verified Phase V release and continuation

[Phase V v0.8.0](https://github.com/NeilMeher/synapse-research/releases/tag/v0.8.0) is deployed at f0c9d3af0380afa957d7e87d295e3c7e5c7a160b. The public [release metadata](https://neilmeher.github.io/synapse-research/release.json), [release CI 45995010007](https://github.com/NeilMeher/synapse-research/actions/runs/45995010007) and [Pages run 45995327237](https://github.com/NeilMeher/synapse-research/actions/runs/45995327237) agree. Local and public browser smoke checks passed at 360, 390, 768 and 1440 pixels with the ECHO and economy artifact failure controls. All five new result archives and their five manifests were checked against public bytes. The historical result archives are byte-identical to the Phase IV continuation checkpoint. The release passed 53 unit tests, all 13 reference and deterministic verification suites, and 17 schema validations.

The next research task is to define the registered POLIS sensitivity arms for prepayment and payment on delivery, crossed with explicitly varied values for surplus resources. Set a paired need-satisfaction outcome and specify individual losses before any new simulation. This tests how far the current exact policy-equivalence result depends on the prescribed payment rule and payoff values. Human review remains pending. ARTHA, ENERGIA and CHRONOS remain proposed.

## Phase VI · POLIS contract sensitivity

Phase VI began on the clean checkpoint 214bb251ddb98b181f682ea433e2c66c0a24964f and uses codex/phase6-economic-infrastructure. The 32-world pilot and 160-world confirmation independently reproduced all 24 arms. The primary interaction at the original surplus value was −9.60 pp, 95% paired interval −9.89 to −9.31. This is the versioned POLIS 2.0 study. The original POLIS archives remain unchanged. The next slice is to freeze an ARTHA domestic demand scenario after independently checking the ADB input-output workbook and its industry map.

## ARTHA checkpoint

The domestic ADB India industry-by-industry source and processed data are pinned. Run the source extraction check against the original workbook, the independent production-series check and the replay before revising ARTHA. The completed archive hash is 291d4a118aa50273beb0b05692bac98361abb1a90549d267e4fc16ae183df28d. Continue with ENERGIA before integrating the national coefficients into NEXUS.

## ENERGIA checkpoint

ENERGIA's inputs, model and sources are frozen. Run `python -B scripts/check_energia_reference.py` and `node scripts/energia.mjs verify`. The verified archive digest is `a46ba764f10dcdcef9c9bef2df58d8f4be6dd2cfeb3d7c26361810c009d82c37`. Maharashtra connection, site availability, tariffs, commercial offers and institutional eligibility remain unverified. NEXUS can use the already checked, hypothetical 2024-denominated capital ledger as its scenario basis.

## Integrated NEXUS and next milestone

Run `python -B scripts/reference_nexus.py` and `node scripts/nexus.mjs verify`. The archive digest is `e10fceb2ba869154a33a64b6c35620a1407f8d4f3698929431fa9325c137dd31`. The project website and repository use the existing GitHub Pages workflow. The default branch is `codex/foundation`, fast-forwarded only after validation. GitHub Pages has a custom allowlist for that branch, so preserve the existing configuration unless a separate migration is authorized and verified.

CHRONOS begins with the [source and design checkpoint](research/chronos-source-checkpoint.md). Pin the published Indian rail series and seek verified route commissioning dates. No treatment or outcome panel has been built. Human reviewers can independently assess the ADB vintage and workbook reuse terms, the ENERGIA physical and underwriting assumptions, and each procurement share and native ADB sector mapping in NEXUS.

[Phase VI research and verification register](research/phase6-release-report.md)

## Phase VII CHRONOS checkpoint

The current branch is `codex/phase7-8-chronos-v1`. Start from the completed [CHRONOS manuscript](papers/chronos.md) and the [source audit](research/chronos-source-audit.md). Reproduce chronos-scenario-001 with `python -B scripts/extract_chronos.py --check`, `python -B scripts/reference_chronos.py` and `node scripts/chronos.mjs verify`. The archived result digest is `ff16f9990b2fd525dd8eb3f489ae508fe5f55cd3cec365d0d812f6fb54f61435`. The earlier CHRONOS source discovery checkpoint is historical. Do not substitute restricted survey cells or infer intervention effects from the national series.

## Phase VIII consolidation

The release candidate integrates the typed study graph and deterministic search, evidence filters, safe Markdown reader, curriculum graph, 16 worked lessons, and review material. Start future research from [the review package](research/external-review.md) and [the proposed empirical programme](research/future-empirical-programme.md). Earlier roadmap entries describing CHRONOS as a proposal are historical. The live revision and validation status are recorded on the GitHub release. Use the existing default-branch Pages workflow for future reviewed fast-forwards.

[Phase VII and VIII execution register](research/phase7-8-release-report.md)


## SYNAPSE 2.0 · First empirical checkpoint

- Baseline `codex/phase7-8-chronos-v1` at v1.0.0 `775c78accdcfc06acbe4170d651d7e37de8a32bd`. Continue on `codex/v2-empirical-intelligence`.
- MIRAGE protocol and inputs frozen at `3221e089051b338a78194a25f8fe1b77782d2e5d`. The genuine pilot observations and outputs were preserved at `5aed77e263b54d35af565e67008d2685d88538f9`. Previous result archives are preserved.
- Local CPU route verified with a pinned 105 MB Apache-2.0 SmolLM2 weight. No free hosted route was authorized or configured. Public evidence begins with the pilot, with the two development rounds retained separately in the local journal.
- Of 128 genuine pilot requests, 116 were scorable and 12 abstained. Every cue-arm answer selected A. The available-pair Brier loss difference was +0.17830 across 52 pairs. See the result report for uncertainty, family-specific missingness and limitations.
- Continue with an independent MIRAGE design that crosses rendered answer order and output-grammar alternative order, and adds length-matched and correct cues. Use a small development split before registering fresh held-out items. Comparable ensemble evidence remains outstanding.

[Pilot report](research/mirage-empirical-results.md) · [Public release verification](https://github.com/NeilMeher/synapse-research/releases/tag/v1.1.0)


## Empirical Phase II · MIRAGE 002 checkpoint

The branch is `codex/mirage-empirical-robustness`, based on v1.1.0 `64c76d12ab6999760ae0c599429352a881ef82b0`. The retained retrospective audit recreates MIRAGE 001 directly from its stable archive. The registered 002 design froze at `22c5d8bec4858320e33de6e8715f1eb28243f855` after a separately archived 36-request development study. All 512 held-out outputs were preserved at `813052b273a2dc6dc6bcc8097a302e33af7329c8`.

The primary Brier contrast was −0.02217 with 95% task-level interval [−0.08851, +0.04096]. Grammar reorder generated 128/128 identical outputs. Letter reassignment preserved the letter in 122/128 pairs and the canonical choice in 2/128. Overall 490/512 answers were A, with accuracy near 25%. These outcomes leave the reasoning-ensemble gate closed. Next obtain authorization and verify memory for the exact Qwen 0.5B artifact, freeze a matched replication and measure capability and bias before ECHO. All historical archives remain intact. [Report](research/mirage-robustness-results.md) · [Release record](https://github.com/NeilMeher/synapse-research/releases/tag/v1.2.0)


## Empirical Phase III · MIRAGE 004 and Qwen readiness

Work started on `codex/mirage-empirical-robustness` at v1.2.0 `230e46a59cd254801f920d4eac90c663e7398446`. The branch is `codex/empirical-cross-model-ensembles`. MIRAGE 004 froze at `35e2a14c57fe76d7218fbff11a953199c719a0c1`. Its 192 genuine responses were archived at `36733d19d9a2ea675acdf899d719576957b44ca5`. The 16 development and four device-probe observations are separately labelled.

At temperature 0.7, A selection dropped by 26.25 points relative to 0.3 while full-plan accuracy stayed at 23.75%. Canonical diversity increased. Confidence-first abstained in nine of 16 trials. The scientific ECHO capability gate remains unsatisfied.

MIRAGE 003 has an exact 512-request matched plan and 12 separate instrument controls. Its Qwen GGUF requires authorization for the exact 491,400,032-byte download. CPU availability was 0.86 GiB against the 1.1 GiB preflight threshold. The existing Windows Vulkan loader and the checked portable b12823 ZIP supported four SmolLM2 requests. After authorization, freeze a Qwen GPU capability configuration separately or recheck CPU availability. Test capability and memory before matched inference. No Qwen response was collected. [Decoding results](research/mirage-decoding-results.md) · [Access](research/mirage-phase3-access.md) · [Release record](https://github.com/NeilMeher/synapse-research/releases/tag/v1.3.0)


## MIRAGE 003 · Qwen capability continuation

Start from branch `codex/mirage-qwen-replication` based on v1.3.0 `3022959cb34f080f31b3358079bb54243ba245d3`. The only downloaded model was the user-authorized Qwen2.5-0.5B Q4_K_M GGUF. Its verified 491,400,032-byte artifact remains outside Git. The original mapped Vulkan startup crossed the host limit and stopped with zero responses. The separately frozen non-mapped Vulkan variant qualified hardware and produced 12 scorable development replies. [Capability report](research/mirage-qwen-capability-results.md)

The archive at `9ddd112402822d0d689ddbcb31119898ebd29cbb` is immutable. Accuracy was 5/12, and retrieval and remapping were 0/2 each. The 512-request study gate remains failed. No additional SmolLM2 calls, Qwen matched study or ECHO ensemble occurred. Start future work with a bounded two-checkpoint public archive sample and freeze its own design. Preserve the separate outcomes on the four shared development controls and the historical 512 SmolLM2 presentations. [Public data feasibility](research/public-response-feasibility.md)

## Empirical Phase IV · ECHO public predictions

Continue on `codex/echo-public-empirical` from v1.3.1 `88f5011d22c8b2fa13c58a4f7ce9929b6aa69ea7`. The retrospective cohort and split froze at `fb0c976`, the calibration-selected single and committees at `eefce10`, and the executed archive at `032cd14`. The new build integrates ECHO 001 and 002. Read the [manuscript](papers/echo-public.md) and [audit](research/echo-public-audit.md). Verify the live commit and workflow before reporting publication. Review and multilingual alignment remain separate milestones.

## Second-generation checkpoint

Started from `codex/echo-public-empirical` at v1.4.0 `e4b7c2d9d01fea45733655aa64f16a5bb2019722`. Continue on `codex/synapse-second-generation`. The [register](research/second-generation-register.md) records all twelve laboratories. Hindi freeze `21ffd68` and archive `15add16` preserved 806 bilingual pairs and the alignment exclusions. ECHO moment protocol `82b23b2` and evidence `0669956` hold exact certificates. MORPHEUS trust protocol froze at `ca71901`. Its independent verifier rebuilt the burst, clean and recovery findings. Check the public release metadata for the final revision.

Next, reconcile the MIRAGE 001, 002 and 004 measurements using archived scores only. Make an estimand ledger for letter collapse, advice, grammar reordering, stochastic decoding and abstention with their original denominators. Use the completed ECHO agreement analysis as a separate reliability instrument. Keep the 512-request MIRAGE 003 gate closed.

## Phase B · Architecture of artificial belief

Continuation branch `codex/architecture-artificial-belief` branched from v1.5.0 at `523bd906341e5d1b4b1c85ce735fed1f634f1118`. MIRAGE M1 and the exact dynamic-trust foundations are complete and independently checked in software. The MIRAGE protocol was frozen at `6343fba`; the replay then corrected the string serialization check for the historical hashes and the hand-transcribed development key. Original data and scores were preserved. The adaptive-trust fixtures were frozen at `f21688c` and independently verified after the freeze. See the [measurement synthesis](research/mirage-measurement-synthesis.md), [exact mathematical note](research/morpheus-adaptive-mathematics.md) and [reproduction commands](REPRODUCIBILITY.md#phase-b).

Use the guarded Pages workflow and the exact release commit in live `release.json` to establish publication. Resource budget remains 59,334,795 authorized data bytes and zero additional spend. No new model inference or datasets were used. Human review remains pending.

The scoped v1.6.0 release commit is `6bde86b4573997f8b9d1ba476f9ed778095e8b0e`. The final M1 manifest refers to the evidence-class correction at `610d166`; archived numerical content was checked to be identical before and after the correction. The follow-on branch checkpoint adds [MORPHEUS development](research/morpheus-adaptive-development.md) and a finite [AXIOM delayed-settlement fixture](research/axiom-delayed-trade.md). The next unfinished task is to lock an audit-correction comparison and the primary held-out MORPHEUS decision-loss contrast before generating confirmatory histories. The trade fixture's counterparty is exogenous.
