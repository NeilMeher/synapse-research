import { seeded } from "./echo.mjs";
import { sampleStandardNormal as normal } from "./noesis.mjs";
import { Moments } from "./statistics.mjs";

export const policies = Object.freeze({
  primary:"Preregistered primary", unadjusted:"Unadjusted family", selected:"Selected minimum p",
  bonferroni:"Bonferroni", holm:"Holm", bh:"Benjamini–Hochberg",
  holdout:"Split-sample validation", replicate:"Independent replication",
});
const normalCritical = 1.959963984540054;
const pairedCritical = 2.241402727604947;
const integer = (x,min,max) => Number.isInteger(x) && x>=min && x<=max;

export function gaussianP(z) {
  if (!Number.isFinite(z)) throw new RangeError("The z statistic must be finite.");
  if (z===0) return 1;
  const x=Math.abs(z);
  const t=1/(1+0.2316419*x);
  const polynomial=t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return Math.min(1,2*Math.exp(-0.5*x*x)*polynomial/Math.sqrt(2*Math.PI));
}

export function nullFamilyRisk(m,alpha) {
  return -Math.expm1(m*Math.log1p(-alpha));
}

export function validateDesign(d) {
  if (!d || !integer(d.hypotheses,2,60) || !integer(d.n,4,256) || d.n%2!==0 ||
    !integer(d.signals,0,d.hypotheses) || !(d.alpha>=0.001&&d.alpha<=0.2) ||
    !(d.effect>0&&d.effect<=2) || !(d.rho>=0&&d.rho<=0.9)) throw new RangeError("Invalid SCIENTIA configuration.");
  return d;
}

export function generateProgramme(design, random) {
  const {hypotheses:m,signals,n,effect,rho}=validateDesign(design);
  const truth=Array.from({length:m},(_,i)=>i<signals ? effect : 0);
  for(let i=m-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [truth[i],truth[j]]=[truth[j],truth[i]];
  }
  const block=()=>{
    const common=normal(random);
    return truth.map(value=>value*Math.sqrt(n/2)+Math.sqrt(rho)*common+Math.sqrt(1-rho)*normal(random));
  };
  const first=block(), second=block();
  const full=first.map((value,i)=>(value+second[i])/Math.sqrt(2));
  return {truth,first,second,full};
}

export function rankP(values, alpha, rule) {
  const ranked=values.map((p,i)=>({p,i})).sort((a,b)=>a.p-b.p||a.i-b.i);
  const m=ranked.length;
  if(rule==="primary") return values[0]<=alpha?[0]:[];
  if(rule==="unadjusted"||rule==="bonferroni"){
    const cutoff=rule==="bonferroni"?alpha/m:alpha;
    return ranked.filter(row=>row.p<=cutoff).map(row=>row.i);
  }
  if(rule==="selected") return ranked[0].p<=alpha?[ranked[0].i]:[];
  if(rule==="holm"){
    const failed=ranked.findIndex((row,i)=>row.p>alpha/(m-i));
    return ranked.slice(0,failed===-1?m:failed).map(row=>row.i);
  }
  if(rule==="bh"){
    const last=ranked.findLastIndex((row,i)=>row.p<=alpha*(i+1)/m);
    return ranked.slice(0,last+1).map(row=>row.i);
  }
  throw new RangeError("Unsupported multiplicity policy.");
}

export function evaluateProcedures({first,second,full}, alpha) {
  const combined=full.map(gaussianP), discovered=first.map(gaussianP), tested=second.map(gaussianP);
  const choices=Object.fromEntries(Object.keys(policies).slice(0,6).map(policy=>
    [policy,{indices:rankP(combined,alpha,policy), z:full, fraction:1}]));
  for(const [id,rule,cutoff] of [["holdout","selected",alpha],["replicate","bonferroni",alpha/first.length]]){
    const screened=rankP(discovered,alpha,rule);
    const indices=screened.filter(i=>tested[i]<=cutoff&&Math.sign(first[i])===Math.sign(second[i]));
    choices[id]={indices,z:second,fraction:0.5,screened};
  }
  return choices;
}

function score(choice, truth, n) {
  const {indices,z,fraction,screened}=choice;
  const positives=truth.filter(value=>value!==0).length;
  const trueReports=indices.filter(i=>truth[i]!==0).length;
  const falseReports=indices.length-trueReports;
  const errors=indices.map(i=>z[i]/Math.sqrt(n*fraction)-truth[i]);
  return {
    fwer:Number(falseReports>0),
    fdp:indices.length?falseReports/indices.length:0,
    type1:positives===truth.length?null:falseReports/(truth.length-positives),
    power:positives?trueReports/positives:null,
    type2:positives?1-trueReports/positives:null,
    anyReport:Number(indices.length>0),
    reportCount:indices.length,
    replication:screened?.length?indices.length/screened.length:null,
    reportedBias:errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null,
    reportedCoverage:errors.length?errors.filter(error=>Math.abs(error)<=normalCritical/Math.sqrt(n*fraction)).length/errors.length:null,
  };
}

export function summarizeProgramme(design, random) {
  const data=generateProgramme(design,random);
  const claims=evaluateProcedures(data,design.alpha);
  const scores=Object.fromEntries(Object.entries(claims).map(([id,choice])=>[id,score(choice,data.truth,design.n)]));
  return {data,claims,scores};
}

function summarize(moment) {
  if(moment.count===0)return null;
  if(moment.count===1)return {trials:1,estimate:moment.mean,sd:null,interval:null};
  return moment.summary(normalCritical,-Infinity,Infinity);
}

export function runScientia(config,tick=()=>{}) {
  if(!integer(config.trials,2,16000) || !Array.isArray(config.cells) || config.cells.length<2 || config.cells.length>8 ||
    new Set(config.cells.map(cell=>cell.id)).size!==config.cells.length) throw new RangeError("Invalid SCIENTIA study.");
  const random=seeded(config.seed);
  const cells=config.cells.map(design=>{
    validateDesign(design);
    const moments=Object.fromEntries(Object.keys(policies).map(id=>[id,new Map()]));
    const rowContrast=new Moments();
    let replay;
    for(let trial=0;trial<config.trials;trial++){
      tick();
      const programme=summarizeProgramme(design,random);
      if(trial===0)replay=programme;
      for(const [policy,metrics] of Object.entries(programme.scores)){
        for(const [metric,value] of Object.entries(metrics)){
          if(!moments[policy].has(metric))moments[policy].set(metric,new Moments());
          if(value!==null)moments[policy].get(metric).add(value);
        }
      }
      rowContrast.add(design.signals ? programme.scores.unadjusted.fdp-programme.scores.bh.fdp :
        programme.scores.unadjusted.fwer-programme.scores.holm.fwer);
    }
    return {design,reference:design.signals===0&&design.rho===0?{unadjustedFwer:nullFamilyRisk(design.hypotheses,design.alpha)}:null,
      replay,contrast:{metric:design.signals?"Unadjusted minus BH FDP":"Unadjusted minus Holm FWER",
        ...rowContrast.summary(pairedCritical,-1,1)},
      policies:Object.fromEntries(Object.entries(moments).map(([id,entries])=>
        [id,Object.fromEntries([...entries].map(([metric,values])=>[metric,summarize(values)]))])),
    };
  });
  return {schemaVersion:"scientia-v1",modelVersion:"scientia-normal-workflows-v1",evidenceClass:"synthetic simulation",config,cells};
}
