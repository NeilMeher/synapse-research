import { committeeAnswer, poissonBinomial, POLICIES } from '../../engine/echo-public.mjs';

export const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const accuracy = (rows, member) => mean(rows.map((row) => Number(row.predictions[member] === row.gold)));
const failed = (row, member) => Number(row.predictions[member] !== row.gold);

export function makeRandom(seed) {
  let state = seed >>> 0;
  if (!state) throw new RangeError('A nonzero RNG seed is required');
  function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  }
  return {
    unit: () => next() / 4294967296,
    integer(bound) {
      const cutoff = Math.floor(4294967296 / bound) * bound;
      let draw;
      do { draw = next(); } while (draw >= cutoff);
      return draw % bound;
    },
  };
}

export function combinations(values, size) {
  if (size === 0) return [[]];
  if (values.length < size) return [];
  return values.flatMap((value, index) =>
    combinations(values.slice(index + 1), size - 1).map((tail) => [value, ...tail]));
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const label = key(row);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  }
  return groups;
}

function momentCorrelation(x, y) {
  const n = x.length;
  const xMean = mean(x);
  const yMean = mean(y);
  let xy = 0;
  let xx = 0;
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - xMean;
    const b = y[i] - yMean;
    xy += a * b;
    xx += a * a;
    yy += b * b;
  }
  const variance = Math.sqrt(xx * yy);
  return variance > 1e-12 ? xy / variance : null;
}

export function pairStats(rows, left, right) {
  let leftErrors = 0;
  let rightErrors = 0;
  let jointErrors = 0;
  let bothValid = 0;
  let agree = 0;
  let bothWrongValid = 0;
  let wrongAgree = 0;
  for (const row of rows) {
    const a = row.predictions[left];
    const b = row.predictions[right];
    leftErrors += Number(a !== row.gold);
    rightErrors += Number(b !== row.gold);
    jointErrors += Number(a !== row.gold && b !== row.gold);
    if (a < 0 || b < 0) continue;
    bothValid++;
    agree += Number(a === b);
    if (a !== row.gold && b !== row.gold) {
      bothWrongValid++;
      wrongAgree += Number(a === b);
    }
  }
  const n = rows.length;
  const denominator = Math.sqrt(leftErrors * (n - leftErrors) * rightErrors * (n - rightErrors));
  return {
    members: [left, right], n, leftErrors, rightErrors, jointErrors,
    jointErrorRate: jointErrors / n,
    excess: (jointErrors * n - leftErrors * rightErrors) / (n * n),
    phi: denominator ? (jointErrors * n - leftErrors * rightErrors) / denominator : null,
    bothValid, agree, bothWrongValid, wrongAgree,
    answerAgreement: bothValid ? agree / bothValid : null,
    wrongAgreement: bothWrongValid ? wrongAgree / bothWrongValid : null,
  };
}

function committeeSummary(rows, members, policy, seed) {
  let correct = 0;
  let valid = 0;
  for (const row of rows) {
    const answer = committeeAnswer(row, members, policy, seed);
    correct += Number(answer === row.gold);
    valid += Number(answer !== null);
  }
  return summarize(rows.length, correct, valid);
}

function summarize(n, correct, valid) {
  return { n, correct, valid, abstentions: n - valid, accuracy: correct / n,
    coverage: valid / n, validAccuracy: valid ? correct / valid : null };
}

function highestCandidate(candidates, metric) {
  return candidates.reduce((best, candidate) => metric(candidate) > metric(best) ? candidate : best);
}

