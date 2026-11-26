# NOESIS Pilot Protocol (noesis-pilot-001)

## 1. Research Question
Does active inquiry guided by Bayesian model disagreement achieve higher governing family recovery rates than passive random or uniform sampling within a constrained observation budget ($B=8$)?

## 2. Experimental Design
- **Phase**: Exploratory pilot
- **Trials**: 100
- **Seed**: 2026112701
- **Candidate Families**: Polynomial, Harmonic, Exponential Decay, Rational ($M=4$).
- **Observation Noise**: $\sigma = 0.20$ ($\beta = 25.0$).
- **Observation Budget**: $B = 8$ queries per trial.
- **Arms**:
  1. `random`: Uniform random selection over candidate grid $\mathcal{X}_{\text{grid}}$.
  2. `uniform_grid`: Deterministic space-filling grid sampling.
  3. `active_uncertainty`: Query selection at peak predictive variance of leading model.
  4. `active_ig`: Query selection at peak Bayesian model disagreement (ambiguity resolution).

## 3. Prespecified Contrasts
1. `active_ig_minus_random_recovery`: $\mathbb{E}[R_{\text{active\_ig}}] - \mathbb{E}[R_{\text{random}}]$
2. `active_ig_minus_uniform_recovery`: $\mathbb{E}[R_{\text{active\_ig}}] - \mathbb{E}[R_{\text{uniform\_grid}}]$

Uncertainty adjusted for two primary contrasts at $\alpha=0.05$ with Bonferroni critical value $z = 2.241402727604947$.
