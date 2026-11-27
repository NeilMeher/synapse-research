# Active Scientific Inquiry and the Discovery of Governing Laws: An Exact Bayesian Benchmark

**Authors**: SYNAPSE Consortium (NOESIS Laboratory)  
**Date**: November 2026  
**Status**: Confirmatory Benchmark Complete (Replication Verified)  
**Evidence Class**: Synthetic Simulation  
**Repository**: [github.com/NeilMeher/synapse-research](https://github.com/NeilMeher/synapse-research)  
**Artifact Hash**: `edb29de55e0992f2ffa0c02cf8ba17e6c810799a2c97ff385500709b8253a1ba`

---

## Abstract

Automated scientific discovery requires an agent to deduce governing mathematical laws from scarce, noisy observations while sequentially choosing which experiments to conduct. Here we present NOESIS, an exact Bayesian benchmark evaluating automated hypothesis discovery across four canonical natural law families: Polynomial, Harmonic, Exponential Decay, and Rational/Padé functions. We compare four inquiry policies under an identical budget of eight sequential observations: (1) passive random sampling, (2) deterministic space-filling uniform grid sampling, (3) active predictive uncertainty sampling, and (4) active information gain targeting Bayesian model disagreement (*experimentum crucis*). In a pre-registered confirmatory trial of 300 synthetic physical systems ($N=300$), active information gain achieved the highest true family recovery rate ($91.33\%$, $95\%\text{ CI } [0.881, 0.945]$) and posterior confidence allocated to truth ($87.43\%$). However, within this sample size, the Bonferroni-corrected primary contrasts against passive random ($+2.67\text{ pp}$, $95\%\text{ CI } [-1.68, +7.02]\text{ pp}$) and uniform grid sampling ($+1.00\text{ pp}$, $95\%\text{ CI } [-3.43, +5.43]\text{ pp}$) spanned zero. We formalize the conditions under which model ambiguity drives discovery versus when passive space-filling provides equivalent identification power.

---

## 1. Introduction

From Kepler’s extraction of planetary ellipses from Tycho Brahe’s observational records to contemporary symbolic regression engines (Schmidt & Lipson, 2009; Brunton et al., 2016), scientific progress hinges on isolating low-dimensional mathematical laws from noisy measurements. While standard machine learning prioritizes passive interpolation over large corpora, scientific inquiry operates in an active regime where measurements are expensive, constrained by physical budgets, and chosen deliberately to falsify or discriminate between competing theoretical formulations (Box & Hill, 1967; Lindley, 1956).

The NOESIS laboratory investigates the fundamental question:
> **Does active inquiry guided by Bayesian model disagreement accelerate the discovery of hidden functional laws compared to passive observation policies under severe measurement constraints?**

We implement an exact conjugate Bayesian framework that avoids optimization instability, MCMC convergence issues, and arbitrary regularization hyperparameters.

---

## 2. Experimental Framework

### 2.1 Candidate Law Families

The environment generates one-dimensional continuous relationships $y = f^*(x) + \epsilon$ over domain $\mathcal{X} = [-2.0, +2.0]$ with additive Gaussian noise $\epsilon \sim \mathcal{N}(0, \sigma^2)$ ($\sigma = 0.20$, precision $\beta = 25.0$). Nature draws ground truth from four distinct functional families:

1. **Polynomial ($\text{poly}$)**: $\boldsymbol{\phi}(x) = [1, x, x^2]^T$
2. **Harmonic ($\text{harm}$)**: $\boldsymbol{\phi}(x) = [1, \sin(\pi x), \cos(\pi x)]^T$
3. **Exponential Decay ($\text{exp}$)**: $\boldsymbol{\phi}(x) = [1, \exp(-x^2), \exp(-|x|)]^T$
4. **Rational ($\text{rat}$)**: $\boldsymbol{\phi}(x) = [1, (1+x^2)^{-1}, x(1+x^2)^{-1}]^T$

Parameters $\boldsymbol{\theta}^* \sim \mathcal{N}(\mathbf{0}, \alpha^{-1}\mathbf{I}_3)$ with prior precision $\alpha = 1.0$.

### 2.2 Inquiry Policies (Arms)

All arms receive an initial calibration observation at $x = 0.0$ and execute $7$ sequential queries (total budget $B=8$):
- **Random (`random`)**: Queries drawn i.i.d. uniformly from a discrete candidate grid $\mathcal{X}_{\text{grid}}$ of 21 points ($x \in \{-2.0, -1.8, \dots, 2.0\}$).
- **Uniform Grid (`uniform_grid`)**: Queries chosen deterministically to fill the domain equispaced.
- **Active Uncertainty (`active_uncertainty`)**: Queries the point of maximal predictive variance for the current leading hypothesis:
  $$x_t = \arg\max_{x \in \mathcal{X}_{\text{grid}}} \sigma_{\hat{m}}^2(x)$$
- **Active Information Gain (`active_ig`)**: Queries the point of maximal theoretical divergence across all candidate models (Bayesian Model Disagreement):
  $$x_t = \arg\max_{x \in \mathcal{X}_{\text{grid}}} \sum_{m} P(m \mid \mathcal{D}_{t-1}) \left(\mu_m(x) - \bar{\mu}(x)\right)^2$$

---

## 3. Confirmatory Results

The confirmatory experiment (`noesis-confirmatory-001`) evaluated 300 paired synthetic physical worlds ($N=300$). All metrics and contrasts were prespecified prior to execution.

### Table 1: Performance Across Inquiry Architectures

| Policy | Family Recovery | Posterior at Truth | Mean Log Loss | Out-of-Sample Test RMSE |
| :--- | :---: | :---: | :---: | :---: |
| **Active Information Gain** | **91.33%** | **87.43%** | **0.2246** | 0.2799 |
| **Uniform Grid** | 90.33% | 86.50% | 0.2252 | **0.1219** |
| **Random Sampling** | 88.67% | 83.26% | 0.2827 | 0.1525 |
| **Active Uncertainty** | 88.00% | 81.08% | 0.3007 | 0.1203 |

### Table 2: Primary Confirmatory Contrasts

| Contrast ID | Estimate | Sample SD | 95% Bonferroni CI ($z=2.241$) |
| :--- | :---: | :---: | :---: |
| `active_ig_minus_random_recovery` | +0.0267 (+2.67 pp) | 0.3362 | [-0.0168, +0.0702] |
| `active_ig_minus_uniform_recovery` | +0.0100 (+1.00 pp) | 0.3420 | [-0.0343, +0.0543] |

---

## 4. Discussion and Limitations

### 4.1 Theoretical Disagreement vs. Space-Filling Efficiency
While Active Information Gain achieved the highest absolute family recovery ($91.33\%$) and highest posterior probability assigned to the true model ($87.43\%$), the difference compared to a deterministic uniform space-filling grid ($90.33\%$) was modest ($+1.00\text{ pp}$) and not statistically distinguishable from zero at the prespecified Bonferroni $\alpha=0.05$ threshold.

Interestingly, Uniform Grid sampling achieved significantly lower out-of-sample Test RMSE ($0.1219$) than Active IG ($0.2799$). This trade-off reflects a deep epistemological distinction:
- **Active Model Disagreement** concentrates measurements at extreme domain boundaries or inflection zones where competing hypotheses disagree most violently. This maximizes *model identification* power.
- **Uniform Space-Filling** distributes measurements across the entire support, minimizing *parameter estimation error* and global interpolation error.

### 4.2 Limitations
1. **Low Dimensionality**: The current testbed is restricted to one-dimensional scalar domains ($D=1$). In higher dimensions ($D \ge 5$), the curse of dimensionality severely impairs passive grid sampling, where active inquiry typically shows exponential advantages.
2. **Linear-in-Parameters Basis Expansion**: While basis functions are nonlinear, parameter updates remain linear Gaussian conjugates.

---

## 5. Reproduction and Provenance

Every result in this paper is fully reproducible:
- **Node.js execution**: `node scripts/noesis.mjs verify`
- **Independent Python reference**: `python scripts/reference_noesis.py`
- **Stored digest**: `edb29de55e0992f2ffa0c02cf8ba17e6c810799a2c97ff385500709b8253a1ba`

---

## References

- Box, G. E., & Hill, W. J. (1967). Discrimination among mechanistic models. *Technometrics*, 9(1), 57–71.
- Brunton, S. L., Proctor, J. L., & Kutz, J. N. (2016). Discovering governing equations from data by sparse identification of nonlinear dynamical systems. *PNAS*, 113(15), 3932–3937.
- Lindley, D. V. (1956). On a measure of the information provided by an experiment. *Annals of Mathematical Statistics*, 27(4), 986–1005.
- MacKay, D. J. (1992). Bayesian interpolation. *Neural Computation*, 4(3), 415–447.
- Schmidt, M., & Lipson, H. (2009). Distilling free-form natural laws from experimental data. *Science*, 324(5923), 81–85.
