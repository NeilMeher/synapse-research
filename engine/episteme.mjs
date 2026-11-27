import {computeDisagreementGrid,evaluateBasis,evaluateEnsemble,FAMILIES,GRID_POINTS,predict} from "./discovery.mjs";
import {seeded} from "./echo.mjs";
import {sampleStandardNormal as normal} from "./noesis.mjs";
import {Moments} from "./statistics.mjs";
import {checkResidualBlock} from "./validation.mjs";

export const selectionPolicies=Object.freeze(["random","disagreement"]);
export const regimes=Object.freeze(["inLibrary","outsideLibrary"]);
const discoveryBudget=6;
const noise=0.2;
const confidence=0.7;
const alpha=0.05;
const adjustedCritical=2.241402727604947;
export const validationGrid=Object.freeze([-1.85,-0.85,0.15,1.15]);
export const replicationGrid=Object.freeze([-1.45,-0.45,0.55,1.55]);
export const evaluationGrid=Object.freeze([-1.95,-1.65,-1.35,-1.05,-0.75,-0.35,-0.05,0.05,0.35,0.65,0.95,1.25,1.65,1.95]);

function law(family, coefficients) {
  return x=>{
    const features=family==="outside"?[1,Math.sin(Math.PI*x),x*x]:evaluateBasis(family,x);
    return features.reduce((sum,value,i)=>sum+value*coefficients[i],0);
  };
}

export function generateInquiry(regime, random) {
  if (!regimes.includes(regime)) throw new RangeError("Unknown inquiry regime.");
  const familyDraw=random();
  const family=regime==="outsideLibrary"?"outside":FAMILIES[Math.floor(familyDraw*FAMILIES.length)];
  return {
    family,coefficients:Array.from({length:3},()=>normal(random)),
    randomChoices:Array.from({length:discoveryBudget-1},random),
    observationNoise:Array.from({length:discoveryBudget},()=>noise*normal(random)),
    validationNoise:validationGrid.map(()=>noise*normal(random)),
    replicationNoise:replicationGrid.map(()=>noise*normal(random)),
  };
}

export function runInquiry(task, policy) {
  if (!selectionPolicies.includes(policy)) throw new RangeError("Unknown inquiry policy.");
  const hidden=law(task.family,task.coefficients);
  let ensemble;
  const observations=[], updates=[];
  for (let step=0;step<discoveryBudget;step++){
    const available=GRID_POINTS.filter(x=>!observations.some(row=>row.x===x));
    let x=0;
    if(step){
      if(policy==="random")x=available[Math.floor(task.randomChoices[step-1]*available.length)];
      else x=computeDisagreementGrid(ensemble,available).reduce((best,next)=>
        next.disagreement>best.disagreement+1e-12?next:best).x;
    }
    observations.push({x,y:hidden(x)+task.observationNoise[step]});
    ensemble=evaluateEnsemble(observations,1,1/noise**2);
    updates.push({family:ensemble.bestFamily,probability:ensemble.bestProb,weights:ensemble.posteriorByFamily});
  }

  const leading=ensemble.fitted.find(model=>model.family===ensemble.bestFamily);
  const proposed=ensemble.bestProb>=confidence?leading.family:null;
  const frozenPrediction=x=>predict(leading,x).mean;
  const verify=(grid, errors)=>{
    const rows=grid.map((x,i)=>({x,y:hidden(x)+errors[i],predicted:frozenPrediction(x)}));
    return {rows,...checkResidualBlock(rows,noise,alpha)};
  };
  const validation=verify(validationGrid,task.validationNoise);
  const replication=verify(replicationGrid,task.replicationNoise);
  const validated=proposed&&validation.passes?proposed:null;
  const replicated=validated&&replication.passes?validated:null;
  const firstConfident=updates.findIndex(step=>step.probability>=confidence);
  const acceptedCost=discoveryBudget+validationGrid.length+replicationGrid.length;
  const evalRows=evaluationGrid.map(x=>({x,truth:hidden(x),predicted:frozenPrediction(x)}));
  const score={
    correctProposal:Number(proposed===task.family),
    falseProposal:Number(proposed!==null&&proposed!==task.family),
    correctValidated:Number(validated===task.family),
    falseValidated:Number(validated!==null&&validated!==task.family),
    correctAccepted:Number(replicated===task.family),
    falseAccepted:Number(replicated!==null&&replicated!==task.family),
    rejected:Number(replicated===null),
    validationPassed:Number(validated!==null),
    replicationPassed:Number(replicated!==null),
    noProposal:Number(proposed===null),
    rmse:Math.sqrt(evalRows.reduce((sum,row)=>sum+(row.predicted-row.truth)**2,0)/evalRows.length),
    firstConfidentMeasurement:firstConfident===-1?discoveryBudget+1:firstConfident+1,
  };
  return {policy,observations,updates,proposed,validation,replication,validated,replicated,measurementBudget:acceptedCost,evalRows,score};
}

export function runEpisteme(config,tick=()=>{}){
  if (!Number.isInteger(config.trials)||config.trials<2||config.trials>2000||
    !Number.isInteger(config.seed)||config.seed<1||config.seed>4294967295)throw new RangeError("Invalid study settings.");
  const random=seeded(config.seed);
  const cells=regimes.map(regime=>{
    let firstTask,replay;
    const summaries=Object.fromEntries(selectionPolicies.map(policy=>[policy,new Map()]));
    const contrast=new Moments();
    const outcome=regime==="outsideLibrary"?"falseProposal":"correctAccepted";
    for(let trial=0;trial<config.trials;trial++){
      tick();
      const task=generateInquiry(regime,random);
      const pair=Object.fromEntries(selectionPolicies.map(policy=>[policy,runInquiry(task,policy)]));
      if(trial===0){firstTask=task;replay=pair;}
      contrast.add(pair.disagreement.score[outcome]-pair.random.score[outcome]);
      for(const policy of selectionPolicies){
        for(const [metric,value] of Object.entries(pair[policy].score)){
          if(!summaries[policy].has(metric))summaries[policy].set(metric,new Moments());
          summaries[policy].get(metric).add(value);
        }
      }
    }
    const policies=Object.fromEntries(selectionPolicies.map(policy=>[policy,Object.fromEntries(
      [...summaries[policy]].map(([metric,moments])=>[metric,moments.summary(undefined,
        metric==="rmse"?0:metric==="firstConfidentMeasurement"?1:0,
        metric==="rmse"?Infinity:metric==="firstConfidentMeasurement"?discoveryBudget+1:1)]))]));
    return {regime,firstTask,replay,policies,contrast:{outcome,...contrast.summary(adjustedCritical,-1,1)}};
  });
  return {schemaVersion:"episteme-v1",modelVersion:"sequential-conditional-gaussian-v1",evidenceClass:"synthetic simulation",
    config,design:{discoveryBudget,noise,confidence,alpha,validationGrid,replicationGrid,evaluationGrid},cells};
}
