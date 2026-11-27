# ARTHA · Domestic production requirements in the ADB India accounts

## Question and design

For equal domestic final-demand purchases in construction, electrical and optical equipment, and post and telecommunications, how much gross output, value added, and imported intermediate use follows under fixed production coefficients? How much do results change across ADB's 2023 and 2024 panels and when the 34 active industries are grouped into ten?

The contribution is an inspectable, reproducible comparison of one official symmetric national source with separate domestic and imported blocks. It applies established input–output methods and checks classification and aggregation sensitivity. The UN handbook describes the national accounts transformations that precede the ADB industry-by-industry data. The metadata and accounting checks specify how this analysis reads the already symmetric tables. [UN handbook](https://unstats.un.org/unsd/nationalaccount/capdev/resources/details?resourceid=36&resourcetype=handbook) · [ADB data](https://kidb.adb.org/globalization/current)

For each supplier i and purchaser j, divide domestic transaction Zᵢⱼ by output xⱼ to obtain Aᵢⱼ. A domestic final-demand change d gives x*=(I−A)⁻¹d. Production rounds are d, Ad, and higher powers of A applied to d. Value added and imported inputs are separate satellite accounts calculated with their own per-dollar coefficients. The group model sums transaction flows, final demand and purchaser totals before recalculating A.

## Executed scenarios

All figures are current U.S. dollar millions of the selected vintage. Each scenario adds $100m of demand directly to its named domestic industry.

| 2024 source resolution | Gross output | Value added | Imported intermediate inputs |
| --- | ---: | ---: | ---: |
| Construction | 185.09 | 69.16 | 23.28 |
| Electrical and optical equipment | 207.60 | 55.15 | 34.41 |
| Post and telecommunications | 164.64 | 79.30 | 15.32 |

Across the four tables, equipment had the greatest gross output and imported intermediate response. Communications had the greatest value added. For equipment, gross output was $212.22m in the 2023 detailed model and $213.55m in the 2024 grouped model. Communications' 2024 gross output moved from $164.64m to $164.29m under grouping, so aggregation did not raise every modeled effect.

The frozen workbook extraction reconciled within 2.71×10⁻⁹ million USD in 2024 and 1.01×10⁻⁹ in 2023. The 2024 detailed matrix has a certified spectral upper bound of 0.74156 and estimated infinity-norm condition of 9.71. The independent series implementation recovered every vector in all twelve scenarios. The smallest reference comparison uses absolute tolerance 2×10⁻⁹, including the sub-ULP difference in the encoded construction demand.

## Interpretation

The figures are conditional comparative statics. The model assumes fixed prices, input shares and unconstrained production. Gross output counts intermediate production along the supply chain and value added is a separate basic-price measure. Current-dollar vintage comparisons mix price and structural differences. There are no sampling confidence intervals. Final-goods imports are outside the domestic shock. No state-level, labor, investment-return or causal estimates follow from the scenario.

[Protocol](../research/artha-scenario.md) · [Source inventory](../research/artha-sources.md) · [Dataset and licensing](../sources/artha-adb-india.json) · [Audit](../research/artha-audit.md) · [Archive](../results/artha-scenario.json) · [Manifest](../results/artha-scenario.manifest.json)

The source and model received computational checks. Independent human review is pending.
