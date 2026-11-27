import assert from "node:assert/strict";
import test from "node:test";
import {aggregateEconomy,computeDemand,demandForGroup,prepareEconomy,solveLinear} from "../engine/artha.mjs";

const fixture={
  sourceId:"hand",units:"USD mn",year:2024,tolerance:1e-8,
  industries:[{code:"a",name:"A"},{code:"b",name:"B"}],
  output:[100,100],transactions:[[10,20],[30,0]],finalDemand:[70,70],imports:[10,30],
  valueAdded:[50,50],adjustments:[0,0],
};
function close(a,b){assert.ok(Math.abs(a-b)<1e-10,String(a)+" != "+b);}

test("ARTHA solves the oriented rational two-sector circular dependency",()=>{
  const model=prepareEconomy(fixture);
  assert.deepEqual(model.A,[[.1,.2],[.3,0]]);
  const result=computeDemand(model,[10,0]);
  close(result.output[0],250/21);
  close(result.output[1],75/21);
  close(result.totals.indirect,115/21);
  close(result.totals.valueAdded,325/42);
  close(result.totals.importedInputs,47.5/21);
  assert.deepEqual(result.firstRound,[1,3]);
  assert.ok(model.diagnostics.spectralUpper<1);
});

test("ARTHA checks zero shocks, one-directional and no dependencies",()=>{
  assert.deepEqual(computeDemand(prepareEconomy(fixture),[0,0]).output,[0,0]);
  const none=prepareEconomy({...fixture,transactions:[[0,0],[0,0]],finalDemand:[100,100],valueAdded:[90,70]});
  assert.deepEqual(computeDemand(none,[1,2]).output,[1,2]);
  const chain=prepareEconomy({...fixture,transactions:[[0,20],[0,0]],finalDemand:[80,100],valueAdded:[90,50]});
  assert.deepEqual(computeDemand(chain,[0,10]).output,[2,10]);
});

test("ARTHA rejects singular, nearly singular, zero gross output and invalid totals",()=>{
  assert.throws(()=>solveLinear([[1,1],[1,1]],[1,2]),RangeError);
  assert.throws(()=>solveLinear([[1,1],[1,1+1e-14]],[1,2]),RangeError);
  assert.throws(()=>prepareEconomy({...fixture,output:[0,100]}),RangeError);
  assert.throws(()=>prepareEconomy({...fixture,finalDemand:[70,71]}),RangeError);
});

test("ARTHA aggregates source flows before forming coefficients",()=>{
  const grouped=aggregateEconomy(fixture,[{code:"total",name:"Total",members:["b","a"]}]);
  assert.deepEqual(grouped.transactions,[[60]]);
  assert.deepEqual(grouped.output,[200]);
  close(prepareEconomy(grouped).A[0][0],.3);
  assert.deepEqual(demandForGroup(fixture,["a","b"],10),[5,5]);
  assert.throws(()=>aggregateEconomy(fixture,[{code:"a",name:"A",members:["a"]}]),RangeError);
});
