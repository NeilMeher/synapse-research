# ECHO technical supplement · Heterogeneous identification

**Class A mathematical result, using a Class F calibration plug-in.** The specification froze at `82b23b2fa0b10de769dc52171ddd04cdd38ce4ea`. The solver considered every binary correctness state. The independent reference evaluated 36 endpoint certificates with exact rational arithmetic, including all primal moments and each dual inequality. [Frozen protocol](echo-moments-protocol.md) · [Verified certificate](evidence/echo-heterogeneous-moments-001/bounds.json)

## Exact relationship for three members

Write pᵢ = P(Xᵢ=1), qᵢⱼ = P(Xᵢ=Xⱼ=1), and t = P(X₁=X₂=X₃=1). Each exactly-two state has mass qᵢⱼ−t. Each singleton has mass pᵢ−qᵢⱼ−qᵢₖ+t. The none-correct state has mass 1−Σp+Σq−t. Thus majority probability is Σq−2t. Nonnegative masses give the sharp interval for t

```text
L = max(0, q12+q13−p1, q12+q23−p2, q13+q23−p3)
U = min(q12, q13, q23, 1−sum(p)+sum(q))
```

Every t in [L,U] reconstructs a feasible law because these eight masses sum to one. Majority therefore ranges from Σq−2U to Σq−2L. With p=(.60,.70,.80) and q=(.42,.48,.56), t can range from .30 to .36. Majority can range from .74 to .86. A mutually independent law gives t=.336 and majority .788. Matching independent pair moments leaves higher-order dependence free.

## Seven heterogeneous members

Let x range over {0,1}⁷ and wₓ≥0 be probability mass. Build A with a normalization row and a row for each prescribed subset S. Its entries are ∏ᵢ∈S xᵢ. Given b=Aw, optimize c·w for c(x)=1[Σxᵢ≥4]. For the lower endpoint, a vector y with Aᵀy≤c gives y·b≤c·w. For the upper endpoint reverse the pointwise inequality. Each archived feasible extremizer attains its respective dual bound. Exact equalities supply the optimality proof. The model does not assume exchangeability.

| Input moments, seven-member English calibration | Sharp majority interval | Sharp all-wrong interval |
| --- | --- | --- |
| Marginals | 23/321 to 1055/1284 | 0 to 181/642 |
| Marginals and all pairs | 175/642 to 821/1284 | 11/321 to 47/214 |
| Marginals, pairs and three fixed triples | 94/321 to 67/107 | 20/321 to 61/321 |

For majority, adding the three triples narrows the pair-constrained range from about **27.26–63.94%** to **29.28–62.62%**. It still leaves over 33 percentage points unidentified. A separate heterogeneous synthetic product-law fixture narrows from 35.47–92.00% to 35.47–91.17% when the same three selected triples are added. The unchanged lower endpoint is part of the result. Sampling uncertainty in the archive moments, alternative sets of triples and transport to fresh questions are separate issues. The all-wrong objective concerns binary correctness and treats invalid answers as failures. The analysis does not identify plurality accuracy, which depends on wrong-answer identities.

Prékopa's established approach constrains probabilities of Boolean functions by partial joint information. Our calculation preserves model-specific moments, supplies reproducible exact optimality certificates and fixes the selected triples before optimization. A novel general theorem remains unclaimed. [Prékopa, 1990](https://doi.org/10.1287/opre.38.2.227) · [Boros and Prékopa, 1989](https://doi.org/10.1287/moor.14.2.317)

## Review questions

- Why does a triple change majority even when all pairs agree?
- Verify the eight-state reconstruction and the sign of a dual certificate.
- Explain why three observed calibration triple moments can tighten an identification interval without establishing a population confidence interval.
- Specify what extra categorical information would be needed for a plurality bound.

External mathematical and human review remain pending. More elaborate committee optimization should await fresh evaluation data and a prespecified budget. The observed ability and coverage differences provide no justification for fitting a new optimizer on the historical English holdout.
