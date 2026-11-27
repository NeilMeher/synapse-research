# SCIENTIA learning guide

## One test and a family

Start with the idea of probability under repeated sampling. A level-0.05 test falsely rejects approximately five times in one hundred independent repetitions if its null is true. With two independent true nulls, neither rejects with probability 0.95 × 0.95 = 0.9025. At least one rejects with probability 0.0975. For twenty tests the same argument gives 1−0.95²⁰ ≈ 0.6415. If all decisions moved as one, probability multiplication would fail. Try the exact curve, then compare the independent and correlated archived cases. [Interactive chart](../scientia.html#family-risk)

## Report filtering and statistical power

With four hypotheses and sorted p-values 0.005, 0.012, 0.028 and 0.14, Holm checks 0.0125, 0.0167, 0.025 and 0.05 in order, stopping at 0.028. BH compares each to 0.0125, 0.025, 0.0375 and 0.05, then keeps the first three. If the third is null and the first two have effects, BH's observed FDP is 1/3 while Holm's is zero. The FDR is the average FDP across programmes and quantifies a different risk than the chance of any false report. [Research workflows](../scientia.html#methods)

Change the sample size from 32 to 64. Under the normal model, the mean z for a 0.45 signal changes from 0.45√32 ≈ 2.55 to 0.45√64 = 3.60. Compare power to understand why a fixed adjustment threshold can produce different results with more information.

## Why independent measurements matter

Explore the archived split-validation and full-sample decisions. In a split, a lucky first-block fluctuation does not bias the second-block estimate through the generation process. Requiring the same sign and a second threshold still selects estimates from the second block. Conditional coverage can therefore differ from nominal coverage. A finite budget also reduces the signal in each individual half.

**Exercise.** A workflow tests 20 independent nulls and screens the smallest p if it is below 0.05. It then requires the same sign and p ≤ 0.05 on fresh data. What is its all-null false-report probability?

**Solution.** The chance of screening is 1−0.95²⁰. Conditional on screening, the second two-sided test falls on the required side with probability 0.025 by symmetry and independence. Multiplying gives approximately 0.01604.

[Archived study](../scientia.html#archive) · [Holm's original article](https://www.ime.usp.br/~abe/lista/pdf4R8xPVzCnX.pdf) · [Benjamini and Hochberg's original article](https://onlinelibrary.wiley.com/doi/full/10.1111/j.2517-6161.1995.tb02031.x)
