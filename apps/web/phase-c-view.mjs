import {node} from "./view.mjs";

const archive = (study,file) => "./research/evidence/"+study+"/"+file+".json";
const verification = archive("scientia-adaptive-verification-002","sequential-and-integrated");
const methods = {
  fixed:"Fixed final test",peek:"Repeated unadjusted tests",spend:"Per-look alpha spending",evidence:"Evidence process",
};
const acquisition = {
  uniform:"Uniform",disagreement:"Predictive disagreement",hypothesisInformation:"Family information",
  jointInformation:"Joint information",predictionValue:"Prediction value",decisionValue:"Decision value",
};
function asNumber(value) {
  if (typeof value==="number") return value;
  const [n,d="1"]=value.split("/");
  const scale=1000000000n;
  return Number(BigInt(n)*scale/BigInt(d))/Number(scale);
}
const percent = value => (100*asNumber(value)).toFixed(2)+"%";
const decimal = value => asNumber(value).toFixed(5);

function table(tbody,data,labels,fields) {
  tbody.replaceChildren(...Object.entries(labels).map(([id,label])=>{
    const tr=node("tr");
    const heading=node("th",label);
    heading.scope="row";
    tr.append(heading,...fields.map(([field,format])=>node("td",data[id][field]===undefined?"—":format(data[id][field]))));
    return tr;
  }));
}

async function mount({body,controls,url,paint}) {
  const tbody=document.getElementById(body);
  if(!tbody)return;
  const inputs=controls.map(id=>document.getElementById(id));
  const status=document.getElementById(body+"-status");
  for(const control of inputs)control.disabled=true;
  try {
    const response=await fetch(url);
    if(!response.ok)throw new Error("Exact archive unavailable");
    const data=await response.json();
    const render=()=>paint(tbody,data,inputs.map(control=>control.value));
    render();
    for(const control of inputs){
      control.disabled=false;
      control.addEventListener("change",render);
    }
    status.textContent="Exact archived outcomes loaded.";
  } catch {
    status.textContent="The archived table is unavailable. The report remains linked below.";
  }
}

mount({body:"finite-discovery-counts",controls:["finite-discovery-world"],url:archive("noesis-corrected-discovery-002","evaluation"),
  paint:(body,data,[world])=>table(body,data.scenarios[world].policy,acquisition,[
    ["recovery",percent],["strongFamilyPosterior",percent],["interpolationBrier",decimal],
    ["extrapolationBrier",decimal],["decisionLoss",decimal],
  ])});
mount({body:"sequential-counts",controls:["sequential-rate","sequential-horizon"],url:verification,
  paint:(body,data,[rate,horizon])=>table(body,data.scenarios[horizon][rate],methods,[["report",percent],["used",decimal]])});
mount({body:"selection-counts",controls:["selection-world","selection-budget"],url:verification,
  paint:(body,data,[world,allocation])=>table(body,data.selectAndConfirm[world][allocation],methods,[
    ["trueReports",percent],["falseReports",percent],["observations",decimal],
    ["focalDecisionLoss",decimal],["totalLoss",decimal],
  ])});
