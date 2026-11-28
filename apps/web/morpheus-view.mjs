import { seeded } from "./engine/echo.mjs";
import { createRecord } from "./engine/memory.mjs";
import { duplicateAndDiverge, evaluateHistory, generateHistory } from "./engine/morpheus.mjs";
import { byId, canvasContext, node, palette } from "./view.mjs";

const pct = x => (x * 100).toFixed(2) + "%";
const num = x => x.toFixed(4);

async function showAuditComparison() {
  const select = byId("morpheus-audit-environment");
  const status = byId("morpheus-audit-status");
  select.disabled = true;
  try {
    const response = await fetch("./research/evidence/morpheus-adaptive-reliability-confirmatory-002/summary.json");
    if(!response.ok) throw new Error("Audit archive unavailable");
    const results = await response.json();
    const labels = {
      fixed:"Fixed trust","cumulative-known-event":"Cumulative, corrected","exponential-known-event":"Exponential, corrected",
      "exponential-naive-event":"Exponential, uncorrected","markov-known-event":"Markov, known audit accuracy",
    };
    const windows = {full:64,failure:22,restoration:12};
    function render() {
      const totals = results.totals[select.value];
      byId("morpheus-audit-counts").replaceChildren(...Object.entries(labels).map(([id,label]) => {
        const tr = node("tr");
        const heading = node("th",label);
        heading.scope = "row";
        tr.append(heading,...Object.entries(windows).map(([key,size]) =>
          node("td",totals[id][key].toLocaleString()+" / "+(results.historiesPerEnvironment*size).toLocaleString())));
        return tr;
      }));
      status.textContent = "Showing "+results.historiesPerEnvironment+" matched histories.";
    }
    render();
    select.disabled = false;
    select.addEventListener("change",render);
  } catch {
    status.textContent = "The registered audit table is unavailable. The report and protocol remain linked below.";
  }
}

showAuditComparison();

