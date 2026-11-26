# ALPHA DECAY Confirmatory Protocol (`alpha-decay-confirmatory-001`)

## 1. Hypotheses
- **Primary H1 (Impactful market, `impact = 4`):** Increasing adoption of `fundamental_value` from 1 to 9 agents (with matched total market capital and matched fundamental paths) reduces strategy alpha relative to the non-adopter benchmark due to endogenous price impact and execution slippage.
- **Primary H2 (Zero-impact control, `impact = 0`):** Without price impact, increasing adoption from 1 to 9 agents does not produce the same impact-driven alpha decay.
- **Null hypotheses:** Expected paired difference $\ge 0$ for H1.

## 2. Experimental Design
- **Experimental unit:** One independent 8-round synthetic market episode ($N = 300$ paired episodes).
- **Seed:** `2026112712`.
- **Benchmark:** Non-adopter trader portfolio return within the same episode (`alpha = netReturn_adopters - netReturn_nonAdopters`).
- **Statistical method:** Paired episode differences with Bonferroni-adjusted 95% normal intervals ($z = 2.241402727604947$).
- **Limitations:** Synthetic maker-taker market without historical empirical equities data; zero-variance Sharpe ratios are reported as `null`.
