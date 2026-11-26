# REFLEX · Auditability and price impact in a synthetic market

## Research design

An inventory-sensitive maker trades one asset against nine agents using fundamental, momentum, contrarian and noise rules. Execution is deterministic conditional on an integer order tape. Each order consumes successive one-unit quotes until crossing the limit, cash or inventory boundary. Its remainder expires. One cash tick per execution is credited to a fee account. The initial price is 10,000 ticks. Fundamental value varies across rounds by ±120 ticks. Agent policy receives contemporaneous noisy directions and quotes. The outcome uses the hidden fundamental for scoring. [Frozen protocol](../research/reflex-confirmatory.md)

The 40-episode pilot informed a 400-episode confirmatory comparison at one versus four ticks of impact, with matched fundamental and underlying signal draws, initial inventories and cash. Each episode spans six rounds. The primary error measure is mean absolute round-end midpoint deviation from the fundamental. Its interval treats the episode as the unit.

## Results

Higher impact reduced simulated absolute pricing error from 117.86 to 111.42 ticks. The paired difference was −6.43 ticks, with a 95% interval of −7.32 to −5.54. Mean root-mean-square midpoint return rose from 0.0470% to 0.1879%. Volume was similar at 104.99 and 105.04 units per episode. The independent Python checker replayed 103 and 104 fills from the first archived episodes under both policies and reconciled balances and fees.

Cash and asset units are conserved by execution. Their combined marked wealth changes with the selected midpoint. Faster inventory-sensitive quote movement can improve price tracking under these synthetic information and trading rules while increasing return magnitudes. This small experiment does not identify real market effects. Its mechanism lacks standing customer inventory priority, distress, cancellation queues, leverage and empirical calibration.

## Reproduction and ownership

Run `node scripts/reflex.mjs verify` and `python scripts/reference_reflex.py`. [Results and replay](../results/reflex-confirmatory.json) · [Manifest](../results/reflex-confirmatory.manifest.json) · [Learning guide](../docs/reflex-learning.md)

The design direction came from the SYNAPSE Phase II brief. Implementation, reference and analysis were AI-assisted. Independent human review remains pending.
