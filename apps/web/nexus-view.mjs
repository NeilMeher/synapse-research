import {prepareEconomy} from "./engine/artha.mjs";
import {withSettings} from "./engine/energia.mjs";
import {integrateInfrastructure} from "./engine/nexus.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";
import {byId} from "./view.mjs";

setupTheme();
const choice=byId("nexus-design"),grade=byId("nexus-local"),buyer=byId("nexus-buyer");
const money=new Intl.NumberFormat("en",{style:"currency",currency:"USD",maximumFractionDigits:0});
const measure=new Intl.NumberFormat("en",{maximumFractionDigits:2});
const dollars=x=>money.format(x), show=x=>measure.format(x);
const capexLabels={civil:"Civil",electrical:"Electrical plant",cooling:"Cooling plant",gpu:"Accelerator package",network:"Network equipment",professional:"Engineering services"};
const title=x=>x.design==="efficient"?"Lower PUE / water":"Baseline efficiency";
const set=(id,value)=>{byId("nexus-"+id).textContent=value;};
const drawTable=(id,lines)=>byId("nexus-"+id).replaceChildren(...lines.map(line=>row(...line)));
let model, mapping, design, infra, active, names;
async function load(path){
  const r=await fetch(path);
  if(!r.ok)throw new Error("HTTP "+r.status);
  return r.json();
}
function renderLinks(){
  const first=active.supplierLinks.filter(link=>link.buyer===buyer.value).slice(0,8);
  byId("nexus-links").replaceChildren(...first.map(link=>{
    const line=row(names[link.supplier],names[link.buyer],dollars(link.value*1e6)+" ");
    const scale=document.createElement("meter");
    scale.className="scenario-heat";
    scale.min=0;scale.max=first[0].value;scale.value=link.value;
    scale.setAttribute("aria-label","Relative first-round supply from "+names[link.supplier]);
    line.lastElementChild.append(scale);
    return line;
  }));
}
function draw(){
  const fraction=grade.valueAsNumber/100;
  active=integrateInfrastructure(withSettings(infra.base,design.designs[choice.value]),model,mapping,fraction);
  const {finance:f,physical:p,procurement:c,economic:{totals:e}}=active;
  set("capacity",p.gpus+" GPUs");
  set("capex",dollars(f.capex));
  set("domestic",dollars(c.domestic));
  set("output",dollars(e.output*1e6));
  set("local-label",grade.value+"% along the range");
  set("live-status","PUE "+p.pue+" · site WUE "+p.siteWue+" L/kWh IT · 2024 demand model.");
  drawTable("operating",[["Annual facility energy",show(p.energyKWh/1000)+" MWh"],["Annual site water",show(p.waterM3)+" m³"],
    ["Design demand",show(p.peakKVA)+" kVA"],["Annual billable GPU-hours",show(p.contractBillableHours)],["Annual simplified electricity bill",dollars(p.electricity)],
    ["Year "+f.operatingYear+" OpEx",dollars(f.operatingCosts)],["Year "+f.operatingYear+" revenue",dollars(f.revenue)],
    ["Project NPV",dollars(f.projectNPV)],["Scheduled equity NPV",dollars(f.equityNPV)]]);
  drawTable("effects",[["Direct domestic capital demand",dollars(e.direct*1e6)],["First domestic production round",dollars(e.firstRound*1e6)],
    ["Further domestic rounds",dollars(e.otherRounds*1e6)],["Value added",dollars(e.valueAdded*1e6)],
    ["Imported intermediate inputs",dollars(e.importedInputs*1e6)],["Direct foreign procurement",dollars(c.directImports)]]);
  drawTable("procurement",c.lines.map(line=>[capexLabels[line.capitalKey],line.industry?line.industry+" · "+names[line.industry]:"Direct foreign procurement",
    show(line.share*100)+"%",dollars(line.domestic),dollars(line.imported),line.justification]));
  const industries=model.data.industries.filter((_,i)=>c.demand[i]>0);
  const selected=buyer.value;
  buyer.replaceChildren(...industries.map(({name,code})=>new Option(name,code)));
  if(industries.some(({code})=>code===selected))buyer.value=selected;
  renderLinks();
}
try{
  const [tables,map,protocol,energy]=await Promise.all([load("./data/processed/artha-india.json"),load("./data/processed/nexus-capital-map.json"),
    load("./experiments/nexus-scenario.json"),load("./experiments/energia-scenario.json")]);
  if(protocol.mappingId!==map.id||protocol.energyInputId!==energy.id||protocol.year!==map.year)throw new Error("Mismatched source revisions");
  model=prepareEconomy(tables.panels[String(protocol.year)]);
  mapping=map;design=protocol;infra=energy;
  names=Object.fromEntries(model.data.industries.map(({code,name})=>[code,name]));
  draw();
  for(const control of [choice,grade,buyer])control.disabled=false;
  choice.addEventListener("change",draw);
  grade.addEventListener("input",draw);
  buyer.addEventListener("change",renderLinks);
}catch{
  set("live-status","The linked source data are unavailable or fail validation. Live analysis stays disabled.");
}
try{
  const data=await load("./data/nexus-scenario.json");
  if(data.schemaVersion!=="nexus-v1"||data.config.id!=="nexus-scenario-001")throw new Error("Unregistered archive");
  drawTable("archive",data.cases.map(c=>[title(c)+" · "+(c.profile?"higher":"lower")+" domestic",show(c.physical.energyKWh/1000),
    show(c.physical.waterM3),dollars(c.finance.projectNPV),dollars(c.procurement.directImports),
    dollars(c.economic.totals.output*1e6),dollars(c.economic.totals.valueAdded*1e6)]));
  set("status",data.config.id+" · four matched deterministic scenarios");
}catch{
  set("status","The registered results archive is unavailable. Live analysis has separate status.");
}
