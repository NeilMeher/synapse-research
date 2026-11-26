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
