# SYNAPSE Phase VII and VIII execution register

## Repository and protection

The authoritative checkout is `.tools/synapse-phase2` under the assigned Itihāsa workspace. It started clean on `codex/phase6-economic-infrastructure` at v0.11.0 commit `a1c02c48708d09e66200a818cfe78a440f374c9d`. The public metadata, remote tag and default branch agreed with that commit. Baseline tests returned 70 passes. Work continued on `codex/phase7-8-chronos-v1`. Prior research archives and tags were preserved. Additional expenditure was zero.

CHRONOS v0.12.0 was released from `2533f0616ac7ab5dea4bea5c01cabdec7cec64ab` after candidate verification and a public hash and four-viewport browser check. The existing Pages branch remains the production release line. The integrated exact revision and final deployment verification are recorded in the GitHub release. [CHRONOS candidate CI](https://github.com/NeilMeher/synapse-research/actions/runs/46052404374) · [CHRONOS Pages](https://github.com/NeilMeher/synapse-research/actions/runs/46052986531) · [Release history](https://github.com/NeilMeher/synapse-research/releases) · [Live release metadata](https://neilmeher.github.io/synapse-research/release.json)

## CHRONOS historical evidence

| Item | Executed work |
| --- | --- |
| Sources obtained | Railway Board statistical summary, detailed statements and annual report, two Economic Survey vintages, and RBI Table 145 HTML. Hashes and file locators are in the source manifest. The advertised RBI XLSX and PDF links returned HTML. |
| Coverage and definitions | 17 national fiscal observations from 1950–51 to 2024–25, annually from 2015–16. Four direct national measures include route km, electrified route km, million originating tonnes and billion net tonne-km. Seven RBI state series contain 147 March records with explicit missingness and 2014 boundary warnings. |
| Extraction checks | Visual transcription of the scanned Board table, two independently corroborated route totals and six freight cells, six confirmed recent RBI country totals and all 147 selected region values. National Board and Survey results differ outside printed precision. |
| Findings | 2024–25 Board stocks record 65,510 electrified route km out of 69,439, or 94.34%. Year-over-year freight origin tonnes rose 1.69% while net tonne-km fell 0.30%. Growth association r=0.3345 over nine years is descriptive. |
| Registered output | chronos-scenario-001 reproduced 102 values, 18 windows, four deterministic teaching scenarios and five exact synthetic controls. Result SHA-256 `ff16f9990b2fd525dd8eb3f489ae508fe5f55cd3cec365d0d812f6fb54f61435`. |
| Causal readiness | Documented trial and dedication events lack a compatible repeated freight outcome panel, comparative units and verified recurring commercial opening dates. Historical estimation was withheld. |
| Conditional and synthetic results | Scaling the observed electrified share change by one half, with total route stocks fixed, gives 64.95% for 2024–25. The separate synthetic DiD estimates are 4 under parallel trends, 7 with trend confounding and 2 with anticipation or spillover. ATT is set to 4. |

The Board's statement corroborates its statistical summary, while the Survey's latest electrified amount is about 3,200 route kilometres higher. The difference remains unexplained. Actual state comparisons use original boundaries and no spatial interpolation. [Manuscript](../papers/chronos.md) · [Source manifest](../sources/chronos-rail.json) · [Source reconciliation](chronos-source-audit.md) · [Causal readiness](chronos-causal-readiness.md)

## Integrated platform

The 12 laboratory routes and 18 executed studies are connected by a typed atlas and a 154-record, 193-relationship knowledge graph. The compact deterministic index includes research and data source descriptions, bounded manuscript text, protocols and limitations. The catalogue retains original archives and labels estimates, exact results and conditional calculations. The reader renders the tracked Markdown through inert DOM text, with an allowlist for URL protocols. The Academy retains all 12 previous modules and adds historical statistics, causal inference, econometric research designs, and scientific uncertainty, each with a worked example and a live calculation. The curriculum graph links actual prerequisite lessons.

All study limitations, the negative findings, reuse risks and review status are linked through the programme register. ARTHA attribution was made more explicit. Existing processed data remain confined to the attributed subset. The latest ADB workbook-specific confirmation and the railway publication-policy ambiguity are documented. The programme continues to distinguish scientific calculation, human peer review and external replication. [Programme register](programme-quality-register.md) · [Reuse register](data-reuse.md) · [Independent review](external-review.md) · [Portfolio demonstration](portfolio-demonstration.md) · [Bibliography](bibliography.json)

## Engineering and evaluation

The integrated scientific checks cover 80 JavaScript tests, six Python source fixtures, independent computational references, schemas and prior archive replays. The revised UI uses the four established viewport widths, plus optional axe checks for six representative routes at mobile and desktop sizes in light and dark themes. The initial UI pass exposed tablet overflow and unnamed keyboard-inaccessible horizontal table regions. Compact navigation and explicitly named, focusable regions address them. Automated browser coverage does not replace assistive-technology testing with people.

The search index is loaded on demand. The build measures approximately 159 KiB raw, 46 KiB gzip, with no runtime package dependencies. The homepage loads its selected ECHO material and the registry without fetching all archived studies. GitHub Actions now has individually verified release commit pins for Node 24-compatible actions, with unchanged verify-before-deploy gates. Npm's production audit reported zero vulnerabilities. The site uses no account, upload, telemetry or arbitrary code execution path.

[Reproduction](../REPRODUCIBILITY.md) · [Security guidance](../SECURITY.md) · [Future empirical programme](future-empirical-programme.md)
