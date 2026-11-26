# MORPHEUS Learning Guide

1. **Bitemporal memory (`eventTime` vs `ingestionTime`):** `eventTime` records when a fact or preference actually changed in the environment; `ingestionTime` records when the agent's store received the record. Late-arriving false memories have high `ingestionTime` but stale `eventTime`.
2. **Source monitoring & provenance:** Every record carries `sourceId`, `evidenceClass`, `confidence`, `chainDepth`, and `verified` status.
3. **Preference stability vs adaptation:** A sound memory system must preserve persistent goals (`safety_floor`) and unchanged preferences while updating when a legitimate `verified_correction` changes `reserve_target`.
4. **Independent check:** Run `python scripts/reference_morpheus.py` to verify that `groundTruthAt(visible, step, topic, kind)` matches every archived query without future leakage.
