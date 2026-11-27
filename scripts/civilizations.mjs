import {runStudy} from "./run-study.mjs";
import {runCivilizations} from "../engine/civilizations.mjs";

runStudy("civilizations",runCivilizations,["scripts/civilizations.mjs","engine/civilizations.mjs","engine/resources.mjs",
  "engine/game-theory.mjs","engine/echo.mjs","engine/statistics.mjs","schemas/civilizations-v1.json","scripts/reference_civilizations.py"],process.argv[2]);
