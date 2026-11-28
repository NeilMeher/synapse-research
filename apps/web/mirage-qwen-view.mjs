import {byId,node} from "./view.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

const root="./empirical/archives/mirage-empirical-cross-model-003-development/";
const familyNames={reference:"Copy requested label",retrieval:"Read stated value",comparison:"Compare numbers",
  arithmetic:"Simple arithmetic",mapping:"Remap answer content",confidence:"Report confidence on stated fact"};
const percent=n=>(n*100).toFixed(1)+"%";
let review,responses;

async function load(path,type="json"){
  const response=await fetch(path);
  if(!response.ok)throw Error("Evidence could not be loaded");
  return response[type]();
}
function measure(label,value){
  const wrapper=node("div");
  wrapper.append(node("span",label),node("strong",value));
  return wrapper;
}
function detail(){
  const item=review.controls[byId("qwen-question").selectedIndex];
  const raw=responses[byId("qwen-question").selectedIndex];
  byId("qwen-answer").replaceChildren(node("h3",familyNames[item.family]),
    node("p","Verified answer "+item.expectedAnswer+" · label "+item.expectedLabel),
    node("p",item.correct?"The selected answer was correct.":"The selected answer was incorrect."),
    node("pre",raw.raw));
}
function render(manifest,stopped){
  const gate=manifest.capabilityGate, memory=manifest.resources[0];
  byId("qwen-headline").replaceChildren(measure("Correct",gate.correct+" / "+manifest.planned),
    measure("Scorable replies",gate.scorable+" / "+manifest.planned),measure("Matched research requests",review.matchedResearch.actualQwen+" / "+review.matchedResearch.plannedQwen));
  byId("qwen-gate-text").textContent="The gate required at least 8 correct and at least one correct in each family. Retrieval and remapping fell short. The matched study remains unopened.";
  byId("qwen-confidence").textContent="Mean reported confidence was "+percent(review.meanConfidence)+
    ". The model reported 100% confidence on "+review.wrongAt100+" incorrect answers.";
  byId("qwen-scores").replaceChildren(...Object.entries(familyNames).map(([id,description])=>row(description,
    review.familyCorrect[id]+" / 2","1 / 2")));
  const memoryItems=[["Stopped mapped startup peak",(stopped.resources[0].peakServerWorkingSetBytes/1048576).toFixed(0)+" MiB"],
    ["Registered process limit","640 MiB"],["Non-mapped startup and run peak",(memory.peakServerWorkingSetBytes/1048576).toFixed(0)+" MiB"],
    ["Minimum sampled free host RAM",memory.minimumHostFreeMiB+" MiB"],["Minimum sampled free GPU memory",memory.minimumGpuFreeMiB+" MiB"]];
  byId("qwen-memory").replaceChildren(...memoryItems.flatMap(([label,value])=>[node("dt",label),node("dd",value)]));
  byId("qwen-question").replaceChildren(...review.controls.map(c=>new Option(c.taskId+" · "+familyNames[c.family],c.taskId)));
  byId("qwen-shared").textContent="On four shared controls, Qwen answered "+review.sharedDevelopment.qwenCorrect+
    " correctly and archived SmolLM2 answered "+review.sharedDevelopment.smolCorrect+" correctly.";
  detail();
}
setupTheme();
byId("qwen-question").addEventListener("change",detail);
try{
  const [archive,score,text,stop]=await Promise.all([load(root+"manifest.json"),load("./empirical/qwen/capability-review.json"),
    load(root+"responses.ndjson","text"),load("./empirical/qwen/mmap-startup-stop.json")]);
  review=score;
  responses=text.trim().split("\n").map(x=>JSON.parse(x));
  if(archive.classification!=="development-actual-model"||review.classification!=="development-actual-model-review"||
    responses.length!==12||review.controls.length!==12||archive.capabilityGate.passed!==false||
    stop.actualResponses!==0||responses.some(row=>row.evidence!=="actual-model-request"))throw Error("Unexpected evidence");
  render(archive,stop);
  byId("qwen-results").hidden=false;
  byId("qwen-status").textContent=archive.actualResponses+" genuine Qwen capability outputs · "+archive.execution.studyId;
}catch{
  byId("qwen-results").hidden=true;
  byId("qwen-status").textContent="The Qwen capability archive is unavailable. Refer to the frozen gate.";
}
