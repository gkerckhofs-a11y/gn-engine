function asteroid(ctx,x,y,r,index){
 ctx.save();ctx.translate(x,y);ctx.rotate(index*.73);
 const stone=ctx.createLinearGradient(-r,-r,r*.7,r);
 stone.addColorStop(0,'#e3bf9a');stone.addColorStop(.42,'#9b7a62');stone.addColorStop(1,'#453a36');
 ctx.fillStyle=stone;ctx.beginPath();
 for(let side=0;side<11;side++){
  const a=side*Math.PI*2/11,edge=r*(.76+((side*7+index)%5)*.06);
  ctx.lineTo(Math.cos(a)*edge,Math.sin(a)*edge);
 }
 ctx.closePath();ctx.fill();ctx.clip();
 for(let i=0;i<5;i++){
  const a=i*2.35+.7,size=r*(.09+.025*i);
  const cx=Math.cos(a)*r*.52,cy=Math.sin(a)*r*.56;
  ctx.beginPath();ctx.arc(cx,cy+r*.025,size,0,Math.PI*2);ctx.fillStyle='#bd9a79';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,size,0,Math.PI*2);ctx.fillStyle='#685345';ctx.fill();
 }
 ctx.restore();
}

function shuttle(ctx,x,y){
 ctx.save();ctx.translate(x,y);
 const exhaust=ctx.createLinearGradient(0,20,0,50);
 exhaust.addColorStop(0,'#ecfad9');exhaust.addColorStop(.25,'#58d3bb');exhaust.addColorStop(1,'#32929600');
 for(const side of [-1,1]){
  ctx.save();ctx.scale(side,1);ctx.fillStyle=exhaust;ctx.beginPath();ctx.moveTo(10,18);ctx.lineTo(17,18);ctx.lineTo(13,50);ctx.fill();
  ctx.fillStyle='#68838c';ctx.beginPath();ctx.moveTo(6,-13);ctx.lineTo(37,18);ctx.lineTo(26,22);ctx.lineTo(4,12);ctx.fill();
  ctx.fillStyle='#293e48';ctx.fillRect(10,10,7,10);ctx.restore();
 }
 const metal=ctx.createLinearGradient(-9,0,9,0);metal.addColorStop(0,'#546a75');metal.addColorStop(.5,'#c7ddd9');metal.addColorStop(1,'#536d7a');
 ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(0,-29);ctx.lineTo(10,8);ctx.lineTo(7,20);ctx.lineTo(-7,20);ctx.lineTo(-10,8);ctx.closePath();ctx.fill();
 ctx.fillStyle='#24505d';ctx.beginPath();ctx.ellipse(0,-5,4.4,11,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

export function drawAsteroidField(ctx,lane,clear,progress,running,reduced){
 const {width:w,height:h}=ctx.canvas;
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#06101c');sky.addColorStop(.65,'#112331');sky.addColorStop(1,'#08151e');
 ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 for(let i=0;i<95;i++){
  const depth=(i*.081+(running&&!reduced?progress*.18:0))%1;
  const x=w/2+((i*179+17)%w-w/2)*(.25+depth*1.35),y=h*.2+((i*227+41)%h-h*.25)*(.25+depth*1.35);
  ctx.fillStyle=i%4?'#718b98':'#c6d9cd';ctx.fillRect(x,y,1+depth,1+depth);
 }
 const point=(n,z)=>w/2+(n-1)*w*.31*z;
 ctx.strokeStyle='#395962';
 for(const n of [-.5,.5,1.5,2.5]){ctx.beginPath();ctx.moveTo(point(n,.1),h*.17);ctx.lineTo(point(n,1.2),h);ctx.stroke();}
 if(running){
  const z=reduced ? .78 : .12+.92*progress*progress;
  for(let i=0;i<3;i++)if(i!==clear){
   const x=point(i,z),y=h*(.15+.61*z);
   asteroid(ctx,x+29*z,y-19*z,5+18*z,i+5);asteroid(ctx,x,y,10+43*z,i);
  }
 }
 shuttle(ctx,point(lane,1),h*.85);
}
