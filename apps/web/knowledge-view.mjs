import {buildKnowledge,searchEvidence} from "./knowledge.mjs";
import {byId,node} from "./view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const search=byId("knowledge-search"),type=byId("knowledge-type"),relationship=byId("knowledge-rel");
let {nodes,edges}=buildKnowledge();
let selected;
function anchor(text,href){
  const a=node("a",text);
  a.href="./"+href;
  return a;
}
function inspect(id){
  selected=nodes.find(n=>n.id===id);
  if(!selected)return;
  byId("knowledge-selected").textContent=selected.name;
  byId("knowledge-description").textContent=selected.description;
  byId("knowledge-open").replaceChildren(anchor("Open "+selected.type.toLowerCase(),selected.route));
  const links=edges.filter(e=>(relationship.value==="all"||e.type===relationship.value)&&(e.from===id||e.to===id));
  byId("knowledge-edges").replaceChildren(...links.map(e=>{
    const peer=nodes.find(n=>n.id===(e.from===id?e.to:e.from));
    const line=node("li"),control=node("button",peer.name,"map-link");
    control.type="button";
    control.addEventListener("click",()=>choose(peer.id));
    const label=selected.id===e.from?e.type:"Incoming · "+e.type;
    line.append(control," · ",node("small",label));
    return line;
  }));
  if(!links.length)byId("knowledge-edges").replaceChildren(node("li","No relationships match this filter."));
}
function choose(id){
  const location=new URL(window.location.href);
  location.hash=id;
  history.replaceState(null,"",location);
  inspect(id);
  render();
}
function excerpt(item){
  const text=item.searchText??"";
  const query=search.value.trim().toLowerCase();
  const position=query?text.toLowerCase().indexOf(query):-1;
  if(position<0)return item.description;
  const first=Math.max(0,position-55),last=Math.min(text.length,position+query.length+115);
  return (first>0?"…":"")+text.slice(first,last)+(last<text.length?"…":"");
}
function render(){
  const results=searchEvidence(nodes,search.value,type.value);
  byId("knowledge-status").textContent=results.length+" matching records"+(results.length===40?" · showing the first 40":"")+".";
  byId("knowledge-results").replaceChildren(...results.map(item=>{
    const li=node("li"),button=node("button",item.name,"map-link");
    button.type="button";
    button.setAttribute("aria-pressed",String(item.id===selected?.id));
    button.addEventListener("click",()=>choose(item.id));
    li.append(node("small",item.type),button,node("p",excerpt(item)||""));
    return li;
  }));
}
function options(select,list){
  select.append(...Array.from(new Set(list)).sort().map(value=>new Option(value,value)));
}
options(type,nodes.map(n=>n.type));
options(relationship,edges.map(e=>e.type));
search.value=(new URLSearchParams(location.search).get("q")??"").slice(0,130);
search.addEventListener("input",render);
type.addEventListener("change",render);
relationship.addEventListener("change",()=>{if(selected)inspect(selected.id);});
const requested=location.hash.slice(1);
if(requested)inspect(requested);
if(!selected)inspect("lab/chronos");
render();
try{
  const response=await fetch("./data/research-index.json");
  if(!response.ok)throw new Error("Index unavailable.");
  const payload=await response.json();
  if(!Array.isArray(payload.nodes)||payload.nodes.length!==nodes.length)throw new Error("Index revision differs.");
  nodes=payload.nodes;
  render();
  inspect(selected.id);
}catch{
  byId("knowledge-status").textContent+=" The paper text index is unavailable. Registry search remains available.";
}
