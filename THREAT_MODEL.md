# Threat model

The initial trust boundary is a static filesystem bundle and bounded, local computation in a visitor's browser. No identity, user data upload, credential processing, network model calls or persistence.

| Risk | Control and verification |
|---|---|
| Manipulated experiment input or result | Strict keys and ranges for experiment settings, hash validation of tracked artifacts, reference checks and small limits |
| Code injected via URL, artifacts or labels | Relative local fetches, explicit accepted IDs, DOM text rendering, no eval or user scripts |
| Unbounded work or degraded browser | Explicit trial, agent and round caps, synchronous single-task replays, stoppable timed playback |
| Prompt injection from source material or model output | The initial release has no model adapter or fetched external documents. Future systems must treat those inputs as data. |
| Credential exposure or private-data publication | No credentials or private files in the project. Inspect staged paths, contents, licensing and release diff. |
| Supply chain and generated code | No installed application dependencies. Pin runtimes and CI action revisions. Future generated code needs network/filesystem isolation and resource limits. |
| Unauthorized access, uploads or leaked experimental records | No server endpoints, uploads or human datasets in the initial release. |
| Evidence misinterpretation | Label all ECHO outcomes synthetic, retain negative results, document assumptions and review status. |
