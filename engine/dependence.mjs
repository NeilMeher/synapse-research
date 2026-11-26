export const laws = Object.freeze(["shared", "beta"]);
const sum = values => values.reduce((total, value) => total + value, 0);
const clip01 = value => Math.min(1, Math.max(0, value));

function validate(n, q, rho, law) {
  if (!Number.isInteger(n) || n < 0 || n > 41 || !Number.isFinite(q) || q < 0 || q > 1 ||
      !Number.isFinite(rho) || rho < 0 || rho > 1 || !laws.includes(law)) {
    throw new RangeError("Expected 0–41 reports, probabilities in [0, 1] and a supported dependence law.");
  }
}

// Posterior predictive Beta-Bernoulli probability, scaled by rho to avoid huge shape parameters.
function predictive(q, rho, seen, correct) {
  return seen === 0 ? q : (q * (1 - rho) + rho * correct) / (1 - rho + rho * seen);
}

export function countDistribution(n, q, rho, law) {
  validate(n, q, rho, law);
  if (!n) return [1];
  if (rho === 1) return [1 - q, ...Array(n - 1).fill(0), q];
  let mass = [1];
  for (let seen = 0; seen < n; seen++) {
    const next = Array(seen + 2).fill(0);
    for (const [correct, value] of mass.entries()) {
      const p = law === "beta" ? clip01(predictive(q, rho, seen, correct)) : q;
      next[correct] += value * (1 - p);
      next[correct + 1] += value * p;
    }
    mass = next;
  }
  if (law === "shared") {
    mass = mass.map(value => (1 - rho) * value);
    mass[0] += rho * (1 - q);
    mass[n] += rho * q;
  }
  return mass;
}

export function sampleReports(uniforms, selector, sharedDraw, q, rho, law) {
  validate(uniforms.length, q, rho, law);
  let correct = 0;
  return uniforms.map((u, seen) => {
    const hit = law === "shared"
      ? Number((selector < rho ? sharedDraw : u) < q)
      : Number(u < predictive(q, rho, seen, correct));
    correct += hit;
    return hit;
  });
}

export function majorityCredit(correct, n) {
  return correct * 2 === n ? 0.5 : Number(correct * 2 > n);
}

export function summarizeCount(mass) {
  const n = mass.length - 1;
  const first = sum(mass.map((p, k) => p * k)) / n;
  const second = sum(mass.map((p, k) => p * k * (k - 1))) / (n * (n - 1));
  return {
    meanReliability: first,
    correlation: first > 0 && first < 1 ? (second - first ** 2) / (first * (1 - first)) : null,
    majority: sum(mass.map((p, k) => p * majorityCredit(k, n))),
    unanimousError: mass[0],
    unanimousCorrect: mass[n],
  };
}

export function exchangeableBounds(n, q, rho) {
  if (!Number.isInteger(n) || n < 2 || n > 41 || !(q > 0 && q < 1) || !Number.isFinite(rho)) {
    throw new RangeError("Bounds require 2–41 agents and nondegenerate marginal reliability.");
  }
  const mean = n * q;
  const second = n * (n - 1) * (q ** 2 + rho * q * (1 - q)) + mean;
  const floor = Math.floor(mean);
  const minSecond = mean * (2 * floor + 1) - floor * (floor + 1);
  if (rho > 1 || second < minSecond - 1e-10 || second > n * mean + 1e-10) {
    throw new RangeError("Requested moments are infeasible for this finite population.");
  }
  const makeWeight = (x, y, z) => (second - (y + z) * mean + y * z) / ((x - y) * (x - z));
  let lower;
  let upper;
  // A bounded equality LP with three moment constraints has an optimum on <=3 count points.
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k <= n; k++) {
        const weights = [makeWeight(i, j, k), makeWeight(j, i, k), makeWeight(k, i, j)];
        if (weights.some(value => value < -1e-12)) continue;
        const support = [i, j, k].map((count, index) => ({count, probability: Math.max(0, weights[index])}));
        const normalization = sum(support.map(row => row.probability));
        support.forEach(row => { row.probability /= normalization; });
        const accuracy = sum(support.map(row => row.probability * majorityCredit(row.count, n)));
        if (!lower || accuracy < lower.accuracy) lower = {accuracy, support};
        if (!upper || accuracy > upper.accuracy) upper = {accuracy, support};
      }
    }
  }
  if (!lower || !upper) throw new Error("No feasible support found within solver tolerance.");
  return {lower, upper};
}

