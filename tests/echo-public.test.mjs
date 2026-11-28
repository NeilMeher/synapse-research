import assert from 'node:assert/strict';
import test from 'node:test';
import { committeeAnswer, poissonBinomial, tally } from '../engine/echo-public.mjs';
import { pairStats } from '../empirical/echo-public/analysis.mjs';

test('ECHO canonical plurality and strict majority differ with abstentions and many options', () => {
  const row = { id: 21, options: 10, gold: 6, predictions: [9, 9, 5, -1, -2] };
  const selected = [0, 1, 2, 3, 4];
  assert.equal(committeeAnswer(row, selected, 'majority', 8), null);
  assert.equal(committeeAnswer(row, selected, 'unanimity', 8), null);
  assert.equal(committeeAnswer(row, selected, 'plurality', 8), 9);
  assert.equal(committeeAnswer(row, selected, 'tieAbstain', 8), 9);
});

test('ECHO ties use the question ID and seed, and invalid labels never vote', () => {
  const votes = [1, 0, 1, 0, 4, -1];
  const selected = votes.map((_, i) => i);
  for (const [question, expected] of [[0, 0], [1, 1]]) {
    assert.equal(tally(votes, selected, 4, 'plurality', question, 4).answer, expected);
    assert.equal(tally(votes, selected, 4, 'tieAbstain', question, 4).answer, null);
    assert.equal(tally(votes, selected, 4, 'plurality', question, 4).valid, 4);
  }
  assert.equal(tally([-1, -2], [0, 1], 4, 'plurality', 0, 4).answer, null);
});

test('ECHO separates a common incorrect answer from two incorrect answers', () => {
  const rows = [[3, 3], [1, 3], [0, 0], [-1, 1]].map(
    predictions => ({ gold: 0, predictions }));
  const metrics = pairStats(rows, 0, 1);
  assert.equal(metrics.jointErrors, 3);
  assert.equal(metrics.bothWrongValid, 2);
  assert.equal(metrics.wrongAgreement, 0.5);
  assert.equal(pairStats(rows.slice(0, 2), 0, 1).phi, null);
});

test('heterogeneous independent correctness reproduces exact worked example', () => {
  const probability = poissonBinomial([.8, .65, .55]);
  assert.ok(Math.abs(probability.reduce((a, b) => a + b) - 1) < 1e-14);
  assert.ok(Math.abs(probability[2] + probability[3] - .7455) < 1e-14);
  assert.deepEqual(poissonBinomial([0, 1]), [0, 1, 0]);
});
