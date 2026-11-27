import {agentsCount,createWorld,runWorld} from "./engine/civilizations.mjs";
import {byId,canvasContext,circle,line,node,palette,pct} from "./view.mjs";
import {printed,row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

const controls=byId("village-controls");
const menu=byId("village-climate");
const policy=byId("village-policy");
const day=byId("village-day");
const agent=byId("village-agent");
const clock=byId("village-play");
const motion=matchMedia("(prefers-reduced-motion: reduce)");
const name={autarky:"No exchange",unaware:"Fixed prior",local:"Own history",pooled:"Pooled history"};
const asset=["A","B"];
let archive, selected, interval, animation=0;
setupTheme(()=>draw(1));

for(let i=0;i<agentsCount;i++){
  const option=node("option","Agent "+(i+1));
  option.value=i;
  agent.append(option);
}
function frame(){
  return selected?.run.timeline[day.valueAsNumber-1];
}

function draw(progress){
  const current=frame();
  const setup=canvasContext(byId("village-map"));
  if(!current||!setup)return;
  const {context,width,height}=setup;
  const rx=Math.max(46,width/2-42), ry=Math.max(50,height/2-39);
  const places=current.population.map(({id})=>{
    const angle=id*Math.PI/4-Math.PI/2;
    return [width/2+rx*Math.cos(angle),height/2+ry*Math.sin(angle)];
  });
  context.strokeStyle=palette("line");
  context.lineWidth=1.4;
  for(let i=0;i<places.length;i++)line(context,...places[i],...places[(i+1)%places.length]);
  for(const flow of current.exchanges){
    const a=places[flow.payer], b=places[flow.supplier];
    context.lineWidth=2+flow.quantity;
    context.strokeStyle=palette(flow.status==="delivered"?"collective":flow.status==="defaulted"?"economy":"line");
    context.setLineDash(flow.status==="delivered"?[]:[4,5]);
    line(context,...a,...b);
    context.setLineDash([]);
    if(flow.status!=="rejected"){
      const interpolate=(from,to)=>from.map((value,index)=>value+(to[index]-value)*progress);
      context.fillStyle=palette("economy");
      circle(context,...interpolate(a,b),3,true);
      if(flow.status==="delivered"){
        context.fillStyle=palette("collective");
        circle(context,...interpolate(b,a),3,true);
      }
    }
  }
  context.textAlign="center";
  context.font="12px Segoe UI, sans-serif";
  for(const {id,stock} of current.population){
    const [x,y]=places[id];
    context.fillStyle=palette(id===Number(agent.value)?"science":"surface");
    circle(context,x,y,15,true);
    context.fillStyle=palette(id===Number(agent.value)?"bg":"text");
    context.fillText(String(id+1),x,y+4);
    stock.forEach((amount,r)=>{
      context.fillStyle=palette(r===0?"collective":"economy");
      context.fillRect(x-12,y+18+r*5,amount*2.4,3);
    });
  }
  context.fillStyle=palette("text");
  context.font="600 13px Segoe UI, sans-serif";
  context.fillText("Day "+current.day,width/2,height/2);
  context.font="12px Segoe UI, sans-serif";
  context.fillText(current.labor+" labor "+(current.labor===1?"hour":"hours")+" per agent",width/2,height/2+20);
}

function animate(){
  cancelAnimationFrame(animation);
  if(motion.matches){draw(1);return;}
  const start=performance.now();
  function step(now){
    const progress=Math.min(1,(now-start)/420);
    draw(progress);
    if(progress<1)animation=requestAnimationFrame(step);
  }
  animation=requestAnimationFrame(step);
}

function render(transition=false){
  const current=frame();
  if(!current)return;
  const id=Number(agent.value);
  const participant=current.population[id];
  const technology=selected.world.agents[id].technology;
  byId("village-day-label").textContent="Day "+current.day+" of "+selected.run.timeline.length;
  byId("village-detail").textContent="Agent "+(id+1)+" · productivity "+technology.join(" / ")+" units per hour · "+
    "produced "+participant.production.join(" / ")+" · consumed "+participant.consumed.join(" / ")+" · stored "+
    participant.stock.join(" / ")+". Delivery record "+participant.reputation.delivered+" of "+participant.reputation.attempts+".";
  const toDate=selected.run.timeline.slice(0,current.day);
  const cumul=(name,r)=>toDate.reduce((sum,d)=>sum+d.flows[name][r],0);
  byId("village-ledger").replaceChildren(...asset.map((label,r)=>row(label,...[
    selected.run.accounting.initial[r],cumul("produced",r),cumul("consumed",r),cumul("loss",r),current.accounting[r],
  ].map(String))));
  byId("village-events").replaceChildren(...(current.exchanges.length?current.exchanges.map(event=>row(
    (event.payer+1)+" → "+(event.supplier+1),event.quantity+" "+asset[event.give]+" for "+event.quantity+" "+asset[1-event.give],
    pct(event.belief),event.status)):[row("No fundable offers","—","—","—")]));
  if(transition)animate();else draw(1);
}

function renderEvidence(){
  if(!archive)return;
  const cell=archive.cells.find(value=>value.climate===menu.value);
  byId("village-contrast").textContent="Pooled minus fixed-prior need satisfaction · "+
    (100*cell.contrast.estimate).toFixed(2)+" pp · 95% interval "+
    cell.contrast.interval.map(value=>(100*value).toFixed(2)).join(" to ")+" pp";
  const formatted=value=>value?pct(value.estimate):"—";
  byId("village-outcomes").replaceChildren(...Object.entries(cell.summaries).map(([id,s])=>
    row(name[id],formatted(s.needsSatisfied),printed(s.attempts.estimate,1),printed(s.deliveries.estimate,1),
      printed(s.lowestConsumption.estimate,1),printed(s.giniConsumed.estimate,3),formatted(s.shockSatisfaction))));
}

function pause(){
  clearInterval(interval);interval=null;
  clock.setAttribute("aria-pressed","false");
  clock.textContent="Play";
}

function load(mode){
  pause();
  if(mode==="archive"){
    const replay=archive?.cells.find(cell=>cell.climate===menu.value)?.first;
    if(!replay)return;
    selected={mode,world:replay.world,run:replay.arms[policy.value]};
  }else{
    const world=createWorld(byId("village-seed").valueAsNumber,menu.value,24);
    selected={mode,world,run:runWorld(world,policy.value,true)};
  }
  byId("village-mode").textContent=(mode==="archive"?"Registered first-world replay":"Live sandbox, recomputed in this browser")+
    " · seed "+selected.world.seed+" · "+name[policy.value]+".";
  day.max=selected.run.timeline.length;
  day.value=1;
  render();
  renderEvidence();
}

function advance(){
  if(!selected)return;
  if(day.valueAsNumber<Number(day.max)){
    day.value=day.valueAsNumber+1;
    render(true);
  }else pause();
}

controls.addEventListener("submit",event=>{event.preventDefault();load("sandbox");});
for(const control of [menu,policy])control.addEventListener("input",()=>{
  if(!selected||!controls.reportValidity())return;
  load(selected.mode);
});
byId("village-archive").addEventListener("click",()=>load("archive"));
byId("village-reset").addEventListener("click",()=>{pause();day.value=1;render();});
byId("village-step").addEventListener("click",()=>{pause();advance();});
clock.addEventListener("click",()=>{
  if(interval){pause();return;}
  if(!selected)return;
  if(day.valueAsNumber===Number(day.max)){day.value=1;render();}
  clock.textContent="Pause";
  clock.setAttribute("aria-pressed","true");
  interval=setInterval(advance,720);
});
day.addEventListener("input",()=>{pause();render(true);});
agent.addEventListener("input",()=>render());
new ResizeObserver(()=>draw(1)).observe(byId("village-map"));
load("sandbox");

try{
  const response=await fetch("./data/civilizations-confirmatory.json");
  if(!response.ok)throw Error("Archive unavailable");
  const data=await response.json();
  if(data.schemaVersion!=="civilizations-v1"||data.config.id!=="civilizations-confirmatory-001")throw Error("Incorrect archive");
  archive=data;
  byId("civilizations-status").textContent=data.config.id+" · "+data.config.trials+" paired worlds per scarcity regime";
  load("archive");
}catch{
  byId("civilizations-status").textContent="Archive unavailable. The live sandbox is ready.";
  byId("village-archive").disabled=true;
}
