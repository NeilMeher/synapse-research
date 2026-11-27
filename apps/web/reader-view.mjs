import {researchStudies} from "./research-registry.mjs";
import {byId,node} from "./view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const root=new URL("./",location.href);
const id=new URLSearchParams(location.search).get("study");
const study=researchStudies.find(x=>x.id===id);
const page=byId("study-paper");
const status=byId("reader-status");

function link(label,target,base=root){
  try{
    const url=new URL(target,base);
    if(!["http:","https:"].includes(url.protocol)||url.username||url.password)return document.createTextNode(label);
    if(url.origin===root.origin&&!url.pathname.startsWith(root.pathname))return document.createTextNode(label);
    const a=node("a",label);
    a.href=url.href;
    return a;
  }catch{
    return document.createTextNode(label);
  }
}
const components=/(\[([^\]\n]+)\]\(([^)\s]+)\)|\x60([^\x60]+)\x60|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
function inline(text,base){
  const items=[];
  let offset=0;
  for(const m of text.matchAll(components)){
    items.push(document.createTextNode(text.slice(offset,m.index)));
    const [,whole,label,target,code,bold,italics]=m;
    items.push(target?link(label,target,base):node(code?"code":bold?"strong":italics?"em":"span",code??bold??italics??whole));
    offset=m.index+m[0].length;
  }
  items.push(document.createTextNode(text.slice(offset)));
  return items;
}
function typed(tag,text,base){
  const el=node(tag);
  el.append(...inline(text,base));
  return el;
}
function render(markdown,base){
  const lines=markdown.replaceAll("\r","").split("\n");
  const fragment=document.createDocumentFragment();
  for(let i=0;i<lines.length;i++){
    const current=lines[i].trim();
    if(!current)continue;
    const header=/^(#{1,6}) (.+)$/.exec(current);
    const bullet=/^([-*]|\d+[.)]) (.+)$/.exec(current);
    if(header){
      fragment.append(typed("h"+header[1].length,header[2],base));
    }else if(current.startsWith("\x60\x60\x60")){
      const content=[];
      while(++i<lines.length&&!lines[i].trim().startsWith("\x60\x60\x60"))content.push(lines[i]);
      const pre=node("pre");pre.append(node("code",content.join("\n")));
      fragment.append(pre);
    }else if(current.startsWith("|")&&/^\s*\|[\s:|-]+\|\s*$/.test(lines[i+1]??"")){
      const wrapper=node("div",undefined,"reader-table"),table=node("table"),head=node("thead"),body=node("tbody");
      const makeRow=(source,tag)=>{
        const tr=node("tr");
        for(const value of source.trim().slice(1,-1).split("|")){
          const cell=typed(tag,value.trim(),base);
          if(tag==="th")cell.scope="col";
          tr.append(cell);
        }
        return tr;
      };
      wrapper.tabIndex=0;
      wrapper.setAttribute("role","region");
      wrapper.setAttribute("aria-label","Manuscript table");
      head.append(makeRow(current,"th"));
      i+=1;
      while(lines[i+1]?.trim().startsWith("|"))body.append(makeRow(lines[++i],"td"));
      table.append(head,body);wrapper.append(table);fragment.append(wrapper);
    }else if(bullet){
      const pattern=bullet[1].length>1?/^\d+[.)] (.+)$/:/^[-*] (.+)$/;
      const list=node(bullet[1].length>1?"ol":"ul");
      list.append(typed("li",bullet[2],base));
      while(pattern.test(lines[i+1]?.trim()??""))list.append(typed("li",pattern.exec(lines[++i].trim())[1],base));
      fragment.append(list);
    }else{
      fragment.append(typed(current.startsWith("> ")?"blockquote":"p",current.replace(/^> /,""),base));
    }
  }
  page.replaceChildren(fragment);
}
if(study){
  const base=new URL(study.manuscript,root);
  const nav=byId("reader-links");
  nav.replaceChildren(...[["Original Markdown",study.manuscript],["Study",study.route],["Results",study.result],["Run manifest",study.manifest]]
    .map(([title,target])=>link(title,target)));
  try{
    const response=await fetch(base);
    if(!response.ok)throw new Error("Manuscript unavailable.");
    const manuscript=await response.text();
    if(manuscript.length>400000)throw new Error("Manuscript exceeds reading limit.");
    render(manuscript,base);
    status.textContent=study.evidence+" · "+study.humanReview;
    document.title=study.name+" manuscript · SYNAPSE";
  }catch{
    status.textContent="The manuscript cannot be loaded. The evidence links are available above.";
  }
}
