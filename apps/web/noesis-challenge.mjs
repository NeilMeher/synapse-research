import { seeded } from "./engine/echo.mjs";
import { FAMILIES, GRID_POINTS, evaluateBasis, evaluateEnsemble, predict } from "./engine/discovery.mjs";
import { sampleStandardNormal } from "./engine/noesis.mjs";
import { byId, canvasContext, circle, line, node, palette, pct } from "./view.mjs";

const budget = 8;
const noise = 0.2;
const labels = {poly:"Polynomial", harm:"Harmonic", exp:"Exponential decay", rat:"Rational"};
const colors = ["science", "positive", "economy", "cognition"];
const axis = Array.from({length:81}, (_, i) => -2+i/20);
const measure = byId("noesis-measure");
const reveal = byId("noesis-challenge-reveal");
const locationMenu = byId("noesis-location");
const seedInput = byId("noesis-seed");
const canvas = byId("noesis-challenge-curve");

let random, family, coefficients, observations, state, revealed;

const truthAt = x => evaluateBasis(family, x).reduce((sum, value, i) => sum+value*coefficients[i], 0);

function draw() {
  const surface = canvasContext(canvas);
  if (!surface || !state) return;
  const {context, width, height} = surface;
  const curves = state.fitted.map(model => axis.map(x => predict(model, x).mean));
  if (revealed) curves.push(axis.map(truthAt));
  const values = [0, ...curves.flat(), ...observations.map(row=>row.y)];
  const low = Math.min(...values)-0.5;
  const high = Math.max(...values)+0.5;
  const sx = x => 25+(width-45)*(x+2)/4;
  const sy = y => height-28-(height-47)*(y-low)/(high-low);
  context.strokeStyle = palette("line");
  line(context,sx(-2),sy(0),sx(2),sy(0));
  line(context,sx(0),sy(low),sx(0),sy(high));
  context.font="11px sans-serif";
  context.fillStyle=palette("dim");
  for (const x of [-2,-1,0,1,2]) context.fillText(String(x),sx(x)-4,height-6);
  for (const [i, curve] of curves.entries()) {
    context.strokeStyle = palette(colors[i]??"text");
    context.lineWidth = i===curves.length-1&&revealed ? 2.5 : 1.6;
    context.setLineDash(i===curves.length-1&&revealed ? [5,3] : []);
    for (let j=1;j<curve.length;j++) line(context,sx(axis[j-1]),sy(curve[j-1]),sx(axis[j]),sy(curve[j]));
  }
  context.setLineDash([]);
  context.fillStyle=palette("text");
  for (const {x,y} of observations) circle(context,sx(x),sy(y),3,true);
}

function render() {
  state=evaluateEnsemble(observations,1,1/noise**2);
  const used=observations.length;
  byId("noesis-challenge-status").textContent=used+" of "+budget+" measurements used";
  measure.disabled=used===budget||revealed;
  const posterior=byId("noesis-challenge-posterior");
  posterior.replaceChildren(...FAMILIES.map((key,i)=>{
    const item=node("li",labels[key]+" "+pct(state.posteriors[i]));
    const swatch=node("i");
    swatch.setAttribute("aria-hidden","true");
    swatch.style.backgroundColor="var(--"+colors[i]+")";
    item.prepend(swatch);
    return item;
  }));
  const rows=byId("noesis-challenge-observations");
  rows.replaceChildren(...observations.map(({x,y},i)=>{
    const row=node("tr");
    for(const value of [i+1,x.toFixed(1),y.toFixed(3)])row.append(node("td",String(value)));
    return row;
  }));
  const outcome=byId("noesis-challenge-outcome");
  if (!revealed) outcome.textContent="";
  else {
    const fitted=state.fitted.find(model=>model.family===state.bestFamily);
    // Twenty midpoints of adjacent query-grid locations are never selectable.
    const errors=Array.from({length:20},(_,i)=>{
      const x=-1.9+i/5;
      return (truthAt(x)-predict(fitted,x).mean)**2;
    });
    const rmse=Math.sqrt(errors.reduce((sum,value)=>sum+value,0)/errors.length);
    outcome.textContent="Hidden family: "+labels[family]+". Leading model: "+labels[state.bestFamily]+
      ". Noiseless RMSE on 20 never-selectable midpoints: "+rmse.toFixed(4)+".";
  }
  draw();
}

function newWorld() {
  if (!seedInput.reportValidity()) return;
  random=seeded(seedInput.valueAsNumber);
  family=FAMILIES[Math.floor(random()*FAMILIES.length)];
  coefficients=Array.from({length:3},()=>sampleStandardNormal(random));
  observations=[];
  revealed=false;
  render();
}

for (const x of GRID_POINTS) {
  const option=node("option",x.toFixed(1));
  option.value=x;
  option.selected=x===0;
  locationMenu.append(option);
}
measure.addEventListener("click",()=>{
  if (observations.length===budget||revealed) return;
  const x=Number(locationMenu.value);
  observations.push({x,y:truthAt(x)+noise*sampleStandardNormal(random)});
  render();
});
reveal.addEventListener("click",()=>{revealed=true;render();});
byId("noesis-new-world").addEventListener("click",newWorld);
new ResizeObserver(draw).observe(canvas);
newWorld();
