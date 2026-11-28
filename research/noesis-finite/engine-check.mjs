import {readFileSync} from "node:fs";
import {acquisitionObjectives,finiteEpisode,rational} from "../../engine/noesis-finite.mjs";
const {config,cases,fixtures}=JSON.parse(readFileSync(0,"utf8"));
let results;
if(fixtures){
  const {prior,families,target,groups}=fixtures;
  results=groups.map(group=>Object.fromEntries(Object.entries(group.channels).map(([id,rates])=>[id,
    acquisitionObjectives(prior.map(rational),families,rates.map(rational),[target.map(rational)],target.map(rational),group.costs.map(rational))])));
}else{
  results=cases.map(({answers,policy})=>finiteEpisode(config,answers,policy));
}
console.log(JSON.stringify(results));
