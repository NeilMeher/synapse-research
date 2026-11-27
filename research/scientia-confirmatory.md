# SCIENTIA confirmatory protocol

## Design

The pilot used 400 synthetic programmes per cell, ran in 236 ms and measured paired standard deviations 0.495 and 0.195 in the two primary contrast cells. At 5,000 programmes per cell the respective projected family-adjusted half-widths are 1.57 and 0.62 percentage points. Use fresh seed 959202614 and freeze prior to execution. The primary unit is a complete synthetic programme, with shared observations across policies. No human, empirical, or language-model study participant is involved.

Use 20 hypotheses and per-hypothesis n=32 or 64. Each programme gets two equally sized independent observation blocks, totaling 640 or 1,280 scalar observations. Known unit measurement variance allows direct normal draws of block-level z sufficient statistics. Four signals at population mean 0.45 are assigned by uniform permutation in mixed cells. Index zero is the fixed primary and is independent of the signal assignment. The all-null controls have no planted effects. The correlated all-null sensitivity uses rho=0.30 equicorrelation within each block via one Gaussian factor and fresh independent factors across blocks. BH's reference interpretation is restricted to independent cells.

## Procedures and analysis

Compare the eight policies in the frozen pilot design. Full-size z=(z_first+z_second)/sqrt(2) uses both blocks. Split-sample validation screens only the lowest first-block p and requires a same-sign significant second-block test. Replication screens at alpha/20 and requires the same threshold and sign on disjoint data. Holdout and replication estimate the accepted effects from second-block data. FDP is zero for an empty family. Report FDR as mean FDP, FWER as any false report, and type I and II error, power, report count, replication among screened programmes, and mean reported effect bias and coverage. The latter two are conditional programme-level means over those with claims. Conditional coverage uses a nominal per-effect 95% Gaussian interval and has no selection adjustment.

Primary contrasts are positive-direction differences for unadjusted minus Holm FWER in the independent all-null n=32 cell and unadjusted minus BH FDR in the independent mixed n=32 cell. Use paired two-sided normal intervals with critical value 2.241402727604947, Bonferroni family 95%. All other comparisons are descriptive. The empirical curves are synthetic. The independent all-null family reference is exactly 1−(1−alpha)^20.

Stop at 5,000 per cell without interim looks. Fail if the deterministic check, independent Python aggregate reconstruction with erfc, analytic null check, input comparison, or 30-second work budget fails.
