import assert from "node:assert/strict";
import {test} from "node:test";
import {answerConfidence,evaluateConfidence} from "../engine/confidence.mjs";
import {drawObservation,observe,predict,trainCalibrator} from "../engine/mirage.mjs";
import {seeded} from "../engine/echo.mjs";

const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<tol,a+" vs "+b);
test("posterior of selected answer agrees with enumeration",()=>{
  near(answerConfidence(.7,.7,true),49/58);
  near(answerConfidence(.7,.7,false),.5);
  near(answerConfidence(.6,.4,true),.5);
  assert.throws(()=>answerConfidence(1,1,false),/impossible/);
});
test("Brier, AUROC with ties and selective risk match hand checks",()=>{
  const result=evaluateConfidence([1,0,1,0],[.8,.8,.6,.3]);
  near(result.brier,(.04+.64+.16+.09)/4);
  near(result.errorAUROC,.625);
  near(result.riskCoverage[1].risk,.5);
  near(result.riskCoverage.at(-1).risk,.5);
  assert.equal(evaluateConfidence([0],[1]).nllStatus,"infinite");
  assert.equal(evaluateConfidence([0],[1]).errorAUROC,null);
});
test("regime preserves primary decisions and oracle probabilities use no truth bit",()=>{
  const random=seeded(4881);
  const calibration=trainCalibrator(1331,400);
  for(let i=0;i<300;i++){
    const task=drawObservation(random);
    const normal=observe(task,"normal"), shifted=observe(task,"misleading");
    assert.equal(normal.selected,shifted.selected);
    assert.equal(normal.correct,shifted.correct);
    assert.deepEqual(predict(normal,calibration),predict({...normal,truth:1-normal.truth,correct:1-normal.correct},calibration));
  }
});
