// Pure memory record schema, provenance scoring, and ground-truth evaluator for MORPHEUS.

export const EVIDENCE_CLASSES = Object.freeze([
  "direct_observation",
  "verified_correction",
  "secondary_report",
  "unverified_claim",
  "spoofed_claim",
]);

const TRUST_WEIGHTS = Object.freeze({
  direct_observation: 0.90,
  verified_correction: 0.98,
  secondary_report: 0.65,
  unverified_claim: 0.25,
  spoofed_claim: 0.15,
});

const SOURCE_RELIABILITY = Object.freeze({
  "primary-sensor": 0.92,
  "verified-audit": 0.98,
  "peer-relay": 0.68,
  "untrusted-rumor": 0.22,
  "spoofed-relay": 0.12,
});

export function createRecord({
  recordId,
  agentId,
  eventTime,
  ingestionTime,
  sourceId,
  topic,
  kind,
  value,
  evidenceClass,
  confidence,
  provenance,
  supersedes = null,
  contradicts = null,
  validFrom = eventTime,
  validTo = null,
  corrupted = false,
}) {
  if (!EVIDENCE_CLASSES.includes(evidenceClass)) {
    throw new RangeError(`Unknown evidenceClass: ${evidenceClass}`);
  }
  if (!Number.isInteger(eventTime) || !Number.isInteger(ingestionTime) || eventTime < 0 || ingestionTime < 0) {
    throw new RangeError("Timestamps must be non-negative integers.");
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError("Confidence must be in [0, 1].");
  }
  return Object.freeze({
    recordId,
    agentId,
    eventTime,
    ingestionTime,
    sourceId,
    content: Object.freeze({ topic, kind, value }),
    evidenceClass,
    confidence,
    provenance: Object.freeze({
      origin: provenance?.origin ?? sourceId,
      chainDepth: provenance?.chainDepth ?? 0,
      verified: Boolean(provenance?.verified),
    }),
    supersedes,
    contradicts,
    validFrom,
    validTo,
    corrupted: Boolean(corrupted),
  });
}

export function trustScore(record, options = {}) {
  const {
    useProvenance = true,
    useConfidence = true,
    useTemporal = true,
  } = options;
  const classScore = useProvenance ? (TRUST_WEIGHTS[record.evidenceClass] ?? 0.5) : 0.5;
  const sourceScore = useProvenance ? (SOURCE_RELIABILITY[record.sourceId] ?? 0.5) : 0.5;
  const verifiedBonus = useProvenance && record.provenance.verified ? 0.18 : 0;
  const depthPenalty = useProvenance ? Math.min(0.25, record.provenance.chainDepth * 0.08) : 0;
  const confScore = useConfidence ? record.confidence : 0.5;
  const timeComponent = useTemporal ? record.eventTime * 0.002 : record.ingestionTime * 0.002;
  return 0.45 * classScore + 0.25 * sourceScore + 0.30 * confScore + verifiedBonus - depthPenalty + timeComponent;
}

// Separate ground-truth evaluator: uses only non-corrupted, causally valid events with eventTime <= step.
export function groundTruthAt(trueEvents, step, queryTopic, queryKind) {
  let latest = null;
  for (const ev of trueEvents) {
    if (ev.eventTime > step) continue;
    if (ev.content.topic !== queryTopic || ev.content.kind !== queryKind) continue;
    if (ev.validTo !== null && ev.validTo < step) continue;
    if (!latest || ev.eventTime >= latest.eventTime) {
      latest = ev;
    }
  }
  return latest ? latest.content.value : null;
}

export function detectContradictions(records) {
  const byKey = new Map();
  const pairs = [];
  for (const r of records) {
    const key = `${r.content.topic}::${r.content.kind}`;
    const list = byKey.get(key) ?? [];
    for (const prev of list) {
      if (prev.content.value !== r.content.value && prev.recordId !== r.supersedes && r.recordId !== prev.supersedes) {
        pairs.push([prev.recordId, r.recordId]);
      }
    }
    list.push(r);
    byKey.set(key, list);
  }
  return pairs;
}
