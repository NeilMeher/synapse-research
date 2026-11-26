# MORPHEUS Mathematical Formulation

## 1. Bitemporal Memory Record
Each record $r$ is a tuple:
$$r = (\text{id}, a, t_e, t_i, s, (k, \tau, v), c, p, \pi, \text{sup}, \text{con}, [v_0, v_1])$$
where $t_e \in \mathbb{Z}_{\ge 0}$ is `eventTime`, $t_i \in \mathbb{Z}_{\ge 0}$ is `ingestionTime`, $s$ is `sourceId`, $(k, \tau, v)$ is `(topic, kind, value)`, $c$ is `evidenceClass`, $p \in [0, 1]$ is `confidence`, $\pi = (\text{origin}, d, \text{verified})$ is `provenance`, and $\text{sup}, \text{con}$ are revision and contradiction pointers.

## 2. Ground Truth Evaluator
For query $(k, \tau)$ at step $t$, ground truth $y_t(k, \tau)$ is the value $v$ of the non-corrupted event with maximum $t_e \le t$ and $t \in [v_0, v_1]$. Future events ($t_e > t$) are strictly excluded.

## 3. Provenance Trust Score
$$S_{\text{trust}}(r) = 0.45\, w_c(c) + 0.25\, w_s(s) + 0.30\, p + 0.18\,\mathbb{I}[\text{verified}] - \min(0.25, 0.08\, d) + 0.002\, t_e$$
Ablations toggle $w_c, w_s, \text{verified}, d$ (`no_provenance`), replace $t_e$ with $t_i$ (`no_temporal`), disable `supersedes` filtering (`no_revision`), or fix $p = 0.5$ (`no_confidence`).

## 4. Evaluation Metrics
- **Decision accuracy:** $\frac{1}{T}\sum_{t=0}^{T-1} \mathbb{I}[\hat{y}_t = y_t]$.
- **Preference stability vs adaptation:** Accuracy on `preference` queries for $t < \lfloor T/2 \rfloor$ (persistent) vs $t \ge \lfloor T/2 \rfloor$ (legitimately updated).
- **Goal preservation:** Accuracy on `goal` queries.
- **Recovery after corruption:** Decision accuracy for steps $t \ge t_{\text{corrupt}}$.
- **Contradiction detection:** Fraction of contradictory query states flagged.
- **Confidence calibration:** Brier score $\frac{1}{T}\sum_{t=0}^{T-1} (\hat{p}_t - \mathbb{I}[\hat{y}_t = y_t])^2$.
