# SYNAPSE

SYNAPSE is an independent computational research programme on cognition, collective intelligence, scientific reliability and economic systems. The public website links interactive laboratories to their source data, protocols, results and reproduction instructions.

[Live research atlas](https://neilmeher.github.io/synapse-research/#map) · [Latest GitHub release](https://github.com/NeilMeher/synapse-research/releases/latest) · [Evidence library](https://neilmeher.github.io/synapse-research/library.html) · [Mathematical Academy](https://neilmeher.github.io/synapse-research/academy.html)

## Empirical research

The first exploratory model study compares expressed confidence under neutral and misleading advice. It records 128 genuine local generations from SmolLM2-135M-Instruct Q4_K_M, including abstentions. The pilot also supplies a frozen benchmark, raw responses, an independent scoring check and a static response explorer. [Empirical Observatory](https://neilmeher.github.io/synapse-research/observatory.html) · [MIRAGE pilot findings](research/mirage-empirical-results.md)

The second MIRAGE study separates displayed position, answer letters, grammar order and cue content in a registered 32-task design. The original archive remains available for comparison. [MIRAGE 002 workbench](https://neilmeher.github.io/synapse-research/mirage-robustness.html) · [Research report](research/mirage-robustness-results.md)

## Research

| Study | Method and evidence |
| --- | --- |
| [POLIS 2.0](https://neilmeher.github.io/synapse-research/polis2.html) | Matched synthetic settlement and valuation study |
| [ARTHA](https://neilmeher.github.io/synapse-research/artha.html) | Source-accounted national scenarios from ADB India industry tables |
| [ENERGIA](https://neilmeher.github.io/synapse-research/energia.html) | Engineering and discounted cash-flow scenarios under stipulated terms |
| [NEXUS](https://neilmeher.github.io/synapse-research/nexus.html) | Matched bridge from a capital ledger to domestic production requirements |
| [CHRONOS](https://neilmeher.github.io/synapse-research/chronos.html) | Indian railway history, source reconciliation and causal readiness |

The [knowledge graph and search](https://neilmeher.github.io/synapse-research/knowledge.html), [evidence catalogue](https://neilmeher.github.io/synapse-research/library.html), and [quality register](research/programme-quality-register.md) connect the complete registry. Protocols, deterministic or seeded replays, source hashes, and independent computational checks accompany completed studies. See [scientific limitations](LIMITATIONS.md) and [contribution disclosure](CONTRIBUTION_REGISTER.md). Independent human review is pending.

[Five-minute demonstration](research/portfolio-demonstration.md) · [Independent review package](research/external-review.md) · [Upcoming empirical designs](research/future-empirical-programme.md) · [Contribution guide](CONTRIBUTING.md)

## Start

Use Node 24.12.0, npm 11.6.2 and Python 3.14.0.

```sh
npm ci --ignore-scripts
npm test
npm run reference
npm run verify
npm run build
npm run preview
```

Open [the local preview](http://127.0.0.1:4181). A local server is required for the browser's ES modules and result fetch. The build has no API, credentials, external assets or application dependencies.

The confirmatory ECHO run contains 8,000 independent synthetic tasks across five correlation settings. See [the manuscript](papers/echo.md), [reproduction steps](REPRODUCIBILITY.md), [portfolio audit](PORTFOLIO_AUDIT.md), [project state](PROJECT_STATE.md) and [research roadmap](ROADMAP.md). The original ECHO archive remains accessible. The public [research atlas](https://neilmeher.github.io/synapse-research/#map) links twelve labs and their development status. The [evidence library](https://neilmeher.github.io/synapse-research/library.html) indexes completed studies, including the POLIS 2.0 matched settlement comparison and ARTHA’s official-data input–output scenarios. The [Mathematical Academy](https://neilmeher.github.io/synapse-research/academy.html) has linked modules with worked examples. Use [GitHub releases](https://github.com/NeilMeher/synapse-research/releases) to find the verified public revision and release notes.

Explore ECHO 2.0 at #robustness. Its matched-dependence experiment has a separate protocol and dataset. See the [ECHO 2.0 manuscript](papers/echo2.md) and updated [reproduction guide](REPRODUCIBILITY.md).
