# Dynamic trust from delayed feedback

MORPHEUS · exact mathematics (A) · `morpheus-adaptive-mathematics-001`

The previous MORPHEUS study compared fixed weights with cumulative updating under registered synthetic histories. A cumulative learner recovered some performance during corruption, then kept discounting a restored source. This note derives candidate memory rules and checks their calculations. A new benchmark is needed to compare their decision performance on common histories. [Prior benchmark](morpheus-trust-results.md) · [Exact fixtures](evidence/morpheus-adaptive-mathematics-001/exact-fixtures.json) · [Manifest](evidence/morpheus-adaptive-mathematics-001/manifest.json)

## 1. Exponential memory and the price of responsiveness

Let \(r_t\) be the reliability estimate after \(t\) audited updates, \(r_0\) deterministic, and \(Z_0,\ldots,Z_{t-1}\) IID Bernoulli with success probability \(q\). Write \(a=1-\alpha\), where \(0<\alpha\le 1\). Iteration gives

\[
r_t=a^t r_0+\alpha\sum_{i=0}^{t-1}a^{t-1-i} Z_i .
\]

Taking expectations and using a geometric sum yields \(q+(r_0-q)a^t\). Covariance terms vanish under independence. With \(\operatorname{Var}(Z_i)=q(1-q)\), the variance is

\[
\operatorname{Var}(r_t)=\alpha^2q(1-q)\sum_{j=0}^{t-1}a^{2j}
=\frac{\alpha}{2-\alpha}q(1-q)(1-a^{2t}).
\]

