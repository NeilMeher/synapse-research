# MIRAGE learning and review

Let the primary answer be correct with probability .7 and the agreeing hint be correct with probability .7. A matching bit occurs either when both are correct (.49) or when both are wrong (.09). Confidence in the selected answer given agreement is .49/.58. Given disagreement both orientations have probability .21, giving .50 confidence. This calculation assumes independent cue error conditional on the truth.

Follow engine/mirage.mjs from drawObservation to observe, then follow predict and engine/confidence.mjs. The first function samples hidden truth. The decision uses only the primary report. The calibration lookup learns from training data indexed by tier and hint agreement. Verify that truth is used to score held-out predictions, with no truth bit in predict.

1. For outcomes 1 and 0 and constant forecast .6, calculate mean Brier (.26). Explain why two equal forecasts have AUROC .5 when there is both a success and an error.
2. Calculate the mean error among the top-ranked half of four forecasts. Split equal-confidence observations with fair fractional credit in expectation.
3. Switch the website from normal to misleading hints. Verify that the chosen answer and first-order accuracy stay fixed while calibrated ranking changes.
4. Run the independent reference. Derive the cue reversal and compare the published Brier differences. Explain why the oracle's access to the true regime is stronger than a user's practical information.
5. As an extension, define a held-out regime and register the method for detecting transfer failure before inspecting outcomes.

Independent human verification remains open.
