import {bestResponse} from "./game-theory.mjs";
import {materialChoice,runWorld,studyWorlds} from "./civilizations.mjs";

export function jointChoice({buyerGain,supplierGain,choiceDraw}){
  return choiceDraw<bestResponse([0,buyerGain+supplierGain])[1];
}

export function failureSensitiveChoice(context){
  return context.observedAttempts===context.observedDeliveries && materialChoice(context);
}

export function compareIntake(result,baseline){
  const differences=result.received.map((use,i)=>use-baseline.received[i]);
  return {...result,metric:{...result.metric,
    betterOff:differences.filter(change=>change>0).length,
    worseOff:differences.filter(change=>change<0).length,
    largestLoss:Math.max(0,-Math.min(...differences)),
    largestGain:Math.max(0,Math.max(...differences)),
  }};
}

const arms={
  material:(world,record)=>{
    const result=runWorld(world,"pooled",record);
    return compareIntake(result,result);
  },
  joint:(world,record)=>compareIntake(runWorld(world,"pooled",record,jointChoice),runWorld(world,"pooled")),
  cautious:(world,record)=>compareIntake(runWorld(world,"pooled",record,failureSensitiveChoice),runWorld(world,"pooled")),
  fixedPrior:(world,record)=>compareIntake(runWorld(world,"unaware",record),runWorld(world,"pooled")),
};

export function runPolis(config,tick=()=>{}){
  const cells=studyWorlds(config,tick,arms,pair=>pair.joint.metric.needsSatisfied-pair.material.metric.needsSatisfied);
  return {schemaVersion:"polis-v1",modelVersion:"axiom-decision-into-barter-v1",evidenceClass:"synthetic simulation",config,cells};
}
