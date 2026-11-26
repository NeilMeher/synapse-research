import {seeded} from "./echo.mjs";
import {sampleReports} from "./dependence.mjs";
import {answerConfidence} from "./confidence.mjs";
import {initializeMarket,inspectAccounts,quote,reconcile,submitOrder} from "./market.mjs";
import {marketAccounts,orderFromSide,policyFor} from "./reflex.mjs";
import {Moments} from "./statistics.mjs";

const q=.65;
const hintReliability=.70;
const agreementRate=q*hintReliability+(1-q)*(1-hintReliability);
const arms=["independent","shared","beta"].flatMap(law=>["fixed","calibrated","style"].flatMap(confidence=>
  [1,4].map(impact=>({law,confidence,impact,communication:"none"}))));
for(const law of ["shared","beta"])for(const communication of ["equal","weighted"]){
  arms.push({law,confidence:"calibrated",impact:4,communication});
}
const id=arm=>[arm.law,arm.confidence,arm.impact,arm.communication].join("/");

function draw(random,n) {
  return {truth:Number(random()<.5),selector:random(),common:random(),
    reports:Array.from({length:n},random),hints:Array.from({length:n},random),style:Array.from({length:n},random)};
}

function beliefs(task,arm,rho) {
  const correctness=sampleReports(task.reports,task.selector,task.common,q,arm.law==="independent"?0:rho,
    arm.law==="beta"?"beta":"shared");
  return correctness.map((correct,i)=>{
    const report=correct?task.truth:1-task.truth;
    const hint=task.hints[i]<hintReliability?task.truth:1-task.truth;
    const confidence=arm.confidence==="fixed"?q:arm.confidence==="calibrated"?
      answerConfidence(q,hintReliability,hint===report):(task.style[i]<agreementRate ? .95 : .65);
    return {report,hint,correct,confidence,styleHigh:task.style[i]<agreementRate};
  });
}

function orderPolicy(views,i,arm) {
  const own=views[i];
  let action=own.report;
  if(arm.communication!=="none") {
    const n=views.length;
    const message=[views[(i+n-1)%n],own,views[(i+1)%n]];
    const influence=message.reduce((sum,view)=>sum+(view.report?1:-1)*
      (arm.communication==="weighted"?view.confidence:1),0);
    action=Math.abs(influence)<1e-12?own.report:Number(influence>0);
  }
  return {side:action?"buy":"sell",quantity:own.confidence>=.75?2:1,action};
}

function episode(task,arm,rho,archive) {
  const views=beliefs(task,arm,rho);
  const n=views.length;
  const policy=policyFor(arm.impact);
  const market=initializeMarket(marketAccounts(n),policy);
  const initial=archive?inspectAccounts(market):null;
  const decisions=[];
  const fundamental=policy.anchor+(task.truth?120:-120);
  let volume=0,submitted=0,net=0,correctActions=0,brier=0,correctReports=0;
  for(const [i,view] of views.entries()){
    const order=orderPolicy(views,i,arm);
    const event=submitOrder(market,orderFromSide("trader-"+i,order.side,order.quantity));
    volume+=event.fills.length;
    submitted+=order.quantity;
    net+=event.fills.length*(order.side==="buy"?1:-1);
    correctActions+=Number(order.action===task.truth);
    correctReports+=view.correct;
    brier+=(view.confidence-view.correct)**2;
    if(archive)decisions.push({...view,action:order.action,event});
  }
  const price=quote(market);
  const ledger=archive?{initial,final:inspectAccounts(market),policy,totals:reconcile(market),
    frames:[{midpoint:price.midpoint,quote:price,trades:decisions}]}:null;
  return {
    metrics:{
      absoluteGap:Math.abs(price.midpoint-fundamental),directionalGap:price.midpoint-fundamental,
      volume,submitted,net,reportAccuracy:correctReports/n,correctPair:correctReports*(correctReports-1)/(n*(n-1)),
      actionAccuracy:correctActions/n,brier:brier/n,
    },
    replay:archive?{truth:task.truth,fundamental,ledger}:null,
  };
}

export function runConvergence(config,tick=()=>{}) {
  if(!Number.isInteger(config.trials)||config.trials<2||config.trials>1500||
     !Number.isInteger(config.agents)||config.agents<3||config.agents>21||
     !Number.isFinite(config.correlation)||config.correlation<=0||config.correlation>=1) {
    throw new RangeError("Cross-lab design outside bounds.");
  }
  const random=seeded(config.seed);
  const summaries=arms.map(arm=>({...arm,id:id(arm),scores:new Map(),replay:null}));
  const paired=[new Moments(),new Moments()];
  for(let trial=0;trial<config.trials;trial++){
    tick();
    const task=draw(random,config.agents);
    const gaps=new Map();
    for(const arm of summaries){
      const {metrics,replay}=episode(task,arm,config.correlation,trial===0);
      if(replay)arm.replay=replay;
      gaps.set(arm.id,metrics.absoluteGap);
      for(const [key,value] of Object.entries(metrics)){
        if(!arm.scores.has(key))arm.scores.set(key,new Moments());
        arm.scores.get(key).add(value);
      }
    }
    const compare=policy=>gaps.get("beta/"+policy+"/4/none")-gaps.get("shared/"+policy+"/4/none");
    paired[0].add(compare("calibrated"));
    paired[1].add(compare("calibrated")-compare("style"));
  }
  const contrasts=paired.map((moment,i)=>({id:["dependence","confidence-interaction"][i],
    ...moment.summary(2.241402727604947,-1e6,1e6)}));
  return {schemaVersion:"convergence-market-v1",modelVersion:"convergence-cue-maker-v1",evidenceClass:"synthetic simulation",
    config,reportReliability:q,hintReliability,agreementRate,
    contrasts,arms:summaries.map(({scores,...arm})=>({...arm,
      metrics:Object.fromEntries([...scores].map(([name,moment])=>[name,moment.summary(1.959963984540054,-1e6,1e6)])),
    }))};
}
