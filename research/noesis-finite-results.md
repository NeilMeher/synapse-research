# NOESIS finite discovery and acquisition objectives

`noesis-corrected-discovery-002` · exact confirmatory finite evidence A

The registered coherent binary model evaluated 256 complete potential-observation worlds under the candidate prior and 64 under an out-of-library cubic generator. Six acquisition policies received the same four-observation budget. An independent rational reference reproduced all 384 policy traces and held-out probabilities. No random evaluation sample was needed. [Protocol](noesis-finite-protocol.md) · [Manifest](evidence/noesis-corrected-discovery-002/manifest.json)

| Policy | Family recovery | Mass on true family | Interpolation Brier | Extrapolation Brier | Focal decision loss |
| --- | ---: | ---: | ---: | ---: | ---: |
| Uniform | .68500 | .57185 | .24636 | .16014 | 1.671300 |
| Predictive-mean disagreement | .68600 | .59316 | .24622 | .16012 | 1.670843 |
| Expected family information | .68652 | .59381 | .24622 | .16013 | 1.670842 |
| Expected joint information | .68600 | .59316 | .24622 | .16012 | 1.670843 |
| Expected interpolation risk reduction | .68652 | .59381 | .24622 | .16013 | 1.670842 |
| Expected focal decision value | .68652 | .59351 | .24622 | .16014 | 1.670842 |

The primary decision-value minus family-information loss was **exactly zero**. The correct-family recovery advantage of family information over uniform was 0.152 percentage points. The joint information and disagreement policies happened to give identical aggregate metrics. The small observed gains coexist with changes in posterior concentration. All adaptive procedures scored 12 candidate measurements per path. Uniform used none of those objective evaluations.

Under the cubic generator, family information assigned posterior probability at least .75 to an available family in **35.87%** of worlds, versus **3.49%** under uniform. Neither family is the true generator. Focal loss was 1.76669 for family information and 1.79102 for uniform. Interpolation Brier was .25228 and .25216 respectively. A useful action and a confident family posterior give different evidence about generative model adequacy. The study leaves library expansion and an adequacy-aware stopping rule to a separate design. [Exact metrics](evidence/noesis-corrected-discovery-002/evaluation.json)

## Why the objectives can disagree

For observation channel \(p(y\mid h)\) and prior \(w_h\), \(I(H;Y)=H(H)-\sum_y p(y)H(H\mid y)\). Inserting Bayes's rule gives \(\sum_{h,y}p(h,y)\log_2[p(h,y)/(p(h)p(y))]\). The JavaScript implementation uses the entropy difference. The Python reference uses the joint probability expression. Marginalize amplitudes for family information and retain them for joint information. Predictive Bernoulli variance includes noise and can be large when there is no information about the model.

Three exact channels separately reverse rankings. One bit about an irrelevant variable has zero decision value, while a 75%-accurate truth signal gives .188722 bits and reduces symmetric decision loss by 1/4. A fair coin maximizes marginal predictive variance yet has zero information, while another channel with variance .21 gives .146793 bits. Under an asymmetric acceptance threshold of .8, the symmetric truth signal has Brier value 1/16 and no decision value. A targeted signal has smaller Brier value 1/51 but gives decision value 1/40 by allowing a positive signal to cross the threshold.

Flipping a 75%-accurate binary signal with independent probability 1/5 yields a 65%-accurate signal. The original channel can implement decisions based on the garbling, so it has at least as much value for every fixed decision problem. The nuisance and truth channels instead have equal rows that the other distinguishes, in both directions. Neither channel is a garbling of the other. These checks apply established Bayesian experimental design and Blackwell comparison to explicit acquisition criteria. Human review remains pending. [Exact fixtures](evidence/noesis-corrected-discovery-002/acquisition-fixtures.json) · [Lindley, 1956](https://doi.org/10.1214/aoms/1177728069) · [Blackwell, 1953](https://doi.org/10.1214/aoms/1177729032)
