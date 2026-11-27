# AXIOM v1 adversarial audit

| Severity | Challenge | Evidence and disposition |
| --- | --- | --- |
| High | Column reordering can silently change incentives | Independent rational evaluation verifies preserved weights in all valid presentations. Leaving weights in position generated 32 detected representation failures and changed 16 best responses. |
| High | Moving only the focal player's payoff would alter the game | Every archived cell's two-player tuple is checked against independently computed canonical coordinates. A unit test mutates the opponent payoff alone and expects an equivalence failure. |
| Medium | Floating-point roundoff can break exact ties | Integer quarter numerators and independent Fraction expectations agree. Matching pennies at one-half and assurance at three-quarters both tie exactly. |
| Medium | Invariance is a mathematical result | The manuscript labels the finite benchmark and makes no behavioural or sampling claim. |
| Medium | Logit response can be misread as an equilibrium | Opponent weights and sensitivity are fixed. The policy never solves the opponent's response. |
| Open | Synthetic utility limits interpretation | Future belief and utility interventions require a separate protocol. Human review pending. |

The Node archive verifier checks the frozen input hashes, output hash, byte count and replay. The Python verifier reconstructs all 80 presentations and 40 intentional faults. The controls are part of the preregistered benchmark and are expected to expose non-equivalence.
