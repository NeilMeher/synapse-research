import test from "node:test";
import assert from "node:assert/strict";
import {seeded} from "../engine/echo.mjs";
import {gaussianP,nullFamilyRisk,generateProgramme,evaluateProcedures,rankP,summarizeProgramme} from "../engine/scientia.mjs";

test("Gaussian tails and exact independent all-null family risk",()=>{
  assert.ok(Math.abs(gaussianP(1.95996398454)-.05)<2e-7);
  assert.ok(Math.abs(gaussianP(5)-5.73303144e-7)<2e-9);
  assert.equal(gaussianP(0),1);
  assert.ok(Math.abs(nullFamilyRisk(20,.05)-.6415140775914581)<1e-12);
});

test("Bonferroni, Holm, BH and primary policies follow distinct thresholds",()=>{
  const p=[.01,.014,.03,.4];
  assert.deepEqual(rankP(p,.05,"primary"),[0]);
  assert.deepEqual(rankP(p,.05,"bonferroni"),[0]);
  assert.deepEqual(rankP(p,.05,"holm"),[0,1]);
  assert.deepEqual(rankP(p,.05,"bh"),[0,1,2]);
  assert.deepEqual(rankP([.9,.8],.05,"selected"),[]);
});

test("independent blocks agree in sign before reporting under validation",()=>{
  const actual=evaluateProcedures({first:[3,2.8,0],second:[-3,3,0],full:[0,4,0]},.05);
  assert.deepEqual(actual.holdout.screened,[0]);
  assert.deepEqual(actual.holdout.indices,[]);
  assert.deepEqual(actual.replicate.indices,[1]);
  assert.equal(actual.replicate.fraction,0.5);
});

test("seeded design masks truth from procedures and matches the observation budget",()=>{
  const d={hypotheses:20,n:32,signals:4,alpha:.05,effect:.45,rho:0};
  const run=summarizeProgramme(d,seeded(123));
  assert.deepEqual(run,summarizeProgramme(d,seeded(123)));
  assert.equal(run.data.truth.filter(Boolean).length,4);
  assert.deepEqual(run.claims,evaluateProcedures({...run.data,truth:Array(20).fill(0)},.05));
  assert.equal(run.data.first.length,20);
  assert.equal(run.data.second.length,20);
  assert.throws(()=>generateProgramme({...d,n:31},seeded(123)),/configuration/);
});
