# CHRONOS · Measuring Indian railway electrification and freight

## Abstract

This study reconstructs 17 national reporting periods from 1950–51 through 2024–25, using the Railway Board’s Statistical Summary, and documents March route stocks for seven states in the RBI Handbook. The national series shows increased electrification and freight over the published endpoints. In 2024–25, originating freight increased while net tonne-km fell. Comparisons between official publications expose route measurement discrepancies. Available freight geography and treatment information support description and an exploratory association. A historical causal effect is withheld.

## Question and contribution

How did reported route stocks, electrification and freight change? Which historical claims are consistent across publications? The contribution is an auditable reconstruction with explicit year alignment, native units and version comparisons. It applies established descriptive methods and offers a separate, reproducible causal-learning benchmark. The study adds no new field data. [Railway Board reports](https://rb.indianrailways.gov.in/public/cms/viewFolderContents?documentMasterId=1284&personaId=) · [RBI Table 145](https://www.rbi.org.in/Scripts/PublicationsView.aspx?id=23594)

## Methods

Use fiscal years starting April 1 and ending March 31. March length is a stock, freight is a flow accumulated through the fiscal year. Prefer a consistent Board source for the whole published series. Use the detailed Railway Board Statement 8 for precise latest stocks and the freights in the annual report for recent cross-checks. Preserve the source scope for all gauges and mark sampled historical gaps. March state values retain the RBI geography. The note on inclusion of Telangana and the two printed 2014 figures create an ambiguous boundary year.

Compute percentage change as 100(xₜ/xₜ₋₁−1) for adjacent complete years. Compute endpoint annualized growth as 100[(x₁/x₀)^(1/n)−1], where n is the number of elapsed years. The base index uses 2015–16 as 100. Electrified share divides aligned route stocks. Freight work per originating tonne is 1,000 times billion net tonne-km divided by million originating tonnes. It is a ratio of reported quantities and can differ from a publisher's average-lead measure based on carried tonnes. The optional Pearson coefficient relates paired changes rather than levels and fits no causal or extrapolating model.

## Results

| Measure | 1950–51 | 2015–16 | 2023–24 | 2024–25 |
| --- | ---: | ---: | ---: | ---: |
| Total route km | 53,596 | 66,252 | 69,181 | 69,439 |
| Electrified route km | 388 | 23,555 | 62,253 | 65,510 |
| Electrified share | 0.72% | 35.55% | 89.99% | 94.34% |
| Revenue-earning originating freight, million tonnes | 73.20 | 1,101.51 | 1,588.06 | 1,614.91 |
| Revenue-earning transport work, billion net tonne-km | 37.565 | 654.481 | 973.968 | 971.085 |

Aggregate route length rose 29.56% across the 74 elapsed years, and revenue-earning tonne volume rose from 73.2m to 1,614.91m, an endpoint CAGR of 4.27%. From 2023–24 to 2024–25, originating tonnes rose **1.69%** and tonne-km fell **0.30%**, with the ratio declining from **613.31 km to 601.32 km**. These are distinct dimensions of freight. Nine paired year-over-year changes in electrified route and tonne-km gave **r = 0.3345**. The short, serial sequence cannot provide a reliable estimate of the effect of electrification.

The 2024–25 Survey comparator is about 3,200 km higher than the Board's latest electrified figure. Statement 8 corroborates the Board summary. Preserve the measure descriptions and unresolved publication difference rather than treating a spread as a rounding error. The Board's detailed annual report also confirms the last three years of tonne and tonne-km observations. [Source reconciliation](../research/chronos-source-audit.md)

## Causal scope and educational examples

The documented Eastern and Western freight corridor events do not supply a compatible panel of recurring segment or origin–destination outcomes, verified first commercial service dates and comparison units. Current evidence gives no causal railway effect. The separately labelled teaching sensitivity assumes half the observed share change since 2015–16 and gives **64.95%** in 2024–25 under that assumption. It assumes the same total route stock and supplies no freight prediction.

A separate synthetic model with true ATT of four gives DiD of four under parallel trends, seven under an untreated trend gap of three, and two when anticipation or spillovers equal two. The synthetic model intentionally makes these ground truths known.

An independent Decimal reference reproduced 102 series values and the associated windows, plus exact educational checks. Independent human review is pending. [Protocol](../research/chronos-scenario.md) · [Readiness register](../research/chronos-causal-readiness.md) · [Results](../results/chronos-scenario.json) · [Run manifest](../results/chronos-scenario.manifest.json)
