# MORPHEUS Literature Review and Novelty Comparison

## Primary Sources

1. **Episodic, semantic, and working memory:** Tulving, E. (1972). *Episodic and semantic memory*, in *Organization of Memory* (Academic Press). Baddeley, A. (2000). *The episodic buffer: a new component of working memory?* Trends in Cognitive Sciences, 4(11), 417–423.
2. **Source monitoring:** Johnson, M. K., Hashtroudi, S., & Lindsay, D. S. (1993). *Source monitoring*. Psychological Bulletin, 114(1), 3–28. (Establishes why attribution of origin is distinct from content recall; MORPHEUS models artificial provenance metadata and does *not* claim equivalence to human neurological memory disorders.)
3. **Belief revision:** Alchourrón, C. E., Gärdenfors, P., & Makinson, D. (1985). *On the logic of theory change: Partial meet contraction and revision functions*. Journal of Symbolic Logic, 50(2), 510–530.
4. **Event sourcing and bitemporal data:** Snodgrass, R. T. (1999). *Developing Time-Oriented Database Applications in SQL* (Morgan Kaufmann) — distinguishes valid/event time (`eventTime`) from transaction/ingestion time (`ingestionTime`).
5. **Retrieval-augmented and memory-augmented agents:** Lewis, P., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* (NeurIPS); Park, J. S., et al. (2023). *Generative Agents: Interactive Simulacra of Human Behavior* (UIST); Packer, C., et al. (2023). *MemGPT: Towards LLMs as Operating Systems*.

## Novelty Comparison Matrix

| System / Work | Bitemporal (`eventTime` vs `ingestionTime`) | Explicit Source Provenance & Spoofing | Revision / Contradiction Graph | Matched-History Clean vs Corrupted Ablations |
|---|---|---|---|---|
| Standard RAG (Lewis et al. 2020) | No | No | No | No |
| Generative Agents (Park et al. 2023) | Partial (recency) | No | No | No |
| Bitemporal Event Sourcing (Snodgrass 1999) | Yes | Partial | Yes | No |
| **MORPHEUS (SYNAPSE)** | **Yes** | **Yes** | **Yes** | **Yes (deterministic, zero-API)** |
