import {readFileSync} from "node:fs";
import {describeSeries,growthAssociation,slowerShare,spanSummary,syntheticDifferences} from "../engine/chronos.mjs";
import {runScenario} from "./run-scenario.mjs";

const processed="data/processed/chronos-rail.json",sources="sources/chronos-rail.json";
const read=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url)));
const data=read(processed),source=read(sources);
const inYears=({period},a,b)=>period.endYear>=a&&period.endYear<=b;

function execute(config){
  if(data.sourceId!==config.sourceId||source.id!==data.sourceId||
    data.national.length!==17||data.regions.length!==147)throw new Error("Wrong or incomplete historical source.");
  const list=Object.fromEntries(config.metrics.map(key=>[key,describeSeries(data.national,key,config.indexYear)]));
  const metrics=Object.fromEntries(config.metrics.map(key=>[key,{
    series:list[key].map(({period,value,growth,index})=>({fiscal:period.label,endYear:period.endYear,value,growth,index})),
    spans:Object.fromEntries(config.windows.map(({id,start,end})=>[id,spanSummary(list[key],start,end)]))
  }]));
  const {left,right,start,end}=config.association;
  const recent=key=>list[key].filter(r=>inYears(r,start,end));
  const association=growthAssociation(recent(left),recent(right));
  const {factors,start:first,end:last}=config.conditionalScenario;
  const alternatives=factors.map(factor=>({factor,rows:slowerShare(list.share.filter(r=>inYears(r,first,last)),factor)
    .map(({period,observed,scenario})=>{
      const total=data.national.find(n=>n.period.endYear===period.endYear).cells.route.value;
      return {year:period.endYear,observed,scenario,assumedRouteKM:total,scenarioElectricKM:scenario*total/100};
    })}));
  const synthetic=config.synthetic.map(({id,inputs})=>({id,...syntheticDifferences(inputs)}));
  return {schemaVersion:"chronos-v1",modelVersion:"railway-reconstruction-v1",
    evidenceClass:"Official statistical description with separate teaching scenarios",config,
    dataset:{id:source.id,vintage:"Railway Board statistical summary 2024–25, RBI state handbook 2024–25",
      retrievalDate:source.retrievalDate,units:"route km, million tonnes, billion net tonne-km",
      nationalPeriods:data.national.length,regionalRecords:data.regions.length},metrics,association,
    alternatives,synthetic,historicalCausalStatus:"withheld: comparison units and matched local outcomes unavailable"};
}
runScenario("chronos",execute,["engine/chronos.mjs","scripts/chronos.mjs","scripts/extract_chronos.py","scripts/reference_chronos.py",
  "data/chronos/railboard-summary-transcription.csv","data/chronos/selected-state-routes.csv","data/chronos/timeline.json",
  processed,sources,"schemas/chronos-v1.json","research/chronos-causal-readiness.md"],process.argv[2]);
