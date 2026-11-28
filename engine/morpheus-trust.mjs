import { createRecord } from './memory.mjs';
import { seeded } from './echo.mjs';
import { Moments } from './statistics.mjs';

export function buildTrustHistory(rng, cfg, regime, auditDelay) {
  const truth = [];
  const arrivals = Array.from({ length: cfg.steps }, () => []);
  const feedback = Array.from({ length: cfg.steps }, () => []);
  let state = Number(rng() < 0.5);
  for (let t = 0; t < cfg.steps; t++) {
    if (cfg.changes.includes(t)) state = 1 - state;
    truth.push(state);
    for (let i = 0; i < cfg.sourceReliability.length; i++) {
      const [available, good, lag, verified] = [rng(), rng(), rng(), rng()];
      if (available >= cfg.reportAvailability[i]) continue;
      const delay = cfg.delayThresholds.filter(threshold => lag >= threshold).length;
      const received = t + delay;
      if (received >= cfg.steps) continue;
      const failure = regime === 'burst' && i === cfg.burst.source && t >= cfg.burst.from && t < cfg.burst.to;
      const reliability = failure ? cfg.burst.reliability : cfg.sourceReliability[i];
      const accurate = Number(good < reliability);
      const value = accurate ? state : 1 - state;
      const source = String(i);
      const id = t + ':' + source;
      arrivals[received].push(createRecord({
        recordId: id, agentId: 'observer', eventTime: t, ingestionTime: received, sourceId: source,
        topic: 'state', kind: 'fact', value, evidenceClass: 'secondary_report', confidence: 0.5,
      }));
      if (verified < cfg.auditChance && received + auditDelay < cfg.steps) {
        feedback[received + auditDelay].push({ eventTime: t, id, source: i, correct: accurate });
      }
    }
  }
  return { truth, arrivals, feedback };
}

function readAnswers(history, cfg) {
  const latest = Array(cfg.memoryBudget).fill(null);
  const feedback = latest.map(() => ({ cumulative: 0, correct: 0, tail: [] }));
  const predictions = Object.fromEntries(cfg.policies.map(p => [p, []]));
  for (let t = 0; t < history.arrivals.length; t++) {
    for (const record of history.arrivals[t]) {
      const i = Number(record.sourceId);
      if (!latest[i] || record.eventTime > latest[i].eventTime) latest[i] = record;
    }
    for (const observation of history.feedback[t]) {
      if (observation.eventTime >= t) throw new Error('Non-delayed feedback');
      const entry = feedback[observation.source];
      entry.cumulative++;
      entry.correct += observation.correct;
      entry.tail.push(observation.correct);
      if (entry.tail.length > cfg.feedbackWindow) entry.tail.shift();
    }
    const candidates = latest.filter(r => r && t - r.eventTime <= cfg.maxReportAge);
    const newest = candidates.reduce((a, b) => !a || b.eventTime > a.eventTime ? b : a, null);
    predictions.recency.push(newest ? newest.content.value : null);
    for (const policy of cfg.policies.filter(m => m !== 'recency')) {
      let evidence = 0;
      for (const report of candidates) {
        const i = Number(report.sourceId);
        const observed = feedback[i];
        const base = cfg.sourceReliability[i];
        const age = t - report.eventTime;
        let reputation = base;
        if (policy === 'cumulativeAge') {
          reputation = (cfg.priorStrength * base + observed.correct) / (cfg.priorStrength + observed.cumulative);
        }
        if (policy === 'rollingAge') {
          const successes = observed.tail.reduce((a, b) => a + b, 0);
          reputation = (cfg.priorStrength * base + successes) / (cfg.priorStrength + observed.tail.length);
        }
        const p = Math.max(0.5, Math.min(cfg.maximumReliability, reputation));
        const temper = policy === 'static' ? 1 : cfg.ageFactor ** age;
        evidence += (report.content.value ? 1 : -1) * Math.log(p / (1 - p)) * temper;
      }
      predictions[policy].push(Math.abs(evidence) < 1e-12 ? null : Number(evidence > 0));
    }
  }
  return predictions;
}

function windows(cfg) {
  const range = (a, b) => Array.from({ length: b - a }, (_, i) => i + a);
  return {
    full: range(0, cfg.steps),
    duringBurst: range(cfg.burst.from, cfg.burst.to),
    adaptation: cfg.changes.flatMap(s => range(s, s + cfg.adaptationWindow)),
    recovery: range(cfg.burst.to, cfg.burst.to + cfg.recoveryWindow),
    stable: range(0, cfg.steps).filter(t => !cfg.changes.some(s => t >= s && t < s + cfg.adaptationWindow)),
  };
}

function evaluate(history, cfg, measures) {
  // The estimator receives only report arrivals and delayed verification bits.
  const decisions = readAnswers({ arrivals: history.arrivals, feedback: history.feedback }, cfg);
  const count = Object.fromEntries(cfg.policies.map(policy => [policy,
    Object.fromEntries(Object.entries(measures).map(([name, steps]) => [name, {
      correct: steps.filter(t => decisions[policy][t] === history.truth[t]).length,
      decided: steps.filter(t => decisions[policy][t] !== null).length,
    }]))]));
  return { count, decisions };
}

export function runTrust(cfg, development = false) {
  if (cfg.sourceReliability.length !== cfg.memoryBudget || cfg.burst.to + cfg.recoveryWindow > cfg.steps) {
    throw new Error('Research budget or observation window does not fit');
  }
  const count = development ? 4 : cfg.histories;
  const seed = development ? cfg.developmentSeed : cfg.seed;
  const measures = windows(cfg);
  const arms = {};
  for (const delay of cfg.auditDelays) {
    for (const regime of cfg.regimes) {
      const rng = seeded(seed);
      const histories = [];
      let first;
      for (let i = 0; i < count; i++) {
        const history = buildTrustHistory(rng, cfg, regime, delay);
        const evaluated = evaluate(history, cfg, measures);
        histories.push(evaluated.count);
        if (i === 0) first = {
          truth: history.truth, decisions: evaluated.decisions,
          reportCount: history.arrivals.flat().length, auditCount: history.feedback.flat().length,
        };
      }
      const summary = {};
      const paired = {};
      for (const [name, steps] of Object.entries(measures)) {
        const n = steps.length;
        for (const policy of cfg.policies) {
          const totals = histories.reduce((whole, row) =>
            [whole[0] + row[policy][name].correct, whole[1] + row[policy][name].decided], [0, 0]);
          (summary[policy] ??= {})[name] = { correct: totals[0], decided: totals[1],
            questions: n * count, accuracy: totals[0] / (n * count), coverage: totals[1] / (n * count) };
        }
        const diff = new Moments();
        for (const row of histories) {
          diff.add((row.rollingAge[name].correct - row.staticAge[name].correct) / n);
        }
        paired[name] = diff.summary(1.959963984540054, -1, 1);
      }
      arms[regime + ':' + delay] = { summary, paired, first, histories };
    }
  }
  return { id: cfg.id, evidenceClass: cfg.evidenceClass, seed, historiesPerArm: count,
    windows: Object.fromEntries(Object.entries(measures).map(([k, a]) => [k, a.length])),
    primary: cfg.primary, arms };
}
