import assert from "node:assert/strict";
import test from "node:test";
import {barter,production,reconcileResources,stockGini,useAndStore} from "../engine/resources.mjs";
import {createWorld,runWorld,materialChoice} from "../engine/civilizations.mjs";

test("comparative advantage hand fixture yields reciprocal consumption gains",()=>{
  assert.deepEqual(production([4,2],2,1),[4,2]);
  assert.deepEqual(production([2,4],2,1),[2,4]);
  const first=production([4,2],2,2),second=production([2,4],2,0);
  barter(first,second,0,4,true);
  assert.deepEqual(first,[4,4]);
  assert.deepEqual(second,[4,4]);
  assert.deepEqual(reconcileResources([0,0],[8,8],[0,0],[0,0],[first,second]),[8,8]);
  assert.throws(()=>production([4,2],2,3),RangeError);
});

test("delivery failure conserves the prepayment and invalid barter leaves both accounts intact",()=>{
  const payer=[6,1],supplier=[1,6];
  assert.throws(()=>barter(payer,supplier,0,7,true),RangeError);
  assert.deepEqual(payer,[6,1]);
  assert.deepEqual(supplier,[1,6]);
  barter(payer,supplier,0,2,false);
  assert.deepEqual(payer,[4,1]);
  assert.deepEqual(supplier,[3,6]);
  assert.deepEqual(reconcileResources([7,7],[0,0],[0,0],[0,0],[payer,supplier]),[7,7]);
  assert.deepEqual(useAndStore([20,2]),{consumed:[3,2],stored:[10,0],loss:[7,0]});
  assert.equal(stockGini([0,0]),0);
  assert.equal(stockGini([0,4]),0.5);
});

test("world treatments replay one schedule with bounded state and exact cumulative balances",()=>{
  const world=createWorld(42779,"stress",24);
  const original=structuredClone(world);
  const pooled=runWorld(world,"pooled",true);
  assert.deepEqual(runWorld(world,"pooled",true),pooled);
  assert.deepEqual(world,original);
  assert.equal(pooled.timeline.length,24);
  assert.ok(pooled.timeline.every(day=>day.population.every(row=>row.stock.every(x=>x>=0&&x<=10))));
  assert.equal(runWorld(world,"autarky").metric.exchangeVolume,0);
  const {initial,produced,consumed,losses,terminal}=pooled.accounting;
  assert.deepEqual(terminal,initial.map((x,i)=>x+produced[i]-consumed[i]-losses[i]));
});

test("decisions receive prior evidence and their own draw while supplier outcomes stay hidden",()=>{
  const world=createWorld(568125,"stress",12);
  const seen=[];
  runWorld(world,"unaware",false,context=>{
    seen.push(context);
    return materialChoice(context);
  });
  assert.ok(seen.length>0);
  assert.ok(seen.every(row=>row.belief===0.75&&row.observedAttempts===0&&
    !Object.hasOwn(row,"deliveryDraw")&&!Object.hasOwn(row,"reliability")));
  assert.equal(materialChoice({buyerGain:0,choiceDraw:0.3}),true);
  assert.equal(materialChoice({buyerGain:0,choiceDraw:0.6}),false);
});
