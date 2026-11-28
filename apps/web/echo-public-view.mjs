import { byId, node } from './view.mjs';
import { row } from './study-view.mjs';
import { setupTheme } from './theme.mjs';
import { committeeAnswer, POLICIES, tally } from './engine/echo-public.mjs';

const root = './empirical/archives/echo-public-empirical-001/';
const labels = 'ABCDEFGHIJ';
const method = { topAccuracy: 'Individual accuracy', seededRandom: 'Seeded random',
  distinctFamilies: 'Distinct families', complementarity: 'Error complementarity', directVote: 'Direct vote optimization' };
const matrix = {
  phi: ['Error correlation', 'Pearson phi on the full common question set. Invalid outputs count as errors.'],
  wrongAgreement: ['Same wrong answer', 'Share choosing the same option when both outputs were valid and wrong.'],
  jointErrorRate: ['Joint failure frequency', 'Share of matched questions that both members got wrong or left unanswered.'],
  residualPhi: ['Source-adjusted error correlation', 'Pearson correlation after removing source-specific calibration error rates where available.'],
};
const percent = (value) => value === null ? '—' : (value * 100).toFixed(2) + '%';
const delta = (value) => (value < 0 ? '−' : '+') + (Math.abs(value) * 100).toFixed(2) + ' pp';
const interval = (values) => values.map(delta).join(' to ');
const answer = (value) => value === -1 ? 'Filter extracted no answer' :
  value === -2 ? 'Out-of-range label' : value === null ? 'Abstention' : labels[value];
let models, report, heldout, plan;

async function load(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Evidence unavailable');
  return response.json();
}

function measure(label, value) {
  const box = node('div');
  box.append(node('span', label), node('strong', value));
  return box;
}

function bar(label, value, foot) {
  const item = node('li');
  const words = node('span', label);
  if (foot) words.append(node('small', foot));
  const fill = node('meter');
  fill.max = 1;
  fill.value = value;
  fill.setAttribute('aria-hidden', 'true');
  item.append(words, fill, node('strong', percent(value)));
  return item;
}

function tableHeading(label, scope) {
  const heading = node('th', label);
  heading.scope = scope;
  return heading;
}

function renderMatrix() {
  const key = byId('echo-metric').value;
  const [label, description] = matrix[key];
  byId('echo-matrix-caption').textContent = label + ' · ' + report.n + ' matched items';
  byId('echo-matrix-note').textContent = description;
  const head = node('tr');
  head.append(tableHeading('Model', 'col'), ...models.map(m => tableHeading(m.short, 'col')));
  byId('echo-matrix-head').replaceChildren(head);
  const pairs = new Map(report.pairs.map(p => [String(p.members), p]));
  byId('echo-matrix').replaceChildren(...models.map((model, i) => {
    const tr = node('tr');
    tr.append(tableHeading(model.short, 'row'));
    for (const j of models.keys()) {
      const metric = i === j ? null : pairs.get(String([Math.min(i, j), Math.max(i, j)]));
      const value = metric ? metric[key] : null;
      const correlation = key === 'phi' || key === 'residualPhi';
      const cell = node('td', value == null ? '—' : correlation ? value.toFixed(3) : percent(value));
      if (value != null) {
        cell.style.setProperty('--heat', (Math.max(0, Math.min(1, Math.abs(value))) * 20) + '%');
        if (key === 'wrongAgreement') cell.title = metric.wrongAgree + ' of ' + metric.bothWrongValid;
      }
      tr.append(cell);
    }
    return tr;
  }));
}

function replay() {
  const members = [...byId('echo-members').querySelectorAll('input:checked')].map(el => Number(el.value));
  const task = heldout[byId('echo-question').selectedIndex];
  const selection = byId('echo-policy').value;
  const result = byId('echo-replay');
  if (!members.length) {
    byId('echo-explore').textContent = 'Select at least one model to calculate a vote.';
    result.replaceChildren();
    return;
  }
  const vote = tally(task.predictions, members, task.options, selection, task.id, plan.voting.tieSeed);
  let valid = 0;
  let correct = 0;
  for (const item of heldout) {
    const option = committeeAnswer(item, members, selection, plan.voting.tieSeed);
    valid += Number(option !== null);
    correct += Number(option === item.gold);
  }
  byId('echo-explore').textContent = 'Exploratory held-out accuracy ' + percent(correct / heldout.length) +
    ' · coverage ' + percent(valid / heldout.length) + ' · ' + correct + ' correct from ' + heldout.length + ' questions.';
  const items = node('ul', null, 'obs-choice-list');
  items.append(...members.map(i => node('li', models[i].label + ' · ' + answer(task.predictions[i]))));
  result.replaceChildren(node('h3', 'Question ' + task.id + ' · ' + task.subject),
    node('p', task.options + ' eligible choices · verified answer ' + answer(task.gold)),
    node('p', 'Committee outcome ' + answer(vote.answer) + ' · ' + vote.valid + ' valid votes'), items);
}

