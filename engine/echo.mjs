export const modelVersion = "echo-mixture-v1";
export const topologies = ["complete", "ring", "hub"];
export const methods = ["degroot", "bounded"];
export const defaults = Object.freeze({
  agents: 15, reliability: 0.68, correlation: 0.75, rounds: 12,
  radius: 0.2, hubWeight: 0.75, verified: 3, seed: 20261127,
  topology: "hub", method: "degroot",
});

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const probability = x => Number.isFinite(x) && x >= 0 && x <= 1;
const count = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;

export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario) ||
      Object.keys(scenario).length !== Object.keys(defaults).length ||
      !Object.keys(defaults).every(key => Object.hasOwn(scenario, key))) {
    throw new Error("Scenario fields differ from version 1.");
  }
  const {agents, reliability, correlation, rounds, radius, hubWeight, verified, seed, topology, method} = scenario;
  if (!count(agents, 3, 41) || !Number.isFinite(reliability) || reliability < 0.5 || reliability > 0.99 ||
      !probability(correlation) || !count(rounds, 0, 50) || !probability(radius) ||
      !Number.isFinite(hubWeight) || hubWeight < 0.25 || hubWeight > 0.95 ||
      !count(verified, 0, agents) || !count(seed, 1, 0xffffffff) ||
      !topologies.includes(topology) || !methods.includes(method)) {
    throw new Error("Scenario parameters are outside the supported bounds.");
  }
  return scenario;
}

