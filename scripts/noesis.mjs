import { runStudy } from "./run-study.mjs";
import { runNoesis } from "../engine/noesis.mjs";

runStudy(
  "noesis",
  runNoesis,
  [
    "scripts/noesis.mjs",
    "engine/noesis.mjs",
    "engine/discovery.mjs",
    "engine/echo.mjs",
    "engine/statistics.mjs",
  ],
  process.argv[2]
);
