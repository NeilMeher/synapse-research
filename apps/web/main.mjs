import {validateResults} from "./engine/contracts.mjs";
import {replay} from "./engine/echo.mjs";
import {drawHero, example, setupLab} from "./lab.mjs";
import {setupRobustness} from "./robustness.mjs";
import {setupMap} from "./map.mjs";
import {showResults} from "./results.mjs";
import {byId} from "./view.mjs";

const map = setupMap();
const lab = setupLab();
const robustness = setupRobustness();
document.addEventListener("echo2-ready", () => map.markRobustnessAvailable());
const hero = replay(example);
drawHero(hero);
let chart;
const theme = byId("theme");

theme.addEventListener("click", () => {
  const light = document.documentElement.dataset.theme !== "light";
  document.documentElement.dataset.theme = light ? "light" : "dark";
  theme.setAttribute("aria-pressed", String(light));
  theme.textContent = light ? "Dark theme" : "Light theme";
  map.draw();
  lab.draw();
  robustness.draw();
  if (hero) drawHero(hero);
  if (chart) chart();
});
new ResizeObserver(() => { if (hero) drawHero(hero); }).observe(byId("hero-network"));

try {
  const response = await fetch("./data/confirmatory.json");
  if (!response.ok) throw new Error("HTTP " + response.status);
  const artifact = validateResults(await response.json());
  chart = showResults(artifact);
  lab.load(artifact.replays);
  map.markAvailable();
} catch {
  byId("results-status").textContent = "Experiment artifact unavailable. Rebuild or reload this page to see recorded results.";
}
