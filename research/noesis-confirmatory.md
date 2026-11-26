# NOESIS Confirmatory Protocol (noesis-confirmatory-001)

## 1. Frozen Confirmatory Specification
This document constitutes the frozen confirmatory protocol for NOESIS study `noesis-confirmatory-001`. The specification, hypotheses, and analysis plan are frozen prior to executing the confirmatory run.

## 2. Experimental Parameters
- **ID**: `noesis-confirmatory-001`
- **Phase**: `confirmatory`
- **Seed**: 2026112702
- **Trials**: 300
- **Budget**: $B = 8$ sequential measurements per trial
- **Noise**: Additive Gaussian $\sigma = 0.20$ ($\beta = 25.0$)
- **Priors**: $\boldsymbol{\theta} \sim \mathcal{N}(\mathbf{0}, \alpha^{-1} \mathbf{I}_3)$ with $\alpha = 1.0$

## 3. Hypotheses and Primary Contrasts
1. **Primary Contrast 1**: Active Information Gain (`active_ig`) achieves higher true family recovery than passive random inquiry (`random`):
   $$\Delta_{R, \text{random}} = \mathbb{E}[R_{\text{active\_ig}}] - \mathbb{E}[R_{\text{random}}] > 0$$
2. **Primary Contrast 2**: Active Information Gain (`active_ig`) achieves higher true family recovery than passive uniform grid inquiry (`uniform_grid`):
   $$\Delta_{R, \text{uniform}} = \mathbb{E}[R_{\text{active\_ig}}] - \mathbb{E}[R_{\text{uniform\_grid}}] > 0$$

Multiplicity is controlled via Bonferroni correction for 2 contrasts:
$$z_{0.05 / (2 \times 2)} = 2.241402727604947$$

## 4. Secondary Outcomes
- Posterior probability allocated to ground truth family ($P^*$)
- Mean Log Loss ($-\ln P^*$)
- Out-of-sample root mean squared error on held-out test grid of 41 points
