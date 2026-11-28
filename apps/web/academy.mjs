import {discounted,feasibleFrontier,returnRate} from "./engine/energia.mjs";
import {solveLinear} from "./engine/artha.mjs";
import {comparePrecision,describeSeries,spanSummary,syntheticDifferences} from "./engine/chronos.mjs";
import {curriculum} from "./knowledge.mjs";
import {byId,pct} from "./view.mjs";
import {row} from "./study-view.mjs";
import {setupTheme} from "./theme.mjs";
import {countDistribution,summarizeCount} from "./engine/dependence.mjs";
import {answerConfidence,evaluateConfidence} from "./engine/confidence.mjs";
import {initializeMarket,inspectAccounts,reconcile,submitOrder} from "./engine/market.mjs";
import {binaryInformationGain} from "./engine/information.mjs";
import {nullFamilyRisk,rankP} from "./engine/scientia.mjs";
import {bestResponse,expectedNumerators,logitResponse} from "./engine/game-theory.mjs";
import {barter,inventoryTotal,production,useAndStore} from "./engine/resources.mjs";
import {createWorld,runWorld} from "./engine/civilizations.mjs";
import {poissonBinomial,tally} from "./engine/echo-public.mjs";
import {decisionRisks,ewmaMoments,firstPassage} from "./engine/adaptive-trust.mjs";
import {auditMoments} from "./engine/morpheus-audit.mjs";

setupTheme();

const number=id=>byId(id).valueAsNumber;
const precise=value=>(100*value).toFixed(2)+"%";
function updateWhen(ids,update){
  for(const id of ids)byId(id).addEventListener("input",update);
  update();
}

updateWhen(["academy-correct-position","academy-correct-label"],()=>{
  const location=number("academy-correct-position"), label=byId("academy-correct-label").value;
  byId("academy-bias-result").textContent="Correct answer appears in position "+location+" with label "+label+
    ". Always-A is "+(label==="A"?"correct":"incorrect")+". Always-first-position is "+(location===1?"correct":"incorrect")+".";
});

updateWhen(["academy-sampling-a"],()=>{
  const p=number("academy-sampling-a")/100, other=(1-p)/3;
  const entropy=-[p,other,other,other].filter(v=>v>0).reduce((sum,v)=>sum+v*Math.log2(v),0);
  byId("academy-sampling-result").textContent="Choice A "+pct(p)+" · entropy "+entropy.toFixed(3)+
    " bits · probability of a correct answer "+pct(other)+".";
});

updateWhen(["academy-shared-draw"],()=>{
  const share=number("academy-shared-draw")/100;
  const independent=poissonBinomial([.8,.65,.55]).slice(2).reduce((a,b)=>a+b,0);
  const majority=(1-share)*independent+share*.65;
  const joint=(1-share)*.2*.35+share*.2;
  byId("academy-shared-result").textContent="Correct majority "+precise(majority)+
    " · joint failure of the first two members "+precise(joint)+".";
});

updateWhen(["academy-vote-rule"],()=>{
  const vote=tally([0,0,1,2,3],[0,1,2,3,4],4,byId("academy-vote-rule").value,1,487291);
  byId("academy-vote-result").textContent=vote.answer===null?"The committee abstains.":"The committee chooses "+"ABCD"[vote.answer]+".";
});

updateWhen(["academy-triple"],()=>{
  const triple=number("academy-triple")/100;
  byId("academy-triple-result").textContent="Strict majority "+precise(1.46-2*triple)+
    " · all three incorrect "+precise(.36-triple)+".";
});

updateWhen(["academy-trust"],()=>{
  const posterior=(3.6+number("academy-trust"))/12;
  byId("academy-trust-result").textContent="Estimated reliability "+precise(posterior)+
    (posterior>.5?" · reports get positive weight.":" · reports get zero weight.");
});

updateWhen(["academy-ewma-rate"],()=>{
  const settings={alpha:number("academy-ewma-rate")/100,initial:.9,threshold:.5,steps:4};
  const broken=firstPassage({...settings,rate:.2});
  const healthy=firstPassage({...settings,rate:.9});
  const expectation=ewmaMoments({...settings,rate:.2});
  byId("academy-ewma-result").textContent="Detection "+precise(1-broken.survival)+
    " · false alarm "+precise(1-healthy.survival)+" · expected faulty-source trust after four audits "+precise(expectation.mean)+".";
});

updateWhen(["academy-audit-cost"],()=>{
  const cost=number("academy-audit-cost")/100;
  const risks=decisionRisks({prior:.5,falseAccept:1,falseReject:1,cost,accuracy:.75});
  const immediate=Math.min(risks.accept,risks.reject);
  const action=risks.verify<immediate?"Verification has lower risk.":
    risks.verify===immediate?"All three actions tie.":"An immediate decision has lower risk.";
  byId("academy-audit-result").textContent="Verification risk "+risks.verify.toFixed(2)+" · "+action;
});

