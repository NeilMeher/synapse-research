# AXIOM learning guide

## From games to expected utility

A player chooses an action. A pure strategy plays one action in this one-step game, and a mixed strategy is a probability distribution over actions. Each payoff cell lists the focal player's and opponent's utilities. For the focal player with opponent probability q on the first column, the two row utilities are weighted averages. In the prisoner's dilemma at q = 3/4 they are 3×3/4 + 0×1/4 = 9/4 and 5×3/4 + 1×1/4 = 16/4. Defection is a strict best response to each opponent pure action, making it dominant. A Nash equilibrium is a strategy profile where each player's strategy is a best response to the other's strategy. AXIOM calculates one response given stipulated opponent weights.

## Derive the permutation identity

Let π map each displayed row to its canonical identity and σ do the same for columns. The displayed payoff is u′ᵢⱼ = uπ(i),σ(j) and the displayed belief is q′ⱼ = qσ(j). Then ∑ⱼ q′ⱼu′ᵢⱼ = ∑ₖ qₖuπ(i),k because σ is a bijection. Displayed utility is canonical utility at row π(i). Mapping the response back with π⁻¹ yields the same probabilities for utility and logit policies. A position-only response has no such invariance.

The logit response divides exp(βUᵢ) by the sum of these masses. Since a common multiplicative factor cancels, subtract the largest utility before exponentiating. This limits overflows and gives the same probabilities.

## Practice

In the laboratory choose Assurance and set the first opponent action to 75%. Both rows have utility 3. Swap both axes, then inspect canonical action mass and total variation. Turn on the deliberate belief fault and explain the change.

**Solution.** Correct remapping moves the 75% weight with its column, so utility remains 3 in both rows and total variation is zero. With unchanged displayed weights the effective canonical first-column probability is 25%. The canonical payoffs become 1 and 3. The utility response moves from equal mixing to the second row, a total variation of 0.5.

[Laboratory](../axiom.html#axiom-workbench) · [Benchmark](../research/axiom-pilot.md) · [Quantal response original paper](https://doi.org/10.1006/game.1995.1023)
