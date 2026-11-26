import { runStudy } from "./run-study.mjs";
import { runAlphaDecay } from "../engine/alpha-decay.mjs";

runStudy(
  "alpha-decay",
  runAlphaDecay,
  [
    "scripts/alpha-decay.mjs",
    "engine/alpha-decay.mjs",
    "engine/market.mjs",
    "engine/echo.mjs",
    "engine/statistics.mjs",
  ],
  process.argv[2]
);
