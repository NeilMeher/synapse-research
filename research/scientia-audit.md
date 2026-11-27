# SCIENTIA implementation and numerical audit

## Statistical model

For hypothesis j with planted mean μⱼ and even total sample size n, each disjoint block has zⱼ = √(n/2)μⱼ + √ρ G + √(1−ρ)εⱼ. One common G is shared within a block and all factors are independently standard normal across blocks and programmes. The full z is the sum of block z values divided by √2. The two-sided p-value is 2Φ(−|z|). The n/2 and n estimators are z/√(n/2) and z/√n. Truth is consumed only by the scoring stage. Under independent all-null outcomes, the probability of avoiding every nominal false report is (1−α)^m, so unadjusted FWER is its complement. The equicorrelated two-sided study is a sensitivity condition. BH is interpreted under independence here.

If V false and T true claims are made, FWER is the programme mean of 1[V>0], FDP is V/(V+T) with empty families set to zero, and FDR is its programme mean. Type I is V divided by the number of true nulls. Power is T divided by the number of nonnulls, and type II is its complement. Replication is the mean of the fraction of screened hypotheses confirmed among programmes with screens. Reported mean error and 95% Gaussian confidence coverage condition on at least one claim. The halves and methods share the same total observation budget. Runtime and observed process RSS are recorded by the manifest and depend on the machine and measurement method.

## Independent reference and recorded deviation

Node reproduced both archive byte hashes, and the independent Python reference reconstructed all decisions, summaries and the first replay in each design using the archived normal tail approximation. It independently generated all block draws, sorted and adjusted p-values and scored decisions. Analytic controls covered unadjusted family risk, fixed primary, Holm all-null risk, split validation and replication.

The frozen protocol specified reconstruction with Python erfc. Exact-tail sensitivity found one BH decision in the 5,000 independent mixed n = 32 programmes near its threshold. The approximate tail changed the mean paired FDR contrast by 0.0001, or 0.01 percentage point. The unrounded estimates are 0.153223254 for the archive and 0.153123254 with erfc. Across the other seven pilot and confirmatory cells, method decisions agreed. Full bitwise agreement with the exact-tail criterion failed. The discrepancy, its size and unchanged inference are recorded here, with the archive intact. The benchmark uses approximate p-values and has computational verification with this qualification. Use a higher-accuracy tail before a new study that depends on numerical equality at decision boundaries.

The confirmatory run took 2.448 seconds and observed 53,923,840 bytes process RSS on its archived Node environment. No independent human review has been recorded. The recovered mathematical draft describes the initial proposal. The frozen protocol and this audit describe what ran.

[Protocol](./scientia-confirmatory.md) · [Results](../data/scientia-confirmatory.json) · [Manifest](../data/scientia-confirmatory.manifest.json)
