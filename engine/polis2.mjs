import {createWorld} from "./civilizations.mjs";
import {seeded} from "./echo.mjs";
import {bestResponse} from "./game-theory.mjs";
import {Moments} from "./statistics.mjs";
import {barter,inventoryTotal,NEED,planProduction,reconcileResources,stockGini,useAndStore} from "./resources.mjs";

export const payments = Object.freeze(["prepay","delivery"]);
export const surplusValues = Object.freeze([1,2,3]);
export const choices = Object.freeze(["material","joint","fixedPrior","cautious"]);
const needValue = 3;
const sum = values=>values.reduce((total,value)=>total+value,0);
const add = (a,b)=>b.forEach((value,i)=>{a[i]+=value;});

export function expectedGains(payment,surplus,successes,observations,quantity=1){
  if(!payments.includes(payment)||!surplusValues.includes(surplus)||!Number.isSafeInteger(successes)||
      !Number.isSafeInteger(observations)||observations<1||successes<0||successes>observations||
      !Number.isInteger(quantity)||quantity<1||quantity>2)throw new RangeError("Invalid exchange valuation or belief.");
  if(payment==="delivery"){
    const numerator=quantity*successes*(needValue-surplus);
    return {payer:numerator,supplier:numerator,denominator:observations};
  }
  return {payer:quantity*(needValue*successes-surplus*observations),
    supplier:quantity*(needValue*observations-surplus*successes),denominator:observations};
}

export function settleOffer(payer,supplier,resource,quantity,payment,success){
  if(!payments.includes(payment)||typeof success!=="boolean")throw new RangeError("Invalid settlement terms.");
  if(payment==="delivery"&&!success)return 0;
  barter(payer,supplier,resource,quantity,success);
  return quantity*(success?2:1);
}

function fundedOffer(payer,supplier){
  for(const r of [0,1]){
    const s=1-r;
    const quantity=Math.min(2,payer[r]-NEED[r],NEED[r]-supplier[r],supplier[s]-NEED[s],NEED[s]-payer[s]);
    if(quantity>0)return {resource:r,quantity};
  }
  return null;
}

export function runRobustWorld(world,payment,surplus,policy){
  if(!payments.includes(payment)||!surplusValues.includes(surplus)||!choices.includes(policy))
    throw new RangeError("Invalid robustness arm.");
  const stocks=world.agents.map(agent=>[...agent.stock]);
  const initial=inventoryTotal(stocks);
  const produced=[0,0], consumed=[0,0], losses=[0,0];
  const intake=stocks.map(()=>0);
  const attemptsBySupplier=stocks.map(()=>0);
  const completedBySupplier=stocks.map(()=>0);
  let attempts=0,completed=0,rejected=0,transfer=0,ties=0;
  for(const {labor,meetings} of world.schedule){
    for(const {id,technology} of world.agents){
      const {output}=planProduction(stocks[id],technology,labor);
      add(stocks[id],output);
      add(produced,output);
    }
    for(const {payer,supplier,deliveryDraw,choiceDraw} of meetings){
      const offer=fundedOffer(stocks[payer],stocks[supplier]);
      if(!offer)continue;
      const {resource,quantity}=offer;
      const useHistory=policy!=="fixedPrior";
      const pastAttempts=useHistory?attemptsBySupplier[supplier]:0;
      const pastComplete=useHistory?completedBySupplier[supplier]:0;
      const gains=expectedGains(payment,surplus,3+pastComplete,4+pastAttempts,quantity);
      const score=policy==="joint"?gains.payer+gains.supplier:gains.payer;
      ties+=Number(score===0);
      if((policy==="cautious"&&pastComplete<pastAttempts)||choiceDraw>=bestResponse([0,score])[1]){
        rejected++;
        continue;
      }
      const delivered=deliveryDraw<world.agents[supplier].reliability;
      transfer+=settleOffer(stocks[payer],stocks[supplier],resource,quantity,payment,delivered);
      attempts++;
      completed+=Number(delivered);
      attemptsBySupplier[supplier]++;
      completedBySupplier[supplier]+=Number(delivered);
    }
    for(let i=0;i<stocks.length;i++){
      const day=useAndStore(stocks[i]);
      stocks[i]=day.stored;
      intake[i]+=sum(day.consumed);
      add(consumed,day.consumed);
      add(losses,day.loss);
    }
    reconcileResources(initial,produced,consumed,losses,stocks);
  }
  return {intake,accounting:{initial,produced,consumed,losses,terminal:inventoryTotal(stocks)},metric:{
    needsSatisfied:sum(consumed)/(stocks.length*sum(NEED)*world.schedule.length),
    lowestConsumption:Math.min(...intake),gini:stockGini(intake),
    attempts,completed,rejected,transfer,ties,completionRate:attempts?completed/attempts:null,
  }};
}

