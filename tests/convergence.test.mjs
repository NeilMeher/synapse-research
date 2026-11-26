import assert from "node:assert/strict";
import {test} from "node:test";
import {runConvergence} from "../engine/convergence.mjs";

test("cross-lab replay carries shared task state and auditable integer fills",()=>{
  const config={id:"convergence-pilot-001",phase:"pilot",seed:811101,trials:5,agents:15,correlation:.3};
  const result=runConvergence(config);
  assert.deepEqual(result,runConvergence(config));
  assert.equal(result.arms.length,22);
  const first=result.arms[0].replay;
  for(const {replay} of result.arms){
    assert.equal(replay.truth,first.truth);
    assert.equal(replay.fundamental,first.fundamental);
    assert.deepEqual(replay.ledger.initial,first.ledger.initial);
    assert.deepEqual(replay.ledger.totals,first.ledger.totals);
    assert.equal(replay.ledger.frames[0].trades.length,config.agents);
    for(const decision of replay.ledger.frames[0].trades){
      assert.equal(decision.event.order.side,decision.action?"buy":"sell");
      assert.ok(decision.event.fills.length<=decision.event.order.quantity);
    }
  }
  const beta=result.arms.filter(arm=>arm.law==="beta");
  assert.ok(beta.every(arm=>arm.metrics.reportAccuracy.estimate===beta[0].metrics.reportAccuracy.estimate));
});
