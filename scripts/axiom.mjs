import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {canonical} from "../engine/contracts.mjs";
import {runAxiom} from "../engine/axiom.mjs";

const root = new URL("../", import.meta.url);
const file = path => new URL(path, root);
const read = path => readFileSync(file(path));
const sha = data => createHash("sha256").update(data).digest("hex");
const git = args => execFileSync("git", args, {cwd:root});
const id = "axiom-pilot-001";
const configPath = "experiments/axiom-pilot.json";
const resultPath = "results/axiom-pilot.json";
const manifestPath = "results/axiom-pilot.manifest.json";
const sources = [configPath, "scripts/axiom.mjs", "scripts/reference_axiom.py", "engine/axiom.mjs",
  "engine/game-theory.mjs", "engine/contracts.mjs", "schemas/axiom-finite-v1.json", "research/axiom-pilot.md"];
const inputs = Object.fromEntries(sources.map(path => [path, sha(read(path))]));
const config = JSON.parse(read(configPath));
const configSha256 = sha(canonical(config));
const mode = process.argv[2];

if (mode === "verify") {
  const raw = read(resultPath);
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.id !== id || manifest.status !== "completed" || manifest.configSha256 !== configSha256 ||
      canonical(manifest.inputs) !== canonical(inputs) || manifest.output.path !== resultPath ||
      raw.length !== manifest.output.bytes || sha(raw) !== manifest.output.sha256 ||
      canonical(runAxiom(config)) !== canonical(JSON.parse(raw))) throw new Error("AXIOM archive or replay mismatch.");
  console.log("Verified", id, manifest.output.sha256);
} else if (mode === "pilot") {
  if (existsSync(file(resultPath)) || existsSync(file(manifestPath))) throw new Error("AXIOM archive already exists.");
  const commit = git(["rev-parse","HEAD"]).toString().trim();
  for (const [path, hash] of Object.entries(inputs)) {
    if (sha(git(["show", commit + ":" + path])) !== hash) throw new Error("Commit registered input first: " + path);
  }
  const startUtc = new Date().toISOString();
  const start = performance.now();
  const body = JSON.stringify(runAxiom(config), null, 2) + "\n";
  const manifest = {id, phase:"pilot", status:"completed", commit, inputs, configSha256,
    output:{path:resultPath, sha256:sha(body), bytes:Buffer.byteLength(body)},
    startUtc, endUtc:new Date().toISOString(), runtimeMs:performance.now()-start,
    observedRssBytes:process.memoryUsage.rss(), environment:{node:process.version,platform:process.platform,arch:process.arch}};
  writeFileSync(file(resultPath), body, {flag:"wx"});
  writeFileSync(file(manifestPath), JSON.stringify(manifest,null,2)+"\n", {flag:"wx"});
  console.log("Executed", id, manifest.output.sha256);
} else {
  throw new Error("Expected pilot or verify.");
}
