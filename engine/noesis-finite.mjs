import {decisionRisks} from "./adaptive-trust.mjs";

const sum = list => list.reduce((total,x) => total+x,0);
const average = list => sum(list)/list.length;
const entropy = probs => -sum(probs.filter(p=>p>0).map(p=>p*Math.log2(p)));
export const rational = value => {
  const [a,b=1] = String(value).split("/").map(Number);
  return a/b;
};

export function familyMass(weights, families) {
  const bins = new Map();
  for (const [i,f] of families.entries()) bins.set(f,(bins.get(f)??0)+weights[i]);
  return [...bins.values()];
}

function prediction(weights, likelihood) {
  return sum(weights.map((w,i)=>w*likelihood[i]));
}

export function updateFinite(weights, likelihood, bit) {
  const joint = weights.map((w,i) => w*(bit ? likelihood[i] : 1-likelihood[i]));
  const mass = sum(joint);
  return {mass,posterior:mass>0 ? joint.map(x=>x/mass) : null};
}

function immediateRisk(p, costs) {
  const {accept,reject}=decisionRisks({prior:p,falseAccept:costs[0],falseReject:costs[1],cost:0,accuracy:.5});
  return Math.min(accept,reject);
}

export function acquisitionObjectives(weights, families, likelihood, evaluation, focal, costs) {
  const before = prediction(weights,likelihood);
  const brier = posterior => average(evaluation.map(x=>{
    const p=prediction(posterior,x);
    return p*(1-p);
  }));
  const risk = posterior => immediateRisk(prediction(posterior,focal),costs);
  const values = {
    hypothesisInformation:entropy(familyMass(weights,families)),
    jointInformation:entropy(weights),
    predictionValue:brier(weights),
    decisionValue:risk(weights),
    predictiveVariance:before*(1-before),
    disagreement:sum(weights.map((p,i)=>p*(likelihood[i]-before)**2)),
  };
  for (const bit of [0,1]) {
    const {mass,posterior}=updateFinite(weights,likelihood,bit);
    if (!posterior) continue;
    values.hypothesisInformation-=mass*entropy(familyMass(posterior,families));
    values.jointInformation-=mass*entropy(posterior);
    values.predictionValue-=mass*brier(posterior);
    values.decisionValue-=mass*risk(posterior);
  }
  return values;
}

export function rate(model,x) {
  return .5+rational(model.amplitude)*rational(x)**model.exponent;
}

export function finiteEpisode(config, answers, policy) {
  const {models,initial,queries,interpolate,extrapolate,focal}=config;
  const costs=config.costs.map(rational);
  const families=models.map(x=>x.family);
  const domain=[initial,...queries,...interpolate,...extrapolate];
  const response=new Map(domain.map(x=>[x,models.map(m=>rate(m,x))]));
  const used=[initial];
  let weights=updateFinite(models.map(m=>rational(m.prior)),response.get(initial),answers[initial]).posterior;
  for(let i=0;i<config.budget-1;i++){
    let query=config.uniform[i];
    if(policy!=="uniform"){
      const candidates=queries.filter(x=>!used.includes(x));
      query=candidates[0];
      let best=-Infinity;
      for(const point of candidates){
        const v=acquisitionObjectives(weights,families,response.get(point),interpolate.map(x=>response.get(x)),response.get(focal),costs)[policy];
        if(v>best+config.tolerance){best=v;query=point;}
      }
    }
    used.push(query);
    weights=updateFinite(weights,response.get(query),answers[query]).posterior;
  }
  const predicted=Object.fromEntries([...interpolate,...extrapolate].map(x=>[x,prediction(weights,response.get(x))]));
  const orderedFamilies=[...new Set(families)];
  const mass=familyMass(weights,families);
  const family=orderedFamilies[mass.findIndex(p=>Math.max(...mass)-p<=config.tolerance)];
  return {used,weights,predicted,family,action:costs[0]*(1-predicted[focal])<costs[1]*predicted[focal]-config.tolerance?"accept":"reject"};
}
