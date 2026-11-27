import {readFileSync} from "node:fs";
import {prepareEconomy} from "../engine/artha.mjs";
import {withSettings} from "../engine/energia.mjs";
import {integrateInfrastructure} from "../engine/nexus.mjs";
import {runScenario} from "./run-scenario.mjs";

const source="data/processed/artha-india.json";
const mapping="data/processed/nexus-capital-map.json";
const energy="experiments/energia-scenario.json";
const read=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url)));
const tables=read(source), map=read(mapping), facility=read(energy);

function execute(config){
  if(config.mappingId!==map.id||config.energyInputId!==facility.id||config.year!==map.year)
    throw new Error("The linked source revisions differ.");
  const panel=tables.panels[String(config.year)];
  const model=prepareEconomy(panel);
  const cases=config.pairs.map(({id,design,profile})=>({id,design,profile,
    ...integrateInfrastructure(withSettings(facility.base,config.designs[design]),model,map,profile)}));
  for(let p=0;p<2;p++){
    const [a,b]=[cases[p],cases[p+2]];
    if(a.finance.capex!==b.finance.capex||a.physical.gpus!==b.physical.gpus||
       a.physical.contractBillableHours!==b.physical.contractBillableHours||
       a.economic.totals.output!==b.economic.totals.output)throw new Error("Efficiency match moved economics or installed billing.");
  }
  for(const [a,b] of [[cases[0],cases[1]],[cases[2],cases[3]]]){
    if(a.finance.projectNPV!==b.finance.projectNPV||a.physical.energyKWh!==b.physical.energyKWh||
       a.procurement.lines.find(x=>x.capitalKey==="gpu").imported!==b.procurement.lines.find(x=>x.capitalKey==="gpu").imported)
      throw new Error("Procurement match moved engineering, finance or accelerator imports.");
  }
  return {schemaVersion:"nexus-v1",modelVersion:"capital-bridge-2024-v1",evidenceClass:"Official-data conditional infrastructure scenarios",
    dataset:{id:tables.source.id,vintage:tables.source.vintage,retrievalDate:tables.source.retrievalDate,
      sourceSha256:tables.source.sha256,units:tables.source.units,mappingId:map.id,energyInputId:facility.id},
    config,cases};
}

runScenario("nexus",execute,["scripts/nexus.mjs","scripts/reference_nexus.py","engine/nexus.mjs","engine/artha.mjs","engine/energia.mjs",
  "scripts/reference_artha.py","scripts/reference_energia.py",source,mapping,energy,"schemas/nexus-v1.json",
  "results/artha-scenario.manifest.json","results/energia-scenario.manifest.json"],process.argv[2]);
