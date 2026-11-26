import {countDistribution, exchangeableBounds, hubAccuracy, hubInfluence, laws, sampleReports,
  scoreForecasts, summarizeCount, verificationUtility} from "./engine/dependence.mjs";
import {influence, initialBeliefs, seeded, step} from "./engine/echo.mjs";
import {byId, canvasContext, line, node, palette, pct, download} from "./view.mjs";

const lawNames = {shared:"Shared-source mixture", beta:"Beta-binomial"};
const colors = {shared:"positive", beta:"science"};
const fields = ["agents","reliability","rho","hub","rounds","budget","verifier","cost","seed"];
const pp = number => (number*100).toFixed(2) + " pp";
const ratio = (value, digits=3) => value == null ? "Unavailable" : value.toFixed(digits);
const mean = list => list.reduce((a,b) => a+b,0) / list.length;

function drawCounts(canvas, models) {
  const surface = canvasContext(canvas);
  if (!surface || !models.length) return;
  const {context,width,height} = surface;
  const n = models[0].mass.length - 1;
  const left = 45, top = 24, bottom = height - 42, usable = width - left - 10;
  const slot = usable / (n+1);
  const max = Math.ceil(Math.max(...models.flatMap(model => model.mass)) * 10) / 10;
  context.strokeStyle = palette("line");
  context.fillStyle = palette("dim");
  context.font = "11px 'Segoe UI'";
  context.textAlign = "right";
  for (let tick=0;tick<=4;tick++) {
    const y=bottom-(bottom-top)*tick/4;
    line(context,left,y,width-10,y);
    context.fillText(pct(max*tick/4),left-5,y+3);
  }
  context.textAlign = "left";
  context.fillText("Probability",left,13);
  context.textAlign = "center";
  const skip = n > 16 ? Math.ceil(n/8) : width < 450 ? 3 : 1;
  for (let k=0;k<=n;k++) {
    const x=left+k*slot;
    if (k%skip===0 || k===n) context.fillText(k,x+slot/2,bottom+15);
    for (const [i,model] of models.entries()) {
      const h=model.mass[k]/max*(bottom-top);
      context.fillStyle=palette(colors[model.law]);
      context.fillRect(x+slot*(.12+.38*i),bottom-h,slot*.34,h);
    }
    context.fillStyle = palette("dim");
  }
  context.fillText("K · number of correct reports",left+usable/2,height-7);
}

function drawStudy(canvas, conditions) {
  const surface = canvasContext(canvas);
  if (!surface || !conditions.length) return;
  const {context,width,height}=surface;
  const left=52, top=17, right=width-16, bottom=height-46;
  const point=(x,y)=>[left+x*(right-left),bottom-y*(bottom-top)];
  context.fillStyle=palette("dim");
  context.strokeStyle=palette("line");
  context.font="11px 'Segoe UI'";
  context.textAlign="right";
  for (let i=0;i<=4;i++) {
    const [,y]=point(0,i/4);
    line(context,left,y,right,y);
    context.fillText(pct(i/4),left-5,y+3);
  }
  context.textAlign="center";
  for (const rho of [0,.25,.5,.75,1]) {
    const [x]=point(rho,0);
    context.fillText(rho.toFixed(2),x,bottom+15);
  }
  context.fillText("Shared-error correlation (ρ)",(left+right)/2,height-7);
  context.beginPath();
  const topEdge=conditions.map(row=>point(row.correlation,row.bounds.upper.accuracy));
  const lowEdge=conditions.toReversed().map(row=>point(row.correlation,row.bounds.lower.accuracy));
  context.moveTo(...topEdge[0]);
  for (const [x,y] of [...topEdge.slice(1),...lowEdge]) context.lineTo(x,y);
  context.closePath();
  context.fillStyle=palette("line");
  context.globalAlpha=.66;
  context.fill();
  context.globalAlpha=1;
  for (const [i,law] of laws.entries()) {
    const values=conditions.map(row=>point(row.correlation,row.models[i].exact.majority));
    context.strokeStyle=palette(colors[law]);
    context.fillStyle=context.strokeStyle;
    context.lineWidth=2;
    context.setLineDash(i?[5,4]:[]);
    for (let j=1;j<values.length;j++) line(context,...values[j-1],...values[j]);
    context.setLineDash([]);
    for (const [x,y] of values) context.fillRect(x-2.5,y-2.5,5,5);
  }
}

function row(...values) {
  const tr = node("tr");
  const header = node("th",values[0]);
  header.scope = "row";
  tr.append(header,...values.slice(1).map(value => node("td",value)));
  return tr;
}

