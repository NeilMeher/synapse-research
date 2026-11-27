import {runStudy} from "./run-study.mjs";
import {runEpisteme} from "../engine/episteme.mjs";

runStudy("episteme",runEpisteme,["scripts/episteme.mjs","engine/episteme.mjs","engine/validation.mjs",
  "engine/noesis.mjs","engine/discovery.mjs","engine/echo.mjs","engine/statistics.mjs","schemas/episteme-v1.json"],process.argv[2]);
