import assert from "node:assert/strict";
import test from "node:test";
import {evaluateBasis,GRID_POINTS} from "../engine/discovery.mjs";
import {generateInquiry,runEpisteme,runInquiry,validationGrid,replicationGrid,evaluationGrid} from "../engine/episteme.mjs";
import {seeded} from "../engine/echo.mjs";
import {checkResidualBlock} from "../engine/validation.mjs";

test("the four-point residual tail has known analytic values",()=>{
  assert.equal(checkResidualBlock(Array.from({length:4},()=>({y:0,predicted:0})),1,0.05).p,1);
  const moderate=checkResidualBlock(Array.from({length:4},()=>({y:1,predicted:0})),1,0.05);
  assert.ok(Math.abs(moderate.p-3*Math.exp(-2))<1e-14);
  assert.equal(moderate.passes,true);
  assert.equal(checkResidualBlock(Array.from({length:4},()=>({y:3,predicted:0})),1,0.05).passes,false);
});

test("EPISTEME fixes equal budgets and keeps all four grids disjoint",()=>{
  const grids=[GRID_POINTS,validationGrid,replicationGrid,evaluationGrid];
  assert.equal(new Set(grids.flat()).size,grids.flat().length);
  const task=generateInquiry("inLibrary",seeded(1234));
  for(const policy of ["random","disagreement"]){
    const run=runInquiry(task,policy);
    assert.equal(run.observations.length,6);
    assert.equal(new Set(run.observations.map(row=>row.x)).size,6);
    assert.equal(run.measurementBudget,14);
    const expected=evaluateBasis(task.family,0).reduce((sum,value,i)=>sum+value*task.coefficients[i],0)+task.observationNoise[0];
    assert.equal(run.observations[0].y,expected);
  }
});

test("both holdout blocks leave discovery and all fitted predictions unchanged",()=>{
  const task=generateInquiry("outsideLibrary",seeded(2));
  const run=runInquiry(task,"disagreement");
  const intervention=runInquiry({...task,validationNoise:[99,99,99,99],replicationNoise:[99,99,99,99]},"disagreement");
  assert.deepEqual(intervention.observations,run.observations);
  assert.deepEqual(intervention.updates,run.updates);
  assert.deepEqual(intervention.evalRows,run.evalRows);
  assert.equal(intervention.replicated,null);
  assert.equal(run.score.correctAccepted,0);
});

test("the small full run is repeatable and scores both inquiry policies",()=>{
  const config={seed:33,trials:3};
  const result=runEpisteme(config);
  assert.deepEqual(result,runEpisteme(config));
  assert.equal(result.cells[0].contrast.trials,3);
  assert.equal(result.cells[1].contrast.outcome,"falseProposal");
  assert.equal(result.cells[1].policies.random.correctAccepted.estimate,0);
});
