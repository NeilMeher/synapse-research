# ECHO 2.0 learning guide

## Hand calculation

Let three agents each be correct half the time. With independent correctness bits the count distribution on K=0,1,2,3 is (1,3,3,1)/8 and majority accuracy is .50. Now first draw a fair choice among the four vectors 000, 011, 101 and 110. Each agent is correct half the time and each pair is jointly correct .25. K is either zero (.25 probability) or two (.75). The majority is correct .75 of the time. Complementing the four vectors produces majority .25 at the same moments. All three laws are finite exchangeable, because permuting agents preserves their distribution.

## Derive the models

Use the law of total covariance to see where beta-binomial correlation comes from. Conditional correctness bits are independent, but every bit shares the same conditional mean P. Express Var(P) using its two beta parameters and recover rho. Divide the posterior beta mean's numerator and denominator by the total shape to obtain the predictive probability used in `sampleReports`.

Trace `countDistribution` and compute the row for two reports by hand. Test rho=0 and rho=1. In `exchangeableBounds`, verify the candidate weight equation by taking the expectation of (K−j)(K−k). Deduce why only three positive masses are needed. Check that the extreme distributions in the manuscript reach the same E[K] and E[K(K−1)].

## Try it in the lab

- At the archived parameters, inspect the bins around the majority threshold. Explain where the beta-binomial's larger mass of majority failures came from despite fewer unanimous failures.
- Move the pairwise correlation to zero. The two law curves agree. Explain why the sharp moment bound can still have nonzero width.
- Move the hub weight and replay round. Derive when the effective hub influence first exceeds .5 and check it with the influence inspector. Find a case where opinion consensus and truth diverge.
- Compare Brier and accuracy for the same true family under both likelihoods. Explain why likelihood errors can change probability estimates without changing the selected answer.
- Change verification cost and reliability. Explain why one additional source can improve accuracy while reducing net utility.

Use [the mathematical note](../research/echo2-mathematics.md) to verify the derivations. Run the separate reference and compare its values with the result artifact. Record human checks only after completing them.
