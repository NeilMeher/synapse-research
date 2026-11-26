// NOESIS: Artificial Scientific Discovery Laboratory
// Evaluates active vs passive inquiry strategies for discovering hidden governing laws.

import { seeded } from "./echo.mjs";
import { Moments } from "./statistics.mjs";
import {
  FAMILIES,
  GRID_POINTS,
  TEST_GRID,
  evaluateBasis,
  evaluateEnsemble,
  computeDisagreementGrid,
  computeUncertaintyGrid,
  predict,
} from "./discovery.mjs";

export const ARMS = Object.freeze([
  "random",
  "uniform_grid",
  "active_uncertainty",
  "active_ig",
]);

export function sampleStandardNormal(random) {
  let u1 = random();
  while (u1 <= 1e-15) u1 = random();
  const u2 = random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Deterministic space-filling grid sequence for passive uniform sampling.
 */
export function getUniformGridPoint(step, budget, grid = GRID_POINTS) {
  // Equispaced indices across the grid
  if (budget <= 1) return grid[0];
  const idx = Math.min(
    grid.length - 1,
    Math.round((step * (grid.length - 1)) / (budget - 1))
  );
  return grid[idx];
}

/**
 * Execute an inquiry episode for a given arm on a specified ground-truth law.
 */
export function runEpisode(armId, groundTruth, budget, noiseSigma, randomArm) {
  const { family: trueFamily, params: trueParams } = groundTruth;
  const observations = [];
  const trace = [];

  // Observation generator
  const observe = (x, noiseVal) => {
    const phi = evaluateBasis(trueFamily, x);
    const yExact = phi[0] * trueParams[0] + phi[1] * trueParams[1] + phi[2] * trueParams[2];
    const y = yExact + noiseVal;
    return { x, y, yExact };
  };

  // Step 0: Initial seed observation at x = 0.0 with noise 0
  const initObs = observe(0.0, 0.0);
  observations.push(initObs);

  let currentEnsemble = evaluateEnsemble(observations, 1.0, 1.0 / (noiseSigma * noiseSigma));
  trace.push({
    step: 0,
    x: 0.0,
    y: initObs.y,
    bestFamily: currentEnsemble.bestFamily,
    bestProb: currentEnsemble.bestProb,
    posteriors: { ...currentEnsemble.posteriorByFamily },
  });

  // Steps 1 to budget - 1
  for (let step = 1; step < budget; step++) {
    let chosenX = 0.0;
    if (armId === "random") {
      const idx = Math.floor(randomArm() * GRID_POINTS.length);
      chosenX = GRID_POINTS[idx];
    } else if (armId === "uniform_grid") {
      chosenX = getUniformGridPoint(step, budget, GRID_POINTS);
    } else if (armId === "active_uncertainty") {
      const uGrid = computeUncertaintyGrid(currentEnsemble, GRID_POINTS);
      let maxU = -Infinity;
      let bestX = GRID_POINTS[0];
      for (const pt of uGrid) {
        if (pt.uncertainty > maxU + 1e-12) {
          maxU = pt.uncertainty;
          bestX = pt.x;
        }
      }
      chosenX = bestX;
    } else if (armId === "active_ig") {
      const dGrid = computeDisagreementGrid(currentEnsemble, GRID_POINTS);
      let maxD = -Infinity;
      let bestX = GRID_POINTS[0];
      for (const pt of dGrid) {
        if (pt.disagreement > maxD + 1e-12) {
          maxD = pt.disagreement;
          bestX = pt.x;
        }
      }
      chosenX = bestX;
    } else {
      throw new Error(`Unknown NOESIS arm: ${armId}`);
    }

    const noise = sampleStandardNormal(randomArm) * noiseSigma;
    const obs = observe(chosenX, noise);
    observations.push(obs);

    currentEnsemble = evaluateEnsemble(
      observations,
      1.0,
      1.0 / (noiseSigma * noiseSigma)
    );

    trace.push({
      step,
      x: chosenX,
      y: obs.y,
      bestFamily: currentEnsemble.bestFamily,
      bestProb: currentEnsemble.bestProb,
      posteriors: { ...currentEnsemble.posteriorByFamily },
    });
  }

  // Final evaluation metrics
  const bestFam = currentEnsemble.bestFamily;
  const recovered = bestFam === trueFamily ? 1.0 : 0.0;
  const postAtTruth = currentEnsemble.posteriorByFamily[trueFamily] ?? 0.0;
  const logLoss = -Math.log(Math.max(postAtTruth, 1e-12));

  // Held-out test RMSE
  const bestModel = currentEnsemble.fitted.find((f) => f.family === bestFam);
  let sumSq = 0.0;
  for (const x of TEST_GRID) {
    const phi = evaluateBasis(trueFamily, x);
    const yTrue = phi[0] * trueParams[0] + phi[1] * trueParams[1] + phi[2] * trueParams[2];
    const yPred = predict(bestModel, x, noiseSigma * noiseSigma).mean;
    const diff = yTrue - yPred;
    sumSq += diff * diff;
  }
  const testRmse = Math.sqrt(sumSq / TEST_GRID.length);

  return {
    metrics: {
      family_recovery: recovered,
      posterior_at_truth: postAtTruth,
      log_loss: logLoss,
      test_rmse: testRmse,
    },
    trace,
    observations,
    finalEnsemble: {
      bestFamily: currentEnsemble.bestFamily,
      posteriors: currentEnsemble.posteriorByFamily,
    },
  };
}

/**
 * Main simulation runner for NOESIS.
 */
export function runNoesis(config, tick = () => {}) {
  const {
    id,
    phase,
    seed,
    trials = 250,
    budget = 8,
    noiseSigma = 0.20,
  } = config;

  const random = seeded(seed);

  const arms = ARMS.map((armId) => ({
    id: armId,
    scores: new Map([
      ["family_recovery", new Moments()],
      ["posterior_at_truth", new Moments()],
      ["log_loss", new Moments()],
      ["test_rmse", new Moments()],
    ]),
    replay: null,
  }));

  const activeMinusRandomContrast = new Moments();
  const activeMinusUniformContrast = new Moments();

  for (let trial = 0; trial < trials; trial++) {
    tick();

    // Generate ground truth law
    const famIdx = Math.floor(random() * FAMILIES.length);
    const trueFamily = FAMILIES[famIdx];
    // Scale parameters so functions have notable distinct geometry
    const p0 = sampleStandardNormal(random) * 1.0;
    const p1 = sampleStandardNormal(random) * 1.2;
    const p2 = sampleStandardNormal(random) * 1.2;
    const groundTruth = { family: trueFamily, params: [p0, p1, p2] };

    // To ensure fair paired comparison across arms, generate independent pseudo-streams per arm
    // or seed each arm's random choice deterministically from trial seed
    const armRecovery = new Map();

    for (const arm of arms) {
      // Deterministic arm seed offset
      const armSeed = ((seed + trial * 7919 + ARMS.indexOf(arm.id) * 997) >>> 0) || 1;
      const randomArm = seeded(armSeed);

      const { metrics, trace, observations, finalEnsemble } = runEpisode(
        arm.id,
        groundTruth,
        budget,
        noiseSigma,
        randomArm
      );

      if (trial === 0) {
        arm.replay = {
          groundTruth,
          trace,
          observations,
          finalEnsemble,
        };
      }

      armRecovery.set(arm.id, metrics.family_recovery);

      for (const [key, value] of Object.entries(metrics)) {
        arm.scores.get(key).add(value);
      }
    }

    const activeRec = armRecovery.get("active_ig");
    const randomRec = armRecovery.get("random");
    const uniformRec = armRecovery.get("uniform_grid");

    activeMinusRandomContrast.add(activeRec - randomRec);
    activeMinusUniformContrast.add(activeRec - uniformRec);
  }

  // Bonferroni critical value for 2 contrasts at alpha=0.05
  const zCrit = 2.241402727604947;

  return {
    schemaVersion: "noesis-v1",
    modelVersion: "noesis-discovery-v1",
    evidenceClass: "synthetic simulation",
    config,
    contrasts: [
      {
        id: "active_ig_minus_random_recovery",
        ...activeMinusRandomContrast.summary(zCrit, -1.0, 1.0),
      },
      {
        id: "active_ig_minus_uniform_recovery",
        ...activeMinusUniformContrast.summary(zCrit, -1.0, 1.0),
      },
    ],
    arms: arms.map(({ id: armId, scores, replay }) => {
      const metrics = Object.fromEntries(
        [...scores].map(([key, m]) => [
          key,
          m.summary(1.959963984540054, -100.0, 100.0),
        ])
      );
      return {
        id: armId,
        metrics,
        replay,
      };
    }),
  };
}
