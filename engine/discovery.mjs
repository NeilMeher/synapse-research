// Pure numerical engine for scientific law spaces, exact Bayesian linear regression,
// evidence evaluation, and active experimental inquiry.

export const FAMILIES = Object.freeze(["poly", "harm", "exp", "rat"]);

export const GRID_POINTS = Object.freeze(
  Array.from({ length: 21 }, (_, i) => Number((-2.0 + i * 0.2).toFixed(2)))
);

export const TEST_GRID = Object.freeze(
  Array.from({ length: 41 }, (_, i) => Number((-2.0 + i * 0.1).toFixed(2)))
);

/**
 * Evaluate basis functions phi_m(x) for family m.
 * Returns array of length 3: [phi_0, phi_1, phi_2].
 */
export function evaluateBasis(family, x) {
  switch (family) {
    case "poly":
      return [1.0, x, x * x];
    case "harm":
      return [1.0, Math.sin(Math.PI * x), Math.cos(Math.PI * x)];
    case "exp":
      return [1.0, Math.exp(-x * x), Math.exp(-Math.abs(x))];
    case "rat": {
      const denom = 1.0 + x * x;
      return [1.0, 1.0 / denom, x / denom];
    }
    default:
      throw new Error(`Unknown model family: ${family}`);
  }
}

/**
 * Determinant of symmetric 3x3 matrix [[a00, a01, a02], [a01, a11, a12], [a02, a12, a22]].
 */
export function detSym3(a00, a01, a02, a11, a12, a22) {
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a02 * a12 - a01 * a22;
  const c02 = a01 * a12 - a02 * a11;
  return a00 * c00 + a01 * c01 + a02 * c02;
}

/**
 * Invert a symmetric positive-definite 3x3 matrix.
 * Returns { inv, det } where inv has elements [c00, c01, c02, c11, c12, c22] / det.
 */
export function invertSym3(a00, a01, a02, a11, a12, a22) {
  const c00 = a11 * a22 - a12 * a12;
  const c01 = a02 * a12 - a01 * a22;
  const c02 = a01 * a12 - a02 * a11;
  const c11 = a00 * a22 - a02 * a02;
  const c12 = a01 * a02 - a00 * a12;
  const c22 = a00 * a11 - a01 * a01;
  const det = a00 * c00 + a01 * c01 + a02 * c02;
  if (det <= 0 || !Number.isFinite(det)) {
    throw new Error(`Non-positive or non-finite determinant in invertSym3: ${det}`);
  }
  const invDet = 1.0 / det;
  return {
    det,
    inv: [
      c00 * invDet,
      c01 * invDet,
      c02 * invDet,
      c11 * invDet,
      c12 * invDet,
      c22 * invDet,
    ],
  };
}

/**
 * Exact Bayesian Linear Regression state for a model family.
 * Prior: theta ~ N(0, alpha^-1 I_3)
 * Likelihood: y ~ N(phi(x)^T theta, beta^-1)
 */
export function fitBayesianModel(family, observations, alpha = 1.0, beta = 25.0) {
  const n = observations.length;
  // Initialize precision matrix S_0^-1 = alpha * I_3
  let a00 = alpha;
  let a01 = 0.0;
  let a02 = 0.0;
  let a11 = alpha;
  let a12 = 0.0;
  let a22 = alpha;

  // b = beta * Phi^T y
  let b0 = 0.0;
  let b1 = 0.0;
  let b2 = 0.0;

  // Precompute basis values and accumulate
  const phis = new Array(n);
  for (let i = 0; i < n; i++) {
    const { x, y } = observations[i];
    const phi = evaluateBasis(family, x);
    phis[i] = phi;
    const p0 = phi[0];
    const p1 = phi[1];
    const p2 = phi[2];

    a00 += beta * p0 * p0;
    a01 += beta * p0 * p1;
    a02 += beta * p0 * p2;
    a11 += beta * p1 * p1;
    a12 += beta * p1 * p2;
    a22 += beta * p2 * p2;

    b0 += beta * p0 * y;
    b1 += beta * p1 * y;
    b2 += beta * p2 * y;
  }

  const { det: detSnInv, inv: sInv } = invertSym3(a00, a01, a02, a11, a12, a22);
  const [s00, s01, s02, s11, s12, s22] = sInv;

  // Posterior mean m_N = S_N * b
  const m0 = s00 * b0 + s01 * b1 + s02 * b2;
  const m1 = s01 * b0 + s11 * b1 + s12 * b2;
  const m2 = s02 * b0 + s12 * b1 + s22 * b2;
  const mN = [m0, m1, m2];

  // E(m_N) = beta * sum((y_i - phi_i^T m_N)^2) + alpha * (m_N^T m_N)
  let sumSqErr = 0.0;
  for (let i = 0; i < n; i++) {
    const phi = phis[i];
    const yPred = phi[0] * m0 + phi[1] * m1 + phi[2] * m2;
    const diff = observations[i].y - yPred;
    sumSqErr += diff * diff;
  }
  const emN = beta * sumSqErr + alpha * (m0 * m0 + m1 * m1 + m2 * m2);

  // Exact log marginal likelihood:
  // ln p(y|m) = 3/2 ln alpha + N/2 ln beta - N/2 ln(2*pi) - 1/2 ln det(S_N^-1) - 1/2 E(m_N)
  const lnP =
    1.5 * Math.log(alpha) +
    0.5 * n * Math.log(beta) -
    0.5 * n * Math.log(2.0 * Math.PI) -
    0.5 * Math.log(detSnInv) -
    0.5 * emN;

  return {
    family,
    n,
    mN,
    covElements: sInv, // [s00, s01, s02, s11, s12, s22]
    detSnInv,
    emN,
    logEvidence: lnP,
  };
}

