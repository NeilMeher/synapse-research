import {seeded} from "./echo.mjs";
import {Moments} from "./statistics.mjs";
import {bestResponse} from "./game-theory.mjs";
import {barter,inventoryTotal,NEED,planProduction,reconcileResources,stockGini,TECHNOLOGIES,useAndStore} from "./resources.mjs";

export const agentsCount = 8;
export const information = Object.freeze(["autarky","unaware","local","pooled"]);
export const climates = Object.freeze({moderate:0.15,stress:0.50});
const needTotal=NEED[0]+NEED[1];
const priorSuccess=3, priorCount=4;
const sum=values=>values.reduce((total,value)=>total+value,0);
const zeros=()=>[0,0];
const add=(vector,other)=>other.forEach((value,i)=>{vector[i]+=value;});

export function createWorld(seed,climate,steps){
  if(!Number.isInteger(seed)||seed<1||seed>4294967295||!Object.hasOwn(climates,climate)||
      !Number.isInteger(steps)||steps<1||steps>80)throw new RangeError("Invalid world seed, scarcity or duration.");
  const random=seeded(seed);
  const reliability=[0.95,0.95,0.95,0.95,0.25,0.25,0.25,0.25];
  for(let i=reliability.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [reliability[i],reliability[j]]=[reliability[j],reliability[i]];
  }
  const agents=Array.from({length:agentsCount},(_,id)=>({
    id,location:id,stock:[Math.floor(random()*4),Math.floor(random()*4)],technology:TECHNOLOGIES[id%2],reliability:reliability[id],
  }));
  const schedule=Array.from({length:steps},()=>{
    const labor=random()<climates[climate]?1:2;
    const offset=Math.floor(random()*agentsCount);
    const meetings=Array.from({length:agentsCount/2},(_,pair)=>{
      const first=(offset+2*pair)%agentsCount,second=(first+1)%agentsCount;
      const reversed=random()<0.5;
      return {payer:reversed?second:first,supplier:reversed?first:second,deliveryDraw:random(),choiceDraw:random()};
    });
    return {labor,meetings};
  });
  return {seed,climate,agents,schedule};
}

function opportunities(stock){
  return {
    wanted:stock.map((value,r)=>Math.max(0,NEED[r]-value)),
    offered:stock.map((value,r)=>Math.max(0,value-NEED[r])),
  };
}

function offer(buyer,seller){
  for(const give of [0,1]){
    const quantity=Math.min(buyer.offered[give],seller.wanted[give],seller.offered[1-give],buyer.wanted[1-give],2);
    if(quantity>0)return {give,quantity};
  }
  return null;
}

const proportions=new Set(["needsSatisfied","unmet","giniConsumed","giniTerminalStock","cooperation",
  "networkShare","specializedTime","shockSatisfaction"]);

export function materialChoice({buyerGain,choiceDraw}) {
  return choiceDraw<bestResponse([0,buyerGain])[1];
}

