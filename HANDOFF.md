# Cross-Agent Handoff (`HANDOFF.md`)

**Updated:** 2026-11-27  
**Current continuation** · codex/phase5-social-systems

Use the Phase V checkpoints at the end for current execution and deployment. The Phase III handoff below records the state Antigravity left for Codex.

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
