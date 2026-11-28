import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, select } from './analysis.mjs';

const work = fileURLToPath(new URL('./', import.meta.url));
const archive = fileURLToPath(new URL('../archives/echo-public-empirical-001/', import.meta.url));
const parse = async (root, name) => JSON.parse(await readFile(resolve(root, name), 'utf8'));
const encode = (value, compact = false) => JSON.stringify(value, null, compact ? undefined : 2) + '\n';
const sha = (text) => createHash('sha256').update(text).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };

async function sameOrWrite(directory, name, text) {
  const path = resolve(directory, name);
  try {
    await writeFile(path, text, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    check(await readFile(path, 'utf8') === text, 'Existing frozen file differs: ' + name);
  }
}

const [stage, input, protocolCommit, selectionCommit] = process.argv.slice(2);
const [manifest, config, eligible, split] = await Promise.all([
  parse(work, 'sources.json'), parse(work, 'protocol.json'), parse(work, 'eligible.json'), parse(work, 'splits.json'),
]);
const canonical = new Map(eligible.map((row) => [row.id, row]));
const models = manifest.models;
const validate = (part, rows) => {
  const expected = eligible.filter((row) => split[row.id] === part);
  check(expected.length === rows.length, 'Partition size mismatch: ' + part);
  const sourceRows = models.map(() => new Set());
  for (const [i, row] of rows.entries()) {
    const source = canonical.get(row.id);
    check(expected[i].id === row.id && source && row.group === source.group &&
      row.subject === source.subject && row.source === source.source && row.sourceId === source.sourceId &&
      row.options === source.options && row.contentHash === source.contentHash &&
      Number.isInteger(row.gold) && row.gold >= 0 && row.gold < row.options &&
      row.predictions.length === models.length && row.predictions.every((a) =>
        Number.isInteger(a) && a >= -2 && a < row.options) &&
      row.sourceRows.length === models.length && row.sourceRows.every((a, j) => {
        const key = row.subject + ':' + a;
        const fresh = !sourceRows[j].has(key);
        sourceRows[j].add(key);
        return Number.isInteger(a) && a >= 0 && fresh;
      }), 'Invalid canonical observation: ' + row.id);
  }
};

if (stage === 'select') {
  const calibration = await parse(input, 'calibration.json');
  validate('calibration', calibration);
  const selected = select(calibration, models, config);
  await sameOrWrite(work, 'selection.json', encode({
    calibrationSha256: sha(encode(calibration, true)), ...selected,
  }));
  console.log('Calibration baseline and committees frozen. No heldout file was opened.');
} else if (stage === 'run' || stage === 'verify') {
  const selected = await parse(work, 'selection.json');
  if (stage === 'run') {
    for (const hash of [protocolCommit, selectionCommit]) {
      check(/^[a-f0-9]{40}$/.test(hash), 'Frozen protocol and selection commits required');
    }
  }
  const prior = stage === 'verify' ? await parse(archive, 'manifest.json') : null;
  const data = stage === 'verify' ? await parse(archive, 'predictions.json') :
    Object.fromEntries(await Promise.all(config.partitions.map(async (part) =>
      [part, await parse(input, part + '.json')])));

  for (const part of config.partitions) validate(part, data[part]);
  check(sha(encode(data.calibration, true)) === selected.calibrationSha256,
    'Calibration input differs from frozen selection');
  const rebuilt = select(data.calibration, models, config);
  check(encode({ calibrationSha256: selected.calibrationSha256, ...rebuilt }) === encode(selected),
    'Frozen committee selection disagrees with replay');
  const report = evaluate(data.calibration, data.heldout, models, config, rebuilt);
  const outputs = {
    'predictions.json': encode(data, true),
    'results.json': encode(report),
  };
  const hashes = async (directory, names) => Object.fromEntries(await Promise.all(names.map(async (name) => {
    const value = await readFile(resolve(directory, name));
    return [name, { sha256: sha(value), bytes: value.length }];
  })));
  const run = {
    id: config.studyIds[0], companionStudy: config.studyIds[1],
    evidence: 'genuine archived predictions; no new SYNAPSE inference',
    protocolCommit: prior?.protocolCommit ?? protocolCommit,
    selectionCommit: prior?.selectionCommit ?? selectionCommit,
    sourceArchiveRevision: manifest.predictionArchive.revision,
    benchmarkAlignmentRevision: manifest.benchmark.alignmentRevision,
    inputResearchBytes: manifest.retrievedDataBytes,
    inputFileCount: manifest.files.length,
    originalModelInferenceRequests: 0,
    partitions: Object.fromEntries(config.partitions.map((part) =>
      [part, { items: data[part].length, groups: new Set(data[part].map((row) => row.group)).size }])),
    inputs: await hashes(work, ['sources.json', 'alignment.json', 'eligible.json', 'protocol.json', 'splits.json',
      'selection.json', 'extract.py', 'analysis.mjs', 'run.mjs', '../../engine/echo-public.mjs']),
    outputs: Object.fromEntries(Object.entries(outputs)
      .map(([name, text]) => [name, { sha256: sha(text), bytes: Buffer.byteLength(text) }])),
  };
  if (stage === 'run') {
    await mkdir(archive, { recursive: true });
    for (const [name, text] of Object.entries(outputs)) await sameOrWrite(archive, name, text);
    await sameOrWrite(archive, 'manifest.json', encode(run));
  } else {
    check(encode(run) === encode(prior), 'Archive manifest mismatch');
    for (const [name, text] of Object.entries(outputs)) {
      check(await readFile(resolve(archive, name), 'utf8') === text, 'Archive digest mismatch: ' + name);
    }
  }
  console.log(JSON.stringify({ study: run.id, stage, partitions: run.partitions, primary: report.primary }));
} else {
  throw new Error('Usage: node empirical/echo-public/run.mjs select|run|verify [input directory] [protocol SHA] [selection SHA]');
}
