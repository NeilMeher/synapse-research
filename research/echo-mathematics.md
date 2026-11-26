# ECHO mathematical model

Let the truth be $Y\sim\mathrm{Bernoulli}(1/2)$ and set signal reliability to $q$. For each task, draw a mixture indicator $Z\sim\mathrm{Bernoulli}(\rho)$. If $Z=1$, all original agents use a single correctness bit $C\sim\mathrm{Bernoulli}(q)$. Otherwise each uses an independent correctness bit $C_i\sim\mathrm{Bernoulli}(q)$. A correct agent receives $Y$ and an incorrect agent receives $1-Y$. Thus $\operatorname{Cov}(C_i,C_j)=\rho q(1-q)$ and the pairwise correctness and error correlations both equal $\rho$. This joint model puts extra mass on unanimous error. Other joint laws with identical pairwise correlation can behave differently.

Each reported bit sets binary belief $x_i(0)$ to $q$ for a one and $1-q$ for a zero. DeGroot updates with $x(t+1)=Wx(t)$, synchronous and row-stochastic. Complete and ring matrices are doubly stochastic, so the unweighted group mean is preserved. The complete network achieves consensus in one step. The ring converges by connectivity and positive self-weights. With hub self-weight $h$ and leaf weight $s=0.5$ on the hub, its stationary influence mass is $s/(s+1-h)$. The default $h=0.75$ implies mass $2/3$. In any network, a group decision thresholds the unweighted mean at $1/2$. Uniform random ties use a task-level draw shared by all paired conditions. Even complete consensus can agree with the wrong truth.

Bounded confidence keeps row weights whose source and receiver beliefs differ by no more than radius $r$, then renormalizes per round. This is a weighted graph variant. Every configured network includes self-weight. For binary inputs at $q=.68$ and radius $.2$, the original belief gap $.36$ blocks cross-belief exchange, so the bounded ring remains fixed. This policy is a useful negative control.

For one observed original bit vector of size $m$ with $k$ bits agreeing with a candidate truth, its likelihood is

$$
L_m(k)=(1-\rho)q^k(1-q)^{m-k}+\rho\left[q\mathbf{1}_{k=m}+(1-q)\mathbf{1}_{k=0}\right].
$$

The shared term is 1 when $m=0$. Multiply this likelihood by the independent likelihood of the fresh signals where used. The posterior for truth one is its likelihood divided by the sum of both likelihoods. The naive baseline sets $\rho=0$ when constructing the posterior. Source-aware policies know the mixture law and which slots were replaced. They do not observe the realized mixture indicator. Majority exact accuracy is $(1-\rho)A_{\rm independent}+\rho q$, where $A_{\rm independent}$ is the binomial upper tail plus half the tie mass.

The unit is one task. Brier loss is $(p-Y)^2$. For the individual condition both accuracy and Brier are within-task averages. Linear-pool, voting-share and Bayesian probabilities have distinct semantics. An uncertainty interval estimates Monte Carlo error about this specific generator. It does not represent real-world model validity or empirical uncertainty.
