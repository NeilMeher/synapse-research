# AXIOM · Payoff-preserving presentation

## Status

Initial experimental design. Trial execution, the browser laboratory and the empirical framing question remain future work.

## Research question

When can an apparent change of decision be attributed to presentation rather than changed incentives? Begin with a synthetic control where equivalent presentations preserve both players' payoffs and transform the opponent's known mixed strategy. This gives a reference for future framing studies where an interpretation or belief may change.

## Proposed finite pilot

A task consists of a two-player 2×2 payoff matrix and a fixed opponent action distribution q. Compare four canonical matrices at q values 0, 1/4, 1/2, 3/4 and 1 for the first opponent action. The 20 task pairs give 80 presentations when the canonical, row-swap, column-swap and both-swap views are enumerated. Swapping rows remaps focal action identity. Swapping columns remaps both the opponent action identity and its probability weights. Each payoff remains attached to the corresponding canonical cell. Use inert labels in the first pilot.

| Game | Payoff pairs in the first row | Payoff pairs in the second row |
| --- | --- | --- |
| Prisoner's dilemma | (3,3), (0,5) | (5,0), (1,1) |
| Assurance | (4,4), (0,3) | (3,0), (3,3) |
| Matching pennies | (1,−1), (−1,1) | (−1,1), (1,−1) |
| Payoff tie | (2,2), (2,2) | (2,2), (2,2) |

For action i, compute Uᵢ = ∑ⱼ qⱼuᵢⱼ. The utility policy chooses maximizers uniformly across ties. The stochastic control allocates weights proportional to exp(βUᵢ) for fixed β=1 per utility unit. A position-only control chooses the first displayed row. The primary diagnostic is the total variation distance between the canonical distribution and the response distribution after reversing the permutation. Use exact integer numerators of expected utilities over denominator four for tie checks. Include mismatched belief remapping as an intentional scoring defect to check that the harness rejects altered incentives.

For a hand check in the prisoner's dilemma with the first opponent action given probability 3/4, the focal utilities are 9/4 and 16/4. The canonical best response is the second row. The same action moves to the first row under a row swap. A choice made only by displayed row changes canonical action on that swap. In a payoff tie the uniform policy gives each canonical action probability 1/2 in every view.

This finite test is an implementation control. It yields no sample estimate of human framing or moral consistency. Opponent beliefs are stipulated, so the logit policy is a response to a fixed belief. The equilibrium in McKelvey and Palfrey instead solves joint response conditions. A future framing experiment would need to specify which meanings or beliefs could change despite equal displayed payoffs.

## Next development task

Implement the permutation and inverse-permutation interfaces with independent rational fixtures, then freeze the finite pilot inputs and runner. Execute the registered cases only after the reference controls pass. Preserve the initial directional control and the payoff tie even if the first implementation exposes a mismatch.

[McKelvey and Palfrey, Quantal Response Equilibria for Normal Form Games](https://doi.org/10.1006/game.1995.1023) · [Tversky and Kahneman, The Framing of Decisions and the Psychology of Choice](https://doi.org/10.1126/science.7455683)
