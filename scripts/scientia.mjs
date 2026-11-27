import {runStudy} from "./run-study.mjs";
import {runScientia} from "../engine/scientia.mjs";

runStudy("scientia",runScientia,["scripts/scientia.mjs","engine/scientia.mjs","engine/noesis.mjs",
  "engine/discovery.mjs","engine/echo.mjs","engine/statistics.mjs","schemas/scientia-v1.json"],process.argv[2]);
