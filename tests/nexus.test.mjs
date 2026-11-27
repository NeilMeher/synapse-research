import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {prepareEconomy} from "../engine/artha.mjs";
import {withSettings} from "../engine/energia.mjs";
import {integrateInfrastructure,mapProcurement} from "../engine/nexus.mjs";

const json=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url)));
const national=json("data/processed/artha-india.json");
const mapping=json("data/processed/nexus-capital-map.json");
const economy=prepareEconomy(national.panels["2024"]);
const facility=json("experiments/energia-scenario.json").base;
const capital={civil:100,electrical:150,cooling:100,gpu:500,network:100,professional:50,total:1000};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+" != "+b);

test("NEXUS reconciles unique domestic final purchases and direct imports",()=>{
  const low=mapProcurement(capital,economy,mapping,0);
  near(low.domestic,300);
  near(low.directImports,700);
  near(low.demand[economy.data.industries.findIndex(x=>x.code==="c14")],.000115);
  assert.deepEqual(low.lines.filter(x=>x.industry===null).map(x=>[x.capitalKey,x.domestic,x.imported]),[["gpu",0,500]]);
  for(const grade of [0,.5,1]){
    const x=mapProcurement(capital,economy,mapping,grade);
    near(x.domestic+x.directImports,1000);
    near(x.demand.reduce((a,b)=>a+b,0)*1e6,x.domestic);
  }
});

test("NEXUS procurement changes sector demand while efficiency changes only physical and finance outputs",()=>{
  const base=integrateInfrastructure(facility,economy,mapping,0);
  const local=integrateInfrastructure(facility,economy,mapping,1);
  const efficient=integrateInfrastructure(withSettings(facility,{capacity:{pue:1.3,siteWue:.25}}),economy,mapping,0);
  assert.deepEqual(base.physical,local.physical);
  assert.deepEqual(base.finance,local.finance);
  assert.ok(local.economic.totals.output>base.economic.totals.output);
  assert.deepEqual(base.economic,efficient.economic);
  assert.deepEqual(base.procurement,efficient.procurement);
  assert.ok(efficient.physical.energyKWh<base.physical.energyKWh);
  assert.ok(efficient.finance.projectNPV>base.finance.projectNPV);
  near(base.supplierLinks.reduce((total,line)=>total+line.value,0),base.economic.totals.firstRound);
});

test("NEXUS refuses duplicate categories, inconsistent units and domestic accelerator allocations",()=>{
  const original=structuredClone(mapping);
  original.categories.find(x=>x.capitalKey==="gpu").higher=.5;
  assert.throws(()=>mapProcurement(capital,economy,original,1),RangeError);
  assert.throws(()=>mapProcurement({...capital,total:1100},economy,mapping,0),RangeError);
  assert.throws(()=>mapProcurement(capital,prepareEconomy(national.panels["2023"]),mapping,1),RangeError);
  assert.throws(()=>integrateInfrastructure({...facility,currency:"INR"},economy,mapping,1),RangeError);
  assert.throws(()=>mapProcurement(capital,economy,{...mapping,categories:[...mapping.categories,mapping.categories[0]]},1),RangeError);
});
