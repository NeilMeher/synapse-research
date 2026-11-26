import {seeded} from "./echo.mjs";
import {Moments} from "./statistics.mjs";
import {answerConfidence,evaluateConfidence} from "./confidence.mjs";

export const modes=["normal","misleading"];
export const strategies=["constant","style","nominal","calibrated","oracle"];
export const strengths=Object.freeze([
  {answer:.6,hint:.58},{answer:.7,hint:.7},{answer:.85,hint:.62},
]);

export function drawObservation(random) {
  return {truth:Number(random()<.5),strength:Math.floor(random()*strengths.length),
    primaryDraw:random(),hintDraw:random(),style:Number(random()<.5)};
}

export function observe(task,mode) {
  if (!modes.includes(mode) || !strengths[task.strength]) throw new RangeError("Unknown observation regime or strength.");
  const {answer:qAnswer,hint:nominal}=strengths[task.strength];
  const qHint=mode==="normal"?nominal:1-nominal;
  const selected=task.primaryDraw<qAnswer?task.truth:1-task.truth;
  const hint=task.hintDraw<qHint?task.truth:1-task.truth;
  return {strength:task.strength,truth:task.truth,selected,hint,style:task.style,
    agreement:selected===hint,correct:Number(selected===task.truth),qAnswer,qHint,nominal};
}

export function trainCalibrator(seed,n) {
  const random=seeded(seed);
  const cells=strengths.map(()=>[{n:0,hits:0},{n:0,hits:0}]);
  let hits=0;
  for (let i=0;i<n;i++) {
    const observation=observe(drawObservation(random),"normal");
    const cell=cells[observation.strength][Number(observation.agreement)];
    cell.n++;
    cell.hits+=observation.correct;
    hits+=observation.correct;
  }
  return {n,constant:(hits+1)/(n+2),cells:cells.map(bucket=>bucket.map(cell=>({
    ...cell,estimate:(cell.hits+1)/(cell.n+2),
  })))};
}

export function predict(observation,calibrator) {
  const {strength,agreement,qAnswer,qHint,nominal,style}=observation;
  return {
    constant:calibrator.constant,
    style:style ? .95 : .65,
    nominal:answerConfidence(qAnswer,nominal,agreement),
    calibrated:calibrator.cells[strength][Number(agreement)].estimate,
    oracle:answerConfidence(qAnswer,qHint,agreement),
  };
}

export function runMirage(config,tick=()=>{}) {
  const {evaluationSeed,trainSeed,trials,training}=config;
  if (!Number.isInteger(trials)||trials<2||trials>50000||!Number.isInteger(training)||
      training<2||training>50000||evaluationSeed===trainSeed) throw new RangeError("Invalid or overlapping benchmark design.");
  const calibrator=trainCalibrator(trainSeed,training);
  const random=seeded(evaluationSeed);
  const samples=Object.fromEntries(modes.map(mode=>[mode,[]]));
  for (let i=0;i<trials;i++) {
    tick();
    const task=drawObservation(random);
    for (const mode of modes) {
      const observation=observe(task,mode);
      samples[mode].push({...observation,confidence:predict(observation,calibrator)});
    }
  }
  const regions=modes.map(mode=>{
    const observations=samples[mode];
    const outcomes=observations.map(row=>row.correct);
    const paired=new Moments();
    for (const row of observations) {
      paired.add((row.confidence.style-row.correct)**2-(row.confidence.calibrated-row.correct)**2);
    }
    return {mode,metrics:Object.fromEntries(strategies.map(strategy=>
      [strategy,evaluateConfidence(outcomes,observations.map(row=>row.confidence[strategy]))])),
    styleMinusCalibratedBrier:paired.summary(2.241402727604947,-1,1),examples:observations.slice(0,12)};
  });
  return {schemaVersion:"mirage-confidence-v1",modelVersion:"mirage-noisy-cues-v1",config,evidenceClass:"synthetic simulation",
    strengths,calibrator,regions};
}
