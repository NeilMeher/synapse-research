# Reproduce ECHO

Start from a clean clone with Node 24.12.0, npm 11.6.2 and Python 3.14.0. No external dataset, API, nonstandard package or secrets are required.

```sh
npm ci --ignore-scripts
npm test
npm run reference
npm run verify
npm run build
```

`verify` checks the archived file digests and current scientific inputs, reruns the fixed configuration, then compares canonical decoded output. `reference` independently enumerates the finite signal law in Python and checks all recorded policy means and paired effects against exact expectations. The five-standard-error reference fence is an implementation diagnostic. It is distinct from the reported statistical intervals.

To create refreshed runtime envelopes and results, first run the verification above. Then run `npm run pilot` and `npm run experiment`. These commands replace the local run files with new envelopes referencing the current Git HEAD and measuring the current machine. Keep the original archived manifests when citing the published run. To reproduce the recorded commit identity as well, run from the full commit in the relevant manifest. Each run records the deterministic-output SHA-256, configuration and scientific source hashes, observed runtime and seed policy.

The random order is documented in `drawTask`. Each task draws truth, mixture selector, shared correctness, tie decision, original private values, then fresh independent values. All correlation and policy arms reuse that task. To recover the illustrated replay, open the website and choose an archived entry. Its events are in [confirmatory.json](results/confirmatory.json). Exported browser exploration JSON is suitable for inspection and uses the explicit seed and scenario fields.

The first-trial archival choice was specified before execution. The browser's separate seeded example was selected for visible contrast and is labelled a browser simulation.

## ECHO 2.0
Run `python scripts/reference_echo2.py` and `node scripts/echo2.mjs verify` alongside the v1 gates. To rerun with new runtime metadata, use `node scripts/echo2.mjs pilot` and `node scripts/echo2.mjs confirmatory` in a separate checkout. Preserve original archived files. The confirmatory run targets the commit in its manifest and has 16,000 paired trials per condition. The Python reference rationalizes decimal inputs from the configuration and independently checks the result.

## Integrated benchmark and market experiments
For each study named mirage, reflex or convergence, run python scripts/reference_<study>.py and node scripts/<study>.mjs verify. The relevant manifest records code revision, resource use, seed-bearing config, and digests. Use a disposable clone for commands that refresh runtime manifests. The study archives themselves are versioned separately from build-level release provenance.

## NOESIS v1

Run `node scripts/noesis.mjs verify` and `python -B scripts/reference_noesis.py`. The first command reproduces both untouched JavaScript archives. The second independently recomputes every task and aggregate using observation-space Cholesky. See the [archive audit](research/noesis-audit.md) and [manuscript](papers/noesis.md). Use a future run ID for design changes.

## SCIENTIA v1

Run `node scripts/scientia.mjs verify` and `python -B scripts/reference_scientia.py`. The first reruns the registered archives deterministically. The Python reference reconstructs all metrics and tests the exact Gaussian tail alongside the archived approximation. The [audit](research/scientia-audit.md) records one near-threshold discrepancy. The fixed-design run identifiers and seed-bearing config are in the [pilot](research/scientia-pilot.md) and [confirmatory protocol](research/scientia-confirmatory.md).

## EPISTEME v1 and the public atlas

Run `node scripts/episteme.mjs verify` and `python -B scripts/reference_episteme.py`. The Python implementation reproduces the Bayesian update recursively, then rechecks the independent residual gates, all aggregate estimates and the archived first replays. The [frozen protocol](research/episteme-confirmatory.md) identifies the two primary comparisons. The build checks the registry's research paths and verifies the bytes of every public pilot and confirmatory data file against its manifest. Rebuilding the atlas does not change the archived results. The release CI installs the pinned QA-only JSON Schema validator and runs `python -B scripts/check_schemas.py`. The website and experiment runners do not require that dependency.

## AXIOM finite benchmark

Run `node scripts/axiom.mjs verify` and `python -B scripts/reference_axiom.py`. These check the frozen input hashes, archive bytes, deterministic reconstruction and all 80 cases via independent rational utility calculations. The finite benchmark uses exact enumeration. `node scripts/axiom.mjs pilot` writes a new archive only in a clean reproduction checkout with no result files and frozen inputs. [Protocol](research/axiom-pilot.md) · [Audit](research/axiom-audit.md)

## GAME OF CIVILIZATIONS v1