async function boot() {
  const status = byId("morpheus-status");
  try {
    const res = await fetch("./data/morpheus-confirmatory.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    status.textContent = `Loaded ${data.config.id} (${data.config.trials} paired histories, budget K=${data.config.budget}).`;

    const regimeSel = byId("morpheus-regime");
    const archSel = byId("morpheus-arch");
    const stepInput = byId("morpheus-step");
    const stepOut = byId("morpheus-step-output");
    const dupBtn = byId("morpheus-duplicate");

    const archNames = [...new Set(data.arms.filter(a => !a.ablation).map(a => a.architecture))];
    for (const name of archNames) {
      const opt = node("option", name);
      opt.value = name;
      if (name === "provenance") opt.selected = true;
      archSel.append(opt);
    }

    const c0 = data.contrasts[0];
    const c1 = data.contrasts[1];
    byId("morpheus-contrasts").textContent =
      `Corrupted (provenance − keyword): ${(c0.estimate * 100).toFixed(2)} pp [${(c0.interval[0] * 100).toFixed(2)}, ${(c0.interval[1] * 100).toFixed(2)}]. ` +
      `Clean (provenance − keyword): ${(c1.estimate * 100).toFixed(2)} pp [${(c1.interval[0] * 100).toFixed(2)}, ${(c1.interval[1] * 100).toFixed(2)}].`;

    const histories = {
      corrupted: data.sampleHistory,
      clean: generateHistory(seeded(data.config.seed), data.config.steps, "clean"),
    };
    let cloneActive = false;
    dupBtn.addEventListener("click", () => {
      cloneActive = !cloneActive;
      dupBtn.setAttribute("aria-pressed", String(cloneActive));
      render();
    });

    function render() {
      const regime = regimeSel.value;
      const arch = archSel.value;
      const step = Number(stepInput.value);
      stepOut.textContent = String(step);

      const rows = data.arms.filter(a => a.regime === regime);
      const tbody = byId("morpheus-metrics");
      tbody.replaceChildren();
      for (const arm of rows) {
        const tr = node("tr");
        const m = arm.metrics;
        for (const val of [
          arm.architecture,
          arm.ablation ?? "—",
          pct(m.decisionAccuracy.estimate),
          pct(m.goalPreservation.estimate),
          pct(m.adaptationAccuracy.estimate),
          pct(m.recoveryAfterCorruption.estimate),
          num(m.brier.estimate),
        ]) {
          tr.append(node("td", val));
        }
        tbody.append(tr);
      }

      // Draw bar chart of main architectures
      const mainArms = rows.filter(a => !a.ablation);
      const canvas = byId("morpheus-chart");
      const { context: ctx, width, height } = canvasContext(canvas);
      ctx.clearRect(0, 0, width, height);
      const pad = { l: 42, r: 16, t: 18, b: 48 };
      const plotW = width - pad.l - pad.r;
      const plotH = height - pad.t - pad.b;
      const bw = plotW / mainArms.length;
      mainArms.forEach((arm, idx) => {
        const v = arm.metrics.decisionAccuracy.estimate;
        const bh = v * plotH;
        const x = pad.l + idx * bw + 6;
        const y = pad.t + plotH - bh;
        ctx.fillStyle = arm.architecture === arch ? palette("positive") : palette("dim");
        ctx.fillRect(x, y, Math.max(8, bw - 12), bh);
        ctx.fillStyle = palette("text");
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(arm.architecture.slice(0, 7), x + Math.max(8, bw - 12) / 2, height - 18);
        ctx.fillText((v * 100).toFixed(0) + "%", x + Math.max(8, bw - 12) / 2, y - 4);
      });

      // Step trace & provenance inspector
      const selectedArm = rows.find(a => a.architecture === arch && !a.ablation) ?? rows[0];
      const trace = selectedArm.replay[step];
      const history = histories[regime];
      const q = history.queries[step];
      let cloneRecord;
      let compared = trace;
      if (cloneActive) {
        const falseValue = q.groundTruth === "alpha" ? "beta" : "alpha";
        cloneRecord = createRecord({
          recordId: "demo-injection", agentId: history.agentId + "-clone",
          eventTime: step, ingestionTime: step, sourceId: "untrusted-rumor",
          topic: q.topic, kind: q.kind, value: falseValue, evidenceClass: "unverified_claim",
          confidence: 0.85, corrupted: true,
        });
        const fork = duplicateAndDiverge(history, step, cloneRecord);
        compared = evaluateHistory(fork, arch, data.config.budget, null, true).trace[step];
      }
      byId("morpheus-clone-note").textContent = cloneRecord
        ? `Browser intervention at step ${step}: injected ${cloneRecord.content.value}. Original prediction ${trace.prediction}; clone prediction ${compared.prediction}.`
        : "";
      byId("morpheus-inspector").textContent = "";
      byId("morpheus-step-summary").textContent =
        `Step ${step}: Query (${q.topic}, ${q.kind}) · Truth=${q.groundTruth} · ` +
        `${arch} predicted=${trace.prediction} (${trace.correct ? "correct" : "wrong"}, conf=${trace.confidence.toFixed(2)}, contradiction=${trace.contradictionFlagged}).`;

      const recBody = byId("morpheus-records");
      recBody.replaceChildren();
      const visible = [];
      for (let s = 0; s <= step; s++) visible.push(...history.ingestedByStep[s]);
      if (cloneRecord) visible.push(cloneRecord);
      const retrievedSet = new Set(compared.retrievedIds);
      for (const r of visible.slice(-14)) {
        const tr = node("tr");
        if (retrievedSet.has(r.recordId)) tr.style.fontWeight = "600";
        tr.tabIndex = 0;
        const inspect = () => {
          byId("morpheus-inspector").textContent =
            `${r.recordId}: source=${r.sourceId}, class=${r.evidenceClass}, verified=${r.provenance.verified}, ` +
            `chainDepth=${r.provenance.chainDepth}, supersedes=${r.supersedes ?? "none"}, contradicts=${r.contradicts ?? "none"}, ` +
            `retrieved=${retrievedSet.has(r.recordId)}.`;
        };
        tr.addEventListener("click", inspect);
        tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(); } });
        for (const val of [
          r.recordId,
          `${r.content.topic} (${r.content.kind})`,
          r.content.value,
          r.sourceId,
          r.evidenceClass,
          `${r.eventTime} / ${r.ingestionTime}`,
        ]) {
          tr.append(node("td", val));
        }
        recBody.append(tr);
      }
    }

    regimeSel.addEventListener("change", render);
    archSel.addEventListener("change", render);
    stepInput.addEventListener("input", render);
    render();
  } catch (err) {
    status.textContent = "Unable to load MORPHEUS artifacts: " + err.message;
  }
}

boot();
