const HOURS=8760;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sum=values=>values.reduce((total,x)=>total+x,0);
const RANGES={
  capacity:{gpus:[1,2048,true],gpusPerServer:[1,16,true],serversPerRack:[1,32,true],availability:[0,1],
    workFraction:[0,1],billFraction:[0,1],gpuIdleW:[0,350],gpuLoadedW:[0,350],serverOtherKW:[0,10],sharedITKW:[0,500],
    rackLimitKW:[1,200],pue:[1,3],siteWue:[0,10],powerFactor:[.5,1],contractKVA:[0,10000]},
  tariff:{energyPerKWh:[0,5],demandPerKVAmonth:[0,500],fixedPerMonth:[0,100000],waterPerM3:[0,50]},
  costs:{civil:[0,1e8],electrical:[0,1e8],cooling:[0,1e8],gpuPerDevice:[0,1e6],network:[0,1e8],
    professional:[0,1e8],workingCapital:[0,1e8],annualFixed:[0,1e8],variablePerActiveHour:[0,100],
    replacementPerGPU:[0,1e6],decommission:[0,1e8],residual:[0,1e8]},
  operations:{years:[1,30,true],constructionDelay:[0,5,true],initialShare:[0,1],yearOneRamp:[0,1],
    spotPerHour:[0,100],reserveShare:[0,1],reservedPerHour:[0,100],annualPriceFactor:[.5,1.3],
    replacementYear:[0,30,true],contractYears:[0,30,true]},
  finance:{debtShare:[0,.95],debtRate:[0,.5],tenor:[0,30,true],reserveUSD:[0,1e8],minimumDSCR:[1,5],
    projectRate:[0,.8],equityRate:[0,.8]},
};

export function validateInfrastructure(input){
  if(input?.currency!=="scenario USD"||input.referenceYear!==2024||input.gpu!=="NVIDIA L40S")
    throw new RangeError("Use the registered 2024 scenario-dollar and L40S model boundary.");
  for(const [section,ranges] of Object.entries(RANGES)){
    for(const [key,[lo,hi,integer]] of Object.entries(ranges)){
      const v=input[section]?.[key];
      if(!finite(v)||v<lo||v>hi||(integer&&!Number.isInteger(v)))throw new RangeError("Invalid "+section+"."+key+".");
    }
  }
  const {capacity:c,operations:o,finance:f}=input;
  if(c.gpuIdleW>c.gpuLoadedW||c.gpus%c.gpusPerServer!==0)throw new RangeError("Verify device power and server divisibility.");
  if(o.replacementYear>o.years||o.contractYears>o.years||
     (f.debtShare>0&&(f.tenor===0||f.tenor>o.years))||
     (f.debtShare===0&&(f.tenor!==0||f.reserveUSD!==0)))throw new RangeError("Verify the operation and financing horizons.");
  return input;
}

export function capacityAt(input,ramp=1){
  validateInfrastructure(input);
  if(!finite(ramp)||ramp<0||ramp>1)throw new RangeError("Invalid commissioning ramp.");
  const {capacity:c,tariff:t,costs:cost,operations:o}=input;
  const servers=c.gpus/c.gpusPerServer;
  const racks=Math.ceil(servers/c.serversPerRack);
  const maxRackKW=Math.min(servers,c.serversPerRack)*(c.serverOtherKW+c.gpusPerServer*c.gpuLoadedW/1000);
  const installedGPUHours=c.gpus*HOURS, availableGPUHours=installedGPUHours*c.availability;
  const activeGPUHours=availableGPUHours*c.workFraction*ramp;
  const reservation=o.contractYears>0?o.reserveShare:0;
  const reservedGPUHours=availableGPUHours*reservation;
  // Available spot inventory excludes the reserved block during the contract.
  const spotGPUHours=availableGPUHours*(1-reservation)*c.billFraction*ramp;
  const idleITKW=servers*c.serverOtherKW+c.gpus*c.gpuIdleW/1000+c.sharedITKW;
  const peakITKW=idleITKW+c.gpus*(c.gpuLoadedW-c.gpuIdleW)/1000;
  const itKWh=idleITKW*HOURS+activeGPUHours*(c.gpuLoadedW-c.gpuIdleW)/1000;
  const facilityKWh=itKWh*c.pue, peakFacilityKW=peakITKW*c.pue;
  const peakKVA=peakFacilityKW/c.powerFactor, billingKVA=Math.max(peakKVA,c.contractKVA);
  const siteWaterM3=c.siteWue*itKWh/1000;
  const electricity={energy:facilityKWh*t.energyPerKWh,demand:billingKVA*t.demandPerKVAmonth*12,fixed:t.fixedPerMonth*12};
  electricity.total=sum(Object.values(electricity));
  return {servers,racks,maxRackKW,rackFeasible:maxRackKW<=c.rackLimitKW,installedGPUHours,availableGPUHours,activeGPUHours,
    reservedGPUHours,spotGPUHours,billableGPUHours:reservedGPUHours+spotGPUHours,idleITKW,peakITKW,itKWh,peakFacilityKW,
    facilityKWh,peakKVA,billingKVA,siteWaterM3,electricity,waterCost:siteWaterM3*t.waterPerM3,
    activeCost:activeGPUHours*cost.variablePerActiveHour};
}