// Mulberry32. All arithmetic before the final division takes place in 32 bits.
export function seeded(seed) {
  if (!count(seed, 1, 0xffffffff)) throw new Error("Expected a nonzero uint32 seed.");
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let word = Math.imul(state ^ (state >>> 15), state | 1);
    word ^= word + Math.imul(word ^ (word >>> 7), word | 61);
    return ((word ^ (word >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawTask(random, agents) {
  return {
    truth: Number(random() < 0.5), mixture: random(), common: random(), tie: Number(random() < 0.5),
    privateDraws: Array.from({length: agents}, random),
    freshDraws: Array.from({length: agents}, random),
  };
}

export function evidence(task, reliability, correlation, verified = 0) {
  const privateCount = task.privateDraws.length - verified;
  const isShared = task.mixture < correlation;
  return task.privateDraws.map((draw, index) => {
    const source = index >= privateCount ? "verified" : isShared ? "shared" : "private";
    const uniform = source === "verified" ? task.freshDraws[index] : source === "shared" ? task.common : draw;
    return {signal: uniform < reliability ? task.truth : 1 - task.truth, source};
  });
}

export function influence(agents, topology, hubWeight = 0.75) {
  const row = () => Array(agents).fill(0);
  return Array.from({length: agents}, (_, receiver) => {
    if (topology === "complete") return Array(agents).fill(1 / agents);
    const weights = row();
    if (topology === "ring") {
      weights[receiver] = 0.5;
      weights[(receiver + agents - 1) % agents] = 0.25;
      weights[(receiver + 1) % agents] = 0.25;
    } else if (receiver === 0) {
      weights.fill((1 - hubWeight) / (agents - 1));
      weights[0] = hubWeight;
    } else {
      weights[0] = 0.5;
      weights[receiver] = 0.5;
    }
    return weights;
  });
}

export function validateMatrix(weights, size) {
  if (weights.length !== size || !weights.every(row => row.length === size &&
      row.every(probability) && Math.abs(row.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12)) {
    throw new Error("Influence matrix must be row-stochastic and match the agent count.");
  }
}

export function step(beliefs, weights, method, radius) {
  return weights.map((row, receiver) => {
    if (method === "degroot") return Math.min(1, dot(row, beliefs));
    let total = 0;
    let weighted = 0;
    for (const [sender, weight] of row.entries()) {
      if (Math.abs(beliefs[sender] - beliefs[receiver]) <= radius + 1e-12) {
        total += weight;
        weighted += weight * beliefs[sender];
      }
    }
    return total ? Math.min(1, weighted / total) : beliefs[receiver];
  });
}

export function terminalWeights(weights, rounds) {
  const size = weights.length;
  validateMatrix(weights, size);
  let aggregate = Array(size).fill(1 / size);
  for (let round = 0; round < rounds; round++) {
    aggregate = aggregate.map((_, sender) => aggregate.reduce(
      (sum, share, receiver) => sum + share * weights[receiver][sender], 0));
  }
  return aggregate;
}

export function initialBeliefs(reports, reliability) {
  return reports.map(({signal}) => signal ? reliability : 1 - reliability);
}

export function exactPosterior(bits, reliability, correlation, verified = 0) {
  const privateCount = bits.length - verified;
  const privateOnes = bits.slice(0, privateCount).reduce((sum, bit) => sum + bit, 0);
  const freshOnes = bits.slice(privateCount).reduce((sum, bit) => sum + bit, 0);
  const likelihood = (matches, freshMatches) => {
    const q = reliability;
    const independent = q ** matches * (1 - q) ** (privateCount - matches);
    let shared = 0;
    if (privateCount === 0) shared = 1;
    else if (matches === privateCount) shared = q;
    else if (matches === 0) shared = 1 - q;
    return ((1 - correlation) * independent + correlation * shared) *
      q ** freshMatches * (1 - q) ** (verified - freshMatches);
  };
  const one = likelihood(privateOnes, freshOnes);
  const zero = likelihood(privateCount - privateOnes, verified - freshOnes);
  if (one + zero === 0) throw new Error("Signal vector is impossible under the specified shared-source model.");
  return one / (one + zero);
}

export function decide(belief, tie) {
  return Math.abs(belief - 0.5) <= 1e-12 ? tie : Number(belief > 0.5);
}

export function analyticMajority(agents, q, rho) {
  let choose = 1;
  let independent = 0;
  for (let correct = 0; correct <= agents; correct++) {
    const votes = correct * 2 - agents;
    independent += (votes > 0 ? 1 : votes === 0 ? 0.5 : 0) *
      choose * q ** correct * (1 - q) ** (agents - correct);
    choose *= (agents - correct) / (correct + 1);
  }
  return (1 - rho) * independent + rho * q;
}

export function scoreTask(task, settings, matrices, weights) {
  const {reliability: q, correlation: rho, verified, rounds, radius} = settings;
  const original = evidence(task, q, rho);
  const bits = original.map(report => report.signal);
  const fresh = evidence(task, q, rho, verified).map(report => report.signal);
  const beliefs = initialBeliefs(original, q);
  let bounded = beliefs;
  for (let round = 0; round < rounds; round++) bounded = step(bounded, matrices.ring, "bounded", radius);
  const probabilities = {
    majority: mean(beliefs),
    complete: dot(weights.complete, beliefs),
    ring: dot(weights.ring, beliefs),
    hub: dot(weights.hub, beliefs),
    bounded: mean(bounded),
    naiveBayes: exactPosterior(bits, q, 0),
    awareBayes: exactPosterior(bits, q, rho),
    verifiedBayes: exactPosterior(fresh, q, rho, verified),
  };
  const accuracy = {individual: mean(bits.map(bit => Number(bit === task.truth)))};
  const brier = {individual: mean(beliefs.map(belief => (belief - task.truth) ** 2))};
  for (const [policy, belief] of Object.entries(probabilities)) {
    accuracy[policy] = Number(decide(belief, task.tie) === task.truth);
    brier[policy] = (belief - task.truth) ** 2;
  }
  return {accuracy, brier};
}

export function replay(input, capturedTask) {
  const settings = validateScenario(input);
  const random = seeded(settings.seed);
  const task = capturedTask ?? drawTask(random, settings.agents);
  const reports = evidence(task, settings.reliability, settings.correlation, settings.verified);
  const weights = influence(settings.agents, settings.topology, settings.hubWeight);
  validateMatrix(weights, settings.agents);
  let beliefs = initialBeliefs(reports, settings.reliability);
  const frames = [];
  for (let round = 0; round <= settings.rounds; round++) {
    const average = mean(beliefs);
    frames.push({
      sequence: round, simulationTime: round, type: round === 0 ? "initial" : "update",
      beliefs, average, decision: decide(average, task.tie),
      dispersion: Math.sqrt(mean(beliefs.map(belief => (belief - average) ** 2))),
    });
    beliefs = round === settings.rounds ? beliefs : step(beliefs, weights, settings.method, settings.radius);
  }
  const posterior = exactPosterior(reports.map(report => report.signal),
    settings.reliability, settings.correlation, settings.verified);
  return {settings, task, weights, reports, frames, posterior};
}
