import { byId, canvasContext, node, palette } from "./view.mjs";

const pct = x => (x * 100).toFixed(4) + "%";

async function boot() {
  const status = byId("alpha-status");
  try {
    const res = await fetch("./data/alpha-decay-confirmatory.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    status.textContent = `Loaded ${data.config.id} (${data.config.trials} paired episodes, ${data.config.rounds} rounds each).`;

    const armSel = byId("alpha-arm");
    const roundInput = byId("alpha-round");
    const roundOut = byId("alpha-round-output");

    for (const arm of data.arms) {
      const opt = node("option", `${arm.id} (alpha ${pct(arm.metrics.alpha.estimate)})`);
      opt.value = arm.id;
      armSel.append(opt);
    }

    const c0 = data.contrasts[0];
    const c1 = data.contrasts[1];
    byId("alpha-contrasts").textContent =
      `Impact=4 (9 minus 1 adopters): ${(c0.estimate * 100).toFixed(4)}% [${(c0.interval[0] * 100).toFixed(4)}%, ${(c0.interval[1] * 100).toFixed(4)}%]. ` +
      `Control impact=0 (9 minus 1): ${(c1.estimate * 100).toFixed(4)}% [${(c1.interval[0] * 100).toFixed(4)}%, ${(c1.interval[1] * 100).toFixed(4)}%].`;

    const tbody = byId("alpha-table");
    for (const arm of data.arms) {
      const tr = node("tr");
      const m = arm.metrics;
      for (const val of [
        arm.id,
        String(arm.adopters) + (arm.concentratedCapital ? " (75% cap)" : ""),
        String(arm.impact),
        pct(m.grossReturn.estimate),
        pct(m.netReturn.estimate),
        pct(m.alpha.estimate),
        m.priceDeviation.estimate.toFixed(2),
        arm.sharpeLike === null ? "null" : arm.sharpeLike.toFixed(3),
      ]) {
        tr.append(node("td", val));
      }
      tbody.append(tr);
    }

    function render() {
      const selectedId = armSel.value;
      const roundIdx = Number(roundInput.value) - 1;
      roundOut.textContent = String(roundIdx + 1);
      const arm = data.arms.find(a => a.id === selectedId) ?? data.arms[0];

      // Draw alpha comparison bar chart
      const canvas = byId("alpha-chart");
      const { context: ctx, width, height } = canvasContext(canvas);
      ctx.clearRect(0, 0, width, height);
      const pad = { l: 42, r: 16, t: 18, b: 48 };
      const plotW = width - pad.l - pad.r;
      const plotH = height - pad.t - pad.b;
      const values = data.arms.map(a => a.metrics.alpha.estimate);
      const low = Math.min(0, ...values);
      const high = Math.max(0.005, ...values);
      const yAt = value => pad.t + (high - value) * plotH / (high - low);
      const bw = plotW / data.arms.length;
      data.arms.forEach((a, idx) => {
        const val = a.metrics.alpha.estimate;
        const bh = Math.abs(yAt(val) - yAt(0));
        const x = pad.l + idx * bw + 6;
        const y = Math.min(yAt(0), yAt(val));
        ctx.fillStyle = a.id === selectedId ? palette("positive") : (a.impact === 0 ? palette("science") : palette("dim"));
        ctx.fillRect(x, y, Math.max(8, bw - 12), bh);
        ctx.fillStyle = palette("text");
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(a.id.replace("impact4-", "i4-").replace("control0-", "c0-"), x + Math.max(8, bw - 12) / 2, height - 18);
        ctx.fillText((val * 100).toFixed(2) + "%", x + Math.max(8, bw - 12) / 2, y - 4);
      });

      // Round replay
      const frame = arm.replay.frames[roundIdx];
      byId("alpha-round-summary").textContent =
        `Round ${frame.round}: Fundamental=${frame.fundamental} ticks · End midpoint=${frame.midpoint} ticks · ` +
        `Total conserved cash=${arm.replay.totals.cash}, assets=${arm.replay.totals.assets}.`;
      const tradeBody = byId("alpha-trades");
      tradeBody.replaceChildren();
      for (const tr of frame.trades) {
        const row = node("tr");
        for (const val of [
          tr.actor,
          tr.strategy,
          tr.event.order.side,
          String(tr.event.order.quantity),
          String(tr.event.fills.length),
          String(tr.event.after.midpoint),
        ]) {
          row.append(node("td", val));
        }
        tradeBody.append(row);
      }
    }

    armSel.addEventListener("change", render);
    roundInput.addEventListener("input", render);
    render();
  } catch (err) {
    status.textContent = "Unable to load ALPHA DECAY artifacts: " + err.message;
  }
}

boot();
