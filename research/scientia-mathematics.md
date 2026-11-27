# SCIENTIA: Mathematical Specification

## 1. Hypothesis Space and Generative Model

In each synthetic investigation, $M = 20$ candidate scientific hypotheses $H_1, \dots, H_M$ are examined.
Each hypothesis $H_j$ has an underlying true status:
$$T_j \in \{0, 1\}$$
where $T_j = 0$ indicates a true null ($H_{0,j}: \mu_j = 0$) and $T_j = 1$ indicates a true non-null effect ($H_{1,j}: \mu_j = \delta > 0$).

The proportion of true nulls is fixed at $\pi_0 = 0.80$ ($M_0 = 16$ true nulls, $M_1 = 4$ true signals).
The non-null effect size is set to $\delta = 2.50$, representing a true moderate-to-large effect.

For each hypothesis $j \in \{1, \dots, M\}$, the test statistic $Z_j$ is drawn from a Gaussian distribution:
$$Z_j \sim \mathcal{N}(\mu_j, 1), \quad \mu_j = \begin{cases} 0 & \text{if } T_j = 0 \\ \delta & \text{if } T_j = 1 \end{cases}$$

Two-tailed p-values are computed analytically:
$$p_j = 2 \left( 1 - \Phi(|Z_j|) \right)$$
where $\Phi(z) = \frac{1}{2} \left[ 1 + \mathrm{erf}\left( \frac{z}{\sqrt{2}} \right) \right]$.

## 2. Research Governance Architectures (Arms)

### 2.1 Naive Exploratory (`naive_exploratory`)
The researcher tests all $M$ hypotheses without multiplicity adjustment:
$$\mathcal{R}_{\text{naive}} = \{ j \in \{1, \dots, M\} : p_j < 0.05 \}$$

### 2.2 Preregistered Confirmatory (`preregistered_primary`)
Prior to observing data, a single hypothesis $j^* = 1$ is prespecified as the primary outcome:
$$\mathcal{R}_{\text{prereg}} = \begin{cases} \{ 1 \} & \text{if } p_1 < 0.05 \\ \emptyset & \text{otherwise} \end{cases}$$

### 2.3 Bonferroni FWER Control (`bonferroni_fwer`)
Controls the family-wise error rate at $\alpha = 0.05$:
$$\mathcal{R}_{\text{bonf}} = \{ j \in \{1, \dots, M\} : p_j < 0.05 / M \}$$

### 2.4 Benjamini-Hochberg FDR Control (`benjamini_hochberg_fdr`)
Controls the false discovery rate at nominal level $q = 0.10$:
1. Order p-values: $p_{(1)} \le p_{(2)} \le \dots \le p_{(M)}$.
2. Find $k^* = \max \left\{ k : p_{(k)} \le \frac{k}{M} q \right\}$ (or $0$ if set is empty).
3. If $k^* > 0$, reject all $j$ such that $p_j \le p_{(k^*)}$.

### 2.5 Split-Sample Holdout (`split_sample_holdout`)
1. Draw two independent datasets: discovery sample $Z_{j,\text{disc}} \sim \mathcal{N}(\mu_j, 1)$ and holdout sample $Z_{j,\text{hold}} \sim \mathcal{N}(\mu_j, 1)$.
2. Screen for the best candidate in discovery: $j^* = \arg\min_j p_{j,\text{disc}}$.
3. If $p_{j^*,\text{disc}} < 0.05$, test $j^*$ in holdout:
   $$\mathcal{R}_{\text{split}} = \begin{cases} \{ j^* \} & \text{if } p_{j^*,\text{hold}} < 0.05 \\ \emptyset & \text{otherwise} \end{cases}$$

## 3. Metrics and Primary Contrasts

### 3.1 Per-Trial Outcome Measures
For rejection set $\mathcal{R}$:
- Total rejections: $R = |\mathcal{R}|$
- False discoveries: $V = |\{ j \in \mathcal{R} : T_j = 0 \}|$
- True discoveries: $S = |\{ j \in \mathcal{R} : T_j = 1 \}|$
- **False Discovery Proportion (FDP)**:
  $$\mathrm{FDP} = \begin{cases} V / R & \text{if } R > 0 \\ 0 & \text{if } R = 0 \end{cases}$$
- **Statistical Power (True Positive Rate)**:
  $$\mathrm{Power} = S / M_1$$
- **Family-Wise Error (FWER indicator)**:
  $$\mathrm{FWE} = \mathbb{I}(V \ge 1)$$

### 3.2 Prespecified Primary Contrasts
Two primary confirmatory contrasts are prespecified with family-wise error rate control at $\alpha = 0.05$ using Bonferroni correction for two contrasts ($z_{\alpha/4} = 2.241402727604947$):

1. **Primary Contrast 1 (Naive vs Preregistered FDP)**:
   $$\Delta_{\text{FDP}, 1} = \mathbb{E}[\mathrm{FDP}_{\text{naive}}] - \mathbb{E}[\mathrm{FDP}_{\text{prereg}}]$$
   - H0: $\Delta_{\text{FDP}, 1} \le 0$
   - H1: $\Delta_{\text{FDP}, 1} > 0$
2. **Primary Contrast 2 (Naive vs Benjamini-Hochberg FDP)**:
   $$\Delta_{\text{FDP}, 2} = \mathbb{E}[\mathrm{FDP}_{\text{naive}}] - \mathbb{E}[\mathrm{FDP}_{\text{bh}}]$$
   - H0: $\Delta_{\text{FDP}, 2} \le 0$
   - H1: $\Delta_{\text{FDP}, 2} > 0$
