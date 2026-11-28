# Integrated belief dynamics

`belief-dynamics-001` · registered exact finite model, evidence A

A decision-maker receives three binary reports about a fair binary claim. The first two have the same reliability conditional on the current hidden regime. They are either perfect duplicates or independent given that regime. A third report is an independent .72-reliable alternative. The source switches between .85 and .30 reliability according to a declared Markov law. Independent .80-accurate historical audits become visible after one or three steps. All policies see the same report bits and audit events within each law and delay. An adaptive policy applies MORPHEUS filtering to historical audit events. The fixed policy assumes the healthy regime. ECHO's count likelihood either represents the declared joint law or applies a naive multiplication of the marginal reliability. These policies use stated model information. The experiment does not estimate the joint law or audit accuracy from a calibration sample. [Frozen design](belief-dynamics/protocol.json) · [Exact results](evidence/belief-dynamics-001/factorial.json)

The dependence-aware observer mixes the two regime-conditional likelihoods after filtering. The naive observer multiplies reliability marginals. Even under conditional independence given the regime, unobserved regime variation can induce joint dependence. The exact joint enumerator verified nonnegative normalized mass, identical primary marginals of 5957/9216 in both laws, and joint correctness of 5957/9216 for duplicates versus 450047/921600 for conditional independence given the regime. No empirical correlation is used to stand in for a joint law.

AXIOM supplies accept, reject, abstain or one optional verification, with false acceptance cost 2, false rejection cost 1, abstention cost .42 and an .80-accurate verification signal costing .08. Verification capacity and cost are equal within each scenario. Take-up is a policy outcome. The final action after verification is accept or reject. The MIRAGE comparison distinguishes internal probability of the claim, a simulated reported probability with doubled log odds, and the actual claim bit. The reported value is scored and has no path to the decision. Evaluation uses exact expected loss, Brier and binned calibration under the true joint law.

## Results

| Joint law and lag | Fixed / naive | Fixed / aware | Adaptive / naive | Adaptive / aware |
| --- | ---: | ---: | ---: | ---: |
| Duplicate, one step | .53044 | .36227 | .32011 | .29616 |
| Duplicate, three steps | .53044 | .36227 | .31405 | .30361 |
| Independent given regime, one step | .39073 | .39073 | .28175 | .27915 |
| Independent given regime, three steps | .39073 | .39073 | .28497 | .28497 |

Entries are expected decision loss including verification cost. In the duplicate law the adaptive naive independence penalty was **.023951** with short delays and **.010437** with long delays. The registered long-minus-short interaction was **−.013514** loss units. It goes against the example that longer delays necessarily amplify the cost of counting duplicates. The correctly specified observer's loss increased with longer delays. The misspecified naive policy's loss decreased. Their verification rates changed, and both are fixed functions of the information available and the risk model. The loss difference is a policy interaction, rather than a general theorem about the value of delay.

For the short-lag duplicate-aware adaptive policy, doubling forecast log odds increased Brier loss from .18519 to .19793 with decision loss unchanged by construction. For conditional independence given regime at the long lag, the aware observer improved internal Brier from .18211 to .18028 while exact decision loss was equal. The Bayes observer's internal bin calibration error was zero under the declared law. No arm abstained at the registered costs, so this environment gives no abstention separation. The reported distortion is synthetic and provides no actual language-model confidence evidence.

## Owner review and scope

The owner can derive the two-source duplicate posterior by comparing the single-report and two-report likelihood. Then show why two regime-conditional independent reports do not generally remain independent after marginalizing the hidden mode. Finally explain how calibration can change while a decision remains within the same loss region. [Worked trust mathematics](morpheus-adaptive-mathematics.md#4-trust-evidence-and-decisions) · [MIRAGE measurement boundary](mirage-measurement-synthesis.md) · [Strategic effort and POLIS transfer](axiom-strategic-settlement.md)

Exact latent-path enumeration checked all four law-delay cells. The shared browser-safe JavaScript model agreed with the independent rational implementation on all 480 visible policy cells, both forecast values at absolute tolerance 10⁻¹², and every selected action. Because the calculation covers the finite law exactly, there is no sampling interval. Model uncertainty, calibration uncertainty for the joint law, conditional source shifts beyond the prescribed Markov model and empirical transfer remain open. The result establishes one controlled cognition mechanism and gives a testable reason to distinguish acquisition value, posterior quality and defensible claims in Phase C. Independent human review remains pending.
