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
