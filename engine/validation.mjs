// An independently measured four-point residual check with known observation variance.
export function checkResidualBlock(rows, sigma, alpha) {
  if (rows.length!==4 || !Number.isFinite(sigma) || sigma<=0 || !(alpha>0&&alpha<1)) {
    throw new RangeError("A residual check needs four observations, positive noise and a valid threshold.");
  }
  const statistic=rows.reduce((sum,{y,predicted})=>sum+((y-predicted)/sigma)**2,0);
  if (!Number.isFinite(statistic)) throw new RangeError("Residual statistic must be finite.");
  const half=statistic/2;
  const p=Math.exp(-half)*(1+half);
  return {statistic,p,passes:p>=alpha};
}
