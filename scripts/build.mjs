import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {posix} from "node:path";
import {validateResults} from "../engine/contracts.mjs";
import {journeys,laboratories,researchStudies,registryVersion} from "../apps/web/research-registry.mjs";
import {buildKnowledge,evidenceClass,findings,keyMeasurements} from "../apps/web/knowledge.mjs";

const root = new URL("../", import.meta.url);
const from = path => new URL(path, root);
const output = path => from("dist/" + path);
const text = path => readFileSync(from(path), "utf8");
const result = validateResults(JSON.parse(text("results/confirmatory.json")));
const manifest = JSON.parse(text("results/confirmatory.manifest.json"));
if (result.config.experimentId !== manifest.experimentId || manifest.status !== "completed") {
  throw new Error("The release artifacts do not identify a completed confirmatory run.");
}

const copies = [];
for (const file of readdirSync(from("apps/web/"))) copies.push(["apps/web/" + file, file]);
for (const file of readdirSync(from("engine/"))) {
  if (["echo.mjs", "echo-public.mjs", "contracts.mjs", "dependence.mjs", "confidence.mjs", "statistics.mjs", "memory.mjs", "morpheus.mjs", "discovery.mjs", "noesis.mjs", "scientia.mjs", "market.mjs", "information.mjs", "episteme.mjs", "validation.mjs", "axiom.mjs", "game-theory.mjs", "civilizations.mjs", "resources.mjs", "polis.mjs", "polis2.mjs", "artha.mjs", "energia.mjs", "nexus.mjs", "chronos.mjs"].includes(file)) copies.push(["engine/" + file, "engine/" + file]);
}
for (const study of researchStudies) {
  for (const [offset,phase] of study.archivePhases.entries()) {
    const base=study.archiveStem+phase;
    const resultPath="results/"+base+".json";
    const manifestPath="results/"+base+".manifest.json";
    const manifest=JSON.parse(text(manifestPath));
    const recorded=manifest.output??manifest.outputs?.find(output=>output.path===resultPath);
    const bytes=readFileSync(from(resultPath));
    if (manifest.status!=="completed" || (manifest.id??manifest.experimentId)!==study.studyIds[offset] ||
      recorded?.path!==resultPath || recorded.bytes!==bytes.length ||
      createHash("sha256").update(bytes).digest("hex")!==recorded.sha256) {
      throw new Error("Unverified public archive "+base);
    }
    for (const file of [base+".json",base+".manifest.json"]) {
      copies.push(["results/"+file,"data/"+file],["results/"+file,"results/"+file]);
    }
  }
  copies.push([study.manuscript,study.manuscript],[study.learning,study.learning]);
  for(const path of [study.config,study.pilotConfig,...(study.assets??[])])if(path)copies.push([path,path]);
}
const empiricalRoot="empirical/archives/mirage-empirical-pilot-001/";
const empiricalManifest=JSON.parse(text(empiricalRoot+"manifest.json"));
if(empiricalManifest.status!=="completed"||empiricalManifest.execution.classification!=="exploratory-actual-model"||
    empiricalManifest.execution.studyId!=="mirage-empirical-pilot-001")throw new Error("Wrong empirical archive classification");
