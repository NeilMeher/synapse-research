import {runStudy} from "./run-study.mjs";
import {runConvergence} from "../engine/convergence.mjs";
runStudy("convergence",runConvergence,["scripts/convergence.mjs","engine/convergence.mjs","engine/confidence.mjs",
  "engine/dependence.mjs","engine/echo.mjs","engine/market.mjs","engine/reflex.mjs","engine/statistics.mjs"],process.argv[2]);
