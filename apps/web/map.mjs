import {byId, canvasContext, line, node, palette} from "./view.mjs";

const divisions = [
  ["cognition", "Individual cognition"],
  ["collective", "Collective intelligence"],
  ["science", "Scientific intelligence"],
  ["economy", "Economic complexity"],
];
const labs = [
  {id:"mirage", name:"MIRAGE", division:"cognition", question:"Can functional metacognition distinguish self-monitoring from imitation?", links:["echo","reflex"]},
  {id:"morpheus", name:"MORPHEUS", division:"cognition", question:"How does memory architecture shape behavioural continuity?", links:["mirage","alpha-decay"]},
  {id:"axiom", name:"AXIOM", division:"cognition", question:"How do incentives and framing change decisions across equivalent games?", links:["echo","civilizations"]},
  {id:"echo", name:"ECHO", division:"collective", question:"When does communication improve collective accuracy or amplify shared errors?", links:["mirage","civilizations","scientia","reflex"]},
  {id:"civilizations", name:"GAME OF CIVILIZATIONS", division:"collective", question:"When can cooperation, exchange and institutions emerge under resource constraints?", links:["echo","axiom","chronos"]},
  {id:"chronos", name:"CHRONOS", division:"collective", question:"How can historical evidence support transparent causal and counterfactual analysis?", links:["civilizations","scientia"]},
  {id:"noesis", name:"NOESIS", division:"science", question:"Can computational systems recover hidden rules from observations?", links:["scientia","mirage"]},
  {id:"scientia", name:"SCIENTIA", division:"science", question:"Which research workflows remain reproducible and resist false discovery?", links:["noesis","echo","chronos"]},
  {id:"reflex", name:"REFLEX", division:"economy", question:"How do information and constraints produce feedback in financial markets?", links:["echo","alpha-decay","mirage"]},
  {id:"alpha-decay", name:"ALPHA DECAY", division:"economy", question:"How does strategy adoption change the performance of that strategy?", links:["reflex","morpheus"]},
  {id:"artha", name:"ARTHA", division:"economy", question:"How do sector linkages transmit policy and economic shocks?", links:["energia","reflex"]},
  {id:"energia", name:"ENERGIA", division:"economy", question:"How do infrastructure and power constraints shape AI investment?", links:["artha","reflex"]},
];