export function select(calibration, models, cfg) {
  const members = models.map((_, i) => i);
  const n = calibration.length;
  const correct = members.map((i) => calibration.filter((row) => row.predictions[i] === row.gold).length);
  const individual = correct.map((count) => count / n);
  const pairs = new Map(combinations(members, 2).map(([i, j]) =>
    [String([i, j]), pairStats(calibration, i, j)]));
  const base = highestCandidate(members, (i) => individual[i]);
  const random = makeRandom(cfg.selection.randomSeed);
  const selections = {};
  let triples;
  for (const size of cfg.selection.sizes) {
    const candidates = combinations(members, size).map((indices) => {
      const own = indices.map((i) => individual[i]);
      const dyads = combinations(indices, 2).map((pair) => pairs.get(String(pair)));
      const totalCorrect = indices.reduce((sum, i) => sum + correct[i], 0);
      const excessNumerator = dyads.reduce((sum, pair) =>
        sum + pair.jointErrors * n - pair.leftErrors * pair.rightErrors, 0);
      return {
        members: indices, families: new Set(indices.map((i) => models[i].family)).size,
        meanAccuracy: mean(own), excess: mean(dyads.map((pair) => pair.excess)),
        totalCorrect, complementarityScore: 2 * dyads.length * n * totalCorrect - size * excessNumerator,
        calibrationCorrect: committeeSummary(calibration, indices, 'majority', cfg.voting.tieSeed).correct,
        sortedAccuracy: [...own].sort((a, b) => a - b),
        sortedPhi: dyads.map((pair) => pair.phi).sort((a, b) => (a ?? Infinity) - (b ?? Infinity)),
      };
    });
    if (size === cfg.higherOrder.committeeSize) triples = candidates;
    const diverse = candidates.filter((candidate) => candidate.families === size);
    selections[size] = {
      evaluated: candidates.length, familyEligible: diverse.length,
      topAccuracy: highestCandidate(candidates, (x) => x.totalCorrect).members,
      seededRandom: candidates[random.integer(candidates.length)].members,
      distinctFamilies: highestCandidate(diverse, (x) => x.totalCorrect).members,
      complementarity: highestCandidate(candidates, (x) => x.complementarityScore).members,
      directVote: highestCandidate(candidates, (x) => x.calibrationCorrect).members,
      calibration: candidates.map(({ members: indices, meanAccuracy, excess, calibrationCorrect }) =>
        ({ members: indices, meanAccuracy, excess, calibrationCorrect })),
    };
  }
  return { n: calibration.length, baseline: base, individual, selections,
    higherOrder: higherMatch(triples, cfg.higherOrder) };
}

function higherMatch(triples, cfg) {
  let best = null;
  let total = 0;
  for (const [a, b] of combinations(triples, 2)) {
    if ([...a.sortedPhi, ...b.sortedPhi].includes(null)) continue;
    const accuracyDistance = a.sortedAccuracy.map((value, i) => Math.abs(value - b.sortedAccuracy[i]));
    const phiDistance = a.sortedPhi.map((value, i) => Math.abs(value - b.sortedPhi[i]));
    if (Math.max(...accuracyDistance) > cfg.marginalTolerance || Math.max(...phiDistance) > cfg.phiTolerance) continue;
    total++;
    const distance = [...accuracyDistance, ...phiDistance].reduce((sum, value) => sum + value, 0);
    if (best === null || distance < best.distance) {
      best = { left: a.members, right: b.members, distance, accuracyDistance, phiDistance };
    }
  }
  return { eligiblePairs: total, matched: best };
}

export function pairedBootstrap(rows, differences, cfg) {
  const subjectGroups = groupBy(rows.map((row, i) => ({ ...row, index: i })), (row) => row.subject);
  const strata = [...subjectGroups.keys()].sort().map((key) => {
    const groups = groupBy(subjectGroups.get(key), (row) => row.group);
    return [...groups.values()].map((group) => ({
      size: group.length,
      totals: differences.map((series) => group.reduce((sum, row) => sum + series[row.index], 0)),
    }));
  });
  const draws = differences.map(() => []);
  const random = makeRandom(cfg.seed);
  for (let b = 0; b < cfg.replicates; b++) {
    const totals = differences.map(() => 0);
    let n = 0;
    for (const stratum of strata) {
      for (let i = 0; i < stratum.length; i++) {
        const group = stratum[random.integer(stratum.length)];
        n += group.size;
        for (let j = 0; j < totals.length; j++) totals[j] += group.totals[j];
      }
    }
    for (let j = 0; j < totals.length; j++) draws[j].push(totals[j] / n);
  }
  return draws.map((draw, i) => {
    draw.sort((a, b) => a - b);
    return { estimate: mean(differences[i]), interval: cfg.interval.map((q) => draw[Math.floor((cfg.replicates - 1) * q)]) };
  });
}

function failureHistogram(rows, members) {
  const counts = Array(members.length + 1).fill(0);
  for (const row of rows) counts[members.reduce((n, i) => n + failed(row, i), 0)]++;
  return counts;
}

