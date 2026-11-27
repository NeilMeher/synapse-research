import {divisions,laboratories,researchStudies,sharedStudy} from "./research-registry.mjs";

export const curriculum=[
  ["dependence","Probability and dependence",[],"echo"],
  ["calibration","Bayes and calibration",["dependence"],"mirage"],
  ["accounting","Market accounting",[],"reflex"],
  ["discovery","Model selection and information",["calibration"],"noesis"],
  ["testing","Tests and false discovery",["dependence"],"scientia"],
  ["strategy","Game theory and expected utility",["dependence"],"axiom"],
  ["resources","Comparative advantage and resource accounting",["accounting"],"civilizations"],
  ["cooperation","Cooperation and complex systems",["resources","strategy"],"polis"],
  ["input-output","Input–output economics",["accounting"],"artha"],
  ["power-energy","Energy and engineering mathematics",[],"energia"],
  ["project-finance","Infrastructure project finance",["accounting","power-energy"],"energia"],
  ["optimization","Optimization and uncertainty",["project-finance","dependence"],"nexus"],
  ["historical-measurement","Historical statistics and economic measurement",["accounting"],"chronos"],
  ["causal-inference","Causal inference",["historical-measurement","dependence"],"chronos"],
  ["econometrics","Econometric research designs",["causal-inference","testing"],"chronos"],
  ["model-uncertainty","Scientific modelling and uncertainty",["econometrics","optimization"],"scientia"],
].map(([id,name,requires,study])=>({id,name,requires,study,route:"academy.html#"+id}));

export const findings={
  echo:["Conditional","Verification improves selected correlated decisions under the registered shared-source law.","The dependence law and verification budget are imposed."],
  echo2:["Exact and conditional","Pairwise correlation and marginal accuracy do not determine majority accuracy. Exact finite bounds coexist with simulated sampling intervals.","Matching two moments leaves higher-order dependence unspecified."],
  mirage:["Negative control","Confidence calibration can deteriorate under misleading cues while first-order decisions stay matched.","Functional confidence is measured through forecasts and accuracy."],
  reflex:["Conditional","Price response and execution depend on the prescribed market and price-impact mechanism.","Short synthetic markets omit much real liquidity and behaviour."],
  convergence:["Inconclusive","Both preregistered primary intervals include zero.","The matched synthetic contrasts remain inconclusive for the specified outcomes."],
  morpheus:["Mixed","Provenance weighting improved performance under corrupt history and hurt it under clean changing history.","Behavioural continuity reflects a synthetic memory and task architecture."],
  "alpha-decay":["Mixed","Crowding reduced relative returns under prescribed price impact. The zero-impact control did not establish a matching reduction.","Returns arise from a synthetic execution and fee mechanism."],
  noesis:["Inconclusive","Disagreement sampling did not establish superiority over random or uniform inquiry in the confirmatory design.","Results depend on the finite law family, prior and candidate grid."],
  scientia:["Mixed","Multiplicity correction reduced false discovery at a power cost.","The exact-tail audit records a numerical discrepancy and its scope."],
  episteme:["Mixed","Adaptive inquiry improved some correct claims while increasing false proposals outside the candidate library.","Proposal error and final validated claims are distinct outcomes."],
  axiom:["Exact","Equivalent payoff presentations preserve the transformed prescribed decision policies.","Finite implementation benchmark with no human subjects."],
  civilizations:["Negative","Pooled delivery records reduced need satisfaction under the registered prepaid economy.","Outcome depends on the synthetic rules, local exchange and resource constraints."],
  polis:["Mixed","The joint-gain policy improved aggregate need fulfillment while lowering some individuals' intake.","The result depends on the prepaid mechanism and stipulated utilities."],
  polis2:["Exact and conditional","The joint-gain advantage disappeared under payment on delivery, where modeled decisions coincide.","Prepaid and contingent settlements are separately imposed model regimes."],
  artha:["Conditional","Official domestic input–output accounts yield different gross output and value added for equal hypothetical purchases.","National fixed coefficients omit supply constraints, prices and employment."],
  energia:["Negative","The sample compute facility had negative NPV and a year-five replacement-related payment shortfall.","Commercial terms and engineering load assumptions are hypothetical."],
  nexus:["Conditional","Higher domestic purchasing shares moved modeled production requirements with fixed facility prices and compute capacity.","The direct imported accelerator package stays outside domestic demand."],
  chronos:["Observed and derived","Originating freight rose 1.69% in 2024–25 while net tonne-km fell 0.30%.","Unresolved source scope, short paired annual series and incompatible treatment geography limit interpretation."],
};

