import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {posix} from "node:path";
import {validateResults} from "../engine/contracts.mjs";
import {journeys,researchStudies,registryVersion} from "../apps/web/research-registry.mjs";

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
  if (["echo.mjs", "contracts.mjs", "dependence.mjs", "confidence.mjs", "statistics.mjs", "memory.mjs", "morpheus.mjs", "discovery.mjs", "noesis.mjs", "scientia.mjs", "market.mjs", "information.mjs", "episteme.mjs", "validation.mjs", "axiom.mjs", "game-theory.mjs"].includes(file)) copies.push(["engine/" + file, "engine/" + file]);
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
  if(study.config)copies.push([study.config,study.config]);
}
for (const file of readdirSync(from("research/"))) copies.push(["research/" + file, "research/" + file]);
for (const file of ["REPRODUCIBILITY.md", "PORTFOLIO_AUDIT.md", "CONTRIBUTION_REGISTER.md", "PHASE2_VERIFICATION.md"]) {
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
const cards=researchStudies.map(study=>
  '<article class="result-panel"><h2>'+link(study.name,study.route)+'</h2><p>'+escape(study.description)+'</p><ul>'+
  [["Study data",study.result],["Manifest",study.manifest],["Manuscript",study.manuscript]]
    .map(([label,path])=>"<li>"+link(label,path)+"</li>").join("")+"</ul></article>").join("\n");
writeFileSync(output("library.html"),text("apps/web/library.html").replace("<!-- research-studies -->",cards));
writeFileSync(output(".nojekyll"), "");

writeFileSync(output("release.json"), JSON.stringify({
  commit:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),
  version:JSON.parse(text("package.json")).version,
  registryVersion,
  studies:researchStudies.map(study=>study.id),
})+"\n");
const anchors = new Map();
for (const [, file] of copies.filter(([, path]) => path.endsWith(".html"))) {
  const markup=readFileSync(output(file),"utf8");
  anchors.set(file,{markup, ids:new Set(Array.from(markup.matchAll(/\bid="([^"]+)"/g),m=>m[1]))});
}
const packaged=new Set(copies.map(([,target])=>target));
function checkLink(file,url) {
  if (!url.startsWith("./")&&!url.startsWith("#")) return;
  const [target,anchor]=url.split("#");
  const path=target||file;
  const clean=path.startsWith("./")?path.slice(2):path;
  if (!packaged.has(clean)||!existsSync(output(clean))) throw new Error("Missing static resource from "+file+": "+url);
  if (anchor&&!anchors.get(clean)?.ids.has(anchor)) throw new Error("Broken anchor from "+file+": "+url);
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
  for(const entry of [study.route,study.result,study.manifest,study.protocol,study.math,study.learning,study.manuscript,study.config,study.engine,study.audit]){
    if(entry)checkLink("Research registry","./"+entry);
  }
}
for(const journey of journeys)for(const [,path] of journey.steps)checkLink("Research journeys","./"+path);
console.log("Built " + copies.length + " public files with checked local links.");
