# SYNAPSE Phase VI research and verification register

## Baseline and preservation

The assigned `.tools/synapse-phase2` checkout started clean on `codex/phase5-social-systems` at `214bb251ddb98b181f682ea433e2c66c0a24964f`. The initial Pages revision was v0.8.0 at `f0c9d3af0380afa957d7e87d295e3c7e5c7a160b`. Baseline unit verification returned 53 passes. Development used `codex/phase6-economic-infrastructure`. The earlier result archive paths and bytes were preserved. No other project, historical branch, earlier release tag or GitHub Pages configuration was changed. Additional expenditure was zero.

The existing default branch `codex/foundation` is also the branch allowed by the custom Pages environment. Promotion retains this branch and uses fast-forwards from independently checked candidate commits. GitHub's published releases and the live site's [release metadata](https://neilmeher.github.io/synapse-research/release.json) identify exact deployed revisions. The release notes record the Pages workflow and public verification for each promoted version.

## Executed studies

| Study and evidence class | Confirmation |
| --- | --- |
| POLIS 2.0, matched seeded simulation | 32 pilot and 160 confirmatory worlds, each with 24 treatment arms. At surplus value 2, the joint-minus-payer advantage is 9.60 percentage points under prepayment and exactly zero under payment on delivery. The interaction (delivery minus prepay) is −9.60 pp with a paired 95% interval from −9.89 to −9.31 pp. Identical utility signs mechanically account for equality under matched contingent payment. Five agent-world intake losses still occurred under prepayment at surplus value 2. |
| ARTHA, official data with stipulated shocks | Twelve comparisons. A $100m hypothetical domestic purchase in the detailed 2024 panel yields gross output of $185.09m for construction, $207.60m for electrical and optical equipment, and $164.64m for post and telecommunications. The corresponding value-added amounts are $69.16m, $55.15m and $79.30m. Extraction reconciled within $0.00271 in 2024 and $0.00101 in 2023. |
| ENERGIA, deterministic hypothetical finance | Baseline 128-GPU energy is 594.27 MWh/year, water 230.18 m³/year and project NPV −$648,033. A year-five replacement leaves $60,064 of debt service uncovered after the reserve. At baseline values, project NPV breaks even at 80.22% spot billing or $1.4221/GPU-hour. Only the all-equity candidate meets every constraint among six designs and its NPV is still negative. All nine debt rate × device cost grid cells have negative equity NPV. |
| NEXUS, official data with hypothetical project and mapping | Across four matched cases, raising domestic procurement moves model domestic output from $1.209m to $1.565m and value added from $431,572 to $531,173. Direct GPU imports stay $896,000 and never enter domestic demand. The separate efficiency change lowers energy to 544.05 MWh/year and water to 104.63 m³/year, improving project NPV by $25,777 without changing the capital shock. |

[POLIS 2.0 manuscript](../papers/polis2.md) · [ARTHA manuscript](../papers/artha.md) · [ENERGIA manuscript](../papers/energia.md) · [NEXUS manuscript](../papers/nexus.md)

## Sources and interpretation

The ADB India workbook's portal vintage is August 2025. The original workbook has a November 2025 modification marker, is pinned by SHA-256, and was retrieved on 27 November 2026. The older ADB data series is identified by the publisher as CC BY 3.0 IGO and directs users to KIDB for updates. A separate workbook-specific license notice was unavailable. Only attributed derived national data are included. The official MoSPI SUT release of 15 May 2026 and the current OECD tables were evaluated. OECD metadata was obtained, while its two bulk downloads returned HTTP 403. The MoSPI rectangular classification and valuation would need an explicit domestic bridge. [ARTHA sources](artha-sources.md) · [ADB source provenance](../sources/artha-adb-india.json)

ARTHA validates domestic and imported blocks and aggregates flows before forming coefficients. It solves the fixed-coefficient domestic model with pivoted elimination. The independent reference sums production rounds. Value added, gross output, and embodied intermediate import needs remain distinct. National price, production, labor and regional changes are not observed by these scenarios.

ENERGIA uses NVIDIA's published device power maximum and DOE system boundaries. Real tariff category, site, legal water supply, investment structure, customer terms and quotations remain unknown. Financing uses scenario USD, restricted reserves, pre-tax cash flows, explicit scheduled debt service and rates, and separately derived engineering and billing availability. No joint empirical risk distribution was calibrated. The bounded design comparison classifies constraints and candidates without asserting general or site feasibility. [ENERGIA sources](energia-sources.md)

NEXUS uses disjoint hypothetical 2024 producer-value construction categories and ADB sectors. Direct imported kit stays outside the national multiplier. Working capital, debt, operation, and replacement remain outside construction final demand. [Procurement map](../data/processed/nexus-capital-map.json) · [Research audit](nexus-audit.md)

## Verification and interfaces

The integrated candidate passed 70 JavaScript tests and three Python extraction-fixture tests. Independent checks covered both POLIS 2.0 phases, four ARTHA table balances and twelve scenarios, six reference cash-flow ledgers plus 59 ENERGIA grid cells and both design enumerations, and all four NEXUS bridges and response vectors. The ADB extract reproduced the repository's processed data byte-for-byte. Initial ARTHA demand exact equality and ENERGIA near-root fixed absolute checks exposed numerical tolerancing issues in reference entry points. Corrected independent validation is documented in the audits and the original frozen execution inputs and output hashes are retained. The integrated build and local Chrome suite pass at 360, 390, 768 and 1440 pixels, including five failure-state routes. Release CI replays earlier and new studies, validates data and manifests, and repeats tests in Chromium.

The site adds four research workbenches and evidence records, a linked infrastructure-to-economy atlas journey, and four Academy modules, taking the Academy from eight to twelve. The repository landing page links live research, current release, methods, limitations and contribution disclosures. [Reproduction](../REPRODUCIBILITY.md) · [Release history](https://github.com/NeilMeher/synapse-research/releases)

## Human review and next milestone

Verify the ADB worksheet edition and processed data reuse terms. Review the energy boundary, supplier quotes and tariffs, water and grid constraints, taxes, lender requirements, and the procurement sector assignments before using the models for a real decision. Regional ARTHA, site-specific ENERGIA, calibrated probabilistic sensitivities and empirical NEXUS remain research extensions. A historical causal claim requires verified commissioning dates, compatible comparative outcomes and an identification design. CHRONOS's next task is to pin and reconcile the railway source series before testing whether a causal study is feasible. [CHRONOS source checkpoint](chronos-source-checkpoint.md)
