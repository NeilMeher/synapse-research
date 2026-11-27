import {runStudy} from "./run-study.mjs";
import {runPolis} from "../engine/polis.mjs";

runStudy("polis",runPolis,["scripts/polis.mjs","engine/polis.mjs","engine/civilizations.mjs","engine/resources.mjs",
  "engine/game-theory.mjs","engine/echo.mjs","engine/statistics.mjs","schemas/polis-v1.json",
  "scripts/reference_polis.py","scripts/reference_civilizations.py"],process.argv[2]);
