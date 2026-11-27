# ENERGIA · Power, cash flow and debt service in a hypothetical modular compute facility

## Research question and methodology

Under specified operating and commercial assumptions, which factors change project NPV and can the project meet scheduled debt service? This is a deterministic exercise for a hypothetical 128-device, eight-year facility using scenario USD. It connects established engineering and present-value equations through a transparent replacement and cash-reserve ledger. It contributes an inspectable reference model and a bounded scenario comparison. It does not establish novelty in engineering or investment underwriting.

NVIDIA's 350 W device limit constrains the assumed 320 W loaded and 65 W idle device values. Adding non-GPU server and shared IT loads gives 27.72 kW idle IT and 60.36 kW peak IT. Operating annual IT energy equals 8,760 hours times the idle baseline plus active GPU-hours times incremental kW per GPU. Multiply by PUE to obtain facility energy, and by site WUE to estimate site water on an IT-energy denominator. Demand charges use contract or modeled design kVA, whichever is larger. Prices, engagement, capex, PUE, water, replacement and financing assumptions are editable. [Manufacturer specifications](https://www.nvidia.com/en-us/data-center/l40s/) · [DOE facility guidance](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf)

Project cash flow is operating cash after replacement, capital outlays, working capital and terminal items. Scheduled equity cash additionally includes debt draws, service, restricted reserve funding, use and release. NPV is ΣCFₜ/(1+r)ᵗ, evaluated at a project rate of 10.5% and an equity rate of 15%. DSCR uses CFADS after replacement and excludes reserve draws. Cash availability and reserve use are then checked separately. The strictly positive or negative sign runs of the cash series determine whether a unique IRR can be claimed within the bracketing domain.

## Deterministic findings

Baseline annual energy at steady workload is 594.27 MWh, design demand 90.22 kVA, site water 230.18 m³ and the simplified bill $73,256. Baseline capex is $1.936m and project NPV is −$648,033. Scheduled equity NPV is −$732,038. Annual debt service first goes uncovered in year five, the replacement year. The $110,000 reserve leaves an uncovered payment of $60,064. Shifting replacement to year eight, after the six-year repayment term, removes the debt gap and raises minimum DSCR to 1.48×. It still leaves project NPV −$527,369 and a year-eight requirement for additional equity. The model does not resolve whether deferral is technically realistic.

The combined stress case lowers project NPV to −$2.392m and first misses a scheduled payment in calendar year two after a one-year delay. Holding other baseline assumptions fixed, project NPV breaks even at 80.22% spot billing utilization or $1.4221 per GPU-hour. Zero modeled energy price cannot reach project break even over the registered electricity-price domain. Five of 25 points in each spot billing grid had nonnegative scheduled equity NPV. All nine debt-rate × hardware-price points had negative scheduled equity NPV. Baseline replacement generates several cash-flow sign changes, so use the archived NPV profile.

Only the all-equity candidate meets every constraint in the registered six-option set. That result is feasibility under explicit limits, with the coverage rule applying when debt exists. It is still negative NPV. The intentionally infeasible control admits no option. No scenario is a statistically calibrated risk forecast.

The independent Python reference uses closed-form discounted annuity balances, independent energy arithmetic and a separate NPV calculation. It reproduced every annual ledger, all 59 grid cells, the reported break-even values and both finite comparisons. [Protocol](../research/energia-scenario.md) · [Audit](../research/energia-audit.md) · [Sources](../research/energia-sources.md) · [Archive](../results/energia-scenario.json)

Human engineering, regulatory and financing review is pending.