Run `node scripts/civilizations.mjs verify` and `python -B scripts/reference_civilizations.py`. Compare the per-resource equations after each day in the archived replay. Python models allocations and deliveries separately, uses fractions for beliefs, and checks every trajectory aggregate against the archives. [Protocol](research/civilizations-confirmatory.md) · [Audit](research/civilizations-audit.md)

## POLIS v1

Run `node scripts/polis.mjs verify` and `python -B scripts/check_polis_reference.py`. Run the adapter as documented. It compares summary means at floating precision without changing independent exact replay and ledger checks. The stress primary contrast and fixed-prior equivalence control are in the [confirmatory protocol](research/polis-confirmatory.md).

## POLIS 2.0

Run `node scripts/polis2.mjs verify` and `python -B scripts/reference_polis2.py`. The new archives reuse the independent world generator but implement separate exact payment logic. [Frozen protocol](research/polis2-confirmatory.md)

## ARTHA

Download the original ADB workbook using the URL in [the source manifest](sources/artha-adb-india.json) and run `python -B scripts/extract_artha.py <workbook> --check`. The extractor verifies the original hash, exact unit labels, classification, accounting and byte-identical processed data. Run `python -B scripts/test_extract_artha.py`, `python -B scripts/check_artha_reference.py` and `node scripts/artha.mjs verify`. The reference recomputes the four accounting panels and twelve scenario vectors as series of production rounds. The registered result hash is `291d4a118aa50273beb0b05692bac98361abb1a90549d267e4fc16ae183df28d`. The frozen initial reference's exact equality assertion is documented in the audit.

## ENERGIA

Run `node --test tests/energia.test.mjs`, `node scripts/energia.mjs verify` and `python -B scripts/check_energia_reference.py`. The last command runs independent closed-form balances plus a scale-aware near-root numerical check. The deterministic archive covers six ledgers, 59 grid cells, bounded break-even calculations, NPV profiles and a constrained finite comparison. Use the preregistered inputs and manifest to reproduce exact settings.

## NEXUS and Phase VI releases

Run `node --test tests/nexus.test.mjs`, `python -B scripts/reference_nexus.py` and `node scripts/nexus.mjs verify`. The Python reference recomputes procurement, engineering, cash flow and the full national response after checking both matched invariants. `scripts/check_schemas.py` validates the completed result contracts, source records and the three deterministic run manifests. The default branch is the stable Pages source. Review the Pages workflow, release metadata, archive SHA-256 and exact browser suite at 360, 390, 768 and 1440 pixels after publication.

## CHRONOS

Run `python -B scripts/extract_chronos.py --check` to reproduce public normalized observations from the preserved reviewed transcriptions. Then run `python -B scripts/reference_chronos.py` and `node scripts/chronos.mjs verify`. For full local publisher checks, obtain the exact original bytes and filenames from [the source manifest](sources/chronos-rail.json). Install the optional `pypdf==7.2.0` from PyPI (wheel SHA-256 `5edb9b033dd55cecead9303370e6854c1a3b979669bde1c46024cde0228405b1`) in an isolated environment, then run `python -B scripts/extract_chronos.py --check --source-dir <directory>`. The parser runs without the dependency for the normal deterministic data check. The richer local audit verifies both primary PDF tables and the RBI snapshot, and reports restricted comparative source differences locally. Do not include local publisher files in the release.

## Integrated browser and accessibility checks

Build the static site with `npm run build` and run the existing `node tests/browser-smoke.mjs` with Playwright installed. The suite checks layout and interactions at 360, 390, 768 and 1440 pixels. For an optional automated accessibility audit, set AXE_SCRIPT to a local `axe-core@4.14.1` minified distribution. Its verified minified SHA-256 is `29348999450cdf2849a8e70b7912fc2da85a849da39c0d0d5394f51d4a9ed95c`. The test checks six representative routes at 390 and 1440 pixels in both themes. Set SYNAPSE_URL to a released base URL to repeat browser checks on production.


## MIRAGE empirical pilot

Run these checks from a clean checkout. They verify the published archive without weights, model service or network access.

```sh
python -B -m unittest empirical.test_empirical
python -B -m empirical.archive verify
python -B -m empirical.reference
```

The archive verification replays the frozen parser, scoring, intervals and all digests against the original observations. The separate rational reference reads the printed questions, solves them and calculates primary loss. The six development and calibration files are versioned alongside the pilot dataset. CI checks the 128 raw records against the response schema.

A fresh collection needs a separate clean checkout of freeze revision `3221e089051b338a78194a25f8fe1b77782d2e5d`, the exact Windows CPU llama.cpp executable and GGUF obtained from the linked releases. Compare the downloads to the protocol's SHA-256 fields. Apply the same command from the freeze revision again to recover an interrupted collection. In-flight requests are counted as interrupted and are never regenerated by the collector.

