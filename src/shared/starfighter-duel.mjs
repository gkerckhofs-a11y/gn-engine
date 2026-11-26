// Fixed 50 ms steps shared by both training and authenticated flight.
export const STEP = 0.05;
export const MAX_SPEED = 120;
const SPEED_STEP = 55 * STEP;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const axis = value => Number.isFinite(value) ? clamp(value, -1, 1) : 0;
export function controls(raw = {}) {
  return {turn:axis(raw.turn), pitch:axis(raw.pitch), roll:axis(raw.roll),
    throttle:axis(raw.throttle), fire:raw.fire === true,
    targetSpeed:Number.isFinite(raw.targetSpeed) ? clamp(raw.targetSpeed,0,MAX_SPEED) : null};
}
export const DEFAULT_SHIELD_FACTOR = 10;
export function duel(shieldFactor = 1) {
  const ships = [-1,1].map((sign,i) => ({x:0,y:0,z:sign*240,yaw:i*Math.PI,
    pitch:0,bank:0,speed:0,targetSpeed:null,shield:3*shieldFactor,shieldMax:3*shieldFactor,hull:4,hullMax:4,cooldown:0}));
  return {ships, shots:[], phase:'appel', seconds:30, agreement:[false,false], linked:[false,false]};
}
export function decision(state, seat, action) {
  if (!['appel','parole'].includes(state.phase)) return;
  if (action === 'liaison') {
    state.linked[seat] = true;
    if (state.phase === 'appel' && state.linked.every(Boolean)) {
      state.phase = 'parole'; state.seconds = 90;
    }
  }
  if (action === 'accord') {
    state.agreement[seat] = true;
    if (state.agreement.every(Boolean)) state.phase = 'paix';
  }
  if (action === 'rompre') state.phase = 'combat';
}
export function forward(s) {
  return {x:Math.sin(s.yaw)*Math.cos(s.pitch),y:Math.sin(s.pitch),z:Math.cos(s.yaw)*Math.cos(s.pitch)};
}
export function relative(s,p) {
  const dx=p.x-s.x,dy=p.y-s.y,dz=p.z-s.z;
  const lateral=dx*Math.cos(s.yaw)-dz*Math.sin(s.yaw);
  const ahead=dx*Math.sin(s.yaw)+dz*Math.cos(s.yaw);
  const up=dy*Math.cos(s.pitch)-ahead*Math.sin(s.pitch);
  return {x:lateral*Math.cos(s.bank)+up*Math.sin(s.bank),
    y:up*Math.cos(s.bank)-lateral*Math.sin(s.bank),z:ahead*Math.cos(s.pitch)+dy*Math.sin(s.pitch)};
}
export function step(state, inputs) {
  if (['paix','fin'].includes(state.phase)) return;
  if (['appel','parole'].includes(state.phase)) {
    state.seconds=Math.max(0,state.seconds-STEP);
    if (!state.seconds) state.phase='combat';
  }
  const before=state.ships.map(s=>({...s}));
  for (const [i,s] of state.ships.entries()) {
    const c=controls(inputs[i]);
    s.bank+=c.roll*2*STEP;
    s.yaw+=(c.turn*1.65+Math.sin(s.bank)*c.pitch*1.25)*STEP;
    s.pitch=clamp(s.pitch+c.pitch*Math.cos(s.bank)*1.25*STEP,-1.48,1.48);
    if(c.throttle!==0){
      s.targetSpeed=null;
      s.speed=clamp(s.speed+c.throttle*SPEED_STEP,0,MAX_SPEED);
    }else{
      s.targetSpeed=c.targetSpeed ?? s.targetSpeed ?? null;
      if(s.targetSpeed!==null)s.speed+=clamp(s.targetSpeed-s.speed,-SPEED_STEP,SPEED_STEP);
    }
    const f=forward(s);
    for(const k of ['x','y','z']) s[k]+=f[k]*s.speed*STEP;
    s.cooldown=Math.max(0,s.cooldown-STEP);
    if(c.fire && !s.cooldown && state.phase==='combat') {
      s.salvos=(s.salvos??0)+1;
      state.shots.push({x:s.x,y:s.y,z:s.z,velocity:f,owner:i,life:2.5});
      s.cooldown=.35;
    }
  }
  state.shots=state.shots.filter(p=>{
    const j=1-p.owner, target=state.ships[j], old=before[j];
    // Closest point on the relative motion segment catches fast crossings.
    const delta=['x','y','z'].map(k=>p.velocity[k]*520*STEP-(target[k]-old[k]));
    const offset=['x','y','z'].map(k=>p[k]-old[k]);
    const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
    const t=clamp(-dot(offset,delta)/(dot(delta,delta)||1),0,1);
    if(Math.hypot(...offset.map((v,i)=>v+t*delta[i]))<=12) {
      const damage=state.ships[p.owner].laserDamage??1;
      target.hull=Math.max(0,target.hull-Math.max(0,damage-target.shield));
      target.shield=Math.max(0,target.shield-damage);
      return false;
    }
    for(const k of ['x','y','z']) p[k]+=p.velocity[k]*520*STEP;
    p.life-=STEP; return p.life>0;
  });
  if(state.ships.some(s=>!s.hull)) state.phase='fin';
}
