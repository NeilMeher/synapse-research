# Internal adversarial audit

AI-assisted audit of the initial ECHO slice. The separate exact enumerator checks the numerical implementation. Human and external peer review are pending.

| Finding | Severity | Evidence and consequence | Resolution |
|---|---|---|---|
| Default hub dominates the binary decision | High for interpretation | Terminal weight exceeds 0.5 in engine/echo.mjs. With binary inputs that determines the group decision from one signal at round 12. | Explained in the manuscript and learning guide. ECHO makes a finite-policy claim. |
| Mixture concentrates all original error during one regime | High for model generality | Evidence generator creates unanimous trials. Pairwise correlation is insufficient for transport to arbitrary dependencies. | Model equation and limitation visible. Matched-dependence alternatives left open. |
| Naive Bayes counts duplicate reports as independent | High for calibration | engine/echo.mjs explicitly sets rho to zero in this comparator. The independence assumption is deliberately wrong when rho is positive. | Kept as a baseline. Results include Brier loss and the different oracle assumptions are documented. |
| Shared structures induce correlations across policies and trials contain interdependent agents | High for inference | All policies within a trial reuse random values. Treating arms or agents as replicates is pseudoreplication. | Unit is one task. Primary effects are computed as paired differences and only the three prespecified contrasts are family-adjusted. |
| Frozen first-task archive can show unanimity | Medium for demonstration | All original reports coincide in trial one. The archive is faithful but one round can look unchanged. | Separate labelled browser example uses a deliberately chosen seed and shows how one hub can be wrong when complete averaging is right. Archive remains as specified. |
| Output envelope interrupted between result and manifest | Medium for data integrity | Each write replaces one file atomically. Cross-file interruption could leave a mismatched pair. | Verification checks byte counts and hashes, compares scientific inputs and reexecutes the protocol before publication. |
| Runtime validation and source security | Medium | Versioned configs reject malformed fields and enforce bounded sizes. Site uses local static files, DOM text construction and relative fetches. | Unit validation, graceful artifact-failure test and local visible inspection. No backend or arbitrary visitor code. |
| Fixed design has no external replication | High for use beyond scope | Python reference is a distinct calculation with shared AI authorship. | Disclosed in the manuscript and status. External human review remains open. |

Primary release checks are the exact reference, deterministic artifact verification, browser smoke checks and production build. The strongest next methodological check is a different joint signal generator at the same marginal accuracy and pairwise correlation.
