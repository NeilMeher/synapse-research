# GAME OF CIVILIZATIONS confirmatory protocol

## Primary estimand and analysis

Does access to a pooled delivery reputation improve need satisfaction versus a fixed prior under supply stress? The paired estimand takes the mean across independent worlds of pooled minus unaware total consumption divided by total need. The primary scarcity regime has one labor hour with probability 0.50. The null difference is zero. Use a two-sided paired normal 95% Monte Carlo interval with the independent trajectory as the unit. The moderate regime and all other policy and distribution outcomes are descriptive. Negative outcomes will be reported.

The frozen [pilot design](civilizations-pilot.md) remains unchanged in the generator and treatments. The pilot used 60 worlds per regime, required 539 ms and observed process RSS of 64,200,704 bytes. Its paired SD under stress was 0.01888, projecting a half-width of about 0.185 percentage points at 400 worlds. Use two regimes of 400 worlds under independent master seed 2800169297, frozen before execution. The unit is a complete world trajectory. Four policies receive matched initial stocks, supplier types, production technologies, local encounters, role assignments, fixed horizon, labor shocks and latent delivery and decision draws.

## Controls and stopping

Every world uses eight agents and 24 days. The [pilot protocol](civilizations-pilot.md) specifies timing, information, production, barter, consumption, storage and distributional outcomes. The local and pooled policies change access to observed delivery histories, while keeping the same prescribed prior and decision rule. Autarky disables offers. Compare actual trade attempts and realized deliveries separately. Gini measures combined inventory units and consumed units with equal resource weighting. The consumption welfare proxy averages over all eight agents. Retain minimum individual consumption and shock-specific fulfillment as descriptive distributional diagnostics.

Stop at the registered counts without interim looks. A broken resource identity, exposure of seller reliability or latent draws to the chooser, reference disagreement, or runtime beyond the runner's fixed 30-second budget fails the run gate. Archive the shared world and replay of the first trial in each regime, plus all world-level aggregate metrics. The independent Python implementation recomputes integer flows and conditional gains using rational arithmetic.
