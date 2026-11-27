import {controls,flyShip,STEP} from './starfighter-duel.mjs';

// Each twenty-second campaign wave reserves its last five seconds for acknowledgement.
export const FLIGHT_TICKS=300;
const shipRadius=9;
export function asteroidRun(seed,systems={}){
 let bits=seed>>>0;
 const random=()=>{bits=(Math.imul(bits,1664525)+1013904223)>>>0;return bits/4294967296;};
 const rock=(x,y,z,radius)=>({x,y,z,radius,vx:(random()-.5)*5,vy:(random()-.5)*5,vz:-32-random()*12,shape:random()});
 const rocks=[rock(0,0,410,58),rock((random()-.5)*110,(random()-.5)*110,820,70)];
 for(let i=0;i<34;i++){
  const angle=random()*2*Math.PI,offset=82+random()*390;
  rocks.push(rock(Math.cos(angle)*offset,Math.sin(angle)*offset,100+random()*1550,14+random()*43));
 }
 const ship={x:0,y:0,z:0,yaw:0,pitch:0,bank:0,speed:56,targetSpeed:null,shield:30,shieldMax:30,hull:4,hullMax:4,...systems};
 return {ship,rocks,tick:0,hit:false,impactTick:null,trace:[]};
}
// Pack repeated inputs. Both views fly the quantised controls used by the server.
export function sampleAxes(raw){
 const c=controls(raw);
 return [c.turn,c.pitch,c.roll,c.throttle].map(x=>Math.round(x*100)).concat(c.targetSpeed===null?-1:Math.round(c.targetSpeed));
}
function flightTick(run,axes){
 const s=run.ship,old={x:s.x,y:s.y,z:s.z};
 flyShip(s,{turn:axes[0]/100,pitch:axes[1]/100,roll:axes[2]/100,throttle:axes[3]/100,targetSpeed:axes[4]<0?null:axes[4]});
 for(const r of run.rocks){
  const x=r.x-old.x,y=r.y-old.y,z=r.z-old.z;
  r.x+=r.vx*STEP;r.y+=r.vy*STEP;r.z+=r.vz*STEP;
  const dx=r.x-s.x-x,dy=r.y-s.y-y,dz=r.z-s.z-z;
  const t=Math.max(0,Math.min(1,-(x*dx+y*dy+z*dz)/(dx*dx+dy*dy+dz*dz||1)));
  if(!run.hit&&Math.hypot(x+t*dx,y+t*dy,z+t*dz)<=r.radius+shipRadius){
   run.hit=true;run.impactTick=run.tick;
  }
 }
 run.tick++;
}
export function recordFlight(run,raw){
 if(run.tick>=FLIGHT_TICKS)return;
 const axes=sampleAxes(raw),a=run.trace,last=a.length-6;
 if(last>=0&&axes.every((v,i)=>a[last+1+i]===v))a[last]++;
 else a.push(1,...axes);
 flightTick(run,axes);
}
export function replayFlight(seed,trace){
 if(!Array.isArray(trace)||!trace.length||trace.length%6||trace.length>FLIGHT_TICKS*6)return null;
 const run=asteroidRun(seed);
 for(let i=0;i<trace.length;i+=6){
  const count=trace[i],axes=trace.slice(i+1,i+6);
  if(!Number.isInteger(count)||count<=0||count>FLIGHT_TICKS-run.tick||
     !axes.every((v,n)=>Number.isInteger(v)&&(n===4?v>=-1&&v<=120:Math.abs(v)<=100)))return null;
  for(let n=0;n<count;n++)flightTick(run,axes);
 }
 return run.tick===FLIGHT_TICKS?run:null;
}