const averageScore = (reports, matrix, rounds, method, radius) => {
  let state = reports;
  const frames = [state];
  for (let i=0;i<rounds;i++) {
    state=step(state,matrix,method,radius);
    frames.push(state);
  }
  return frames;
};

export function setupRobustness() {
  const form = byId("robust-form");
  const canvas = byId("robust-counts");
  let current;
  let artifact;
  const studyCanvas=byId("robust-curve");
  let activeRound=0;

  function draw() {
    if (current) drawCounts(canvas,current.models);
    if (artifact) drawStudy(studyCanvas,artifact.conditions);
  }
  const observer=new ResizeObserver(draw);
  observer.observe(canvas);
  observer.observe(studyCanvas);

  function renderReplay() {
    const {models,truth,matrix,rounds} = current;
    byId("robust-step").max=rounds;
    byId("robust-step").value=activeRound;
    byId("robust-round").value=String(activeRound);
    byId("robust-truth").textContent="Generated truth " + truth + " · Replay at round " + activeRound;
    byId("robust-step").setAttribute("aria-valuetext","Round " + activeRound + " of " + rounds);
    byId("robust-replay").replaceChildren(...models.map(model=>{
      const beliefs=model.frames[activeRound];
      const bar=node("div",null,"belief-strip");
      bar.setAttribute("aria-hidden","true");
      for (const probability of beliefs) {
        const cell=node("span",null,probability>=.5?"belief-one":"belief-zero");
        cell.title=pct(probability)+" belief in 1";
        bar.append(cell);
      }
      const container=node("div");
      container.append(node("h4",lawNames[model.law]),bar,node("p",
        "Mean belief in 1 " + pct(mean(beliefs)) + " · " + model.hits + " correct initial reports"));
      return container;
    }));
    const index=Number(byId("robust-agent").value||0);
    byId("robust-agent-data").replaceChildren(...models.map(model=>row(lawNames[model.law],model.signals[index].signal,
      pct(model.frames[activeRound][index]),model.correctness[index]?"Correct":"Incorrect")));
    byId("robust-influence-row").textContent = matrix[index].map((weight,i)=>weight?"Agent "+(i+1)+" "+pct(weight):null)
      .filter(Boolean).join(" · ");
  }

  function renderTables() {
    const {models,bounds,rounds,hub,agents} = current;
    byId("robust-summary").replaceChildren(...models.map(model=>row(lawNames[model.law],
      pct(model.exact.meanReliability),ratio(model.exact.correlation),pct(model.exact.majority),
      pct(model.exact.unanimousError),pct(model.exact.unanimousCorrect),pct(model.hub.accuracy))));
    byId("robust-bounds").textContent = pct(bounds.lower.accuracy) + " to " + pct(bounds.upper.accuracy);
    byId("robust-gap").textContent=pp(models[1].exact.majority-models[0].exact.majority);
    const printSupport=which=>bounds[which].support.filter(point=>point.probability>1e-10)
      .map(point=>"K="+point.count+" at "+pct(point.probability)).join(", ");
    byId("robust-witness").textContent="Lower bound: "+printSupport("lower")+" · Upper bound: "+printSupport("upper");
    byId("robust-hub").textContent = "Hub effective influence " + pct(hubInfluence(agents,hub,rounds).effective) +
      " · stationary influence " + pct(hubInfluence(agents,hub,rounds).stationary);
    byId("robust-probs").replaceChildren(...models[0].mass.map((_,k)=>row(k,pct(models[0].mass[k]),pct(models[1].mass[k]))));
    byId("robust-forecast").replaceChildren(...models.flatMap(model=>Object.entries(model.forecasts).map(([policy,score])=>row(
      lawNames[model.law],policy==="specified"?"Correctly specified":policy==="wrongFamily"?"Other family":"Assume independent",
      score.accuracy == null ? "Unavailable" : pct(score.accuracy),ratio(score.brier,5),(score.logLoss==null?score.logLossStatus:ratio(score.logLoss,5)),
      score.overconfidentError == null ? "Unavailable" : pct(score.overconfidentError)))));
    byId("robust-calibration").replaceChildren(...models.flatMap(model=>Object.entries(model.forecasts).map(([policy,score])=>{
      const wrap=node("div",null,"calibration-row");
      wrap.append(node("h4",lawNames[model.law]+" · "+(policy==="specified"?"correct law":policy==="wrongFamily"?"other family":"independent")));
      for (const bin of score.calibration.filter(point=>point.mass>1e-12)) {
        wrap.append(node("p","Forecast "+pct(bin.confidence)+" · observed "+pct(bin.accuracy)+" · mass "+pct(bin.mass)));
      }
      return wrap;
    })));
    byId("robust-verification").replaceChildren(...models.map(model=>row(lawNames[model.law],
      pct(model.forecasts.specified.accuracy),pct(model.verified.accuracy), ratio(model.verified.utility,4),
      model.frontier.reduce((best,point)=>point.utility>best.utility+1e-12?point:best).replacements)));
    byId("robust-frontier").replaceChildren(...models[0].frontier.map((p,i)=>row(i,ratio(p.utility,4),ratio(models[1].frontier[i].utility,4))));
    draw();
  }

  function calculate() {
    const config=Object.fromEntries(fields.map(key=>[key,form.elements.namedItem(key).valueAsNumber]));
    const {agents,reliability,rho,hub,rounds,budget,verifier,cost,seed}=config;
    const rng=seeded(seed);
    const truth=Number(rng()<.5);
    const selector=rng(), source=rng();
    const uniforms=Array.from({length:agents},rng);
    const topology=byId("robust-topology").value;
    const method=byId("robust-method").value;
    const matrix=influence(agents,topology,hub);
    const masses=laws.map(law=>countDistribution(agents,reliability,rho,law));
    const models=laws.map((law,i)=>{
      const mass=masses[i];
      const correctness=sampleReports(uniforms,selector,rho===1?uniforms[0]:source,reliability,rho,law);
      const signals=correctness.map(flag=>({signal:flag?truth:1-truth}));
      const frontier=Array.from({length:agents+1},(_,m)=>verificationUtility(agents,reliability,rho,law,m,verifier,cost));
      return {
        law,mass,correctness,signals,hits:correctness.reduce((a,b)=>a+b,0),
        exact:summarizeCount(mass),hub:hubAccuracy(mass,hub,rounds),
        frames:averageScore(initialBeliefs(signals,reliability),matrix,rounds,method,.2),
        forecasts:{specified:scoreForecasts(mass,mass),wrongFamily:scoreForecasts(mass,masses[1-i]),
          independent:scoreForecasts(mass,countDistribution(agents,reliability,0,"shared"))},
        verified:frontier[budget],frontier,
      };
    });
    current={...config,topology,method,models,matrix,truth,bounds:exchangeableBounds(agents,reliability,rho)};
    activeRound=0;
    const select=byId("robust-agent");
    const saved=Math.min(Number(select.value||0),agents-1);
    select.replaceChildren(...Array.from({length:agents},(_,i)=>{
      const option=node("option","Agent "+(i+1));
      option.value=i;
      return option;
    }));
    select.value=saved;
    renderTables();
    renderReplay();
  }

  form.addEventListener("submit",event=>{
    event.preventDefault();
    byId("robust-error").hidden=true;
    try { calculate(); }
    catch(error) { byId("robust-error").textContent=error.message; byId("robust-error").hidden=false; }
  });
  form.elements.namedItem("agents").addEventListener("input",event=>{
    form.elements.namedItem("budget").max=event.target.value;
  });
  byId("robust-step").addEventListener("input",event=>{activeRound=Number(event.target.value); renderReplay();});
  byId("robust-agent").addEventListener("change",renderReplay);
  byId("robust-export").addEventListener("click",()=>download("echo2-scenario.json",{
    schemaVersion:"echo-dependence-browser-v1",evidenceClass:"synthetic simulation",scenario:current,
  }));
  calculate();

  fetch("./data/echo2-confirmatory.json").then(async response=>{
    if (!response.ok) throw new Error("Artifact unavailable.");
    const loaded=await response.json();
    if (loaded.schemaVersion!=="echo-dependence-result-v1" || loaded.config.phase!=="confirmatory" ||
      !Array.isArray(loaded.conditions) || loaded.conditions.length!==loaded.config.correlations.length ||
      loaded.conditions.some(row=>row.models.length!==2 || row.models.some(model=>!Number.isFinite(model.exact.majority)))) {
      throw new Error("Invalid artifact.");
    }
    artifact=loaded;
    byId("robust-study-status").textContent=artifact.config.id+" · "+artifact.config.trials.toLocaleString("en")+" Monte Carlo checks per condition";
    byId("robust-grid").replaceChildren(...artifact.conditions.map(condition=>row(ratio(condition.correlation,2),
      ...condition.models.map(model=>pct(model.exact.majority)),pct(condition.bounds.lower.accuracy)+"–"+pct(condition.bounds.upper.accuracy),
      pp(condition.monteCarlo.estimate))));
    draw();
    document.dispatchEvent(new Event("echo2-ready"));
  }).catch(()=>{
    byId("robust-study-status").textContent="Archived study unavailable. The mathematical explorer still works.";
  });
  return {draw};
}
