import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {canonical} from "../engine/contracts.mjs";

const root=new URL("../",import.meta.url);
const file=path=>new URL(path,root);
const bytes=path=>readFileSync(file(path));
const hash=payload=>createHash("sha256").update(payload).digest("hex");
const git=args=>execFileSync("git",args,{cwd:root});

export function runScenario(study,execute,sources,mode){
  const stem=study+"-scenario";
  const configPath="experiments/"+stem+".json";
  const protocol="research/"+stem+".md";
  const resultPath="results/"+stem+".json";
  const manifestPath="results/"+stem+".manifest.json";
  const config=JSON.parse(bytes(configPath));
  if(config.phase!=="scenario"||config.id!==stem+"-001")throw new Error("Unregistered deterministic scenario.");
  const inputs=Object.fromEntries([configPath,protocol,"scripts/run-scenario.mjs","engine/contracts.mjs",...sources]
    .map(path=>[path,hash(bytes(path))]));
  const configSha256=hash(canonical(config));
  if(mode==="verify"){
    const raw=bytes(resultPath), saved=JSON.parse(bytes(manifestPath));
    if(saved.id!==config.id||saved.status!=="completed"||saved.configSha256!==configSha256||
        saved.output.path!==resultPath||saved.output.bytes!==raw.length||saved.output.sha256!==hash(raw)||
        canonical(saved.inputs)!==canonical(inputs)||canonical(JSON.parse(raw))!==canonical(execute(config))){
      throw new Error("Scenario reproducibility check failed: "+study);
    }
    console.log("Verified",config.id,saved.output.sha256);
    return;
  }
  if(mode!=="execute")throw new Error("Use execute or verify.");
  if(existsSync(file(resultPath))||existsSync(file(manifestPath)))throw new Error("Scenario archive already exists.");
  const commit=git(["rev-parse","HEAD"]).toString().trim();
  for(const [path,expected] of Object.entries(inputs)){
    if(hash(git(["show",commit+":"+path]))!==expected)throw new Error("Freeze input before execution: "+path);
  }
  const startUtc=new Date().toISOString(), time=performance.now();
  const output=execute(config);
  const runtimeMs=performance.now()-time;
  if(runtimeMs>30000)throw new Error("Scenario exceeded the fixed execution budget.");
  const text=JSON.stringify(output,null,2)+"\n";
  const manifest={id:config.id,phase:config.phase,status:"completed",commit,inputs,configSha256,
    modelVersion:output.modelVersion,dataset:output.dataset??null,
    startUtc,endUtc:new Date().toISOString(),runtimeMs,observedRssBytes:process.memoryUsage.rss(),
    environment:{node:process.version,platform:process.platform,arch:process.arch},
    output:{path:resultPath,bytes:Buffer.byteLength(text),sha256:hash(text)}};
  writeFileSync(file(resultPath),text,{flag:"wx"});
  writeFileSync(file(manifestPath),JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
  console.log("Executed",config.id,manifest.output.sha256);
}
