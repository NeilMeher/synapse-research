# Phase II Forensic Audit and Verification (`PHASE2_VERIFICATION.md`)

**Audit Date:** 2026-11-27  
**Audited Commit:** `5bc45f937f468c0e2465dee15f148f54ae069a8f` (`codex/phase2-integration`, version `0.3.0`)  
**Auditor:** Antigravity (AI-assisted verification; independent human peer review pending)

---

## 1. Verification Environment & Commands Executed

All checks were executed in `c:\Users\neilm\Documents\Codex\2026-11-25\i-want-to-build-which-can\itihasa\.tools\synapse-phase2` under Node `v24.12.0`, npm `11.6.2`, and Python `3.14.0`:

| Command | Scope | Outcome | Notes |
|---|---|---|---|
| `npm test` | `tests/*.test.mjs` | **Passed (21/21)** | 0 failed, 0 skipped, 308.8 ms |
| `npm run reference` | ECHO v1 Python exact reference (`scripts/reference.py`) | **Passed** | Exact contrasts: `0.186653`, `0.062218`, `0.058672` |
| `npm run verify` | ECHO v1 pilot & confirmatory digests | **Passed** | `echo-pilot-001` (`33bb8fd0...`), `echo-confirmatory-001` (`e1025167...`) |
| `python scripts/reference_echo2.py` | ECHO 2.0 rational reference | **Passed** | Checked `rho` grids for pilot & confirmatory |
| `node scripts/echo2.mjs verify` | ECHO 2.0 pilot & confirmatory digests | **Passed** | `echo2-pilot-001` (`785d194b...`), `echo2-confirmatory-001` (`71061b57...`) |
| `python scripts/reference_mirage.py` | MIRAGE exact Brier & log-loss | **Passed** | Checked `normal` & `misleading` for pilot & confirmatory |
| `node scripts/mirage.mjs verify` | MIRAGE pilot & confirmatory digests | **Passed** | `mirage-pilot-001` (`bfd0b9a5...`), `mirage-confirmatory-001` (`8de5b73f...`) |
| `python scripts/reference_reflex.py` | REFLEX fill & ledger replay | **Passed** | Checked 103 & 104 confirmatory fills; 108 & 108 pilot fills |
| `node scripts/reflex.mjs verify` | REFLEX pilot & confirmatory digests | **Passed** | `reflex-pilot-001` (`8220385c...`), `reflex-confirmatory-001` (`92772fd7...`) |
| `python scripts/reference_convergence.py` | CONVERGENCE mechanism & ledger replay | **Passed** | Checked 22 arms, 478 confirmatory fills, 488 pilot fills |
| `node scripts/convergence.mjs verify` | CONVERGENCE pilot & confirmatory digests | **Passed** | `convergence-pilot-001` (`cf4318de...`), `convergence-confirmatory-001` (`f567dec2...`) |
| `npm run build` | Static bundle (`scripts/build.mjs`) | **Passed** | Built 97 public files with checked local links |
| `node tests/browser-smoke.mjs` | Playwright browser smoke | **Blocked locally** | Chromium headless binary not installed locally; runs in GitHub Actions CI |

---

## 2. Component-by-Component Audit

### 2.1 ECHO v1 & ECHO 2.0 (`engine/echo.mjs`, `engine/dependence.mjs`, `engine/echo2.mjs`)
- **Actual Implementation:** Dependency-free ES modules implementing Bernoulli truth, shared-source mixture, beta-binomial latent reliability, sharp finite-exchangeable moment bounds, DeGroot / bounded-confidence network dynamics, and matched-reliability verification replacement.
- **Protocol & Findings:**
  - `echo-confirmatory-001` (8,000 tasks, `n=15`, `q=0.68`): Majority gain lost from `rho=0` to `rho=0.75` is `18.86 pp` (Bonferroni CI `18.29–19.43 pp`, exact `18.67 pp`); complete minus hub at `rho=0.75` is `6.30 pp` (`5.57–7.03 pp`, exact `6.22 pp`); matched verification gain at `rho=0.75` is `6.04 pp` (`5.19–6.89 pp`, exact `5.87 pp`).
  - `echo2-confirmatory-001` (16,000 paired tasks/cell, `n=21`, `q=0.65`): At `rho=0.30`, exact majority accuracy is `84.10%` (shared-source) vs `70.34%` (beta-binomial), difference `-13.75 pp`. Sharp moment-constrained exchangeable bounds at `rho=0.30` are `[0.360455, 0.939545]`.
- **Verification Status:** **Verified.** All v1 artifacts remain byte-identical (`e102516726740cf13d140c35bc35a3c5a2fa5de5de761e253a03f2ec118212ec`).
- **Known Limitations:** Homogeneous signal reliability, symmetric binary truth, oracle knowledge of source structure for Bayesian agents.

