import assert from "node:assert/strict";
import test from "node:test";
import {createWorld,materialChoice,runWorld} from "../engine/civilizations.mjs";
import {compareIntake,failureSensitiveChoice,jointChoice,runPolis} from "../engine/polis.mjs";

test("AXIOM-derived acceptance distinguishes material gain, joint gain and past failure",()=>{
  const context={buyerGain:-1,supplierGain:2,choiceDraw:.2,observedAttempts:1,observedDeliveries:0};
  assert.equal(materialChoice(context),false);
  assert.equal(jointChoice(context),true);
  assert.equal(failureSensitiveChoice({...context,buyerGain:1}),false);
  assert.equal(failureSensitiveChoice({...context,buyerGain:1,observedDeliveries:1}),true);
});

test("joint welfare and fixed prior take identical physical actions in the registered environment",()=>{
  const world=createWorld(990022,"stress",24);
  const before=structuredClone(world);
  const joint=runWorld(world,"pooled",true,jointChoice);
  const fixed=runWorld(world,"unaware",true);
  assert.deepEqual(joint.received,fixed.received);
  assert.deepEqual(joint.accounting,fixed.accounting);
  assert.deepEqual(world,before);
  assert.ok(joint.timeline.every((day,i)=>day.labor===fixed.timeline[i].labor));
});

test("POLIS uses world-level pairing and counts individual losses separately",()=>{
  const distribution=compareIntake({received:[5,1],metric:{}},{received:[2,2]}).metric;
  assert.deepEqual(distribution,{betterOff:1,worseOff:1,largestLoss:1,largestGain:3});
  const cfg={seed:517882,steps:5,trials:3,climates:["moderate","stress"]};
  const result=runPolis(cfg);
  assert.equal(result.cells[1].contrast.trials,3);
  assert.deepEqual(result,runPolis(cfg));
});
