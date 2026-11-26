import {seeded} from "./echo.mjs";
import {Moments} from "./statistics.mjs";
import {countDistribution, exchangeableBounds, hubAccuracy, laws, majorityCredit,
  sampleReports, scoreForecasts, summarizeCount, verificationUtility} from "./dependence.mjs";

export const version = "echo-dependence-v2.0";
export const schemaVersion = "echo-dependence-result-v1";

export function validateConfig(config) {
  if (!config || !["pilot", "confirmatory"].includes(config.phase) ||
      config.id !== "echo2-" + config.phase + "-001" ||
      !Number.isInteger(config.seed) || config.seed < 1 || config.seed > 0xffffffff ||
      !Number.isInteger(config.trials) || config.trials < 2 || config.trials > 50000 ||
      !Number.isInteger(config.agents) || config.agents < 3 || config.agents > 41 ||
      !Number.isFinite(config.reliability) || config.reliability < 0.51 || config.reliability > 0.99 ||
      !Array.isArray(config.correlations) || config.correlations.length < 2 || config.correlations.length > 21 ||
      !config.correlations.every((rho, index) => Number.isFinite(rho) && rho >= 0 && rho <= 1 &&
        (!index || rho > config.correlations[index - 1]))) throw new Error("Invalid ECHO 2.0 experiment configuration.");
  return config;
}

export function runDependence(input, checkBudget = () => {}) {
  const config = validateConfig(input);
  const {agents: n, reliability: q, trials, correlations} = config;
  const random = seeded(config.seed);
  const sampled = correlations.map(() => ({counts: [Array(n + 1).fill(0), Array(n + 1).fill(0)], paired: new Moments()}));
  for (let trial = 0; trial < trials; trial++) {
    checkBudget();
    const selector = random();
    const shared = random();
    const uniforms = Array.from({length:n}, random);
    for (const [i, rho] of correlations.entries()) {
      const {counts, paired} = sampled[i];
      const credit = laws.map((law, j) => {
        const bits = sampleReports(uniforms, selector, rho === 1 ? uniforms[0] : shared, q, rho, law);
        const k = bits.reduce((sum, bit) => sum + bit, 0);
        counts[j][k]++;
        return majorityCredit(k, n);
      });
      paired.add(credit[1] - credit[0]);
    }
  }
  const conditions = correlations.map((correlation, i) => {
    const masses = laws.map(law => countDistribution(n, q, correlation, law));
    const independent = countDistribution(n, q, 0, "shared");
    const assumedLow = laws.map(law => countDistribution(n, q, correlation / 2, law));
    const assumedHigh = laws.map(law => countDistribution(n, q, (1 + correlation) / 2, law));
    const models = laws.map((law, j) => {
      const exact = summarizeCount(masses[j]);
      if (Math.abs(exact.meanReliability - q) > 1e-10 || Math.abs(exact.correlation - correlation) > 1e-10 ||
          Math.abs(masses[j].reduce((sum, p) => sum + p, 0) - 1) > 1e-10) throw new Error("Moments do not match the design.");
      return {
        law, pmf: masses[j], exact, sampledCounts: sampled[i].counts[j],
        sampled: summarizeCount(sampled[i].counts[j].map(k => k / trials)),
        forecasts: {
          specified: scoreForecasts(masses[j], masses[j]),
          wrongFamily: scoreForecasts(masses[j], masses[1 - j]),
          independent: scoreForecasts(masses[j], independent),
          underestimates: scoreForecasts(masses[j], assumedLow[j]),
          overestimates: scoreForecasts(masses[j], assumedHigh[j]),
        },
        hub: config.phase === "confirmatory"
          ? [0.35, 0.5, 0.55, 0.65, 0.75, 0.9].flatMap(weight =>
            [0, 1, 2, 4, 12].map(rounds => ({weight, rounds, ...hubAccuracy(masses[j], weight, rounds)}))) : [],
        verification: config.phase === "confirmatory"
          ? [0.55, 0.68, 0.82].flatMap(reliability => Array.from({length: Math.min(n, 5) + 1}, (_, replacements) =>
            verificationUtility(n, q, correlation, law, replacements, reliability, 0.02))) : [],
      };
    });
    return {
      correlation, models, bounds: exchangeableBounds(n, q, correlation),
      betaMinusShared: models[1].exact.majority - models[0].exact.majority,
      monteCarlo: sampled[i].paired.summary(1.959963984540054, -1, 1),
    };
  });
  return {schemaVersion, modelVersion:version, evidenceClass:"synthetic simulation", config, conditions};
}
