import {defaults, validateScenario} from "./echo.mjs";

export const schemaVersion = "1.0.0";
const modes = ["pilot", "confirmatory"];
const safeId = /^[a-z0-9][a-z0-9-]{2,60}$/;
const gridKeys = ["experimentId", "protocol", "mode", "trials", "correlations", "scenario"];

export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function validateExperiment(config) {
  if (!config || typeof config !== "object" || Array.isArray(config) ||
      Object.keys(config).length !== gridKeys.length || !gridKeys.every(key => Object.hasOwn(config, key)) ||
      typeof config.experimentId !== "string" || !safeId.test(config.experimentId) ||
      typeof config.protocol !== "string" || !/^echo-(pilot|confirmatory)-v[1-9][0-9]*$/.test(config.protocol) ||
      !modes.includes(config.mode) || !config.protocol.startsWith("echo-" + config.mode + "-") ||
      !Number.isInteger(config.trials) || config.trials < 2 || config.trials > 100000 ||
      !Array.isArray(config.correlations) || config.correlations.length < 2 || config.correlations.length > 21 ||
      !config.correlations.every((value, index, grid) => Number.isFinite(value) && value >= 0 && value <= 1 &&
        (index === 0 || value > grid[index - 1])) ||
      !config.correlations.includes(0) || !config.correlations.includes(0.75)) {
    throw new Error("Invalid experiment configuration.");
  }
  validateScenario(config.scenario);
  if (config.scenario.correlation !== defaults.correlation) {
    throw new Error("The replay default must match the planned 0.75 contrast.");
  }
  return config;
}

export function validateResults(results) {
  if (results?.schemaVersion !== schemaVersion || results.evidenceClass !== "synthetic simulation" ||
      !Array.isArray(results.conditions) || !Array.isArray(results.contrasts) ||
      !Array.isArray(results.replays)) throw new Error("Invalid result envelope.");
  validateExperiment(results.config);
  const expectedPolicies = ["individual", "majority", "complete", "ring", "hub", "bounded",
    "naiveBayes", "awareBayes", "verifiedBayes"];
  const validMetric = (metric, correlation) => ["accuracy", "brier"].includes(metric.metric) &&
    expectedPolicies.includes(metric.policy) && metric.trials === results.config.trials &&
    Number.isFinite(metric.estimate) && metric.estimate >= 0 && metric.estimate <= 1 &&
    Array.isArray(metric.interval) && metric.interval.length === 2 &&
    metric.interval[0] >= 0 && metric.interval[1] <= 1 &&
    metric.interval[0] <= metric.estimate && metric.interval[1] >= metric.estimate &&
    (metric.policy !== "majority" || metric.metric !== "accuracy" ||
      Number.isFinite(correlation));
  if (results.conditions.length !== results.config.correlations.length ||
      !results.conditions.every((condition, index) =>
        condition.correlation === results.config.correlations[index] &&
        condition.metrics.length === 2 * expectedPolicies.length &&
        new Set(condition.metrics.map(metric => metric.metric + "/" + metric.policy)).size === 2 * expectedPolicies.length &&
        condition.metrics.every(metric => validMetric(metric, condition.correlation))) ||
      results.contrasts.map(row => row.id).join() !== "shared-error,hub-loss,verification" ||
      !results.contrasts.every(row => row.trials === results.config.trials &&
        Number.isFinite(row.estimate) && row.estimate >= -1 && row.estimate <= 1 &&
        row.interval?.length === 2 && row.interval[0] <= row.estimate && row.interval[1] >= row.estimate)) {
    throw new Error("Invalid result conditions or contrasts.");
  }
  if (!results.replays.length || !results.replays.every(entry => {
    validateScenario(entry.settings);
    return entry.frames.length === entry.settings.rounds + 1 && entry.frames.every((frame, index) =>
      frame.sequence === index && frame.simulationTime === index &&
      frame.beliefs.length === entry.settings.agents &&
      frame.beliefs.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  })) throw new Error("Invalid replay frames.");
  return results;
}
