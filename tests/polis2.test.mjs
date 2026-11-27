import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,runWorld} from "../engine/civilizations.mjs";
import {jointChoice,failureSensitiveChoice} from "../engine/polis.mjs";
import {expectedGains,settleOffer,runRobustWorld,runPolis2} from "../engine/polis2.mjs";

test("POLIS 2.0 uses distinct exact expected payoffs for the two contracts",()=>{
  assert.deepEqual(expectedGains("prepay",2,1,2,2),{payer:-2,supplier:8,denominator:2});
  assert.deepEqual(expectedGains("delivery",2,1,2,2),{payer:2,supplier:2,denominator:2});
  assert.deepEqual(expectedGains("delivery",3,3,4),{payer:0,supplier:0,denominator:4});
  assert.equal(expectedGains("prepay",2,2,3).payer,0);
  assert.throws(()=>expectedGains("delivery",2,4,3),RangeError);
});

test("POLIS 2.0 prepayment and atomic delivery settle exactly",()=>{
  const a=[6,1],b=[1,6];
  assert.equal(settleOffer(a,b,0,2,"delivery",false),0);
  assert.deepEqual([a,b],[[6,1],[1,6]]);
  assert.equal(settleOffer(a,b,0,2,"delivery",true),4);
  assert.deepEqual([a,b],[[4,3],[3,4]]);
  assert.equal(settleOffer(a,b,0,2,"prepay",false),2);
  assert.deepEqual([a,b],[[2,3],[5,4]]);
  assert.throws(()=>settleOffer(a,b,0,3,"delivery",true),RangeError);
  assert.deepEqual([a,b],[[2,3],[5,4]]);
});

test("POLIS 2.0 reproduces v1 physical outcomes with original terms and preserves the shared world",()=>{
  for(const seed of [7991,37541,987602104]){
    const world=createWorld(seed,"stress",24);
    const original=structuredClone(world);
    for(const [name,visibility,choose] of [
      ["material","pooled",undefined],["joint","pooled",jointChoice],["fixedPrior","unaware",undefined],
      ["cautious","pooled",failureSensitiveChoice],
    ]){
      const previous=runWorld(world,visibility,false,choose);
      const next=runRobustWorld(world,"prepay",2,name);
      assert.deepEqual(next.intake,previous.received);
      assert.deepEqual(next.accounting,previous.accounting);
      assert.equal(next.metric.completed,previous.metric.deliveries);
    }
    assert.deepEqual(world,original);
  }
});

test("POLIS 2.0 produces the prescribed equality under contingent delivery",()=>{
  const result=runPolis2({seed:7129,trials:3,steps:24,climate:"stress"});
  for(const cell of result.cells.filter(cell=>cell.payment==="delivery")){
    assert.equal(cell.contrast.estimate,0);
    assert.equal(cell.sameJointFixed,3);
    assert.equal(cell.policies.joint.losingAgents.estimate,0);
    assert.equal(cell.policies.joint.meanLossAmongLosers,null);
  }
});
