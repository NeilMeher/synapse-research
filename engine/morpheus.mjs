import { seeded } from "./echo.mjs";
import { evaluateConfidence } from "./confidence.mjs";
import { Moments } from "./statistics.mjs";
import { createRecord, detectContradictions, groundTruthAt, trustScore } from "./memory.mjs";

export const ARCHITECTURES = Object.freeze([
  "stateless",
  "full_history",
  "recency",
  "keyword",
  "episodic",
  "provenance",
  "event_sourced",
  "semantic_hash",
]);

export const ABLATIONS = Object.freeze([
  "no_provenance",
  "no_temporal",
  "no_revision",
  "no_confidence",
]);

export const REGIMES = Object.freeze(["clean", "corrupted"]);

const TOPICS = Object.freeze(["supply_route", "grid_load", "reserve_target", "safety_floor"]);
const KINDS = Object.freeze(["fact", "fact", "preference", "goal"]);
const VALUES = Object.freeze(["alpha", "beta", "gamma", "delta"]);

function topicVector(topic, kind) {
  const tIdx = TOPICS.indexOf(topic);
  const kIdx = ["fact", "preference", "goal"].indexOf(kind);
  const vec = [0, 0, 0, 0, 0, 0, 0];
  if (tIdx >= 0) vec[tIdx] = 1;
  if (kIdx >= 0) vec[4 + kIdx] = 1;
  return vec;
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export function generateHistory(random, steps, regime, agentId = "agent-0") {
  const trueEvents = [];
  const ingestedByStep = [];
  const queries = [];
  let seq = 0;

  // Initial persistent goal and preference at t=0
  const initGoal = createRecord({
    recordId: `${agentId}-r${++seq}`,
    agentId,
    eventTime: 0,
    ingestionTime: 0,
    sourceId: "primary-sensor",
    topic: "safety_floor",
    kind: "goal",
    value: VALUES[Math.floor(random() * 2)],
    evidenceClass: "direct_observation",
    confidence: 0.95,
    provenance: { origin: "primary-sensor", chainDepth: 0, verified: true },
  });
  const initPref = createRecord({
    recordId: `${agentId}-r${++seq}`,
    agentId,
    eventTime: 0,
    ingestionTime: 0,
    sourceId: "primary-sensor",
    topic: "reserve_target",
    kind: "preference",
    value: VALUES[Math.floor(random() * 2)],
    evidenceClass: "direct_observation",
    confidence: 0.90,
    provenance: { origin: "primary-sensor", chainDepth: 0, verified: true },
  });
  trueEvents.push(initGoal, initPref);
  const step0Records = [initGoal, initPref];

  const activeByKey = new Map([
    ["safety_floor::goal", initGoal],
    ["reserve_target::preference", initPref],
  ]);

  let currentIngest = 0;
  for (let t = 0; t < steps; t++) {
    const recordsAtT = t === 0 ? [...step0Records] : [];
    const topicIdx = t % 2; // supply_route or grid_load for factual updates
    const topic = TOPICS[topicIdx];
    const kind = "fact";
    const key = `${topic}::${kind}`;
    const prev = activeByKey.get(key) ?? null;
    const val = VALUES[Math.floor(random() * VALUES.length)];
    const isCorrection = prev !== null && random() < 0.35;

    const trueRec = createRecord({
      recordId: `${agentId}-r${++seq}`,
      agentId,
      eventTime: t,
      ingestionTime: ++currentIngest,
      sourceId: isCorrection ? "verified-audit" : "primary-sensor",
      topic,
      kind,
      value: val,
      evidenceClass: isCorrection ? "verified_correction" : "direct_observation",
      confidence: isCorrection ? 0.96 : 0.88,
      provenance: { origin: isCorrection ? "verified-audit" : "primary-sensor", chainDepth: 0, verified: true },
      supersedes: isCorrection ? prev.recordId : null,
    });
    trueEvents.push(trueRec);
    activeByKey.set(key, trueRec);
    recordsAtT.push(trueRec);

    // Legitimate preference update at midpoint of episode
    let prefChanged = false;
    if (t === Math.floor(steps / 2)) {
      const oldPref = activeByKey.get("reserve_target::preference");
      const newVal = oldPref.content.value === "alpha" ? "beta" : "alpha";
      const prefUpdate = createRecord({
        recordId: `${agentId}-r${++seq}`,
        agentId,
        eventTime: t,
        ingestionTime: ++currentIngest,
        sourceId: "verified-audit",
        topic: "reserve_target",
        kind: "preference",
        value: newVal,
        evidenceClass: "verified_correction",
        confidence: 0.94,
        provenance: { origin: "verified-audit", chainDepth: 0, verified: true },
        supersedes: oldPref.recordId,
      });
      trueEvents.push(prefUpdate);
      activeByKey.set("reserve_target::preference", prefUpdate);
      recordsAtT.push(prefUpdate);
      prefChanged = true;
    }

    // Controlled corruption in corrupted regime: false memory / spoofed claim / stale temporal injection
    let corruptedAtT = false;
    if (regime === "corrupted" && t >= 2 && random() < 0.60) {
      corruptedAtT = true;
      const targetTopic = random() < 0.5 ? topic : (random() < 0.5 ? "safety_floor" : "reserve_target");
      const targetKind = targetTopic === "safety_floor" ? "goal" : targetTopic === "reserve_target" ? "preference" : "fact";
      const trueTarget = activeByKey.get(`${targetTopic}::${targetKind}`);
      const wrongVal = VALUES.find(v => v !== trueTarget.content.value) ?? "delta";
      const spoofed = random() < 0.5;
      const falseRec = createRecord({
        recordId: `${agentId}-c${++seq}`,
        agentId,
        eventTime: Math.max(0, t - 1), // stale or conflicting timestamp
        ingestionTime: ++currentIngest, // late ingestion (fools recency)
        sourceId: spoofed ? "spoofed-relay" : "untrusted-rumor",
        topic: targetTopic,
        kind: targetKind,
        value: wrongVal,
        evidenceClass: spoofed ? "spoofed_claim" : "unverified_claim",
        confidence: 0.85,
        provenance: { origin: "external-inject", chainDepth: 2, verified: false },
        contradicts: trueTarget.recordId,
        corrupted: true,
      });
      recordsAtT.push(falseRec);
    }

    // Query at step t (alternating fact, preference, goal)
    const qSelector = t % 4;
    const qTopic = TOPICS[qSelector];
    const qKind = KINDS[qSelector];
    ingestedByStep.push(recordsAtT);
    queries.push({
      step: t,
      topic: qTopic,
      kind: qKind,
      prefChanged,
      corruptedAtT,
      groundTruth: groundTruthAt(trueEvents, t, qTopic, qKind),
      trueSourceId: activeByKey.get(`${qTopic}::${qKind}`)?.sourceId ?? null,
    });
  }

  return { agentId, regime, steps, trueEvents, ingestedByStep, queries };
}

function retrieveAndDecide(visibleRecords, query, currentStepRecords, architecture, budget, ablation = null) {
  const { topic, kind } = query;
  if (architecture === "stateless") {
    const direct = currentStepRecords.find(r => r.content.topic === topic && r.content.kind === kind && !r.corrupted)
      ?? currentStepRecords.find(r => r.content.topic === topic && r.content.kind === kind);
    return {
      retrieved: direct ? [direct] : [],
      prediction: direct ? direct.content.value : VALUES[0],
      confidence: direct ? direct.confidence : 0.25,
      attributedSource: direct ? direct.sourceId : null,
      contradictionFlagged: false,
    };
  }

  const options = {
    useProvenance: ablation !== "no_provenance",
    useTemporal: ablation !== "no_temporal",
    useRevision: ablation !== "no_revision",
    useConfidence: ablation !== "no_confidence",
  };

  let pool = visibleRecords;
  // Revision resolution for event_sourced (unless ablated)
  const supersededIds = new Set();
  if ((architecture === "event_sourced" || architecture === "provenance") && options.useRevision) {
    for (const r of pool) {
      if (r.supersedes && (r.provenance.verified || !options.useProvenance)) {
        supersededIds.add(r.supersedes);
      }
    }
  }

  let ranked;
  if (architecture === "full_history") {
    ranked = [...pool].sort((a, b) => b.ingestionTime - a.ingestionTime);
  } else if (architecture === "recency") {
    ranked = [...pool].sort((a, b) => b.ingestionTime - a.ingestionTime).slice(0, budget);
  } else if (architecture === "keyword") {
    ranked = [...pool]
      .sort((a, b) => {
        const ma = (a.content.topic === topic ? 2 : 0) + (a.content.kind === kind ? 1 : 0);
        const mb = (b.content.topic === topic ? 2 : 0) + (b.content.kind === kind ? 1 : 0);
        if (mb !== ma) return mb - ma;
        return b.ingestionTime - a.ingestionTime;
      })
      .slice(0, budget);
  } else if (architecture === "episodic") {
    const byKey = new Map();
    for (const r of pool) {
      const k = `${r.content.topic}::${r.content.kind}`;
      const prev = byKey.get(k);
      if (!prev || r.eventTime >= prev.eventTime) byKey.set(k, r);
    }
    ranked = [...byKey.values()]
      .sort((a, b) => {
        const ma = (a.content.topic === topic ? 2 : 0) + (a.content.kind === kind ? 1 : 0);
        const mb = (b.content.topic === topic ? 2 : 0) + (b.content.kind === kind ? 1 : 0);
        if (mb !== ma) return mb - ma;
        return b.eventTime - a.eventTime;
      })
      .slice(0, budget);
  } else if (architecture === "semantic_hash") {
    const qVec = topicVector(topic, kind);
    ranked = [...pool]
      .sort((a, b) => {
        const sa = cosineSim(qVec, topicVector(a.content.topic, a.content.kind));
        const sb = cosineSim(qVec, topicVector(b.content.topic, b.content.kind));
        if (Math.abs(sb - sa) > 1e-9) return sb - sa;
        return b.ingestionTime - a.ingestionTime;
      })
      .slice(0, budget);
  } else {
    // provenance or event_sourced
    ranked = [...pool]
      .filter(r => !supersededIds.has(r.recordId))
      .sort((a, b) => {
        const ma = (a.content.topic === topic ? 2 : 0) + (a.content.kind === kind ? 1 : 0);
        const mb = (b.content.topic === topic ? 2 : 0) + (b.content.kind === kind ? 1 : 0);
        if (mb !== ma) return mb - ma;
        return trustScore(b, options) - trustScore(a, options);
      })
      .slice(0, budget);
  }

  const relevant = ranked.filter(r => r.content.topic === topic && r.content.kind === kind);
  const contradictions = detectContradictions(relevant);
  let chosen = null;
  if (architecture === "provenance" || architecture === "event_sourced") {
    chosen = relevant.sort((a, b) => trustScore(b, options) - trustScore(a, options))[0] ?? null;
  } else if (architecture === "episodic") {
    chosen = relevant.sort((a, b) => b.eventTime - a.eventTime)[0] ?? null;
  } else {
    chosen = relevant.sort((a, b) => b.ingestionTime - a.ingestionTime)[0] ?? null;
  }

  const rawConf = chosen
    ? (architecture === "provenance" || architecture === "event_sourced"
      ? Math.max(0.05, Math.min(0.99, trustScore(chosen, options)))
      : chosen.confidence)
    : 0.25;

  return {
    retrieved: ranked,
    prediction: chosen ? chosen.content.value : VALUES[0],
    confidence: rawConf,
    attributedSource: chosen ? chosen.sourceId : null,
    contradictionFlagged: contradictions.length > 0,
  };
}

export function evaluateHistory(history, architecture, budget, ablation = null, keepTrace = false) {
  const visible = [];
  const trace = [];
  let factTotal = 0, factHits = 0;
  let decTotal = 0, decHits = 0;
  let srcTotal = 0, srcHits = 0;
  let prefStableTotal = 0, prefStableHits = 0;
  let prefAdaptTotal = 0, prefAdaptHits = 0;
  let goalTotal = 0, goalHits = 0;
  let recoveryTotal = 0, recoveryHits = 0;
  let temporalTotal = 0, temporalHits = 0;
  let retrievedTotal = 0, retrievedRelevantUncorrupted = 0;
  let contradictionExpected = 0, contradictionDetected = 0;
  const outcomes = [];
  const probs = [];
  let sawCorruption = false;

  for (let t = 0; t < history.steps; t++) {
    const stepRecords = history.ingestedByStep[t];
    visible.push(...stepRecords);
    const query = history.queries[t];
    if (query.corruptedAtT) sawCorruption = true;
    const out = retrieveAndDecide(visible, query, stepRecords, architecture, budget, ablation);
    const correct = Number(out.prediction === query.groundTruth);
    decTotal++;
    decHits += correct;
    outcomes.push(correct);
    probs.push(out.confidence);

    if (query.kind === "fact") {
      factTotal++;
      factHits += correct;
    } else if (query.kind === "goal") {
      goalTotal++;
      goalHits += correct;
    } else if (query.kind === "preference") {
      if (t >= Math.floor(history.steps / 2)) {
        prefAdaptTotal++;
        prefAdaptHits += correct;
      } else {
        prefStableTotal++;
        prefStableHits += correct;
      }
    }

    if (sawCorruption) {
      recoveryTotal++;
      recoveryHits += correct;
    }

    srcTotal++;
    if (out.attributedSource === query.trueSourceId) srcHits++;

    const visibleForKey = visible.filter(r => r.content.topic === query.topic && r.content.kind === query.kind);
    const hasContradiction = detectContradictions(visibleForKey).length > 0;
    if (hasContradiction) {
      contradictionExpected++;
      if (out.contradictionFlagged) contradictionDetected++;
    }

    temporalTotal++;
    if (correct || out.retrieved.every(r => r.eventTime <= t)) temporalHits++;

    retrievedTotal += out.retrieved.length;
    for (const r of out.retrieved) {
      if (!r.corrupted && r.content.topic === query.topic && r.content.kind === query.kind) {
        retrievedRelevantUncorrupted++;
      }
    }

    if (keepTrace) {
      trace.push({
        step: t,
        query,
        prediction: out.prediction,
        correct: Boolean(correct),
        confidence: out.confidence,
        attributedSource: out.attributedSource,
        contradictionFlagged: out.contradictionFlagged,
        retrievedIds: out.retrieved.map(r => r.recordId),
      });
    }
  }

  const cal = evaluateConfidence(outcomes, probs);
  return {
    metrics: {
      decisionAccuracy: decHits / decTotal,
      factualRecallAccuracy: factTotal ? factHits / factTotal : 1,
      sourceAttributionAccuracy: srcHits / srcTotal,
      contradictionDetection: contradictionExpected ? contradictionDetected / contradictionExpected : 1,
      temporalConsistency: temporalHits / temporalTotal,
      preferenceStability: prefStableTotal ? prefStableHits / prefStableTotal : 1,
      adaptationAccuracy: prefAdaptTotal ? prefAdaptHits / prefAdaptTotal : 1,
      goalPreservation: goalTotal ? goalHits / goalTotal : 1,
      recoveryAfterCorruption: recoveryTotal ? recoveryHits / recoveryTotal : 1,
      retrievalPrecision: retrievedTotal ? retrievedRelevantUncorrupted / retrievedTotal : 0,
      memoryEfficiency: retrievedTotal ? (decHits / decTotal) / (retrievedTotal / decTotal) : 0,
      brier: cal.brier,
    },
    trace: keepTrace ? trace : null,
  };
}

export function duplicateAndDiverge(history, forkStep, divergentRecord) {
  const clone = {
    ...history,
    agentId: history.agentId + "-clone",
    ingestedByStep: history.ingestedByStep.map((arr, idx) => idx === forkStep ? [...arr, divergentRecord] : [...arr]),
  };
  return clone;
}

export function runMorpheus(config, tick = () => {}) {
  const { seed, trials, steps, budget } = config;
  if (!Number.isInteger(trials) || trials < 2 || trials > 2000 ||
      !Number.isInteger(steps) || steps < 4 || steps > 32 ||
      !Number.isInteger(budget) || budget < 1 || budget > 16) {
    throw new RangeError("MORPHEUS configuration outside bounds.");
  }
  const random = seeded(seed);
  const arms = [];
  for (const regime of REGIMES) {
    for (const arch of ARCHITECTURES) {
      arms.push({ regime, architecture: arch, ablation: null, scores: new Map(), replay: null });
    }
    for (const abl of ABLATIONS) {
      arms.push({ regime, architecture: "provenance", ablation: abl, scores: new Map(), replay: null });
    }
  }
  const contrasts = {
    corruptedProvenanceMinusKeyword: new Moments(),
    cleanProvenanceMinusKeyword: new Moments(),
  };

  let sampleHistory = null;
  for (let trial = 0; trial < trials; trial++) {
    tick();
    const baseClean = generateHistory(random, steps, "clean", "agent-0");
    const baseCorrupted = generateHistory(seeded(seed + trial * 97 + 13), steps, "corrupted", "agent-0");
    if (trial === 0) sampleHistory = baseCorrupted;

    const byKey = new Map();
    for (const arm of arms) {
      const hist = arm.regime === "clean" ? baseClean : baseCorrupted;
      const { metrics, trace } = evaluateHistory(hist, arm.architecture, budget, arm.ablation, trial === 0);
      byKey.set(`${arm.regime}::${arm.architecture}::${arm.ablation ?? "none"}`, metrics.decisionAccuracy);
      if (trial === 0) arm.replay = trace;
      for (const [k, v] of Object.entries(metrics)) {
        if (!arm.scores.has(k)) arm.scores.set(k, new Moments());
        arm.scores.get(k).add(v);
      }
    }
    contrasts.corruptedProvenanceMinusKeyword.add(
      byKey.get("corrupted::provenance::none") - byKey.get("corrupted::keyword::none")
    );
    contrasts.cleanProvenanceMinusKeyword.add(
      byKey.get("clean::provenance::none") - byKey.get("clean::keyword::none")
    );
  }

  return {
    schemaVersion: "morpheus-memory-v1",
    modelVersion: "morpheus-provenance-v1",
    evidenceClass: "synthetic simulation",
    config,
    contrasts: [
      { id: "corrupted-provenance-minus-keyword", ...contrasts.corruptedProvenanceMinusKeyword.summary(2.241402727604947, -1, 1) },
      { id: "clean-provenance-minus-keyword", ...contrasts.cleanProvenanceMinusKeyword.summary(2.241402727604947, -1, 1) },
    ],
    sampleHistory: {
      agentId: sampleHistory.agentId,
      steps: sampleHistory.steps,
      ingestedByStep: sampleHistory.ingestedByStep,
      queries: sampleHistory.queries,
    },
    arms: arms.map(({ scores, ...arm }) => ({
      ...arm,
      metrics: Object.fromEntries([...scores].map(([k, m]) => [k, m.summary(1.959963984540054, -1, 1)])),
    })),
  };
}
