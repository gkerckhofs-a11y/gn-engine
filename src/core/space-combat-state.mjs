import {requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';

export const hasSoCombat=s=>s.spaceOutlaws?.combatVersion===1&&s.spaceOutlaws?.navigationVersion===1;
export const spaceOrderKinds=['ATTACK','DEFEND','FLEE','PURSUE','PASSIVE','SURRENDER','PIL03_2','PIL03_3','PIL03_4','PIL03_5'];
export function spaceOrderInput(v,targets=false){
 admissionKeys(v,['kind','fallback','acceptSurrender','ceasefire',...(targets?['targetId','defenseIds']:[])]);
 requireThat(spaceOrderKinds.includes(v.kind)&&typeof v.acceptSurrender==='boolean'&&typeof v.ceasefire==='boolean','INVALID_SPACE_ORDER');
 const fallback=v.fallback??'PASSIVE';requireThat(['ATTACK','DEFEND','FLEE','PURSUE','PASSIVE'].includes(fallback),'INVALID_SPACE_ORDER');
 if(targets)requireThat(typeof v.targetId==='string'&&Array.isArray(v.defenseIds)&&v.defenseIds.length<=(v.kind==='PIL03_2'?2:1)&&new Set(v.defenseIds).size===v.defenseIds.length&&v.defenseIds.every(x=>typeof x==='string'),'INVALID_SPACE_ORDER');
 return {...(targets?{targetId:v.targetId,defenseIds:v.defenseIds}:{}),kind:v.kind,fallback,acceptSurrender:v.acceptSurrender,ceasefire:v.ceasefire};
}
export const spaceSpecialLevel=o=>o.kind.startsWith('PIL03_')?Number(o.kind.slice(-1)):0;
export function pauseSpaceJourney(ship,time){
 const j=ship.journey;requireThat(j,'VOYAGE_CLOSED');
 return {...ship,journey:{...j,suspended:true,remainingMs:j.suspended?j.remainingMs:Math.max(0,j.arrivesAtGameMs-time)}};
}
export function resumeSpaceJourney(ship,time){
 const j=ship.journey;if(!j)return ship;
 const suspended=!!ship.convoy&&j.suspended||!!ship.combatId||!!ship.rescueId||!!ship.maintenanceId||ship.hull===0||j.immobilized&&ship.revisionRequired||j.event.needsMJ||j.event.fuelDebt>0;
 return {...ship,journey:{...j,suspended,immobilized:ship.hull===0||!!j.immobilized&&ship.revisionRequired,arrivesAtGameMs:suspended?j.arrivesAtGameMs:time+j.remainingMs,remainingMs:suspended?j.remainingMs:null}};
}
const damage=(s,n)=>{const shield=Math.max(0,s.shield-n);return {...s,shield,hull:Math.max(0,s.hull-Math.max(0,n-s.shield))};};
// Two-ship encounters only. Orders and dice are fixed before resolving either ship.
export function resolveSpaceDuel(ships,orders,dice,quietRounds=0){
 requireThat(ships.length===2&&orders.length===2&&dice.length===8&&dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6),'INVALID_SPACE_ROUND');
 const before=ships.map(s=>({...s})),after=ships.map(s=>({...s})),used=[false,false],fuelSpent=[0,0],rolls=[],shots=[],escaped=[];
 const close=(reason,hostile=false)=>({after,used,fuelSpent,rolls,shots,escaped,hostile,quietRounds:hostile?0:quietRounds+1,closed:true,reason});
 if(orders.every(o=>o.ceasefire))return close('CEASEFIRE');
 if(orders.some((o,i)=>o.kind==='SURRENDER'&&orders[1-i].acceptSurrender))return close('SURRENDER');
 const kinds=orders.map((o,i)=>before[i].hull>0?(o.kind==='SURRENDER'?o.fallback:o.kind):'PASSIVE');
 const shooting=k=>['ATTACK','PIL03_3','PIL03_5'].includes(k),defending=k=>['DEFEND','PIL03_2','PIL03_5'].includes(k),fleeing=k=>['FLEE','PIL03_4'].includes(k);
 let hostile=false;const incoming=[0,0];
 for(let i=0;i<2;i++){
  const target=1-i;if(!shooting(kinds[i])||before[target].hull===0)continue;
  const heavy=before[i].weapon==='HEAVY',bonus=kinds[i]==='PIL03_3'?1:0,threshold=heavy?5:4,hit=dice[i]+bonus>=threshold;
  hostile=true;used[i]=spaceSpecialLevel(orders[i])>0;after[i].revisionRequired=true;after[target].revisionRequired=true;
  let defended=false;
  // A designated defense rolls against the executed shot, even if it misses.
  if(defending(kinds[target])){const minimum=kinds[target]==='DEFEND'?5:6,defenseThreshold=Math.max(minimum,bonus?6:5),total=dice[2+target]+before[target].maneuverability;defended=total>=defenseThreshold;rolls.push({kind:'DEFENSE',shipId:before[target].id,roll:dice[2+target],total,threshold:defenseThreshold,success:defended});if(spaceSpecialLevel(orders[target]))used[target]=true;}
  const amount=hit&&!defended?(heavy?2:1):0;incoming[target]+=amount;shots.push({shipId:before[i].id,targetId:before[target].id,roll:dice[i],bonus,threshold,hit,defended,damage:amount});
 }
 for(let i=0;i<2;i++)after[i]=damage(after[i],incoming[i]);
 // Pursuer selected from locked orders before damage; an immobilized one is never replaced.
 const pursuer=kinds.findIndex((k,i)=>k==='PURSUE'&&fleeing(kinds[1-i])&&before[1-i].hull>0);
 for(let i=0;i<2;i++){
  if(!fleeing(kinds[i])||after[i].hull===0)continue;
  if(pursuer!==1-i||after[pursuer].hull===0){escaped.push(before[i].id);continue;}
  const special=kinds[i]==='PIL03_4';if(special&&before[i].fuel<1)continue;
  const total=dice[4+i]+before[i].maneuverability+(special?2:0),opposed=dice[6]+before[pursuer].maneuverability,success=total>opposed;
  hostile=true;rolls.push({kind:'PURSUIT',shipId:before[pursuer].id,targetId:before[i].id,roll:dice[6],total:opposed});rolls.push({kind:'FLEE',shipId:before[i].id,roll:dice[4+i],total,opposed,success});
  if(special){used[i]=true;fuelSpent[i]=1;after[i].fuel--;if(!success){after[i]=damage(after[i],1);after[i].revisionRequired=true;}}
  if(success)escaped.push(before[i].id);
 }
 const quiet=hostile?0:quietRounds+1;
 if(escaped.length)return close('FLED',hostile);
 if(after.some(s=>s.hull===0))return close('IMMOBILIZED',hostile);
 if(quiet>=2)return close('QUIET',hostile);
 return {after,used,fuelSpent,rolls,shots,escaped,hostile,quietRounds:quiet,closed:false,reason:null};
}
