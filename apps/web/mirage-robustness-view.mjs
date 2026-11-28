import {byId,canvasContext,circle,line,node,palette} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

const base="./empirical/archives/mirage-empirical-robustness-002/";
const inputs="./empirical/robustness/inputs/";
const cues={none:"No cue",matched:"Matched text",correct:"Correct advice",incorrect:"Incorrect advice"};
const versions={reference:"Reference",physical:"Physical order",labels:"Letter assignment",grammar:"Grammar order"};
const families={change:"Tile arithmetic",wood:"Conditional probability",ordering:"Ordering",lookup:"Direct retrieval"};
const ids=["c0","c1","c2","c3"], labels=[..."ABCD"], positions=["1","2","3","4"];
const grids={
  canonicalByLabel:[ids,labels,"Canonical answer","Displayed letter"],
  canonicalByPosition:[ids,positions,"Canonical answer","Physical position"],
  labelByGrammarPosition:[labels,positions,"Selected letter","Grammar position"],
  cueLabelByAnswer:[labels,labels,"Cue letter","Selected letter"],
};
const controls={
  family:byId("robust-family"),biasCue:byId("robust-bias-cue"),grid:byId("robust-bias-grid"),task:byId("robust-task"),
  presentation:byId("robust-version"),replayCue:byId("robust-replay-cue"),missing:byId("robust-missing"),
};
const percentage=value=>value==null?"Unavailable":(value*100).toFixed(1)+"%";
const signed=value=>value==null?"Unavailable":(value>0?"+":"")+printed(value);
const interval=r=>r?r.map(signed).join(" to "):"Unavailable";
let analysis, replay;

async function load(url,type="json"){
  const response=await fetch(url);
  if(!response.ok)throw Error("Linked evidence could not be loaded.");
  return response[type]();
}
function rows(id,data){
  byId(id).replaceChildren(...data.map(r=>row(...r)));
}
function measure(label,value){
  const block=node("div");
  block.append(node("span",label),node("strong",value));
  return block;
}
function summarize(manifest){
  const primary=analysis.primary;
  byId("robust-headline").replaceChildren(measure("Paired Brier change",signed(primary.difference)),
    measure("95% task-level interval",interval(primary.interval95)),
    measure("Scorable presentation pairs",primary.eligiblePresentationPairs+" / "+primary.plannedPresentationPairs));
  byId("robust-coverage").textContent=primary.pairs+" canonical tasks have an eligible pair. "+primary.completeTasks+
    " have all four paired presentations. "+(analysis.eligibleTaskCoverageMet?"The registered coverage threshold was met.":"Coverage fell below the registered threshold.");
  byId("robust-bounds").textContent="Full-plan Brier bounds allowing every missing loss to range from 0 to 1: "+interval(primary.allPlannedBounds)+".";
  byId("robust-status").textContent=manifest.actualResponses+" genuine model outputs · "+manifest.execution.studyId;
}