```sh
python -B -m empirical.run collect --split pilot --runtime PATH_TO_RUNTIME --weights PATH_TO_GGUF --freeze-commit 3221e089051b338a78194a25f8fe1b77782d2e5d
python -B -m empirical.archive archive
```

Archive generation refuses an existing archive directory. Fresh model generations can differ even with the pinned seed. Keep fresh reproduction evidence apart from the original archive and compare coverage, option distributions and paired effects. [Model access and publisher links](research/empirical-model-access.md) · [Protocol](research/mirage-empirical-protocol.md) · [Pilot result](research/mirage-empirical-results.md)


## MIRAGE 002 · Robustness study

The analysis replay uses Python 3.14 and needs no weights or network service. The two evidence sets have distinct directories. Verify the original pilot separately.

```sh
python -B -m empirical.robustness.audit
python -B -m unittest empirical.robustness.test_robustness
python -B -m empirical.robustness.archive verify --split development
python -B -m empirical.robustness.archive verify --split heldout
python -B -m empirical.robustness.reference
```

The independent implementation solves the printed questions and checks each canonical remap, realized balance, observed counts and rational Brier calculations. Archive replay recomputes the task-level bootstrap. The observed request journal is kept apart from scored results and derived summaries. Missing requests and abstentions remain visible in archived denominators.

For fresh inference, use a new clean checkout of `22c5d8bec4858320e33de6e8715f1eb28243f855`, the exact verified Windows CPU executable and SmolLM2 GGUF. Use the pinned weight, runtime and protocol hashes in the released manifest. The collector checks the clean freeze, and it reuses the journal when restarted at that revision. The build command refuses an existing result archive. Keep independent reproduction data apart from the original.

```sh
python -B -m empirical.robustness.collect --split heldout --runtime PATH_TO_RUNTIME --weights PATH_TO_GGUF --freeze-commit 22c5d8bec4858320e33de6e8715f1eb28243f855
python -B -m empirical.robustness.archive build --split heldout
```

The fixed seed, settings and files preserve the design. Hardware, runtime or tokenizer changes can change observed outputs. [Protocol](research/mirage-robustness-protocol.md) · [Study results](research/mirage-robustness-results.md)


## MIRAGE 004 · Decode, sample and reorder

From a clean checkout, the frozen request plan and evidence replay need no model server, GPU or network access.

```sh
python -B -m unittest empirical.phase3.test_phase3
python -B -m empirical.phase3.archive verify development
python -B -m empirical.phase3.archive verify decoding
python -B -m empirical.phase3.reference
python -B -m empirical.phase3.device_probe --verify
```

A fresh CPU run uses a separate clean checkout at the freeze, a verified original b12823 Windows runtime, the exact SmolLM2 GGUF, and an empty journal. Reusing the exact source commit and journal allows restart with no regenerated responses.

```sh
python -B -m empirical.phase3.collect decoding --runtime PATH_TO_RUNTIME --weights PATH_TO_GGUF --freeze-commit 35e2a14c57fe76d7218fbff11a953199c719a0c1
python -B -m empirical.phase3.archive build decoding
```

The archived analyzer references 16 canonical tasks. Repeated samples per task are a group for uncertainty. The fresh-run output may differ across runtime or machine configurations. Qwen has a separate prepared protocol and needs authorization and runtime preflight before development. [Decoding design](research/mirage-decoding-protocol.md) · [Backend model access](research/mirage-phase3-access.md)


## Qwen capability evidence

Run the offline checks to reproduce the archived responses, independent remapping, rational Brier score and readiness criteria. They issue no model requests.

```sh
python -B -m empirical.qwen.core verify qwen-development
python -B -m empirical.qwen.reference
```

The resulting archive identifies the exact official model, GPU backend, guarded resource measurements, frozen original prompts, and stopping rules. To reproduce fresh development legally and safely, use a separate clean checkout at `aa0b0215b8d843d0b7783b03e3f2ebfd82642975` with its original resource envelope. The current gate outcome leaves the matched run unopened. [Frozen configuration](research/mirage-qwen-vulkan-streamed.md) · [Reference and outcomes](research/mirage-qwen-capability-results.md)

## ECHO public empirical studies 001 and 002

Use Node 24.12.0 and Python 3.14. The following commands replay the versioned compact predictions, audit their hashes, and independently check the split, exact votes, committee search, error counts and paired bootstrap. They require no network or model weights.

