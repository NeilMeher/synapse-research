import {byId, canvasContext, line, node, palette} from "./view.mjs";

import {directStudies, divisions, journeys, laboratories as labs, researchStudies, sharedStudy} from "./research-registry.mjs";

function resource(label, href, className) {
  const link=node("a",label,className);
  link.href="./"+href;
  return link;
}


export function setupMap() {
  const view = byId("map-view");
  const detail = byId("lab-detail");
  const search = byId("lab-search");
  const division = byId("division");
  const relationships = byId("relationships");
  const progress = byId("lab-status");
  const focus = byId("focus-map");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const expanded = new Set(divisions.map(([id])=>id));
  const notes = byId("map-journeys");
  for (const journey of journeys) {
    const path=node("details");
    const steps=node("ol");
    for (const [name, href] of journey.steps) {
      const endpoint=node("li");
      endpoint.append(resource(name,href));
      steps.append(endpoint);
    }
    path.append(node("summary",journey.name),steps);
    notes.append(path);
  }
  const narrow = matchMedia("(max-width: 650px)");
  let selected = labs.find(lab => location.hash === "#lab-" + lab.id) ?? labs[3];
  let filter = () => true;
  let zoom = 1;
  let drag;
  let artifactReady = false;
  let robustnessReady = false;
  let mapDraw = () => {};

  function choose(lab) {
    selected = lab;
    history.pushState(null, "", "#lab-" + lab.id);
    if (!filter(lab)) {
      search.value="";
      division.value="all";
      progress.value="all";
    }
    expanded.add(lab.division);
    filtersChanged();
  }

  const graphNodes = new Map();
  const listNodes = new Map();
  const graph = byId("map-nodes");
  const center = node("div", "SYNAPSE", "map-center");
  graph.append(center);
  const divisionLabels = new Map(divisions.map(([id, name]) => {
    const label = node("button", name, "division-node");
    label.type="button";
    label.setAttribute("aria-expanded","true");
    label.addEventListener("click",()=>{
      if (expanded.has(id)) expanded.delete(id);
      else expanded.add(id);
      syncSelection();
      mapDraw();
    });
    label.style.setProperty("--node-color", "var(--" + id + ")");
    graph.append(label);
    const option = node("option", name);
    option.value = id;
    division.append(option);
    return [id, label];
  }));
  for (const lab of labs) {
    const displayName = lab.name === "GAME OF CIVILIZATIONS" ? "CIVILIZATIONS" : lab.name;
    const control = node("button", displayName);
    control.type = "button";
    control.setAttribute("aria-label", lab.name);
    control.style.setProperty("--node-color", "var(--" + lab.division + ")");
    control.addEventListener("click", () => choose(lab));
    graph.append(control);
    graphNodes.set(lab.id, control);
    const row = node("li");
    const listControl = node("button", lab.name, "map-link");
    listControl.type = "button";
    listControl.addEventListener("click", () => {
      choose(lab);
      detail.focus({preventScroll:true});
      detail.scrollIntoView({block:"nearest"});
    });
    row.append(listControl, " · ", node("span", "Proposed"));
    byId("lab-list").append(row);
    listNodes.set(lab.id, row);
  }

  const status = lab => {
    if(lab.id==="echo")return robustnessReady?"ECHO v1 and 2.0 · Experiments executed":
      artifactReady?"ECHO v1 · Experiments executed":"Archive loading · Interactive lab available";
    if(lab.id==="noesis")return "Archive independently reconstructed";
    return directStudies.get(lab.id)?"Experiments executed":"Proposed";
  };
  const visible=lab=>filter(lab)&&expanded.has(lab.division)&&
    (!focus.checked||lab===selected||lab.links.includes(selected.id)||selected.links.includes(lab.id));
  function renderDetail() {
    const {division: id, name, question, links} = selected;
    detail.tabIndex = -1;
    const related = node("ul");
    for (const link of links) {
      const lab = labs.find(item => item.id === link);
      const row = node("li");
      const button = node("button", lab.name, "map-link");
      button.type = "button";
      button.addEventListener("click", () => {
        choose(lab);
        detail.focus({preventScroll:true});
      });
      const connection=sharedStudy(selected.id,lab.id);
      row.append(button," · ",node("small",connection?"Joint synthetic study":"Proposed research relationship"));
      related.append(row);
    }
    const breadcrumb=node("nav",undefined,"atlas-breadcrumb");
    breadcrumb.setAttribute("aria-label","Atlas breadcrumb");
    const back=node("button","SYNAPSE","map-link");
    back.type="button";
    back.addEventListener("click",()=>byId("reset-map").click());
    const branch=node("button",divisions.find(item=>item[0]===id)[1],"map-link");
    branch.type="button";
    branch.addEventListener("click",()=>{
      division.value=id;
      expanded.add(id);
      filtersChanged();
    });
    breadcrumb.append(back," / ",branch," / ",node("span",name));
    detail.replaceChildren(breadcrumb,node("h3",name),node("p",question),node("p",status(selected)));
    const direct=directStudies.get(selected.id);
    if(direct)detail.append(resource("Open the "+name+" lab",selected.id==="echo"?"index.html#echo":direct.route,"primary"));
    for(const study of researchStudies.filter(study=>study.labs.includes(selected.id))){
      const disclosure=node("details");
      disclosure.append(node("summary",study.name+" evidence"),node("p",study.contrast));
      const evidence=node("ul");
      for(const [label,href] of [
        ["Study workspace",study.route],["Protocol and model",study.protocol],["Mathematical specification",study.math],
        ["Results and dataset",study.result],["Run manifest",study.manifest],["Manuscript",study.manuscript],["Learning guide",study.learning],
      ]){
        if(!href)continue;
        const item=node("li");
        item.append(resource(label,href));
        evidence.append(item);
      }
      disclosure.append(evidence,node("small",study.evidence+" · "+study.humanReview));
      detail.append(disclosure);
    }
    detail.append(node("p","Connected laboratories"),related);
  }

  function syncSelection() {
    for (const lab of labs) {
      const matches = filter(lab);
      const isSelected = lab === selected;
      graphNodes.get(lab.id).hidden = !visible(lab);
      graphNodes.get(lab.id).setAttribute("aria-pressed", String(isSelected));
      const row = listNodes.get(lab.id);
      row.hidden = !matches || (focus.checked && !visible(lab));
      row.firstElementChild.setAttribute("aria-pressed", String(isSelected));
      row.lastElementChild.textContent = status(lab);
    }
    byId("map-empty").hidden = labs.some(filter);
  }

  mapDraw = () => {
    if (narrow.matches || !view.clientWidth) return;
    const width = Math.round(Math.max(760, view.clientWidth) * zoom);
    const height = Math.max(470,Math.round(558 * zoom));
    const mapSpace = byId("map-space");
    mapSpace.style.width = width + "px";
    mapSpace.style.height = height + "px";
    const {context} = canvasContext(byId("map-lines"), width, height);
    const middle = [width / 2, height / 2];
    const positions = new Map();
    const place = (element, x, y) => { element.style.left = x + "px"; element.style.top = y + "px"; };
    place(center, ...middle);
    for (const [index, [id]] of divisions.entries()) {
      const right = index % 2 === 1;
      const bottom = index >= 2;
      const divisionX = width * (right ? 0.68 : 0.32);
      const divisionY = height * (bottom ? 0.73 : 0.27);
      const color = palette(id);
      const sectionLabs = labs.filter(lab => lab.division === id);
      const label = divisionLabels.get(id);
      label.hidden = !sectionLabs.some(filter);
      label.setAttribute("aria-expanded",String(expanded.has(id)));
      place(label, divisionX, divisionY);
      context.strokeStyle = color;
      context.globalAlpha = 0.3;
      if (!label.hidden) line(context, ...middle, divisionX, divisionY);
      for (const [offset, lab] of sectionLabs.entries()) {
        const x = width * (right ? 0.88 : 0.12);
        const y = divisionY + (offset - (sectionLabs.length-1)/2) * height * .09;
        positions.set(lab.id, [x, y]);
        place(graphNodes.get(lab.id), x, y);
        if (visible(lab)) line(context, divisionX, divisionY, x, y);
      }
    }
    const seen = new Set();
    for (const lab of labs.filter(visible)) {
      if (relationships.value === "none") break;
      for (const id of lab.links) {
        const peer = labs.find(item => item.id === id);
        const key = [lab.id, id].sort().join("/");
        const documented=Boolean(sharedStudy(id,lab.id));
        if (seen.has(key) || !visible(peer) ||
            (relationships.value === "focus" && selected !== lab && selected !== peer) ||
            (relationships.value === "tested" && !documented)) continue;
        seen.add(key);
        context.globalAlpha=documented ? .63 : .28;
        context.strokeStyle=palette(documented?"science":"dim");
        context.setLineDash(documented?[]:[3,5]);
        line(context, ...positions.get(lab.id), ...positions.get(id));
      }
    }
  };

  function filtersChanged() {
    const phrase = search.value.trim().toLowerCase();
    filter = lab => (division.value === "all" || lab.division === division.value) &&
      (progress.value==="all"||(progress.value==="executed")===Boolean(directStudies.get(lab.id))) &&
      [lab.name,lab.question,status(lab),...researchStudies.filter(study=>study.labs.includes(lab.id))
        .map(study=>study.name+" "+study.description+" "+study.contrast)].join(" ").toLowerCase().includes(phrase);
    const first = labs.find(filter);
    if (first && !filter(selected)) selected = first;
    renderDetail();
    syncSelection();
    mapDraw();
  }

  function adjustZoom(change) {
    const oldZoom = zoom;
    zoom = Math.min(1.8,Math.max(.78,zoom+change));
    const middle = [view.scrollLeft + view.clientWidth / 2, view.scrollTop + view.clientHeight / 2];
    mapDraw();
    view.scrollTo({left:middle[0]*zoom/oldZoom-view.clientWidth/2,
      top:middle[1]*zoom/oldZoom-view.clientHeight/2,behavior:motion.matches?"instant":"smooth"});
  }
  byId("zoom-in").addEventListener("click", () => adjustZoom(.2));
  byId("zoom-out").addEventListener("click", () => adjustZoom(-.2));
  byId("fit-map").addEventListener("click",()=>{
    zoom=Math.max(.78,Math.min(1,(view.clientWidth-2)/760));
    mapDraw();
    view.scrollTo(0,0);
  });
  byId("reset-map").addEventListener("click", () => {
    search.value = "";
    division.value = "all";
    relationships.value="all";
    progress.value="all";
    focus.checked=false;
    divisions.forEach(([id])=>expanded.add(id));
    zoom=1;
    view.scrollTo(0, 0);
    filtersChanged();
  });
  view.addEventListener("pointerdown",event=>{
    if(event.pointerType!=="mouse" || event.button!==0 || event.target.closest("button"))return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop};
    view.setPointerCapture(event.pointerId);
    view.classList.add("map-dragging");
  });
  view.addEventListener("pointermove",event=>{
    if(!drag||drag.id!==event.pointerId)return;
    view.scrollTo(drag.left+drag.x-event.clientX,drag.top+drag.y-event.clientY);
  });
  for(const event of ["pointerup","pointercancel","lostpointercapture"]){
    view.addEventListener(event,()=>{
      drag=null;
      view.classList.remove("map-dragging");
    });
  }
  view.addEventListener("keydown", event => {
    if (event.target !== view) return;
    const delta = {ArrowLeft:[-60,0], ArrowRight:[60,0], ArrowUp:[0,-60], ArrowDown:[0,60]}[event.key];
    if (delta) {
      event.preventDefault();
      view.scrollBy(...delta);
    }
  });
  for (const eventName of ["popstate", "hashchange"]) {
    addEventListener(eventName, () => {
      const lab = labs.find(item => location.hash === "#lab-" + item.id);
      if (lab) {
        selected = lab;
        renderDetail();
        syncSelection();
        mapDraw();
      }
    });
  }
  for (const element of [search,division,relationships,progress,focus]) element.addEventListener("input",filtersChanged);
  const showList = () => {
    if (narrow.matches) document.querySelector(".list-view").open = true;
    mapDraw();
  };
  narrow.addEventListener("change", showList);
  new ResizeObserver(mapDraw).observe(view);
  filtersChanged();
  showList();
  if (location.hash.startsWith("#lab-")) byId("map").scrollIntoView();
  return {draw: mapDraw, markAvailable() { artifactReady = true; filtersChanged(); }, markRobustnessAvailable() { robustnessReady = true; filtersChanged(); }};
}
