import {computeDemand} from "./artha.mjs";
import {project} from "./energia.mjs";

const CAPEX=["civil","electrical","cooling","gpu","network","professional"];
const sum=xs=>xs.reduce((n,x)=>n+x,0);

export function mapProcurement(capital,model,mapping,grade){
  const {data}=model;
  if(mapping.schemaVersion!=="nexus-map-v1"||mapping.id!=="nexus-capital-2024-v1"||
    mapping.sourceId!==data.sourceId||mapping.year!==data.year||mapping.year!==2024||
    mapping.currency!=="scenario USD"||mapping.arthaUnits!==data.units||
    data.resolution!=="source"||!Number.isFinite(grade)||grade<0||grade>1){
    throw new RangeError("Procurement needs the matching detailed 2024 producer-value model and a bounded share.");
  }
  const fields=mapping.categories.map(row=>row.capitalKey);
  if(fields.length!==CAPEX.length||CAPEX.some(x=>fields.filter(y=>y===x).length!==1)||
    !CAPEX.every(key=>Number.isFinite(capital[key])&&capital[key]>=0)||
    !Number.isFinite(capital.total)||Math.abs(sum(CAPEX.map(key=>capital[key]))-capital.total)>1e-7){
    throw new RangeError("Capital items must be disjoint and reconcile with the total.");
  }
  const index=new Map(data.industries.map(({code},i)=>[code,i]));
  const demand=data.industries.map(()=>0);
  const lines=mapping.categories.map(({capitalKey,industry,lower,higher,justification})=>{
    if(!Number.isFinite(lower)||!Number.isFinite(higher)||lower<0||higher>1||lower>higher||
       (capitalKey==="gpu"&&(industry!==null||lower!==0||higher!==0))||
       (capitalKey!=="gpu"&&!index.has(industry))){
      throw new RangeError("Invalid sector assignment or direct-import share.");
    }
    const amount=capital[capitalKey];
    const share=lower+grade*(higher-lower);
    const domestic=amount*share;
    const imported=amount-domestic;
    if(industry!==null)demand[index.get(industry)]+=domestic/1e6;
    return {capitalKey,industry,justification,amount,share,domestic,imported};
  });
  const domestic=sum(lines.map(line=>line.domestic));
  const directImports=sum(lines.map(line=>line.imported));
  if(Math.abs(domestic+directImports-capital.total)>1e-7||Math.abs(sum(demand)*1e6-domestic)>1e-7)
    throw new Error("Capital and demand mapping do not reconcile.");
  return {lines,domestic,directImports,demand};
}

export function integrateInfrastructure(input,model,mapping,grade){
  if(input.referenceYear!==mapping.year||input.currency!==mapping.currency)throw new RangeError("Incompatible spending reference period or currency.");
  const finance=project(input,{returns:false});
  const procurement=mapProcurement(finance.capital,model,mapping,grade);
  const economic=computeDemand(model,procurement.demand);
  const supplierLinks=procurement.demand.flatMap((spent,buyer)=>{
    if(spent===0)return [];
    return model.A.flatMap((row,supplier)=>{
      const value=row[buyer]*spent;
      return value>0?[{supplier:model.data.industries[supplier].code,buyer:model.data.industries[buyer].code,value}]:[];
    });
  }).sort((a,b)=>b.value-a.value);
  const power=finance.physical;
  const steadyOperatingYear=Math.min(2,input.operations.years);
  const operating=finance.timeline.find(row=>row.operatingYear===steadyOperatingYear);
  return {procurement,economic,supplierLinks,physical:{gpus:input.capacity.gpus,pue:input.capacity.pue,siteWue:input.capacity.siteWue,
      energyKWh:power.facilityKWh,waterM3:power.siteWaterM3,peakKVA:power.peakKVA,
      contractBillableHours:power.billableGPUHours,electricity:power.electricity.total},
    finance:{capex:finance.capital.total,projectNPV:finance.metrics.projectNPV,equityNPV:finance.metrics.equityNPV,
      costPerBillableHour:finance.metrics.costPerBillableHour,minDSCR:finance.metrics.minDSCR,
      firstPaymentGapYear:finance.metrics.firstPaymentGapYear,operatingYear:steadyOperatingYear,
      operatingCosts:operating.operatingCosts,revenue:operating.revenue}};
}
