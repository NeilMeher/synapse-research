# POLIS v1 adversarial audit

| Severity | Challenge | Evidence and status |
| --- | --- | --- |
| High | A policy effect can be confounded by resource or timing differences | All arms share world, shocks, pairing, roles and latent draws. Independent reconstruction confirms the same world before each treatment is run. |
| High | Retrospective knowledge could leak into decisions | The policy sees current expected gains and eligible completed history. Latent delivery draws are evaluated by the simulator only after acceptance. |
| High | More trials may have been inferred from agents or days | Statistics use the world-level paired difference. Secondary per-agent summaries remain within-world observations. |
| Medium | A rounded online average compared unequal to its exact Python integer | The first reference run stopped on 583 versus 582.9999999999999. The subsequent comparison converts only the mean to binary64 for the existing tolerance. Integer resource counts and replay records are still checked exactly. The registered outputs stay immutable. |
| Medium | A policy called joint gain may introduce no new physical behaviour | Joint gain and fixed-prior material both accept all funded offers here. The reference confirms the resulting null physical contrast in every world. |
| Medium | A better aggregate score might mask losses | The stress confirmation recorded 14 lower-intake agent-world observations under joint gain. Report both directions. |
| Open | Moral or institutional interpretation exceeds the experimental policy model | Utilities, evidence access and exchange rules are prescribed. The model has no institutional rule evolution, empirical agent sample or independent human review. |

A distinct follow-up should vary both the cost of transferring surplus and whether payment executes only upon delivery. It could distinguish effects of choice objectives from the equivalence created by the present mechanism.
