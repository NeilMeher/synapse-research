import {runStudy} from "./run-study.mjs";
import {runPolis2} from "../engine/polis2.mjs";

runStudy("polis2",runPolis2,["scripts/polis2.mjs","engine/polis2.mjs","engine/civilizations.mjs",
  "engine/resources.mjs","engine/echo.mjs","engine/game-theory.mjs","engine/statistics.mjs","schemas/polis2-v1.json"],process.argv[2]);
