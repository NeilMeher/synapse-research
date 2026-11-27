import { byId, node, canvasContext, line, circle, pct } from "./view.mjs";
import { evaluateBasis, fitBayesianModel, predict, FAMILIES } from "./engine/discovery.mjs";

let dataset = null;
let currentArmId = "active_ig";
let currentStep = 0;
let revealTruth = false;

const FAMILY_LABELS = {
  poly: "Polynomial [1, x, x²]",
  harm: "Harmonic [1, sin(πx), cos(πx)]",
  exp: "Exponential [1, e⁻ˣ², e⁻|ˣ|]",
  rat: "Rational [1, 1/(1+x²), x/(1+x²)]",
};

const FAMILY_COLORS = {
  poly: "#4f98ca",
  harm: "#279b37",
  exp: "#9b51e0",
  rat: "#f2994a",
};

function formatContrast(contrast) {
  const est = (contrast.estimate * 100).toFixed(2);
  const lo = (contrast.interval[0] * 100).toFixed(2);
  const hi = (contrast.interval[1] * 100).toFixed(2);
  return `${contrast.id.endsWith("random_recovery") ? "Disagreement minus random" : "Disagreement minus uniform grid"}: ${est > 0 ? "+" : ""}${est} pp (95% Bonferroni CI [${lo}, ${hi}] pp)`;
}

function renderTable() {
  const body = byId("noesis-summary-table");
  body.innerHTML = "";
  for (const arm of dataset.arms) {
    const tr = node("tr");
    const m = arm.metrics;
    tr.appendChild(node("td", {active_ig:"Model disagreement", active_uncertainty:"Active uncertainty", uniform_grid:"Uniform grid", random:"Random"}[arm.id]));
    tr.appendChild(node("td", pct(m.family_recovery.estimate)));
    tr.appendChild(node("td", pct(m.posterior_at_truth.estimate)));
    tr.appendChild(node("td", m.log_loss.estimate.toFixed(4)));
    tr.appendChild(node("td", m.test_rmse.estimate.toFixed(4)));
    body.appendChild(tr);
  }

  const contrastsEl = byId("noesis-contrasts");
  contrastsEl.textContent = dataset.contrasts.map(formatContrast).join(" · ");
}

function renderTrace(replay) {
  const body = byId("noesis-trace-body");
  body.innerHTML = "";
  for (let i = 0; i <= currentStep && i < replay.trace.length; i++) {
    const t = replay.trace[i];
    const tr = node("tr");
    if (i === currentStep) tr.className = "active-step";
    tr.appendChild(node("td", String(t.step)));
    tr.appendChild(node("td", t.x.toFixed(2)));
    tr.appendChild(node("td", t.y.toFixed(3)));
    tr.appendChild(node("td", t.bestFamily));
    tr.appendChild(node("td", pct(t.bestProb)));
    body.appendChild(tr);
  }
}

function renderProbabilityBars(posteriors) {
  const canvas = byId("noesis-prob-canvas");
  const ctxObj = canvasContext(canvas);
  if (!ctxObj) return;
  const { context, width, height } = ctxObj;
  context.clearRect(0, 0, width, height);

  const families = FAMILIES;
  const barHeight = Math.floor(height / (families.length * 1.5));
  const spacing = Math.floor(barHeight * 0.4);
  const labelWidth = 140;
  const maxBarWidth = width - labelWidth - 60;

  context.font = "12px system-ui, sans-serif";
  context.textBaseline = "middle";

  families.forEach((fam, idx) => {
    const p = posteriors[fam] ?? 0.0;
    const y = idx * (barHeight + spacing) + 15;

    // Label
    context.fillStyle = "#e0e6ed";
    context.textAlign = "right";
    context.fillText(fam.toUpperCase(), labelWidth - 10, y + barHeight / 2);

    // Background track
    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.fillRect(labelWidth, y, maxBarWidth, barHeight);

    // Filled bar
    context.fillStyle = FAMILY_COLORS[fam] || "#4f98ca";
    const barW = Math.max(2, Math.round(maxBarWidth * p));
    context.fillRect(labelWidth, y, barW, barHeight);

    // Value text
    context.fillStyle = "#ffffff";
    context.textAlign = "left";
    context.fillText(pct(p), labelWidth + barW + 8, y + barHeight / 2);
  });
}