export function posteriorFromCounts(original, originalOnes, fresh, freshOnes) {
  // Exchangeability makes the binomial coefficients for each block cancel in the odds.
  const logLikelihood = (a, b) => Math.log(original[a]) + Math.log(fresh[b]);
  const one = logLikelihood(originalOnes, freshOnes);
  const zero = logLikelihood(original.length - 1 - originalOnes, fresh.length - 1 - freshOnes);
  if (one === -Infinity && zero === -Infinity) return null;
  const larger = Math.max(one, zero);
  return Math.exp(one - larger) / (Math.exp(one - larger) + Math.exp(zero - larger));
}

export function scoreForecasts(actual, assumed, actualFresh = [1], assumedFresh = actualFresh) {
  let accuracy = 0;
  let brier = 0;
  let logLoss = 0;
  let overconfidentError = 0;
  let impossibleMass = 0;
  const bins = Array.from({length: 5}, () => ({mass:0, confidence:0, accuracy:0}));
  for (const [k, p] of actual.entries()) {
    for (const [j, f] of actualFresh.entries()) {
      const mass = p * f;
      if (!mass) continue;
      const probability = posteriorFromCounts(assumed, k, assumedFresh, j);
      if (probability === null) { impossibleMass += mass; continue; }
      const credit = Math.abs(probability - 0.5) <= 1e-14 ? 0.5 : Number(probability > 0.5);
      const confidence = Math.max(probability, 1 - probability);
      accuracy += mass * credit;
      brier += mass * (1 - probability) ** 2;
      logLoss -= mass * Math.log(probability);
      if (confidence >= 0.9 - 1e-14) overconfidentError += mass * (1 - credit);
      const bin = bins[Math.min(4, Math.floor((confidence - 0.5) * 10 + 1e-12))];
      bin.mass += mass;
      bin.confidence += mass * confidence;
      bin.accuracy += mass * credit;
    }
  }
  return {
    impossibleMass,
    accuracy: impossibleMass ? null : accuracy,
    brier: impossibleMass ? null : brier,
    logLoss: !impossibleMass && Number.isFinite(logLoss) ? logLoss : null,
    logLossStatus: impossibleMass ? "undefined likelihood" : Number.isFinite(logLoss) ? "finite" : "infinite",
    overconfidentError: impossibleMass ? null : overconfidentError,
    calibration: bins.map(({mass, confidence, accuracy}) =>
      ({mass, confidence: mass ? confidence / mass : null, accuracy: mass ? accuracy / mass : null})),
  };
}

export function hubInfluence(n, h, rounds) {
  if (!Number.isInteger(n) || n < 2 || n > 41 || !Number.isFinite(h) || h < 0 || h > 1 ||
      !Number.isInteger(rounds) || rounds < 0 || rounds > 50) throw new RangeError("Invalid hub policy.");
  const stationary = 0.5 / (1.5 - h);
  const effective = stationary + (1 / n - stationary) * (h - 0.5) ** rounds;
  return {effective, stationary};
}

export function hubAccuracy(mass, h, rounds) {
  const n = mass.length - 1;
  const {effective, stationary} = hubInfluence(n, h, rounds);
  const credit = value => Math.abs(value - 0.5) <= 1e-12 ? 0.5 : Number(value > 0.5);
  const accuracy = sum(mass.map((p, k) => {
    const ifCorrect = effective + (1 - effective) * (k - 1) / (n - 1);
    const ifWrong = (1 - effective) * k / (n - 1);
    return p * (k / n * credit(ifCorrect) + (1 - k / n) * credit(ifWrong));
  }));
  return {effective, stationary, accuracy};
}

export function verificationUtility(n, q, rho, law, replacements, verifierReliability, cost) {
  if (!Number.isInteger(replacements) || replacements < 0 || replacements > n ||
      !Number.isFinite(cost) || cost < 0) throw new RangeError("Invalid verification budget or cost.");
  const mass = countDistribution(n - replacements, q, rho, law);
  const fresh = countDistribution(replacements, verifierReliability, 0, "shared");
  const {accuracy, brier} = scoreForecasts(mass, mass, fresh);
  return {replacements, verifierReliability, cost, accuracy, brier, utility: accuracy - replacements * cost};
}
