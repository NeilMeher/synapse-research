import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {comparePrecision,describeSeries,fiscalPeriod,growthAssociation,observation,slowerShare,spanSummary,syntheticDifferences} from "../engine/chronos.mjs";

const data=JSON.parse(readFileSync(new URL("../data/processed/chronos-rail.json",import.meta.url)));
const cell=(value,coverage="same")=>({value,coverage});
const line=(f,through,a,b,scope)=>({period:fiscalPeriod(f,through),cells:{route:cell(a,scope),electric:cell(b,scope)}});

test("valid Indian fiscal calendar and strict cutoff",()=>{
  assert.deepEqual(fiscalPeriod("1999–00"),{label:"1999-00",start:"1999-04-01",end:"2000-03-31",endYear:2000,complete:true});
  assert.equal(fiscalPeriod("2025-26","2025-11-30").complete,false);
  assert.throws(()=>fiscalPeriod("2025-27"),RangeError);
  assert.throws(()=>fiscalPeriod("2025-26","2025-11-31"),RangeError);
});

test("historical growth skips sparse and partial periods and mismatched coverage",()=>{
  const rows=[line("2018-19",null,40,10),line("2020-21",null,50,25),
    line("2021-22",null,100,60),line("2022-23","2022-11-30",120,65),line("2023-24",null,130,81,"changed")];
  const described=describeSeries(rows,"route",2021);
  assert.deepEqual(described.map(x=>x.growth),[null,null,100,null,null]);
  assert.deepEqual(described.map(x=>x.index),[80,100,200,null,null]);
  assert.equal(spanSummary(described,2021,2024),null);
  assert.ok(Math.abs(spanSummary(described,2019,2021).cagr-11.80339887498949)<1e-12);
  assert.throws(()=>describeSeries(rows.slice().reverse(),"route",2019),RangeError);
});

test("derived measures require compatible scope and positive denominators",()=>{
  const record=line("2024-25",null,100,75);
  assert.equal(observation(record,"share").value,75);
  record.cells.route=cell(100,"different");
  assert.equal(observation(record,"share"),null);
  record.cells.route=cell(0);
  assert.equal(observation(record,"share"),null);
  record.cells.tonnes=cell(80);
  record.cells.ntkm=cell(40);
  assert.equal(observation(record,"lead").value,500);
});

test("late primary and regional values preserve rounded coverage and original boundaries",()=>{
  const final=data.national.at(-1);
  assert.equal(final.cells.route.value,69439);
  assert.equal(final.cells.electric.value,65510);
  assert.equal(final.cells.ntkm.value,971.085);
  assert.equal(comparePrecision(65510,68700,1,1000).status,"unresolved difference");
  assert.equal(comparePrecision(69439,69440,2,1000).status,"consistent after rounding");
  const before=data.regions.find(r=>r.year===2013&&r.name==="Andhra Pradesh");
  assert.match(before.boundary,/includes Telangana/);
  assert.equal(data.regions.find(r=>r.year===2013&&r.name==="Telangana").value,null);
  assert.equal(data.regions.find(r=>r.year===2014&&r.name==="Telangana").value,1753);
});

test("matched association and conditional scenarios preserve separation from measured data",()=>{
  const a=describeSeries(data.national,"electric",2016), b=describeSeries(data.national,"ntkm",2016);
  const recent=x=>x.filter(row=>row.period.endYear>=2017);
  assert.equal(growthAssociation(recent(a),recent(b)).n,9);
  assert.equal(growthAssociation(a.slice(0,2),b.slice(0,2)).pearson,null);
  const shares=describeSeries(data.national,"share",2016);
  const whatIf=slowerShare(shares,.5), unchanged=slowerShare(shares,1);
  assert.equal(whatIf[0].scenario,whatIf[0].observed);
  assert.ok(whatIf.at(-1).scenario<whatIf.at(-1).observed);
  assert.equal(unchanged.at(-1).scenario,unchanged.at(-1).observed);
});

test("synthetic treated contrasts separate effects, trend bias and interference",()=>{
  const clean=syntheticDifferences({heterogeneity:3});
  assert.equal(clean.did,4);
  assert.equal(clean.truth,4);
  assert.equal(clean.beforeAfter,7);
  assert.equal(clean.crossSection,12);
  assert.equal(syntheticDifferences({trendGap:3}).did,7);
  assert.equal(syntheticDifferences({anticipation:2}).did,2);
  assert.equal(syntheticDifferences({spillover:2}).did,2);
});
