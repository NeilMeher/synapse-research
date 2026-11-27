export const QUARTERS = 4;
const pair = values => Array.isArray(values) && values.length === 2 && Object.hasOwn(values, 0) && Object.hasOwn(values, 1);
const permutation = values => pair(values) && values.every(value => value === 0 || value === 1) && values[0] !== values[1];

export function inverse(order) {
  if (!permutation(order)) throw new RangeError("Expected a permutation of the two canonical actions.");
  return [order.indexOf(0), order.indexOf(1)];
}

export function reindex(values, order) {
  inverse(order);
  if (!pair(values)) throw new RangeError("Expected two values.");
  return order.map(index => values[index]);
}

export function validateGame(payoffs, weights) {
  if (!pair(payoffs) || !payoffs.every(row => pair(row) &&
      row.every(cell => pair(cell) && cell.every(value => Number.isInteger(value) && Math.abs(value) <= 100)))) {
    throw new RangeError("Expected a 2×2 matrix of two-player integer payoffs in [−100, 100].");
  }
  if (!pair(weights) || !weights.every(value => Number.isInteger(value) && value >= 0) ||
      weights[0] + weights[1] !== QUARTERS) {
    throw new RangeError("Two nonnegative integer belief weights must sum to four.");
  }
}

export function presentGame(payoffs, weights, rows, columns) {
  validateGame(payoffs, weights);
  return {
    payoffs: reindex(payoffs, rows).map(row => reindex(row, columns).map(cell => [...cell])),
    weights: reindex(weights, columns),
  };
}

export function equivalentGame(payoffs, weights, view, rows, columns) {
  const restored = presentGame(view.payoffs, view.weights, inverse(rows), inverse(columns));
  return weights.every((weight, j) => weight === restored.weights[j]) &&
    payoffs.every((row, i) => row.every((cell, j) => cell.every((payoff, player) =>
      payoff === restored.payoffs[i][j][player])));
}

export function expectedNumerators(payoffs, weights) {
  validateGame(payoffs, weights);
  return payoffs.map(row => row[0][0] * weights[0] + row[1][0] * weights[1]);
}

export function bestResponse(utilities) {
  if (!pair(utilities) || !utilities.every(Number.isFinite)) throw new RangeError("Expected two finite utilities.");
  const [first, second] = utilities;
  if (first === second) return [0.5, 0.5];
  return first > second ? [1, 0] : [0, 1];
}

export function logitResponse(utilities, beta = 1) {
  if (!pair(utilities) || !utilities.every(Number.isFinite) || !Number.isFinite(beta) || beta < 0) {
    throw new RangeError("Expected two finite utilities and nonnegative response sensitivity.");
  }
  if (beta === 0) return [0.5, 0.5];
  const maximum = Math.max(...utilities);
  const masses = utilities.map(value => Math.exp(beta * (value - maximum)));
  const total = masses[0] + masses[1];
  return masses.map(value => value / total);
}

export function totalVariation(a, b) {
  const valid = values => pair(values) && values.every(value => value >= 0 && value <= 1 && Number.isFinite(value)) &&
    Math.abs(values[0] + values[1] - 1) <= 1e-12;
  if (!valid(a) || !valid(b)) throw new RangeError("Expected two normalized action distributions.");
  return (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) / 2;
}
