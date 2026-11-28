import {byId,node} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

const base="./empirical/archives/mirage-empirical-decoding-004/";
const names={greedy:"Greedy answer first",low:"Temperature 0.3",moderate:"Temperature 0.7",format:"Greedy confidence first"};
const ids=["c0","c1","c2","c3"];
const percent=n=>n==null?"Unavailable":(n*100).toFixed(1)+"%";
const points=n=>n==null?"Unavailable":(n>0?"+":"")+(n*100).toFixed(1)+" pp";
let evidence,replay;

async function load(path,type="json"){
  const response=await fetch(path);
  if(!response.ok)throw Error("Research archive unavailable");
  return response[type]();
}
function metric(title,value){
  const container=node("div");
  container.append(node("span",title),node("strong",value));
  return container;
}
function renderStats(manifest){
  const primary=evidence.primary;
  byId("decode-headline").replaceChildren(metric("Change in A selection",points(primary.difference)),
    metric("95% task-level interval",primary.interval95?.map(points).join(" to ")??"Unavailable"),
    metric("Matched canonical tasks",primary.pairs+" / 16"));
  const bounds=primary.allPlannedBounds;
  byId("decode-denominator").textContent=bounds[0]===bounds[1]
    ?"Both sampled settings answered every request. The full-plan difference is "+points(bounds[0])+"."
    :"Allowing every missing answer either outcome gives full-plan bounds of "+bounds.map(points).join(" to ")+".";

  const entries=[
    ["Planned responses",x=>x.planned],["Scorable responses",x=>x.scorable],["Abstained",x=>x.statuses.abstention??0],
    ["Correct per planned request",x=>percent(x.correctPerPlanned)],["Mean confidence",x=>percent(x.confidence)],
    ["Calibration gap",x=>points(x.calibrationGap)],["Brier loss",x=>printed(x.brier)],["Error AUROC",x=>printed(x.errorAUROC)],
    ["Answer A",x=>(x.labelCounts.A??0)+" / "+x.answered]
  ];
  const decoded=Object.keys(names);
  byId("decode-metrics").replaceChildren(...entries.map(([name,read])=>row(name,...decoded.map(arm=>read(evidence.conditions[arm])))),
    row("Mean canonical entropy",...decoded.map(arm=>evidence.sampling[arm]?printed(evidence.sampling[arm].meanCanonicalEntropyBits)+" bits":"One draw per task")),
    row("Tasks with different answers",...decoded.map(arm=>evidence.sampling[arm]?evidence.sampling[arm].diverseTasks+" / 16":"One draw per task")));
  const fmt=evidence.formatAgreement;
  byId("decode-format-auth").textContent="Confidence-first and answer-first greedy matched on the answer in "+
    fmt.sameCanonical+" of "+fmt.eligibleAnswers+" eligible pairs.";
  byId("decode-gate").textContent="The registered same-model ECHO gate "+(evidence.ensembleGate.passed?"was met.":"was not met.");
  byId("decode-status").textContent=manifest.actualResponses+" genuine outputs · "+manifest.execution.studyId;
}
function bars(group,category,classify){
  const result=node("ul",null,"decode-distribution");
  for(const [option,label] of category){
    const n=group.filter(record=>classify(record)===option).length;
    const item=node("li"), track=node("span",null,"decode-track"), bar=node("span",null,"decode-bar");
    bar.style.width=(100*n/group.length)+"%";
    track.setAttribute("aria-hidden","true");
    track.append(bar);
    item.append(node("span",label),track,node("span",n));
    result.append(item);
  }
  return result;
}
function renderReplay(){
  if(!replay)return;
  const task=byId("decode-task").value, arm=byId("decode-arm").value;
  const group=replay.groups.get(task+"/"+arm);
  const question=replay.questions.get(task), first=group[0], map=first.request.design.mapping;
  const options=node("ol");
  for(const pos of map.physical)options.append(node("li",map.labels[Number(pos)]+" · "+question.options[ids[Number(pos)]]));
  const results=node("div",null,"study-pair");
  for(const {score,raw} of group){
    const card=node("article",null,"result-panel obs-response");
    card.append(node("h3","Recorded response "+score.replicate),node("p",score.canonical?
      score.answer+" → "+score.canonical.toUpperCase()+" · "+(score.correct?"Correct":"Incorrect")+" · "+percent(score.confidence):score.status));
    if(raw.raw!==null)card.append(node("pre",raw.raw,"decode-actual"));
    results.append(card);
  }
  const info=evidence.sampling[arm]?.tasks[task];
  const distribution=node("div");
  const canonical=bars(group,[...ids.map(id=>[id,id.toUpperCase()]),["Unanswered","None"]],
    ({score})=>score.canonical??"Unanswered");
  const confidence=bars(group,[[0,"0–19%"],[1,"20–39%"],[2,"40–59%"],[3,"60–79%"],[4,"80–100%"],[null,"Missing"]],
    ({score})=>score.confidence==null?null:Math.min(4,Math.floor(score.confidence*5)));
  const comparison=node("div",null,"study-pair");
  const optionsChart=node("section"), confidenceChart=node("section");
  optionsChart.append(node("h3","Canonical answer counts"),canonical);
  confidenceChart.append(node("h3","Reported confidence counts"),confidence);
  comparison.append(optionsChart,confidenceChart);
  distribution.append(comparison);
  if(info)distribution.append(node("p","Within-task entropy "+printed(info.canonicalEntropyBits)+" bits based on "+info.answered+" answers."));
  else distribution.append(node("p","This greedy setup has one response per task."));
  byId("decode-detail").replaceChildren(node("p",question.question),options,node("p","Verified answer "+first.score.truth.toUpperCase()),distribution,results);
}
async function openReplay(){
  const control=byId("decode-load"),status=byId("decode-replay-status");
  control.disabled=true;
  status.textContent="Loading recorded samples…";
  try{
    const [schedule,scores,raw,questions]=await Promise.all([load(base+"schedule.json"),load(base+"scores.json"),
      load(base+"responses.ndjson","text"),load("./empirical/robustness/inputs/heldout.tasks.json")]);
    const records=raw.trim().split("\n").map(line=>JSON.parse(line)), groups=new Map();
    if(schedule.length!==192||scores.rows.length!==192||records.length!==192)throw Error("Invalid schedule size");
    for(const [i,request] of schedule.entries()){
      const score=scores.rows[i], raw=records[i];
      if(score.sequence!==request.sequence||raw.sequence!==request.sequence||raw.requestSha256!==request.requestSha256||
        raw.evidence!=="actual-model-request")throw Error("Request mismatch");
      const key=score.taskId+"/"+score.arm;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({request,score,raw});
    }
    for(const rows of groups.values())rows.sort((a,b)=>a.score.replicate-b.score.replicate);
    const taskIds=[...new Set(scores.rows.map(row=>row.taskId))].sort();
    replay={groups,questions:new Map(questions.tasks.map(t=>[t.id,t]))};
    byId("decode-task").replaceChildren(...taskIds.map(id=>new Option(id,id)));
    byId("decode-replay").hidden=false;
    renderReplay();
    status.textContent="Recorded samples loaded.";
    control.hidden=true;
    byId("decode-task").focus();
  }catch{
    status.textContent="The recorded samples are unavailable. Check the evidence links.";
    control.disabled=false;
  }
}
setupTheme();
byId("decode-arm").addEventListener("change",renderReplay);
byId("decode-task").addEventListener("change",renderReplay);
byId("decode-load").addEventListener("click",openReplay);

try{
  const [manifest,analysis]=await Promise.all([load(base+"manifest.json"),load(base+"analysis.json")]);
  if(manifest.execution.studyId!=="mirage-empirical-decoding-004"||analysis.classification!=="registered-actual-model")throw Error("Unexpected evidence");
  evidence=analysis;
  byId("decode-outcomes").hidden=false;
  renderStats(manifest);
}catch{
  byId("decode-outcomes").hidden=true;
  byId("decode-status").textContent="The decoding archive is unavailable. Refer to the frozen protocol.";
}
