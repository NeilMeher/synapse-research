# NOESIS: Literature Review on Artificial Scientific Discovery

## 1. Executive Summary

Scientific discovery has historically proceeded through an interplay between theoretical conjecture, controlled experimentation, and empirical falsification (Popper, 1959; Kuhn, 1962). In the automated discovery literature, algorithms must select both candidate functional hypotheses and optimal subsequent observations. This review surveys foundational and contemporary work across symbolic regression, Bayesian experimental design, active learning, and automated scientific discovery engines, establishing the theoretical grounding for the SYNAPSE NOESIS laboratory.

## 2. Symbolic Regression and Mathematical Law Discovery

### 2.1 Sparse Identification of Nonlinear Dynamics (SINDy)
Brunton, Proctor, and Kutz (2016) demonstrated that governing equations can be extracted from observational time-series data using sparse regression over a candidate feature dictionary:
$$\dot{\mathbf{x}} = \mathbf{\Theta}(\mathbf{x}) \boldsymbol{\Xi}$$
where $\mathbf{\Theta}(\mathbf{x})$ comprises polynomial, trigonometric, and transcendental functions, and $\boldsymbol{\Xi}$ is sparse. SINDy framed discovery as an $\ell_0$ or sequentially thresholded least squares optimization. However, standard SINDy assumes a passive observational stream and lacks active querying mechanisms.

### 2.2 Genetic Programming and Pareto Frontiers
Schmidt and Lipson (2009) pioneered automated discovery of natural laws from experimental data using genetic programming (Eureqa). By balancing predictive accuracy against symbolic complexity (the Pareto frontier), Eureqa recovered conservation laws, Hamiltonians, and double pendulums without prior knowledge of physics. Udrescu and Tegmark (2020) extended this with AI Feynman, combining dimensional analysis, symmetry detection, and neural modularity decomposition.

### 2.3 Exact Bayesian Model Comparison
MacKay (1992) established the foundational Bayesian framework for model selection and Occam's razor. For competing model families $\mathcal{M} = \{m_1, \dots, m_K\}$, the evidence or marginal likelihood:
$$P(\mathcal{D} \mid m) = \int P(\mathcal{D} \mid \boldsymbol{\theta}_m, m) P(\boldsymbol{\theta}_m \mid m) d\boldsymbol{\theta}_m$$
automatically penalizes parameter volume and model complexity without ad-hoc regularization constants. In linear-in-parameter feature dictionaries with Gaussian priors and noise, $P(\mathcal{D} \mid m)$ possesses an exact analytical form (Bishop, 2006).

## 3. Bayesian Optimal Experimental Design (BOED)

### 3.1 Lindley's Information Gain Formulation
Lindley (1956) defined the optimal experiment as that which maximizes the expected Kullback-Leibler (KL) divergence between the prior and posterior distribution of parameters or hypotheses:
$$x^* = \arg\max_{x \in \mathcal{X}} \mathbb{E}_{y \sim p(y \mid x, \mathcal{D})} \left[ D_{\mathrm{KL}}(p(\boldsymbol{\theta} \mid \mathcal{D} \cup \{(x, y)\}) \parallel p(\boldsymbol{\theta} \mid \mathcal{D})) \right]$$
This quantity equals the mutual information $I(\boldsymbol{\theta}; y \mid x, \mathcal{D})$.

### 3.2 Model Discrimination and Crucial Experiments
When the primary objective is discriminating between discrete competing theories rather than parameter refinement within a known theory, Box and Hill (1967) introduced entropy-based model discrimination. In modern active learning, this corresponds to Query-by-Committee (Seung et al., 1992) and Bayesian Model Disagreement (Houlsby et al., 2011; Kirsch et al., 2019):
$$\Delta(x) = \sum_{m=1}^K P(m \mid \mathcal{D}) \left( \mathbb{E}[y \mid x, m] - \bar{y}(x) \right)^2$$
Maximizing $\Delta(x)$ selects the query where candidate functional families make the most divergent predictions—the formalization of Francis Bacon's and Robert Boyle's *experimentum crucis*.

## 4. Synthesis for the NOESIS Laboratory

NOESIS formalizes the automated scientist problem in a controlled, fully auditable computational environment:
1. Nature instantiates a hidden physical law drawn from one of four canonical scientific functional families (Polynomial, Harmonic, Exponential Decay, and Rational/Sigmoidal).
2. The agent is provided a constrained measurement budget $B$.
3. We contrast four experimental inquiry regimes:
   - **Passive Random**: Queries drawn i.i.d. uniformly from the input domain.
   - **Uniform Grid**: Queries spaced deterministically across the domain.
   - **Active Uncertainty**: Queries targeted at the maximum predictive variance of the current leading model.
   - **Active Information Gain (Model Disagreement)**: Queries placed at points of maximal theoretical discordance among candidate models.
4. By maintaining exact conjugate Bayesian linear updates, NOESIS avoids optimization divergences and stochastic sampling noise, enabling clean, reproducible inference of automated discovery dynamics.

## 5. References

- Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer.
- Box, G. E., & Hill, W. J. (1967). Discrimination among mechanistic models. *Technometrics*, 9(1), 57–71.
- Brunton, S. L., Proctor, J. L., & Kutz, J. N. (2016). Discovering governing equations from data by sparse identification of nonlinear dynamical systems. *PNAS*, 113(15), 3932–3937.
- Houlsby, N., et al. (2011). Bayesian active learning for classification and preference learning. *arXiv:1112.5745*.
- Kuhn, T. S. (1962). *The Structure of Scientific Revolutions*. University of Chicago Press.
- Lindley, D. V. (1956). On a measure of the information provided by an experiment. *Annals of Mathematical Statistics*, 27(4), 986–1005.
- MacKay, D. J. (1992). Bayesian interpolation. *Neural Computation*, 4(3), 415–447.
- Popper, K. (1959). *The Logic of Scientific Discovery*. Hutchinson & Co.
- Schmidt, M., & Lipson, H. (2009). Distilling free-form natural laws from experimental data. *Science*, 324(5923), 81–85.
- Seung, H. S., Opper, M., & Sompolinsky, H. (1992). Query by committee. *Proceedings of the 5th Annual ACM Workshop on Computational Learning Theory*, 287–294.
- Udrescu, S. M., & Tegmark, M. (2020). AI Feynman: A physics-inspired method for symbolic regression. *Science Advances*, 6(16), eaay2631.
