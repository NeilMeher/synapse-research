import {runStudy} from "./run-study.mjs";
import {runMirage} from "../engine/mirage.mjs";

runStudy("mirage",runMirage,["scripts/mirage.mjs","engine/confidence.mjs","engine/mirage.mjs",
  "engine/echo.mjs","engine/statistics.mjs"],process.argv[2]);
