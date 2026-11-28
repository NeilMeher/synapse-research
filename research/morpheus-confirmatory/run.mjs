import {createHash} from "node:crypto";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {studyHistories, summarizeContrast} from "../../engine/morpheus-audit.mjs";

const protocol = new URL("protocol.json", import.meta.url);
const bytes = readFileSync(protocol);
const cfg = JSON.parse(bytes);
const target = new URL("../evidence/" + cfg.id + "/", import.meta.url);
const encode = value => Buffer.from(JSON.stringify(value) + "\n");
const digest = content => ({bytes:content.length,sha256:createHash("sha256").update(content).digest("hex")});
const [mode, revision] = process.argv.slice(2);
if (!["run","verify"].includes(mode)) throw new Error("Specify run or verify.");
const frozen = mode === "run" ? revision : JSON.parse(readFileSync(new URL("manifest.json",target))).protocolCommit;
if (!/^[a-f0-9]{40}$/.test(frozen)) throw new Error("A frozen protocol commit is required.");

const started = performance.now();
const histories = Object.fromEntries(cfg.environments.map(e => [e.id,studyHistories(cfg,e)]));
const contrasts = Object.fromEntries([cfg.primary,...cfg.secondary].map(c =>
  [c.id,{...c,...summarizeContrast(histories[c.environment],c.window,c.coefficients,cfg)}]));
const totals = Object.fromEntries(Object.entries(histories).map(([id,rows]) =>
  [id,Object.fromEntries(cfg.policies.map(({id:policy}) =>
    [policy,Object.fromEntries(Object.keys(cfg.windows).map(window =>
      [window,rows.reduce((sum,h) => sum+h.losses[policy].incorrect[window],0)]))]))]));
const summary = {id:cfg.id,evidence:cfg.evidence,stage:cfg.stage,historiesPerEnvironment:cfg.histories,
  policyCount:cfg.policies.length,contrasts,totals};
const output = {"summary.json":encode(summary),
  "histories.ndjson":Buffer.from(Object.entries(histories).flatMap(([environment,rows]) =>
    rows.map((row,i) => JSON.stringify({environment,index:i,...row}))).join("\n")+"\n")};
output["manifest.json"] = encode({id:cfg.id,evidence:cfg.evidence,stage:cfg.stage,status:"completed",protocolCommit:frozen,
  protocol:digest(bytes),outputs:Object.fromEntries(Object.entries(output).map(([name,data]) => [name,digest(data)]))});
if (mode === "run") mkdirSync(target);
for (const [name,data] of Object.entries(output)) {
  const path = new URL(name,target);
  if (mode === "run") writeFileSync(path,data,{flag:"wx"});
  else if (!readFileSync(path).equals(data)) throw new Error("Archive differs: " + name);
}
console.log(JSON.stringify({mode,environmentHistories:cfg.environments.length*cfg.histories,
  evaluatedDecisions:cfg.environments.length*cfg.histories*cfg.steps*cfg.policies.length,
  runtimeMs:Math.round(performance.now()-started),primary:contrasts[cfg.primary.id]}));
