import assert from "node:assert/strict";
import {test} from "node:test";
import {
  analyticMajority, defaults, drawTask, evidence, exactPosterior, influence, replay, seeded,
  step, terminalWeights, topologies, validateMatrix, validateScenario,
} from "../engine/echo.mjs";
import {canonical, validateExperiment} from "../engine/contracts.mjs";
import {experiment} from "../engine/experiment.mjs";
import {Moments} from "../engine/statistics.mjs";

const close = (actual, expected, tolerance = 1e-12) => assert.ok(
  Math.abs(actual - expected) < tolerance, actual + " differs from " + expected);
const rowMean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

test("one seed fixes the first task and replay events", () => {
  const random = seeded(20261127);
  close(random(), 0.5312688171397895);
  assert.deepEqual(replay(defaults), replay(defaults));
  const run = replay(defaults);
  assert.equal(run.frames.length, defaults.rounds + 1);
  for (let i = 1; i < run.frames.length; i++) {
    assert.deepEqual(run.frames[i].beliefs, step(run.frames[i - 1].beliefs, run.weights, "degroot", 0.2));
  }
});

test("shared endpoints preserve marginals, while fresh signals retain their own stream", () => {
  const task = {truth: 1, mixture: 0.6, common: 0.9, tie: 1,
    privateDraws: [0.1, 0.9, 0.2], freshDraws: [0.9, 0.9, 0.2]};
  assert.deepEqual(evidence(task, 0.68, 0).map(item => item.signal), [1, 0, 1]);
  assert.deepEqual(evidence(task, 0.68, 1).map(item => item.signal), [0, 0, 0]);
  assert.deepEqual(evidence(task, 0.68, 1, 1), [
    {signal: 0, source: "shared"}, {signal: 0, source: "shared"}, {signal: 1, source: "verified"},
  ]);
  const random = seeded(8012);
  const a = new Moments();
  const b = new Moments();
  const both = new Moments();
  for (let i = 0; i < 12000; i++) {
    const draw = drawTask(random, 3);
    const reports = evidence(draw, 0.68, 0.75, 1);
    const x = Number(reports[0].signal === draw.truth);
    const y = Number(reports[1].signal === draw.truth);
    a.add(x);
    b.add(y);
    both.add(x * y);
  }
  close(a.mean, 0.68, 0.015);
  close(b.mean, 0.68, 0.015);
  close((both.mean - a.mean * b.mean) / Math.sqrt(a.mean * (1-a.mean) * b.mean * (1-b.mean)), 0.75, 0.025);
});

test("stochastic averaging preserves constants and bounds", () => {
  for (const topology of topologies) {
    const matrix = influence(5, topology);
    validateMatrix(matrix, 5);
    step(Array(5).fill(0.6), matrix, "degroot", 0.2).forEach(value => close(value, 0.6));
    for (const method of ["degroot", "bounded"]) {
      const run = replay({...defaults, agents: 5, topology, method});
      assert.ok(run.frames.every(frame => frame.beliefs.every(value => value >= 0.32 - 1e-12 && value <= 0.68 + 1e-12)));
    }
  }
  assert.throws(() => validateMatrix([[0.7, 0.6], [0.5, 0.5]], 2), /stochastic/);
});

test("complete consensus, mean preservation, and hub influence match independent formulas", () => {
  const initial = [0.1, 0.9, 0.4, 0.2, 0.7];
  const complete = step(initial, influence(5, "complete"), "degroot", 0);
  complete.forEach(value => close(value, 0.46));
  const ring = influence(5, "ring");
  close(rowMean(step(initial, ring, "degroot", 0)), 0.46);
  const hub = influence(5, "hub");
  close(terminalWeights(hub, 50)[0], 2 / 3);
  let evolved = initial;
  for (let round = 0; round < 12; round++) evolved = step(evolved, hub, "degroot", 0);
  const reduced = terminalWeights(hub, 12).reduce((sum, value, index) => sum + value * initial[index], 0);
  close(rowMean(evolved), reduced);
});

test("bounded confidence preserves separated opinions and matches DeGroot at radius one", () => {
  const matrix = influence(3, "complete");
  const initial = [0.1, 0.6, 0.7];
  const actual = step(initial, matrix, "bounded", 0.2);
  [0.1, 0.65, 0.65].forEach((expected, i) => close(actual[i], expected));
  step(initial, matrix, "bounded", 1).forEach((value, i) =>
    close(value, step(initial, matrix, "degroot", 1)[i]));
});

test("Bayesian and majority analytical edge cases", () => {
  const q = 0.68;
  close(exactPosterior([1, 1, 0], q, 0), q);
  close(exactPosterior([1, 1, 1], q, 1), q);
  close(exactPosterior([1, 1, 1], q, 1, 1), q*q / (q*q + (1-q)*(1-q)));
  close(exactPosterior([1, 1, 1], q, 1, 3), q**3 / (q**3 + (1-q)**3));
  assert.throws(() => exactPosterior([1, 0, 1], q, 1), /impossible/);
  close(analyticMajority(3, q, 0.75), 0.25 * (q ** 3 + 3 * q ** 2 * (1-q)) + 0.75 * q);
  close(analyticMajority(2, q, 0.25), q);
});

test("uncertainty derives from task-level moments", () => {
  const sample = new Moments();
  assert.throws(() => sample.summary(), /two independent/);
  [0, 0, 1, 1].forEach(value => sample.add(value));
  close(sample.summary().estimate, 0.5);
  close(sample.summary().sd, Math.sqrt(1 / 3));
});

test("versioned configuration rejects invalid types, duplicate grid points, and unbounded work", () => {
  assert.throws(() => validateScenario({...defaults, seed: "1"}), /bounds/);
  assert.throws(() => validateScenario({...defaults, verified: 41}), /bounds/);
  assert.throws(() => validateScenario({...defaults, unsupported: ""}), /fields/);
  const config = {experimentId: "echo-small", protocol: "echo-pilot-v1", mode: "pilot",
    trials: 20, correlations: [0, 0.75, 1], scenario: defaults};
  assert.throws(() => validateExperiment({...config, correlations: [0, 0, 0.75]}), /Invalid/);
  assert.throws(() => validateExperiment({...config, trials: 100001}), /Invalid/);
  assert.equal(canonical(experiment(config)), canonical(experiment(config)));
  assert.throws(() => experiment(config, () => {throw new Error("budget");}), /budget/);
});
