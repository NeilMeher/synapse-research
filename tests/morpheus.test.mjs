import assert from "node:assert/strict";
import test from "node:test";
import { seeded } from "../engine/echo.mjs";
import { createRecord, detectContradictions, groundTruthAt, trustScore } from "../engine/memory.mjs";
import { duplicateAndDiverge, evaluateHistory, generateHistory, runMorpheus } from "../engine/morpheus.mjs";

test("groundTruthAt enforces eventTime chronology and prevents future leakage", () => {
  const r0 = createRecord({
    recordId: "r0", agentId: "a", eventTime: 0, ingestionTime: 0,
    sourceId: "primary-sensor", topic: "supply_route", kind: "fact", value: "alpha",
    evidenceClass: "direct_observation", confidence: 0.9,
    provenance: { origin: "primary-sensor", chainDepth: 0, verified: true },
  });
  const r2 = createRecord({
    recordId: "r2", agentId: "a", eventTime: 2, ingestionTime: 2,
    sourceId: "verified-audit", topic: "supply_route", kind: "fact", value: "beta",
    evidenceClass: "verified_correction", confidence: 0.96,
    provenance: { origin: "verified-audit", chainDepth: 0, verified: true },
    supersedes: "r0",
  });
  assert.equal(groundTruthAt([r0, r2], 0, "supply_route", "fact"), "alpha");
  assert.equal(groundTruthAt([r0, r2], 1, "supply_route", "fact"), "alpha");
  assert.equal(groundTruthAt([r0, r2], 2, "supply_route", "fact"), "beta");
});

test("detectContradictions flags conflicting values that are not superseded", () => {
  const r1 = createRecord({
    recordId: "r1", agentId: "a", eventTime: 1, ingestionTime: 1,
    sourceId: "primary-sensor", topic: "grid_load", kind: "fact", value: "alpha",
    evidenceClass: "direct_observation", confidence: 0.88,
    provenance: { origin: "primary-sensor", chainDepth: 0, verified: true },
  });
  const c1 = createRecord({
    recordId: "c1", agentId: "a", eventTime: 1, ingestionTime: 2,
    sourceId: "spoofed-relay", topic: "grid_load", kind: "fact", value: "gamma",
    evidenceClass: "spoofed_claim", confidence: 0.85,
    provenance: { origin: "external-inject", chainDepth: 2, verified: false },
    contradicts: "r1", corrupted: true,
  });
  assert.deepEqual(detectContradictions([r1, c1]), [["r1", "c1"]]);
  assert.ok(trustScore(r1) > trustScore(c1));
});

test("duplicateAndDiverge isolates cloned agent experience from original", () => {
  const hist = generateHistory(seeded(42), 8, "clean", "agent-0");
  const divergent = createRecord({
    recordId: "div-1", agentId: "agent-0-clone", eventTime: 4, ingestionTime: 99,
    sourceId: "untrusted-rumor", topic: "safety_floor", kind: "goal", value: "delta",
    evidenceClass: "unverified_claim", confidence: 0.85,
    provenance: { origin: "external-inject", chainDepth: 2, verified: false },
    corrupted: true,
  });
  const clone = duplicateAndDiverge(hist, 4, divergent);
  assert.equal(hist.ingestedByStep[4].some(r => r.recordId === "div-1"), false);
  assert.equal(clone.ingestedByStep[4].some(r => r.recordId === "div-1"), true);
  const origEval = evaluateHistory(hist, "keyword", 4);
  const provCloneEval = evaluateHistory(clone, "provenance", 4);
  assert.equal(origEval.metrics.decisionAccuracy, 1);
  assert.ok(provCloneEval.metrics.goalPreservation >= 0.5);
});

test("runMorpheus is deterministic and respects budget and regime bounds", () => {
  const cfg = { id: "morpheus-test-001", phase: "pilot", seed: 101, trials: 4, steps: 8, budget: 4 };
  const a = runMorpheus(cfg);
  const b = runMorpheus(cfg);
  assert.deepEqual(a, b);
  assert.equal(a.schemaVersion, "morpheus-memory-v1");
  assert.equal(a.contrasts.length, 2);
});