function renderCurves(replay) {
  const canvas = byId("noesis-curve-canvas");
  const ctxObj = canvasContext(canvas);
  if (!ctxObj) return;
  const { context, width, height } = ctxObj;
  context.clearRect(0, 0, width, height);

  const padX = 40;
  const padY = 30;
  const plotW = width - 2 * padX;
  const plotH = height - 2 * padY;

  // Domain x in [-2.0, 2.0], y in [-3.0, 3.0]
  const xMin = -2.0, xMax = 2.0;
  const yMin = -3.0, yMax = 3.0;

  const toScreenX = (x) => padX + ((x - xMin) / (xMax - xMin)) * plotW;
  const toScreenY = (y) => padY + ((yMax - y) / (yMax - yMin)) * plotH;

  // Axes
  context.strokeStyle = "rgba(255, 255, 255, 0.2)";
  context.lineWidth = 1;
  line(context, toScreenX(xMin), toScreenY(0), toScreenX(xMax), toScreenY(0));
  line(context, toScreenX(0), toScreenY(yMin), toScreenX(0), toScreenY(yMax));

  // Current observations up to currentStep
  const obs = replay.observations.slice(0, currentStep + 1);

  // Fit Bayesian models on current observations
  const noiseVar = 0.20 * 0.20;
  const fittedModels = FAMILIES.map((fam) => fitBayesianModel(fam, obs, 1.0, 1.0 / noiseVar));

  // Plot model curves
  const numSteps = 100;
  for (const m of fittedModels) {
    context.strokeStyle = FAMILY_COLORS[m.family];
    context.lineWidth = m.family === replay.trace[currentStep].bestFamily ? 2.5 : 1.0;
    context.beginPath();
    for (let i = 0; i <= numSteps; i++) {
      const x = xMin + (i / numSteps) * (xMax - xMin);
      const y = predict(m, x).mean;
      const sx = toScreenX(x);
      const sy = toScreenY(Math.max(yMin, Math.min(yMax, y)));
      if (i === 0) context.moveTo(sx, sy);
      else context.lineTo(sx, sy);
    }
    context.stroke();
  }

  // Draw Ground Truth if revealed
  if (revealTruth) {
    const { family: tf, params: tp } = replay.groundTruth;
    context.strokeStyle = "#ffd700";
    context.lineWidth = 3;
    context.setLineDash([4, 4]);
    context.beginPath();
    for (let i = 0; i <= numSteps; i++) {
      const x = xMin + (i / numSteps) * (xMax - xMin);
      const phi = evaluateBasis(tf, x);
      const y = phi[0] * tp[0] + phi[1] * tp[1] + phi[2] * tp[2];
      const sx = toScreenX(x);
      const sy = toScreenY(Math.max(yMin, Math.min(yMax, y)));
      if (i === 0) context.moveTo(sx, sy);
      else context.lineTo(sx, sy);
    }
    context.stroke();
    context.setLineDash([]);

    const pStr = `y = ${tp[0].toFixed(2)} + ${tp[1].toFixed(2)}·φ₁(x) + ${tp[2].toFixed(2)}·φ₂(x)`;
    byId("noesis-truth-display").textContent = `Ground Truth Law: [${FAMILY_LABELS[tf]}] · ${pStr}`;
  } else {
    byId("noesis-truth-display").textContent = "Ground truth is hidden. Click 'Reveal Ground Truth Law' to inspect.";
  }

  // Plot observed points
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    const sx = toScreenX(o.x);
    const sy = toScreenY(o.y);

    context.fillStyle = i === currentStep ? "#ffd700" : "#ffffff";
    context.strokeStyle = "#000000";
    context.lineWidth = 1.5;
    circle(context, sx, sy, i === currentStep ? 6 : 4.5, true);
    circle(context, sx, sy, i === currentStep ? 6 : 4.5, false);

    // Step label
    context.fillStyle = "#ffffff";
    context.font = "10px monospace";
    context.fillText(String(i), sx + 6, sy - 6);
  }
}

function updateView() {
  const arm = dataset.arms.find((a) => a.id === currentArmId);
  if (!arm || !arm.replay) return;

  byId("noesis-step-output").textContent = `${currentStep} / ${arm.replay.trace.length - 1}`;
  const stepData = arm.replay.trace[currentStep];

  renderProbabilityBars(stepData.posteriors);
  renderCurves(arm.replay);
  renderTrace(arm.replay);
}

async function init() {
  const statusEl = byId("noesis-status");
  try {
    const response = await fetch("./data/noesis-confirmatory.json");
    if (!response.ok) throw new Error("Archive HTTP " + response.status);
    dataset = await response.json();
    if (dataset.schemaVersion !== "noesis-v1" || dataset.config.id !== "noesis-confirmatory-001") throw new Error("Invalid archive");
    statusEl.textContent = `Loaded confirmatory dataset: ${dataset.config.trials} trials, budget ${dataset.config.budget}.`;

    renderTable();

    byId("noesis-arm").addEventListener("change", (e) => {
      currentArmId = e.target.value;
      updateView();
    });

    const stepInput = byId("noesis-step");
    stepInput.addEventListener("input", (e) => {
      currentStep = parseInt(e.target.value, 10);
      updateView();
    });

    byId("noesis-toggle-truth").addEventListener("click", () => {
      revealTruth = !revealTruth;
      byId("noesis-toggle-truth").textContent = revealTruth ? "Hide Ground Truth" : "Reveal Ground Truth Law";
      updateView();
    });

    updateView();
  } catch (err) {
    statusEl.textContent = `Failed to load NOESIS results: ${err.message}`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
