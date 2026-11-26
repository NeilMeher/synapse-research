import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync,renameSync} from "node:fs";
import {arch,platform} from "node:os";
import {canonical} from "../engine/contracts.mjs";

const root=new URL("../",import.meta.url);
const path=name=>new URL(name,root);
const read=name=>readFileSync(path(name),"utf8");
const json=value=>JSON.stringify(value,null,2)+"\n";
const digest=text=>createHash("sha256").update(text).digest("hex");
const git=args=>execFileSync("git",args,{cwd:root,encoding:"utf8"});

function write(name,text) {
  const staged=name+"."+process.pid+".tmp";
  writeFileSync(path(staged),text,{flag:"wx"});
  renameSync(path(staged),path(name));
}

export function runStudy(study,execute,sources,mode) {
  if (!["pilot","confirmatory","verify"].includes(mode)) throw new Error("Expected pilot, confirmatory or verify.");
  for (const phase of mode==="verify"?["pilot","confirmatory"]:[mode]) {
    const stem=study+"-"+phase;
    const configPath="experiments/"+stem+".json";
    const resultPath="results/"+stem+".json";
    const manifestPath="results/"+stem+".manifest.json";
    const config=JSON.parse(read(configPath));
    if (config.id!==stem+"-001"||config.phase!==phase) throw new Error("Experiment identity mismatch.");
    const inputHashes=Object.fromEntries([...sources,"scripts/run-study.mjs","engine/contracts.mjs",configPath,
      "research/"+stem+".md"].map(name=>[name,digest(read(name))]));
    const configSha256=digest(canonical(config));
    const run=()=>{
      const start=performance.now();
      return execute(config,()=>{
        if (performance.now()-start>30000) throw new Error("Experiment exceeded the 30 second budget.");
      });
    };
    if (mode==="verify") {
      const stored=read(resultPath);
      const manifest=JSON.parse(read(manifestPath));
      if (manifest.id!==config.id||manifest.configSha256!==configSha256||
          canonical(manifest.inputs)!==canonical(inputHashes)||manifest.output.path!==resultPath||
          manifest.output.sha256!==digest(stored)||canonical(JSON.parse(stored))!==canonical(run())) {
        throw new Error("Artifact or reproduction mismatch: "+stem);
      }
      console.log("Verified",config.id,manifest.output.sha256);
    } else {
      const commit=git(["rev-parse","HEAD"]).trim();
      for (const [name,hash] of Object.entries(inputHashes)) {
        if (digest(git(["show",commit+":"+name]))!==hash) throw new Error("Commit scientific inputs before running: "+name);
      }
      const startUtc=new Date().toISOString();
      const start=performance.now();
      try {
        const stored=json(run());
        write(resultPath,stored);
        write(manifestPath,json({
          id:config.id,phase,status:"completed",commit,inputs:inputHashes,configSha256,
          output:{path:resultPath,sha256:digest(stored),bytes:Buffer.byteLength(stored)},
          startUtc,endUtc:new Date().toISOString(),runtimeMs:Math.round(performance.now()-start),
          observedRssBytes:process.memoryUsage.rss(),environment:{node:process.version,platform:platform(),arch:arch()},
        }));
        console.log("Executed",config.id);
      } catch(error) {
        write("results/"+stem+".failure.json",json({id:config.id,status:"failed",error:error.message,commit,startUtc}));
        throw error;
      }
    }
  }
}
