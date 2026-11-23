// Display geometry only. All positions, headings and projectile lifetimes come from the duel.
import {forward, relative} from './duel-model.mjs';

const palette = {
  plate:[162,179,187], underside:[78,92,102], spine:[204,209,201], seam:[61,73,78],
  ochre:[225,146,69], silver:[187,200,204], glass:[58,132,153], trim:[99,177,184],
  intake:[24,38,44], nozzle:[66,77,83], amber:[244,153,67], hot:[255,216,151]
};
const faces = [];
function panel(material, ...vertices) {
  faces.push({material, vertices});
}
// Octagonal sections give the nose, canopy and nacelles readable front and side silhouettes.
function crossSection(x, y, z, width, height) {
  return [[.60,1],[1,.44],[1,-.28],[.62,-1],[-.62,-1],[-1,-.28],[-1,.44],[-.60,1]]
    .map(([u,v]) => [x+u*width,y+v*height,z]);
}
function shell(rings, materials, end='seam') {
  for (let r=1;r<rings.length;r++) {
    for(let i=0;i<8;i++){
      const j=(i+1)%8;
      panel(materials[i],rings[r-1][i],rings[r-1][j],rings[r][j],rings[r][i]);
    }
  }
  panel(end,...rings[0]); panel(end,...rings.at(-1));
}
const alloy=['plate','silver','underside','underside','underside','silver','plate','spine'];
shell([
  crossSection(0,.1,17,.36,.25),crossSection(0,.4,6,3.8,2),
  crossSection(0,0,-6,4.6,2.4),crossSection(0,-.2,-11,3.4,1.8)
],alloy);
shell([
  crossSection(0,2.1,7,.6,.28),crossSection(0,3.02,1.1,2.25,1.43),
  crossSection(0,2.75,-3.3,2.05,.95)
],['glass','glass','seam','seam','seam','glass','glass','trim'],'glass');

for(const side of [-1,1]){
  const p=(x,y,z)=>[x*side,y,z];
  const rootFront=p(2.4,.15,9),rootBack=p(3,.05,-9);
  const tipFront=p(14.8,-1.05,-2.8),tipBack=p(15.6,-1.25,-8.7);
  const knuckle=p(8.15,.85,-2.2);
  panel('plate',rootFront,tipFront,knuckle);
  panel('silver',knuckle,tipFront,tipBack,rootBack);
  panel('spine',rootFront,knuckle,rootBack);
  panel('underside',p(2.4,-.8,9),p(14.8,-1.75,-2.8),p(15.6,-1.9,-8.7),p(3,-1.1,-9));
  panel('ochre',rootFront,tipFront,p(14.8,-1.75,-2.8),p(2.4,-.8,9));
  panel('seam',tipFront,tipBack,p(15.6,-1.9,-8.7),p(14.8,-1.75,-2.8));
  panel('ochre',p(11.9,-.30,-1.05),p(13.4,-.70,-2.08),p(13.9,-.80,-7.95),p(12.4,-.42,-7.78));
  const engineX=7.6*side;
  shell([
    crossSection(engineX,-.3,4.8,1.25,1.15),crossSection(engineX,-.1,2.2,1.85,1.68),
    crossSection(engineX,-.3,-8.8,2.0,1.78),crossSection(engineX,-.32,-12.1,1.52,1.43)
  ],alloy,'intake');
  panel('nozzle',...crossSection(engineX,-.32,-12.2,1.60,1.45));
  panel('amber',...crossSection(engineX,-.32,-12.25,1.12,.98));
  panel('hot',...crossSection(engineX,-.32,-12.28,.65,.45));
  panel('intake',...crossSection(engineX,-.30,4.84,1.08,.94));
  for (const rib of [-.54,0,.54]) {
    const x=engineX+rib;
    panel('silver',[x-.055,-.89,4.88],[x+.055,-.89,4.88],[x+.055,.27,4.88],[x-.055,.27,4.88]);
  }
  // Heat exchanger grilles and a brass maintenance stripe on each engine cover.
  for (const station of [-5.8,-4.75,-3.7,-2.65]) {
    panel('seam',p(7.05,1.49,station),p(8.35,1.49,station),p(8.35,1.48,station+.38),p(7.05,1.48,station+.38));
  }
  panel('ochre',p(3.35,1.83,-5.7),p(3.55,1.64,-5.7),p(3.18,1.53,3.8),p(3,1.72,3.8));
  panel('seam',p(.08,3.84,3.65),p(1.47,3.84,3.65),p(1.53,3.91,3.32),p(.08,3.91,3.32));
  // Canted tail fins with a separate rudder and high-visibility cap.
  panel('plate',p(7,.85,-4.4),p(9.8,6.1,-10),p(10,6,-13),p(7.4,1,-10.9));
  panel('ochre',p(9.33,5.25,-9.12),p(9.8,6.1,-10),p(10,6,-13),p(9.65,5.2,-12.6));
  panel('seam',p(9.15,4.3,-10.6),p(9.85,5.8,-12.75),p(7.5,1.2,-10.8));
  panel('trim',p(1,1.22,10.5),p(2,1.75,7.8),p(1.48,1.83,7.5));
}

