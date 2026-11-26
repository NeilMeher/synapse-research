# ECHO pilot protocol v1

Exploratory performance and variability assessment. Fix n=15, q=.68, correlations 0, .25, .5, .75 and 1, rounds 12, HK radius .2, and three fresh signal slots. Use 400 independent trials seeded from 20261126. Generate trial-level random draws in the same order across correlations and policies. Inspect all conditions and compare majority to an analytical reference. Record runtime and uncertainty in three provisional paired differences. Inspect no confirmatory output before the confirmatory protocol is committed.

The unit is one task with a Bernoulli(1/2) truth. The shared arm applies one correctness draw to all original signals with probability rho. Otherwise it draws independent correctness bits. Replace three signal slots under verification using independent correctness draws of the same marginal q. Pilot data determine feasibility and estimates of Monte Carlo dispersion. The confirmatory seed is separate.