const key=(a,b)=>[a,b].sort().join("/");
const peerEvidence={
  [key("artha","energia")]:["dependency","NEXUS consumes the domestic table and the infrastructure capital ledger.","nexus.html#bridge"],
  [key("echo","mirage")]:["joint","CONVERGENCE carries confidence and collective evidence into a matched synthetic market.","convergence.html"],
  [key("echo","reflex")]:["joint","CONVERGENCE connects information and market decisions in an executed study.","convergence.html"],
  [key("mirage","reflex")]:["joint","Matched confidence procedures are connected to price formation in CONVERGENCE.","convergence.html"],
  [key("axiom","civilizations")]:["joint","POLIS compares alternative strategic choices inside a conserved resource economy.","polis.html"],
  [key("noesis","scientia")]:["dependency","EPISTEME combines the inquiry and independent validation mechanisms.","episteme.html"],
  [key("morpheus","mirage")]:["question","Both studies ask how a functional system can use information to revise belief or maintain consistency.","morpheus.html"],
  [key("reflex","alpha-decay")]:["method","Both use an auditable execution ledger to connect orders and price impact.","alpha-decay.html"],
  [key("echo","scientia")]:["method","Both explore consequences of dependence when aggregating evidence.","academy.html#dependence"],
  [key("chronos","scientia")]:["question","Both expose evidence quality and assumptions before interpreting a result.","chronos.html#causal"],
  [key("chronos","artha")]:["question","Both use official Indian statistics with different observation and modeling boundaries.","chronos.html#provenance"],
};
export const relationLabels={dependency:"Validated dependency",joint:"Executed joint study",method:"Shared method",question:"Shared research question",proposed:"Proposed research relationship"};
export function labConnection(left,right){
  const selected=peerEvidence[key(left,right)];
  if(selected)return {type:selected[0],label:relationLabels[selected[0]],detail:selected[1],route:selected[2]};
  const study=sharedStudy(left,right);
  if(study)return {type:"joint",label:relationLabels.joint,detail:study.description,route:study.route};
  return {type:"proposed",label:relationLabels.proposed,detail:"The laboratories are related by a proposed research direction."};
}

export function evidenceClass(study){
  if(study.id==="chronos")return "Official historical data";
  if(["artha","nexus"].includes(study.id))return "Official-data conditional model";
  if(study.id==="energia")return "Illustrative scenario";
  if(study.id==="axiom")return "Exact finite benchmark";
  return "Confirmatory synthetic research";
}
export function buildKnowledge(){
  const nodes=[],edges=[];
  const add=(id,type,name,route,description="")=>nodes.push({id,type,name,route,description});
  const connect=(from,to,type)=>edges.push({from,to,type});
  for(const [id,name] of divisions)add("division/"+id,"Division",name,"index.html#map");
  for(const lab of laboratories){
    add("lab/"+lab.id,"Laboratory",lab.name,"index.html#lab-"+lab.id,lab.question);
    connect("lab/"+lab.id,"division/"+lab.division,"belongs to");
  }
  for(const lab of laboratories)for(const link of lab.links){
    if(lab.id>link&&laboratories.find(d=>d.id===link).links.includes(lab.id))continue;
    connect("lab/"+lab.id,"lab/"+link,labConnection(lab.id,link).label);
  }
  for(const study of researchStudies){
    const base="study/"+study.id;
    add(base,study.labs.length===1?"Study":"Interdisciplinary study",study.name,study.route,study.contrast);
    for(const lab of study.labs)connect("lab/"+lab,base,"investigates");
    for(const [suffix,type,route,detail] of [["result","Result",study.result,findings[study.id][1]],["paper","Manuscript","reader.html?study="+study.id,study.description],
      ["protocol","Protocol",study.protocol,study.contrast],["limit","Limitation",study.audit??study.manuscript,findings[study.id][2]]]){
      add(base+"/"+suffix,type,study.name+" "+type.toLowerCase(),route,detail);
      connect(base,base+"/"+suffix,suffix==="limit"?"has limitation":"has evidence");
    }
    for(const [i,[name,route]] of study.concepts.entries()){
      add(base+"/concept/"+i,"Concept",name,route,study.name+" research concept");
      connect(base,base+"/concept/"+i,"uses mathematics or method");
    }
    for(const [i,path] of (study.assets??[]).filter(s=>s.startsWith("sources/")).entries()){
      add(base+"/source/"+i,"Data source",study.name+" source and provenance",path,study.description);
      connect(base,base+"/source/"+i,"uses data from");
    }
  }
  for(const lesson of curriculum){
    add("lesson/"+lesson.id,"Lesson",lesson.name,lesson.route);
    connect("study/"+lesson.study,"lesson/"+lesson.id,"has educational explanation");
    for(const id of lesson.requires)connect("lesson/"+lesson.id,"lesson/"+id,"requires");
  }
  add("future/empirical","Proposed research","Empirical AI evaluations","research/future-empirical-programme.md","Proposed model benchmarks and external replication.");
  connect("lab/echo","future/empirical","proposed follow-up");
  return {nodes,edges};
}

