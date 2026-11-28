import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tally } from '../../engine/echo-public.mjs';
import { combinations, pairedBootstrap, pairStats } from '../echo-public/analysis.mjs';

const input = new URL('./', import.meta.url);
const archive = new URL('../archives/echo-hindi-economics-001/', input);
const parse = async url => JSON.parse(await readFile(url));
const encode = (value, compact = false) => JSON.stringify(value, null, compact ? undefined : 2) + '\n';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };
const [stage, path, frozen] = process.argv.slice(2);
const cfg = await parse(new URL('protocol.json', input));
const audit = await parse(new URL('alignment.json', input));
const cohort = await parse(new URL('cohort.json', input));
const models = (await parse(new URL('../echo-public/sources.json', input))).models.map(m => m.id);
const members = audit.compatibleModelIds.map(m => models.indexOf(m));
const everyone = models.map((_, i) => i);
const baseline = models.indexOf(cfg.historicalBaselineModel);
const data = stage === 'run' ? await parse(path) : await parse(new URL('predictions.json', archive));
check(['run', 'verify'].includes(stage), 'Use run or verify');
check(data.length === cohort.length && members.length >= cfg.minimumCompatibleModels &&
  data.length >= cfg.minimumPairs, 'Coverage threshold failed');
for (const [i, row] of data.entries()) {
  check(Object.entries(cohort[i]).every(([key, value]) => row[key] === value) &&
    row.gold >= 0 && row.gold < row.options && ['en', 'hi'].every(lang => row[lang].length === models.length &&
    row[lang].every(x => Number.isInteger(x) && x >= -2 && x < row.options)),
  'Invalid canonical pair ' + i);
}
const cal = data.filter(q => q.split === 'calibration');
const heldout = data.filter(q => q.split === 'heldout').map(q => ({ ...q, subject: 'economics' }));
check(heldout.length >= cfg.minimumHeldout, 'Held-out count threshold failed');

function decision(row, lang, team, policy) {
  return tally(row[lang], team, row.options, policy, row.id, cfg.tieSeed);
}

function getVotes(rows, lang, team, policy) {
  return rows.map(row => decision(row, lang, team, policy).answer);
}

function summarize(rows, votes, modelCalls) {
  let correct = 0;
  let valid = 0;
  for (const [i, row] of rows.entries()) {
    const v = votes[i];
    if (v === null || v < 0) continue;
    valid++;
    correct += Number(v === row.gold);
  }
  const n = rows.length;
  const wrong = valid - correct;
  return { n, correct, wrong, abstain: n - valid, coverage: valid / n,
    accuracy: correct / n, validAccuracy: valid ? correct / valid : null, modelCalls,
    utility: Object.fromEntries(cfg.decisionUtilities.wrongCosts.map(c => [c, (correct - c * wrong) / n])) };
}

function support(row, lang) {
  const vote = decision(row, lang, members, 'plurality');
  return { answer: vote.answer, count: Math.max(...vote.counts) };
}

function thresholdVotes(rows, lang, minimum) {
  return rows.map(row => {
    const vote = support(row, lang);
    return vote.count >= minimum ? vote.answer : null;
  });
}

function weighted(row, lang, weight) {
  const counts = Array(row.options).fill(0);
  for (const i of members) {
    if (row[lang][i] >= 0) counts[row[lang][i]] += weight[i];
  }
  const high = Math.max(...counts);
  if (!high) return null;
  const sorted = counts.flatMap((c, i) => c === high ? [i] : []);
  return sorted[(Math.imul((row.id ^ cfg.tieSeed), 2654435761) >>> 0) % sorted.length];
}

function agreement(rows, lang) {
  const bins = Array.from({ length: members.length + 1 }, () => ({ n: 0, correct: 0 }));
  for (const row of rows) {
    const vote = support(row, lang);
    if (vote.answer === null) continue;
    bins[vote.count].n++;
    bins[vote.count].correct += Number(vote.answer === row.gold);
  }
  return bins.map(b => ({ ...b, probability: (b.correct + 1) / (b.n + 2) }));
}

function brier(rows, lang, bins, constant) {
  let n = 0, agreementLoss = 0, constantLoss = 0;
  for (const row of rows) {
    const vote = support(row, lang);
    if (vote.answer === null) continue;
    const y = Number(vote.answer === row.gold);
    n++;
    agreementLoss += (bins[vote.count].probability - y) ** 2;
    constantLoss += (constant - y) ** 2;
  }
  return { n, agreement: agreementLoss / n, constant: constantLoss / n };
}

function individual(row, lang) {
  const answer = row[lang][baseline];
  return answer >= 0 ? answer : null;
}

