import {byId,pct} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {accountingRows,bindChart,priceChart,tradesRows} from "./market-view.mjs";

const [impact,seek]=["reflex-impact","reflex-round"].map(byId);
let study;
const selected=()=>study.arms.find(arm=>arm.impact===Number(impact.value)).replay;

function draw(){
  if(!study)return;
  const {policy,frames}=selected();
  priceChart(byId("reflex-price"),[policy.anchor,...frames.map(row=>row.midpoint)],
    [policy.anchor,...frames.map(row=>row.fundamental)],"Market round");
}
function render(){
  const replay=selected(),round=Number(seek.value),point=replay.frames[round-1];
  byId("reflex-round-output").value=String(round);
  seek.setAttribute("aria-valuetext","Round "+round);
  const q=point.quote;
  byId("reflex-quote").textContent="Round "+round+" · Fundamental "+point.fundamental+
    " · Midpoint "+q.midpoint+" · Bid "+q.bid+" · Ask "+q.ask+" · Maker inventory "+q.askUnits+" units";
  byId("reflex-totals").textContent="Conserved totals: "+replay.totals.cash.toLocaleString("en")+
    " cash ticks and "+replay.totals.assets+" asset units. Wealth uses the selected midpoint.";
  byId("reflex-trades").replaceChildren(...tradesRows(point.trades));
  byId("reflex-ledger").replaceChildren(...accountingRows(replay,
    replay.frames.slice(0,round).flatMap(frame=>frame.trades),point.midpoint));
  draw();
}
try{
  const response=await fetch("./data/reflex-confirmatory.json");
  if(!response.ok)throw new Error("Unavailable");
  study=await response.json();
  if(study.schemaVersion!=="reflex-market-v1"||study.arms.length!==2||
    study.arms.some(arm=>!arm.replay.frames.length))throw new Error("Invalid archive.");
  byId("reflex-status").textContent=study.config.id+" · "+study.config.trials+" paired synthetic markets";
  byId("reflex-results").replaceChildren(...study.arms.map(({impact,summary:s})=>
    row(impact,printed(s.meanAbsoluteError,2),printed(s.volume,2),printed(100*s.rootMeanSquaredReturn,4)+"%",pct(s.drawdown))));
  seek.max=study.config.rounds;
  seek.addEventListener("input",render);
  impact.addEventListener("change",render);
  bindChart("reflex-price",draw);
  render();
}catch{
  study=undefined;
  byId("reflex-status").textContent="The market artifact is unavailable. Review the protocol and result links below.";
  impact.disabled=seek.disabled=true;
}
