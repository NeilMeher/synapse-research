import {byId,pct} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const climate=byId("polis-climate"), policy=byId("polis-policy"), day=byId("polis-day");
const names={material:"Payer gain, pooled",joint:"Joint gain, pooled",cautious:"Failure-sensitive, pooled",fixedPrior:"Payer gain, fixed prior"};
const descriptions={
  material:"AXIOM compares the payer's expected gain with zero.",
  joint:"AXIOM compares payer plus supplier expected gains with zero.",
  cautious:"A recorded failure blocks acceptance. Other offers use payer expected gain.",
  fixedPrior:"AXIOM uses the payer's expected gain at fixed delivery belief 75%.",
};
let archive;

function render(){
  const cell=archive.cells.find(item=>item.climate===climate.value);
  const scenario=cell.first;
  const selected=scenario.arms[policy.value];
  const time=selected.timeline[day.valueAsNumber-1];
  const record=selected.metric;
  const baseline=scenario.arms.material;
  byId("polis-day-label").textContent="Day "+time.day+" of "+selected.timeline.length;
  byId("polis-belief").textContent=time.labor+" labor "+(time.labor===1?"hour":"hours")+" per agent · seed "+scenario.world.seed+
    " · "+(policy.value==="fixedPrior"?"fixed delivery belief":"past pooled deliveries");
  byId("polis-decision").textContent=descriptions[policy.value];
  byId("polis-flows").textContent=time.exchanges.filter(event=>event.status==="delivered").length+" completed, "+
    time.exchanges.filter(event=>event.status==="defaulted").length+" defaulted, "+
    time.exchanges.filter(event=>event.status==="rejected").length+" declined.";
  byId("polis-intake").textContent=time.flows.consumed.reduce((sum,x)=>sum+x,0)+" units consumed this day. "+
    pct(record.needsSatisfied)+" of needs satisfied across the replay.";
  byId("polis-events").replaceChildren(...(time.exchanges.length?time.exchanges.map(({payer,supplier,quantity,belief,status})=>
    row("Agent "+(payer+1)+" → agent "+(supplier+1)+" · "+quantity+" units",pct(belief),status)):
    [row("No fundable offers","—","—")]));
  byId("polis-agents").replaceChildren(...selected.received.map((intake,i)=>{
    const prior=baseline.received[i];
    const difference=intake-prior;
    return row("Agent "+(i+1),String(prior),String(intake),(difference>0?"+":"")+difference);
  }));
  const percent=value=>value?pct(value.estimate):"—";
  byId("polis-outcomes").replaceChildren(...Object.entries(cell.summaries).map(([id,m])=>
    row(names[id],percent(m.needsSatisfied),printed(m.deliveries.estimate,1),printed(m.giniConsumed.estimate,3),
      printed(m.betterOff.estimate,2),printed(m.worseOff.estimate,2),printed(m.largestLoss.estimate,2),percent(m.shockSatisfaction))));
  const points=value=>(100*value).toFixed(2);
  byId("polis-contrast").textContent="Joint gain minus payer gain under pooled records · "+points(cell.contrast.estimate)+
    " pp · 95% interval "+cell.contrast.interval.map(points).join(" to ")+" pp";
}

try {
  const response=await fetch("./data/polis-confirmatory.json");
  if(!response.ok)throw Error("Archive unavailable");
  const data=await response.json();
  if(data.schemaVersion!=="polis-v1"||data.config.id!=="polis-confirmatory-001")throw Error("Incorrect archive");
  archive=data;
  byId("polis-status").textContent=data.config.id+" · "+data.config.trials+" matched worlds per regime";
  for(const element of [climate,policy,day])element.addEventListener("input",render);
  render();
}catch{
  byId("polis-status").textContent="The matched archive could not be loaded.";
  for(const element of [climate,policy,day])element.disabled=true;
}
