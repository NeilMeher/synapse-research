import assert from "node:assert/strict";
import {test} from "node:test";
import {seeded, influence, terminalWeights} from "../engine/echo.mjs";
import {countDistribution, exchangeableBounds, hubAccuracy, hubInfluence, laws,
  majorityCredit, posteriorFromCounts, sampleReports, scoreForecasts, summarizeCount, verificationUtility} from "../engine/dependence.mjs";
import {runDependence} from "../engine/echo2.mjs";

const near = (x, y, tolerance = 1e-11) => assert.ok(Math.abs(x-y) < tolerance, x + " vs " + y);
const total = items => items.reduce((a,b) => a + b, 0);

test("both exact laws match all specified moments and their common endpoints", () => {
  for (const n of [3, 15, 41]) for (const q of [.51,.68,.99]) for (const rho of [0,1e-15,.25,.75,1-1e-15,1]) {
    const masses = laws.map(law => countDistribution(n,q,rho,law));
    for (const mass of masses) {
      assert.ok(mass.every(value => value >= 0 && Number.isFinite(value)));
      near(total(mass),1);
      const stats = summarizeCount(mass);
      near(stats.meanReliability,q);
      near(stats.correlation,rho);
    }
    if (rho === 0 || rho === 1) assert.deepEqual(masses[0],masses[1]);
  }
  countDistribution(9,.5,1/3,"beta").forEach(value => near(value,.1));
});

test("predictive sampler reaches the exact beta-binomial marginal and correlation", () => {
  const random = seeded(7458);
  const tallies = Array(8).fill(0);
  for (let trial = 0; trial < 16000; trial++) {
    tallies[total(sampleReports(Array.from({length:7},random),0,0,.68,.75,"beta"))]++;
  }
  const mass = tallies.map(count => count / 16000);
  near(summarizeCount(mass).correlation,.75,.027);
  near(summarizeCount(mass).meanReliability,.68,.015);
  near(mass[0],countDistribution(7,.68,.75,"beta")[0],.014);
});

test("moment bounds attain their moments, contain both laws and handle finite negative dependence", () => {
  for (const n of [3,4,15,41]) for (const q of [.51,.68,.99]) for (const rho of [0,.25,.75,1]) {
    const {lower,upper} = exchangeableBounds(n,q,rho);
    for (const bound of [lower,upper]) {
      const mass = Array(n+1).fill(0);
      for (const {count,probability} of bound.support) mass[count] = probability;
      const stats = summarizeCount(mass);
      near(total(mass),1);
      near(stats.meanReliability,q);
      near(stats.correlation,rho);
      near(stats.majority,bound.accuracy);
    }
    for (const law of laws) {
      const exact = summarizeCount(countDistribution(n,q,rho,law)).majority;
      assert.ok(exact >= lower.accuracy - 1e-11 && exact <= upper.accuracy + 1e-11);
    }
    if (rho === 1) {near(lower.accuracy,q); near(upper.accuracy,q);}
  }
  const bounds = exchangeableBounds(3,.5,-1/3);
  near(bounds.lower.accuracy,.5);
  near(bounds.upper.accuracy,.5);
  const uncorrelated = exchangeableBounds(3,.5,0);
  near(uncorrelated.lower.accuracy,.25);
  near(uncorrelated.upper.accuracy,.75);
  assert.throws(() => exchangeableBounds(3,.5,-.4),/infeasible/);
});

test("likelihood reversal, model comparison and impossible observations", () => {
  const n=15, actual=countDistribution(n,.68,.75,"beta"), wrong=countDistribution(n,.68,.75,"shared");
  near(posteriorFromCounts(actual,12,[1],0) + posteriorFromCounts(actual,3,[1],0),1);
  assert.ok(scoreForecasts(actual,wrong).brier > scoreForecasts(actual,actual).brier);
  const impossible = scoreForecasts(actual, countDistribution(n,.68,1,"beta"));
  assert.equal(impossible.logLossStatus,"undefined likelihood");
  assert.ok(impossible.impossibleMass > 0);
  assert.equal(impossible.accuracy,null);
  assert.equal(scoreForecasts([.2,.8],[0,1]).logLossStatus,"infinite");
  const reliability=.82;
  const verification=verificationUtility(n,.68,.75,"beta",n,reliability,.02);
  near(verification.accuracy, summarizeCount(countDistribution(n,reliability,0,"beta")).majority);
  near(verification.utility, verification.accuracy-.02*n);
});

test("finite hub recurrence agrees with the v1 influence matrix", () => {
  for (const h of [.35,.5,.55,.75,.9]) for (const t of [0,1,2,12,50]) {
    near(hubInfluence(15,h,t).effective,terminalWeights(influence(15,"hub",h),t)[0]);
  }
  const mass = countDistribution(15,.68,.75,"beta");
  near(hubAccuracy(mass,.75,12).accuracy,.68);
  near(hubAccuracy(mass,.75,0).accuracy,total(mass.map((p,k) => p*majorityCredit(k,15))));
});

test("paired study is deterministic, bounded and resolves identical endpoints", () => {
  const config = {id:"echo2-pilot-001",phase:"pilot",seed:42,trials:100,agents:15,reliability:.68,correlations:[0,.75,1]};
  const run = runDependence(config);
  assert.deepEqual(run,runDependence(config));
  assert.equal(run.conditions[0].monteCarlo.estimate,0);
  assert.equal(run.conditions[2].monteCarlo.estimate,0);
  assert.throws(() => runDependence({...config,trials:50001}),/invalid/i);
});
