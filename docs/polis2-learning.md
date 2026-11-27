# POLIS 2.0 learning guide

Let p be probability of delivery, one needed unit worth 3, and one surplus unit worth s. Under prepayment the payer always incurs s and only receives value 3 with probability p. It accepts strictly when p>s/3. Its supplier receives value 3 and gives up s with probability p. Total expected gain is (3−s)(1+p). With payment on delivery both gains are p(3−s).

**Exercise.** At p=0.6 and s=2, compare both expected payoffs for each contract. What physically moves after a failed delivery?

**Solution.** Prepayment yields payer 1.8−2=−0.2 and supplier 3−1.2=1.8, with one physical unit transferred on failure. Payment on delivery yields +0.6 to each in expectation, with neither leg executed on failure. At s=3 the payment-on-delivery payoff ties at every p. A shared fair tie rule gives the same choice in both objective arms.

[Interactive calculator](../polis2.html#contracts) · [Registered design](../research/polis2-confirmatory.md)
