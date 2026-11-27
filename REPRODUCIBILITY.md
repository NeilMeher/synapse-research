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
