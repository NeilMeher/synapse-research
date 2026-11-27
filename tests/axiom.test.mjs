import assert from "node:assert/strict";
import test from "node:test";
import {comparePresentation} from "../engine/axiom.mjs";
import {bestResponse, equivalentGame, expectedNumerators, inverse, logitResponse, presentGame, totalVariation} from "../engine/game-theory.mjs";

const dilemma = [[[3,3],[0,5]],[[5,0],[1,1]]];
const assurance = [[[4,4],[0,3]],[[3,0],[3,3]]];
const weights = [3,1];

test("AXIOM preserves both players' payoffs and restores the original game", () => {
  const swapped = [1,0];
  const view = presentGame(dilemma, weights, swapped, swapped);
  assert.deepEqual(view, {payoffs:[[[1,1],[5,0]],[[0,5],[3,3]]], weights:[1,3]});
  assert.deepEqual(presentGame(view.payoffs, view.weights, inverse(swapped), inverse(swapped)), {payoffs:dilemma,weights});
  assert.equal(equivalentGame(dilemma, weights, view, swapped, swapped), true);
  view.payoffs[0][1][1] = 42;
  assert.equal(equivalentGame(dilemma, weights, view, swapped, swapped), false);
  assert.equal(dilemma[1][0][1], 0);
});

test("AXIOM exact quarter numerators preserve hand-calculated ties", () => {
  assert.deepEqual(expectedNumerators(dilemma, weights), [9,16]);
  assert.deepEqual(expectedNumerators(assurance, weights), [12,12]);
  assert.deepEqual(bestResponse([12,12]), [0.5,0.5]);
  const pennies = [[[1,-1],[-1,1]],[[-1,1],[1,-1]]];
  assert.deepEqual(expectedNumerators(pennies, [2,2]), [0,0]);
});

test("AXIOM restores utility and logit actions while position detects a row swap", () => {
  const compared = comparePresentation(dilemma, weights, "both");
  assert.deepEqual(compared.shown.utility, [1,0]);
  assert.deepEqual(compared.mapped.utility, [0,1]);
  assert.deepEqual(compared.distances, {utility:0, logit:0, position:1});
  assert.equal(totalVariation([1,0], [0.5,0.5]), 0.5);
  assert.deepEqual(logitResponse([-1000,1000]), [0,1]);
});

test("AXIOM catches incorrect belief remapping and invalid inputs", () => {
  const wrong = comparePresentation(assurance, weights, "columns", true);
  assert.equal(wrong.equivalent, false);
  assert.deepEqual(wrong.canonicalUtilities, [4,12]);
  assert.equal(wrong.distances.utility, 0.5);
  assert.equal(comparePresentation(assurance, [2,2], "columns", true).equivalent, true);
  assert.throws(() => expectedNumerators(dilemma,[1,1]), RangeError);
  assert.throws(() => expectedNumerators(dilemma,[5,-1]), RangeError);
  assert.throws(() => expectedNumerators(dilemma,[3.5,0.5]), RangeError);
  assert.throws(() => expectedNumerators([[[3],[0]],[[5],[1]]],weights), RangeError);
  assert.throws(() => expectedNumerators(Array(2),weights), RangeError);
  assert.throws(() => inverse([0,0]), RangeError);
  assert.throws(() => inverse([0,2]), RangeError);
  assert.throws(() => comparePresentation(dilemma,weights,"constructor"), RangeError);
  assert.throws(() => totalVariation([0,0],[1,0]), RangeError);
});
