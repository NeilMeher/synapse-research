import {aggregateEconomy,computeDemand,demandForGroup,prepareEconomy} from "./engine/artha.mjs";
import {byId} from "./view.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const year=byId("artha-year"), detail=byId("artha-detail"), sector=byId("artha-sector");
const amount=byId("artha-amount"), buyer=byId("artha-buyer");
const fmt=new Intl.NumberFormat("en",{maximumFractionDigits:2});
const usd=value=>"$"+fmt.format(value)+"m";
const labels={construction:"Construction",equipment:"Electrical and optical equipment",communications:"Post and telecommunications"};
const models=new Map();
let model;

async function json(path){
  const response=await fetch(path);
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}
function options(select,industries,fallback){
  const prior=select.value;
  select.replaceChildren(...industries.map(({code,name})=>new Option(name,code)));
  select.value=industries.some(({code})=>code===prior)?prior:fallback;
}
function update(){
  if(!amount.validity.valid||!Number.isFinite(amount.valueAsNumber)){
    for(const id of ["output","value","imports","rounds"])byId("artha-"+id).textContent="—";
    byId("artha-rows").replaceChildren();
    byId("artha-status").textContent="Enter a whole amount from 0 to 10,000 million USD.";
    return;
  }
  const result=computeDemand(model,demandForGroup(model.data,[sector.value],amount.valueAsNumber));
  for(const [id,key] of [["output","output"],["value","valueAdded"],["imports","importedInputs"],["rounds","indirect"]]){
    byId("artha-"+id).textContent=usd(result.totals[key]);
  }
  const ranked=model.data.industries.map(({name},i)=>({name,i}));
  ranked.sort((a,b)=>result.output[b.i]-result.output[a.i]);
  byId("artha-rows").replaceChildren(...ranked.map(({name,i})=>row(name,...[
    "direct","firstRound","otherRounds","output","valueAdded","importedInputs"
  ].map(key=>fmt.format(result[key][i])))));
  byId("artha-status").textContent=year.value+" national panel · "+model.data.industries.length+
    " industries · current USD millions · conditional scenario";
}
function flows(){
  const j=model.data.industries.findIndex(({code})=>code===buyer.value);
  const suppliers=model.data.industries.map(({name},i)=>({name,flow:model.data.transactions[i][j],coefficient:model.A[i][j]}));
  suppliers.sort((a,b)=>b.coefficient-a.coefficient);
  byId("artha-flow-summary").textContent="Read down the column for "+model.data.industries[j].name+
    ". Imported intermediates account for "+(100*model.directImports[j]).toFixed(2)+" cents per dollar of its gross output.";
  byId("artha-flows").replaceChildren(...suppliers.map(({name,flow,coefficient})=>{
    const line=row(name,fmt.format(flow),coefficient.toFixed(5)+" ");
    const meter=document.createElement("meter");
    meter.className="scenario-heat";
    meter.min=0;
    meter.max=1;
    meter.value=coefficient;
    meter.setAttribute("aria-label",name+" domestic input per dollar");
    line.lastElementChild.append(meter);
    return line;
  }));
}
function choose(){
  model=models.get(year.value+" "+detail.value);
  const defaultCode=detail.value==="source"?"c18":"construction";
  options(sector,model.data.industries,defaultCode);
  options(buyer,model.data.industries,defaultCode);
  const p=model.data.published;
  byId("artha-source-summary").textContent=year.value+" source total domestic output was "+usd(p.domesticOutput)+
    ". The maximum workbook reconciliation difference was "+p.maximumExtractionResidual.toExponential(2)+
    " million USD. The current "+model.data.industries.length+"-industry system's productivity bound is "+
    model.diagnostics.spectralUpper.toFixed(4)+".";
  update();
  flows();
}
try{
  const [data,groups]=await Promise.all([json("./data/processed/artha-india.json"),json("./data/processed/artha-groups.json")]);
  if(data.source.id!=="adb-ind-national-2025")throw new Error("Unregistered national data.");
  for(const [name,panel] of Object.entries(data.panels)){
    models.set(name+" source",prepareEconomy(panel));
    models.set(name+" aggregated",prepareEconomy(aggregateEconomy(panel,groups)));
  }
  for(const control of [year,detail,sector,amount,buyer])control.disabled=false;
  year.addEventListener("change",choose);
  detail.addEventListener("change",choose);
  sector.addEventListener("change",update);
  amount.addEventListener("input",update);
  buyer.addEventListener("change",flows);
  choose();
}catch{
  byId("artha-status").textContent="The national source tables are unavailable or failed accounting checks. The live calculation is disabled.";
}
try{
  const archive=await json("./data/artha-scenario.json");
  if(archive.schemaVersion!=="artha-v1"||archive.config.id!=="artha-scenario-001")throw new Error("Unregistered archive.");
  byId("artha-archive-status").textContent=archive.config.id+" · 12 deterministic comparisons";
  byId("artha-archive").replaceChildren(...archive.panels.flatMap(p=>p.comparisons.flatMap(c=>c.scenarios.map(s=>
    row(p.year+" · "+c.industryCount+" industries",labels[s.id],...[s.totals.output,s.totals.valueAdded,s.totals.importedInputs].map(usd))))));
}catch{
  byId("artha-archive-status").textContent="The registered results archive is unavailable. Source-based calculations have their own status above.";
}
