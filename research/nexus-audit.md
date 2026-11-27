# NEXUS internal audit

| Severity | Evidence and consequence | Resolution or limit |
| --- | --- | --- |
| High | Mixing nominal values, different periods or currency conversions gives an invalid final-demand shock. | Require the 2024 ADB detailed model and the stipulated scenario USD denomination. Convert scenario dollars to million-dollar shock units exactly once. Treat them as hypothetical net producer values. |
| High | An accelerator shipment is not domestic sector output. | Accelerator imports are a dedicated 100% direct-import item. Industry and domestic share are rejected if altered. Separately track imported intermediates resulting from domestic production. |
| High | Adding utility costs, periodic replacement or funding reserves as final demand would conflate outlays and balances or duplicate changes already represented in sector production. | Match the disjoint construction capital bill. Operating, funding and reserve flows stay in their finance ledger. |
| Medium | Mapping electrical and network hardware to one broad ADB sector hides product heterogeneity. | Show the rationale, native sector names, named exclusions and lower/higher shares. Advanced concordance needs purchase- or product-level data and appropriate price bridges. |
| Medium | Simultaneously changing energy and water efficiency does not identify their separate effects or engineering feasibility. | Treat the joint change as a design assumption while fixing capex and billing. Verify matched invariants in both directions. |
| Medium | National linear multipliers do not identify regional labour, prices, substitution, welfare or actual policy effects. | Preserve the conditional status of all outputs. External human review is pending. |
