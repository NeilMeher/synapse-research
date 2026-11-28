import {readFileSync} from "node:fs";
import {betaReliability, decisionRisks, ewmaMoments, filterReliability, firstPassage} from "../../engine/adaptive-trust.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures.json", import.meta.url), "utf8"));
const scalar = value => {
  const [numerator, denominator = 1] = String(value).split("/");
  return Number(numerator) / Number(denominator);
};
const convert = inputs => Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, scalar(value)]));
const {regime} = fixture;
const model = convert(regime.model);
const uninformativeModel = {...model, auditAccuracy: scalar(regime.uninformativeAccuracy)};
const result = {
  moments: fixture.momentCases.map(item => ewmaMoments(convert(item))),
  beta: fixture.betaCases.map(item => betaReliability(convert(item))),
  regime: regime.times.map(time => filterReliability(model, time, regime.audits)),
  uninformative: regime.times.map(time => filterReliability(uninformativeModel, time, regime.audits)),
  passage: fixture.passageCases.map(item => firstPassage(convert(item))),
  decisions: fixture.decisionCases.map(item => decisionRisks(convert(item))),
};
process.stdout.write(JSON.stringify(result));