for(const name of ["analysis.json","responses.ndjson","scores.json"]){
  const file=empiricalRoot+name;
  const bytes=readFileSync(from(file)), recorded=empiricalManifest.outputs[name];
  if(recorded?.bytes!==bytes.length||recorded.sha256!==createHash("sha256").update(bytes).digest("hex")){
    throw new Error("Unverified empirical archive "+name);
  }
  copies.push([file,file]);
}
for(const [file,hash] of [
  ["empirical/datasets/pilot.tasks.json",empiricalManifest.execution.datasetSha256],
  ["empirical/datasets/pilot.key.json",empiricalManifest.execution.groundTruthSha256],
  ["empirical/prompt-v2.json",empiricalManifest.execution.promptSha256],
  ["empirical/mirage-pilot-v1.json",empiricalManifest.execution.configSha256],
  ["research/mirage-empirical-protocol.md",empiricalManifest.execution.protocolSha256],
]){
  if(createHash("sha256").update(readFileSync(from(file))).digest("hex")!==hash)throw new Error("Unverified empirical input "+file);
  if(!file.startsWith("research/"))copies.push([file,file]);
}
for(const file of [empiricalRoot+"manifest.json","schemas/empirical-response-v1.json"])copies.push([file,file]);
const robustnessId="mirage-empirical-robustness-002";
const robustnessRoot="empirical/archives/"+robustnessId+"/";
const robustnessManifest=JSON.parse(text(robustnessRoot+"manifest.json"));
if(robustnessManifest.status!=="completed"||robustnessManifest.classification!=="registered-actual-model"||
  robustnessManifest.execution.studyId!==robustnessId||robustnessManifest.planned!==512){
  throw new Error("The registered robustness archive is unavailable or incomplete.");
}
for(const name of ["responses.ndjson","scores.json","analysis.json"]){
  const file=robustnessRoot+name, bytes=readFileSync(from(file)), expected=robustnessManifest.outputs[name];
  if(expected?.bytes!==bytes.length||expected.sha256!==createHash("sha256").update(bytes).digest("hex")){
    throw new Error("Unverified robustness result "+name);
  }
  copies.push([file,file]);
}
const robustInputs="empirical/robustness/inputs/";
for(const file of [robustInputs+"heldout.tasks.json",robustInputs+"heldout.keys.json",robustInputs+"heldout.schedule.json",
  robustInputs+"heldout.balance.json","empirical/robustness/protocol.json","empirical/robustness/prompt.json",
  "empirical/mirage-pilot-v1.json","research/mirage-robustness-protocol.md"]){
  const sha=robustnessManifest.execution.files[posix.basename(file)];
  if(createHash("sha256").update(readFileSync(from(file))).digest("hex")!==sha){
    throw new Error("Unverified robustness input "+file);
  }
  if(!file.startsWith("research/")&&file!=="empirical/mirage-pilot-v1.json")copies.push([file,file]);
}
for(const file of [robustnessRoot+"manifest.json","schemas/empirical-robustness-v1.json","empirical/robustness/reference.py",
  "empirical/robustness/audit-pilot-001.json"])copies.push([file,file]);
const developmentRoot="empirical/archives/"+robustnessId+"-development/";
const devManifest=JSON.parse(text(developmentRoot+"manifest.json"));
if(devManifest.classification!=="development-actual-model")throw new Error("Wrong development evidence class");
for(const name of ["responses.ndjson","scores.json","manifest.json"]){
  const file=developmentRoot+name, bytes=readFileSync(from(file)), expected=devManifest.outputs[name];
  if(name!=="manifest.json"&&(expected?.bytes!==bytes.length||expected.sha256!==createHash("sha256").update(bytes).digest("hex"))){
    throw new Error("Unverified development evidence "+name);
  }
  copies.push([file,file]);
}
const decodingId="mirage-empirical-decoding-004";
for(const [id,classification,count] of [[decodingId,"registered-actual-model",192],
  [decodingId+"-development","development-actual-model",16]]){
  const dir="empirical/archives/"+id+"/", manifest=JSON.parse(text(dir+"manifest.json"));
  if(manifest.classification!==classification||manifest.execution.studyId!==decodingId||
    manifest.planned!==count||manifest.status!=="completed")throw new Error("Unverified MIRAGE decoding evidence "+id);
  const outputs=["responses.ndjson","scores.json","schedule.json"];
  if(classification==="registered-actual-model")outputs.push("analysis.json");
  for(const name of outputs){
    const source=dir+name, data=readFileSync(from(source)), expected=manifest.outputs[name];
    if(expected?.bytes!==data.length||expected.sha256!==createHash("sha256").update(data).digest("hex")){
      throw new Error("Unverified decoding artifact "+source);
    }
    copies.push([source,source]);
  }
  for(const [name,sha] of Object.entries(manifest.execution.files)){
    const sources={"protocol.json":"empirical/phase3/protocol.json","prompt.json":"empirical/robustness/prompt.json",
      "mirage-pilot-v1.json":"empirical/mirage-pilot-v1.json","mirage-decoding-protocol.md":"research/mirage-decoding-protocol.md"};
    const file=sources[name]??(name.startsWith("heldout.")?"empirical/robustness/inputs/"+name:"empirical/phase3/inputs/"+name);
    if(createHash("sha256").update(readFileSync(from(file))).digest("hex")!==sha)throw new Error("Unverified decoding input "+name);
  }
  copies.push([dir+"manifest.json",dir+"manifest.json"]);
}
for(const file of ["empirical/phase3/reference.py","empirical/phase3/protocol.json","empirical/phase3/inputs/decoding.json",
  "empirical/phase3/inputs/cross-model.json","empirical/phase3/vulkan-development.json"])copies.push([file,file]);
