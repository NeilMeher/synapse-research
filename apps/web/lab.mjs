import {defaults, replay} from "./engine/echo.mjs";
import {byId, canvasContext, circle, download, line, node, palette, pct} from "./view.mjs";

export const example = Object.freeze({...defaults, seed: 38, verified: 0});
const names = {complete: "Complete", ring: "Ring", hub: "Hub"};

function drawNetwork(canvas, run, index, selected = -1) {
  const surface = canvasContext(canvas);
  if (!surface) return;
  const {context, width, height} = surface;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * .72;
  const hub = run.settings.topology === "hub";
  const {agents} = run.settings;
  const beliefs = run.frames[index].beliefs;
  const positions = beliefs.map((_, i) => {
    if (hub && i === 0) return [cx, cy];
    const angle = (i - Number(hub)) / (agents - Number(hub)) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });

  context.strokeStyle = palette("line");
  context.lineWidth = 1;
  circle(context, cx, cy, radius, false);
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const weight = Math.max(run.weights[i][j], run.weights[j][i]);
      if (!weight) continue;
      context.globalAlpha = run.settings.topology === "complete" ? .25 : .8;
      context.strokeStyle = i === selected || j === selected ? palette("dim") : palette("line");
      context.lineWidth = .6 + weight;
      line(context, ...positions[i], ...positions[j]);
    }
  }
  for (const [i, [x, y]] of positions.entries()) {
    const size = (hub && i === 0 ? 7 : 4) + Math.abs(beliefs[i] - .5) * 18;
    context.globalAlpha = 1;
    context.fillStyle = palette(beliefs[i] >= .5 ? "positive" : "negative");
    circle(context, x, y, size, true);
    if (i === selected || run.reports[i].source === "verified") {
      context.strokeStyle = palette("text");
      context.lineWidth = 1;
      context.setLineDash(run.reports[i].source === "verified" ? [2, 3] : []);
      circle(context, x, y, size + (i === selected ? 5 : 3), false);
      context.setLineDash([]);
    }
  }
}

function summary(run, index) {
  const frame = run.frames[index];
  return "Mean belief in 1 " + pct(frame.average) + " · decision " + frame.decision +
    " · dispersion " + (frame.dispersion * 100).toFixed(1) + " pp";
}