export function runWorld(world,visibility,record=false,choose=materialChoice){
  if(!information.includes(visibility))throw new RangeError("Unknown reputation policy.");
  const stocks=world.agents.map(agent=>[...agent.stock]);
  const initial=inventoryTotal(stocks);
  const produced=zeros(), consumed=zeros(), losses=zeros();
  const received=world.agents.map(()=>0);
  const reputation=world.agents.map(()=>({attempts:0,delivered:0}));
  const local=world.agents.map(()=>new Map());
  const network=new Set();
  const timeline=[];
  let attempts=0,deliveries=0,rejected=0,exchangeVolume=0,specializedHours=0,hoursWorked=0;
  let stressedNeed=0,stressedConsumed=0;
  for(const [day,{labor,meetings}] of world.schedule.entries()){
    const flows={produced:zeros(),consumed:zeros(),loss:zeros()};
    const plans=world.agents.map(({id,technology})=>{
      const plan=planProduction(stocks[id],technology,labor);
      add(stocks[id],plan.output);
      add(flows.produced,plan.output);
      specializedHours+=technology[0]>technology[1]?plan.hours:labor-plan.hours;
      hoursWorked+=labor;
      return plan;
    });
    const exchanges=[];
    if(visibility!=="autarky"){
      for(const {payer,supplier,deliveryDraw,choiceDraw} of meetings){
        const bid=offer(opportunities(stocks[payer]),opportunities(stocks[supplier]));
        if(!bid)continue;
        const evidence=visibility==="local"?local[payer].get(supplier):
          visibility==="pooled"?reputation[supplier]:undefined;
        const successes=priorSuccess+(evidence?.delivered??0);
        const observations=priorCount+(evidence?.attempts??0);
        const p=successes/observations;
        const {give,quantity}=bid;
        const context={buyerGain:quantity*(3*successes-2*observations)/observations,
          supplierGain:quantity*(3*observations-2*successes)/observations,belief:p,
          observedAttempts:evidence?.attempts??0,observedDeliveries:evidence?.delivered??0,choiceDraw};
        if(!choose(context)){
          rejected++;
          if(record)exchanges.push({payer,supplier,give,quantity,belief:p,status:"rejected"});
          continue;
        }
        const delivered=deliveryDraw<world.agents[supplier].reliability;
        barter(stocks[payer],stocks[supplier],give,quantity,delivered);
        attempts++;
        deliveries+=Number(delivered);
        exchangeVolume+=quantity*(delivered?2:1);
        if(delivered)network.add(Math.min(payer,supplier)+":"+Math.max(payer,supplier));
        const personal=local[payer].get(supplier)??{attempts:0,delivered:0};
        personal.attempts++;
        personal.delivered+=Number(delivered);
        local[payer].set(supplier,personal);
        reputation[supplier].attempts++;
        reputation[supplier].delivered+=Number(delivered);
        if(record)exchanges.push({payer,supplier,give,quantity,belief:p,status:delivered?"delivered":"defaulted"});
      }
    }
    const allocations=stocks.map((stock,id)=>{
      const result=useAndStore(stock);
      stocks[id]=result.stored;
      received[id]+=sum(result.consumed);
      add(flows.consumed,result.consumed);
      add(flows.loss,result.loss);
      return result;
    });
    add(produced,flows.produced);
    add(consumed,flows.consumed);
    add(losses,flows.loss);
    if(labor===1){
      stressedNeed+=agentsCount*needTotal;
      stressedConsumed+=sum(flows.consumed);
    }
    const accounting=reconcileResources(initial,produced,consumed,losses,stocks);
    if(record)timeline.push({day:day+1,labor,exchanges,flows,accounting,
      population:stocks.map((stock,id)=>({id,stock:[...stock],production:plans[id].output,hours:plans[id].hours,
        consumed:allocations[id].consumed,totalConsumed:received[id],reputation:{...reputation[id]}}))});
  }
  const possible=agentsCount*world.schedule.length*needTotal;
  const terminal=inventoryTotal(stocks);
  const metric={
    needsSatisfied:sum(consumed)/possible,unmet:(possible-sum(consumed))/possible,
    welfare:sum(consumed)/agentsCount,lowestConsumption:Math.min(...received),
    giniConsumed:stockGini(received),giniTerminalStock:stockGini(stocks.map(sum)),
    production:sum(produced),totalConsumption:sum(consumed),loss:sum(losses),exchangeVolume,
    attempts,deliveries,rejected,cooperation:deliveries/(agentsCount/2*world.schedule.length),
    networkShare:network.size/agentsCount,specializedTime:specializedHours/hoursWorked,
    shockSatisfaction:stressedNeed?stressedConsumed/stressedNeed:null,
  };
  return {metric,accounting:{initial,produced,consumed,losses,terminal},received,timeline};
}

export function studyWorlds(config,tick,arms,outcome){
  if(!Number.isInteger(config.trials)||config.trials<2||config.trials>2000||!Array.isArray(config.climates)||
      config.climates.length!==2||new Set(config.climates).size!==2)throw new RangeError("Invalid registered world design.");
  const random=seeded(config.seed);
  return config.climates.map(climate=>{
    const moments=Object.fromEntries(Object.keys(arms).map(arm=>[arm,new Map()]));
    const comparison=new Moments();
    let first;
    for(let trial=0;trial<config.trials;trial++){
      tick();
      const seed=1+Math.floor(random()*4294967295);
      const world=createWorld(seed,climate,config.steps);
      const paired=Object.fromEntries(Object.entries(arms).map(([arm,method])=>[arm,method(world,trial===0)]));
      if(trial===0)first={world,arms:paired};
      comparison.add(outcome(paired));
      for(const [arm,value] of Object.entries(paired)){
        for(const [key,metric] of Object.entries(value.metric)){
          if(metric===null)continue;
          if(!moments[arm].has(key))moments[arm].set(key,new Moments());
          moments[arm].get(key).add(metric);
        }
      }
    }
    const summaries=Object.fromEntries(Object.entries(moments).map(([arm,map])=>[arm,Object.fromEntries(
      [...map].map(([key,moment])=>[key,moment.count>1?moment.summary(undefined,0,proportions.has(key)?1:Infinity):
        {trials:moment.count,estimate:moment.mean,sd:null,interval:null}]))]));
    return {climate,first,summaries,contrast:comparison.summary(1.959963984540054,-1,1)};
  });
}

export function runCivilizations(config,tick){
  const arms=Object.fromEntries(information.map(visibility=>[visibility,(world,record)=>runWorld(world,visibility,record)]));
  const cells=studyWorlds(config,tick,arms,pair=>pair.pooled.metric.needsSatisfied-pair.unaware.metric.needsSatisfied);
  return {schemaVersion:"civilizations-v1",modelVersion:"conserved-local-barter-v1",evidenceClass:"synthetic simulation",config,cells};
}
