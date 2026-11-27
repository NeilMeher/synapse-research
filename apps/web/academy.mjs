import {solveLinear} from "./engine/artha.mjs";
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

setupTheme();

const number=id=>byId(id).valueAsNumber;
const precise=value=>(100*value).toFixed(2)+"%";
function updateWhen(ids,update){
  for(const id of ids)byId(id).addEventListener("input",update);
  update();
}

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