function conditioning(rows, calibration, members) {
  const broad = groupBy(calibration, (r) => r.subject);
  const specific = groupBy(calibration, (r) => r.source);
  const residuals = members.map((i) => {
    const general = new Map([...broad].map(([key, data]) => [key, 1 - accuracy(data, i)]));
    const details = new Map([...specific].filter(([, data]) => data.length >= 15)
      .map(([key, data]) => [key, 1 - accuracy(data, i)]));
    return rows.map((row) => failed(row, i) - (details.get(row.source) ?? general.get(row.subject)));
  });
  return combinations(members, 2).map(([a, b]) => momentCorrelation(residuals[a], residuals[b]));
}

function relative(option, gold) {
  if (option < 0) return -1;
  if (option === gold) return 0;
  return option < gold ? option + 1 : option;
}

function categorical(rows, count, members) {
  return members.map((i) => {
    const sums = Array(count + 1).fill(1);
    for (const row of rows) {
      const value = relative(row.predictions[i], row.gold);
      if (value >= count) continue;
      sums[value + 1]++;
    }
    let total = 0;
    const cumulative = sums.map((value) => (total += value));
    return cumulative.map((value) => value / total);
  });
}

function shuffle(values, random) {
  const target = [...values];
  for (let i = target.length - 1; i > 0; i--) {
    const j = random.integer(i + 1);
    [target[i], target[j]] = [target[j], target[i]];
  }
  return target;
}

function addReferenceVote(predictions, options, id, members, seed, result, weight = 1) {
  const row = { predictions, options, id, gold: 0 };
  for (const policy of Object.keys(POLICIES)) {
    result[policy] += weight * Number(committeeAnswer(row, members, policy, seed) === 0);
  }
}

function emptyPolicies() {
  return Object.fromEntries(Object.keys(POLICIES).map((policy) => [policy, 0]));
}

function theoreticalReferences(calibration, heldout, members, cfg) {
  const strata = groupBy(calibration, (row) => row.subject + ':' + row.options);
  const whole = groupBy(calibration, (row) => row.subject);
  const target = groupBy(heldout, (row) => row.subject + ':' + row.options);
  const categoricalRates = emptyPolicies();
  const repaired = emptyPolicies();
  const perStratum = [];
  let supported = 0;
  const categoricalRandom = makeRandom(cfg.references.categoricalSeed);
  const repairRandom = makeRandom(cfg.references.repairSeed);
  const individual = members.map((member) => accuracy(calibration, member));
  const homogeneous = poissonBinomial(individual.map(() => mean(individual)));
  const heterogeneous = poissonBinomial(individual);
  const threshold = Math.floor(members.length / 2) + 1;
  for (const [key, data] of [...target.entries()].sort(([a], [b]) => a < b ? -1 : 1)) {
    const { subject, options } = data[0];
    const onStratum = strata.get(key) ?? [];
    const source = onStratum.length >= 20 ? onStratum : whole.get(subject);
    const cumulative = categorical(source, options, members);
    const samples = cfg.references.categoricalPerStratum;
    const tally = emptyPolicies();
    for (let i = 0; i < samples; i++) {
      const predictions = cumulative.map((cdf) => {
        const uniform = categoricalRandom.unit();
        return cdf.findIndex((limit) => uniform < limit) - 1;
      });
      addReferenceVote(predictions, options, i, members, cfg.voting.tieSeed, tally);
    }
    for (const policy of Object.keys(tally)) categoricalRates[policy] += data.length * tally[policy] / samples;
    perStratum.push({ subject, options, heldout: data.length, calibration: onStratum.length,
      categoricalFit: onStratum.length >= 20 ? 'subject and options' : 'subject fallback' });
    if (!onStratum.length) continue;
    supported += data.length;
    const columns = members.map((i) => onStratum.map((row) => relative(row.predictions[i], row.gold)));
    const weight = data.length / (cfg.references.repairReplicates * onStratum.length);
    for (let b = 0; b < cfg.references.repairReplicates; b++) {
      const permutations = columns.map((column) => shuffle(column, repairRandom));
      for (let i = 0; i < onStratum.length; i++) {
        addReferenceVote(permutations.map((p) => p[i]), options, onStratum[i].id,
          members, cfg.voting.tieSeed, repaired, weight);
      }
    }
  }
  return {
    independence: {
      homogeneous: homogeneous.slice(threshold).reduce((a, b) => a + b, 0),
      heterogeneous: heterogeneous.slice(threshold).reduce((a, b) => a + b, 0),
      correctCountDistribution: heterogeneous, calibrationMarginals: individual,
    },
    categorical: Object.fromEntries(Object.entries(categoricalRates).map(([p, x]) => [p, x / heldout.length])),
    rePair: Object.fromEntries(Object.entries(repaired).map(([p, x]) => [p, x / supported])),
    repairCoverage: supported, perStratum,
  };
}

