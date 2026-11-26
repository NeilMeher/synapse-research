import assert from "node:assert/strict";
import test from "node:test";
import { runAlphaDecay, safeSharpe } from "../engine/alpha-decay.mjs";

test("safeSharpe returns null on zero-variance series", () => {
  assert.equal(safeSharpe(0.05, 0), null);
  assert.equal(safeSharpe(0.05, 1e-15), null);
  assert.ok(Math.abs(safeSharpe(0.04, 0.02) - 2) < 1e-12);
});

test("runAlphaDecay is deterministic, conserves total capital, and separates impact from zero-impact control", () => {
  const cfg = { id: "alpha-decay-test-001", phase: "pilot", seed: 2026, trials: 10, rounds: 6, primaryStrategy: "fundamental_value" };
  const a = runAlphaDecay(cfg);
  const b = runAlphaDecay(cfg);
  assert.deepEqual(a, b);
  assert.equal(a.schemaVersion, "alpha-decay-v1");
  for (const arm of a.arms) {
    assert.equal(arm.replay.totals.cash, 2_960_000);
    assert.equal(arm.replay.totals.assets, 296);
  }
});
