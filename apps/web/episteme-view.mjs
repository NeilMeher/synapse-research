import {byId,pct} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";
import {generateInquiry,runInquiry,regimes} from "./engine/episteme.mjs";
import {seeded} from "./engine/echo.mjs";

setupTheme();

const names=Object.freeze({poly:"Quadratic",harm:"Harmonic",exp:"Exponential",rat:"Rational",outside:"Sine + quadratic"});
const namesOfPolicy=Object.freeze({random:"Random",disagreement:"Disagreement"});
const menu=byId("episteme-case");
const policy=byId("episteme-policy");
const example=byId("episteme-example");
const stage=byId("episteme-stage");
const reveal=byId("episteme-reveal");
let archive;
const examples=new Map();

function exampleFromArchive(cell){
  if(example.value==="first")return {number:1,task:cell.firstTask,replay:cell.replay[policy.value]};
  const key=[cell.regime,policy.value,example.value].join(":");
  if(examples.has(key))return examples.get(key);

  const random=seeded(archive.config.seed);
  for(const regime of regimes){
    for(let index=0;index<archive.config.trials;index++){
      const task=generateInquiry(regime,random);
      if(regime!==cell.regime)continue;
      const replay=runInquiry(task,policy.value);
      const outcome=replay.replicated?"accepted":replay.proposed?"rejected":"unresolved";
      if(outcome===example.value){
        const record={number:index+1,task,replay};
        examples.set(key,record);
        return record;
      }
    }
  }
  return {number:1,task:cell.firstTask,replay:cell.replay[policy.value]};
}

function render(){
  const cell=archive.cells[Number(menu.value)];
  const {number,replay}=exampleFromArchive(cell);
  byId("episteme-task").textContent="Confirmatory task "+number+" of "+archive.config.trials+" in the selected regime.";
  const now=stage.valueAsNumber;
  const seen=Math.min(now,replay.observations.length);
  const current=replay.updates[seen-1];
  const validating=now>=7;
  const replicating=now===8;
  byId("episteme-stage-label").textContent=replicating?"Replication":validating?"Validation":seen+" of 6 discovery measurements";
  reveal.disabled=!replicating;
  byId("episteme-truth").textContent="";
  byId("episteme-observations").replaceChildren(...replay.observations.slice(0,seen).map(({x,y},i)=>
    row(printed(x,2),printed(y),names[replay.updates[i].family],pct(replay.updates[i].probability))));
  byId("episteme-weights").replaceChildren(...Object.entries(current.weights).map(([key,value])=>row(names[key],pct(value))));
  const proposed=replay.proposed;
  let verdict="Discovery in progress.";
  if(seen===6){
    if(!proposed)verdict="Unresolved. No candidate reached the 70% claim threshold.";
    else if(validating&&!replay.validated)verdict="Rejected at validation. "+names[proposed]+" failed its first residual check.";
    else if(replicating&&!replay.replicated)verdict="Rejected at replication. "+names[proposed]+" failed its second residual check.";
    else if(replicating)verdict="Provisionally accepted: "+names[proposed]+". Both residual checks passed.";
    else if(validating)verdict="Validation passed for "+names[proposed]+". Replication remains pending.";
    else verdict="Discovery proposal: "+names[proposed]+". Predictions are frozen.";
  }
  byId("episteme-decision").textContent=verdict;
  const gates=replicating?["validation","replication"]:validating?["validation"]:[];
  byId("episteme-gates").textContent=gates.length?gates.map(key=>
    key+" p = "+printed(replay[key].p,4)+" ("+(replay[key].passes?"passes":"fails")+")").join(" · "):
    "Advance the inquiry stage to inspect the reserved data.";
  byId("episteme-blocks").replaceChildren(...gates.flatMap(key=>replay[key].rows.map(({x,y,predicted})=>
    row(key,printed(x,2),printed(y),printed(predicted),printed(y-predicted)))));
  const metric=value=>pct(value.estimate);
  byId("episteme-results").replaceChildren(...Object.entries(cell.policies).map(([id,s])=>
    row(namesOfPolicy[id],metric(s.correctProposal),metric(s.falseProposal),metric(s.correctAccepted),
      metric(s.falseAccepted),metric(s.rejected),printed(s.rmse.estimate))));
  const c=cell.contrast;
  const points=x=>(100*x).toFixed(2)+" pp";
  byId("episteme-contrast").textContent="Disagreement minus random · "+
    (c.outcome==="correctAccepted"?"correct final claims":"false proposals")+" · "+
    points(c.estimate)+" · adjusted interval "+c.interval.map(points).join(" to ");
}

try {
  const response=await fetch("./data/episteme-confirmatory.json");
  if(!response.ok)throw Error("Archive HTTP "+response.status);
  const data=await response.json();
  if(data.schemaVersion!=="episteme-v1"||data.config.id!=="episteme-confirmatory-001")throw Error("Incorrect archive");
  archive=data;
  byId("episteme-status").textContent=data.config.id+" · "+data.config.trials.toLocaleString()+" matched tasks per regime";
  for(const control of [menu,policy,stage,example])control.addEventListener("input",render);
  reveal.addEventListener("click",()=>{
    const cell=archive.cells[Number(menu.value)];
    const {task,replay}=exampleFromArchive(cell);
    byId("episteme-truth").textContent="Generating family "+names[task.family]+
      " · coefficients "+task.coefficients.map(value=>printed(value)).join(", ")+
      " · RMSE "+printed(replay.score.rmse)+" across "+replay.evalRows.length+" disjoint evaluation sites.";
  });
  render();
} catch(error){
  byId("episteme-status").textContent="The archived study could not be loaded.";
  for(const control of [menu,policy,stage,example])control.disabled=true;
}
