const finite=value=>typeof value==="number"&&Number.isFinite(value);
export const annualMetrics={
  route:{name:"Total route length",unit:"route km",kind:"stock"},
  electric:{name:"Electrified route length",unit:"route km",kind:"stock"},
  tonnes:{name:"Revenue-earning originating freight",unit:"million tonnes",kind:"flow"},
  ntkm:{name:"Revenue-earning freight transport work",unit:"billion net tonne-km",kind:"flow"},
  lead:{name:"Net tonne-km per originating tonne",unit:"km",kind:"derived"},
  share:{name:"Electrified share of total route length",unit:"%",kind:"derived"}
};

export function fiscalPeriod(label,through=null){
  const match=/^(\d{4})[-–](\d{2})$/.exec(label);
  if(!match)throw new RangeError("Use a fiscal label such as 2024-25.");
  const startYear=Number(match[1]), endYear=startYear+1;
  if(endYear%100!==Number(match[2]))throw new RangeError("Nonconsecutive fiscal years.");
  const start=startYear+"-04-01", expectedEnd=endYear+"-03-31", end=through??expectedEnd;
  if(typeof end!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start||end>expectedEnd||
     !Number.isFinite(Date.parse(end))||new Date(end).toISOString().slice(0,10)!==end)throw new RangeError("Invalid reporting cutoff.");
  return {label:startYear+"-"+match[2],start,end,endYear,complete:end===expectedEnd};
}

function valueOf(cell){
  return cell&&finite(cell.value)&&cell.value>=0?cell.value:null;
}

export function observation(record,key){
  if(!Object.hasOwn(annualMetrics,key))throw new RangeError("Unknown historical measure.");
  if(key!=="share"&&key!=="lead")return record.cells[key]??null;
  const [left,right,scale]=key==="share"?["electric","route",100]:["ntkm","tonnes",1000];
  const a=record.cells[left],b=record.cells[right];
  const x=valueOf(a), y=valueOf(b);
  if(x===null||y===null||!(y>0)||!record.period.complete||a.coverage!==b.coverage||x>y&&key==="share")return null;
  return {value:x/y*scale,coverage:a.coverage,sources:[a,b]};
}

const sameRun=(a,b)=>a.period.complete&&b.period.complete&&a.cell?.coverage===b.cell?.coverage;
const pct=(current,prior)=>100*(current/prior-1);
export function describeSeries(records,key,indexYear){
  if(!Array.isArray(records)||records.some((r,i)=>i>0&&r.period.endYear<=records[i-1].period.endYear))
    throw new RangeError("Historical series must have unique ascending fiscal periods.");
  const source=records.map(record=>({...record,cell:observation(record,key)}));
  const picked=source.find(r=>r.period.endYear===indexYear);
  return source.map((record,i)=>{
    const value=valueOf(record.cell), prior=source[i-1], old=valueOf(prior?.cell), base=valueOf(picked?.cell);
    const growth=value!==null&&old>0&&record.period.endYear-prior.period.endYear===1&&sameRun(record,prior)?pct(value,old):null;
    const index=value!==null&&base>0&&sameRun(record,picked)?100*value/base:null;
    return {period:record.period,cell:record.cell,value,growth,index};
  });
}

export function spanSummary(series,from,to){
  const a=series.find(r=>r.period.endYear===from), b=series.find(r=>r.period.endYear===to);
  if(!a||!b||!Number.isInteger(from)||!Number.isInteger(to)||to<=from||!(a.value>0)||b.value===null||
     !sameRun(a,b)||series.some(r=>r.period.endYear>from&&r.period.endYear<to&&r.cell&&r.cell.coverage!==a.cell.coverage))
    return null;
  return {from,to,years:to-from,start:a.value,end:b.value,change:b.value-a.value,
    growth:pct(b.value,a.value),cagr:100*((b.value/a.value)**(1/(to-from))-1)};
}

export function comparePrecision(reference,value,decimalPlaces,scale=1){
  if(![reference,value,scale].every(finite)||!(scale>0)||!Number.isInteger(decimalPlaces)||decimalPlaces<0||decimalPlaces>8)
    throw new RangeError("Invalid cross-vintage precision.");
  const delta=value-reference, halfStep=scale*10**(-decimalPlaces)/2;
  const slack=Math.max(1,Math.abs(value),Math.abs(reference))*Number.EPSILON*4;
  return {delta,halfStep,status:Math.abs(delta)<=slack?"equal":Math.abs(delta)<=halfStep+slack?"consistent after rounding":"unresolved difference"};
}

export function slowerShare(rows,fraction){
  if(!finite(fraction)||fraction<0||fraction>1)throw new RangeError("Use a growth fraction from zero to one.");
  const eligible=rows.filter(r=>r.period.complete&&valueOf(r.cell)!==null);
  if(eligible.length===0)return [];
  const initial=eligible[0].value;
  return eligible.map(({period,value})=>({period,observed:value,scenario:initial+(value-initial)*fraction}));
}

export function syntheticDifferences({effect=4,selection=8,trendGap=0,anticipation=0,spillover=0,heterogeneity=0}={}){
  if(![effect,selection,trendGap,anticipation,spillover,heterogeneity].every(x=>finite(x)&&Math.abs(x)<=20))throw new RangeError("Out of range for the teaching example.");
  const baseline=20, drift=3;
  const units=[
    {group:"control",pre:baseline,untreatedPost:baseline+drift,post:baseline+drift+spillover},
    ...[-heterogeneity,heterogeneity].map(offset=>({group:"treated",pre:baseline+selection+anticipation,
      untreatedPost:baseline+selection+drift+trendGap,post:baseline+selection+drift+trendGap+effect+offset}))
  ];
  const treated=units.slice(1), control=units[0];
  const mean=key=>(treated[0][key]+treated[1][key])/2;
  const beforeAfter=mean("post")-mean("pre"), crossSection=mean("post")-control.post;
  const did=beforeAfter-(control.post-control.pre), truth=mean("post")-mean("untreatedPost");
  return {units,beforeAfter,crossSection,did,truth,bias:did-truth};
}

export function growthAssociation(x,y){
  const other=new Map(y.map(d=>[d.period.endYear,d.growth]));
  const pairs=x.map(d=>[d.period.endYear,d.growth,other.get(d.period.endYear)]).filter(([,a,b])=>finite(a)&&finite(b));
  const n=pairs.length, years=pairs.map(([year])=>year);
  if(n<3)return {n,years,pearson:null};
  const sx=pairs.reduce((s,[,a])=>s+a,0)/n, sy=pairs.reduce((s,[,,b])=>s+b,0)/n;
  const xy=pairs.reduce((s,[,a,b])=>s+(a-sx)*(b-sy),0);
  const xx=pairs.reduce((s,[,a])=>s+(a-sx)**2,0), yy=pairs.reduce((s,[,,b])=>s+(b-sy)**2,0);
  return {n,years,pearson:xx>0&&yy>0?xy/Math.sqrt(xx*yy):null};
}
