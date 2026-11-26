# Development state

Milestones 0 and 1 have working deliverables. Milestone 2 ECHO has an executed, computationally validated first slice with human review pending. The other eleven laboratories are proposed.

| ID | Evidence | Status |
|---|---|---|
| S-001 | [Portfolio audit](PORTFOLIO_AUDIT.md) with exact public revisions. Four selected suites passed 13 tests. | Initial source audit complete |
| S-002 | [Literature](research/echo-literature.md), [model](research/echo-mathematics.md), [pilot protocol](research/echo-protocol-pilot.md), [confirmatory protocol](research/echo-protocol-confirmatory.md) | Protocol frozen |
| S-003 | Engine, schema, eight math/contract tests, [pilot artifacts](results/pilot.manifest.json) | Computationally validated |
| S-004 | [Confirmatory run](results/confirmatory.manifest.json), separate exact Python reference and checked digests | Experiments executed |
| S-005 | Static research map, interactive scenario, comparison, archive and export, results linked to actual artifacts | Implemented |
| S-006 | [Manuscript](papers/echo.md), [audit](research/echo-audit.md), release pipeline and [reproduction steps](REPRODUCIBILITY.md) | Human review pending |

## Reproduction and provenance

- Pilot `echo-pilot-001` used 400 tasks and source commit `801a459`.
- Confirmatory run `echo-confirmatory-001` used 8,000 tasks and protocol commit `f7baa9a`. The observed batch runtime was 2.94 seconds and process RSS was about 68 MB on the recorded host.
- Use `git log -1 --format=%H` for the current source revision. Generated run metadata has the full frozen commit IDs.
- Local scientific gates passed `npm test`, `npm run reference` and `npm run verify`. The static bundle passed `npm run build`. Chrome 158 local smoke checks passed at 360, 390, 768 and 1440 px, including the 503 artifact fallback. Deployment status follows the repository workflow.

## Next work

1. Independent human review of the mathematics and code. Follow the [learning checks](docs/echo-learning.md).
2. Specify a second dependence law with matched marginals and pairwise correlation, and add weight sensitivity in a new protocol before running it.
3. Establish portfolio reuse permissions and extend the shared foundation to MIRAGE and REFLEX only after defining their control and reference cases.

The first slice is open software for research and education. Use of human data, paid resources, and verified external replication would require separate work.