The stationary variance is the same expression with the bracket replaced by one. At nondegenerate \(q\) it increases with \(\alpha\) since the derivative of \(\alpha/(2-\alpha)\) is \(2/(2-\alpha)^2\). An independent but random initial estimate adds \(a^{2t}\operatorname{Var}(r_0)\). Correlated audit outcomes add the weighted cross-covariances. Selective audits can also change the observation rate itself. Under unbiased sampling and independent symmetric audit error \(1-\eta\), the relevant observed rate is \(\widetilde q=(1-\eta)+(2\eta-1)q\), which equals the true rate only at \(\eta=1\) or \(q=1/2\). [Roberts, 1959](https://doi.org/10.1080/00401706.1959.10489860)

After a jump from \(q_o\) to \(q_n\), conditional expectation evolves as \(q_n+(r_s-q_n)a^k\) after \(k\) new-rate observations following the change at index \(s\). If \(E[r_s]=q_o\), replace \(r_s\) by \(q_o\) in the unconditional mean. Expected error relative to the new target is halved after \(\log(1/2)/\log(1-\alpha)\) in update units for \(0<\alpha<1\), or its ceiling for the first whole update at which the decay criterion holds. At \(\alpha=1\) the old estimate is discarded on the first update. Noisy, selective, sparse and delayed verification decouple update count from elapsed time.

One transparent optimization uses **next-update squared error** after a known step and deterministic \(r_0\). Set \(D=(r_0-q_n)^2\), \(V=q_n(1-q_n)\). The expected loss is \(D(1-\alpha)^2+V\alpha^2\) and the minimizer on \([0,1]\) is \(D/(D+V)\) for \(D+V>0\). A correct known fixed initial value gives the boundary \(\alpha=0\), or an infimum as \(\alpha\downarrow 0\) if updating is mandatory. A jump to a deterministic new rate gives \(\alpha=1\). When \(D=V=0\) all values tie. Other objectives such as realized decisions with asymmetric error costs can rank policies differently.

## 2. Paths and alarms

For a trust cutoff \(u\), define \(\tau=\inf\{t\ge0:r_t\le u\}\). Exact finite enumeration propagates the two branches of each alive state with probabilities \(1-q\) and \(q\), moving newly crossing mass to \(P(\tau=t)\). This gives a first-passage distribution plus surviving mass, with \(O(2^T)\) worst-case branch work over horizon \(T\). The archived reference enumerates complete binary paths and checks each prefix by a finite weighted sum. The public calculation limits the horizon and uses floating-point thresholds. The verifier uses exact rational thresholds.

With \(r_0=.9\), \(q=.2\), \(u=.5\) and \(\alpha=.5\), the mean at one update is .55, while 80% of paths have already crossed. By four updates 99.84% have crossed. Under a clean rate of .9 the same rule crosses by four with probability 34.39%. At \(\alpha=.25\) the corresponding probabilities are 81.92% after the drop and 0.37% under the clean rate. These are finite detection and false-alarm probabilities under given laws. In a fixed-delay setting with an audit at each time step, a no-feedback interval leaves an EWMA unchanged and shifts its update-indexed passages by the delay. Recovery can be defined by a separate upward threshold and post-restoration start. Clean interruptions and decision regret require their own denominators. An expected trajectory, a passage-time distribution and a detection delay are different objects.

## 3. Fixed reliability and latent regimes

A fixed \(r\) with prior density proportional to \(r^{a_0-1}(1-r)^{b_0-1}\), followed by conditionally IID true audits, yields posterior Beta\((a_0+S,b_0+F)\). This follows by multiplying by the Bernoulli likelihood \(r^S(1-r)^F\). The posterior predictive probability for the next audited success is \(A/(A+B)\), and posterior variance is \(AB/((A+B)^2(A+B+1))\), for \(A=a_0+S,B=b_0+F\). For example, Beta(3.6, 0.4) plus three successes and five failures gives mean 0.55. Using only a rolling window with a repeated reinitialization discards information outside the window. Exponentially discounting counts defines a weighted likelihood update. A Bayesian interpretation for those methods requires a declared changing-reliability model or a specified generalized updating rule. Even independent symmetric audit noise generally breaks conjugacy for the latent true rate.

For dynamic reliability let \(X_t\) be healthy \(H\) or faulty \(F\), with \(P(F\mid H)=f\), \(P(H\mid F)=g\) and success rates \(q_H,q_F\). Write \(h_t=P(X_t=H\mid\text{available audits})\). Prediction uses \(h^-_t=(1-f)h_{t-1}+g(1-h_{t-1})\). For an audited event \(z\in\{0,1\}\), define \(\ell_s(1)=(1-\eta)+(2\eta-1)q_s\) and \(\ell_s(0)=1-\ell_s(1)\). Bayes updating gives

\[
h_t=\frac{h^-_t\ell_H(z)}{h^-_t\ell_H(z)+(1-h^-_t)\ell_F(z)} .
\]

With no available audit for that event the emission factor is one. At query time \(T\), apply only audit factors whose arrival time is at most \(T\), replaying in event order through \(T\). This computes the current filtered regime probability from the joint law because delay is assumed ignorable conditional on the specified observation schedule. With fixed lag \(d\) and every audit through \(T-d\) available, propagate the state probability at \(T-d\) through \(d\) transition-only steps. Delayed evidence updates the likelihood of a historical state. Treating it as a likelihood of the current state changes the model. The implementation replays from the declared prior in linear time per query in the time horizon and audit input count. A cached-prefix or fixed-lag alternative for long histories will need separate equivalence checks.

At time 3 in the fixture, an event-0 success arrives after an event-1 failure was observed. The filter gives \(P(H_3)=1388733/2152900\approx.6451\). Exact enumeration sums the joint probabilities of all healthy/faulty paths, including observation error and masking, to check the recursion. At \(\eta=.5\), every emission is identical across regimes and audits leave predictions unchanged. The audit channel does not identify both an unknown \(\eta\) and an unknown \(q\) from success frequency alone. For example perfect audits of \(q=.74\) and 80%-accurate audits of \(q=.90\) both produce a rate of .74. Informative audit timing, correlated emissions and state-dependent selection require explicit likelihoods. [Rabiner, 1989](https://doi.org/10.1109/5.18626)

A candidate change-point comparator is the run-length posterior. With a fixed hazard \(H\), segment Beta statistics and the posterior predictive probability for each run length, each observation either extends its run with weight \(1-H\) or starts a run with weight \(H\) and resets its sufficient statistics. The timing convention determines which segment emits the change-time observation. Retaining run lengths 0 through \(L\) costs \(O(L)\) per observation with sufficient statistics and requires an explicit tail rule, since truncation changes the model. Delayed audits require event-time replay or a correctly augmented state. This is a literature-grounded candidate. Its hazard, run-length cap, treatment of noisy observation and performance under drift remain untested here. [Adams and MacKay, 2007](https://arxiv.org/abs/0710.3742)

## 4. Trust, evidence and decisions

Under symmetric binary reliability and conditional independence given truth, each signed report contributes \((2Y_j-1)\log(r_j/(1-r_j))\) to the log odds of truth. Consider a fair prior and a positive report from an 80% reliable channel. With a perfect duplicate, the joint likelihood of two positives is .8 under truth and .2 under falsehood, and the posterior stays .8. Independence multiplication instead gives \(16/17\approx .9412\). The exact counterexample uses a joint conditional law. A pairwise correlation alone does not specify likelihoods for larger groups. [ECHO moment results](echo-moments-results.md)

Given \(p=P(\text{claim true})\) and false-accept and false-reject costs \(C_A,C_R\), the immediate risks are \(C_A(1-p)\) and \(C_Rp\). If \(C_A+C_R>0\), acceptance beats rejection at \(p>C_A/(C_A+C_R)\), with a tie at the boundary. This threshold applies to the **claim probability**, rather than the source's latent reliability. Under an ambiguity interval \([p_-,p_+]\), a minimax-loss agent compares \(C_A(1-p_-)\) and \(C_Rp_+\). Choice of ambiguity and loss rule is a model assumption.

An audit with cost \(c\) and possible outcomes \(z\) has risk \(c+\sum_z\min\{C_A P(0,z), C_R P(1,z)\}\). This joint-mass form also works for impossible signals of zero probability. Verify when the resulting risk is less than the minimum immediate risk, with a tie when equal. With equal unit losses, a fair claim and a 75%-accurate audit, loss falls from .50 to .25 before cost. At cost .10 verification has risk .35. Exact enumeration over all four signal-contingent actions verifies this calculation.

For AXIOM, a positive affine transformation \(U'=kU+b\), \(k>0\), preserves expected-utility maximizers. In a logit response with inverse temperature \(\beta\), subtracting a common utility shift cancels within the softmax. Scaling utility changes the logit unless inverse temperature is rescaled to \(\beta/k\). This follows by direct substitution of \(\beta'(kU+b)=\beta U+\beta b/k\). A fully specified decision rule therefore distinguishes preferences from stochastic sensitivity to utility units.

Information about a full state is not ordered by decision value for one loss function. For a fair truth bit and independent fair nuisance bit, perfect observation of the nuisance gives one bit about the full state and reduces minimum classification loss by zero. The 75%-accurate signal of truth gives about .188722 bits about the full state and reduces loss by .25. Both quantities were independently enumerated. [Blackwell, 1953](https://doi.org/10.1214/aoms/1177729032)

## 5. Verification and transfer

Run `python -B research/adaptive-trust/reference.py verify`. The verifier enumerates Bernoulli paths, independent Beta integrals, hidden-state paths, threshold events and decision rules. It checks 31 finite cases against the shared JavaScript implementation at absolute tolerance \(10^{-12}\), evaluates the duplication and decision-information examples, and checks the published artifact. These are mathematical checks. The work's contribution is the verified application of standard estimators to common timing and decision contracts plus finite diagnostic examples. It establishes neither a universally optimal learning rate nor a winner among adaptive policies. Human review remains pending.

A confirmatory comparison needs matched streams of reports, audit assignments, delays and noise across policies, with regime paths hidden from decision rules. Prespecify clean false alarms, loss around recovery, cumulative decision loss and the information dependence model, then use separate development and test histories. A useful defence exercise is to derive the event-0 delayed update and say what additional observation could distinguish a biased audit from a genuinely unreliable source.