export function discounted(values,rate){
  if(!finite(rate)||rate<=-1||!Array.isArray(values)||!values.every(finite))throw new RangeError("Invalid discounted series.");
  return sum(values.map((cash,year)=>cash/(1+rate)**year));
}
export function returnRate(cash){
  const signs=cash.filter(x=>x!==0).map(Math.sign);
  const flips=signs.slice(1).filter((x,i)=>x!==signs[i]).length;
  if(flips===0)return {status:"no sign change",value:null};
  if(flips>1)return {status:"multiple sign changes",value:null};
  let lo=-.95,hi=8;
  const left=discounted(cash,lo),right=discounted(cash,hi);
  if(Math.sign(left)===Math.sign(right))return {status:"outside search domain",value:null};
  for(let i=0;i<85;i++){
    const mid=(lo+hi)/2;
    if(Math.sign(discounted(cash,mid))===Math.sign(left))lo=mid;
    else hi=mid;
  }
  return {status:"unique bracketed root",value:(lo+hi)/2};
}
function payback(cash,rate){
  let running=0, answer=null;
  for(const [i,current] of cash.entries()){
    const flow=current/(1+rate)**i;
    if(running<0&&running+flow>=0&&flow>0)answer=i-1-running/flow;
    running+=flow;
    if(running<0&&flow<0)answer=null;
  }
  return answer;
}
export function capitalLedger(input){
  const {costs:c,capacity:{gpus}}=input;
  const capital={civil:c.civil,electrical:c.electrical,cooling:c.cooling,gpu:c.gpuPerDevice*gpus,
    network:c.network,professional:c.professional};
  return {...capital,total:sum(Object.values(capital))};
}

export function project(input,{returns=true}={}){
  validateInfrastructure(input);
  const {costs:c,operations:o,finance:f}=input;
  const physical=capacityAt(input);
  const capital=capitalLedger(input);
  const loan=capital.total*f.debtShare;
  const payment=!loan?0:f.debtRate===0?loan/f.tenor:loan*f.debtRate/(-Math.expm1(-f.tenor*Math.log1p(f.debtRate)));
  let outstanding=0,reserve=0,defaultYear=null;
  const timeline=[];
  for(let year=0;year<=o.constructionDelay+o.years;year++){
    const operatingYear=year-o.constructionDelay;
    const online=operatingYear>0,commission=operatingYear===0,last=operatingYear===o.years;
    const capex=o.constructionDelay===0?(commission?capital.total:0):
      year===0?capital.total*o.initialShare:commission?capital.total*(1-o.initialShare):0;
    const wc=commission?-c.workingCapital:last?c.workingCapital:0;
    const debtDraw=commission?loan:0;
    const reserveFunding=commission?f.reserveUSD:0;
    reserve+=reserveFunding;
    outstanding+=debtDraw;
    let revenue=0,billed=0,operatingCosts=0,replacement=0,interest=0,principal=0;
    if(online){
      const ramp=operatingYear===1?o.yearOneRamp:1;
      const inContract=operatingYear<=o.contractYears;
      const model=inContract?input:{...input,operations:{...o,reserveShare:0}};
      const load=capacityAt(model,ramp);
      billed=load.billableGPUHours;
      revenue=load.spotGPUHours*o.spotPerHour*o.annualPriceFactor**(operatingYear-1)+load.reservedGPUHours*o.reservedPerHour;
      operatingCosts=load.electricity.total+load.waterCost+load.activeCost+c.annualFixed;
      replacement=operatingYear===o.replacementYear?input.capacity.gpus*c.replacementPerGPU:0;
    }
    if(online&&operatingYear<=f.tenor&&outstanding>0){
      interest=outstanding*f.debtRate;
      principal=operatingYear===f.tenor?outstanding:Math.min(outstanding,payment-interest);
      outstanding-=principal;
    }
    const debtService=interest+principal;
    const ebitda=revenue-operatingCosts, cfads=ebitda-replacement;
    const terminal=last?c.residual-c.decommission:0;
    const projectCash=cfads-capex+wc+terminal;
    const equityCash=projectCash+debtDraw-debtService-reserveFunding;
    // A restricted reserve is drawn only against scheduled debt after other operating cash needs.
    const debtCash=Math.max(0,cfads+(last?Math.max(0,wc+terminal):0));
    const reserveDraw=Math.min(reserve,Math.max(0,debtService-debtCash));
    reserve-=reserveDraw;
    const paymentGap=Math.max(0,debtService-debtCash-reserveDraw);
    if(paymentGap>1e-7&&defaultYear===null)defaultYear=year;
    const reserveRelease=last?reserve:0;
    reserve-=reserveRelease;
    const scheduledEquity=equityCash+reserveDraw+reserveRelease;
    timeline.push({year,operatingYear,capex,workingCapital:wc,revenue,billed,operatingCosts,replacement,ebitda,cfads,terminal,
      projectCash,debtDraw,interest,principal,debtService,debtBalance:outstanding,reserveFunding,reserveDraw,reserveRelease,
      reserveBalance:reserve,paymentGap,additionalEquityRequired:online?Math.max(0,-scheduledEquity):0,
      equityCash:scheduledEquity,dscr:debtService>0?cfads/debtService:null});
  }
  const cash=timeline.map(row=>row.projectCash),equity=timeline.map(row=>row.equityCash);
  const dscr=timeline.map(row=>row.dscr).filter(x=>x!==null);
  const billed=discounted(timeline.map(row=>row.billed),f.projectRate);
  const lifecycleCosts=timeline.map(row=>row.capex+row.operatingCosts+row.replacement-row.workingCapital-row.terminal);
  const funding={uses:capital.total+c.workingCapital+f.reserveUSD,debt:loan,
    equity:capital.total+c.workingCapital+f.reserveUSD-loan};
  return {physical,capital,funding,timeline,metrics:{projectNPV:discounted(cash,f.projectRate),equityNPV:discounted(equity,f.equityRate),
    projectIRR:returns?returnRate(cash):null,equityIRR:returns?returnRate(equity):null,
    payback:payback(cash,0),discountedPayback:payback(cash,f.projectRate),
    costPerBillableHour:billed>0?discounted(lifecycleCosts,f.projectRate)/billed:null,
    minDSCR:dscr.length?Math.min(...dscr):null,averageDSCR:dscr.length?sum(dscr)/dscr.length:null,
    covenantBreaches:dscr.filter(x=>x<f.minimumDSCR).length,firstPaymentGapYear:defaultYear,
    unmetPayments:sum(timeline.map(row=>row.paymentGap)),additionalEquity:sum(timeline.map(row=>row.additionalEquityRequired))}};
}

