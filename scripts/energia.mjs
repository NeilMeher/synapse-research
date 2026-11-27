import {readFileSync} from "node:fs";
import {breakEven,discounted,feasibleFrontier,project,withSettings} from "../engine/energia.mjs";
import {runScenario} from "./run-scenario.mjs";

const provenance="sources/energia-l40s-design.json",schema="schemas/energia-v1.json";
const data=JSON.parse(readFileSync(new URL("../"+provenance,import.meta.url)));

function scenario(config){
  if(config.sourceId!==data.id)throw new Error("Unregistered engineering source.");
  const {base,sensitivity,optimization}=config;
  const cases=config.cases.map(({id,settings})=>({id,settings,...project(withSettings(base,settings))}));
  const grid=(left,right,settings)=>left.flatMap(x=>right.map(y=>{
    const {metrics}=project(withSettings(base,settings(x,y)),{returns:false});
    return {x,y,projectNPV:metrics.projectNPV,equityNPV:metrics.equityNPV,minDSCR:metrics.minDSCR,
      firstPaymentGapYear:metrics.firstPaymentGapYear};
  }));
  const {billFraction,energyPerKWh,spotPerHour,debtRate,gpuPerDevice}=sensitivity;
  const grids={
    utilizationEnergy:grid(billFraction,energyPerKWh,(x,y)=>({capacity:{billFraction:x},tariff:{energyPerKWh:y}})),
    utilizationRevenue:grid(billFraction,spotPerHour,(x,y)=>({capacity:{billFraction:x},operations:{spotPerHour:y}})),
    debtHardware:grid(debtRate,gpuPerDevice,(x,y)=>({finance:{debtRate:x},costs:{gpuPerDevice:y}})),
  };
  const roots=Object.fromEntries([["capacity","billFraction"],["tariff","energyPerKWh"],["operations","spotPerHour"]].map(([section,key])=>
    [key,breakEven(base,section,key,...config.breakEven[key])]));
  const timeline=cases[0].timeline;
  const profile=config.profile.map(rate=>({rate,projectNPV:discounted(timeline.map(row=>row.projectCash),rate),
    equityNPV:discounted(timeline.map(row=>row.equityCash),rate)}));
  return {schemaVersion:"energia-v1",modelVersion:"modular-l40s-project-finance-v1",evidenceClass:"Illustrative deterministic scenarios",
    dataset:{id:data.id,vintage:data.vintage,retrievalDate:data.retrievalDate,units:data.units},config,cases,grids,roots,profile,
    optimization:feasibleFrontier(base,optimization.options,optimization.limits),
    infeasibleControl:feasibleFrontier(base,optimization.options,optimization.controlLimits)};
}
runScenario("energia",scenario,["scripts/energia.mjs","scripts/reference_energia.py","engine/energia.mjs",provenance,
  "research/energia-sources.md",schema,"schemas/source-v1.json"],process.argv[2]);
