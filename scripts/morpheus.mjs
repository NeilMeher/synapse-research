import { runStudy } from "./run-study.mjs";
import { runMorpheus } from "../engine/morpheus.mjs";

runStudy(
  "morpheus",
  runMorpheus,
  [
    "scripts/morpheus.mjs",
    "engine/memory.mjs",
    "engine/morpheus.mjs",
    "engine/confidence.mjs",
    "engine/echo.mjs",
    "engine/statistics.mjs",
  ],
  process.argv[2]
);