const qwenDevId="mirage-empirical-cross-model-003-development";
const qwenDir="empirical/archives/"+qwenDevId+"/";
const qwenManifest=JSON.parse(text(qwenDir+"manifest.json"));
if(qwenManifest.classification!=="development-actual-model"||qwenManifest.execution.stage!=="qwen-development"||
  qwenManifest.actualResponses!==12||qwenManifest.status!=="completed"||qwenManifest.capabilityGate.passed!==false){
  throw new Error("The Qwen development evidence envelope differs");
}
for(const name of ["responses.ndjson","scores.json","schedule.json"]){
  const file=qwenDir+name, data=readFileSync(from(file)), entry=qwenManifest.outputs[name];
  if(entry?.bytes!==data.length||entry.sha256!==createHash("sha256").update(data).digest("hex")){
    throw new Error("Unverified Qwen development output "+file);
  }
  copies.push([file,file]);
}
for(const [name,sha] of Object.entries(qwenManifest.execution.files)){
  const aliases={"protocol.json":"empirical/phase3/protocol.json","prompt.json":"empirical/robustness/prompt.json",
    "mirage-pilot-v1.json":"empirical/mirage-pilot-v1.json","qwen-development.json":"empirical/phase3/inputs/qwen-development.json"};
  const file=aliases[name]??(name.endsWith(".md")?"research/"+name:"empirical/qwen/"+name);
  if(createHash("sha256").update(readFileSync(from(file))).digest("hex")!==sha)throw new Error("Unverified Qwen protocol input "+file);
}
for(const file of [qwenDir+"manifest.json","empirical/qwen/vulkan.json","empirical/qwen/vulkan-streamed.json",
  "empirical/qwen/mmap-startup-stop.json","empirical/qwen/capability-review.json","empirical/qwen/reference.py"]){
  copies.push([file,file]);
}
const echoPublicId="echo-public-empirical-001";
const echoPublicDir="empirical/archives/"+echoPublicId+"/";
const echoPublicManifest=JSON.parse(text(echoPublicDir+"manifest.json"));
if(echoPublicManifest.id!==echoPublicId||echoPublicManifest.companionStudy!=="echo-public-empirical-002"||
  echoPublicManifest.originalModelInferenceRequests!==0){
  throw new Error("Unexpected ECHO public empirical archive");
}
for(const [dir,entries] of [[echoPublicDir,echoPublicManifest.outputs],["empirical/echo-public/",echoPublicManifest.inputs]]){
  for(const [name,entry] of Object.entries(entries)){
    const file=posix.normalize(dir+name), data=readFileSync(from(file));
    if(entry.bytes!==data.length||entry.sha256!==createHash("sha256").update(data).digest("hex")){
      throw new Error("Unverified ECHO public empirical file "+file);
    }
    if(!name.startsWith("../"))copies.push([file,file]);
  }
}
for(const file of [echoPublicDir+"manifest.json","empirical/echo-public/reference.py",
  "empirical/echo-public/split.py","papers/echo-public.md","schemas/echo-public-predictions-v1.json"]){
  copies.push([file,file]);
}
for (const file of readdirSync(from("research/"))) copies.push(["research/" + file, "research/" + file]);
for (const file of ["REPRODUCIBILITY.md", "PORTFOLIO_AUDIT.md", "CONTRIBUTION_REGISTER.md", "PHASE2_VERIFICATION.md", "THREAT_MODEL.md", "SECURITY.md", "LIMITATIONS.md", "CONTRIBUTING.md"]) {
  copies.push([file, "docs/" + file], [file, file]);
}
copies.push(["LICENSE","LICENSE"]);
for (const [source, target] of copies) {
  const directory = posix.dirname(target);
  mkdirSync(output(directory === "." ? "" : directory + "/"), {recursive:true});
  cpSync(from(source), output(target));
}
const escape=value=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const link=(label,path)=>'<a href="./'+escape(path)+'">'+escape(label)+'</a>';

