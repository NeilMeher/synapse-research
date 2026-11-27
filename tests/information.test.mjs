import assert from "node:assert/strict";
import test from "node:test";
import {binaryInformationGain} from "../engine/information.mjs";

test("finite Bayesian queries match analytic information quantities",()=>{
  const testCase=binaryInformationGain(.5,.8,.2);
  assert.equal(testCase.positive,.5);
  assert.equal(testCase.posteriorPositive,.8);
  assert.ok(Math.abs(testCase.posteriorNegative-.2)<1e-14);
  assert.ok(Math.abs(testCase.information-.2780719051126377)<1e-14);
  assert.equal(binaryInformationGain(.5,1,0).information,1);
  assert.equal(binaryInformationGain(.5,1,1).posteriorNegative,null);
  assert.equal(binaryInformationGain(.5,1,1).information,0);
  assert.ok(binaryInformationGain(.25,.9,.9).information<1e-14);
  assert.throws(()=>binaryInformationGain(2,.5,.5),RangeError);
});