/**
 * Predictive mean and variance at query point x for fitted model.
 */
export function predict(modelState, x, noiseVar = 1.0 / 25.0) {
  const phi = evaluateBasis(modelState.family, x);
  const [m0, m1, m2] = modelState.mN;
  const mean = phi[0] * m0 + phi[1] * m1 + phi[2] * m2;

  const [s00, s01, s02, s11, s12, s22] = modelState.covElements;
  const p0 = phi[0];
  const p1 = phi[1];
  const p2 = phi[2];

  const paramVar =
    p0 * (s00 * p0 + s01 * p1 + s02 * p2) +
    p1 * (s01 * p0 + s11 * p1 + s12 * p2) +
    p2 * (s02 * p0 + s12 * p1 + s22 * p2);

  return {
    mean,
    paramVar,
    totalVar: noiseVar + paramVar,
  };
}

/**
 * Evaluate all candidate families given observations, computing posteriors.
 */
export function evaluateEnsemble(observations, alpha = 1.0, beta = 25.0) {
  const fitted = FAMILIES.map((fam) => fitBayesianModel(fam, observations, alpha, beta));

  let maxLog = -Infinity;
  for (const f of fitted) {
    if (f.logEvidence > maxLog) maxLog = f.logEvidence;
  }

  let sumExp = 0.0;
  const exps = new Array(fitted.length);
  for (let i = 0; i < fitted.length; i++) {
    const e = Math.exp(fitted[i].logEvidence - maxLog);
    exps[i] = e;
    sumExp += e;
  }

  const posteriors = exps.map((e) => e / sumExp);
  const posteriorByFamily = Object.fromEntries(
    FAMILIES.map((fam, i) => [fam, posteriors[i]])
  );

  let bestFamily = FAMILIES[0];
  let bestProb = -1;
  for (let i = 0; i < FAMILIES.length; i++) {
    if (posteriors[i] > bestProb) {
      bestProb = posteriors[i];
      bestFamily = FAMILIES[i];
    }
  }

  return {
    fitted,
    posteriors,
    posteriorByFamily,
    bestFamily,
    bestProb,
  };
}

/**
 * Compute Model Disagreement across grid points:
 * Delta(x) = sum_m P(m) * (mu_m(x) - bar_mu(x))^2
 */
export function computeDisagreementGrid(ensemble, grid = GRID_POINTS) {
  const { fitted, posteriors } = ensemble;
  const k = grid.length;
  const disagreements = new Array(k);

  for (let i = 0; i < k; i++) {
    const x = grid[i];
    let meanPred = 0.0;
    const preds = new Array(fitted.length);
    for (let m = 0; m < fitted.length; m++) {
      const p = predict(fitted[m], x);
      preds[m] = p.mean;
      meanPred += posteriors[m] * p.mean;
    }

    let delta = 0.0;
    for (let m = 0; m < fitted.length; m++) {
      const diff = preds[m] - meanPred;
      delta += posteriors[m] * diff * diff;
    }
    disagreements[i] = { x, disagreement: delta };
  }

  return disagreements;
}

/**
 * Compute Predictive Uncertainty across grid points for leading model:
 * sigma_m^2(x)
 */
export function computeUncertaintyGrid(ensemble, grid = GRID_POINTS) {
  const bestModel = ensemble.fitted.find((f) => f.family === ensemble.bestFamily);
  return grid.map((x) => {
    const pred = predict(bestModel, x);
    return { x, uncertainty: pred.totalVar };
  });
}
