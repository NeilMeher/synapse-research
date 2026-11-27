import {readFileSync} from "node:fs";
import {aggregateEconomy,computeDemand,demandForGroup,prepareEconomy} from "../engine/artha.mjs";
import {runScenario} from "./run-scenario.mjs";

const processed="data/processed/artha-india.json", mapping="data/processed/artha-groups.json";
const read=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url)));
const dataset=read(processed), groups=read(mapping);

function execute(config){
  if(dataset.source.id!=="adb-ind-national-2025"||config.amount!==100)throw new Error("Invalid registered source or monetary scenario.");
  const panels=config.panels.map(year=>{
    const source=dataset.panels[year];
    return {year,published:source.published,comparisons:[source,aggregateEconomy(source,groups)].map(data=>{
      const prepared=prepareEconomy(data);
      return {resolution:data.resolution,industryCount:data.industries.length,diagnostics:prepared.diagnostics,
        scenarios:config.shocks.map(({id,sourceCode,groupCode})=>{
          const shock=demandForGroup(data,[data.resolution==="source"?sourceCode:groupCode],config.amount);
          return {id,shock,...computeDemand(prepared,shock)};
        })};
    })};
  });
  return {schemaVersion:"artha-v1",modelVersion:"adb-domestic-leontief-v1",evidenceClass:"official-data conditional scenarios",
    dataset:{id:dataset.source.id,vintage:dataset.source.vintage,retrievalDate:dataset.source.retrievalDate,
      sourceSha256:dataset.source.sha256,units:dataset.source.units},config,panels};
}

runScenario("artha",execute,["scripts/artha.mjs","engine/artha.mjs","scripts/extract_artha.py","scripts/reference_artha.py",
  "sources/artha-adb-india.json",processed,mapping,"schemas/artha-v1.json","schemas/source-v1.json"],process.argv[2]);
