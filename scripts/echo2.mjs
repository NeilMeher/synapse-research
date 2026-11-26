import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {readFileSync, writeFileSync, renameSync} from "node:fs";
import {arch, platform} from "node:os";
import {canonical} from "../engine/contracts.mjs";
import {runDependence, validateConfig, version, schemaVersion} from "../engine/echo2.mjs";

const root = new URL("../", import.meta.url);
const location = path => new URL(path, root);
const read = path => readFileSync(location(path), "utf8");
const json = value => JSON.stringify(value, null, 2) + "\n";
const hash = value => createHash("sha256").update(value).digest("hex");
const git = args => execFileSync("git", args, {cwd:root, encoding:"utf8"});
const inputPaths = phase => ["engine/dependence.mjs", "engine/echo2.mjs", "engine/echo.mjs",
  "engine/statistics.mjs", "scripts/echo2.mjs", "schemas/echo-dependence-v1.json",
  "experiments/echo2-" + phase + ".json", "research/echo2-" + phase + ".md"];
const digestInputs = phase => Object.fromEntries(inputPaths(phase).map(path => [path, hash(read(path))]));
const write = (path, contents) => {
  const staging = path + "." + process.pid + ".tmp";
  writeFileSync(location(staging), contents, {flag:"wx"});
  renameSync(location(staging), location(path));
};
const run = config => {
  const start = performance.now();
  return runDependence(config, () => {
    if (performance.now() - start > 30000) throw new Error("Exceeded the 30 second experiment budget.");
  });
};

function handle(phase, verify) {
  const stem = "echo2-" + phase;
  const config = validateConfig(JSON.parse(read("experiments/" + stem + ".json")));
  const path = "results/" + stem + ".json";
  const envelope = "results/" + stem + ".manifest.json";
  const inputs = digestInputs(phase);
  const configSha256 = hash(canonical(config));

  if (verify) {
    const stored = read(path);
    const info = JSON.parse(read(envelope));
    if (!/^[a-f0-9]{40}$/.test(info.commit) || info.id !== config.id || info.modelVersion !== version ||
        info.schemaVersion !== schemaVersion || info.status !== "completed" || info.configSha256 !== configSha256 ||
        canonical(info.inputs) !== canonical(inputs) || info.output.path !== path || info.output.sha256 !== hash(stored) ||
        info.output.bytes !== Buffer.byteLength(stored) || canonical(JSON.parse(stored)) !== canonical(run(config))) {
      throw new Error("ECHO 2.0 config, provenance or output mismatch: " + phase);
    }
    console.log("Verified", config.id, info.output.sha256);
    return;
  }
  const commit = git(["rev-parse", "HEAD"]).trim();
  for (const input of inputPaths(phase)) {
    if (hash(git(["show", commit + ":" + input])) !== inputs[input]) {
      throw new Error("Commit all scientific inputs before executing: " + input);
    }
  }
  const startUtc = new Date().toISOString();
  const start = performance.now();
  try {
    const outputs = run(config);
    const stored = json(outputs);
    write(path, stored);
    write(envelope, json({
      id:config.id, schemaVersion, modelVersion:version, status:"completed", commit, configSha256, inputs,
      evidenceClass:"synthetic simulation", seed:config.seed, prng:"Mulberry32", unit:"independent task",
      startUtc, endUtc:new Date().toISOString(), runtimeMs:Math.round(performance.now() - start),
      observedRssBytes:process.memoryUsage.rss(), environment:{node:process.version, platform:platform(), arch:arch()},
      output:{path, sha256:hash(stored), bytes:Buffer.byteLength(stored)},
    }));
    for (const row of outputs.conditions) {
      console.log(config.id, row.correlation, row.betaMinusShared.toFixed(6),
        row.monteCarlo.estimate.toFixed(6), row.monteCarlo.sd.toFixed(6));
    }
  } catch (error) {
    write("results/" + stem + ".failure.json", json({id:config.id, status:"failed", startUtc, commit, error:error.message}));
    throw error;
  }
}

const [mode] = process.argv.slice(2);
if (mode === "verify") {
  for (const phase of ["pilot","confirmatory"]) handle(phase, true);
} else if (mode === "pilot" || mode === "confirmatory") {
  handle(mode, false);
} else {
  throw new Error("Expected pilot, confirmatory or verify.");
}