updateWhen(["academy-audit-accuracy"],()=>{
  const accuracy=number("academy-audit-accuracy")/100;
  const {observed,correctedVariance}=auditMoments(.2,accuracy);
  byId("academy-audit-accuracy-result").textContent="Positive audits "+precise(observed)+" · "+
    (correctedVariance===null?"Chance audits carry no reliability information.":
      "corrected observation variance "+correctedVariance.toFixed(3)+".");
});

updateWhen(["academy-agents","academy-rho"],()=>{
  const n=number("academy-agents"), rho=number("academy-rho");
  const shared=countDistribution(n,.65,rho,"shared");
  const beta=countDistribution(n,.65,rho,"beta");
  const s=summarizeCount(shared), b=summarizeCount(beta);
  byId("academy-dependence").textContent=n+" reports · correlation "+rho.toFixed(2)+
    " · majority correct "+pct(s.majority)+" with shared shock and "+pct(b.majority)+" with beta mixture"+
    " · unanimous error "+pct(s.unanimousError)+" versus "+pct(b.unanimousError)+".";
  byId("academy-counts").replaceChildren(...shared.map((mass,k)=>row(String(k),precise(mass),precise(beta[k]))));
});

updateWhen(["academy-prior","academy-hint","academy-agreement"],()=>{
  const prior=number("academy-prior"), hint=number("academy-hint");
  const conditional=answerConfidence(prior,hint,byId("academy-agreement").value==="agree");
  const scores=evaluateConfidence([1,1,1,0],Array(4).fill(conditional));
  byId("academy-bayes").textContent="Prior "+pct(prior)+" · hint reliability "+pct(hint)+
    " · posterior "+precise(conditional)+" · observed rate "+pct(scores.accuracy)+" · Brier "+scores.brier.toFixed(3)+".";
});

updateWhen(["academy-market-side","academy-lots","academy-impact"],()=>{
  const impact=number("academy-impact"), requested=number("academy-lots");
  const side=byId("academy-market-side").value;
  const market=initializeMarket([{id:"trader",cash:1000,assets:5},{id:"maker",cash:1000,assets:8}],
    {anchor:100,halfSpread:2,impact,fee:1});
  const event=submitOrder(market,{actor:"trader",side,quantity:requested,limit:side==="buy"?1000:1});
  const balances=inspectAccounts(market), total=reconcile(market);
  byId("academy-market").textContent=event.fills.length+" of "+requested+" lots filled"+
    (event.fills.length?" at "+event.fills.map(fill=>fill.price).join(", "):"")+
    " · midpoint "+event.before.midpoint+" → "+event.after.midpoint+
    " · reconciled totals "+total.cash+" cash and "+total.assets+" assets.";
  byId("academy-ledger").replaceChildren(...Object.entries(balances).map(([id,a])=>
    row(id,String(a.cash),String(a.assets),String(a.markedWealth))));
});

updateWhen(["academy-model-prior","academy-positive-a","academy-positive-b"],()=>{
  const value=binaryInformationGain(number("academy-model-prior"),number("academy-positive-a"),number("academy-positive-b"));
  const posterior=p=>p===null?"impossible outcome":pct(p);
  byId("academy-information").textContent="P(+) "+pct(value.positive)+" · P(A|+) "+
    posterior(value.posteriorPositive)+" · P(A|−) "+posterior(value.posteriorNegative)+
    " · expected information "+value.information.toFixed(4)+" bits.";
});

updateWhen(["academy-tests","academy-level","academy-rule"],()=>{
  const n=number("academy-tests"),alpha=number("academy-level");
  const found=rankP([.005,.012,.028,.14],alpha,byId("academy-rule").value);
  byId("academy-testing").textContent=n+" independent nulls at "+pct(alpha)+" · family risk "+
    precise(nullFamilyRisk(n,alpha))+" · adjusted-example reports "+
    (found.length?found.map(i=>"H"+(i+1)).join(", "):"none")+".";
});

updateWhen(["academy-opponent"],()=>{
  const weight=number("academy-opponent");
  const matrix=[[[4,4],[0,3]],[[3,0],[3,3]]];
  const utilities=expectedNumerators(matrix,[weight,4-weight]).map(value=>value/4);
  const best=bestResponse(utilities)[0];
  const logit=logitResponse(utilities)[0];
  byId("academy-strategy-result").textContent="Opponent A "+pct(weight/4)+" · utilities "+
    utilities.map(value=>value.toFixed(2)).join(" and ")+" · action A probability "+
    pct(best)+" under uniform best response, "+pct(logit)+" under logit.";
});

updateWhen(["academy-barter"],()=>{
  const quantity=number("academy-barter");
  const first=production([4,2],2,2), second=production([2,4],2,0);
  if(quantity)barter(first,second,0,quantity,true);
  const [a,b]=[first,second].map(stock=>useAndStore(stock,[4,4]).consumed.reduce((sum,x)=>sum+x,0));
  byId("academy-resources-result").textContent="A ["+first.join(", ")+"] consumes "+a+
    " · B ["+second.join(", ")+"] consumes "+b+" · aggregate stocks "+inventoryTotal([first,second]).join(" / ")+".";
});

