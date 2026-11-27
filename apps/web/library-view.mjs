import {divisions,laboratories,researchStudies} from "./research-registry.mjs";
import {evidenceClass,findings} from "./knowledge.mjs";
import {byId} from "./view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const controls=Object.fromEntries(["lab","area","evidence","scope","direction","sort"].map(id=>[id,byId("catalogue-"+id)]));
function fill(select,options){
  select.append(...options.map(([value,text])=>new Option(text,value)));
}
fill(controls.lab,laboratories.map(({id,name})=>[id,name]));
fill(controls.area,divisions);
fill(controls.evidence,Array.from(new Set(researchStudies.map(evidenceClass))).map(value=>[value,value]));
fill(controls.direction,Array.from(new Set(Object.values(findings).map(row=>row[0]))).map(value=>[value,value]));
const cards=new Map(Array.from(document.querySelectorAll("#studies article")).map(card=>[card.dataset.study,card]));
const matches=(key,value)=>controls[key].value==="all"||controls[key].value===value;
function update(){
  const sort=controls.sort.value;
  const ordered=[...researchStudies];
  if(sort==="name")ordered.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==="evidence")ordered.sort((a,b)=>evidenceClass(a).localeCompare(evidenceClass(b))||a.name.localeCompare(b.name));
  if(sort==="date")ordered.sort((a,b)=>cards.get(b.id).dataset.date.localeCompare(cards.get(a.id).dataset.date));
  let count=0;
  for(const study of ordered){
    const card=cards.get(study.id), scope=study.labs.length>1?"joint":"single";
    const labs=laboratories.filter(lab=>study.labs.includes(lab.id));
    card.hidden=!(matches("scope",scope)&&matches("direction",findings[study.id][0])&&matches("evidence",evidenceClass(study))&&
      labs.some(lab=>matches("lab",lab.id))&&labs.some(lab=>matches("area",lab.division)));
    if(!card.hidden)count++;
    byId("studies").append(card);
  }
  byId("catalogue-status").textContent=count+" of "+researchStudies.length+" executed studies.";
}
for(const control of Object.values(controls))control.addEventListener("change",update);
update();