function render(selection) {
  const all = report.policies.majority;
  const base = models[report.selectedBaseline];
  byId('echo-headline').replaceChildren(measure('Seven-model accuracy', percent(all.accuracy)),
    measure(base.short + ' accuracy', percent(report.baseline.accuracy)),
    measure('Paired difference', delta(report.primary.estimate)));
  byId('echo-interval').textContent = '95% paired group bootstrap interval ' + interval(report.primary.interval) +
    ' across ' + report.n + ' questions in ' + report.groups + ' source groups.';
  byId('echo-models').replaceChildren(...report.models.map((item, i) =>
    bar(models[i].label, item.accuracy, item.correct + ' / ' + item.n + ' correct · ' + percent(item.coverage) + ' coverage')));
  byId('echo-policy-rows').replaceChildren(...Object.entries(POLICIES).map(([key, label]) => {
    const result = report.policies[key];
    return row(label, percent(result.accuracy), percent(result.coverage), percent(result.validAccuracy));
  }));
  byId('echo-failures').replaceChildren(...report.incorrectMemberCounts.map((count, k) => {
    const entry = node('li');
    entry.append(node('span', k + ' failed'), node('strong', count));
    return entry;
  }));
  byId('echo-unanimous').textContent = report.unanimousFailure + ' of ' + report.n + ' questions defeated all seven models.';
  byId('echo-searched').textContent = Object.entries(selection.selections).map(([size, search]) =>
    search.evaluated + ' size-' + size + ' subsets assessed, including ' + search.familyEligible + ' with distinct families').join(' · ') + '.';
  byId('echo-optimization-rows').replaceChildren(...report.optimization.map(item =>
    row(item.size + ' · ' + method[item.method], item.members.map(i => models[i].short).join(', '),
      percent(item.calibration.accuracy), percent(item.heldout.accuracy), percent(item.heldout.coverage),
      delta(item.vsTopAccuracy.estimate) + ' (' + interval(item.vsTopAccuracy.interval) + ')')));
  const higher = report.higherOrder;
  byId('echo-higher').textContent = higher ? selection.higherOrder.eligiblePairs +
    ' three-member pairs met the calibration similarity tolerances. The closest pair had held-out majority accuracy of ' +
    higher.map(({ majority }) => percent(majority.accuracy)).join(' and ') + '.' :
    'No committee pair met the prespecified higher-order similarity tolerances.';
  const ref = report.references;
  byId('echo-reference-rows').replaceChildren(...Object.entries(POLICIES).map(([key, label]) =>
    row(label, percent(report.policies[key].accuracy),
      key === 'majority' ? percent(ref.independence.homogeneous) : '—',
      key === 'majority' ? percent(ref.independence.heterogeneous) : '—',
      percent(ref.categorical[key]), percent(ref.rePair[key]))));
  byId('echo-support').textContent = 'Calibration had matching subject and option-count strata for ' +
    ref.repairCoverage + ' of ' + report.n + ' held-out questions.';
  byId('echo-members').replaceChildren(...models.map((model, i) => {
    const label = node('label');
    const input = node('input');
    input.type = 'checkbox';
    input.value = i;
    input.checked = true;
    label.append(input, node('span', model.label));
    return label;
  }));
  byId('echo-policy').replaceChildren(...Object.entries(POLICIES).map(([key, value]) => new Option(value, key)));
  byId('echo-question').replaceChildren(...heldout.map((task) =>
    new Option(task.id + ' · ' + task.subject, task.id)));
  renderMatrix();
  replay();
}

setupTheme();
try {
  const [evidence, scheme, protocol, selected, result, predictions] = await Promise.all([
    load(root + 'manifest.json'), load('./empirical/echo-public/sources.json'),
    load('./empirical/echo-public/protocol.json'), load('./empirical/echo-public/selection.json'),
    load(root + 'results.json'), load(root + 'predictions.json'),
  ]);
  if (evidence.id !== 'echo-public-empirical-001' || evidence.originalModelInferenceRequests !== 0 ||
      scheme.models.length !== 7 || result.n !== predictions.heldout.length) throw new Error('Unexpected evidence');
  models = scheme.models.map((m, i) => ({ ...m, short: ['Qwen 9B','Olmo 7B','Gemma 12B','Gemma 4B','Llama 8B','Llama 3B','Phi Mini'][i] }));
  report = result;
  heldout = predictions.heldout;
  plan = protocol;
  render(selected);
  byId('echo-metric').addEventListener('change', renderMatrix);
  for (const id of ['echo-members', 'echo-policy', 'echo-question']) byId(id).addEventListener('change', replay);
  byId('echo-data').hidden = false;
  byId('echo-status').textContent = '1,074 held-out questions · genuine archived predictions';
} catch {
  byId('echo-status').textContent = 'The ECHO public archive is unavailable. The manuscript and frozen protocol are listed below.';
}