export function evaluate(calibration, heldout, models, cfg, selection) {
  const members = models.map((_, i) => i);
  const baseline = (row) => Number(row.predictions[selection.baseline] === row.gold);
  const baselineSummary = summarize(heldout.length, heldout.filter(baseline).length,
    heldout.filter((row) => row.predictions[selection.baseline] >= 0).length);
  const ids = ['panelMajority'];
  const differences = [heldout.map((row) =>
    Number(committeeAnswer(row, members, 'majority', cfg.voting.tieSeed) === row.gold) - baseline(row))];
  const optimization = [];
  for (const size of cfg.selection.sizes) {
    for (const method of cfg.selection.objectives) {
      const subset = selection.selections[size][method];
      const reference = selection.selections[size].topAccuracy;
      const key = size + ':' + method;
      ids.push(key);
      differences.push(heldout.map((row) =>
        Number(committeeAnswer(row, subset, 'majority', cfg.voting.tieSeed) === row.gold) -
        Number(committeeAnswer(row, reference, 'majority', cfg.voting.tieSeed) === row.gold)));
      optimization.push({ key, size, method, members: subset,
        heldout: committeeSummary(heldout, subset, 'majority', cfg.voting.tieSeed),
        calibration: committeeSummary(calibration, subset, 'majority', cfg.voting.tieSeed) });
    }
  }
  const contrasts = Object.fromEntries(pairedBootstrap(heldout, differences, cfg.bootstrap)
    .map((interval, i) => [ids[i], interval]));
  const pair = combinations(members, 2).map(([a, b]) => pairStats(heldout, a, b));
  const residual = conditioning(heldout, calibration, members);
  const counts = failureHistogram(heldout, members);
  const policies = Object.fromEntries(Object.keys(POLICIES).map((policy) =>
    [policy, committeeSummary(heldout, members, policy, cfg.voting.tieSeed)]));
  const scope = [...groupBy(heldout, (row) => row.subject)].map(([subject, rows]) => ({
    subject, n: rows.length, groups: new Set(rows.map((r) => r.group)).size,
    majority: committeeSummary(rows, members, 'majority', cfg.voting.tieSeed),
    baseline: summarize(rows.length, rows.filter(baseline).length,
      rows.filter((row) => row.predictions[selection.baseline] >= 0).length),
  }));
  const match = selection.higherOrder.matched;
  const higherOrder = match ? [match.left, match.right].map((subset) => ({
    members: subset, accuracy: subset.map((i) => accuracy(heldout, i)),
    pairs: combinations(subset, 2).map(([a, b]) => pairStats(heldout, a, b).phi),
    errorCounts: failureHistogram(heldout, subset),
    majority: committeeSummary(heldout, subset, 'majority', cfg.voting.tieSeed),
  })) : null;
  return {
    n: heldout.length, groups: new Set(heldout.map((r) => r.group)).size,
    models: members.map((i) => ({
      id: models[i].id,
      ...summarize(heldout.length, heldout.filter((r) => r.predictions[i] === r.gold).length,
        heldout.filter((r) => r.predictions[i] >= 0).length),
      filterMissing: heldout.filter((r) => r.predictions[i] === -1).length,
      invalidLabel: heldout.filter((r) => r.predictions[i] === -2).length,
    })),
    baseline: baselineSummary, selectedBaseline: selection.baseline, policies,
    primary: contrasts.panelMajority, incorrectMemberCounts: counts,
    unanimousFailure: counts.at(-1), pairs: pair.map((metric, i) => ({ ...metric, residualPhi: residual[i] })),
    scope, optimization: optimization.map((entry) => ({ ...entry, vsTopAccuracy: contrasts[entry.key] })),
    references: theoreticalReferences(calibration, heldout, members, cfg), higherOrder,
  };
}
