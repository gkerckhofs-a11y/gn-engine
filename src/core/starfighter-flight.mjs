import {controls, duel, step, STEP} from '../shared/starfighter-duel.mjs';
import {admissionKeys} from './admission-state.mjs';
import {requireThat} from './validation.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

const tickMs = STEP * 1000;
const leaseMs = 1800;
const phases = {ENCOUNTER:'negotiating', DOGFIGHT:'combat'};

export function flightSeats(ships) {
  if (ships.length !== 2 || !ships.every(s=>s.cockpit?.starfighter && s.cockpit.status==='ASSIGNED' &&
    s.cockpit.pilotId===s.pilotId && !s.towingAttachment && !s.convoy && !s.pirateAlliance)) return null;
  return ships.map(s=>({pilotId:s.pilotId,stationId:s.cockpit.stationId,operationId:s.cockpit.operationId}));
}

function initialRoom(ships, factor) {
  const room=duel();
  room.ships.forEach((v,i)=>{
    const ship=ships[i], old=ship.starfighterShield;
    const carried=old?.charge===ship.shield ? Math.floor(old.spent*factor/old.factor) : 0;
    Object.assign(v,{hull:ship.hull,hullMax:ship.soProfile.hullMax,
      shield:Math.max(0,ship.shield*factor-carried),shieldMax:ship.soProfile.shieldMax*factor,
      laserDamage:ship.soProfile.weapon==='HEAVY'?2:1});
  });
  return room;
}

export async function exchangeFlight({tx,s,e,ships,seat,payload,command,at,time,saveShip,close,fitBoth}) {
  const binding=e.flight?.seats[seat], base='sessions/'+s.id, path=base+'/spaceCombats/'+e.id;
  requireThat(binding && phases[e.status] && binding.stationId===payload.stationId,'COCKPIT_UNAVAILABLE');
  const current=flightSeats(ships);
  requireThat(current && current.every((v,i)=>Object.keys(v).every(k=>v[k]===e.flight.seats[i][k])),'COCKPIT_UNAVAILABLE');
  for(const [i,b] of current.entries()){
    const post=await tx.get(base+'/cockpitStations/'+b.stationId);
    requireThat(post?.shipId===ships[i].id && post.operationId===b.operationId,'COCKPIT_UNAVAILABLE');
  }
  await fitBoth();
  authorizeSpaceOutlaws(tx,s,'STARFIGHTER_FLIGHT');
  const radioPath=path+'/flight/radio';
  const radio=e.status==='ENCOUNTER'?await tx.get(radioPath):null;
  if(command==='starfighterSignal'){
    requireThat(e.status==='ENCOUNTER','SPACE_COMBAT_PHASE');
    const msg=payload.message;
    admissionKeys(msg,['type','sdp']);
    requireThat(['ready','offer','answer','hangup'].includes(msg.type),'INVALID_INPUT');
    const description=['offer','answer'].includes(msg.type);
    requireThat(description ? typeof msg.sdp==='string' && msg.sdp.length>0 && msg.sdp.length<=32768 &&
      msg.type===(seat===0?'offer':'answer') : msg.sdp===undefined,'INVALID_INPUT');
    const mailbox={...radio,[seat]:{seq:(radio?.[seat]?.seq??0)+1,...msg}};
    tx.set(radioPath,mailbox);
    return {ok:true};
  }
  const statePath=path+'/flight/state';
  const f=await tx.get(statePath)??{room:initialRoom(ships,e.flight.shieldFactor),seq:[0,0],
    inputs:[controls(),controls()],seen:[null,null],clockEpoch:null,tick:time};
  const room=f.room;
  if(f.clockEpoch!==s.clock.runningSince || room.phase!==phases[e.status]){
    f.clockEpoch=s.clock.runningSince;f.seen=[null,null];f.inputs=[controls(),controls()];f.tick=time;
  }
  room.phase=phases[e.status];room.seconds=Math.max(0,Math.ceil((e.negotiationUntil-time)/1000));
  room.agreement=ships.map(sh=>!!e.peace[sh.id]);
  const live=(t,when)=>t!==null && when>=t && when-t<leaseMs;
  const response=()=>({room,seat,seq:f.seq[seat],ready:f.seen.every(t=>live(t,time)),signal:radio?.[1-seat]??null});
  if(payload.seq==null)return response();
  requireThat(Number.isSafeInteger(payload.seq) && payload.seq>0,'INVALID_INPUT');
  if(payload.seq!==f.seq[seat]+1)return response();
  admissionKeys(payload.controls,['turn','pitch','roll','throttle','targetSpeed','fire']);
  const before=room.ships.map(v=>({hull:v.hull,shield:v.shield,salvos:v.salvos??0}));
  // A delayed request cannot fast-forward the simulation or extend an expired trigger.
  const end=time-time%tickMs;
  for(let t=Math.max(f.tick,end-leaseMs)+tickMs;t<=end && room.phase!=='fin';t+=tickMs){
    if(f.seen.every(seen=>live(seen,t)))step(room,f.inputs);
  }
  f.tick=Math.max(f.tick,end);f.seq[seat]=payload.seq;f.seen[seat]=time;f.inputs[seat]=controls(payload.controls);
  tx.set(statePath,f);
  const hostile=room.ships.some((v,i)=>(v.salvos??0)>before[i].salvos);
  const after=ships.map((sh,i)=>{
    const v=room.ships[i], factor=e.flight.shieldFactor;
    if(v.shield===before[i].shield && v.hull===before[i].hull && (!hostile||sh.revisionRequired))return sh;
    const charge=Math.ceil(v.shield/factor);
    return {...sh,revision:sh.revision+1,hull:v.hull,shield:charge,revisionRequired:true,
      starfighterShield:{charge,spent:charge*factor-v.shield,factor}};
  });
  if(after.some((sh,i)=>sh!==ships[i]) || room.phase==='fin'){
    authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');
    if(room.phase==='fin'){
      const round={id:'1',round:1,at,orders:[],rolls:[],shots:[],quietRounds:0,escaped:[],hostile:true,
        after:after.map(({id,hull,shield,revisionRequired})=>({id,hull,shield,revisionRequired})),reason:'IMMOBILIZED'};
      tx.set(path+'/rounds/1',round);
      close({...e,lastRound:round,flightResult:room},after,'IMMOBILIZED');
      const id=e.id+'-flight';
      tx.set(base+'/logisticsHistory/'+id,{id,kind:'starfighterDuel',combatId:e.id,at,after:round.after});
    }else after.forEach((sh,i)=>{if(sh!==ships[i])saveShip(sh);});
  }
  return response();
}
