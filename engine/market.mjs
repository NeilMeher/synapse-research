const makerId="maker";
const feeId="fees";
const validId=/^[a-z][a-z0-9-]{0,30}$/;
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;

export function initializeMarket(accounts, policy) {
  if (!policy||!Array.isArray(accounts)||accounts.length<2||accounts.length>42||
      !int(policy.anchor,10,1000000)||!int(policy.halfSpread,1,100)||
      !int(policy.impact,0,100)||!int(policy.fee,0,100)) throw new RangeError("Invalid market policy.");
  const book=new Map();
  for (const account of accounts) {
    if (typeof account.id!=="string"||!validId.test(account.id)||book.has(account.id)||account.id===feeId||
        !int(account.cash,0,1_000_000_000)||!int(account.assets,0,100000)) throw new RangeError("Invalid starting account.");
    book.set(account.id,{cash:account.cash,assets:account.assets});
  }
  if (!book.has(makerId)) throw new RangeError("A separate maker account is required.");
  book.set(feeId,{cash:0,assets:0});
  const market={book,policy:{...policy},initialInventory:book.get(makerId).assets,events:[],fills:0};
  market.totals=totals(market);
  return market;
}

export function totals(market) {
  let cash=0, assets=0;
  for (const entry of market.book.values()) { cash+=entry.cash; assets+=entry.assets; }
  return {cash,assets};
}

export function quote(market) {
  const {impact,anchor,halfSpread,fee}=market.policy;
  const maker=market.book.get(makerId);
  const midpoint=Math.max(halfSpread+fee+1,anchor+impact*(market.initialInventory-maker.assets));
  return {midpoint,bid:midpoint-halfSpread,ask:midpoint+halfSpread,
    askUnits:maker.assets,bidLotsAtQuote:Math.floor(maker.cash/(midpoint-halfSpread))};
}

export function inspectAccounts(market, mark=quote(market).midpoint) {
  return Object.fromEntries([...market.book].map(([id,value])=>[id,{
    ...value, markedWealth:value.cash+value.assets*mark,
  }]));
}

export function reconcile(market) {
  const current=totals(market);
  if (current.cash!==market.totals.cash||current.assets!==market.totals.assets||
      [...market.book.values()].some(a=>!Number.isSafeInteger(a.cash)||!Number.isSafeInteger(a.assets)||a.cash<0||a.assets<0)) {
    throw new Error("Market conservation or nonnegative-balance invariant failed.");
  }
  return current;
}

export function submitOrder(market, order) {
  if (!order||typeof order.actor!=="string"||!market.book.has(order.actor)||order.actor===makerId||order.actor===feeId||
      !["buy","sell"].includes(order.side)||!int(order.quantity,1,50)||!int(order.limit,1,10_000_000)||
      market.events.length>=1000) throw new RangeError("Invalid immediate-or-cancel order.");
  const participant=market.book.get(order.actor);
  const maker=market.book.get(makerId);
  const feeAccount=market.book.get(feeId);
  const {fee}=market.policy;
  const before=quote(market);
  const fills=[];
  let reason=null;
  for (let lot=0;lot<order.quantity;lot++) {
    const quotes=quote(market);
    const buying=order.side==="buy";
    const price=buying?quotes.ask:quotes.bid;
    if (buying ? price>order.limit : price<order.limit) { reason="limit"; break; }
    const buyer=buying?participant:maker;
    const seller=buying?maker:participant;
    const buyerCost=price+(buying?fee:0);
    if (seller.assets<1) { reason="inventory"; break; }
    if (buyer.cash<buyerCost) { reason="cash"; break; }
    buyer.cash-=buyerCost;
    buyer.assets++;
    seller.cash+=price-(buying?0:fee);
    seller.assets--;
    feeAccount.cash+=fee;
    fills.push({sequence:++market.fills,price,quantity:1,fee,buyer:buying?order.actor:makerId,
      seller:buying?makerId:order.actor,payer:order.actor});
  }
  reconcile(market);
  const event={sequence:market.events.length+1,order:{...order},before,after:quote(market),fills,
    unfilled:order.quantity-fills.length,reason};
  market.events.push(event);
  return event;
}
