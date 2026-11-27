import {expectedGains} from "./engine/polis2.mjs";
import {byId,pct} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const payment=byId("polis2-payment"), surplus=byId("polis2-surplus"), probability=byId("polis2-probability");
const labels={material:"Payer gain",joint:"Joint gain",fixedPrior:"Fixed-prior payer gain",cautious:"Failure-sensitive payer gain"};
let archive;

function contract(){
  const s=Number(surplus.value);
  const q=probability.valueAsNumber;
  const p=expectedGains(payment.value,s,q,100);
  const prepay=payment.value==="prepay";
  byId("polis2-probability-label").textContent=pct(q/100);
  byId("polis2-contract").textContent=prepay?"The prepaid unit moves even if delivery fails.":"Both units move on success. Failure moves neither.";
  byId("polis2-payer").textContent=(p.payer/p.denominator).toFixed(2)+" utility units";
  byId("polis2-supplier").textContent=(p.supplier/p.denominator).toFixed(2)+" utility units";
  byId("polis2-joint").textContent=((p.payer+p.supplier)/p.denominator).toFixed(2)+" utility units";
  byId("polis2-threshold").textContent=prepay?"Payer accepts strictly above p = "+s+"/3. Joint gain is (3 − "+s+")(1 + p).":
    "Payer and joint gains have the same sign. Exact indifference uses the same half-probability choice draw.";
  if(archive)drawEvidence(s);
}

function drawEvidence(value){
  const cell=archive.cells.find(c=>c.payment===payment.value&&c.surplus===value);
  const pp=x=>(100*x).toFixed(2);
  const formatMetric=(caption,metric)=>caption+" "+pp(metric.estimate)+" pp · paired 95% interval "+
    metric.interval.map(pp).join(" to ")+" pp.";
  byId("polis2-interaction").textContent=formatMetric("Primary interaction at surplus value 2",archive.interaction);
  byId("polis2-contrast").textContent=formatMetric("Selected cell, joint minus payer gain",cell.contrast)+
    " Joint and fixed-prior physical outcomes matched in "+cell.sameJointFixed+" of "+archive.config.trials+" worlds.";
  byId("polis2-results").replaceChildren(...Object.entries(cell.policies).map(([key,m])=>
    row(labels[key],pct(m.needsSatisfied.estimate),printed(m.completed.estimate,1),printed(m.gini.estimate,3),
      printed(m.losingAgents.estimate,2),printed(m.largestLoss.estimate,2),printed(m.meanLossAmongLosers?.estimate,2))));
  const balance=cell.example.joint.accounting;
  byId("polis2-ledger").replaceChildren(...["A","B"].map((name,i)=>row(name,...Object.values(balance).map(values=>String(values[i])))));
}

for(const control of [payment,surplus,probability])control.addEventListener("input",contract);
contract();
try{
  const response=await fetch("./data/polis2-confirmatory.json");
  if(!response.ok)throw Error("Archive unavailable");
  const data=await response.json();
  if(data.schemaVersion!=="polis2-v1"||data.config.id!=="polis2-confirmatory-001")throw Error("Incorrect archive");
  archive=data;
  byId("polis2-status").textContent=data.config.id+" · "+data.config.trials+" matched worlds · synthetic evidence";
  contract();
}catch{
  byId("polis2-status").textContent="The archived study is unavailable. The contract calculator remains available.";
}
