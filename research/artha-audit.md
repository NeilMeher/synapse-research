# ARTHA internal audit

| Severity | Evidence and consequence | Disposition |
| --- | --- | --- |
| High | Gross transaction blocks include domestic production and imported inputs. Adding both into A would create domestic output for imported goods. | The domestic matrix supplies A. Imported rows only generate satellite coefficients. Raw import totals are checked against the workbook. |
| High | Dividing by supplier output instead of purchaser output changes economic meaning. | Orientation is source row supplier and column purchaser. Directional fixtures and an independent production-round series validate the interpretation. |
| High | Domestic c35 output is zero. A direct divide would be undefined. | The extraction requires a zero domestic row, column and relevant balances, then excludes c35. Imported c35 is retained in the input sums. |
| High | Basic-price value added and gross output measure different things. | The website and archive present separate measures. No employment or GDP impact claim is produced. |
| Medium | Input-output tables are harmonized estimates. The reference periods use current prices and grouping can alter sector composition. | Show all four models and treat differences as deterministic sensitivity. |
| Medium | The frozen independent checker compared floating-point demand to integer 100 using exact equality. The construction demand serialized as 99.99999999999999 in both 2024 models. | The runtime archive and all frozen inputs are retained. The validation entry point uses a defined floating-point tolerance before independently summing each round and verifying the table balances. |
| Medium | The older publisher series lists CC BY 3.0 IGO and directs readers to KIDB for revisions. A separate workbook-specific license statement was not available. | Attribute the derived data, retain source links, and keep the workbook with the publisher. Obtain workbook-specific confirmation before raw redistribution. |
| Residual | Fixed input proportions and unlimited capacity omit substitution, bottlenecks and policy responses. | Keep results conditional. Human review of assumptions and classification is pending. |
