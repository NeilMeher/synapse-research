import {seeded} from "./echo.mjs";
import {Moments} from "./statistics.mjs";
import {initializeMarket,inspectAccounts,quote,reconcile,submitOrder} from "./market.mjs";

const anchor=10000;
const players=9;
const assessments=["fundamental","momentum","contrarian","noise"];
const ids=Array.from({length:players},(_,i)=>"trader-"+i);

export function marketAccounts(agents=players) {
  return [{id:"maker",cash:2_000_000,assets:120},...Array.from({length:agents},(_,i)=>({
    id:"trader-"+i,cash:80_000,assets:8,
  }))];
}

export function policyFor(impact) {
  return {anchor,impact,halfSpread:2,fee:1};
}

export function orderFromSide(actor,side,quantity) {
  return {actor,side,quantity,limit:side==="buy"?10500:9500};
}

function decision(policy, ownSignal, previousMark, mark, noise) {
  if (policy==="noise") return noise;
  if (policy==="momentum" && mark!==previousMark) return Number(mark>previousMark);
  if (policy==="contrarian" && mark!==previousMark) return Number(mark<previousMark);
  return ownSignal;
}

function marketEpisode(task,impact,keep) {
  const market=initializeMarket(marketAccounts(),policyFor(impact));
  const initial=inspectAccounts(market);
  let previous=anchor;
  const frames=[];
  let error=0,volume=0,high=anchor,drawdown=0,variance=0;
  for (const [t,round] of task.entries()) {
    const prior=quote(market).midpoint;
    const trades=[];
    for (const [i,agent] of ids.entries()) {
      const signal=round.directions[i];
      const rule=assessments[i%assessments.length];
      const choice=decision(rule,signal,previous,quote(market).midpoint,round.noise[i]);
      const event=submitOrder(market,orderFromSide(agent,choice?"buy":"sell",2));
      volume+=event.fills.length;
      if (keep) trades.push({rule,signal,event});
    }
    const mid=quote(market).midpoint;
    error+=Math.abs(mid-round.fundamental);
    variance+=(mid/prior-1)**2;
    high=Math.max(high,mid);
    drawdown=Math.max(drawdown,(high-mid)/high);
    if (keep) frames.push({round:t+1,fundamental:round.fundamental,midpoint:mid,quote:quote(market),trades});
    previous=prior;
  }
  const final=inspectAccounts(market);
  const metrics={meanAbsoluteError:error/task.length,volume,drawdown,
    rootMeanSquaredReturn:Math.sqrt(variance/task.length),finalMidpoint:quote(market).midpoint};
  return {metrics,replay:keep?{initial,final,frames,policy:market.policy,totals:reconcile(market)}:null};
}

export function runReflex(config,tick=()=>{}) {
  if (!Number.isInteger(config.trials)||config.trials<2||config.trials>2000||
      !Number.isInteger(config.rounds)||config.rounds<2||config.rounds>12) throw new RangeError("REFLEX design outside resource bounds.");
  const random=seeded(config.seed);
  const arms=[{impact:1,metrics:[],replay:null},{impact:4,metrics:[],replay:null}];
  const paired = new Moments();
  for (let trial=0;trial<config.trials;trial++) {
    tick();
    const task=Array.from({length:config.rounds},()=>{
      const positive=Number(random()<.5);
      return {fundamental:anchor+(positive?120:-120),
        directions:ids.map(()=>random()<.7?positive:1-positive),noise:ids.map(()=>Number(random()<.5))};
    });
    for (const arm of arms) {
      const {metrics,replay}=marketEpisode(task,arm.impact,trial===0);
      arm.metrics.push(metrics);
      if (replay) arm.replay=replay;
    }
    paired.add(arms[1].metrics.at(-1).meanAbsoluteError-arms[0].metrics.at(-1).meanAbsoluteError);
  }
  return {schemaVersion:"reflex-market-v1",modelVersion:"reflex-ioc-maker-v1",evidenceClass:"synthetic simulation",config, pairedPriceError:paired.summary(1.959963984540054,-1e6,1e6),
    arms:arms.map(arm=>({impact:arm.impact,replay:arm.replay,trials:arm.metrics.length,
      summary:Object.fromEntries(Object.keys(arm.metrics[0]).map(key=>[key,
        arm.metrics.reduce((sum,row)=>sum+row[key],0)/arm.metrics.length]))}))};
}