const teachingWorld=createWorld(299538405,"stress",24);
updateWhen(["academy-history"],()=>{
  const method=byId("academy-history");
  const metric=runWorld(teachingWorld,method.value).metric;
  byId("academy-cooperation-result").textContent=method.selectedOptions[0].textContent+" · "+
    metric.deliveries+" deliveries in "+metric.attempts+" attempts · "+pct(metric.needsSatisfied)+
    " of need fulfilled · consumption Gini "+metric.giniConsumed.toFixed(3)+".";
});

updateWhen(["academy-io-demand"],()=>{
  const demand=number("academy-io-demand");
  const [construction,equipment]=solveLinear([[1,-.1],[-.2,1]],[demand,0]);
  byId("academy-io-result").textContent="Construction "+construction.toFixed(2)+"m · equipment "+
    equipment.toFixed(2)+"m · gross output "+(construction+equipment).toFixed(2)+"m.";
});

updateWhen(["academy-energy-load"],()=>{
  const load=number("academy-energy-load")/100,avg=10+20*load;
  const site=avg*1.5*24;
  byId("academy-energy-result").textContent=avg.toFixed(1)+" kW average IT · "+site.toFixed(1)+
    " kWh facility · "+(avg/30*100).toFixed(1)+"% IT load factor.";
});

updateWhen(["academy-finance-cash"],()=>{
  const cash=number("academy-finance-cash");
  const project=[-100,cash,cash], equity=[-50,cash-30,cash-27.5];
  const irr=returnRate(project);
  byId("academy-finance-result").textContent="Project NPV $"+discounted(project,.10).toFixed(2)+
    " · Equity NPV $"+discounted(equity,.15).toFixed(2)+" · DSCR "+(cash/30).toFixed(2)+"× and "+
    (cash/27.5).toFixed(2)+"× · Project IRR "+(irr.value===null?irr.status:(irr.value*100).toFixed(2)+"%")+".";
});

try{
  const response=await fetch("./experiments/energia-scenario.json");
  if(!response.ok)throw new Error("ENERGIA configuration unavailable.");
  const {id,base,optimization}=await response.json();
  if(id!=="energia-scenario-001")throw new Error("Unregistered decision set.");
  const control=byId("academy-water-limit");
  control.disabled=false;
  updateWhen(["academy-water-limit"],()=>{
    const ceiling=control.valueAsNumber;
    const result=feasibleFrontier(base,optimization.options,{...optimization.limits,siteWaterM3:ceiling});
    const count=result.candidates.filter(item=>!item.failures.length).length;
    byId("academy-opt-result").textContent=ceiling+" m³ ceiling · "+count+" feasible candidate"+(count===1?"":"s")+
      " · frontier "+(result.frontier.join(", ")||"empty");
  });
}catch{
  byId("academy-opt-result").textContent="The registered design set is unavailable.";
}

const academyAnchor=(text,href)=>{
  const link=document.createElement("a");
  link.href="./"+href;
  link.textContent=text;
  return link;
};
byId("academy-concepts").replaceChildren(...curriculum.map(lesson=>{
  const row=document.createElement("li");
  row.append(academyAnchor(lesson.name,lesson.route));
  if(lesson.requires.length){
    row.append(" · Prerequisites ");
    lesson.requires.forEach((id,index)=>{
      const required=curriculum.find(x=>x.id===id);
      if(index)row.append(", ");
      row.append(academyAnchor(required.name,required.route));
    });
  }
  return row;
}));
updateWhen(["academy-selection"],()=>{
  const comparison=syntheticDifferences({selection:number("academy-selection")});
  byId("academy-selection-result").textContent="Post-only difference "+comparison.crossSection+
    " · known treatment effect "+comparison.truth+" · DiD "+comparison.did+".";
});
updateWhen(["academy-trend"],()=>{
  const comparison=syntheticDifferences({trendGap:number("academy-trend")});
  byId("academy-trend-result").textContent="DiD "+comparison.did+" · known effect "+comparison.truth+" · bias "+comparison.bias+".";
});
updateWhen(["academy-rounding"],()=>{
  const current=number("academy-rounding"),check=comparePrecision(69439,current,2,1000);
  byId("academy-rounding-result").textContent=current.toLocaleString("en")+" route km · difference "+check.delta+
    " km · half-step "+check.halfStep+" km · "+check.status+".";
});
try{
  const response=await fetch("./data/processed/chronos-rail.json");
  if(!response.ok)throw new Error("Archive unavailable.");
  const data=await response.json();
  if(data.schemaVersion!=="chronos-rail-v1")throw new Error("Different historical schema.");
  const control=byId("academy-rail-base");
  control.replaceChildren(...data.national.slice(0,-1).map(r=>new Option(r.period.label,String(r.period.endYear))));
  control.disabled=false;
  updateWhen(["academy-rail-base"],()=>{
    const year=Number(control.value);
    const comparison=spanSummary(describeSeries(data.national,"route",year),year,2025);
    byId("academy-history-result").textContent="2024–25 index "+(100*comparison.end/comparison.start).toFixed(2)+
      " · annualized growth "+comparison.cagr.toFixed(2)+"% over "+comparison.years+" years.";
  });
}catch{
  byId("academy-history-result").textContent="The registered historical example is unavailable.";
}