function scoreAgainst(anchor,current){
  const loss=current.intake.map((value,i)=>Math.max(0,anchor.intake[i]-value));
  const positive=loss.filter(value=>value>0);
  return {...current.metric,losingAgents:positive.length,lossFraction:positive.length/loss.length,
    largestLoss:Math.max(...loss),meanLossAmongLosers:positive.length?sum(positive)/positive.length:null};
}

function describe(moment,critical=1.959963984540054,minimum=-Infinity,maximum=Infinity){
  if(!moment||moment.count===0)return null;
  if(moment.count===1)return {trials:1,estimate:moment.mean,sd:null,interval:null};
  return moment.summary(critical,minimum,maximum);
}

export function runPolis2(config,tick=()=>{}){
  if(!Number.isInteger(config.seed)||config.seed<1||config.seed>4294967295||
    !Number.isInteger(config.trials)||config.trials<2||config.trials>500||
    config.steps!==24||config.climate!=="stress")throw new RangeError("Invalid POLIS 2.0 design.");
  const rng=seeded(config.seed);
  const designs=payments.flatMap(payment=>surplusValues.map(surplus=>({payment,surplus})));
  const cells=designs.map(design=>({design,policyMoments:Object.fromEntries(choices.map(policy=>[policy,new Map()])),
    contrast:new Moments(),sameJointFixed:0}));
  const interaction=new Moments();
  let first;
  for(let trial=0;trial<config.trials;trial++){
    tick();
    const seed=1+Math.floor(rng()*4294967295);
    const world=createWorld(seed,config.climate,config.steps);
    const effects=cells.map(cell=>{
      const {payment,surplus}=cell.design;
      const outcomes=Object.fromEntries(choices.map(policy=>[policy,runRobustWorld(world,payment,surplus,policy)]));
      const {material,joint,fixedPrior}=outcomes;
      if(trial===0)cell.example=outcomes;
      if(joint.intake.every((value,i)=>value===fixedPrior.intake[i])&&
          JSON.stringify(joint.accounting)===JSON.stringify(fixedPrior.accounting)&&joint.metric.attempts===fixedPrior.metric.attempts&&
          joint.metric.completed===fixedPrior.metric.completed&&joint.metric.transfer===fixedPrior.metric.transfer)cell.sameJointFixed++;
      for(const [policy,outcome] of Object.entries(outcomes)){
        const group=cell.policyMoments[policy];
        for(const [key,value] of Object.entries(scoreAgainst(material,outcome))){
          if(!group.has(key))group.set(key,new Moments());
          if(value!==null)group.get(key).add(value);
        }
      }
      const effect=joint.metric.needsSatisfied-material.metric.needsSatisfied;
      cell.contrast.add(effect);
      return effect;
    });
    if(trial===0)first={seed,climate:world.climate};
    interaction.add(effects[4]-effects[1]);
  }
  return {schemaVersion:"polis2-v1",modelVersion:"polis-atomic-contract-v2",evidenceClass:"synthetic simulation",config,first,
    interaction:describe(interaction,1.959963984540054,-2,2),
    cells:cells.map(({design,policyMoments,contrast,example,sameJointFixed})=>({...design,sameJointFixed,example,
      contrast:describe(contrast,1.959963984540054,-1,1),
      policies:Object.fromEntries(Object.entries(policyMoments).map(([policy,group])=>[policy,Object.fromEntries(
        [...group].map(([key,moment])=>[key,describe(moment)]))]))}))};
}
