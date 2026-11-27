import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {breakEven,capacityAt,discounted,feasibleFrontier,project,returnRate,withSettings} from "../engine/energia.mjs";

const config=JSON.parse(readFileSync(new URL("../experiments/energia-scenario.json",import.meta.url)));
const base=config.base;
const near=(actual,expected,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<=tolerance,actual+" != "+expected);
const change=settings=>withSettings(base,settings);

test("ENERGIA distinguishes device, rack, IT, energy and utility boundaries",()=>{
  const p=capacityAt(base);
  near(p.idleITKW,27.72);
  near(p.peakITKW,60.36);
  near(p.maxRackKW,13.84);
  const zero=capacityAt(change({capacity:{workFraction:0,billFraction:0},operations:{reserveShare:0}}));
  assert.equal(zero.activeGPUHours,0);
  assert.equal(zero.billableGPUHours,0);
  near(zero.itKWh,27.72*8760);
  const full=capacityAt(change({capacity:{workFraction:1,billFraction:1,availability:1}}));
  near(full.itKWh,60.36*8760);
  near(full.facilityKWh,full.itKWh*1.42);
  near(full.siteWaterM3,full.itKWh*.55/1000);
  near(full.billingKVA,100);
  near(full.electricity.total,full.facilityKWh*.095+12000+4800);
  const noEnergy=capacityAt(change({tariff:{energyPerKWh:0}}));
  near(noEnergy.electricity.total,16800);
});

test("ENERGIA separates billed reservation from workload and releases expiring capacity",()=>{
  const off=capacityAt(change({capacity:{workFraction:0}}));
  assert.ok(off.billableGPUHours>0);
  const none=capacityAt(change({operations:{contractYears:0}}));
  assert.equal(none.reservedGPUHours,0);
  near(none.spotGPUHours,none.availableGPUHours*.66);
  const result=project(change({operations:{contractYears:1}}));
  assert.ok(result.timeline[1].billed<result.timeline[2].billed);
});

test("ENERGIA reconciles funding, principal, zero-rate debt and no-debt coverage",()=>{
  const price=project(base), {funding,capital}=price;
  near(capital.total,1936000);
  near(funding.debt+funding.equity,funding.uses);
  near(price.timeline.reduce((n,row)=>n+row.principal,0),funding.debt);
  assert.equal(price.timeline.at(-1).debtBalance,0);
  const zero=project(change({finance:{debtRate:0}}));
  for(const row of zero.timeline.slice(1,7)){
    near(row.principal,zero.funding.debt/6);
    assert.equal(row.interest,0);
  }
  const noDebt=project(change({finance:{debtShare:0,tenor:0,reserveUSD:0}}));
  assert.equal(noDebt.metrics.minDSCR,null);
  assert.equal(noDebt.timeline.every(row=>row.debtService===0&&row.dscr===null),true);
  assert.equal(noDebt.metrics.projectNPV,price.metrics.projectNPV);
});

test("ENERGIA exposes timing, replacement costs, reserve and uncovered obligations",()=>{
  const delay=project(change({operations:{constructionDelay:1,replacementYear:8}}));
  near(delay.timeline[0].capex,delay.capital.total*.45);
  assert.equal(delay.timeline[0].debtDraw,0);
  assert.equal(delay.timeline[1].debtDraw,delay.funding.debt);
  assert.equal(delay.timeline[1].revenue,0);
  assert.equal(delay.timeline.at(-1).replacement,768000);
  const cash=project(change({capacity:{billFraction:0},operations:{spotPerHour:0,reservedPerHour:0}}));
  assert.ok(cash.timeline[1].reserveDraw>0);
  assert.equal(cash.metrics.firstPaymentGapYear,1);
  assert.ok(cash.metrics.additionalEquity>0);
  assert.ok(cash.metrics.unmetPayments>0);
});

test("ENERGIA verifies simple NPV, IRR ambiguity and break-even roots",()=>{
  near(discounted([-100,60,60],.10),4.13223140495867);
  near(returnRate([-100,110]).value,.10);
  assert.equal(returnRate([1,2]).value,null);
  assert.deepEqual(returnRate([-100,230,-132]),{status:"multiple sign changes",value:null});
  const root=breakEven(base,"operations","spotPerHour",0,3);
  assert.equal(root.status,"bracketed");
  near(project(change({operations:{spotPerHour:root.value}})).metrics.projectNPV,0);
  const low=project(change({tariff:{energyPerKWh:.05}})).metrics.projectNPV;
  const high=project(change({tariff:{energyPerKWh:.25}})).metrics.projectNPV;
  assert.ok(low>high);
});

test("ENERGIA limits optimization and invalid units or horizons",()=>{
  const options=config.optimization.options;
  const frontier=feasibleFrontier(base,options,config.optimization.limits);
  assert.ok(frontier.candidates.find(x=>x.id==="higher-density").failures.includes("rack"));
  const impossible=feasibleFrontier(base,options,config.optimization.controlLimits);
  assert.deepEqual(impossible.frontier,[]);
  for(const settings of [{capacity:{gpuLoadedW:351}},{capacity:{gpus:127}},{capacity:{pue:.9}},
      {operations:{replacementYear:9}},{finance:{tenor:9}},{finance:{debtShare:0}}]){
    assert.throws(()=>project(change(settings)),RangeError);
  }
  assert.throws(()=>project({...base,currency:"INR"}),RangeError);
});
