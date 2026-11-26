import { seeded } from "./echo.mjs";
import { initializeMarket, inspectAccounts, quote, reconcile, submitOrder } from "./market.mjs";
import { Moments } from "./statistics.mjs";

export const STRATEGIES = Object.freeze([
  "fundamental_value",
  "momentum",
  "mean_reversion",
  "noise",
  "liquidity_provision",
]);

const ANCHOR = 10000;
const TOTAL_AGENTS = 12;
const TOTAL_CASH = 960_000;
const TOTAL_ASSETS = 96;

function buildAccounts(adopters, concentratedCapital) {
  const accounts = [{ id: "maker", cash: 2_000_000, assets: 200 }];
  if (!concentratedCapital) {
    const cashEach = Math.floor(TOTAL_CASH / TOTAL_AGENTS);
    const assetEach = Math.floor(TOTAL_ASSETS / TOTAL_AGENTS);
    for (let i = 0; i < TOTAL_AGENTS; i++) {
      accounts.push({ id: `trader-${i}`, cash: cashEach, assets: assetEach });
    }
    return accounts;
  }
  // Concentrated capital: adopters (e.g. 3 agents) hold 75% of total trader capital, non-adopters hold 25%
  const adopterCashTotal = Math.floor(TOTAL_CASH * 0.75);
  const otherCashTotal = TOTAL_CASH - adopterCashTotal;
  const adopterAssetTotal = Math.floor(TOTAL_ASSETS * 0.75);
  const otherAssetTotal = TOTAL_ASSETS - adopterAssetTotal;
  const nonAdopters = TOTAL_AGENTS - adopters;
  for (let i = 0; i < TOTAL_AGENTS; i++) {
    const isAdopter = i < adopters;
    const count = isAdopter ? adopters : nonAdopters;
    const cash = isAdopter
      ? Math.floor(adopterCashTotal / count) + (i === 0 ? adopterCashTotal % count : 0)
      : Math.floor(otherCashTotal / count) + (i === adopters ? otherCashTotal % count : 0);
    const assets = isAdopter
      ? Math.floor(adopterAssetTotal / count) + (i === 0 ? adopterAssetTotal % count : 0)
      : Math.floor(otherAssetTotal / count) + (i === adopters ? otherAssetTotal % count : 0);
    accounts.push({ id: `trader-${i}`, cash, assets });
  }
  return accounts;
}

function decideSide(strategy, signal, mid, prevMid, noiseBit) {
  if (strategy === "fundamental_value") return signal ? "buy" : "sell";
  if (strategy === "momentum") {
    if (mid === prevMid) return noiseBit ? "buy" : "sell";
    return mid > prevMid ? "buy" : "sell";
  }
  if (strategy === "mean_reversion") {
    if (mid === ANCHOR) return noiseBit ? "buy" : "sell";
    return mid < ANCHOR ? "buy" : "sell";
  }
  if (strategy === "liquidity_provision") {
    if (mid === prevMid) return mid < ANCHOR ? "buy" : "sell";
    return mid < prevMid ? "buy" : "sell";
  }
  return noiseBit ? "buy" : "sell";
}

function runEpisode(task, arm, keepReplay) {
  const accounts = buildAccounts(arm.adopters, arm.concentratedCapital);
  const policy = { anchor: ANCHOR, impact: arm.impact, halfSpread: 2, fee: 1 };
  const market = initializeMarket(accounts, policy);
  const initial = inspectAccounts(market, ANCHOR);

  const strategies = Array.from({ length: TOTAL_AGENTS }, (_, i) =>
    i < arm.adopters ? arm.primaryStrategy : STRATEGIES[1 + ((i - arm.adopters) % (STRATEGIES.length - 1))]
  );

  let prevMid = ANCHOR;
  let high = ANCHOR;
  let drawdown = 0;
  let priceDevSum = 0;
  let totalFees = 0;
  let adopterFees = 0;
  let adopterVolume = 0;
  let totalVolume = 0;
  let impactSum = 0;
  let orderCount = 0;
  const frames = [];

  for (let t = 0; t < task.length; t++) {
    const round = task[t];
    const trades = [];
    for (let i = 0; i < TOTAL_AGENTS; i++) {
      const id = `trader-${i}`;
      const strat = strategies[i];
      const curMid = quote(market).midpoint;
      const side = decideSide(strat, round.signals[i], curMid, prevMid, round.noise[i]);
      const baseQty = arm.concentratedCapital && i < arm.adopters ? 4 : 2;
      const event = submitOrder(market, {
        actor: id,
        side,
        quantity: baseQty,
        limit: side === "buy" ? 11000 : 9000,
      });
      const filled = event.fills.length;
      const fees = filled * policy.fee;
      totalFees += fees;
      totalVolume += filled;
      if (i < arm.adopters) {
        adopterFees += fees;
        adopterVolume += filled;
      }
      impactSum += Math.abs(event.after.midpoint - event.before.midpoint);
      orderCount++;
      if (keepReplay) trades.push({ actor: id, strategy: strat, event });
    }
    const mid = quote(market).midpoint;
    high = Math.max(high, mid);
    drawdown = Math.max(drawdown, (high - mid) / high);
    priceDevSum += Math.abs(mid - round.fundamental);
    if (keepReplay) frames.push({ round: t + 1, fundamental: round.fundamental, midpoint: mid, trades });
    prevMid = mid;
  }

  const finalFundamental = task[task.length - 1].fundamental;
  const final = inspectAccounts(market, finalFundamental);

  let adopterInitWealth = 0;
  let adopterFinalWealth = 0;
  let benchInitWealth = 0;
  let benchFinalWealth = 0;
  let assetSumSq = 0;
  let assetTotalEnd = 0;

  for (let i = 0; i < TOTAL_AGENTS; i++) {
    const id = `trader-${i}`;
    const initW = initial[id].cash + initial[id].assets * ANCHOR;
    const finW = final[id].cash + final[id].assets * finalFundamental;
    assetSumSq += final[id].assets ** 2;
    assetTotalEnd += final[id].assets;
    if (i < arm.adopters) {
      adopterInitWealth += initW;
      adopterFinalWealth += finW;
    } else {
      benchInitWealth += initW;
      benchFinalWealth += finW;
    }
  }

  const adopterNetReturn = adopterInitWealth ? (adopterFinalWealth - adopterInitWealth) / adopterInitWealth : 0;
  const adopterGrossReturn = adopterInitWealth ? (adopterFinalWealth + adopterFees - adopterInitWealth) / adopterInitWealth : 0;
  const benchNetReturn = benchInitWealth ? (benchFinalWealth - benchInitWealth) / benchInitWealth : 0;
  const alpha = adopterNetReturn - benchNetReturn;
  const hhi = assetTotalEnd > 0 ? assetSumSq / (assetTotalEnd ** 2) : 0;
  const makerInitialAssets = initial.maker.assets;
  const makerConsumed = Math.abs(makerInitialAssets - final.maker.assets) / makerInitialAssets;

  return {
    metrics: {
      grossReturn: adopterGrossReturn,
      netReturn: adopterNetReturn,
      benchmarkReturn: benchNetReturn,
      alpha,
      tradingCosts: adopterInitWealth ? adopterFees / adopterInitWealth : 0,
      turnover: adopterVolume / Math.max(1, arm.adopters * 8),
      marketImpact: orderCount ? impactSum / orderCount : 0,
      priceDeviation: priceDevSum / task.length,
      profitPerCapital: adopterNetReturn,
      drawdown,
      inventoryConcentration: hhi,
      liquidityConsumption: makerConsumed,
    },
    replay: keepReplay
      ? { initial, final, policy, totals: reconcile(market), frames, finalFundamental }
      : null,
  };
}

