import assert from "node:assert/strict";
import {test} from "node:test";
import {initializeMarket,inspectAccounts,quote,reconcile,submitOrder} from "../engine/market.mjs";
import {runReflex} from "../engine/reflex.mjs";

const design={anchor:100,impact:2,halfSpread:2,fee:1};
const open=()=>initializeMarket([{id:"maker",cash:200,assets:4},{id:"alice",cash:300,assets:2}],design);

test("market ledger matches a hand-calculated buy, sell and fee example",()=>{
  const market=open();
  const buy=submitOrder(market,{actor:"alice",side:"buy",quantity:3,limit:104});
  assert.deepEqual(buy.fills.map(f=>f.price),[102,104]);
  assert.equal(buy.unfilled,1);
  assert.equal(buy.reason,"limit");
  const sell=submitOrder(market,{actor:"alice",side:"sell",quantity:1,limit:100});
  assert.equal(sell.fills[0].price,102);
  assert.equal(quote(market).midpoint,102);
  assert.deepEqual(inspectAccounts(market),{
    maker:{cash:304,assets:3,markedWealth:610},
    alice:{cash:193,assets:3,markedWealth:499},
    fees:{cash:3,assets:0,markedWealth:3},
  });
  assert.deepEqual(reconcile(market),{cash:500,assets:6});
  assert.equal(buy.fills[1].sequence+1,sell.fills[0].sequence);
});

test("market caps quantity by cash and inventory and rejects invalid orders without mutation",()=>{
  const market=open();
  const cash=submitOrder(market,{actor:"alice",side:"buy",quantity:5,limit:200});
  assert.equal(cash.fills.length,2);
  assert.equal(cash.reason,"cash");
  const before=inspectAccounts(market);
  assert.throws(()=>submitOrder(market,{actor:"alice",side:"sell",quantity:0,limit:1}),/invalid/i);
  assert.deepEqual(inspectAccounts(market),before);
  const empty=initializeMarket([{id:"maker",cash:200,assets:0},{id:"alice",cash:300,assets:0}],design);
  assert.equal(submitOrder(empty,{actor:"alice",side:"buy",quantity:1,limit:200}).reason,"inventory");
  assert.equal(submitOrder(empty,{actor:"alice",side:"sell",quantity:1,limit:1}).reason,"inventory");
  const limited=initializeMarket([{id:"maker",cash:40,assets:4},{id:"alice",cash:300,assets:2}],design);
  assert.equal(submitOrder(limited,{actor:"alice",side:"sell",quantity:1,limit:1}).reason,"cash");
});

test("REFLEX is seeded and its sampled environmental path is matched across arms",()=>{
  const config={id:"reflex-pilot-001",phase:"pilot",seed:401,trials:10,rounds:4};
  const first=runReflex(config);
  assert.deepEqual(first,runReflex(config));
  const fundamental=arm=>arm.replay.frames.map(frame=>frame.fundamental);
  assert.deepEqual(fundamental(first.arms[0]),fundamental(first.arms[1]));
  assert.equal(first.arms[0].replay.frames.length,config.rounds);
});
