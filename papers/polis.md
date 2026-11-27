# POLIS · From individual decisions to collective outcomes

## Question and contribution

How does a different accept-or-reject objective affect a conserved artificial economy when initial resources, meetings and environmental shocks are matched? POLIS connects AXIOM's best-response probability rule to GAME OF CIVILIZATIONS. The design compares consequences of specified decision mechanisms. It examines local interactions, which also motivate primary work on repeated cooperation and artificial societies. [Axelrod and Hamilton](https://doi.org/10.1126/science.7466396) · [Epstein and Axtell](https://doi.org/10.7551/mitpress/3374.001.0001)

## Experimental design

The pilot ran 45 matched worlds per scarcity regime. A frozen separate seed generated 400 worlds per regime for confirmation. In the primary arms the same kinds of pooled records are available and each meeting has the same potential outcomes before the policy acts. Material choice compares the payer's expected gain to zero. Joint choice compares both parties' expected gains to zero. A failure-sensitive comparator declines if it observes any recorded failure from that supplier. A fixed-prior comparator receives no records and uses delivery probability 3/4. Realized reputations can diverge after earlier actions. The primary unit is the full 24-day trajectory.

## Confirmatory results

| Stress regime metric | Payer gain with pooled history | Joint gain with pooled history | Failure-sensitive pooled | Fixed-prior payer gain |
| --- | ---: | ---: | ---: | ---: |
| Need satisfied | 67.42% | 76.91% | 64.41% | 76.91% |
| Completed trades per world | 44.45 | 56.88 | 36.55 | 56.88 |
| Gini of total agent consumption | 0.0641 | 0.0308 | 0.0607 | 0.0308 |
| Agents better off per world | 0 | 6.82 | 0.02 | 6.82 |
| Agents worse off per world | 0 | 0.035 | 4.23 | 0.035 |

The registered stress contrast was **+9.49 percentage points** (95% paired interval **+9.29 to +9.70 pp**). The analogous moderate comparison was +9.55 points and descriptive. Fourteen agent-world observations under joint gain consumed less than their matched pooled-material counterparts in stress, despite higher average fulfillment. The failure-sensitive comparator lowered average fulfillment by about 3.01 points, a descriptive difference.

The joint and fixed-prior arms produced identical physical outcomes across all archived worlds even though they use different belief and decision expressions. Their equivalence follows because both accept every fundable offer. Joint expected gain is q(1+p), and fixed-prior payer gain is q/4. Both are positive. This bounds what can be attributed to the choice objective in this design.

## Verification and limits

The independent Python reference regenerated all 890 worlds and matched first replays, exact integer balances and aggregate estimates. It checked the equivalence of the two acceptance controls and recomputed fractions and distribution metrics. A pilot verification adapter corrected a false failure caused by comparing an exactly integral Python mean strictly to a rounded JavaScript online mean. It changes only summary mean types. The confirmation used 5.195 seconds and observed process RSS of 94,937,088 bytes in the archived environment. No human or language-model decisions were sampled. Rules and social objectives are prescribed, and independent human review is pending.

[Results](../data/polis-confirmatory.json) · [Manifest](../data/polis-confirmatory.manifest.json) · [Protocol](../research/polis-confirmatory.md) · [Audit](../research/polis-audit.md)
