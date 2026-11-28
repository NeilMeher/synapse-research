import {decisionRisks,filterReliability} from "./adaptive-trust.mjs";
import {answerConfidence} from "./confidence.mjs";
import {countDistribution} from "./dependence.mjs";

const number = value => {
  const [a,b=1] = String(value).split("/").map(Number);
  return a/b;
};

export function beliefDecision(cfg,{law,delay,bits,reports,policy}) {
  const model = Object.fromEntries(Object.entries(cfg.rates).map(([key,v]) => [key,number(v)]));
  const adaptive = policy.startsWith("adaptive-");
  const aware = policy.endsWith("-aware");
  const audits = bits.map((outcome,event) => ({event,arrival:event+delay,outcome}));
  const healthy = adaptive ? filterReliability(model,cfg.horizon,audits).filteredHealthy : 1;
  const q = healthy*model.healthyRate+(1-healthy)*model.faultyRate;
  const rho = law==="duplicate" ? 1 : 0;
  const mixture = aware ? [0,1,2].map(k =>
    healthy*countDistribution(2,model.healthyRate,rho,"shared")[k]+(1-healthy)*countDistribution(2,model.faultyRate,rho,"shared")[k]) :
    countDistribution(2,q,0,"shared");
  const k=reports[0]+reports[1];
  const cluster=mixture[k]/(mixture[k]+mixture[2-k]);
  const posterior=answerConfidence(cluster,number(cfg.alternative),reports[2]===1);
  const riskInput={prior:posterior,falseAccept:number(cfg.falseAccept),falseReject:number(cfg.falseReject),
    cost:number(cfg.cost),accuracy:number(cfg.verifyAccuracy)};
  const {accept,reject,verify}=decisionRisks(riskInput);
  const choices=[["reject",reject],["accept",accept],["abstain",number(cfg.abstain)],["verify",verify]];
  const selected=choices.reduce((best,option) => option[1]<best[1]-1e-12 ? option : best)[0];
  const after=[0,1].map(sign => {
    const p=answerConfidence(posterior,riskInput.accuracy,sign===1);
    return riskInput.falseAccept*(1-p)<riskInput.falseReject*p-1e-12 ? "accept" : "reject";
  });
  const reported=posterior**2/(posterior**2+(1-posterior)**2);
  return {posterior,reported,selected,after};
}
