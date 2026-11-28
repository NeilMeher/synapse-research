# Architecture and decisions

## ADR 001 · Use one dependency-free numerical engine

Status accepted for the first ECHO slice. Use Node 24.12.0 for the local runner and native ES modules in the browser. The same pure functions implement seeded evidence, models, scoring and replay. A Python standard-library enumerator provides an independent analytic reference. React/Astro and a Python-only simulation stack were considered. A native static app avoids a build toolchain and a second production implementation for the bounded slice. Reevaluate when routing, rendering or numeric workload needs justify it.

## ADR 002 · Version artifacts and publish static files

Status accepted for the first ECHO slice. Use canonical configuration digests, input/source digests and stable seeds. Keep run envelopes with observed runtime and environment separate from deterministic results. Publish sanitized outputs only. Host on a static service when release gates pass. GitHub Pages supports public GitHub Free repositories and has published limits. Vercel Hobby is personal and non-commercial with usage limits. Neither service should execute scientific batches. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) · [Vercel Hobby](https://vercel.com/docs/plans/hobby)

## Data flow

Versioned protocol → validated configuration → paired task draws → evidence arms → analyst metrics and intervals → hashed result artifacts → rendered evidence and replay. Browser-only edits instantiate local synthetic tasks. Three kinds of interchange object are defined in schemas/experiment-v1.json. No backend or external dataset is required.

## Budget

Zero dollars. One local worker, up to 100,000 task draws, 41 agents and 50 rounds per trajectory, with a 30-second batch runtime limit checked between tasks. Preview interactions use one task at a time and bounded rounds. Record measured runtime and peak process RSS before broadening. Large batch, parallel workers, external models, personal data and paid hosting are outside the first slice.

## ADR 003 · Versioned dependence kernel
engine/dependence.mjs is a bounded, browser-safe extension. engine/echo2.mjs wraps paired sampling and exact analysis. The distinct echo-dependence-result-v1 schema leaves all v1 semantics intact. The exact rational reference shares the data contract and uses an independent algorithm. The ECHO 2.0 runner caps samples at 50,000 single-threaded tasks within the existing 30-second budget.

## ADR 004 · Separate confidence, observations and execution
MIRAGE uses engine/confidence.mjs for binary forecasts and scoring. REFLEX wraps engine/market.mjs under integer quote, balance and order contracts. CONVERGENCE connects the three kernels through reports, probabilities and immediate-or-cancel orders. scripts/run-study.mjs handles seed provenance, immutable source and output digests, bounded execution and deterministic verification. Each study has a distinct schema identifier. Native ES modules serve all pages. The build release.json identifies the deployed Git revision.

## Discovery, validation and the public atlas

Browser labs load versioned synthetic artifacts and pure JavaScript mathematical engines. EPISTEME composes the Bayesian NOESIS candidate fits with two disjoint residual checks. It freezes the candidate before using either reserved block and reports model-family scoring separately from the absolute residual decisions. SCIENTIA retains its archived eight-rule procedure under a distinct matched allocation design. Python references take separate mathematical routes.

The versioned research registry provides atlas metadata, journeys, the generated static evidence library and build-time checks for study paths and data integrity. Browser acceptance tests keep an independently named list of the expected studies and links. Academy exercises call the dependence, confidence, market, information and multiplicity engines directly.

## Phase V · Decisions and resource accounting

AXIOM keeps display permutations separate from canonical payoff and belief indices. The exact quarter-weight implementation calls a shared two-option decision kernel. GAME OF CIVILIZATIONS separates physical ledger operations, seeded world generation and the decision interface. POLIS supplies alternative expected-utility comparisons to that interface, using the same world schedules and accounting. The finite AXIOM archive registers a single phase. World studies register separate pilot and confirmatory phases. The build checks archived hashes and registered links before serving either kind of study.

ARTHA extracts a pinned official symmetric input–output workbook to processed JSON. Its shared ESM kernel validates budgets, forms the domestic coefficient matrix and solves demand changes. Dimensions and source IDs are retained across the optional grouping. Static build assets are declared by study in the registry.

The ENERGIA ESM kernel exposes annual engineering and project cash ledgers, deterministic discounted summaries and bounded finite comparisons. Its runtime archive embeds the frozen schedule and separate source manifest; browser controls reuse the same kernel.

NEXUS connects the ENERGIA capital ledger to a versioned ADB sector bridge. Only disjoint domestic component values enter the ARTHA final-demand vector. Direct foreign procurement, embodied imported inputs, and operating cash remain distinct. The atlas registry points to the matched results, sources and four associated Academy modules.

The knowledge graph, catalogue and curriculum reuse shared ESM registries. Static build indexing extracts bounded manuscript and source text from tracked documents. The reader creates DOM nodes from structured text and restricts link protocols. CHRONOS retains fiscal periods, source-cell locators, gaps and state boundary annotations and reuses one engine across the CLI and browser. No runtime backend or telemetry is required.


## ADR · Run empirical inference locally and publish immutable evidence

A local standard-library Python collector passes two bounded messages to a pinned llama.cpp process over loopback. The evaluator maintains the answer key apart from inference and archives raw permitted responses, derived scores and analysis as distinct artifacts. SQLite checkpoints prevent duplicate execution after partial failure. GitHub Pages serves only checked input files and results and renders model text as text nodes. The synthetic laboratories retain their native JavaScript engines. [MIRAGE protocol](research/mirage-empirical-protocol.md)
