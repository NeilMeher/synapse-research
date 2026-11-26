import {canvasContext,circle,line,node,palette,pct} from "./view.mjs";

export const printed=(value,digits=3)=>value==null?"Unavailable":value.toFixed(digits);

export function row(...values) {
  const tr=node("tr");
  const header=node("th",values[0]);
  header.scope="row";
  tr.append(header,...values.slice(1).map(value=>node("td",value)));
  return tr;
}

export function probabilityChart(canvas,points,{diagonal=false,xLabel,yLabel}) {
  const surface=canvasContext(canvas);
  if (!surface||!points.length) return;
  const {context,width,height}=surface;
  const left=49,top=24,right=width-13,bottom=height-40;
  const xy=(x,y)=>[left+(right-left)*x,bottom-(bottom-top)*y];
  context.strokeStyle=palette("line");
  context.fillStyle=palette("dim");
  context.font="11px 'Segoe UI'";
  context.textAlign="right";
  for(let i=0;i<=4;i++){
    const [x,y]=xy(0,i/4);
    context.fillText(pct(i/4),x-5,y+3);
    line(context,x,y,right,y);
  }
  context.textAlign="center";
  context.fillText(yLabel,(left+right)/2,12);
  for(let i=0;i<=4;i++){
    const [x,y]=xy(i/4,0);
    context.fillText(pct(i/4),x,y+14);
  }
  context.fillText(xLabel,(left+right)/2,height-5);
  if(diagonal){
    context.setLineDash([5,4]);
    context.strokeStyle=palette("dim");
    line(context,...xy(0,0),...xy(1,1));
    context.setLineDash([]);
  }
  context.strokeStyle=palette("bright");
  context.fillStyle=palette("bright");
  context.lineWidth=2;
  for(const [i,p] of points.entries()){
    const position=xy(p.x,p.y);
    if(!diagonal&&i)line(context,...xy(points[i-1].x,points[i-1].y),...position);
    circle(context,...position,p.radius??4,true);
  }
}
