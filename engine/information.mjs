function binaryEntropy(p) {
  return p===0||p===1?0:-p*Math.log2(p)-(1-p)*Math.log1p(-p)/Math.LN2;
}

export function binaryInformationGain(prior, positiveIfA, positiveIfB) {
  if (![prior,positiveIfA,positiveIfB].every(x=>Number.isFinite(x)&&x>=0&&x<=1)) {
    throw new RangeError("Prior and likelihoods must be probabilities.");
  }
  const positive=prior*positiveIfA+(1-prior)*positiveIfB;
  const negative=prior*(1-positiveIfA)+(1-prior)*(1-positiveIfB);
  const posteriorPositive=positive?prior*positiveIfA/positive:null;
  const posteriorNegative=negative?prior*(1-positiveIfA)/negative:null;
  const priorEntropy=binaryEntropy(prior);
  const expectedPosteriorEntropy=(positive?positive*binaryEntropy(posteriorPositive):0)+
    (negative?negative*binaryEntropy(posteriorNegative):0);
  return {positive,posteriorPositive,posteriorNegative,priorEntropy,expectedPosteriorEntropy,
    information:Math.max(0,priorEntropy-expectedPosteriorEntropy)};
}