export function safeSharpe(mean, sd) {
  if (!Number.isFinite(sd) || sd <= 1e-12) return null;
  return mean / sd;
}

export function runAlphaDecay(config, tick = () => {}) {
  const { seed, trials, rounds, primaryStrategy = "fundamental_value" } = config;
  if (!Number.isInteger(trials) || trials < 2 || trials > 1000 ||
      !Number.isInteger(rounds) || rounds < 2 || rounds > 16) {
    throw new RangeError("ALPHA DECAY configuration outside bounds.");
  }
  const random = seeded(seed);
  const arms = [
    { id: "impact4-adopters-1", adopters: 1, impact: 4, concentratedCapital: false, primaryStrategy },
    { id: "impact4-adopters-3", adopters: 3, impact: 4, concentratedCapital: false, primaryStrategy },
    { id: "impact4-adopters-6", adopters: 6, impact: 4, concentratedCapital: false, primaryStrategy },
    { id: "impact4-adopters-9", adopters: 9, impact: 4, concentratedCapital: false, primaryStrategy },
    { id: "impact4-concentrated-3", adopters: 3, impact: 4, concentratedCapital: true, primaryStrategy },
    { id: "control0-adopters-1", adopters: 1, impact: 0, concentratedCapital: false, primaryStrategy },
    { id: "control0-adopters-9", adopters: 9, impact: 0, concentratedCapital: false, primaryStrategy },
  ].map(a => ({ ...a, scores: new Map(), replay: null }));

  const impactCrowdingContrast = new Moments();
  const controlCrowdingContrast = new Moments();

  for (let trial = 0; trial < trials; trial++) {
    tick();
    const direction = random() < 0.5 ? 1 : -1;
    const task = Array.from({ length: rounds }, () => {
      const fundamental = ANCHOR + direction * 120;
      const trueDir = direction > 0 ? 1 : 0;
      return {
        fundamental,
        signals: Array.from({ length: TOTAL_AGENTS }, () => (random() < 0.78 ? trueDir : 1 - trueDir)),
        noise: Array.from({ length: TOTAL_AGENTS }, () => Number(random() < 0.5)),
      };
    });

    const alphaByArm = new Map();
    for (const arm of arms) {
      const { metrics, replay } = runEpisode(task, arm, trial === 0);
      if (replay) arm.replay = replay;
      alphaByArm.set(arm.id, metrics.alpha);
      for (const [k, v] of Object.entries(metrics)) {
        if (!arm.scores.has(k)) arm.scores.set(k, new Moments());
        arm.scores.get(k).add(v);
      }
    }
    impactCrowdingContrast.add(alphaByArm.get("impact4-adopters-9") - alphaByArm.get("impact4-adopters-1"));
    controlCrowdingContrast.add(alphaByArm.get("control0-adopters-9") - alphaByArm.get("control0-adopters-1"));
  }

  return {
    schemaVersion: "alpha-decay-v1",
    modelVersion: "alpha-decay-reflex-v1",
    evidenceClass: "synthetic simulation",
    config,
    contrasts: [
      { id: "impact4-adopters9-minus-1-alpha", ...impactCrowdingContrast.summary(2.241402727604947, -10, 10) },
      { id: "control0-adopters9-minus-1-alpha", ...controlCrowdingContrast.summary(2.241402727604947, -10, 10) },
    ],
    arms: arms.map(({ scores, ...arm }) => {
      const metrics = Object.fromEntries([...scores].map(([k, m]) => [k, m.summary(1.959963984540054, -10, 10)]));
      return {
        ...arm,
        sharpeLike: safeSharpe(metrics.alpha.estimate, metrics.alpha.sd),
        metrics,
      };
    }),
  };
}
