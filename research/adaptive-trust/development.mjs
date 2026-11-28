import {createHash} from "node:crypto";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {seeded} from "../../engine/echo.mjs";
import {betaReliability, filterReliability} from "../../engine/adaptive-trust.mjs";

const fixture = new URL("development.json", import.meta.url);
const config = JSON.parse(readFileSync(fixture));
const archive = new URL("../evidence/" + config.id + "/", import.meta.url);
const policies = ["static", "cumulative", "rolling", ...config.ewma.map(a => "ewma_" + a), "markov"];
const windows = {all: [0, config.steps], before: [0, config.failureStart],
  affected: [config.failureStart, config.restoredAt], recovery: [config.restoredAt, config.recoveryEnd]};

function rateAt(t, environment) {
  if (environment.regime === "clean" || t < config.failureStart || t >= config.restoredAt) return config.baseRate;
  if (environment.regime === "burst") return config.faultRate;
  const progress = (t - config.failureStart + 1) / (config.restoredAt - config.failureStart);
  return config.baseRate + (config.faultRate - config.baseRate) * progress;
}

function history(rng, environment) {
  const truth = [], reports = [], audits = [];
  for (let time = 0; time < config.steps; time++) {
    const [state, suspect, control, audited, flip, late] = Array.from({length: 6}, rng);
    const stateBit = Number(state < .5);
    const correct = Number(suspect < rateAt(time, environment));
    truth.push(stateBit);
    reports.push([correct ? stateBit : 1 - stateBit, control < config.controlRate ? stateBit : 1 - stateBit]);
    if (audited < config.auditProbability) {
      const arrival = time + config.auditDelay + (late < environment.lateProbability ? config.extraAuditDelay : 0);
      audits.push({event: time, arrival, outcome: flip < environment.auditAccuracy ? correct : 1 - correct});
    }
  }
  return {truth, reports, audits};
}

function decide({reports, audits}) {
  const byArrival = new Map();
  for (const audit of audits) {
    if (!byArrival.has(audit.arrival)) byArrival.set(audit.arrival, []);
    byArrival.get(audit.arrival).push(audit);
  }
  const available = [], tail = [];
  const means = config.ewma.map(() => config.baseRate);
  const route = Object.fromEntries(policies.map(policy => [policy, []]));
  let successes = 0;
  const estimate = (correct, total) => betaReliability({
    a: config.baseRate * config.priorStrength, b: (1 - config.baseRate) * config.priorStrength,
    successes: correct, failures: total - correct,
  }).mean;
  for (const [time, [suspect, control]] of reports.entries()) {
    for (const audit of byArrival.get(time) ?? []) {
      available.push(audit);
      tail.push(audit.outcome);
      if (tail.length > config.rollingLength) tail.shift();
      successes += audit.outcome;
      for (const [i, a] of config.ewma.entries()) means[i] += a * (audit.outcome - means[i]);
    }
    const weights = [config.baseRate, estimate(successes, available.length),
      estimate(tail.reduce((sum, bit) => sum + bit, 0), tail.length), ...means,
      filterReliability(config.regime, time, available).reliability];
    for (const [i, policy] of policies.entries()) {
      const controlOnDisagreement = suspect !== control && weights[i] <= config.controlRate + 1e-12;
      route[policy].push(Number(controlOnDisagreement));
    }
  }
  return route;
}

function evaluate(h, route) {
  return Object.fromEntries(policies.map(policy => [policy,
    Object.fromEntries(Object.entries(windows).map(([name, [from, to]]) => {
      let incorrect = 0, control = 0, disagreements = 0;
      for (let t = from; t < to; t++) {
        incorrect += Number(h.reports[t][route[policy][t]] !== h.truth[t]);
        control += route[policy][t];
        disagreements += Number(h.reports[t][0] !== h.reports[t][1]);
      }
      return [name, {incorrect, control, disagreements, steps: to - from}];
    }))]));
}

function development() {
  const env = {};
  for (const environment of config.environments) {
    const rng = seeded(config.seed);
    const histories = Array.from({length: config.historiesPerEnvironment}, () => {
      const h = history(rng, environment);
      const route = decide({reports:h.reports, audits:h.audits});
      return {...h, route, loss: evaluate(h, route)};
    });
    const totals = {};
    for (const policy of policies) {
      totals[policy] = {};
      for (const w of Object.keys(windows)) {
        const keys = ["incorrect", "control", "disagreements", "steps"];
        const tally = Object.fromEntries(keys.map(k => [k, histories.reduce((sum, row) => sum + row.loss[policy][w][k], 0)]));
        const paired = histories.map(row => row.loss[policy][w].incorrect - row.loss.static[w].incorrect);
        totals[policy][w] = {...tally, pairedIncorrectDelta: paired.reduce((a,b) => a+b, 0),
          pairedHistoryRange: [Math.min(...paired), Math.max(...paired)]};
      }
    }
    env[environment.id] = {histories, totals};
  }
  return {id: config.id, evidence: config.evidence, stage: config.stage, environment: env};
}

const encode = value => Buffer.from(JSON.stringify(value) + "\n");
const digest = content => ({bytes: content.length, sha256: createHash("sha256").update(content).digest("hex")});
const [mode, revision] = process.argv.slice(2);
if (!["run", "verify"].includes(mode)) throw new Error("Use run or verify.");
const manifestURL = new URL("manifest.json", archive);
const protocolCommit = mode === "run" ? revision : JSON.parse(readFileSync(manifestURL)).protocolCommit;
if (!/^[a-f0-9]{40}$/.test(protocolCommit)) throw new Error("A frozen protocol commit is required.");
const start = performance.now();
const payload = encode(development());
const manifest = {id:config.id, evidence:config.evidence, stage:config.stage, status:"completed",
  protocolCommit, protocol:digest(readFileSync(fixture)), outputs:{"histories.json":digest(payload)}};
if (mode === "run") mkdirSync(archive);
for (const [name, bytes] of [["histories.json",payload],["manifest.json",encode(manifest)]]) {
  const url = new URL(name, archive);
  if (mode === "run") writeFileSync(url, bytes, {flag:"wx"});
  else if (!readFileSync(url).equals(bytes)) throw new Error("Archive differs: " + name);
}
console.log(`Verified ${config.historiesPerEnvironment * config.environments.length} paired histories across ${policies.length} policies in ${(performance.now()-start).toFixed(1)} ms.`);