function renderMetrics(){
  const selected=controls.family.value;
  const group=selected==="all"?analysis.armMetrics:analysis.familyMetrics[selected];
  const metrics=[["Planned requests",arm=>arm.planned],["Completed responses",arm=>arm.completed],
    ["Answered",arm=>arm.answered],["Scorable confidence",arm=>arm.scorable],["Abstentions",arm=>arm.statuses.abstention??0],
    ["Correct / planned",arm=>percentage(arm.correctPerPlanned)],["Accuracy among answers",arm=>percentage(arm.accuracy)],
    ["Mean reported confidence",arm=>percentage(arm.confidence)],["Calibration gap",arm=>percentage(arm.calibrationGap)],
    ["Brier loss",arm=>printed(arm.brier)],["Log loss",arm=>printed(arm.logLoss)],["Error AUROC",arm=>printed(arm.errorAUROC)]];
  rows("robust-arm-metrics",metrics.map(([name,format])=>[name,...Object.keys(cues).map(c=>format(group[c]))]));
  const {correct,incorrect}=analysis.cueAdoption;
  byId("robust-adoption").textContent="Across all families, "+correct.selectedTarget+"/"+correct.answered+
    " correct-advice answers and "+incorrect.selectedTarget+"/"+incorrect.answered+
    " incorrect-advice answers selected the suggested content. With an eligible different matched-control choice, "+
    incorrect.switchedToTarget+"/"+incorrect.initiallyDifferent+" switched to the incorrect suggestion.";
}
const compare=["none","correct","incorrect"];
function renderContrasts(){
  rows("robust-contrasts",compare.map(c=>{
    const result=analysis.paired[c].brier;
    return [cues[c]+" − matched",result.eligiblePresentationPairs,signed(result.difference),interval(result.interval95)];
  }));
  draw();
}
function draw(){
  if(!analysis)return;
  const canvas=byId("robust-interval-chart"), surface=canvasContext(canvas);
  if(!surface)return;
  const {context,width,height}=surface;
  const data=compare.map(c=>analysis.paired[c].brier);
  const limit=Math.max(.05,...data.flatMap(item=>item.interval95?.map(Math.abs)??[]))*1.1;
  const map=x=>104+(x+limit)/(2*limit)*(width-122);
  context.font="12px 'Segoe UI'";
  context.fillStyle=palette("dim");
  context.strokeStyle=palette("line");
  line(context,map(0),12,map(0),height-30);
  for(const [i,item] of data.entries()){
    const y=30+i*43;
    context.fillStyle=palette("dim");
    context.fillText(cues[compare[i]],4,y+4);
    if(!item.interval95)continue;
    context.strokeStyle=palette("bright");
    context.fillStyle=palette("bright");
    context.lineWidth=2;
    line(context,map(item.interval95[0]),y,map(item.interval95[1]),y);
    circle(context,map(item.difference),y,4,true);
  }
  context.fillStyle=palette("dim");
  context.textAlign="center";
  context.fillText("0",map(0),height-10);
  context.fillText(signed(-limit),map(-limit),height-10);
  context.fillText(signed(limit),map(limit),height-10);
}

function matrix(){
  const cue=controls.biasCue.value, grid=controls.grid.value;
  const [vertical,horizontal,leftLabel,topLabel]=grids[grid];
  const values=analysis.matrices[cue][grid];
  const max=Math.max(1,...Object.values(values));
  const table=byId("robust-matrix");
  const header=node("tr");
  for(const caption of [leftLabel,...horizontal]){
    const th=node("th",caption);
    th.scope="col";
    header.append(th);
  }
  table.tHead.replaceChildren(header);
  table.tBodies[0].replaceChildren(...vertical.map(item=>{
    const element=row(item.toUpperCase(),...horizontal.map(column=>values[item+"/"+column]??0));
    for(const cell of [...element.cells].slice(1)){
      cell.className="robust-matrix-cell";
      cell.style.setProperty("--shade",Math.round(Number(cell.textContent)/max*16)+"%");
    }
    return element;
  }));
  byId("robust-matrix-title").textContent=topLabel+" · "+cues[cue];
  const selected=analysis.armMetrics[cue];
  byId("robust-matrix-scope").textContent=(grid==="cueLabelByAnswer"&&["none","matched"].includes(cue))?
    "This condition contains no suggested label.":
    selected.answered+"/"+selected.planned+" answered requests across all task families.";
  rows("robust-agreement",Object.keys(versions).slice(1).map(version=>{
    const d=analysis.presentations[version][cue];
    return [versions[version],d.bothAnswered,d.sameCanonical,d.sameLabel,d.sameRaw+" / "+d.pairs];
  }));
}

function replayCard(task, presentation, cue){
  const {request,score,raw}=replay.entries.get(task.id+"/"+presentation+"/"+cue);
  const card=node("article",null,"result-panel robust-replay-card");
  card.append(node("h3",versions[presentation]),node("p","Grammar order "+[...request.mapping.grammar].join(" → ")+" → ABSTAIN"));
  const options=node("ol",null,"robust-mapping");
  for(const number of request.mapping.physical){
    const id=ids[Number(number)], label=request.mapping.labels[Number(number)];
    options.append(node("li",label+" · "+task.options[id]+" · "+id.toUpperCase()));
  }
  card.append(options,node("p",request.target?"Suggested content "+request.target.toUpperCase()+" · label "+score.targetLabel:cues[cue]));
  const outcome=score.canonical?"Selected "+score.answer+" → "+score.canonical.toUpperCase()+" at position "+score.position+
    " · confidence "+percentage(score.confidence):"Outcome "+score.status;
  card.append(node("p",outcome));
  if(raw.raw!==null)card.append(node("pre",raw.raw));
  return card;
}

