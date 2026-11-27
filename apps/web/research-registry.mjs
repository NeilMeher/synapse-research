export const registryVersion=2;

export const divisions=[
  ["cognition","Individual cognition"],
  ["collective","Collective intelligence"],
  ["science","Scientific intelligence"],
  ["economy","Economic complexity"],
];

export const laboratories=[
  {id:"mirage",name:"MIRAGE",division:"cognition",question:"Can functional metacognition distinguish self-monitoring from imitation?",links:["echo","reflex"]},
  {id:"morpheus",name:"MORPHEUS",division:"cognition",question:"How does memory architecture shape behavioural continuity?",links:["mirage","alpha-decay"]},
  {id:"axiom",name:"AXIOM",division:"cognition",question:"How do incentives and framing change decisions across equivalent games?",links:["echo","civilizations"]},
  {id:"echo",name:"ECHO",division:"collective",question:"When does communication improve collective accuracy or amplify shared errors?",links:["mirage","civilizations","scientia","reflex"]},
  {id:"civilizations",name:"GAME OF CIVILIZATIONS",division:"collective",question:"When can cooperation, exchange and institutions emerge under resource constraints?",links:["echo","axiom","chronos"]},
  {id:"chronos",name:"CHRONOS",division:"collective",question:"How can historical evidence support transparent causal and counterfactual analysis?",links:["civilizations","scientia"]},
  {id:"noesis",name:"NOESIS",division:"science",question:"Can computational systems recover hidden rules from observations?",links:["scientia","mirage"]},
  {id:"scientia",name:"SCIENTIA",division:"science",question:"Which research workflows remain reproducible and resist false discovery?",links:["noesis","echo","chronos"]},
  {id:"reflex",name:"REFLEX",division:"economy",question:"How do information and constraints produce feedback in financial markets?",links:["echo","alpha-decay","mirage"]},
  {id:"alpha-decay",name:"ALPHA DECAY",division:"economy",question:"How does strategy adoption change the performance of that strategy?",links:["reflex","morpheus"]},
  {id:"artha",name:"ARTHA",division:"economy",question:"How do sector linkages transmit policy and economic shocks?",links:["energia","reflex"]},
  {id:"energia",name:"ENERGIA",division:"economy",question:"How do infrastructure and power constraints shape AI investment?",links:["artha","reflex"]},
];

function study(id,name,route,labs,description,contrast,options={}){
  const stem=id==="echo"?"":id+"-";
  return {
    id,name,route,labs,description,contrast,
    evidence:"Synthetic computation",
    concepts:[],
    humanReview:"Independent human review pending",
    archiveStem:stem,
    archivePhases:["pilot","confirmatory"],
    studyIds:[stem+"pilot-001",stem+"confirmatory-001"],
    manuscript:"papers/"+id+".md",
    protocol:"research/"+(id==="echo"?"echo-protocol-":stem)+"confirmatory.md",
    result:"data/"+stem+"confirmatory.json",
    manifest:"data/"+stem+"confirmatory.manifest.json",
    learning:"docs/"+id+"-learning.md",
    ...options,
  };
}

