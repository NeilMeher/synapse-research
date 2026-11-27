import {bestResponse, equivalentGame, expectedNumerators, inverse, logitResponse, presentGame, QUARTERS,
  reindex, totalVariation, validateGame} from "./game-theory.mjs";

const canonical = Object.freeze([0, 1]);
const swapped = Object.freeze([1, 0]);
export const presentations = Object.freeze({
  canonical: Object.freeze({rows:canonical, columns:canonical}),
  rows: Object.freeze({rows:swapped, columns:canonical}),
  columns: Object.freeze({rows:canonical, columns:swapped}),
  both: Object.freeze({rows:swapped, columns:swapped}),
});

function responses(utilities, beta) {
  return {
    utility:bestResponse(utilities),
    logit:logitResponse(utilities.map(value => value / QUARTERS), beta),
    position:[1, 0],
  };
}

export function comparePresentation(payoffs, weights, name, beliefDefect = false, beta = 1) {
  const transform = presentations[name];
  if (!Object.hasOwn(presentations, name)) throw new RangeError("Unknown presentation.");
  const {rows, columns} = transform;
  const view = presentGame(payoffs, weights, rows, columns);
  if (beliefDefect) view.weights = [...weights];
  const original = expectedNumerators(payoffs, weights);
  const displayed = expectedNumerators(view.payoffs, view.weights);
  const canonicalUtilities = reindex(displayed, inverse(rows));
  const baseline = responses(original, beta);
  const shown = responses(displayed, beta);
  const mapped = Object.fromEntries(Object.entries(shown).map(([key, distribution]) =>
    [key, reindex(distribution, inverse(rows))]));
  const distances = Object.fromEntries(Object.entries(mapped).map(([key, distribution]) =>
    [key, totalVariation(baseline[key], distribution)]));
  return {
    presentation:name, rows, columns, view, equivalent:equivalentGame(payoffs, weights, view, rows, columns),
    original, displayed, canonicalUtilities, baseline, shown, mapped, distances,
  };
}

export function runAxiom(config) {
  if (config.id !== "axiom-pilot-001" || config.phase !== "pilot" || config.beta !== 1 ||
      !Array.isArray(config.games) || config.games.length !== 4 || new Set(config.games.map(game => game.id)).size !== 4 ||
      !Array.isArray(config.firstWeights) || config.firstWeights.join(",") !== "0,1,2,3,4") {
    throw new RangeError("The finite AXIOM design needs four distinct games and the five registered beliefs.");
  }
  const cases = [];
  const summary = {
    tasks:0, presentations:0, equivalenceFailures:0, utilityFailures:0, tieFailures:0,
    maxUtilityTV:0, maxLogitTV:0, positionChanges:0,
    defectTrials:0, inequivalentDefects:0, defectsChangingUtility:0, defectsChangingBestResponse:0,
  };
  for (const game of config.games) {
    for (const first of config.firstWeights) {
      const weights = [first, QUARTERS - first];
      validateGame(game.payoffs, weights);
      summary.tasks++;
      for (const name of Object.keys(presentations)) {
        const row = comparePresentation(game.payoffs, weights, name, false, config.beta);
        summary.presentations++;
        summary.equivalenceFailures += Number(!row.equivalent);
        summary.utilityFailures += Number(row.original.some((utility, i) => utility !== row.canonicalUtilities[i]));
        summary.tieFailures += Number(row.original[0] === row.original[1] && row.mapped.utility.some(p => p !== 0.5));
        summary.maxUtilityTV = Math.max(summary.maxUtilityTV, row.distances.utility);
        summary.maxLogitTV = Math.max(summary.maxLogitTV, row.distances.logit);
        summary.positionChanges += Number(row.distances.position > 0);
        let defect = null;
        if (row.columns[0] === 1) {
          const wrong = comparePresentation(game.payoffs, weights, name, true, config.beta);
          defect = {equivalent:wrong.equivalent, utilities:wrong.canonicalUtilities,
            utilityTV:wrong.distances.utility, logitTV:wrong.distances.logit};
          summary.defectTrials++;
          summary.inequivalentDefects += Number(!wrong.equivalent);
          summary.defectsChangingUtility += Number(row.original.some((utility, i) => utility !== wrong.canonicalUtilities[i]));
          summary.defectsChangingBestResponse += Number(wrong.distances.utility > 0);
        }
        cases.push({game:game.id, weights, ...row, defect});
      }
    }
  }
  return {schemaVersion:"axiom-finite-v1", modelVersion:"axiom-payoff-permutation-v1",
    evidenceClass:"exact finite implementation benchmark", config, summary, cases};
}