function renderReplay(){
  if(!replay)return;
  const task=replay.tasks.find(q=>q.id===controls.task.value);
  const detail=byId("robust-task-detail");
  if(!task){detail.replaceChildren(node("p","No recorded tasks match this filter."));return;}
  const key=replay.keys.get(task.id);
  const presentation=controls.presentation.value, cue=controls.replayCue.value;
  const group=node("div",null,"study-pair");
  group.append(replayCard(task,"reference",cue));
  if(presentation!=="reference")group.append(replayCard(task,presentation,cue));
  detail.replaceChildren(node("p",task.question),node("p","Verified "+key.correct.toUpperCase()+" · "+key.derivation),group);
}
function replayOptions(){
  const selected=controls.task.value;
  const show=controls.missing.checked?replay.tasks.filter(task=>replay.incomplete.has(task.id)):replay.tasks;
  controls.task.replaceChildren(...show.map(task=>new Option(families[task.family]+" · "+task.id,task.id)));
  if(show.some(task=>task.id===selected))controls.task.value=selected;
  controls.task.disabled=show.length===0;
  renderReplay();
}
async function openReplay(){
  const button=byId("robust-load-replay"), status=byId("robust-replay-status");
  button.disabled=true;
  status.textContent="Loading recorded requests and responses…";
  try{
    const [dataset, keys, schedule, scoreFile, text]=await Promise.all([
      load(inputs+"heldout.tasks.json"),load(inputs+"heldout.keys.json"),load(inputs+"heldout.schedule.json"),
      load(base+"scores.json"),load(base+"responses.ndjson","text")]);
    const raw=text.trim().split("\n").map(line=>JSON.parse(line));
    const entries=new Map(), incomplete=new Set();
    for(const [index,request] of schedule.entries()){
      const score=scoreFile.rows[index], response=raw[index];
      if(request.sequence!==score.sequence||request.sequence!==response.sequence||
         request.requestSha256!==response.requestSha256||response.evidence!=="actual-model-request")throw Error("Mismatched evidence");
      entries.set(request.taskId+"/"+request.presentation+"/"+request.cue,{request,score,raw:response});
      if(score.status!=="scorable")incomplete.add(request.taskId);
    }
    if(entries.size!==512||raw.length!==512||dataset.tasks.length!==32)throw Error("Incomplete schedule");
    replay={tasks:dataset.tasks,keys:new Map(keys.map(key=>[key.id,key])),entries,incomplete};
    byId("robust-replay-data").hidden=false;
    replayOptions();
    status.textContent="Recorded presentations loaded.";
    button.hidden=true;
    controls.task.focus();
  }catch{
    status.textContent="Recorded presentations unavailable. Use the archive links to check the source.";
    button.disabled=false;
  }
}

setupTheme(draw);
new ResizeObserver(draw).observe(byId("robust-interval-chart"));
controls.family.addEventListener("change",renderMetrics);
controls.biasCue.addEventListener("change",matrix);
controls.grid.addEventListener("change",matrix);
controls.missing.addEventListener("change",replayOptions);
for(const control of [controls.task,controls.presentation,controls.replayCue])control.addEventListener("change",renderReplay);
byId("robust-load-replay").addEventListener("click",openReplay);

try{
  const [manifest,result]=await Promise.all([load(base+"manifest.json"),load(base+"analysis.json")]);
  if(manifest.execution.studyId!=="mirage-empirical-robustness-002"||
    result.evidence!=="registered-actual-model"||manifest.planned!==512)throw Error("Wrong evidence");
  analysis=result;
  controls.family.append(...Object.entries(families).map(([key,name])=>new Option(name,key)));
  byId("robust-outcomes").hidden=false;
  summarize(manifest);
  renderMetrics();
  renderContrasts();
  matrix();
}catch{
  analysis=undefined;
  byId("robust-outcomes").hidden=true;
  byId("robust-status").textContent="The MIRAGE 002 archive is unavailable. Refer to the frozen protocol.";
}