export const researchStudies=[
  study("echo","ECHO v1","index.html#evidence",["echo"],
    "Correlated evidence, communication and an independent verification budget.",
    "Compare correlated majority decisions with and without replacement verification.",
    {math:"research/echo-mathematics.md",studyIds:["echo-pilot-001","echo-confirmatory-001"]}),
  study("echo2","ECHO 2.0","index.html#robustness",["echo"],
    "Matched dependence laws, exact finite bounds and network effects.",
    "Compare majority accuracy across laws with the same marginal reliability and pairwise correlation.",
    {math:"research/echo2-mathematics.md"}),
  study("mirage","MIRAGE","mirage.html",["mirage"],
    "Forecast calibration and selective risk under informative and misleading hints.",
    "Compare evidence-based confidence with imitation for identical first-order answers."),
  study("reflex","REFLEX","reflex.html",["reflex"],
    "Price formation, order flow and instrument-level conservation in a synthetic market.",
    "Compare market outcomes under matched outside signals and different price-impact levels."),
  study("convergence","CONVERGENCE","convergence.html",["mirage","echo","reflex"],
    "A joint study carrying confidence and communication into market orders.",
    "Compare paired market outcomes under evidence procedures and simulated liquidity."),
  study("morpheus","MORPHEUS","morpheus.html",["morpheus"],
    "Behavioural continuity under clean and corrupted synthetic memories.",
    "Test provenance weighting against keyword matching under corruption and clean updates.",
    {math:"research/morpheus-mathematics.md"}),
  study("alpha-decay","ALPHA DECAY","alpha-decay.html",["alpha-decay"],
    "Endogenous strategy crowding and market impact under matched capital.",
    "Compare adopter alpha across levels of crowding, including a zero-impact control."),
  study("noesis","NOESIS","noesis.html",["noesis"],
    "Hidden-law discovery and independent reconstruction of the archived benchmark.",
    "Compare the family recovery of predictive-mean disagreement with random and uniform inquiry.",
    {math:"research/noesis-mathematics.md"}),
  study("scientia","SCIENTIA","scientia.html",["scientia"],
    "Multiple testing, power and disjoint validation under matched observation budgets.",
    "Compare unadjusted and Holm family error, and unadjusted and BH false discovery rates.",
    {math:"research/scientia-audit.md"}),
  study("episteme","EPISTEME","episteme.html",["noesis","scientia"],
    "Matched hidden-law inquiries through independent validation and replication.",
    "Compare correct final claims in library and false proposals outside the library.",
    {math:"research/episteme-confirmatory.md"}),
  study("axiom","AXIOM","axiom.html",["axiom"],
    "Exact utility and decision controls for payoff-preserving game presentations.",
    "Compare canonical action responses and deliberate belief- and position-dependent controls.",
    {evidence:"Exact finite benchmark",archivePhases:["pilot"],studyIds:["axiom-pilot-001"],
      protocol:"research/axiom-pilot.md",math:"research/axiom-design.md",audit:"research/axiom-audit.md",
      result:"data/axiom-pilot.json",manifest:"data/axiom-pilot.manifest.json",
      config:"experiments/axiom-pilot.json",engine:"engine/axiom.mjs",concepts:[
        ["Payoff matrices","axiom.html#axiom-workbench"],["Expected utility","academy.html#strategy"],
        ["Strategic consistency","research/axiom-audit.md"],["Game theory","docs/axiom-learning.md"]]}),
  study("civilizations","GAME OF CIVILIZATIONS","civilizations.html",["civilizations"],
    "Conserved local barter with matched delivery-history regimes and labor shocks.",
    "Compare need satisfaction with pooled records against a fixed reliability prior.",
    {math:"research/civilizations-pilot.md",audit:"research/civilizations-audit.md",
      config:"experiments/civilizations-confirmatory.json",pilotConfig:"experiments/civilizations-pilot.json",
      engine:"engine/civilizations.mjs",concepts:[["Resource accounting","civilizations.html#village"],
        ["Comparative advantage","academy.html#resources"],["Economic exchange","research/civilizations-pilot.md"],
        ["Reputation","docs/civilizations-learning.md"]]}),
  study("polis","POLIS","polis.html",["axiom","civilizations"],
    "Matched artificial economies with alternative strategic decision objectives.",
    "Compare joint-gain and payer-gain acceptance under pooled delivery records.",
    {math:"research/polis-pilot.md",audit:"research/polis-audit.md",
      config:"experiments/polis-confirmatory.json",pilotConfig:"experiments/polis-pilot.json",
      engine:"engine/polis.mjs",concepts:[["Cooperation","academy.html#cooperation"],
        ["Decisions and aggregate outcomes","polis.html#mechanism"],["Institutional rules","research/polis-audit.md"]]}),
];

export const directStudies=new Map(laboratories.map(lab=>[lab.id,researchStudies.find(study=>study.id===lab.id)]));

export function sharedStudy(left,right){
  return researchStudies.find(study=>study.labs.includes(left)&&study.labs.includes(right));
}

export const journeys=[
  {name:"Collective intelligence",steps:[
    ["ECHO","index.html#echo"],["Correlated errors","index.html#robustness"],
    ["Opinion dynamics","research/echo2-mathematics.md"],["Collective decision accuracy","index.html#evidence"]]},
  {name:"Cognition and markets",steps:[
    ["MIRAGE","mirage.html"],["ECHO","index.html#echo"],["REFLEX","reflex.html"],["CONVERGENCE","convergence.html"]]},
  {name:"Memory and behaviour",steps:[
    ["MORPHEUS","morpheus.html"],["Provenance","research/morpheus-mathematics.md"],
    ["Decisions","morpheus.html#morpheus-step"],["Confidence","mirage.html#mirage-reliability"]]},
  {name:"Financial complexity",steps:[
    ["REFLEX","reflex.html"],["ALPHA DECAY","alpha-decay.html"],
    ["Liquidity","convergence.html#convergence-price"],["Strategy crowding","alpha-decay.html#alpha-table"]]},
  {name:"Scientific discovery",steps:[
    ["NOESIS","noesis.html"],["SCIENTIA","scientia.html"],["EPISTEME","episteme.html"]]},
  {name:"From individual incentives to collective institutions",steps:[
    ["AXIOM","axiom.html"],["Expected utility","academy.html#strategy"],
    ["Resource accounting","academy.html#resources"],["GAME OF CIVILIZATIONS","civilizations.html"],
    ["Repeated cooperation","academy.html#cooperation"],["POLIS","polis.html"]]},
];
