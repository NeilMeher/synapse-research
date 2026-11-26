# Learn and defend ECHO

Start with binary random variables, conditional probability and weighted averages. Walk through three people who each receive a 68% accurate signal. If they receive independent signals, majority accuracy is $q^3+3q^2(1-q)=0.758336$. With one shared report, it is $q=0.68$. Show which terms are omitted if duplicated reports are incorrectly counted as independent.

At intermediate level derive the two-source covariance from the law of total covariance. Conditional on source regime, the independent arm has covariance zero and the common arm has covariance $q(1-q)$. Both have the same marginal mean, eliminating the between-regime covariance term. The requested correlation is therefore a probability of a shared regime in this particular model.

Trace `drawTask` → `evidence` → `initialBeliefs` → `step` → `scoreTask` in engine/echo.mjs. Write out the complete network's 3-by-3 matrix, multiply an opinion vector by it, and check all three entries are the initial mean. In `terminalWeights`, derive the equivalent backward influence vector by moving the final mean's row vector across the matrix product.

## Checks to do independently

1. Run the exact reference and match its rho=0 and rho=1 majority endpoints to the manuscript. The difference is the full collapse from an independent crowd to a shared source.
2. Run the website's browser example and use Next to compare the hub and complete decisions. In archived task 1, inspect the messages before interpreting agreement as evidence.
3. Derive stationary hub influence as $s/(s+1-h)$. If this is greater than one half and all beliefs began at $q$ or $1-q$, explain whose signal determines the decision at convergence. Try a lower hub weight in the browser.
4. Change the confidence radius across $2q-1$. Explain why neighbours cannot influence cross-signal beliefs below that threshold in the binary setting.
5. Inspect the code and derive the Bayes posterior for all identical reports at full correlation. Explain how verification changes the number of independent sources even though the number of reports is fixed.

## Technical defence

The question distinguishes consensus, correct decisions and confidence. The selected model isolates them with analytically checkable uncertainty. Its controls reuse underlying random draws and keep replacement reliability fixed. Strong answers must discuss why pairwise correlation alone fails to specify a joint law, why the hub result depends on policy weights, and why synthetic verification is not human fact-checking. An extension would compare the current mixture with a beta-binomial generator calibrated to the same pairwise correlation.