```text
node empirical/echo-public/run.mjs verify
python -B empirical/echo-public/reference.py
```

Raw alignment optionally needs the DuckDB 1.4.4 Parquet reader in an isolated Python environment. Set a local `SOURCE_DIR` and a separate empty `PARTITION_DIR` outside Git. The fetch stage retrieves only the 22 files in the pinned manifest, with total size 101,539,044 bytes. Existing corrupt files fail verification. A rerun of extraction compares the exact structural audit with the frozen one before writing the three compact partitions.

```text
python -m pip install --only-binary=:all: --no-deps duckdb==1.4.4
python -B empirical/echo-public/extract.py fetch SOURCE_DIR
python -B empirical/echo-public/extract.py extract SOURCE_DIR PARTITION_DIR
python -B empirical/echo-public/reference.py --sources SOURCE_DIR
```

The simulation and scoring replay compares publisher output on known canonical questions. Original model inference is outside reproduction scope. [Pinned sources](empirical/echo-public/sources.json) · [Frozen protocol](research/echo-public-protocol.md) · [Run manifest](empirical/archives/echo-public-empirical-001/manifest.json)

## Second-generation ECHO and MORPHEUS

Replay the compact bilingual choices and verify policies, paired confidence intervals and Brier using separate implementations. The exact moment reference checks archived rational primal and dual witnesses using the standard library. The MORPHEUS reference regenerates every frozen history–arm evaluation independently.

```text
node empirical/echo-hindi/run.mjs verify
python -B empirical/echo-hindi/reference.py
python -B research/echo-moments/reference.py
node research/morpheus-trust/run.mjs verify
python -B research/morpheus-trust/reference.py
```

For raw archive verification, retrieve only the size-bounded files in the Hindi source receipt using each repository, revision and path. Reuse the already retrieved English benchmark. The blind alignment and post-freeze extraction use DuckDB 1.4.4, as in the English study. Run `align.py extract HINDI_DIR ENGLISH_DIR COMPACT_FILE` to reproduce choices while checking the frozen cohort. Run `reference.py HINDI_DIR` to reproduce from raw Hindi completions. For numerical witness discovery, `compute.py` can run in a fresh copy with SciPy 1.17.0 and the original protocol commit. Archived witness verification never needs SciPy and accepts no numerical tolerance on exact constraints. [Hindi receipt](empirical/echo-hindi/sources.json) · [Moment protocol](research/echo-moments-protocol.md)

## Phase B

From the repository root, run:

```sh
python -B research/mirage-measurement/replay.py verify
python -B research/adaptive-trust/reference.py verify
npm run build
```

MIRAGE reads six local original archives, uses the historical score projections and per-task resampling orders and checks the independent synthesis artifact byte for byte. The trust reference uses Python rational arithmetic and independently enumerates outcome, hidden-state and decision paths to check the shared browser implementation. Declared numerical tolerance is absolute \(10^{-12}\). Both checks run without new data or inference. Recompute in verify mode to preserve archived files. [MIRAGE protocol](research/mirage-measurement-protocol.md) · [Frozen trust fixtures](research/adaptive-trust/fixtures.json)

On the follow-on branch, run:

```sh
node research/adaptive-trust/development.mjs verify
python -B research/adaptive-trust/development-reference.py
python -B research/axiom-trust-fixture.py verify
```

The two development checks regenerate every stress history and decision in memory. The trade fixture compares two exact solution methods and verifies the archive byte for byte.

## MORPHEUS MO2

Run `node research/morpheus-confirmatory/run.mjs verify` and `python -B research/morpheus-confirmatory/reference.py`. The Node replay checks unchanged archive bytes. Python checks 2,304 environment-history realizations, 2,801,664 decisions and all 17 paired contrasts. Its exact fixtures and backward recursion independently check timing, and numerical comparisons use absolute tolerance \(10^{-12}\). Run the schema checks through `python -B scripts/check_schemas.py`. [Protocol](research/morpheus-confirmatory-protocol.md) · [Manifest](research/evidence/morpheus-adaptive-reliability-confirmatory-002/manifest.json)

## Phase B strategic and integrated fixtures

Run `python -B research/axiom-strategic/run.py verify` and `python -B research/belief-dynamics/reference.py verify`. These regenerate exact rational outputs in memory and compare immutable bytes, separate solution methods, the JavaScript belief decisions and the existing POLIS physical ledger. No fresh data, acquisitions or paid inference are required.
