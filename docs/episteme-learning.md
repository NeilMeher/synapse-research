# EPISTEME learning guide

## Conditional probability and absolute fit

Suppose the candidate model predicts four means [0, 1, 2, 3], known noise is 0.20, and the measurements are [0.2, 0.8, 2.0, 3.4]. Scale and square the residuals. Their values are 1, 1, 0 and 4, so the sum is 6. For four degrees of freedom, the upper tail is exp(−6/2)(1+6/2) ≈ 0.199. The test passes at 0.05. That means the four residuals passed this check under the stated variance model.

The discovery probability asks a different question. A posterior of 0.80 for a quadratic among four families is conditional on the mixture being used. If all four miss the real curve, the least wrong candidate can still dominate.

## Practice

In the replay, compare the first discovery input between both measurement policies. Advance to the validation block and note that the predictor stays fixed as new observations are revealed. Switch to the outside-library case and watch what happens when no model reaches 70%. Some tasks stay unresolved even before their holdout residuals are considered.

**Challenge.** A fixed predictor passes the first block. What changes if the second block is used to revise it and is also reused to decide that it passes?

**Solution.** The fitted prediction now depends on the second block. Conditional on the revised predictor, the residuals need not follow the claimed independent sharp-null distribution. Reserve new measurements for the next check or explicitly model the adjustment and its uncertainty.

[Interactive replay](../episteme.html#replay) · [Frozen protocol](../research/episteme-confirmatory.md) · [Box and Hill on model discrimination](https://www.tandfonline.com/doi/abs/10.1080/00401706.1967.10490441)
