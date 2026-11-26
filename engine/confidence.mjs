const mean = values => values.reduce((a,b)=>a+b,0)/values.length;

export function answerConfidence(qAnswer,qHint,agreement) {
  const one = qAnswer * (agreement ? qHint : 1-qHint);
  const zero = (1-qAnswer) * (agreement ? 1-qHint : qHint);
  if (one+zero===0) throw new RangeError("Observation impossible under this observer.");
  return one/(one+zero);
}

export function evaluateConfidence(outcomes, probabilities) {
  if (!outcomes.length || outcomes.length!==probabilities.length ||
      outcomes.some(value=>value!==0&&value!==1) ||
      probabilities.some(value=>!Number.isFinite(value)||value<0||value>1)) throw new RangeError("Invalid probabilities or outcomes.");
  const bins=Array.from({length:10},()=>({n:0,correct:0,total:0}));
  const groups=new Map();
  let nll=0;
  for (const [i,p] of probabilities.entries()) {
    const correct=outcomes[i];
    const bin=bins[Math.min(9,Math.floor(p*10))];
    bin.n++;
    bin.correct+=correct;
    bin.total+=p;
    const group=groups.get(p)??{p,n:0,correct:0};
    group.n++;
    group.correct+=correct;
    groups.set(p,group);
    nll-=correct?Math.log(p):Math.log1p(-p);
  }
  const n=outcomes.length;
  let ahead=0, rankedWins=0;
  const rankGroups=[...groups.values()].sort((a,b)=>b.p-a.p);
  for (const group of rankGroups) {
    rankedWins+=(ahead+group.correct/2)*(group.n-group.correct);
    ahead+=group.correct;
  }
  const rankDenominator=ahead*(n-ahead);
  const riskCoverage=[.1,.25,.5,.75,1].map(coverage=>{
    const target=n*coverage;
    let correct=0;
    let retained=0;
    for (const group of rankGroups) {
      const take=Math.min(group.n,target-retained);
      correct+=take*group.correct/group.n;
      retained+=take;
      if (retained>=target-1e-12) break;
    }
    return {coverage,risk:1-correct/target};
  });
  const reliability=bins.map(b=>({n:b.n,confidence:b.n?b.total/b.n:null,accuracy:b.n?b.correct/b.n:null}));
  return {
    trials:n,accuracy:mean(outcomes),brier:mean(probabilities.map((p,i)=>(p-outcomes[i])**2)),
    nll:Number.isFinite(nll)?nll/n:null,nllStatus:Number.isFinite(nll)?"finite":"infinite",
    errorAUROC:rankDenominator?rankedWins/rankDenominator:null,
    ece:bins.reduce((sum,b)=>sum+Math.abs(b.total-b.correct)/n,0),
    reliability,riskCoverage,
  };
}
