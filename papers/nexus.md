# NEXUS · From compute infrastructure spending to domestic production requirements

## Research question and contribution

How do differences in stipulated cooling intensity and local procurement affect a hypothetical 128-GPU facility and the national production required to build it? The study combines a reproducible engineering and cash-flow ledger with a sourced ADB India input–output system through an explicit, auditable expenditure classification. It applies established input–output accounting and deterministic factorial comparison. The distinction from a generic multiplier exercise is that the mapped shock reconciles to the same capital ledger that is used to schedule the facility’s cash flows.

The domestic demand vector is dᵢ=ΣₖMᵢₖCₖsₖ/1,000,000 for each disjoint capital item k. Cₖ is its stipulated producer-value spending, M is the sector assignment, and sₖ is the assumed domestic share. The residual Cₖ(1−sₖ) is direct foreign procurement. The ARTHA multiplier applies (I−A)⁻¹ to d. It reports value added and imported intermediate inputs through separate coefficients. No imported accelerator outlay enters d. No operating purchase is treated as a standalone final-demand shock. [ADB national data](https://kidb.adb.org/globalization/current) · [UN input–output handbook](https://unstats.un.org/unsd/nationalaccount/capdev/resources/details?resourceid=36&resourcetype=handbook)

## Executed findings

All four cases hold compute capacity, nominal capex and billed GPU-hours fixed. The capital outlay is $1.936m, of which $896,000 is a direct foreign accelerator package in every case. Raising the assumed conventional equipment sourcing increases direct domestic procurement from $649,000 to $825,750. It raises modeled domestic gross output from $1.209m to $1.565m and value added from $431,572 to $531,173. Direct foreign procurement falls from $1.287m to $1.110m. Imported intermediate inputs required by domestic production rise from $166,541 to $226,153. Offsetting import movements occur in separate accounting categories.

Holding procurement fixed, the joint stipulated cooling changes reduce modeled annual energy from 594.27 to 544.05 MWh and site water from 230.18 to 104.63 m³. Project NPV improves by $25,777 to −$622,256. The year-five uncovered debt payment persists. The efficiency change leaves the domestic production vector identical for each procurement profile. In the other direction, higher domestic procurement leaves model energy and finance identical because prices and equipment performance are held fixed.

The independent reference verified all four engineering-finance-procurement cases, each complete economic response vector, and every first-round supplier link. The archive includes each figure as a numerical value with frozen input hashes.

## Interpretation

The procurement shares are sensitivities, not observed supplier data. Sector associations are broad and omit purchaser-to-producer price bridges for any actual quote. The model assumes matched prices between domestic and imported categories, and imposes no additional capex for the lower-intensity operating design. No feasibility of that combination, emissions footprint, policy effect, national employment estimate or construction plan follows. Gains or losses are comparative static changes conditional on modeled assumptions.

[Protocol](../research/nexus-scenario.md) · [Audit](../research/nexus-audit.md) · [Procurement concordance](../data/processed/nexus-capital-map.json) · [Archive](../results/nexus-scenario.json) · [Manifest](../results/nexus-scenario.manifest.json)

Independent human review of sector assignments, finance and empirical plausibility is pending.
