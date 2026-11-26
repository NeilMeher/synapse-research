# ECHO 2.0 literature and originality

| Primary research | Relevance and scope of this implementation |
|---|---|
| [Skellam, 1948, pp. 257–261](https://doi.org/10.1111/j.2517-6161.1948.tb00014.x) | Derives the binomial model with varying success probability between groups. ECHO uses the beta-binomial at matched first and second moments as a concrete comparator. |
| [Ladha, 1992, pp. 617–634](https://doi.org/10.2307/2111584) | Extends correlated jury voting theory. The effect of dependence on majority voting is established. |
| [Kaniovski, Aggregation of correlated votes](https://serguei.kaniovski.wifo.ac.at/fileadmin/pdf/condorcet.pdf) | Directly considers the nonidentifiability of joint probabilities from competence and pairwise correlation. This is a close precedent for the main question. |
| [Zaigraev and Kaniovski, 2010](https://www.sciencedirect.com/science/article/abs/pii/S0167715210000714) and [author manuscript, §§1–2](https://serguei.kaniovski.wifo.ac.at/fileadmin/pdf/kn_reliability.pdf) | Compute exact tail bounds for exchangeable Bernoulli variables by linear programming. Bounding majority from correlation is prior work. ECHO enumerates support vertices and publishes attaining examples. |
| [Prékopa, 1990, pp. 227–239](https://pubsonline.informs.org/doi/10.1287/opre.38.2.227) | Sharp probability bounds with known binomial moments. Helps interpret the support solver as a discrete moment LP. |
| [Golub and Jackson, 2010, §3](https://pubs.aeaweb.org/doi/10.1257/mic.2.1.112) and [Tian, Wang and Bullo, 2023](https://epubs.siam.org/doi/10.1137/22M1492751) | Weighted averaging and influence conditions. ECHO uses a finite symmetric hub and reports its effective weight. |
| [Kao and Couzin, 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4043084/) and [Kao and Couzin, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6553586/) | Cue correlation and structured information already influence accuracy in numerical and mathematical studies. ECHO holds both the individual marginal and every pairwise correlation fixed in its main experiment. |

The contribution is a reproducible teaching and benchmarking combination: matched-moment laws, sharp support witnesses, explicit model-misspecification scores, and inspection of the resulting group outcomes. It claims no theorem priority, no external replication, and no empirical finding about human or LLM ensembles. The next empirical literature pass should test portability to independently measured ensemble error structures.
