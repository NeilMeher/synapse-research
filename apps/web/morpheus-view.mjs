import { byId, canvasContext, node, palette } from "./view.mjs";

const pct = x => (x * 100).toFixed(2) + "%";
const num = x => x.toFixed(4);

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

    let cloneActive = false;
    dupBtn.addEventListener("click", () => {
      cloneActive = !cloneActive;
      byId("morpheus-clone-note").textContent = cloneActive
        ? "Simulated clone divergence at step 4: original retains verified safety_floor; clone receives unverified injection (provenance filters injection; keyword adopts it)."
        : "";
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
      const { ctx, width, height } = canvasContext(canvas, 560, 260);
      const colors = palette();
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
        ctx.fillStyle = arm.architecture === arch ? colors.accent : colors.muted;
        ctx.fillRect(x, y, Math.max(8, bw - 12), bh);
        ctx.fillStyle = colors.ink;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(arm.architecture.slice(0, 7), x + Math.max(8, bw - 12) / 2, height - 18);
        ctx.fillText((v * 100).toFixed(0) + "%", x + Math.max(8, bw - 12) / 2, y - 4);
      });

      // Step trace & provenance inspector
      const selectedArm = rows.find(a => a.architecture === arch && !a.ablation) ?? rows[0];
      const trace = selectedArm.replay[step];
      const q = data.sampleHistory.queries[step];
      byId("morpheus-step-summary").textContent =
        `Step ${step}: Query (${q.topic}, ${q.kind}) · Truth=${q.groundTruth} · ` +
        `${arch} predicted=${trace.prediction} (${trace.correct ? "correct" : "wrong"}, conf=${trace.confidence.toFixed(2)}, contradiction=${trace.contradictionFlagged}).`;

      const recBody = byId("morpheus-records");
      recBody.replaceChildren();
      const visible = [];
      for (let s = 0; s <= step; s++) visible.push(...data.sampleHistory.ingestedByStep[s]);
      const retrievedSet = new Set(trace.retrievedIds);
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
