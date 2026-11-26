import {byId,node,pct} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {bindChart,priceChart,tradesRows} from "./market-view.mjs";

const laws={independent:"Independent",shared:"Shared source",beta:"Beta-binomial"};
const modes={fixed:"fixed size",calibrated:"calibrated probability",style:"style probability"};
const explanation={none:"no messaging",equal:"equal messaging",weighted:"confidence-weighted messaging"};
const armLabel=arm=>[laws[arm.law],modes[arm.confidence],"impact "+arm.impact,explanation[arm.communication]].join(" · ");
const contrastLabels={dependence:"Beta minus shared under calibrated sizing",
  "confidence-interaction":"Beta-minus-shared gap under calibration minus style"};
const buttons=[...document.querySelectorAll("[data-stage]")];
const [menu,seek,play]=["convergence-arm","convergence-step","convergence-play"].map(byId);
let study, timer;
let stage="evidence";
const chosen=()=>study.arms[Number(menu.value)].replay;

function draw(){
  if(!study)return;
  const replay=chosen();
  const events=replay.ledger.frames[0].trades.slice(0,Number(seek.value));
  const midpoints=[replay.ledger.policy.anchor,...events.map(item=>item.event.after.midpoint)];
  priceChart(byId("convergence-price"),midpoints,midpoints.map(()=>replay.fundamental),"Order receipt");
}
function stop(){
  if(timer)clearInterval(timer);
  timer=undefined;
  play.textContent="Play orders";
}
function render(){
  const replay=chosen(),position=Number(seek.value);
  const tape=replay.ledger.frames[0].trades;
  const {report,hint,confidence,event,correct}=tape[position-1];
  seek.setAttribute("aria-valuetext","Order "+position+" of "+tape.length);
  byId("convergence-step-output").value=String(position);
  const stages={
    evidence:"Synthetic truth "+replay.truth+" · Private report "+report+" · Independent hint "+hint+
      " · Private report was "+(correct?"correct":"wrong"),
    confidence:"Probability the original report is correct "+pct(confidence)+" · Sizing threshold 75%",
    order:event.order.actor+" submitted "+event.order.side+" for "+event.order.quantity+" unit(s) at limit "+event.order.limit,
    outcome:event.fills.length+" executed units · Midpoint "+event.before.midpoint+" → "+event.after.midpoint+
      " ticks · Fundamental "+replay.fundamental+" ticks",
  };
  byId("convergence-stage").textContent=stages[stage];
  for(const button of buttons)button.setAttribute("aria-pressed",String(button.dataset.stage===stage));
  byId("convergence-trades").replaceChildren(...tradesRows(tape.slice(0,position)));
  draw();
}
try{
  const response=await fetch("./data/convergence-confirmatory.json");
  if(!response.ok)throw new Error("Unavailable");
  study=await response.json();
  if(study.schemaVersion!=="convergence-market-v1"||study.arms.length!==22||
    study.arms.some(arm=>arm.replay.ledger.frames[0].trades.length!==study.config.agents))throw new Error("Invalid archive.");
  study.arms.forEach((arm,index)=>{
    const option=node("option",armLabel(arm));option.value=index;menu.append(option);
  });
  menu.value=String(study.arms.findIndex(arm=>arm.id==="beta/calibrated/4/none"));
  seek.max=study.config.agents;
  byId("convergence-status").textContent=study.config.id+" · "+study.config.trials.toLocaleString("en")+" paired synthetic episodes";
  byId("convergence-contrasts").replaceChildren(...study.contrasts.map(part=>row(contrastLabels[part.id],
    printed(part.estimate,2),part.interval.map(value=>printed(value,2)).join(" to "))));
  byId("convergence-results").replaceChildren(...study.arms.map(arm=>row(armLabel(arm),
    printed(arm.metrics.absoluteGap.estimate,2),pct(arm.metrics.reportAccuracy.estimate),pct(arm.metrics.actionAccuracy.estimate),
    printed(arm.metrics.brier.estimate,4),printed(arm.metrics.submitted.estimate,2),printed(arm.metrics.volume.estimate,2))));
  for(const button of buttons)button.addEventListener("click",()=>{stage=button.dataset.stage;render();});
  seek.addEventListener("input",()=>{stop();render();});
  menu.addEventListener("change",()=>{stop();seek.value="1";render();});
  play.addEventListener("click",()=>{
    if(timer){stop();return;}
    if(Number(seek.value)===Number(seek.max)){seek.value="1";render();}
    play.textContent="Pause orders";
    timer=setInterval(()=>{
      seek.value=String(Number(seek.value)+1);
      render();
      if(Number(seek.value)>=Number(seek.max))stop();
    },600);
  });
  bindChart("convergence-price",draw);
  render();
}catch{
  study=undefined;
  byId("convergence-status").textContent="The archived experiment is unavailable. The protocol links are below.";
  for(const control of [menu,seek,play,...buttons])control.disabled=true;
}
