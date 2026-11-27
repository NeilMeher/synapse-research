import {annualMetrics,describeSeries,slowerShare,spanSummary,syntheticDifferences} from "./engine/chronos.mjs";
import {byId} from "./view.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const element=id=>byId("chronos-"+id);
const metric=element("metric"),mode=element("mode"),windowSelect=element("window");
const scenario=element("factor"),sourceYear=element("source-year"),region=element("region-year"),eventWindow=element("event-window");
const fmt=new Intl.NumberFormat("en",{maximumFractionDigits:2});
const num=x=>x===null?"Unavailable":fmt.format(x);
const canvas=element("chart");
let chartRows=[],active=[],dataset,provenance;
async function read(path){
  const res=await fetch(path);
  if(!res.ok)throw new Error("Source unavailable.");
  return res.json();
}
function state(id,message){element(id).textContent=message;}
function list(id,children){element(id).replaceChildren(...children);}
const opt=(label,value)=>new Option(label,String(value));
const minima={all:0,modern:2016,recent:2021};
function refresh(){
  const kind=metric.value, column=mode.value;
  const label=annualMetrics[kind];
  const rows=describeSeries(dataset.national,kind,2016).filter(r=>r.period.endYear>=minima[windowSelect.value]);
  const yearRange=rows.at(0).period.label+" to "+rows.at(-1).period.label;
  const measurement={value:label.unit,growth:"%",index:"2015–16 = 100"}[column];
  state("caption",label.name+" · "+measurement+" · "+yearRange);
  state("unit",label.unit);
  const summary=spanSummary(rows,rows.at(0).period.endYear,rows.at(-1).period.endYear);
  state("span",summary?"Endpoint change "+num(summary.growth)+"% over "+summary.years+" years. CAGR "+num(summary.cagr)+"%.":"Comparable endpoints unavailable.");
  list("national",rows.map(({period,value,growth,index})=>row(period.label,num(value),growth===null?"—":num(growth)+"%",num(index))));
  chartRows=rows.map(r=>({year:r.period.endYear,y:r[column]}));
  active=chartRows.filter(r=>r.y!==null);
  paint();
}
function paint(){
  const box=canvas.getBoundingClientRect();
  const ctx=canvas.getContext("2d");
  if(!ctx||box.width<120||!active.length)return;
  const {width,height}=box,device=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*device);
  canvas.height=Math.round(height*device);
  ctx.scale(device,device);
  const theme=getComputedStyle(canvas);
  const pad={left:54,right:12,top:12,bottom:30};
  const first=chartRows[0].year,last=chartRows.at(-1).year;
  const hi=Math.max(...active.map(r=>r.y)),lo=Math.min(0,...active.map(r=>r.y));
  const ceil=hi===lo?hi+1:hi;
  const x=year=>pad.left+(year-first)/(last-first||1)*(width-pad.left-pad.right);
  const y=value=>height-pad.bottom-(value-lo)/(ceil-lo)*(height-pad.top-pad.bottom);
  ctx.font="12px system-ui";
  ctx.fillStyle=theme.color;
  ctx.strokeStyle=theme.getPropertyValue("--line").trim()||"#677485";
  for(let i=0;i<=4;i++){
    const v=lo+(ceil-lo)*i/4;
    ctx.beginPath();ctx.moveTo(pad.left,y(v));ctx.lineTo(width-pad.right,y(v));ctx.stroke();
    ctx.fillText(num(v),0,y(v)+3,pad.left-4);
  }
  ctx.fillText(String(first),x(first),height-8);
  ctx.fillText(String(last),x(last)-29,height-8);
  ctx.lineWidth=2;
  ctx.strokeStyle=theme.getPropertyValue("--accent").trim()||"#5eb3bb";
  ctx.fillStyle=ctx.strokeStyle;
  let previous;
  for(const item of active){
    if(previous&&item.year-previous.year===1){
      ctx.beginPath();ctx.moveTo(x(previous.year),y(previous.y));ctx.lineTo(x(item.year),y(item.y));ctx.stroke();
    }
    ctx.beginPath();ctx.arc(x(item.year),y(item.y),3.4,0,Math.PI*2);ctx.fill();
    previous=item;
  }
}
function inspect(){
  const selected=dataset.national.find(r=>r.period.endYear===Number(sourceYear.value));
  const from=provenance.sources.find(s=>s.id===selected.cells.route.source);
  list("locators",Object.entries(selected.cells).map(([key,cell])=>{
    const li=document.createElement("li"),a=document.createElement("a");
    a.href=from.officialUrl+"#page=1";
    a.textContent=cell.locator;
    li.append(annualMetrics[key].name+" · "+num(cell.value)+" "+annualMetrics[key].unit+" · ",a);
    return li;
  }));
}
function regional(){
  list("region-rows",dataset.regions.filter(r=>r.year===Number(region.value)).map(r=>row(r.name,num(r.value),r.value===null?r.status:r.boundary)));
}
function historicalWhatIf(){
  const value=Number(scenario.value)/100;
  const archive=describeSeries(dataset.national,"share",2016).filter(r=>r.period.endYear>=2016);
  const last=slowerShare(archive,value).at(-1);
  state("conditional",last.period.label+" · observed "+num(last.observed)+"% · conditional at "+scenario.value+"% of observed change "+num(last.scenario)+"%.");
}
const settings={"different-trends":{trendGap:3},anticipation:{anticipation:2},spillover:{spillover:2},heterogeneous:{heterogeneity:3}};
function teach(){
  const out=syntheticDifferences(settings[element("synthetic").value]);
  state("teaching","Known ATT "+out.truth+" · before–after "+out.beforeAfter+" · post-only "+out.crossSection+
    " · differences-in-differences "+out.did+" · bias "+out.bias+".");
}
element("synthetic").addEventListener("change",teach);
teach();
try{
  const [data,notes]=await Promise.all([read("./data/processed/chronos-rail.json"),read("./sources/chronos-rail.json")]);
  if(data.schemaVersion!=="chronos-rail-v1"||data.sourceId!==notes.id)throw new Error("Different source revisions.");
  dataset=data;provenance=notes;
  metric.replaceChildren(...Object.entries(annualMetrics).map(([key,value])=>opt(value.name,key)));
  metric.value="share";
  sourceYear.replaceChildren(...dataset.national.map(r=>opt(r.period.label,r.period.endYear)));
  sourceYear.value="2025";
  region.replaceChildren(...Array.from(new Set(dataset.regions.map(r=>r.year))).map(year=>opt(year,year)));
  region.value="2024";
  for(const control of [element("series-controls"),sourceYear,region,scenario])control.disabled=false;
  for(const control of [metric,mode,windowSelect])control.addEventListener("change",refresh);
  sourceYear.addEventListener("change",inspect);
  region.addEventListener("change",regional);
  scenario.addEventListener("input",historicalWhatIf);
  new ResizeObserver(paint).observe(canvas);
  byId("theme").addEventListener("click",paint);
  refresh();inspect();regional();historicalWhatIf();
  state("data-status","17 national reporting periods and seven selected state series. Route values are March stocks and freight values are fiscal-year flows.");
}catch{
  state("data-status","Historical source files are unavailable or failed validation. Live data controls stay disabled.");
}
try{
  const events=await read("./data/chronos/timeline.json");
  function timeline(){
    const mode=eventWindow.value;
    list("events",events.filter(e=>mode==="all"||mode==="early"&&e.date<"2000"||mode==="corridor"&&e.date>="2019").map(e=>{
      const li=document.createElement("li"),time=document.createElement("time"),link=document.createElement("a"),note=document.createElement("small");
      time.dateTime=e.date;time.textContent=e.date+" · "+e.type;link.href=e.source;link.textContent=e.title;note.textContent=e.description;
      li.append(time,link,note);return li;
    }));
  }
  eventWindow.disabled=false;
  eventWindow.addEventListener("change",timeline);
  timeline();
}catch{
  state("events","The timeline source is unavailable.");
}
try{
  const archive=await read("./data/chronos-scenario.json");
  if(archive.schemaVersion!=="chronos-v1"||archive.config.id!=="chronos-scenario-001")throw new Error("Wrong run.");
  const a=archive.association;
  state("association","The registered annual-growth association uses "+a.n+" matched years and has Pearson r = "+num(a.pearson)+". It describes a short national sequence without a significance test.");
  state("status",archive.config.id+" · official statistical description · separate synthetic teaching examples");
}catch{
  state("status","The registered run archive is unavailable. The historical source and teaching controls have separate status.");
}
