import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync} from "node:fs";
import {arch, platform, release} from "node:os";
import {canonical, schemaVersion, validateResults} from "../engine/contracts.mjs";
import {experiment} from "../engine/experiment.mjs";
import {modelVersion} from "../engine/echo.mjs";

const root = new URL("../", import.meta.url);
const path = name => new URL(name, root);
const read = name => readFileSync(path(name));
const readJson = name => JSON.parse(read(name));
const serialize = value => JSON.stringify(value, null, 2) + "\n";
const hash = value => createHash("sha256").update(value).digest("hex");
const gitHead = () => execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
const inputPaths = mode => [
  "engine/echo.mjs", "engine/contracts.mjs", "engine/experiment.mjs", "engine/statistics.mjs",
  "scripts/experiment.mjs", "schemas/experiment-v1.json",
  "experiments/" + mode + ".json", "research/echo-protocol-" + mode + ".md",
];
const digests = mode => Object.fromEntries(inputPaths(mode).map(file => [file, hash(read(file))]));

function writeAtomic(name, contents) {
  const staging = name + "." + process.pid + ".tmp";
  writeFileSync(path(staging), contents, {flag: "wx"});
  try {
    renameSync(path(staging), path(name));
  } catch (error) {
    unlinkSync(path(staging));
    throw error;
  }
}

function modeFiles(mode) {
  return {
    config: "experiments/" + mode + ".json",
    results: "results/" + mode + ".json",
    manifest: "results/" + mode + ".manifest.json",
  };
}

function generate(mode) {
  const files = modeFiles(mode);
  const config = readJson(files.config);
  const commit = gitHead();
  const inputs = digests(mode);
  for (const file of inputPaths(mode)) {
    if (hash(execFileSync("git", ["show", commit + ":" + file], {cwd: root})) !== inputs[file]) {
      // Git may normalize CRLF on checkout. Compare through the index for tracked, unchanged sources.
      const changed = execFileSync("git", ["status", "--porcelain", "--", file], {cwd: root, encoding: "utf8"});
      if (changed) throw new Error("Commit protocol and scientific inputs before running: " + file);
    }
  }
  mkdirSync(path("results/"), {recursive: true});
  const start = new Date();
  const clock = performance.now();
  try {
    const result = experiment(config, () => {
      if (performance.now() - clock > 30000) throw new Error("Experiment exceeded the 30 second local budget.");
    });
    const output = serialize(result);
    const metadata = {
      schemaVersion, experimentId: config.experimentId, laboratoryId: "echo",
      researchQuestionId: "echo-communication-01", hypotheses: ["H1", "H2", "H3"],
      protocol: config.protocol, modelVersion, evidenceClass: "synthetic simulation", status: "completed",
      codeCommit: commit, configurationSha256: hash(canonical(config)), inputSha256: inputs,
      random: {algorithm: "Mulberry32", seed: config.scenario.seed, independentUnit: "one synthetic task"},
      externalDatasets: [], startUtc: start.toISOString(), endUtc: new Date().toISOString(),
      runtimeMilliseconds: Number((performance.now() - clock).toFixed(2)),
      environment: {node: process.version, platform: platform(), arch: arch(), release: release()},
      observedRssBytes: process.memoryUsage.rss(),
      outputs: [{path: files.results, sha256: hash(output), bytes: Buffer.byteLength(output)}],
    };
    writeAtomic(files.results, output);
    writeAtomic(files.manifest, serialize(metadata));
    console.log(config.experimentId, metadata.runtimeMilliseconds + " ms", metadata.observedRssBytes + " bytes RSS");
    for (const row of result.contrasts) console.log(row.id, row.estimate.toFixed(4), row.interval.map(value => value.toFixed(4)));
  } catch (error) {
    writeAtomic("results/" + mode + ".failure.json", serialize({
      schemaVersion, experimentId: config.experimentId, status: "failed", codeCommit: commit,
      startUtc: start.toISOString(), endUtc: new Date().toISOString(), error: error.message,
    }));
    throw error;
  }
}

function verify(mode) {
  const files = modeFiles(mode);
  const stored = read(files.results);
  const config = readJson(files.config);
  const info = readJson(files.manifest);
  const result = validateResults(JSON.parse(stored));
  if (info.status !== "completed" || info.schemaVersion !== schemaVersion ||
      info.modelVersion !== modelVersion || info.experimentId !== config.experimentId ||
      !/^[a-f0-9]{40}$/.test(info.codeCommit) ||
      canonical(result.config) !== canonical(config) || info.configurationSha256 !== hash(canonical(config)) ||
      info.outputs.length !== 1 || info.outputs[0].path !== files.results ||
      info.outputs[0].sha256 !== hash(stored) || info.outputs[0].bytes !== stored.length) {
    throw new Error("Invalid output manifest: " + files.results);
  }
  const current = digests(mode);
  for (const [file, storedDigest] of Object.entries(info.inputSha256)) {
    if (!Object.hasOwn(current, file) || current[file] !== storedDigest) {
      throw new Error("Scientific input drift: " + file);
    }
  }
  if (Object.keys(info.inputSha256).length !== Object.keys(current).length) throw new Error("Incomplete provenance.");
  const regenerated = serialize(experiment(config));
  if (canonical(JSON.parse(regenerated)) !== canonical(result)) throw new Error("Reproduction differs: " + files.results);
  console.log("Verified", config.experimentId, info.outputs[0].sha256);
}

const [mode] = process.argv.slice(2);
if (mode === "verify") {
  verify("pilot");
  verify("confirmatory");
} else if (mode === "pilot" || mode === "confirmatory") {
  generate(mode);
} else {
  throw new Error("Expected pilot, confirmatory, or verify.");
}
