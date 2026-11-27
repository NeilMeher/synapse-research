import {comparePresentation} from "./engine/axiom.mjs";
import {byId,node,pct} from "./view.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";

setupTheme();
const controls = {game:byId("axiom-game"), belief:byId("axiom-belief"),
  view:byId("axiom-presentation"), policy:byId("axiom-policy"), defect:byId("axiom-defect")};
const label = ["A", "B"];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const fields = [];
let archive;
let matrix;
for (let i = 0; i < 2; i++) {
  const tr = row("Action " + label[i], "", "");
  for (let j = 0; j < 2; j++) {
    for (let p = 0; p < 2; p++) {
      const input = node("input");
      input.type="number";
      input.min=-100;
      input.max=100;
      input.step=1;
      input.required=true;
      input.setAttribute("aria-label", "Row "+label[i]+", column "+label[j]+", player "+(p+1)+" payoff");
      input.addEventListener("input", () => {
        if (!input.validity.valid) return;
        matrix[i][j][p] = input.valueAsNumber;
        render(false);
      });
      input.addEventListener("blur",()=>{if(!input.validity.valid)input.value=matrix[i][j][p];});
      tr.cells[j + 1].append(input);
      fields.push({input,i,j,p});
    }
  }
  byId("axiom-inputs").append(tr);
}

function render(animate) {
  const target = byId("axiom-matrix");
  const board=target.closest("table");
  const before=new Map([...board.querySelectorAll("[data-coordinate]")].map(item=>[item.dataset.coordinate,item.getBoundingClientRect()]));
  const weight = controls.belief.valueAsNumber;
  const report = comparePresentation(matrix, [weight,4-weight], controls.view.value, controls.defect.checked);
  const policy = controls.policy.value;
  byId("axiom-weight").textContent = pct(weight/4);
  byId("axiom-equivalence").textContent = report.equivalent ?
    "Equivalent game. Payoffs and opponent probabilities retain their canonical identities." :
    "Belief remapping fault. The displayed columns now carry different probabilities for the canonical actions.";
  byId("axiom-columns").replaceChildren(node("th","Focal action"),...report.columns.map((k,j)=>{
    const header=node("th","Opponent "+label[k]+" · ");
    const token=node("span",pct(report.view.weights[j]/4),"axiom-weight-token");
    token.dataset.coordinate="weight-"+(controls.defect.checked?j:k);
    header.append(token);
    return header;
  }));
  target.replaceChildren(...report.rows.map((i, displayed) => {
    const tr=row("Action "+label[i], ...report.view.payoffs[displayed].map(cell=>"("+cell.join(", ")+")"));
    report.columns.forEach((j, index) => {tr.cells[index+1].dataset.coordinate=i+"-"+j;});
    return tr;
  }));
  if (animate && !reducedMotion.matches) {
    for (const cell of board.querySelectorAll("[data-coordinate]")) {
      const prior=before.get(cell.dataset.coordinate);
      if (!prior) continue;
      const after=cell.getBoundingClientRect();
      cell.animate([{transform:"translate("+(prior.x-after.x)+"px,"+(prior.y-after.y)+"px)"},{transform:"none"}],
        {duration:350,easing:"ease-out"});
    }
  }
  byId("axiom-response").replaceChildren(...label.map((action,i) => {
    const probabilities = [report.baseline[policy][i],report.mapped[policy][i]];
    const tr=row(action, String(report.original[i]/4),String(report.canonicalUtilities[i]/4),...probabilities.map(pct));
    probabilities.forEach((value,j) => {
      const visual=node("meter");
      visual.max=1;
      visual.value=value;
      visual.setAttribute("aria-hidden","true");
      tr.cells[j+3].append(visual);
    });
    return tr;
  }));
  byId("axiom-distance").textContent = "Total variation "+report.distances[policy].toFixed(4)+
    ". 0 indicates identical canonical response distributions.";
}

function restore() {
  matrix = structuredClone(archive.config.games[Number(controls.game.value)].payoffs);
  for (const {input,i,j,p} of fields) input.value=matrix[i][j][p];
  render(false);
}

for (const control of Object.values(controls)) control.disabled=true;
for(const {input} of fields)input.disabled=true;
byId("axiom-restore").disabled=true;
try {
  const response=await fetch("./data/axiom-pilot.json");
  if(!response.ok)throw new Error("Archive unavailable");
  const loaded=await response.json();
  if(loaded.schemaVersion!=="axiom-finite-v1"||loaded.config.id!=="axiom-pilot-001")throw new Error("Unexpected archive");
  archive=loaded;
  archive.config.games.forEach(({name},i)=>{
    const option=node("option",name);
    option.value=i;
    controls.game.append(option);
  });
  for (const control of Object.values(controls)) control.disabled=false;
  for(const {input} of fields)input.disabled=false;
  byId("axiom-restore").disabled=false;
  controls.game.addEventListener("input",restore);
  for(const control of [controls.belief,controls.view,controls.policy,controls.defect]){
    control.addEventListener("input",()=>render(control===controls.view));
  }
  byId("axiom-restore").addEventListener("click",restore);
  restore();
  const s=archive.summary;
  byId("axiom-status").textContent=archive.config.id+" · "+s.presentations+" verified presentations";
  byId("axiom-archive").textContent=s.tasks+" tasks · "+s.utilityFailures+" utility failures · "+
    s.positionChanges+" position-only changes · "+s.inequivalentDefects+" detected inequivalent remaps out of "+
    s.defectTrials+" deliberate fault attempts.";
} catch {
  byId("axiom-status").textContent="The registered AXIOM benchmark is unavailable. The evidence links remain available below.";
}
