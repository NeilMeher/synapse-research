const sum = values => values.reduce((total,x)=>total+x,0);
const finite = x => typeof x==="number"&&Number.isFinite(x);
const vector = (values,n) => Array.isArray(values)&&values.length===n&&Array.from(values).every(finite);
const dot = (a,b) => sum(a.map((x,i)=>x*b[i]));
const norm = a => Math.max(...a.map(row=>sum(row.map(Math.abs))));

export function solveLinear(matrix,rhs){
  const n=matrix.length;
  if(n<1||n>100||!matrix.every(row=>vector(row,n))||!vector(rhs,n))throw new RangeError("Invalid square system.");
  const scale=norm(matrix);
  const work=matrix.map((row,i)=>[...row,rhs[i]]);
  for(let k=0;k<n;k++){
    let pivot=k;
    for(let i=k+1;i<n;i++)if(Math.abs(work[i][k])>Math.abs(work[pivot][k]))pivot=i;
    if(Math.abs(work[pivot][k])<=1e-12*Math.max(1,scale))throw new RangeError("Singular or poorly scaled input-output system.");
    [work[k],work[pivot]]=[work[pivot],work[k]];
    for(let i=k+1;i<n;i++){
      const factor=work[i][k]/work[k][k];
      for(let j=k+1;j<=n;j++)work[i][j]-=factor*work[k][j];
      work[i][k]=0;
    }
  }
  const result=new Array(n);
  for(let i=n-1;i>=0;i--){
    let remain=work[i][n];
    for(let j=i+1;j<n;j++)remain-=work[i][j]*result[j];
    result[i]=remain/work[i][i];
  }
  return result;
}

export function validateEconomicTable(data){
  const n=data.industries?.length;
  if(!Number.isInteger(n)||n<1||n>100||new Set(data.industries.map(row=>row.code)).size!==n||
      data.industries.some(row=>!row.code||!row.name)||!data.sourceId||!data.units||!Number.isInteger(data.year)||
      !Array.isArray(data.transactions)||data.transactions.length!==n||
      !data.transactions.every(row=>vector(row,n)&&row.every(x=>x>=0))||
      ![data.output,data.finalDemand,data.imports,data.valueAdded,data.adjustments].every(row=>vector(row,n))||
      data.output.some(x=>x<=0)||data.imports.some(x=>x<0)){
    throw new RangeError("Invalid sector identity, flow dimensions, negative inputs or zero output.");
  }
  const supplyResidual = data.output.map((value,i)=>value-(sum(data.transactions[i])+data.finalDemand[i]));
  const useResidual = data.output.map((value,j)=>value-(sum(data.transactions.map(row=>row[j]))+
    data.imports[j]+data.valueAdded[j]+data.adjustments[j]));
  const residual = Math.max(...[...supplyResidual,...useResidual].map(Math.abs));
  const tolerance=data.tolerance??1e-6;
  if(!finite(tolerance)||tolerance<=0||residual>tolerance)throw new RangeError("Source accounting residual exceeds the published precision allowance.");
  return {supplyResidual,useResidual,residual,tolerance};
}

export function prepareEconomy(data){
  const accounting=validateEconomicTable(data);
  const A=data.transactions.map(row=>row.map((value,j)=>value/data.output[j]));
  const IminusA=A.map((row,i)=>row.map((value,j)=>Number(i===j)-value));
  const ones=data.output.map(()=>1);
  const witness=solveLinear(IminusA,ones);
  if(witness.some(x=>x<=0||!finite(x)))throw new RangeError("No positive productivity witness.");
  const ratios=A.map((row,i)=>dot(row,witness)/witness[i]);
  const spectralUpper=Math.max(...ratios);
  const conditionInfinity=norm(IminusA)*Math.max(...witness);
  if(spectralUpper>=1-1e-10||conditionInfinity>1e8)throw new RangeError("Uncertified or ill-conditioned economic system.");
  const reconstructed=solveLinear(IminusA,data.finalDemand);
  const originalResidual=Math.max(...reconstructed.map((value,i)=>Math.abs(value-data.output[i])));
  return {data,A,IminusA,directVA:data.valueAdded.map((value,j)=>value/data.output[j]),
    directImports:data.imports.map((value,j)=>value/data.output[j]),
    diagnostics:{...accounting,spectralLower:Math.min(...ratios),spectralUpper,conditionInfinity,originalResidual}};
}

export function computeDemand(model,shock){
  if(!vector(shock,model.A.length))throw new RangeError("Final demand must match the industry classification.");
  const output=solveLinear(model.IminusA,shock);
  const firstRound=model.A.map(row=>dot(row,shock));
  const indirect=output.map((value,i)=>value-shock[i]);
  const otherRounds=indirect.map((value,i)=>value-firstRound[i]);
  const valueAdded=output.map((value,i)=>value*model.directVA[i]);
  const importedInputs=output.map((value,i)=>value*model.directImports[i]);
  const residual=Math.max(...model.IminusA.map((row,i)=>Math.abs(dot(row,output)-shock[i])));
  if(!finite(residual)||residual>1e-8*Math.max(1,...shock.map(Math.abs)))throw new Error("Demand solve did not reconcile.");
  return {direct:[...shock],firstRound,otherRounds,indirect,output,valueAdded,importedInputs,residual,
    totals:{direct:sum(shock),firstRound:sum(firstRound),otherRounds:sum(otherRounds),indirect:sum(indirect),
      output:sum(output),valueAdded:sum(valueAdded),importedInputs:sum(importedInputs)}};
}

export function aggregateEconomy(data,groups){
  validateEconomicTable(data);
  const lookup=new Map();
  groups.forEach(({members},i)=>members.forEach(code=>{
    if(lookup.has(code))throw new RangeError("Duplicate aggregation membership.");
    lookup.set(code,i);
  }));
  if(lookup.size!==data.industries.length||data.industries.some(row=>!lookup.has(row.code)))
    throw new RangeError("Aggregation must cover all source industries.");
  const mapping=data.industries.map(row=>lookup.get(row.code));
  const output={...data,industries:groups.map(({code,name})=>({code,name})),resolution:"aggregated",
    tolerance:(data.tolerance??1e-6)*data.industries.length};
  const size=groups.length;
  output.transactions=Array.from({length:size},()=>Array(size).fill(0));
  for(const name of ["output","finalDemand","imports","valueAdded","adjustments"]){
    output[name]=Array(size).fill(0);
    data[name].forEach((value,i)=>{output[name][mapping[i]]+=value;});
  }
  data.transactions.forEach((row,i)=>row.forEach((value,j)=>{output.transactions[mapping[i]][mapping[j]]+=value;}));
  validateEconomicTable(output);
  return output;
}

export function demandForGroup(data,members,amount){
  if(!Array.isArray(members)||!members.length||new Set(members).size!==members.length||
     !finite(amount))throw new RangeError("Demand needs valid member codes and an amount.");
  const selected=new Set(members);
  const weights=data.industries.map(({code},i)=>selected.has(code)?data.output[i]:0);
  if(weights.filter(x=>x>0).length!==selected.size)throw new RangeError("Unknown demand industry.");
  const total=sum(weights);
  return weights.map(weight=>amount*weight/total);
}
