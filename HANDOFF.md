# Cross-Agent Handoff (`HANDOFF.md`)

**Updated:** 2026-11-27  
**Active Agent:** Antigravity (`antigravity@local.invalid`)  
**Next Agent:** OpenAI Codex (or human researcher)

---

## 1. Repository & Branch State

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

## 5. Exact Continuation Instructions for Codex

1. Verify clean state: `git status`, `npm test`, `npm run verify`, `node scripts/morpheus.mjs verify`, `node scripts/alpha-decay.mjs verify`, `npm run build`.
2. Trigger GitHub Actions `workflow_dispatch` (`deploy_pages: true`) via GitHub UI or `gh workflow run` to update `https://neilmeher.github.io/synapse-research/`.
3. Next scientific milestone: Implement **NOESIS** (controlled hidden-law discovery) or **SCIENTIA** (workflow reliability & preregistration), or expand **MORPHEUS** (adaptive provenance + ECHO/MIRAGE cross-lab study) under a new frozen protocol.

## Phase III release preparation

Local verification passed 27 unit tests, all seven reference and archive suites, production build and browser smoke checks at 360, 390, 768 and 1440 pixels. Browser tests now verify the seven distinct evidence entries and both new laboratory workflows, including the MORPHEUS intervention and ALPHA DECAY scenario and round controls. The production build contains 134 checked files. The expected Pages target is this reviewed Phase III branch after passing GitHub CI.

Phase III v0.3.1 was deployed from a9f1cb0 by [Pages run 45954910522](https://github.com/NeilMeher/synapse-research/actions/runs/45954910522). The public revision, artifact hashes and four browser widths were verified.

## Phase IV recovery through SCIENTIA

The recovered input snapshot is archived at 7670acf on [wip/phase4-recovered-archive](https://github.com/NeilMeher/synapse-research/tree/wip/phase4-recovered-archive). Phase III is tagged v0.3.1. NOESIS v0.4.0 is available on Pages from 4dba5a1 through [run 45956303714](https://github.com/NeilMeher/synapse-research/actions/runs/45956303714). Both original NOESIS result hashes were verified against public assets.

The standalone SCIENTIA implementation, frozen studies and lab are on codex/phase4-recovery. Run both commands in REPRODUCIBILITY.md. Its archived approximation changes one audited BH decision relative to erfc. The results and pre-run protocol are immutable. Follow the scientific gates documented for each new study. No independent human review has been completed.
