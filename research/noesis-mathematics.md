# NOESIS: Mathematical Specification

## 1. Experimental Domain and Candidate Hypotheses

Let the experimental input domain be bounded: $\mathcal{X} = [-2.0, +2.0] \subset \mathbb{R}$.
The candidate measurement grid consists of $K_x = 21$ equispaced points:
$$\mathcal{X}_{\text{grid}} = \{ -2.0 + 0.2 \cdot j \}_{j=0}^{20}$$

The agent evaluates $M = 4$ discrete hypothesis families $\mathcal{M} = \{ m_1, m_2, m_3, m_4 \}$, where each model family $m$ defines a 3-dimensional basis expansion $\boldsymbol{\phi}_m(x) \in \mathbb{R}^3$:

1. **Polynomial Family ($m = \text{poly}$)**:
   $$\boldsymbol{\phi}_{\text{poly}}(x) = [1, \, x, \, x^2]^T$$
2. **Harmonic Family ($m = \text{harm}$)**:
   $$\boldsymbol{\phi}_{\text{harm}}(x) = [1, \, \sin(\pi x), \, \cos(\pi x)]^T$$
3. **Exponential Decay Family ($m = \text{exp}$)**:
   $$\boldsymbol{\phi}_{\text{exp}}(x) = [1, \, \exp(-x^2), \, \exp(-|x|)]^T$$
4. **Rational / Pade Family ($m = \text{rat}$)**:
   $$\boldsymbol{\phi}_{\text{rat}}(x) = \left[ 1, \, \frac{1}{1 + x^2}, \, \frac{x}{1 + x^2} \right]^T$$

## 2. Generative Process for Hidden Laws

For each independent synthetic trial $i \in \{1, \dots, N_{\text{trials}}\}$:
1. Ground truth model family $m^* \in \mathcal{M}$ is chosen uniformly at random: $m^* \sim \mathrm{Categorical}(1/4, 1/4, 1/4, 1/4)$.
2. Ground truth parameter vector $\boldsymbol{\theta}^* = [\theta_0^*, \theta_1^*, \theta_2^*]^T$ is sampled from a prior distribution:
   $$\boldsymbol{\theta}^* \sim \mathcal{N}(\mathbf{0}, \alpha^{-1} \mathbf{I}_3)$$
   with $\alpha = 1.0$.
3. When queried at $x \in \mathcal{X}$, nature returns an observation with additive Gaussian noise:
   $$y = \boldsymbol{\phi}_{m^*}(x)^T \boldsymbol{\theta}^* + \epsilon, \quad \epsilon \sim \mathcal{N}(0, \sigma^2)$$
   with observation noise $\sigma = 0.20$ (precision $\beta = \sigma^{-2} = 25.0$).

## 3. Exact Conjugate Bayesian Inference

Given a dataset of $n$ observations $\mathcal{D}_n = \{ (x_k, y_k) \}_{k=1}^n$, with design matrix $\mathbf{\Phi}_m \in \mathbb{R}^{n \times 3}$ (where row $k$ is $\boldsymbol{\phi}_m(x_k)^T$) and target vector $\mathbf{y} \in \mathbb{R}^n$:

### 3.1 Parameter Posterior Distribution
For each model family $m$:
$$\mathbf{S}_{m,n}^{-1} = \alpha \mathbf{I}_3 + \beta \mathbf{\Phi}_m^T \mathbf{\Phi}_m$$
$$\mathbf{S}_{m,n} = (\mathbf{S}_{m,n}^{-1})^{-1}$$
$$\mathbf{m}_{m,n} = \beta \mathbf{S}_{m,n} \mathbf{\Phi}_m^T \mathbf{y}$$
The parameter posterior is exactly Gaussian:
$$p(\boldsymbol{\theta}_m \mid \mathcal{D}_n, m) = \mathcal{N}(\boldsymbol{\theta}_m \mid \mathbf{m}_{m,n}, \mathbf{S}_{m,n})$$

### 3.2 Predictive Distribution
For any query $x \in \mathcal{X}$:
$$\mu_m(x) = \boldsymbol{\phi}_m(x)^T \mathbf{m}_{m,n}$$
$$\sigma_m^2(x) = \sigma^2 + \boldsymbol{\phi}_m(x)^T \mathbf{S}_{m,n} \boldsymbol{\phi}_m(x)$$
$$p(y \mid x, \mathcal{D}_n, m) = \mathcal{N}(y \mid \mu_m(x), \sigma_m^2(x))$$

