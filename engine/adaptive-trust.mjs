const probability = value => Number.isFinite(value) && value >= 0 && value <= 1;
const count = value => Number.isSafeInteger(value) && value >= 0;

export function ewmaMoments({alpha, rate, initial, steps}) {
  if (!probability(alpha) || alpha === 0 || !probability(rate) || !probability(initial) || !count(steps)) {
    throw new RangeError("Expected a positive learning rate, probabilities and a step count.");
  }
  const decay = (1 - alpha) ** steps;
  const stationaryVariance = alpha * rate * (1 - rate) / (2 - alpha);
  return {
    mean: rate + (initial - rate) * decay,
    variance: stationaryVariance * (1 - decay ** 2),
    stationaryVariance,
    halfLife: alpha === 1 ? 1 : Math.log(.5) / Math.log1p(-alpha),
  };
}

export function betaReliability({a, b, successes, failures}) {
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0 || !count(successes) || !count(failures)) {
    throw new RangeError("Expected positive beta shapes and nonnegative counts.");
  }
  const A = a + successes;
  const B = b + failures;
  if (!Number.isFinite(A + B)) throw new RangeError("Beta shape sum exceeds finite arithmetic.");
  const mean = A / (A + B);
  return {a: A, b: B, mean, variance: mean * (1 - mean) / (A + B + 1)};
}

export function filterReliability({prior, fail, restore, healthyRate, faultyRate, auditAccuracy}, time, audits) {
  if (![prior, fail, restore, healthyRate, faultyRate, auditAccuracy].every(probability) || !count(time)) {
    throw new RangeError("Expected regime and audit probabilities and a nonnegative query time.");
  }
  const available = new Map();
  for (const {event, arrival, outcome} of audits) {
    if (!count(event) || !count(arrival) || arrival < event || (outcome !== 0 && outcome !== 1)) {
      throw new RangeError("Each audit requires an event time, a later or equal arrival, and a binary outcome.");
    }
    if (arrival > time) continue;
    if (available.has(event)) throw new RangeError("At most one visible audit per event is allowed.");
    available.set(event, outcome);
  }
  const observedRate = rate => auditAccuracy * rate + (1 - auditAccuracy) * (1 - rate);
  const h = observedRate(healthyRate);
  const f = observedRate(faultyRate);
  let healthy = prior;
  let predicted;
  for (let event = 0; event <= time; event++) {
    if (event > 0) healthy = healthy * (1 - fail) + (1 - healthy) * restore;
    predicted = healthy;
    const outcome = available.get(event);
    if (outcome === undefined) continue;
    const good = healthy * (outcome ? h : 1 - h);
    const bad = (1 - healthy) * (outcome ? f : 1 - f);
    if (good + bad === 0) throw new RangeError("The observed audit has zero likelihood under this model.");
    healthy = good / (good + bad);
  }
  return {
    predictedHealthy: predicted, filteredHealthy: healthy,
    nextHealthy: healthy * (1 - fail) + (1 - healthy) * restore,
    reliability: healthy * healthyRate + (1 - healthy) * faultyRate,
  };
}

export function firstPassage({alpha, rate, initial, threshold, steps}) {
  ewmaMoments({alpha, rate, initial, steps});
  if (!probability(threshold) || steps > 18) {
    throw new RangeError("The exact path calculation accepts a threshold in [0,1] and up to 18 updates.");
  }
  const masses = Array(steps + 1).fill(0);
  let survival = 0;
  function visit(step, estimate, mass) {
    if (estimate <= threshold) masses[step] += mass;
    else if (step === steps) survival += mass;
    else {
      const discounted = (1 - alpha) * estimate;
      visit(step + 1, discounted, mass * (1 - rate));
      visit(step + 1, discounted + alpha, mass * rate);
    }
  }
  visit(0, initial, 1);
  return {masses, survival};
}

export function decisionRisks({prior, falseAccept, falseReject, cost, accuracy}) {
  if (![prior, accuracy].every(probability) ||
      ![falseAccept, falseReject, cost].every(v => Number.isFinite(v) && v >= 0) ||
      !Number.isFinite(falseAccept + falseReject + cost)) {
    throw new RangeError("Expected probabilities and finite nonnegative losses.");
  }
  const accept = falseAccept * (1 - prior);
  const reject = falseReject * prior;
  // Weight each action by joint probability for a signal branch. No zero-probability division.
  const postAuditLoss = Math.min(accept * (1 - accuracy), reject * accuracy) +
    Math.min(accept * accuracy, reject * (1 - accuracy));
  return {accept, reject, verify: cost + postAuditLoss, valueOfInformation: Math.min(accept, reject) - postAuditLoss};
}