const synonymGroups=[
  ["subjective experience","consciousness","metacognition","functional confidence","behavioural continuity"],
  ["railway","railroads","electrification","railway history","freight"],
  ["difference in differences","did","causal inference","causal identification"],
  ["bayes","bayesian","posterior","calibration"],
  ["project finance","discounted cash flow","npv","dscr"],
  ["false discovery","multiplicity","multiple testing"],
];
const normal=s=>s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
export function searchEvidence(nodes,query,type="all"){
  const selected=nodes.filter(n=>type==="all"||n.type===type);
  const token=normal(query).slice(0,130);
  if(!token)return selected.slice(0,40);
  const words=token.split(" ");
  const phrase=" "+token+" ";
  const similar=synonymGroups.filter(group=>group.some(word=>phrase.includes(" "+word+" "))).flat();
  return selected.map(item=>{
    const title=normal(item.name),body=normal(item.description+" "+(item.searchText??""));
    const matches=words.filter(word=>title.includes(word)||body.includes(word)).length;
    const score=(title.includes(token)?24:0)+(body.includes(token)?10:0)+matches*2+
      similar.filter(s=>title.includes(s)||body.includes(s)).length;
    return {item,score,matches};
  }).filter(x=>x.score>0&&(x.matches===words.length||similar.length>0))
    .sort((a,b)=>b.score-a.score||a.item.name.localeCompare(b.item.name)).slice(0,40).map(x=>x.item);
}

export const keyMeasurements={
  echo:["6.04 percentage points","Verification gain at ρ = 0.75","95% adjusted interval 5.19 to 6.89 points"],
  echo2:["−13.75 percentage points","Exact beta-binomial minus shared-source majority accuracy at the primary cell","Monte Carlo estimate −13.72 points, 95% interval −14.55 to −12.89 points"],
  mirage:["0.1743 to 0.2202 Brier loss","Trained confidence, normal to misleading cues","Identical first-order accuracy of 71.97%"],
  reflex:["−6.43 ticks","Pricing error contrast, four versus one tick of impact","95% paired interval −7.32 to −5.54 ticks"],
  convergence:["+1.89 ticks","Beta-binomial minus shared-source terminal pricing error","Family-adjusted interval −2.24 to +6.02 ticks"],
  morpheus:["−11.61 percentage points","Provenance minus keyword accuracy in the clean, changing-history regime","95% adjusted interval −12.46 to −10.76 points"],
  "alpha-decay":["−0.4100 percentage points","Nine versus one adopter in the four-tick market","95% adjusted interval −0.4442 to −0.3757 points"],
  noesis:["+2.67 percentage points","Disagreement versus random family recovery","95% adjusted interval −1.68 to +7.02 points"],
  scientia:["59.06 percentage points","Unadjusted minus Holm familywise error under independent all-null n = 32","95% adjusted interval 57.50 to 60.62 points"],
  episteme:["+4.25 percentage points","Disagreement versus random false proposals outside the candidate library","95% adjusted interval +1.78 to +6.72 points"],
  axiom:["0 total variation","Maximum canonical policy change under payoff-preserving permutations","Exact finite control across 80 presentations"],
  civilizations:["−9.61 percentage points","Pooled delivery records versus fixed prior under scarcity","95% paired interval −9.80 to −9.41 points"],
  polis:["+9.49 percentage points","Joint versus payer gain under prepaid stress","95% paired interval +9.29 to +9.70 points"],
  polis2:["−9.60 percentage points","Payment-on-delivery minus prepayment interaction at surplus value 2","95% paired interval −9.89 to −9.31 points"],
  artha:["$185.09 million gross output","$100m hypothetical domestic construction shock, detailed ADB India 2024 panel","Fixed-coefficient conditional result"],
  energia:["−$648,033 project NPV","Hypothetical 128-GPU baseline in scenario USD","Deterministic discounted schedule"],
  nexus:["$1.209m to $1.565m gross output","Lower to higher assumed domestic procurement at fixed facility design","Official-data conditional result"],
  chronos:["−0.30% transport work","National revenue-earning net tonne-km from 2023–24 to 2024–25","Observed source-based arithmetic"],
};
