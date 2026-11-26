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

The confirmatory ECHO run contains 8,000 independent synthetic tasks across five correlation settings. See [the manuscript](papers/echo.md), [reproduction steps](REPRODUCIBILITY.md), [portfolio audit](PORTFOLIO_AUDIT.md), [project state](PROJECT_STATE.md) and [research roadmap](ROADMAP.md). The other eleven laboratories are proposals.