const archiveDate=study=>{
  const source=JSON.parse(text(study.manifest.replace(/^data\//,"results/")));
  const date=source.endUtc??source.completedAt??source.endTime??"";
  return /^\d{4}-\d\d-\d\d/.test(date)?date.slice(0,10):"";
};
const cards=researchStudies.map(study=>{
  const [direction,finding,limitation]=findings[study.id];
  const date=archiveDate(study);
  const evidence=[["Study data",study.result],["Manifest",study.manifest],["Manuscript",study.manuscript],
    ["Read manuscript","reader.html?study="+study.id],["Protocol",study.protocol],["Learning guide",study.learning],
    ["Review evidence",study.audit??study.manuscript],["Reproduction commands","REPRODUCIBILITY.md"]];
  const [value,comparison,interpretation]=keyMeasurements[study.id];
  return '<article class="result-panel" data-study="'+escape(study.id)+'" data-date="'+date+'"><h2>'+link(study.name,study.route)+
    '</h2><p>'+escape(study.description)+'</p><p><strong>'+escape(evidenceClass(study))+'</strong> · '+escape(study.studyIds.at(-1))+
    (date?' · run completed '+date:'')+'</p><p class="study-finding"><strong>'+escape(direction)+'</strong> · '+escape(finding)+
    '</p><p class="measurement"><strong>'+escape(value)+'</strong> · '+escape(comparison)+'<br><small>'+escape(interpretation)+
    '</small></p><p>'+escape(limitation)+'</p><details><summary>Evidence and reproduction</summary><ul>'+evidence
    .map(([label,path])=>"<li>"+link(label,path)+"</li>").join("")+"</ul><p>"+escape(study.humanReview)+"</p></details></article>";
}).join("\n");
const graph=buildKnowledge();
const docsByStudy=new Map(researchStudies.map(study=>[study.id,study]));
const plain=content=>content.replace(/https?:\/\/[^)\s]+/g,"").replace(/[#*|`]/g," ").replace(/\s+/g," ").trim();
for(const entry of graph.nodes){
  const doc=docsByStudy.get(entry.id.split("/")[1]);
  const path=entry.type==="Manuscript"?doc?.manuscript:entry.type==="Protocol"?entry.route:entry.type==="Data source"?entry.route:null;
  if(path)entry.searchText=plain(text(path)).slice(0,6500);
}
writeFileSync(output("data/research-index.json"),JSON.stringify(graph)+"\n");
writeFileSync(output("library.html"),text("apps/web/library.html").replace("<!-- research-studies -->",cards));
writeFileSync(output(".nojekyll"), "");

writeFileSync(output("release.json"), JSON.stringify({
  commit:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),
  version:JSON.parse(text("package.json")).version,
  registryVersion,
  studies:researchStudies.map(study=>study.id),
  empiricalStudies:[empiricalManifest.execution.studyId,robustnessId,decodingId,echoPublicId,echoPublicManifest.companionStudy],
  empiricalDevelopment:[qwenDevId],
})+"\n");
const anchors = new Map();
for (const [, file] of copies.filter(([, path]) => path.endsWith(".html"))) {
  const markup=readFileSync(output(file),"utf8");
  anchors.set(file,{markup, ids:new Set(Array.from(markup.matchAll(/\bid="([^"]+)"/g),m=>m[1]))});
}
const packaged=new Set(copies.map(([,target])=>target));
packaged.add("data/research-index.json");
function checkLink(file,url) {
  if (!url.startsWith("./")&&!url.startsWith("#")) return;
  const [address,anchor]=url.split("#");
  const target=address.split("?")[0];
  const path=target||file;
  const clean=path.startsWith("./")?path.slice(2):path;
  if (!packaged.has(clean)||!existsSync(output(clean))) throw new Error("Missing static resource from "+file+": "+url);
  const labHash=clean==="index.html"&&laboratories.some(lab=>anchor==="lab-"+lab.id);
  if (anchor&&!labHash&&!anchors.get(clean)?.ids.has(anchor)) throw new Error("Broken anchor from "+file+": "+url);
}
for (const [file,{markup}] of anchors) {
  for (const [,url] of markup.matchAll(/(?:href|src)="([^"]+)"/g)) checkLink(file,url);
}
for(const file of packaged){
  if(!file.endsWith(".mjs"))continue;
  const module=readFileSync(output(file),"utf8");
  for(const [,specifier] of module.matchAll(/\b(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g)){
    const resolved=posix.normalize(posix.join(posix.dirname(file),specifier));
    if(!packaged.has(resolved))throw new Error("Unpackaged module "+specifier+" from "+file);
  }
}
for (const study of researchStudies){
  for(const entry of [study.route,study.result,study.manifest,study.protocol,study.math,study.learning,study.manuscript,study.config,study.pilotConfig,study.engine,study.audit]){
    if(entry)checkLink("Research registry","./"+entry);
  }
  for(const [,path] of study.concepts)checkLink("Study concepts","./"+path);
}
for(const entry of graph.nodes)checkLink("Knowledge graph","./"+entry.route);
for(const journey of journeys)for(const [,path] of journey.steps)checkLink("Research journeys","./"+path);
console.log("Built " + copies.length + " public files with checked local links.");
