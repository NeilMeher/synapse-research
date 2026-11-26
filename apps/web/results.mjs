import {byId, canvasContext, circle, line, node, palette, pct} from "./view.mjs";

const series = [
  ["individual", "Individual", "dim", [4, 4]],
  ["majority", "Majority", "positive", []],
  ["hub", "Hub DeGroot", "negative", [8, 4]],
  ["verifiedBayes", "Verification", "science", [2, 4]],
];
const contrastTitles = {
  "shared-error": "Majority gain lost as correlation rises from 0 to 0.75",
  "hub-loss": "Complete network over hub at 0.75 correlation",
  "verification": "Verification gain at 0.75 correlation",
};
const pp = value => (value * 100).toFixed(1) + " pp";

export function showResults(artifact) {
  byId("results-status").textContent = artifact.config.trials.toLocaleString("en") +
    " independent synthetic tasks · " + artifact.config.experimentId;
  byId("findings").replaceChildren(...artifact.contrasts.map(row => {
    const article = node("article", null, "finding");
    article.append(node("h3", contrastTitles[row.id]),
      node("strong", pp(row.estimate)),
      node("span", "Family-adjusted interval " + row.interval.map(pp).join(" to ")));
    return article;
  }));
  byId("curve-legend").replaceChildren(...series.map(([, label, color]) => {
    const item = node("li", label);
    item.style.color = "var(--" + color + ")";
    return item;
  }));
  const table = byId("curve-data");
  const rows = artifact.conditions.flatMap(condition => series.map(([policy, label]) => {
    const metric = condition.metrics.find(item => item.metric === "accuracy" && item.policy === policy);
    return {correlation: condition.correlation, label, metric};
  }));
  table.replaceChildren(...rows.map(({correlation, label, metric}) => {
    const row = node("tr");
    row.append(node("td", correlation.toFixed(2)), node("td", label),
      node("td", pct(metric.estimate)), node("td", metric.interval.map(pct).join(" to ")));
    return row;
  }));
  const canvas = byId("curve");
  function draw() {
    const surface = canvasContext(canvas);
    if (!surface) return;
    const {context, width, height} = surface;
    const left = 52;
    const right = width - 13;
    const top = 15;
    const bottom = height - 52;
    const point = (rho, rate) => [left + rho * (right-left), bottom - rate * (bottom-top)];
    const dim = palette("dim");
    context.font = "12px 'Segoe UI'";
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (let i = 0; i <= 5; i++) {
      const [x, y] = point(0, i/5);
      context.fillStyle = dim;
      context.strokeStyle = palette("line");
      context.fillText((i*20) + "%", x - 7, y);
      line(context, x, y, right, y);
    }
    context.textAlign = "center";
    context.fillText("Accuracy", left + 23, 7);
    for (const {correlation} of artifact.conditions) {
      const [x, y] = point(correlation, 0);
      context.fillText(correlation.toFixed(2), x, y + 15);
    }
    context.fillText("Shared-error correlation (ρ)", (left + right) / 2, height - 10);
    for (const [policy, , color, dash] of series) {
      const curve = artifact.conditions.map(({correlation, metrics}) => ({
        correlation, ...metrics.find(item => item.metric === "accuracy" && item.policy === policy),
      }));
      context.strokeStyle = palette(color);
      context.fillStyle = palette(color);
      context.lineWidth = 1.5;
      context.setLineDash(dash);
      for (let i = 1; i < curve.length; i++) {
        line(context, ...point(curve[i-1].correlation, curve[i-1].estimate),
          ...point(curve[i].correlation, curve[i].estimate));
      }
      context.setLineDash([]);
      for (const {correlation, estimate, interval} of curve) {
        const [x, y] = point(correlation, estimate);
        const [, high] = point(correlation, interval[1]);
        const [, low] = point(correlation, interval[0]);
        line(context, x, high, x, low);
        line(context, x-3, high, x+3, high);
        line(context, x-3, low, x+3, low);
        circle(context, x, y, 3.5, true);
      }
    }
  }
  new ResizeObserver(draw).observe(canvas);
  draw();
  return draw;
}
