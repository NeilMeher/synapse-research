import {byId,canvasContext,circle,line,palette} from "./view.mjs";
import {row} from "./study-view.mjs";

export function priceChart(canvas,midpoint,fundamental,label){
  const surface=canvasContext(canvas);
  if(!surface||!midpoint.length)return;
  const {context,width,height}=surface;
  const left=55,top=20,right=width-14,bottom=height-44;
  const step=20;
  const low=Math.floor(Math.min(...midpoint,...fundamental)/step)*step-step;
  const high=Math.ceil(Math.max(...midpoint,...fundamental)/step)*step+step;
  const xy=(i,value)=>[left+i/Math.max(1,midpoint.length-1)*(right-left),bottom-(value-low)/(high-low)*(bottom-top)];
  context.font="11px 'Segoe UI'";
  context.textAlign="right";
  context.fillStyle=palette("dim");
  context.strokeStyle=palette("line");
  for(let i=0;i<=4;i++){
    const value=low+(high-low)*i/4;
    const [,y]=xy(0,value);
    line(context,left,y,right,y);
    context.fillText(Math.round(value),left-5,y+3);
  }
  context.textAlign="center";
  context.fillText("Price (ticks)",(left+right)/2,12);
  context.fillText(label,(left+right)/2,height-7);
  const gap=Math.max(1,Math.ceil(midpoint.length/9));
  for(let i=0;i<midpoint.length;i+=gap){
    const [x]=xy(i,low);
    context.fillText(i,x,bottom+15);
  }
  for(const [values,color,dash] of [[fundamental,"science",[5,4]],[midpoint,"positive",[]]]){
    context.strokeStyle=palette(color);context.fillStyle=context.strokeStyle;
    context.setLineDash(dash);context.lineWidth=1.8;
    for(let i=1;i<values.length;i++)line(context,...xy(i-1,values[i-1]),...xy(i,values[i]));
    context.setLineDash([]);
    for(const [i,value] of values.entries())circle(context,...xy(i,value),2.8,true);
  }
}

export function accountingRows(replay,trades,mark){
  const accounts=Object.fromEntries(Object.entries(replay.initial).map(([id,record])=>[id,{cash:record.cash,assets:record.assets}]));
  for(const {event} of trades)for(const fill of event.fills){
    accounts[fill.buyer].cash-=fill.price;
    accounts[fill.buyer].assets++;
    accounts[fill.seller].cash+=fill.price;
    accounts[fill.seller].assets--;
    accounts[fill.payer].cash-=fill.fee;
    accounts.fees.cash+=fill.fee;
  }
  return Object.entries(accounts).map(([id,{cash,assets}])=>row(id,cash,assets,cash+assets*mark));
}

export function tradesRows(records){
  return records.map(({event})=>row(event.order.actor,event.order.side,event.order.quantity,event.fills.length,
    event.fills.map(fill=>fill.price).join(", ")||"—",event.reason??"Filled"));
}

export function bindChart(id,draw){
  new ResizeObserver(draw).observe(byId(id));
}
