# MORPHEUS Confirmatory Protocol (`morpheus-confirmatory-001`)

## 1. Hypotheses
- **Primary H1 (Corrupted regime):** Under controlled false-memory, source-spoofing, and stale-timestamp injections, `provenance` retrieval achieves higher decision accuracy than `keyword` retrieval at matched retrieval budget $K=4$.
- **Primary H2 (Clean regime):** Under clean histories without corruption, `provenance` retrieval does not degrade decision accuracy relative to `keyword` retrieval.
- **Null hypotheses:** Expected paired difference $\le 0$ for H1; material degradation $< -0.02$ for H2.

## 2. Experimental Design
- **Experimental unit:** One independent 16-step synthetic agent history ($N = 400$ paired histories).
- **Seed:** `2026112702`.
- **Retrieval budget:** $K = 4$ records per query.
- **Statistical method:** Paired episode differences with Bonferroni-adjusted 95% normal intervals ($z = 2.241402727604947$ for 2 primary contrasts).
- **Ablations:** `no_provenance`, `no_temporal`, `no_revision`, `no_confidence`.
- **Stopping rule / failure criteria:** Single-threaded execution under 30 s budget; fail if chronology or future-leakage checks fail.
- **Limitations:** Synthetic deterministic histories; does not model human clinical memory disorders or LLM token-level ambiguity.