### 3.3 Exact Log Marginal Likelihood (Evidence)
The marginal likelihood $p(\mathbf{y} \mid m)$ integrates over all parameter values analytically:
$$\ln p(\mathbf{y} \mid m) = \frac{3}{2} \ln \alpha + \frac{n}{2} \ln \beta - \frac{n}{2} \ln(2\pi) - \frac{1}{2} \ln \det(\mathbf{S}_{m,n}^{-1}) - \frac{1}{2} E(\mathbf{m}_{m,n})$$
where:
$$E(\mathbf{m}_{m,n}) = \beta \|\mathbf{y} - \mathbf{\Phi}_m \mathbf{m}_{m,n}\|_2^2 + \alpha \mathbf{m}_{m,n}^T \mathbf{m}_{m,n}$$

### 3.4 Model Posterior Probability
Assuming a uniform prior over models $P(m) = 1/4$:
$$P(m \mid \mathcal{D}_n) = \frac{\exp(\ln p(\mathbf{y} \mid m) - \lambda_{\max})}{\sum_{k=1}^4 \exp(\ln p(\mathbf{y} \mid k) - \lambda_{\max})}$$
where $\lambda_{\max} = \max_{k} \ln p(\mathbf{y} \mid k)$ ensures numerical stability.

## 4. Experimental Inquiry Strategies (Arms)

All arms receive an identical budget of $B = 8$ queries per trial. In the first step ($t=1$), an initial seed observation at $x=0$ is provided to ground the baseline scale. For subsequent steps $t = 2, \dots, B$, each arm selects $x_t \in \mathcal{X}_{\text{grid}}$ according to its policy:

1. **Random (`random`)**:
   $$x_t \sim \mathrm{Uniform}(\mathcal{X}_{\text{grid}})$$
2. **Uniform Grid (`uniform_grid`)**:
   $$x_t \text{ selected deterministically cycling across equispaced points in } \mathcal{X}_{\text{grid}}$$
3. **Active Predictive Uncertainty (`active_uncertainty`)**:
   Let $\hat{m} = \arg\max_m P(m \mid \mathcal{D}_{t-1})$. The agent queries the point of highest predictive variance for the current best model:
   $$x_t = \arg\max_{x \in \mathcal{X}_{\text{grid}}} \sigma_{\hat{m}}^2(x)$$
4. **Active Information Gain / Model Disagreement (`active_ig`)**:
   The agent queries the point maximizing Bayesian Model Disagreement (ambiguity resolution across competing hypotheses):
   $$\bar{\mu}(x) = \sum_{m \in \mathcal{M}} P(m \mid \mathcal{D}_{t-1}) \mu_m(x)$$
   $$\Delta(x) = \sum_{m \in \mathcal{M}} P(m \mid \mathcal{D}_{t-1}) (\mu_m(x) - \bar{\mu}(x))^2$$
   $$x_t = \arg\max_{x \in \mathcal{X}_{\text{grid}}} \Delta(x)$$

## 5. Outcome Measures and Prespecified Contrasts

### 5.1 Trial Metrics
1. **Family Recovery Rate ($R \in \{0, 1\}$)**:
   $$R = \mathbb{I}\left( \arg\max_{m \in \mathcal{M}} P(m \mid \mathcal{D}_B) = m^* \right)$$
2. **Posterior at Truth**:
   $$P^* = P(m^* \mid \mathcal{D}_B) \in [0, 1]$$
3. **Log Loss**:
   $$\mathcal{L} = -\ln \max(P(m^* \mid \mathcal{D}_B), 10^{-12})$$
4. **Out-of-Sample Test RMSE**:
   Evaluated on a held-out test grid of 41 points $\mathcal{X}_{\text{test}} = \{-2.0 + 0.1 \cdot j\}_{j=0}^{40}$:
   $$\mathrm{RMSE}_{\text{test}} = \sqrt{\frac{1}{41} \sum_{x \in \mathcal{X}_{\text{test}}} (y^*(x) - \mu_{\hat{m}}(x))^2}$$

### 5.2 Prespecified Hypotheses and Contrasts
Two primary confirmatory contrasts are prespecified with family-wise error rate control at $\alpha = 0.05$ using Bonferroni correction for two contrasts ($z_{\alpha/4} = 2.241402727604947$):

1. **Primary Contrast 1 (Active IG vs. Random Recovery)**:
   $$\Delta_{R, \text{random}} = \mathbb{E}[R_{\text{active\_ig}}] - \mathbb{E}[R_{\text{random}}]$$
   - H0: $\Delta_{R, \text{random}} \le 0$
   - H1: $\Delta_{R, \text{random}} > 0$
2. **Primary Contrast 2 (Active IG vs. Uniform Grid Recovery)**:
   $$\Delta_{R, \text{uniform}} = \mathbb{E}[R_{\text{active\_ig}}] - \mathbb{E}[R_{\text{uniform\_grid}}]$$
   - H0: $\Delta_{R, \text{uniform}} \le 0$
   - H1: $\Delta_{R, \text{uniform}} > 0$
