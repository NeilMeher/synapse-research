# SCIENTIA — False discoveries under a fixed observation budget

## Abstract

Eight rules-based workflows analysed the same synthetic Gaussian programmes. A frozen confirmatory run used 5,000 programmes in each of four conditions. In independent all-null programmes, unadjusted testing produced false reports in 63.84% of programmes and Holm in 4.78%. In independent mixed programmes with n = 32, unadjusted testing yielded 19.26% FDR and 71.73% power, versus 3.94% FDR and 41.25% power for Benjamini–Hochberg. These quantities describe this generator.

## Design and analysis

Each programme comprised 20 hypotheses, two independent observation blocks and known unit variance. All methods received the same 640 or 1,280 scalar observation budget and the same underlying synthetic programme. Full-sample methods used both blocks. Holdout screened the lowest first-block p-value, and replication screened at Bonferroni on each block. Both required the same sign. Four means of 0.45 were randomly placed in each mixed programme. The fixed primary hypothesis was chosen without access to signal placement.

The two frozen contrasts use paired programme-level estimates and 95% family-adjusted intervals. The pilot used 400 programmes per condition and a separate seed.

| Primary contrast | Difference | Adjusted interval |
| --- | ---: | ---: |
| Unadjusted minus Holm FWER, independent all-null n = 32 | 59.06 pp | 57.50 to 60.62 pp |
| Unadjusted minus BH FDR, independent mixed n = 32 | 15.32 pp | 14.69 to 15.95 pp |

The exact independent all-null formula gives 64.15% risk for 20 unadjusted null tests at 0.05. The correlated sample yielded 54.38% unadjusted and 3.90% Holm FWER. In the independent mixed n = 64 condition, Holm reached 72.55% power and BH reached 83.18%, versus 94.89% unadjusted. In n = 32 mixed programmes split validation reached 8.80% power, and two-block Bonferroni replication reached 1.24%. The latter produced zero observed false reports in that cell. Its low power matters when interpreting that count.

## Numerical verification and limits

The independent reference reconstructed all archived summaries and reran all decisions using Python erfc. The latter changed one BH decision in 5,000 n = 32 mixed programmes, shifting the second primary contrast from 15.3223 to 15.3123 pp. See the audit for the recorded protocol deviation. Matching observation allocation does not equalize the number of claims each procedure can make. The reported coverage is conditional on selection. The study involves synthetic programmes with known variance and fixed procedures.

[Confirmatory data](../data/scientia-confirmatory.json) · [Manifest](../data/scientia-confirmatory.manifest.json) · [Frozen protocol](../research/scientia-confirmatory.md) · [Numerical audit](../research/scientia-audit.md)