export function setupMap() {
  const view = byId("map-view");
  const detail = byId("lab-detail");
  const search = byId("lab-search");
  const division = byId("division");
  const relationships = byId("relationships");
  const narrow = matchMedia("(max-width: 650px)");
  let selected = labs.find(lab => location.hash === "#lab-" + lab.id) ?? labs[3];
  let filter = () => true;
  let zoom = 1;
  let artifactReady = false;
  let robustnessReady = false;
  let mapDraw = () => {};

  function choose(lab) {
    selected = lab;
    history.pushState(null, "", "#lab-" + lab.id);
    renderDetail();
    syncSelection();
    mapDraw();
  }

  const graphNodes = new Map();
  const listNodes = new Map();
  const graph = byId("map-nodes");
  const center = node("div", "SYNAPSE", "map-center");
  graph.append(center);
  const divisionLabels = new Map(divisions.map(([id, name]) => {
    const label = node("span", name, "division-node");
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

  const status = lab => lab.id === "echo" ? (robustnessReady ? "ECHO v1 and 2.0 · Experiments executed" : artifactReady ? "ECHO v1 · Experiments executed" : "Interactive prototype") : lab.id === "mirage" ? "MIRAGE v0.1 · Experiments executed" : lab.id === "reflex" ? "REFLEX v0.1 · Experiments executed" : lab.id === "morpheus" ? "MORPHEUS v0.1 · Experiments executed" : lab.id === "alpha-decay" ? "ALPHA DECAY v0.1 · Experiments executed" : lab.id === "noesis" ? "NOESIS v1 · Archive reproduced" : "Proposed";
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
      row.append(button);
      related.append(row);
    }
    detail.replaceChildren(node("p", divisions.find(item => item[0] === id)[1], "eyebrow"),
      node("h3", name), node("p", question), node("p", status(selected)));
    if (selected.id === "echo") {
      const open = node("a", "Open the ECHO lab ↗", "primary");
      open.href = "#echo";
      const follow = node("a", "Compare matched dependence", "map-study");
      follow.href = "#robustness";
      detail.append(open, follow);
    }
    if (["mirage", "reflex", "morpheus", "alpha-decay", "noesis"].includes(selected.id)) {
      const open = node("a", "Open the " + selected.name + " lab ↗", "primary");
      open.href = "./" + selected.id + ".html";
      detail.append(open);
    }
    if (["echo", "mirage", "reflex"].includes(selected.id)) {
      const conv = node("a", "Open CONVERGENCE study ↗", "map-study");
      conv.href = "./convergence.html";
      detail.append(conv);
    }
    detail.append(node("p", "Connected laboratories"), related);
  }

  function syncSelection() {
    for (const lab of labs) {
      const matches = filter(lab);
      const isSelected = lab === selected;
      graphNodes.get(lab.id).hidden = !matches;
      graphNodes.get(lab.id).setAttribute("aria-pressed", String(isSelected));
      const row = listNodes.get(lab.id);
      row.hidden = !matches;
      row.firstElementChild.setAttribute("aria-pressed", String(isSelected));
      row.lastElementChild.textContent = status(lab);
    }
    byId("map-empty").hidden = labs.some(filter);
  }

  mapDraw = () => {
    if (narrow.matches || !view.clientWidth) return;
    const width = Math.round(Math.max(760, view.clientWidth) * zoom);
    const height = Math.round(558 * zoom);
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
      place(label, divisionX, divisionY);
      context.strokeStyle = color;
      context.globalAlpha = 0.3;
      if (!label.hidden) line(context, ...middle, divisionX, divisionY);
      for (const [offset, lab] of sectionLabs.entries()) {
        const x = width * (right ? 0.88 : 0.12);
        const y = divisionY + (offset - (sectionLabs.length-1)/2) * height * .09;
        positions.set(lab.id, [x, y]);
        place(graphNodes.get(lab.id), x, y);
        if (filter(lab)) line(context, divisionX, divisionY, x, y);
      }
    }
    context.globalAlpha = 0.22;
    context.strokeStyle = palette("dim");
    context.setLineDash([3, 5]);
    const seen = new Set();
    for (const lab of labs.filter(filter)) {
      if (relationships.value === "none") break;
      for (const id of lab.links) {
        const peer = labs.find(item => item.id === id);
        const key = [lab.id, id].sort().join("/");
        if (seen.has(key) || !filter(peer) ||
            (relationships.value === "focus" && selected !== lab && selected !== peer)) continue;
        seen.add(key);
        line(context, ...positions.get(lab.id), ...positions.get(id));
      }
    }
  };

  function filtersChanged() {
    const phrase = search.value.trim().toLowerCase();
    filter = lab => (division.value === "all" || lab.division === division.value) &&
      (lab.name + " " + lab.question + " " + status(lab)).toLowerCase().includes(phrase);
    const first = labs.find(filter);
    if (first && !filter(selected)) selected = first;
    renderDetail();
    syncSelection();
    mapDraw();
  }

  function adjustZoom(change) {
    const oldZoom = zoom;
    zoom = Math.min(1.8, Math.max(1, zoom + change));
    const middle = [view.scrollLeft + view.clientWidth / 2, view.scrollTop + view.clientHeight / 2];
    mapDraw();
    view.scrollTo(middle[0] * zoom / oldZoom - view.clientWidth / 2,
      middle[1] * zoom / oldZoom - view.clientHeight / 2);
  }
  byId("zoom-in").addEventListener("click", () => adjustZoom(.2));
  byId("zoom-out").addEventListener("click", () => adjustZoom(-.2));
  byId("reset-map").addEventListener("click", () => {
    search.value = "";
    division.value = "all";
    relationships.value = "all";
    zoom = 1;
    view.scrollTo(0, 0);
    filtersChanged();
  });
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
  for (const element of [search, division, relationships]) element.addEventListener("input", filtersChanged);
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