const language = Object.fromEntries(['en', 'hi'].map(lang => {
  const majority = getVotes(heldout, lang, members, 'majority');
  const base = heldout.map(row => individual(row, lang));
  const weight = models.map((_, i) => cal.filter(r => r[lang][i] === r.gold).length + 1);
  const quorums = cfg.quorums.map(q => {
    const summary = summarize(cal, thresholdVotes(cal, lang, q), members.length);
    return { quorum: q, correct: summary.correct, wrong: summary.wrong,
      value: summary.correct - cfg.decisionUtilities.calibrationWrongCost * summary.wrong };
  }).sort((a, b) => b.value - a.value || b.quorum - a.quorum);
  const selected = quorums[0].quorum;
  const policies = {
    individual: base, majority, plurality: getVotes(heldout, lang, members, 'plurality'),
    unanimity: getVotes(heldout, lang, members, 'unanimity'),
    majorityFallback: majority.map((x, i) => x ?? base[i]),
    reliability: heldout.map(row => weighted(row, lang, weight)),
    threshold: thresholdVotes(heldout, lang, selected),
  };
  const score = Object.fromEntries(Object.entries(policies).map(([kind, votes]) =>
    [kind, summarize(heldout, votes, kind === 'individual' ? 1 : members.length)]));
  const restrict = heldout.flatMap((_, i) => majority[i] !== null ? [i] : []);
  const bins = agreement(cal, lang);
  const fit = { n: bins.reduce((a, b) => a + b.n, 0), correct: bins.reduce((a, b) => a + b.correct, 0) };
  const constant = (fit.correct + 1) / (fit.n + 2);
  const hist = Array(members.length + 1).fill(0);
  for (const row of heldout) hist[members.filter(i => row[lang][i] !== row.gold).length]++;
  const adapted = heldout.map(row => ({ predictions: row[lang], gold: row.gold }));
  return [lang, {
    policies: score, threshold: selected, calibrationThresholds: quorums, weight,
    modelRates: members.map(i => ({ model: models[i],
      noFilterMatch: heldout.filter(r => r[lang][i] === -1).length,
      invalidOption: heldout.filter(r => r[lang][i] === -2).length,
      ...summarize(heldout, heldout.map(row => row[lang][i]), 1) })),
    sameSupport: { n: restrict.length, majorityCorrect: restrict.filter(i => majority[i] === heldout[i].gold).length,
      individualCorrect: restrict.filter(i => base[i] === heldout[i].gold).length,
      individualValid: restrict.filter(i => base[i] !== null).length },
    dependence: combinations(members, 2).map(([i, j]) => pairStats(adapted, i, j)),
    failedMembers: hist,
    agreement: { calibrationBins: bins, constant, heldout: brier(heldout, lang, bins, constant) },
    transferred: cfg.unchangedCommittees.map(team => ({ members: team, ...summarize(heldout,
      getVotes(heldout, lang, team, 'majority'), team.length) })),
    sensitivityWithOlmo: summarize(heldout, getVotes(heldout, lang, everyone, 'majority'), everyone.length),
  }];
}));
const en = getVotes(heldout, 'en', members, 'majority');
const hi = getVotes(heldout, 'hi', members, 'majority');
const [primary] = pairedBootstrap(heldout, [heldout.map((r, i) =>
  Number(hi[i] === r.gold) - Number(en[i] === r.gold))], cfg.interval);
const cross = members.map(i => {
  const paired = heldout.map(r => ({ gold: r.gold, predictions: [r.en[i], r.hi[i]] }));
  const { members: _, ...pair } = pairStats(paired, 0, 1);
  return { model: models[i], ...pair };
});
const report = { evidence: cfg.evidenceClass, study: cfg.id, models: audit.compatibleModelIds,
  questionCount: data.length, partitions: audit.partitions, groupCounts: audit.groupCounts,
  rawHindiPredictionsChecked: audit.rawHindiPredictions, pairsPerLanguage: data.length * members.length,
  primary, crossLanguageDependence: cross, observations: language, newInferenceRequests: 0,
  coverageIdentity: 'full-plan correctness = coverage × conditional correctness on any nonempty decision set' };
const outputs = { 'predictions.json': encode(data, true), 'results.json': encode(report) };
const before = stage === 'verify' ? await parse(new URL('manifest.json', archive)) : null;
const commit = stage === 'verify' ? before.protocolCommit : frozen;
check(/^[a-f0-9]{40}$/.test(commit), 'Freeze commit required');
const inputs = {};
for (const name of ['sources.json', 'cohort.json', 'alignment.json', 'protocol.json', 'align.py', 'run.mjs']) {
  const bytes = await readFile(new URL(name, input));
  inputs[name] = { sha256: hash(bytes), bytes: bytes.length };
}
const manifest = { id: cfg.id, evidence: cfg.evidenceClass, protocolCommit: commit, status: 'completed',
  inputs, outputs: Object.fromEntries(Object.entries(outputs).map(([name, s]) =>
    [name, { sha256: hash(s), bytes: Buffer.byteLength(s) }])) };
if (stage === 'run') await mkdir(archive, { recursive: true });
for (const [name, text] of Object.entries({ ...outputs, 'manifest.json': encode(manifest) })) {
  const file = new URL(name, archive);
  if (stage === 'verify') check(await readFile(file, 'utf8') === text, 'Changed archive file ' + name);
  else {
    try { await writeFile(file, text, { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST' || await readFile(file, 'utf8') !== text) throw error;
    }
  }
}
console.log(JSON.stringify({ stage, primary, english: language.en.policies.majority,
  hindi: language.hi.policies.majority }));