const near = .65;
function clipped(vertices) {
  const result=[];
  let previous=vertices.at(-1);
  for(const current of vertices){
    if((previous.z>=near)!==(current.z>=near)){
      const f=(near-previous.z)/(current.z-previous.z);
      result.push({x:previous.x+(current.x-previous.x)*f,y:previous.y+(current.y-previous.y)*f,z:near});
    }
    if(current.z>=near)result.push(current);
    previous=current;
  }
  return result;
}
function cameraBasis(viewer, ship) {
  const front=forward(ship);
  const cos=Math.cos(ship.yaw),sin=Math.sin(ship.yaw), pitch=Math.sin(ship.pitch),bank=Math.sin(ship.bank),level=Math.cos(ship.bank);
  const lateral={x:cos,y:0,z:-sin};
  const dorsal={x:-sin*pitch,y:Math.cos(ship.pitch),z:-cos*pitch};
  const right={},up={};
  for(const k of ['x','y','z']){
    right[k]=lateral[k]*level+dorsal[k]*bank;
    up[k]=dorsal[k]*level-lateral[k]*bank;
  }
  const axes={...viewer,x:0,y:0,z:0};
  return [right,up,front].map(v=>relative(axes,v));
}

export function drawDuelShip(ctx, viewer, ship, project) {
  const origin=relative(viewer,ship);
  if(origin.z < -24)return;
  const [right,up,front]=cameraBasis(viewer,ship);
  const transform=([x,y,z])=>({
    x:origin.x+x*right.x+y*up.x+z*front.x,
    y:origin.y+x*right.y+y*up.y+z*front.y,
    z:origin.z+x*right.z+y*up.z+z*front.z
  });
  const panels=[];
  const sun=relative({...viewer,x:0,y:0,z:0},{x:-.49,y:.81,z:-.32});
  for(const face of faces){
    const geometry=face.vertices.map(transform);
    const polygon=clipped(geometry);
    if(polygon.length<3)continue;
    const [a,b,c]=geometry;
    const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const normalLength=Math.hypot(nx,ny,nz)||1;
    const facing=nx*a.x+ny*a.y+nz*a.z>0?-1:1;
    const illumination=Math.max(0,facing*(nx*sun.x+ny*sun.y+nz*sun.z)/normalLength);
    const emission=['glass','trim','amber','hot'].includes(face.material);
    const brightness=emission?1:.56+.52*illumination;
    const rgb=palette[face.material].map(value=>Math.round(value*brightness));
    panels.push({points:polygon.map(project), depth:polygon.reduce((sum,p)=>sum+p.z,0)/polygon.length, color:'rgb('+rgb.join(',')+')'});
  }
  panels.sort((a,b)=>b.depth-a.depth);
  ctx.save();
  ctx.lineWidth=.42;ctx.lineJoin='round';
  for(const {points,color} of panels){
    ctx.beginPath();ctx.moveTo(...points[0]);for(const pt of points.slice(1))ctx.lineTo(...pt);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=color;ctx.stroke();
  }
  ctx.restore();
}

function beam(ctx, head, tail, width) {
  const dx=head[0]-tail[0],dy=head[1]-tail[1];
  if(Math.hypot(dx,dy)<1){
    const glow=ctx.createRadialGradient(...head,0,...head,width*3.4);
    glow.addColorStop(0,'#ffecaf');glow.addColorStop(.24,'#ff9b27');glow.addColorStop(1,'#ff540000');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(...head,width*3.4,0,Math.PI*2);ctx.fill();
    return;
  }
  for(const [size,color] of [[5,'#ff580025'],[2.2,'#ff6800b8'],[1,'#ffab3d'],[.34,'#fff2bf']]){
    ctx.strokeStyle=color;ctx.lineWidth=width*size;ctx.beginPath();ctx.moveTo(...tail);ctx.lineTo(...head);ctx.stroke();
  }
}
export function drawDuelLasers(ctx, viewer, shots, seat, project) {
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const shot of shots){
    const direction=shot.velocity;
    // Twin barrel flashes converge onto the simulated trajectory early in flight.
    const age=Math.max(0,2.5-shot.life);
    const yaw=Math.atan2(direction.x,direction.z);
    const rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
    for(const side of [-1,1]){
      const headOffset=side*5.7*Math.max(0,1-age/.46);
      const tailOffset=side*5.7*Math.max(0,1-(age-.05)/.46);
      const head=relative(viewer,{x:shot.x+headOffset*rightX,y:shot.y-.7*Math.abs(headOffset)/5.7,z:shot.z+headOffset*rightZ});
      const tail=relative(viewer,{x:shot.x-direction.x*23+tailOffset*rightX,y:shot.y-direction.y*23-.7*Math.abs(tailOffset)/5.7,z:shot.z-direction.z*23+tailOffset*rightZ});
      if(head.z<near && tail.z<near)continue;
      if(head.z<near || tail.z<near){
        const hidden=head.z<near?head:tail,visible=head.z<near?tail:head;
        const f=(near-hidden.z)/(visible.z-hidden.z);
        hidden.x+=(visible.x-hidden.x)*f;hidden.y+=(visible.y-hidden.y)*f;hidden.z=near;
      }
      const width=Math.max(1.35,Math.min(3.2,200/Math.max(1,head.z)));
      beam(ctx,project(head),project(tail),width*(shot.owner===seat?1:.9));
      if(!headOffset && !tailOffset)break;
    }
  }
  ctx.restore();
}
