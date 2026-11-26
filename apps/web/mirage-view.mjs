import {byId,node,pct} from "./view.mjs";
import {printed,probabilityChart,row} from "./study-view.mjs";

const labels={constant:"Constant training rate",style:"Confident phrasing proxy",nominal:"Declared-quality forecast",
  calibrated:"Training-calibrated forecast",oracle:"Cue-reliability oracle"};
const controls=["mirage-regime","mirage-policy","mirage-example"].map(byId);
const [regime,policy,example]=controls;
let study;

function selected(){
  const region=study.regions.find(item=>item.mode===regime.value);
  return {region,metrics:region.metrics[policy.value]};
}
function draw(){
  if(!study)return;
  const {metrics}=selected();
  probabilityChart(byId("mirage-reliability"),metrics.reliability.filter(bin=>bin.n).map(bin=>({
    x:bin.confidence,y:bin.accuracy,radius:3+5*Math.sqrt(bin.n/metrics.trials),
  })),{diagonal:true,xLabel:"Mean forecast",yLabel:"Observed accuracy"});
  probabilityChart(byId("mirage-risk"),metrics.riskCoverage.map(point=>({x:point.coverage,y:point.risk})),
    {xLabel:"Coverage",yLabel:"Retained error"});
}
function render(){
  const {region,metrics}=selected();
  byId("mirage-metrics").replaceChildren(...Object.entries(region.metrics).map(([key,m])=>row(labels[key],
    pct(m.accuracy),printed(m.brier,4),printed(m.nll,4),printed(m.ece,4),printed(m.errorAUROC,4))));
  const difference=region.styleMinusCalibratedBrier;
  byId("mirage-contrast").textContent="Style minus trained Brier "+printed(difference.estimate,4)+
    " · adjusted interval "+difference.interval.map(x=>printed(x,4)).join(" to ");
  byId("mirage-bins").replaceChildren(...metrics.reliability.filter(bin=>bin.n)
    .map(bin=>row(bin.n,pct(bin.confidence),pct(bin.accuracy))));
  byId("mirage-risk-table").replaceChildren(...metrics.riskCoverage.map(point=>row(pct(point.coverage),pct(point.risk))));
  const task=region.examples[Number(example.value)];
  byId("mirage-task").textContent="Truth "+task.truth+" · Selected answer "+task.selected+
    " · Second hint "+task.hint+" · Actual hint reliability "+pct(task.qHint)+
    " · Outcome "+(task.correct?"correct":"wrong");
  byId("mirage-probs").replaceChildren(...Object.entries(task.confidence).map(([key,value])=>row(labels[key],pct(value))));
  draw();
}
try{
  const response=await fetch("./data/mirage-confirmatory.json");
  if(!response.ok)throw new Error("Unavailable");
  study=await response.json();
  if(study.schemaVersion!=="mirage-confidence-v1"||study.regions.length!==2||
    study.regions.some(region=>!region.examples.length||!region.metrics.calibrated))throw new Error("Invalid artifact");
  for(const [id,label] of Object.entries(labels)){
    const option=node("option",label);option.value=id;policy.append(option);
  }
  policy.value="calibrated";
  study.regions[0].examples.forEach((_,i)=>{
    const option=node("option","Task "+(i+1));option.value=i;example.append(option);
  });
  for(const control of controls)control.addEventListener("change",render);
  const resize=new ResizeObserver(draw);
  resize.observe(byId("mirage-reliability"));
  resize.observe(byId("mirage-risk"));
  byId("mirage-status").textContent=study.config.id+" · "+study.config.trials.toLocaleString("en")+" matched tasks per regime";
  render();
}catch{
  study=undefined;
  byId("mirage-status").textContent="The archived benchmark is unavailable. The protocol and results links are below.";
  for(const control of controls)control.disabled=true;
}
