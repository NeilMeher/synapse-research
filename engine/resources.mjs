export const NEED = Object.freeze([3,3]);
export const TECHNOLOGIES = Object.freeze([Object.freeze([4,2]),Object.freeze([2,4])]);
export const STORAGE = 10;

const resourceVector = values => Array.isArray(values) && values.length === 2 &&
  [values[0], values[1]].every(value=>Number.isSafeInteger(value)&&value>=0);

export function production(technology,labor,firstHours) {
  if(!resourceVector(technology)||!Number.isInteger(labor)||labor<0||labor>2||
      !Number.isInteger(firstHours)||firstHours<0||firstHours>labor)throw new RangeError("Infeasible production plan.");
  const quantities=[technology[0]*firstHours,technology[1]*(labor-firstHours)];
  if(!resourceVector(quantities))throw new RangeError("Production exceeds safe resource units.");
  return quantities;
}

export function stockUtility(stock,need=NEED) {
  return stock.reduce((sum,value,r)=>sum+2*value+Math.min(value,need[r]),0);
}

export function planProduction(stock,technology,labor,need=NEED) {
  if(!resourceVector(stock)||!resourceVector(need))throw new RangeError("Production requires valid inventory and needs.");
  let best;
  for(let hours=0;hours<=labor;hours++){
    const output=production(technology,labor,hours);
    const utility=stockUtility(stock.map((value,r)=>value+output[r]),need);
    if(!best||utility>best.utility)best={hours,output,utility};
  }
  if(!best)throw new RangeError("No feasible production plan.");
  return best;
}

export function barter(payer,supplier,give,quantity,delivered) {
  if(!resourceVector(payer)||!resourceVector(supplier)||payer===supplier||![0,1].includes(give)||
      !Number.isSafeInteger(quantity)||quantity<1||typeof delivered!=="boolean"||
      payer[give]<quantity||supplier[1-give]<quantity||
      !Number.isSafeInteger(supplier[give]+quantity)||!Number.isSafeInteger(payer[1-give]+quantity)){
    throw new RangeError("Barter must be feasible before committing either leg.");
  }
  payer[give]-=quantity;
  supplier[give]+=quantity;
  if(delivered){
    supplier[1-give]-=quantity;
    payer[1-give]+=quantity;
  }
}

export function useAndStore(stock,need=NEED,capacity=STORAGE){
  if(!resourceVector(stock)||!resourceVector(need)||!Number.isSafeInteger(capacity)||capacity<0)
    throw new RangeError("Invalid stocks, needs or storage capacity.");
  const consumed=stock.map((value,r)=>Math.min(value,need[r]));
  const loss=stock.map((value,r)=>Math.max(0,value-consumed[r]-capacity));
  return {consumed,loss,stored:stock.map((value,r)=>value-consumed[r]-loss[r])};
}

export function inventoryTotal(stocks){
  return stocks.reduce(([first,second],stock)=>[first+stock[0],second+stock[1]],[0,0]);
}

export function reconcileResources(initial,produced,consumed,loss,stocks){
  const total=inventoryTotal(stocks);
  if(!stocks.every(resourceVector)||total.some((value,r)=>value!==initial[r]+produced[r]-consumed[r]-loss[r])){
    throw new Error("Resource accounting did not reconcile.");
  }
  return total;
}

export function stockGini(amounts){
  if(!amounts.length||!amounts.every(x=>Number.isFinite(x)&&x>=0))throw new RangeError("Gini requires nonnegative holdings.");
  const total=amounts.reduce((sum,value)=>sum+value,0);
  const sorted=[...amounts].sort((a,b)=>a-b);
  const weighted=sorted.reduce((sum,value,i)=>sum+(2*i+1-sorted.length)*value,0);
  return total?weighted/(sorted.length*total):0;
}
