# SYNAPSE

SYNAPSE is an independent computational research programme on cognition, collective intelligence and complex systems. ECHO, the first lab, tests how a specified shared-source process and network policy affect binary group decisions.

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

The confirmatory ECHO run contains 8,000 independent synthetic tasks across five correlation settings. See [the manuscript](papers/echo.md), [reproduction steps](REPRODUCIBILITY.md), [portfolio audit](PORTFOLIO_AUDIT.md), [project state](PROJECT_STATE.md) and [research roadmap](ROADMAP.md). The original ECHO archive remains accessible. The public [research atlas](https://neilmeher.github.io/synapse-research/#map) links twelve labs and their development status. The [evidence library](https://neilmeher.github.io/synapse-research/library.html) indexes 13 completed computational studies, including AXIOM, GAME OF CIVILIZATIONS, and POLIS. The [Mathematical Academy](https://neilmeher.github.io/synapse-research/academy.html) has eight linked modules with worked examples. Use [GitHub releases](https://github.com/NeilMeher/synapse-research/releases) to find the verified public revision and release notes.

Explore ECHO 2.0 at #robustness. Its matched-dependence experiment has a separate protocol and dataset. See the [ECHO 2.0 manuscript](papers/echo2.md) and updated [reproduction guide](REPRODUCIBILITY.md).
