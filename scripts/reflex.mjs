import {runStudy} from "./run-study.mjs";
import {runReflex} from "../engine/reflex.mjs";
runStudy("reflex",runReflex,["scripts/reflex.mjs","engine/market.mjs","engine/reflex.mjs","engine/echo.mjs","engine/statistics.mjs"],process.argv[2]);
