import {filterReliability} from "./adaptive-trust.mjs";
import {seeded} from "./echo.mjs";

export function auditMoments(reliability, accuracy) {
  if (![reliability, accuracy].every(x => Number.isFinite(x) && x >= 0 && x <= 1) || accuracy < .5) {
    throw new RangeError("Expected a true reliability in [0,1] and audit accuracy in [.5,1].");
  }
  const slope = 2 * accuracy - 1;
  const observed = (1 - accuracy) + slope * reliability;
  const variance = observed * (1 - observed);
  return {observed, variance, correctedVariance: slope ? variance / (slope * slope) : null};
}

export function auditCorrection(bit, accuracy) {
  return accuracy === .5 ? null : (bit - (1 - accuracy)) / (2 * accuracy - 1);
}

const clamp = q => Math.max(0, Math.min(1, q));
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

export function drawHistory(rng, cfg, environment) {
  const truth = [], suspect = [], alternative = [], audits = [];
  for (let time = 0; time < cfg.steps; time++) {
    const [state, primary, control, selected, flip, late] = Array.from({length: 6}, rng);
    const progress = time < cfg.failureStart || time >= cfg.restoredAt || environment.shape === "stationary" ? 0 :
      environment.shape === "burst" ? 1 : (time - cfg.failureStart + 1) / (cfg.restoredAt - cfg.failureStart);
    const rate = cfg.baseRate + (cfg.faultRate - cfg.baseRate) * progress;
    const bit = Number(state < .5);
    const correct = Number(primary < rate);
    truth.push(bit);
    suspect.push(correct ? bit : 1 - bit);
    alternative.push(control < cfg.controlRate ? bit : 1 - bit);
    if (selected < cfg.auditProbability) {
      audits.push({event: time, arrival: time + cfg.shortDelay + (late < environment.lateProbability ? cfg.extraDelay : 0),
        outcome: flip < environment.accuracy ? correct : 1 - correct});
    }
  }
  return {truth, suspect, alternative, audits};
}

export function comparePolicies({suspect, alternative, audits}, cfg, eta) {
  const visible = [];
  const ordered = [...audits].sort((a,b) => a.arrival-b.arrival || a.event-b.event);
  let position = 0;
  const result = Object.fromEntries(cfg.policies.map(({id}) => [id, []]));
  const channel = {naive: 1, known: eta, assumed: cfg.assumedAccuracy};
  for (let time = 0; time < suspect.length; time++) {
    while (position < ordered.length && ordered[position].arrival <= time) visible.push(ordered[position++]);
    const historical = [...visible].sort((a,b) => a.event-b.event);
    for (const {id, memory, correction, timing} of cfg.policies) {
      const assumed = channel[correction];
      let weight = cfg.baseRate;
      const records = timing === "arrival" ? visible : historical;
      if (memory === "markov") {
        weight = filterReliability({...cfg.markov, auditAccuracy: assumed}, time, records).reliability;
      } else if (memory !== "fixed" && assumed > .5 && records.length) {
        const samples = (memory === "rolling" ? records.slice(-cfg.window) : records)
          .map(a => auditCorrection(a.outcome, assumed));
        if (memory === "exponential") {
          weight = samples.reduce((last, observation) => last + cfg.alpha * (observation - last), cfg.baseRate);
        } else {
          weight = (cfg.priorStrength * cfg.baseRate + samples.reduce((a,b) => a+b,0)) /
            (cfg.priorStrength + samples.length);
        }
      }
      result[id].push(Number(suspect[time] !== alternative[time] && clamp(weight) <= cfg.controlRate + cfg.tolerance));
    }
  }
  return result;
}

export function studyHistories(cfg, environment) {
  const random = seeded(cfg.confirmatorySeed);
  return Array.from({length:cfg.histories}, () => {
    const history = drawHistory(random, cfg, environment);
    const routes = comparePolicies(history, cfg, environment.accuracy);
    const windows = cfg.windows;
    const losses = Object.fromEntries(Object.entries(routes).map(([policy, choices]) => {
      const bits = choices.map((route,t) => +(history.truth[t] !== (route ? history.alternative[t] : history.suspect[t])));
      const counts = Object.fromEntries(Object.entries(windows).map(([name,[start,end]]) =>
        [name, bits.slice(start,end).reduce((a,b) => a+b, 0)]));
      return [policy, {incorrect:counts, route:choices.join("")}];
    }));
    return {truth:history.truth.join(""), suspect:history.suspect.join(""), alternative:history.alternative.join(""),
      audits:history.audits.map(({event,arrival,outcome}) => [event,arrival,outcome]), losses};
  });
}

export function summarizeContrast(rows, window, coefficients, cfg) {
  const steps = cfg.windows[window][1] - cfg.windows[window][0];
  const ids = Object.keys(coefficients);
  const weights = Object.values(coefficients);
  const delta = rows.map(h => dot(ids.map(id => h.losses[id].incorrect[window]), weights));
  const n = delta.length;
  const sum = delta.reduce((a,b) => a+b,0);
  const squares = delta.reduce((a,b) => a+b*b,0);
  const mean = sum / n;
  const se = Math.sqrt((n*squares - sum*sum) / (n*n*(n-1))) / steps;
  return {n, steps, sum, squares, estimate:mean/steps, se,
    interval95:[mean/steps-cfg.critical*se,mean/steps+cfg.critical*se]};
}