### 2.2 MIRAGE (`engine/mirage.mjs`, `engine/confidence.mjs`, `apps/web/mirage.html`, `papers/mirage.md`)
- **Actual Implementation:** Evaluates five confidence policies (`constant`, `style`, `nominal`, `calibrated`, `oracle`) on identical first-order binary decisions (`selected`) across three cue-quality tiers and two regimes (`normal`, `misleading`).
- **Mathematical & Integrity Checks:**
  - `answerConfidence(qAnswer, qHint, agreement)` computes the exact posterior probability that the *already selected* answer is correct (distinguishing selected-answer correctness from truth posterior).
  - First-order decisions (`selected`) are identical across all five confidence policies (`71.97%` accuracy in both regimes).
  - Training (`trainSeed`) and evaluation (`evaluationSeed`) seeds are strictly separated (`evaluationSeed !== trainSeed`), with no truth leakage into `oracle` (uses `qAnswer`, `qHint`, `agreement` only).
- **Protocol & Findings (`mirage-confirmatory-001`):** 3,000 training cases, 6,000 evaluation cases per regime. Normal regime: `style` Brier `0.2296` vs `calibrated` Brier `0.1743` (paired diff `0.05525`, Bonferroni CI `0.04917–0.06133`). Misleading regime: `calibrated` Brier worsened to `0.2202`, error AUROC fell from `0.7355` to `0.4894` (near chance), while `oracle` achieved `0.7012` AUROC and `0.1809` Brier.
- **Verification Status:** **Verified.** No subjective consciousness claims are made.

### 2.3 REFLEX (`engine/reflex.mjs`, `engine/market.mjs`, `apps/web/reflex.html`, `papers/reflex.md`)
- **Actual Implementation:** Deterministic integer-tick inventory-sensitive market maker trading against 9 agents (`fundamental`, `momentum`, `contrarian`, `noise`) via immediate-or-cancel (IOC) orders.
- **Mathematical & Integrity Checks:**
  - Exact integer conservation of cash and asset units (`reconcile(market)` checks `current.cash === market.totals.cash` and `current.assets === market.totals.assets`, plus non-negative safe integers after every order).
  - Fee account (`fees`) collects 1 tick per filled unit; marked-to-market wealth (`cash + assets * mark`) properly varies with midpoint without falsely claiming marked wealth is invariant.
  - Epistemic timing: agents only observe contemporaneous signals and current/prior midpoint, never future fundamentals.
  - Seeded reproducibility with matched fundamental and signal paths across `impact=1` and `impact=4` arms, using episodes as the statistical unit.
- **Protocol & Findings (`reflex-confirmatory-001`):** 400 paired 6-round episodes. Higher impact (`4` vs `1`) reduced mean absolute midpoint error from `117.86` to `111.42` ticks (paired diff `-6.43` ticks, 95% CI `-7.32` to `-5.54`), while RMS midpoint return rose from `0.0470%` to `0.1879%`.
- **Verification Status:** **Verified.** Synthetic market outcomes are explicitly distinguished from real financial markets.

### 2.4 CONVERGENCE (`engine/convergence.mjs`, `apps/web/convergence.html`, `papers/convergence.md`)
- **Actual Implementation:** Connects ECHO (`sampleReports` with `independent`, `shared`, `beta` laws at `rho=0.30`, `q=0.65`, `n=15`) -> MIRAGE (`answerConfidence` / `style` / `fixed` sizing) -> REFLEX (`initializeMarket`, `submitOrder`) across 22 arms.
- **Mathematical & Integrity Checks:**
  - Uses independent synthetic episodes (1,200 paired episodes) as the experimental unit.
  - No look-ahead bias; `style` policy matches expected order size (`23.51`, `23.41`, `23.46` submitted units) to `calibrated` sizing.
  - Null communication contrast (`equal` vs `weighted` ring communication producing identical actions) is transparently explained: two disagreement confidences (`0.44318`) outweigh one agreement confidence (`0.81250`), so 2-to-1 votes cannot flip.
- **Protocol & Findings (`convergence-confirmatory-001`):** Both prespecified contrasts include zero in their family-adjusted intervals: beta-binomial minus shared-source under calibrated sizing at high impact = `1.89` ticks (`-2.24` to `6.02`), and calibrated-vs-style interaction = `-0.09` ticks (`-0.63` to `0.45`).
- **Verification Status:** **Verified.**

### 2.5 Phase II Integration (`apps/web/library.html`, `research/phase2-audit.md`, `apps/web/map.mjs`)
- **Actual Implementation:** `library.html` links all 5 confirmatory studies (`ECHO v1`, `ECHO 2.0`, `MIRAGE`, `REFLEX`, `CONVERGENCE`) to their data, manifests, manuscripts, and `phase2-audit.md`.
- **Required Corrections / Follow-ups:**
  1. `apps/web/map.mjs` currently marks `echo`, `mirage`, and `reflex` as implemented, while `convergence` is a cross-lab study not yet given its own node or expanded link from the map detail panel (addressed in Phase III unified website upgrade).
  2. GitHub Pages deployment requires triggering `workflow_dispatch` with `deploy_pages: true` in GitHub Actions to update the live site from `v0.2.0` to `v0.3.0`.
