import {byId,node} from "./view.mjs";
import {printed,probabilityChart,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

const archive="./empirical/archives/mirage-empirical-pilot-001/";
const familyNames={change:"Arithmetic change",conditional:"Conditional probability",mean:"Missing measurement",ordering:"Order inference"};
const statusNames={scorable:"Scorable",abstention:"Abstained",missingConfidence:"Missing confidence",missingAnswer:"Missing answer",
  invalidOutput:"Invalid output",explicitRefusal:"Explicit refusal",truncated:"Truncated",timeout:"Timeout",
  interrupted:"Interrupted",infrastructureFailure:"Infrastructure failure"};
const conditionNames={neutral:"Neutral",incorrectCue:"Incorrect cue"};
const pairNames={brier:"Brier loss",accuracy:"Accuracy",confidence:"Mean confidence",calibrationGap:"Calibration gap",
  answerCoverage:"Answer coverage",confidenceCoverage:"Confidence coverage"};
const family=byId("obs-family"), condition=byId("obs-condition"), filter=byId("obs-filter"), task=byId("obs-task");
const percent=value=>value==null?"Unavailable":(value*100).toFixed(1)+"%";
const signed=(value,suffix="")=>value==null?"Unavailable":(value>0?"+":"")+printed(value)+suffix;
const interval=(value,format)=>value?format(value[0])+" to "+format(value[1]):"Unavailable";
const selectOption=(label,value)=>new Option(label,value);
let evidence;

function table(id,items){
  byId(id).replaceChildren(...items.map(values=>row(...values)));
}

function headline(){
  const {analysis}=evidence;
  const primary=analysis.paired.brier;
  byId("obs-conclusion").textContent=analysis.primaryCoverageMet
    ?"The coverage threshold was met. The comparison uses tasks with an answer and confidence in both conditions."
    :"The primary comparison fell below the registered 75% coverage threshold. The available-pair estimate is descriptive.";
  const entries=[["Brier difference",signed(primary.difference)],["95% paired interval",interval(primary.interval95,signed)],
    ["Scorable pairs",primary.pairs+" / "+evidence.tasks.length]];
  byId("obs-headline").replaceChildren(...entries.map(([title,value])=>{
    const block=node("div");
    block.append(node("span",title),node("strong",value));
    return block;
  }));
  table("obs-paired",Object.entries(pairNames).map(([id,name])=>{
    const result=analysis.paired[id];
    const format=id==="brier"?signed:value=>value==null?"Unavailable":signed(value*100," pp");
    return [name,result.pairs,format(result.difference),interval(result.interval95,format)];
  }));
  const cueAnswers=[...evidence.responses.values()].filter(record=>record.condition==="incorrectCue"&&record.answer);
  const cueChoices=new Set(cueAnswers.map(record=>record.answer));
  const abstentions=analysis.conditions.neutral.statuses.abstention??0;
  byId("obs-pattern").textContent=(cueChoices.size===1?"All "+cueAnswers.length+" incorrect-cue answers selected option "+cueAnswers[0].answer+". ":"")+
    abstentions+" neutral observations abstained.";
  const switches=analysis.transitions;
  byId("obs-transitions").textContent=(switches.correctToWrong??0)+" changed from correct to incorrect and "+
    (switches.wrongToCorrect??0)+" from incorrect to correct among "+analysis.paired.accuracy.pairs+
    " valid answer pairs across all families. "+analysis.changedToCue+" switched to the suggested wrong choice.";
}

function armMetrics(){
  return family.value==="all"?evidence.analysis.conditions:evidence.analysis.familySummaries[family.value];
}
function charts(){
  if(!evidence)return;
  const arm=armMetrics()[condition.value];
  const occupied=arm.reliability.filter(bin=>bin.count);
  const risk=arm.riskCoverage;
  probabilityChart(byId("obs-reliability"),occupied.map(b=>({x:b.confidence,y:b.accuracy,radius:Math.min(10,3+Math.sqrt(b.count))})),
    {diagonal:true,xLabel:"Mean expressed confidence",yLabel:"Observed accuracy"});
  probabilityChart(byId("obs-risk"),risk.map(p=>({x:p.coverage,y:p.risk})),
    {xLabel:"Coverage of planned responses",yLabel:"Risk among retained answers"});
  table("obs-bins",arm.reliability.map(b=>[percent(b.from)+" to "+percent(b.to),b.count,percent(b.confidence),percent(b.accuracy)]));
  table("obs-risk-table",risk.length?risk.map(p=>[percent(p.threshold),percent(p.coverage),percent(p.risk)]):[["No scorable forecasts","—","—"]]);
}

function performance(){
  const arms=Object.keys(conditionNames).map(key=>armMetrics()[key]);
  const fixed=[
    ["Planned",a=>a.planned],["Answered",a=>a.answered],["Scorable confidence",a=>a.scorable],
    ["Answer coverage",a=>percent(a.answerCoverage)],["Confidence coverage",a=>percent(a.confidenceCoverage)],
    ["Accuracy among answers",a=>percent(a.accuracy)],["Accuracy among scorable forecasts",a=>percent(a.scorableAccuracy)],
    ["Mean confidence",a=>percent(a.confidence)],["Calibration gap",a=>a.calibrationGap==null?"Unavailable":signed(a.calibrationGap*100," pp")],
    ["Brier loss",a=>printed(a.brier)],["Clipped log loss",a=>printed(a.logLoss)],["Error AUROC",a=>printed(a.errorAUROC)],
    ["Expected calibration error",a=>percent(a.ece)]
  ];
  const outcomes=Object.keys(statusNames).filter(key=>key!=="scorable" && arms.some(a=>a.statuses[key]));
  for(const status of outcomes)fixed.push([statusNames[status],a=>a.statuses[status]??0]);
  table("obs-metrics",fixed.map(([name,value])=>[name,...arms.map(value)]));
  charts();
}

function explanation(item,key){
  const p=key.parameters;
  if(item.family==="change")return p[0]+" − "+p[1]+" + 5 × "+p[2]+" = "+key.value+".";
  if(item.family==="conditional")return "Conditioning on wooden tokens leaves "+p[0]+" striped among "+(p[0]+p[1])+" wooden tokens.";
  if(item.family==="mean")return "The four values sum to "+(4*p[0])+". Subtract "+p.slice(1).join(", ")+" to get "+key.value+".";
  return "The constraints give this order: "+[p[0],p[2],p[3],p[1]].join(", ")+".";
}

function detail(){
  const item=evidence.tasks.find(entry=>entry.id===task.value);
  const target=byId("obs-detail");
  if(!item){
    target.replaceChildren(node("p","No tasks match these filters."));
    return;
  }
  const key=evidence.key.get(item.id), options=node("ul",null,"obs-choice-list");
  for(const [label,value] of Object.entries(item.options))options.append(node("li",label+". "+value));
  const cards=node("div",null,"study-pair");
  for(const arm of Object.keys(conditionNames)){
    const record=evidence.responses.get(item.id+"|"+arm);
    const card=node("article",null,"result-panel obs-response");
    card.append(node("h3",conditionNames[arm]),node("p",statusNames[record.status]),
      node("p",record.answer?"Selected "+record.answer+" · confidence "+percent(record.confidence):"No scored answer"));
    if(record.raw!=null)card.append(node("pre",record.raw));
    cards.append(card);
  }
  target.replaceChildren(node("p",item.question),options,
    node("p","Correct option "+key.correct+" · "+explanation(item,key)),
    node("p","The incorrect advisory cue named option "+item.incorrectCueOption+"."),cards);
}

function taskOptions(){
  const old=task.value;
  const shown=evidence.tasks.filter(item=>{
    if(family.value!=="all" && item.family!==family.value)return false;
    const first=evidence.responses.get(item.id+"|neutral"), second=evidence.responses.get(item.id+"|incorrectCue");
    if(filter.value==="changed")return first.answer && second.answer && first.answer!==second.answer;
    if(filter.value==="wrong")return second.answer && second.answer!==evidence.key.get(item.id).correct;
    if(filter.value==="incomplete")return first.status!=="scorable"||second.status!=="scorable";
    return true;
  });
  task.replaceChildren(...shown.map(item=>selectOption(item.id+" · "+familyNames[item.family],item.id)));
  if(shown.some(item=>item.id===old))task.value=old;
  task.disabled=!shown.length;
  detail();
}

async function get(url,type="json"){
  const response=await fetch(url);
  if(!response.ok)throw Error("Empirical archive unavailable");
  return response[type]();
}

setupTheme(charts);
const chartObserver=new ResizeObserver(charts);
chartObserver.observe(byId("obs-reliability"));
family.addEventListener("change",()=>{performance();taskOptions();});
condition.addEventListener("change",charts);
filter.addEventListener("change",taskOptions);
task.addEventListener("change",detail);

try{
  const [manifest,analysis,raw,dataset,keys]=await Promise.all([get(archive+"manifest.json"),get(archive+"analysis.json"),
    get(archive+"responses.ndjson","text"),get("./empirical/datasets/pilot.tasks.json"),get("./empirical/datasets/pilot.key.json")]);
  const records=raw.trim().split("\n").map(line=>JSON.parse(line));
  const responses=new Map(records.map(record=>[record.taskId+"|"+record.condition,record]));
  if(manifest.status!=="completed"||manifest.execution.classification!=="exploratory-actual-model"||
    records.some(record=>record.evidence!=="actual-model-execution")||
    records.length!==2*dataset.tasks.length||responses.size!==records.length||keys.length!==dataset.tasks.length){
    throw Error("The paired archive is incomplete or its evidence class differs.");
  }
  evidence={analysis,responses,tasks:dataset.tasks,key:new Map(keys.map(item=>[item.id,item]))};
  family.replaceChildren(selectOption("All families","all"),...Object.entries(familyNames).map(([id,name])=>selectOption(name,id)));
  byId("obs-data").hidden=false;
  headline();
  performance();
  taskOptions();
  byId("obs-status").textContent=records.length+" planned model requests · "+manifest.execution.studyId;
}catch{
  evidence=undefined;
  byId("obs-data").hidden=true;
  byId("obs-status").textContent="The empirical archive is unavailable. Refer to the frozen protocol and try again later.";
}
