import {drawTask, seeded, influence, terminalWeights, replay, analyticMajority, scoreTask, topologies} from "./echo.mjs";
import {schemaVersion, validateExperiment, validateResults} from "./contracts.mjs";
import {Moments} from "./statistics.mjs";

const contrastNames = ["shared-error", "hub-loss", "verification"];
const contrastDefinitions = [
  "Decrease in the majority accuracy gain over the individual baseline from rho 0 to 0.75",
  "Complete minus hub accuracy at rho 0.75",
  "Verification-policy minus unverified source-aware Bayes accuracy at rho 0.75",
];

export function experiment(config, checkBudget = () => {}) {
  validateExperiment(config);
  const scenario = config.scenario;
  const matrices = Object.fromEntries(topologies.map(name => [name, influence(scenario.agents, name, scenario.hubWeight)]));
  const weights = Object.fromEntries(topologies.map(name => [name, terminalWeights(matrices[name], scenario.rounds)]));
  const accumulators = config.correlations.map(() => new Map());
  const paired = contrastNames.map(() => new Moments());
  const random = seeded(scenario.seed);
  let archivedTask;
  for (let trial = 0; trial < config.trials; trial++) {
    checkBudget();
    const task = drawTask(random, scenario.agents);
    if (trial === 0) archivedTask = task;
    const scores = config.correlations.map((correlation, index) => {
      const outcome = scoreTask(task, {...scenario, correlation}, matrices, weights);
      for (const [metric, policies] of Object.entries(outcome)) {
        for (const [policy, value] of Object.entries(policies)) {
          const key = metric + "/" + policy;
          if (!accumulators[index].has(key)) accumulators[index].set(key, new Moments());
          accumulators[index].get(key).add(value);
        }
      }
      return outcome.accuracy;
    });
    const independent = scores[0];
    const shared = scores[config.correlations.indexOf(0.75)];
    paired[0].add((independent.majority - independent.individual) - (shared.majority - shared.individual));
    paired[1].add(shared.complete - shared.hub);
    paired[2].add(shared.verifiedBayes - shared.awareBayes);
  }

  const familyCritical = 2.3939797998185104; // Two-sided Bonferroni over three contrasts.
  return validateResults({
    schemaVersion, evidenceClass: "synthetic simulation", config,
    conditions: config.correlations.map((correlation, index) => ({
      correlation,
      exactMajorityAccuracy: analyticMajority(scenario.agents, scenario.reliability, correlation),
      metrics: [...accumulators[index]].map(([key, moments]) => {
        const [metric, policy] = key.split("/");
        return {metric, policy, ...moments.summary()};
      }),
    })),
    contrasts: paired.map((moments, index) => ({
      id: contrastNames[index], definition: contrastDefinitions[index],
      confidenceLevel: 1 - 0.05 / 3, ...moments.summary(familyCritical, -1, 1),
    })),
    replays: [
      {id: "trial-one-hub", label: "Trial 1 · hub", ...replay({...scenario, verified: 0}, archivedTask)},
      {id: "trial-one-complete", label: "Trial 1 · complete", ...replay({...scenario, topology: "complete", verified: 0}, archivedTask)},
      {id: "trial-one-verified", label: "Trial 1 · verification", ...replay(scenario, archivedTask)},
    ],
  });
}
