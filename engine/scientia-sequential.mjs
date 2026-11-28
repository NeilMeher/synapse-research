function choose(n,k){
  let result=1;
  for(let i=1;i<=k;i++)result=result*(n-i+1)/i;
  return result;
}

export function upperTail(n,k,p){
  let tail=0;
  for(let j=k;j<=n;j++)tail+=choose(n,j)*p**j*(1-p)**(n-j);
  return tail;
}

export function verificationPath(outcomes,method,{alpha,p0,p1}){
  const horizon=outcomes.length;
  let successes=0, e=1;
  for(let i=0;i<horizon;i++){
    const n=i+1, y=outcomes[i];
    successes+=y;
    e*=y?p1/p0:(1-p1)/(1-p0);
    const tail=upperTail(n,successes,p0);
    const pass=method==="evidence"?e>=1/alpha:
      method==="spend"?tail<=alpha/horizon:
      (method==="peek"||n===horizon)&&tail<=alpha;
    if(pass)return {reported:true,used:n};
  }
  return {reported:false,used:horizon};
}
