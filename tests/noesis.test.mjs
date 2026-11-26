import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBasis,
  detSym3,
  invertSym3,
  fitBayesianModel,
  evaluateEnsemble,
  predict,
  computeDisagreementGrid,
  FAMILIES,
} from "../engine/discovery.mjs";
import { runNoesis, sampleStandardNormal, getUniformGridPoint } from "../engine/noesis.mjs";
import { seeded } from "../engine/echo.mjs";

test("evaluateBasis returns expected mathematical values for each family", () => {
  const x = 0.5;
  const poly = evaluateBasis("poly", x);
  assert.deepEqual(poly, [1.0, 0.5, 0.25]);

  const harm = evaluateBasis("harm", x);
  assert.equal(harm[0], 1.0);
  assert.ok(Math.abs(harm[1] - Math.sin(Math.PI * 0.5)) < 1e-12);
  assert.ok(Math.abs(harm[2] - Math.cos(Math.PI * 0.5)) < 1e-12);

  const exp = evaluateBasis("exp", x);
  assert.equal(exp[0], 1.0);
  assert.ok(Math.abs(exp[1] - Math.exp(-0.25)) < 1e-12);
  assert.ok(Math.abs(exp[2] - Math.exp(-0.5)) < 1e-12);

  const rat = evaluateBasis("rat", x);
  assert.equal(rat[0], 1.0);
  assert.ok(Math.abs(rat[1] - 1.0 / 1.25) < 1e-12);
  assert.ok(Math.abs(rat[2] - 0.5 / 1.25) < 1e-12);
});

test("invertSym3 accurately inverts 3x3 symmetric positive-definite matrices", () => {
  // Identity matrix
  const { det, inv } = invertSym3(1, 0, 0, 1, 0, 1);
  assert.equal(det, 1.0);
  assert.deepEqual(inv, [1, 0, 0, 1, 0, 1]);

  // General symmetric positive-definite matrix
  // A = [[4, 1, 0.5], [1, 3, 0.2], [0.5, 0.2, 2]]
  const a00 = 4, a01 = 1, a02 = 0.5, a11 = 3, a12 = 0.2, a22 = 2;
  const res = invertSym3(a00, a01, a02, a11, a12, a22);
  assert.ok(res.det > 0);

  const [s00, s01, s02, s11, s12, s22] = res.inv;
  // Check A * A^-1 == I
  const p00 = a00 * s00 + a01 * s01 + a02 * s02;
  const p01 = a00 * s01 + a01 * s11 + a02 * s12;
  const p02 = a00 * s02 + a01 * s12 + a02 * s22;
  const p11 = a01 * s01 + a11 * s11 + a12 * s12;
  const p22 = a02 * s02 + a12 * s12 + a22 * s22;

  assert.ok(Math.abs(p00 - 1.0) < 1e-12, `p00 = ${p00}`);
  assert.ok(Math.abs(p01 - 0.0) < 1e-12, `p01 = ${p01}`);
  assert.ok(Math.abs(p02 - 0.0) < 1e-12, `p02 = ${p02}`);
  assert.ok(Math.abs(p11 - 1.0) < 1e-12, `p11 = ${p11}`);
  assert.ok(Math.abs(p22 - 1.0) < 1e-12, `p22 = ${p22}`);
});

test("fitBayesianModel recovers generating parameters on noiseless polynomial data", () => {
  // True polynomial: y = 2.0 - 1.5 * x + 0.8 * x^2
  const trueTheta = [2.0, -1.5, 0.8];
  const observations = [-1.5, -0.8, 0.0, 0.7, 1.4].map((x) => {
    const y = trueTheta[0] + trueTheta[1] * x + trueTheta[2] * x * x;
    return { x, y };
  });

  const model = fitBayesianModel("poly", observations, 0.01, 1000.0);
  assert.ok(Math.abs(model.mN[0] - trueTheta[0]) < 0.01);
  assert.ok(Math.abs(model.mN[1] - trueTheta[1]) < 0.01);
  assert.ok(Math.abs(model.mN[2] - trueTheta[2]) < 0.01);
});

test("evaluateEnsemble assigns highest posterior probability to the true generating family", () => {
  // True harmonic function: y = 1.0 + 2.0 * sin(pi*x) - 1.5 * cos(pi*x)
  const observations = [-1.8, -1.2, -0.5, 0.0, 0.5, 1.2, 1.8].map((x) => {
    const phi = evaluateBasis("harm", x);
    const y = phi[0] * 1.0 + phi[1] * 2.0 + phi[2] * -1.5;
    return { x, y };
  });

  const ensemble = evaluateEnsemble(observations, 1.0, 25.0);
  assert.equal(ensemble.bestFamily, "harm");
  assert.ok(ensemble.bestProb > 0.90, `Posterior for harm was ${ensemble.bestProb}`);
});

test("computeDisagreementGrid peaks at regions of maximum theoretical variance", () => {
  const observations = [{ x: 0.0, y: 1.0 }];
  const ensemble = evaluateEnsemble(observations, 1.0, 25.0);
  const grid = computeDisagreementGrid(ensemble);
  assert.equal(grid.length, 21);
  // At x = 0, all models predict 1.0 * m0, so disagreement near 0 is lower than at the boundaries
  const centerD = grid.find((pt) => Math.abs(pt.x) < 1e-6).disagreement;
  const edgeD = grid.find((pt) => Math.abs(pt.x - 2.0) < 1e-6).disagreement;
  assert.ok(edgeD > centerD, `Expected boundary disagreement (${edgeD}) > center disagreement (${centerD})`);
});

test("runNoesis produces deterministic results and strictly respects budgets", () => {
  const config = {
    id: "noesis-test-001",
    phase: "pilot",
    seed: 20261127,
    trials: 10,
    budget: 8,
    noiseSigma: 0.20,
  };

  const run1 = runNoesis(config);
  const run2 = runNoesis(config);

  assert.deepEqual(run1.contrasts, run2.contrasts);
  assert.equal(run1.arms.length, 4);
  for (const arm of run1.arms) {
    assert.equal(arm.replay.observations.length, 8);
    assert.ok(arm.metrics.family_recovery.estimate >= 0 && arm.metrics.family_recovery.estimate <= 1);
  }
});
