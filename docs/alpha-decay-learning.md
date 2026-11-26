# ALPHA DECAY Learning Guide

1. **Alpha vs raw return:** Raw positive returns can reflect market drift or benchmark exposure. ALPHA DECAY defines alpha as the adopter portfolio's net return minus the non-adopter benchmark return within the exact same episode.
2. **Endogenous price impact:** Each filled unit in `engine/market.mjs` shifts the maker's midpoint by `impact * (initialInventory - maker.assets)`. Crowded buys push the ask toward the fundamental, compressing subsequent buyers' edge.
3. **Headcount vs capital concentration:** `impact4-concentrated-3` gives 3 traders 75% of trader capital and larger order lots, reproducing crowding decay even with only 3 adopters.
4. **Independent check:** Run `python scripts/reference_alpha_decay.py` to replay all 1,223 confirmatory fills and verify exact cash, asset, and fee conservation.