export function withSettings(input,settings){
  return {...input,...Object.fromEntries(Object.entries(settings).map(([name,patch])=>[name,{...input[name],...patch}]))};
}
export function breakEven(input,section,key,lo,hi){
  const at=value=>project(withSettings(input,{[section]:{[key]:value}}),{returns:false}).metrics.projectNPV;
  let left=at(lo);
  const right=at(hi);
  if(right===left)return {value:null,status:"flat over interval"};
  if(left===0)return {value:lo,status:"bracketed"};
  if(right===0)return {value:hi,status:"bracketed"};
  if(Math.sign(left)===Math.sign(right))return {value:null,status:"no root in interval"};
  for(let i=0;i<62;i++){
    const mid=(lo+hi)/2;
    const current=at(mid);
    if(current===0)return {value:mid,status:"bracketed"};
    if(Math.sign(current)===Math.sign(left)){lo=mid;left=current;}
    else hi=mid;
  }
  return {value:(lo+hi)/2,status:"bracketed"};
}

export function feasibleFrontier(input,options,limits){
  if(![limits.capital,limits.peakKVA,limits.siteWaterM3,limits.minimumDSCR].every(x=>finite(x)&&x>=0)||
      !Array.isArray(options)||options.length>64)throw new RangeError("Invalid bounded decision set.");
  const candidates=options.map(({id,settings})=>{
    const p=project(withSettings(input,settings),{returns:false});
    const {capital,physical,metrics}=p;
    const failures=[];
    if(capital.total>limits.capital)failures.push("capital");
    if(physical.peakKVA>limits.peakKVA)failures.push("electrical");
    if(physical.siteWaterM3>limits.siteWaterM3)failures.push("water");
    if(!physical.rackFeasible)failures.push("rack");
    if(metrics.minDSCR!==null&&metrics.minDSCR<limits.minimumDSCR)failures.push("coverage");
    if(metrics.firstPaymentGapYear!==null)failures.push("liquidity");
    return {id,failures,capital:capital.total,peakKVA:physical.peakKVA,siteWaterM3:physical.siteWaterM3,minDSCR:metrics.minDSCR,
      costPerBillableHour:metrics.costPerBillableHour,projectNPV:metrics.projectNPV};
  });
  const usable=candidates.filter(x=>x.failures.length===0&&x.costPerBillableHour!==null);
  const objectives=["siteWaterM3","costPerBillableHour","peakKVA"];
  const frontier=usable.filter(a=>!usable.some(b=>
    objectives.every(k=>b[k]<=a[k])&&objectives.some(k=>b[k]<a[k]))).map(x=>x.id);
  return {candidates,frontier};
}
