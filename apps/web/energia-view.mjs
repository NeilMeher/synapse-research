import {project,withSettings} from "./engine/energia.mjs";
import {byId} from "./view.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const ids=["work","billing","tariff","price","pue","debt","rate"];
const controls=Object.fromEntries(ids.map(id=>[id,byId("energia-"+id)]));
const preset=byId("energia-case"),gridChoice=byId("energia-grid-choice");
const moneyFormat=new Intl.NumberFormat("en",{style:"currency",currency:"USD",maximumFractionDigits:0});
const decimal=new Intl.NumberFormat("en",{maximumFractionDigits:2});
const money=x=>moneyFormat.format(x);
const bare=x=>decimal.format(x);
const ratio=x=>x===null?"—":bare(x)+"×";
const payment=x=>x===null?"None":"Year "+x;
const labels={baseline:"Baseline","no-debt":"All equity",stress:"Combined stress","deferred-replacement":"End-year replacement","delay-only":"One-year delay","short-contract":"Shorter reservation"};
let archive,config;
const update=(id,value)=>{byId("energia-"+id).textContent=value;};
const put=(id,rows)=>byId("energia-"+id).replaceChildren(...rows.map(items=>row(...items)));
const spec=()=>withSettings(config.base,config.cases.find(({id})=>id===preset.value).settings);
async function fetchJSON(path){
  const response=await fetch(path);
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}
function scenario(){
  const {capacity:c,tariff:t,operations:o,finance:f}=spec();
  for(const [id,v] of [["work",c.workFraction*100],["billing",c.billFraction*100],["tariff",t.energyPerKWh],["price",o.spotPerHour],
    ["pue",c.pue],["debt",f.debtShare*100],["rate",f.debtRate*100]])controls[id].value=Number(v.toFixed(5));
  draw();
}
function draw(){
  const base=spec(), values=Object.fromEntries(ids.map(id=>[id,controls[id].valueAsNumber]));
  const affected=["energy","peak","water","hours","npv","equity","dscr","gap","credit"];
  try{
    if(!Object.values(controls).every(input=>input.validity.valid))throw new Error("Enter values within the displayed bounds.");
    const hasDebt=values.debt>0;
    const input=withSettings(base,{
      capacity:{workFraction:values.work/100,billFraction:values.billing/100,pue:values.pue},
      tariff:{energyPerKWh:values.tariff},operations:{spotPerHour:values.price},
      finance:{debtShare:values.debt/100,debtRate:values.rate/100,tenor:hasDebt?(base.finance.tenor||config.base.finance.tenor):0,
        reserveUSD:hasDebt?(base.finance.reserveUSD||config.base.finance.reserveUSD):0}});
    const {physical:p,capital:c,metrics:m,funding:f,timeline}=project(input);
    update("input-status","Live assumptions · "+input.currency+" · "+input.operations.years+" operating years · modeled pre-tax.");
    update("energy",bare(p.facilityKWh/1000)+" MWh");
    update("peak",bare(p.peakKVA)+" kVA");
    update("water",bare(p.siteWaterM3)+" m³");
    update("hours",bare(p.billableGPUHours));
    update("npv",money(m.projectNPV));
    update("equity",money(m.equityNPV));
    update("dscr",ratio(m.minDSCR));
    update("gap",payment(m.firstPaymentGapYear));
    const irr=m.projectIRR.value===null?m.projectIRR.status:(100*m.projectIRR.value).toFixed(2)+"%";
    update("credit","Project IRR "+irr+". The schedule has "+m.covenantBreaches+" DSCR breaches and "+
      money(m.additionalEquity)+" in additional operating equity needs. "+(m.minDSCR===null?"No debt service is scheduled.":"DSCR uses cash after modeled replacement capex."));
    put("physical",[["Servers / racks",p.servers+" / "+p.racks],["Peak rack power",bare(p.maxRackKW)+" kW"],
      ["Idle IT power",bare(p.idleITKW)+" kW"],["Peak IT power",bare(p.peakITKW)+" kW"],["IT energy",bare(p.itKWh/1000)+" MWh"],
      ["Peak facility power",bare(p.peakFacilityKW)+" kW"],["Billed demand",bare(p.billingKVA)+" kVA"],
      ["Energy charge",money(p.electricity.energy)],["Demand charge",money(p.electricity.demand)],["Fixed charge",money(p.electricity.fixed)],
      ["Water cost",money(p.waterCost)]]);
    put("capital",[...Object.entries(c).map(([k,v])=>[k,money(v)]),
      ["Funding uses",money(f.uses)],["Debt draw",money(f.debt)],["Initial equity",money(f.equity)]]);
    put("timeline",timeline.map(line=>[String(line.year),...["revenue","operatingCosts","capex","workingCapital","replacement","cfads",
      "projectCash","interest","principal","debtBalance","reserveBalance","paymentGap","equityCash"].map(key=>money(line[key])),ratio(line.dscr)]));
  }catch(error){
    update("input-status",error.message);
    for(const id of affected)update(id,"—");
    for(const id of ["physical","capital","timeline"])put(id,[]);
  }
}
function drawGrid(){
  const grid=archive.grids[gridChoice.value];
  const xs=[...new Set(grid.map(p=>p.x))],ys=[...new Set(grid.map(p=>p.y))];
  const hardware=gridChoice.value==="debtHardware";
  const yAxis=hardware?"USD per GPU":gridChoice.value==="utilizationEnergy"?"USD/kWh":"USD/GPU-hour";
  update("grid-caption",(hardware?"Rows are debt interest rates.":"Rows are spot billing fractions. ")+" Columns are "+yAxis+".");
  const head=row(hardware?"Debt rate":"Spot billing",...ys.map(y=>bare(y)));
  for(const cell of Array.from(head.children)){
    const th=document.createElement("th");
    th.scope="col";th.textContent=cell.textContent;cell.replaceWith(th);
  }
  byId("energia-grid-head").replaceChildren(head);
  byId("energia-grid").replaceChildren(...xs.map(x=>{
    const points=grid.filter(p=>p.x===x);
    const line=row((100*x).toFixed(hardware?1:0)+"%",...points.map(p=>money(p.equityNPV)));
    points.forEach((item,i)=>{line.children[i+1].dataset.positive=String(item.equityNPV>=0);});
    return line;
  }));
}
function showEvidence(){
  put("archive",archive.cases.map(({id,metrics:m})=>[labels[id],money(m.projectNPV),money(m.equityNPV),ratio(m.minDSCR),payment(m.firstPaymentGapYear)]));
  const roots={"billFraction":["Spot billing utilization",x=>(x*100).toFixed(2)+"%"],
    energyPerKWh:["Energy price",x=>"$"+x.toFixed(3)+"/kWh"],spotPerHour:["Spot rate",x=>"$"+x.toFixed(3)+"/GPU-hour"]};
  byId("energia-roots").replaceChildren(...Object.entries(archive.roots).map(([key,value])=>{
    const [label,fmt]=roots[key],item=document.createElement("li");
    item.textContent=label+" · "+(value.value===null?value.status:fmt(value.value));
    return item;
  }));
  put("profile",archive.profile.map(p=>[(p.rate*100).toFixed(1)+"%",money(p.projectNPV),money(p.equityNPV)]));
  put("frontier",archive.optimization.candidates.map(p=>[p.id,money(p.capital),bare(p.peakKVA),bare(p.siteWaterM3),
    p.costPerBillableHour===null?"—":moneyFormat.format(p.costPerBillableHour)+" ("+p.costPerBillableHour.toFixed(3)+")",
    p.failures.length?p.failures.join(", "):archive.optimization.frontier.includes(p.id)?"Pareto frontier":"Feasible"]));
  gridChoice.addEventListener("change",drawGrid);
  drawGrid();
}
try{
  config=await fetchJSON("./experiments/energia-scenario.json");
  if(config.id!=="energia-scenario-001")throw new Error("Unregistered configuration.");
  preset.replaceChildren(...config.cases.map(({id})=>new Option(labels[id],id)));
  byId("energia-controls").disabled=false;
  preset.addEventListener("change",scenario);
  for(const input of Object.values(controls))input.addEventListener("input",draw);
  byId("energia-form").addEventListener("submit",event=>event.preventDefault());
  scenario();
}catch{
  update("input-status","The scenario assumptions are unavailable or invalid. Live controls stay disabled.");
}
try{
  archive=await fetchJSON("./data/energia-scenario.json");
  if(archive.schemaVersion!=="energia-v1"||archive.config.id!=="energia-scenario-001")throw new Error("Unregistered archive.");
  showEvidence();
  update("status",archive.config.id+" · six deterministic ledgers · illustrative finance assumptions");
}catch{
  update("status","The registered results archive is unavailable. The live workbench has separate status.");
}
