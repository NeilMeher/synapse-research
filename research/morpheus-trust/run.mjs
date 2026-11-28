import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runTrust } from '../../engine/morpheus-trust.mjs';

const here = new URL('./', import.meta.url);
const archive = new URL('../evidence/morpheus-dynamic-trust-001/', here);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = data => JSON.stringify(data, null, 2) + '\n';
const configBytes = await readFile(new URL('protocol.json', here));
const cfg = JSON.parse(configBytes);
const [stage, freeze] = process.argv.slice(2);
if (stage === 'development') {
  const fixture = runTrust(cfg, true);
  const a = fixture.arms['burst:3'].first;
  const b = fixture.arms['clean:3'].first;
  if (a.reportCount !== b.reportCount || a.auditCount !== b.auditCount || JSON.stringify(a.truth) !== JSON.stringify(b.truth)) {
    throw new Error('Development failed to preserve matched report and verification channels');
  }
  console.log(JSON.stringify({ developmentHistoriesPerArm: fixture.historiesPerArm, reports: a.reportCount, audits: a.auditCount }));
} else {
  if (!['run', 'verify'].includes(stage)) throw new Error('Expected development, run or verify');
  const source = new URL('results.json', archive);
  const manifestFile = new URL('manifest.json', archive);
  const result = runTrust(cfg);
  const payload = JSON.stringify(result) + '\n';
  const prior = stage === 'verify' ? JSON.parse(await readFile(manifestFile)) : null;
  const protocolCommit = prior?.protocolCommit ?? freeze;
  if (!/^[a-f0-9]{40}$/.test(protocolCommit)) throw new Error('Protocol commit required');
  const manifest = { id: cfg.id, evidence: cfg.evidenceClass, status: 'completed', protocolCommit,
    configSha256: hash(configBytes), engineSha256: hash(await readFile(new URL('../../engine/morpheus-trust.mjs', here))),
    outputs: { 'results.json': { bytes: Buffer.byteLength(payload), sha256: hash(payload) } } };
  if (stage === 'run') await mkdir(archive, { recursive: true });
  for (const [file, desired] of [[source, payload], [manifestFile, json(manifest)]]) {
    if (stage === 'run') {
      try { await writeFile(file, desired, { flag: 'wx' }); continue; }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    if (await readFile(file, 'utf8') !== desired) throw new Error('Immutable archive differs');
  }
  console.log(JSON.stringify({ stage, primary: result.arms['burst:3'].paired.duringBurst,
    cleanAdaptation: result.arms['clean:3'].paired.adaptation,
    delayed: result.arms['burst:8'].paired.duringBurst }));
}
