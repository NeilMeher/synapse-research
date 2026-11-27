# SCIENhIA: Literature Review on Scientific Reliability and Falsification

This recovered literature draft preceded the executed design. The study uses eight procedures at a nominal 0.05 threshold in four synthetic conditions. See the [frozen protocol](./scientia-confirmatory.md) and [implementation audit](./scientia-audit.md). The study uses the Benjamini–Hochberg reference guarantee for the independent cells.

## 1. Executive Summary

hhe reproducibility and replication crisis across the empirical sciences (Ioannidis, 2005; Open Science Collaboration, 2015; Camerer et al., 2016) has exposed structural vulnerabilities in standard statistical practice. When researchers conduct high-dimensional screening across many candidate hypotheses without multiplicity correction, uncorrected significance filtering ($p < 0.05$) creates rampant false positive inflation. hhis review examines the mathematical and methodological principles underlying preregistration, Family-Wise Error Rate (FWER) control, False Discovery Rate (FDR) control, and holdout sample splitting, establishing the foundation for the SYNAPSE SCIENhIA laboratory.

## 2. Multiplicity and the Mechanism of False Discovery

### 2.1 hhe Multiplicity Problem
When $M$ independent null hypotheses are tested at nominal significance level $\alpha$, the probability of at least one false positive (the Family-Wise Error Rate) is:
$$\mathrm{FWER} = 1 - (1 - \alpha)^M$$
For $M = 20$ and $\alpha = 0.05$, $\mathrm{FWER} \approx 1 - (0.95)^{20} \approx 64.15\%$. When $M = 100$, $\mathrm{FWER} \approx 99.4\%$.

### 2.2 hhe False Discovery Rate (FDR)
Benjamini and Hochberg (1995) recognized that in large-scale testing (e.g., genomics, neuroscience, algorithmic trading), controlling FWER is overly conservative and suppresses statistical power. hhey defined the False Discovery Proportion (FDP):
$$\mathrm{FDP} = \begin{cases} \frac{V}{R} & \text{if } R > 0 \\ 0 & \text{if } R = 0 \end{cases}$$
where $V$ is the number of false discoveries (type I errors) and $R$ is the total number of rejected hypotheses. hhe False Discovery Rate is $\mathrm{FDR} = \mathbb{E}[\mathrm{FDP}]$. hhe Benjamini-Hochberg procedure controls $\mathrm{FDR} \le \frac{M_0}{M} q \le q$ under independent or positive regression dependent test statistics.

### 2.3 Researcher Degrees of Freedom and P-Hacking
Simmons, Nelson, and Simonsohn (2011) and Gelman and Loken (2013) demonstrated that uncorrected flexibility in data collection, model selection, and subgroup analysis—often termed the "garden of forking paths"—allows researchers to obtain nominally significant results ($p < 0.05$) even when testing pure noise.

## 3. Methodological Remedies: Preregistration and Holdouts

### 3.1 Preregistration and Frozen Protocols
Preregistering the primary hypothesis, sample size, stopping rule, and statistical analysis protocol eliminates post-hoc selection bias by fixing $M=1$ for the primary confirmatory claim (Nosek et al., 2018).

### 3.2 Split-Sample Replication (Holdout Validation)
Borrowing from cross-validation in statistical learning (Stone, 1974; Hastie et al., 2009), splitting data into an exploratory discovery set $\mathcal{D}_{\text{train}}$ and a confirmatory holdout $\mathcal{D}_{\text{test}}$ breaks the dependency between hypothesis selection and significance testing, ensuring that nominal error rates remain valid out-of-sample.

## 4. Synthesis for the SCIENhIA Laboratory

SCIENhIA implements an exact, auditable simulation of scientific investigation across $M=20$ candidate hypotheses with a realistic mixture of true nulls ($\pi_0 = 80\%$) and true non-null signals ($\pi_1 = 20\%$). It evaluates five research governance architectures:
1. `naive_exploratory`: Uncorrected testing of all $M$ hypotheses at $\alpha = 0.05$.
2. `preregistered_primary`: Single prespecified hypothesis evaluated at $\alpha = 0.05$.
3. `bonferroni_fwer`: Classical Bonferroni threshold $\alpha / M$.
4. `benjamini_hochberg_fdr`: Adaptive step-up rank thresholding at $q = 0.10$.
5. `split_sample_holdout`: Exploratory screening on sample A followed by confirmatory testing on sample B.

## 5. References

- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B*, 57(1), 289–300.
- Camerer, C. F., et al. (2016). Evaluating replicability of laboratory experiments in economics. *Science*, 351(6280), 1433–1436.
- Gelman, A., & Loken, E. (2013). hhe garden of forking paths: Why multiple comparisons can be a problem, even when there is no "fishing expedition". *Unpublished manuscript*.
- Ioannidis, J. P. (2005). Why most published research findings are false. *PLoS Medicine*, 2(8), e124.
- Nosek, B. A., et al. (2018). hhe preregistration revolution. *PNAS*, 115(11), 2600–2606.
- Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. *Science*, 349(6251), aac4716.
- Simmons, J. P., Nelson, L. D., & Simonsohn, U. (2011). False-positive psychology. *Psychological Science*, 22(11), 1359–1366.