export function setupLab() {
  const form = byId("lab-form");
  const archive = byId("archive");
  const comparison = byId("compare");
  const error = byId("scenario-error");
  const selectAgent = byId("agent");
  let run = replay(example);
  let compareRun;
  let archived = [];
  let activeArchive;
  let round = 0;
  let timer;

  function stop() {
    clearInterval(timer);
    timer = undefined;
    byId("play").textContent = "Play";
  }

  function resetFields(settings) {
    for (const [key, value] of Object.entries(settings)) form.elements.namedItem(key).value = value;
    form.elements.namedItem("verified").max = settings.agents;
  }

  function draw() {
    const inspected = Number(selectAgent.value || 0);
    drawNetwork(byId("network"), run, round, inspected);
    if (compareRun) drawNetwork(byId("compare-network"), compareRun, round, inspected);
  }

  function renderRound(value) {
    round = Math.max(0, Math.min(run.settings.rounds, value));
    byId("round").max = run.settings.rounds;
    byId("round").value = round;
    byId("round").setAttribute("aria-valuetext", "Round " + round + " of " + run.settings.rounds);
    byId("round-value").value = round + " / " + run.settings.rounds;
    byId("previous").disabled = round === 0;
    byId("next").disabled = round === run.settings.rounds;
    byId("play").disabled = run.settings.rounds === 0;
    byId("network-title").textContent = names[run.settings.topology] + " · " +
      (run.settings.method === "degroot" ? "DeGroot" : "bounded confidence");
    byId("network-summary").textContent = summary(run, round);
    byId("comparison").hidden = !compareRun;
    if (compareRun) {
      byId("comparison-title").textContent = names[compareRun.settings.topology] + " comparison";
      byId("compare-summary").textContent = summary(compareRun, round);
    }
    byId("agent-caption").textContent = "Round " + round + " · truth " + run.task.truth;
    const current = run.frames[round];
    const inspected = Number(selectAgent.value || 0);
    const {signal, source} = run.reports[inspected];
    byId("agent-detail").textContent = "Truth " + run.task.truth + " · agent " + (inspected + 1) +
      " saw " + signal + " (" + source + ") · belief in 1 " + pct(current.beliefs[inspected]);
    byId("agent-data").replaceChildren(...run.reports.map((observation, index) => {
      const row = node("tr");
      const heading = node("th", String(index + 1));
      heading.scope = "row";
      row.append(heading, node("td", observation.signal), node("td", observation.source),
        node("td", pct(current.beliefs[index])));
      return row;
    }));
    draw();
  }

  function update(next, archivedEntry, initialRound = 0) {
    const alternate = comparison.value ?
      replay({...next.settings, topology: comparison.value}, next.task) : undefined;
    run = next;
    compareRun = alternate;
    activeArchive = archivedEntry;
    const selectedIndex = Math.min(Number(selectAgent.value || 0), run.settings.agents - 1);
    selectAgent.replaceChildren(...run.reports.map((_, i) => {
      const option = node("option", "Agent " + (i + 1));
      option.value = i;
      return option;
    }));
    selectAgent.value = selectedIndex;
    byId("scenario-tag").textContent = activeArchive ? "ARCHIVED SYNTHETIC TASK" : "BROWSER SIMULATION";
    byId("scenario-error").hidden = true;
    renderRound(initialRound);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    stop();
    try {
      const types = Object.entries(defaults);
      const custom = Object.fromEntries(types.map(([key, base]) => {
        const field = form.elements.namedItem(key);
        return [key, typeof base === "number" ? field.valueAsNumber : field.value];
      }));
      update(replay(custom), undefined);
      archive.value = "";
    } catch (failure) {
      error.textContent = failure.message;
      error.hidden = false;
    }
  });
  form.elements.namedItem("agents").addEventListener("input", event => {
    form.elements.namedItem("verified").max = event.target.value;
  });
  archive.addEventListener("change", () => {
    stop();
    const selectedArchive = archived.find(entry => entry.id === archive.value);
    if (selectedArchive) {
      resetFields(selectedArchive.settings);
      update(selectedArchive, selectedArchive);
    } else {
      resetFields(example);
      update(replay(example), undefined);
    }
  });
  comparison.addEventListener("change", () => { stop(); update(run, activeArchive, round); });
  selectAgent.addEventListener("change", () => renderRound(round));
  byId("round").addEventListener("input", event => { stop(); renderRound(Number(event.target.value)); });
  for (const [id, delta] of [["previous", -1], ["next", 1]]) {
    byId(id).addEventListener("click", () => { stop(); renderRound(round + delta); });
  }
  byId("reset").addEventListener("click", () => { stop(); renderRound(0); });
  byId("play").addEventListener("click", () => {
    if (timer) { stop(); return; }
    if (round === run.settings.rounds) renderRound(0);
    byId("play").textContent = "Pause";
    timer = setInterval(() => {
      renderRound(round + 1);
      if (round === run.settings.rounds) stop();
    }, 600);
  });
  byId("export-config").addEventListener("click", () => {
    download("echo-configuration.json", {schemaVersion: "1.0.0", evidenceClass: "synthetic simulation",
      scenario: run.settings, compare: compareRun?.settings ?? null});
  });
  byId("export-replay").addEventListener("click", () => {
    download("echo-replay.json", {schemaVersion: "1.0.0", evidenceClass: "synthetic simulation",
      scenario: run, comparison: compareRun ?? null});
  });
  const resizer = new ResizeObserver(draw);
  resizer.observe(byId("network"));
  resizer.observe(byId("compare-network"));
  resetFields(example);
  update(run, undefined);

  return {draw, load(replays) {
    archived = replays;
    for (const entry of archived) {
      const option = node("option", entry.label);
      option.value = entry.id;
      archive.append(option);
    }

  }};
}

export function drawHero(entry) {
  drawNetwork(byId("hero-network"), entry, 0);
  const final = entry.frames.at(-1);
  byId("hero-status").textContent = "Hub · " + entry.settings.agents + " agents · private signals" +
    " · final decision " + final.decision + " · synthetic truth " + entry.task.truth;
}
