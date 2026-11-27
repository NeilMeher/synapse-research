import {byId,canvasContext,circle,line,node,palette,pct} from "./view.mjs";
import {row,printed} from "./study-view.mjs";
import {seeded} from "./engine/echo.mjs";
import {gaussianP,nullFamilyRisk,policies,summarizeProgramme} from "./engine/scientia.mjs";

const form=byId("scientia-controls");
const policyMenu=byId("scientia-policy");
const menu=byId("scientia-case");
const numberFields=["hypotheses","signals","n","alpha","effect","rho"];
const newSeed=seeded(42939);
let archive, current, design;

function option(menu,value,label){
  const opt=node("option",label);
  opt.value=value;
  menu.append(opt);
}

function draw(){
  const surface=canvasContext(byId("scientia-curve"));
  if(!surface||!design)return;
  const {context,width,height}=surface;
  const sx=m=>44+(width-60)*m/60;
  const sy=value=>height-45-value*(height-64);
  context.strokeStyle=palette("line");
  context.fillStyle=palette("dim");
  context.font="11px sans-serif";
  for(let i=0;i<=4;i++){
    const p=i/4;
    line(context,sx(0),sy(p),sx(60),sy(p));
    context.fillText(Math.round(100*p)+"%",5,sy(p)+3);
  }
  for(let m=0;m<=60;m+=10)context.fillText(String(m),sx(m)-4,height-23);
  context.fillText("Number of independent tests",44,height-5);
  context.strokeStyle=palette("positive");
  context.lineWidth=2;
  for(let m=1;m<=60;m++)line(context,sx(m-1),sy(nullFamilyRisk(m-1,design.alpha)),sx(m),sy(nullFamilyRisk(m,design.alpha)));
  const matched=archive?.cells.find(cell=>cell.reference&&cell.design.alpha===design.alpha);
  if(matched){
    context.fillStyle=palette("science");
    circle(context,sx(matched.design.hypotheses),sy(matched.policies.unadjusted.fwer.estimate),5,true);
  }
}

function present(){
  const {data,claims,scores}=current;
  const policy=policyMenu.value;
  const selected=new Set(claims[policy].indices), screened=new Set(claims[policy].screened??[]);
  const result=scores[policy];
  byId("scientia-budget").textContent=
    design.hypotheses*design.n+" observations per programme · two blocks of "+design.n/2+" per hypothesis"+
    (design.rho>0?" · correlated tests":" · independent tests");
  byId("scientia-score").textContent=policies[policy]+": "+result.reportCount+" reports, FDP "+pct(result.fdp)+
    (result.power===null?" · no planted effects":" · power in this programme "+pct(result.power));
  byId("scientia-exact").textContent=design.hypotheses+" independent all-null tests at "+pct(design.alpha)+
    " have exact family risk "+(100*nullFamilyRisk(design.hypotheses,design.alpha)).toFixed(2)+"%"+".";
  byId("scientia-trace").replaceChildren(...data.truth.map((truth,i)=>row("H"+(i+1),printed(truth,2),
    printed(gaussianP(data.full[i]),4),printed(gaussianP(data.first[i]),4),printed(gaussianP(data.second[i]),4),
    selected.has(i)?"Reported":screened.has(i)?"Screened; did not validate":"Unreported")));
  draw();
}

function publishCondition(){
  const selected=archive.cells[Number(menu.value)];
  const rate=value=>value?pct(value.estimate):"—";
  byId("scientia-study").replaceChildren(...Object.entries(selected.policies).map(([id,result])=>row(policies[id],
    rate(result.fwer), rate(result.fdp), rate(result.power), printed(result.reportedBias?.estimate),
    rate(result.reportedCoverage), rate(result.replication))));
  byId("scientia-bars").replaceChildren(...Object.entries(selected.policies).map(([id,result])=>{
    const visual=row(policies[id],rate(result.fdp),rate(result.power));
    [result.fdp,result.power].forEach((metric,i)=>{
      if(!metric)return;
      const meter=node("meter");
      meter.min=0;
      meter.max=1;
      meter.value=metric.estimate;
      meter.setAttribute("aria-hidden","true");
      visual.cells[i+1].append(" ",meter);
    });
    return visual;
  }));
  const c=selected.contrast;
  const points=value=>(100*value).toFixed(2)+" pp";
  byId("scientia-contrast").textContent=c.metric+" · "+points(c.estimate)+" · interval "+c.interval.map(points).join(" to ");
}

function replay(){
  const selected=archive.cells[Number(menu.value)];
  design=selected.design;
  current=selected.replay;
  form.elements.namedItem("signals").max=design.hypotheses;
  for(const name of numberFields)form.elements.namedItem(name).value=design[name];
  present();
}

function sample(){
  const config=Object.fromEntries(numberFields.map(name=>[name,form.elements.namedItem(name).valueAsNumber]));
  current=summarizeProgramme(config,seeded(1+Math.floor(newSeed()*4294967295)));
  design=config;
  present();
}

for(const [id,name] of Object.entries(policies))option(policyMenu,id,name);
policyMenu.value="holm";
form.addEventListener("submit",event=>{event.preventDefault();sample();});
form.elements.namedItem("hypotheses").addEventListener("input",event=>{
  const count=event.target.valueAsNumber;
  const signals=form.elements.namedItem("signals");
  signals.max=String(count);
  if(signals.valueAsNumber>count)signals.value=count;
});
policyMenu.addEventListener("change",present);
new ResizeObserver(draw).observe(byId("scientia-curve"));
sample();

try {
  const response=await fetch("./data/scientia-confirmatory.json");
  if(!response.ok)throw Error("Archive HTTP "+response.status);
  const result=await response.json();
  if(result.schemaVersion!=="scientia-v1"||result.config.id!=="scientia-confirmatory-001")throw Error("Invalid archive");
  archive=result;
  byId("scientia-status").textContent=archive.config.id+" · "+archive.config.trials.toLocaleString()+" programmes per design";
  archive.cells.forEach(({design:d},i)=>option(menu,i,d.id+" · "+d.hypotheses+" hypotheses, n="+d.n));
  menu.addEventListener("change",publishCondition);
  byId("scientia-replay").addEventListener("click",replay);
  publishCondition();
  draw();
} catch (error){
  byId("scientia-status").textContent="Archived study unavailable. The synthetic simulator is available.";
  menu.disabled=true;
  byId("scientia-replay").disabled=true;
}
