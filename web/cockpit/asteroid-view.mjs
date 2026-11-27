import {relative} from './duel-model.mjs';
import {fitDisplay,drawRadar,mountCanopy} from './duel-canopy.mjs';
import {initDuelSky} from './duel-sky.mjs';

let sky,stones;
// Light a pitted, irregular height field once per mineral type. Depth and
// angular size during flight come from the same world coordinates as collisions.
function texture(seed){
 const size=192,image=document.createElement('canvas');image.width=image.height=size;
 const ctx=image.getContext('2d'),pixels=ctx.createImageData(size,size);
 let bits=seed+91;
 const rand=()=>{bits=(Math.imul(bits,1664525)+1013904223)>>>0;return bits/4294967296;};
 const craters=Array.from({length:18},()=>[rand()*1.7-.85,rand()*1.7-.85,.04+rand()*.21]);
 for(let iy=0;iy<size;iy++)for(let ix=0;ix<size;ix++){
  const x=(ix-size/2)/(size*.49),y=(iy-size/2)/(size*.49);
  const a=Math.atan2(y,x),edge=.88+.075*Math.sin(3*a+seed)+.035*Math.sin(7*a-seed)+.014*Math.cos(a*15);
  const depth=1-(x*x+y*y)/(edge*edge);if(depth<=0)continue;
  const z=Math.sqrt(depth);let nx=x,ny=y,albedo=1;
  for(const [cx,cy,r] of craters){
   const dx=(x-cx)/r,dy=(y-cy)/r,dist=Math.hypot(dx,dy);
   if(dist>1.14)continue;
   if(dist<1){const slope=.9*(1-dist);nx-=dx*slope*3;ny-=dy*slope*3;albedo*=.84+.16*dist;}
   else albedo*=1.08;
  }
  const strata=Math.sin(12*x+3*y+seed+2.6*Math.sin(9*y+z*2));
  nx+=.12*strata;ny+=.1*Math.cos(19*x-9*y+z*4);
  const sun=Math.max(0,(-.65*nx-.58*ny+.46*z)/Math.hypot(nx,ny,z));
  const rough=.87+.1*strata+.14*rand(),lit=(.15+.85*sun)*albedo*rough;
  const i=(iy*size+ix)*4;
  pixels.data[i]=20+201*lit;pixels.data[i+1]=24+(183+seed%9)*lit;pixels.data[i+2]=30+158*lit;
  pixels.data[i+3]=255*Math.min(1,depth*90);
 }
 ctx.putImageData(pixels,0,0);return image;
}

export function asteroidView(root){
 const glass=root.getElementById('glass').getContext('2d'),optic=root.getElementById('optic').getContext('2d'),radar=root.getElementById('radar').getContext('2d');
 sky??=initDuelSky();stones??=Array.from({length:8},(_,n)=>texture(n*13+2));
 const canopy=mountCanopy();
 function drawStone(ctx,r,x,y,size,bank,tick){
  ctx.save();ctx.translate(x,y);ctx.rotate(bank+r.shape*3+tick*.00085*(r.shape-.5));
  ctx.drawImage(stones[Math.floor(r.shape*stones.length)],-size,-size,size*2,size*2);ctx.restore();
 }
 return(run,reduced)=>{
  const {w,h}=fitDisplay(glass);if(w<1||h<1)return;
  const s=run.ship,focal=Math.min(w*.64,h*.95),project=p=>p.z>.05?[w/2+p.x/p.z*focal,h/2-p.y/p.z*focal]:null;
  sky(glass,s,project,w,h,focal);
  const objects=run.rocks.map(r=>({r,p:relative(s,r)})).sort((a,b)=>b.p.z-a.p.z);
  let nearest=null,distance=Infinity;
  for(const {r,p} of objects){
   const d=Math.hypot(p.x,p.y,p.z);if(d<distance){distance=d;nearest={r,p};}
   if(p.z<=1)continue;
   const [x,y]=project(p),size=Math.min(w*3,focal*r.radius/p.z);
   if(x+size<0||x-size>w||y+size<0||y-size>h)continue;
   drawStone(glass,r,x,y,size,s.bank,reduced?0:run.tick);
  }
  glass.strokeStyle='#a4dfbf';glass.lineWidth=1;glass.beginPath();
  for(const n of [-1,1]){glass.moveTo(w/2+n*8,h/2);glass.lineTo(w/2+n*20,h/2);glass.moveTo(w/2,h/2+n*8);glass.lineTo(w/2,h/2+n*14);}glass.stroke();
  if(run.hit&&run.tick-run.impactTick<10&&!reduced){glass.fillStyle='rgba(226,130,54,.18)';glass.fillRect(0,0,w,h);}
  canopy(glass,w,h);
  drawRadar(radar,nearest.p,distance);
  const box=fitDisplay(optic);optic.clearRect(0,0,box.w,box.h);
  if(nearest.p.z>0&&box.w>0)drawStone(optic,nearest.r,box.w/2,box.h/2,Math.min(box.h*.44,nearest.r.radius*focal*4/distance),s.bank,reduced?0:run.tick);
  root.getElementById('range').value=Math.round(distance)+' m';
  root.getElementById('bearing').value=nearest.p.z>=0?'AVANT':'ARRIÈRE';
 };
}
