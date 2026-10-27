import {requireThat} from './validation.mjs';
import {admissionText} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {navigationSkill,soRoute} from './space-outlaws-navigation-state.mjs';
import {convoyFleet} from './space-convoy.mjs';
import {actionPointPath,actionPointState,spendActionPoints} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {transportDetour} from './space-transport.mjs';
import {gameTime} from './clock.mjs';

export const hasSoDetours=s=>s.spaceOutlaws?.detourVersion===1;
export const detourFields={prepareSoDetour:['shipId','navigationCode'],attemptSoDetour:['shipId','navigationCode','confirmation']};
const remaining=(j,time)=>j.suspended?j.remainingMs:Math.max(0,j.arrivesAtGameMs-time);
const eligible=(x,time)=>!!x.journey&&!x.docked&&x.enabled&&x.hull>0&&!x.operation&&!x.combatId&&!x.rescueId&&!x.maintenanceId&&!x.journey.intercepted&&!x.journey.interceptionCovered&&!x.journey.detour&&remaining(x.journey,time)>0&&x.journey.event.fuelDebt===0;
export function detourView(s,ship,c,time){
 if(!hasSoDetours(s)||ship.pilotId!==c.id)return null;
 return {level:navigationSkill(c,'PIL-01'),used:!!ship.journey?.detour,canAttempt:eligible(ship,time)&&navigationSkill(c,'PIL-01')>=1&&(!ship.convoy||ship.convoy.leaderShipId===ship.id)};
}
export function detourCost(ship,route,time){
 const j=ship.journey,surcharge=ship.soProfile.size,extraFuel=Math.max(0,route.fuelCost-j.fuelCost),elapsedMs=Math.max(0,(j.durationSeconds+j.event.delaySeconds)*1000-remaining(j,time));
 return {surcharge,extraFuel,requiredFuel:surcharge+extraFuel,remainingMs:Math.max(120000,(route.durationSeconds+j.event.delaySeconds)*1000-elapsedMs),elapsedMs};
}

// One atomic attempt in the existing journey. Previewing does not reserve or roll.
// Event effects are already fixed at departure: a route change never rerolls,
// refunds, replays or silently closes them, including an unresolved MJ encounter.
export async function detourCommand(tx,s,ship,c,version,input,action,id,at,roll,available){
 requireThat(hasSoDetours(s),'SO_GAMEPLAY_NOT_OPEN');
 const base=`sessions/${s.id}`,time=gameTime(s.clock,at),level=navigationSkill(c,'PIL-01');
 requireThat(!ship.journey?.detour,'SO_DETOUR_USED');requireThat(eligible(ship,time),'SO_DETOUR_UNAVAILABLE');
 requireThat(level>=1&&level<=5&&navigationSkill(c,'PIL-02')>=1,'FIELD_SKILL_REQUIRED');
 requireThat(!ship.convoy||ship.convoy.leaderShipId===ship.id,'SO_DETOUR_LEADER');
 const code=admissionText(input.navigationCode,80,true),ports=await tx.list(`${base}/ports`),routes=await tx.list(`${base}/routes`);
 const candidates=routes.filter(r=>r.versionId===s.versionId&&r.fromPort===ship.journey.fromPort&&r.id!==ship.journey.routeId&&(r.navigationCode===code||ports.find(p=>p.id===r.toPort)?.navigationCode===code));
 requireThat(candidates.length===1,'ROUTE_UNAVAILABLE');const route=candidates[0],fleet=await convoyFleet(tx,s,ship),rows=[];
 for(const x of fleet){
  requireThat(eligible(x,time)&&x.journey.routeId===ship.journey.routeId&&(!ship.convoy||x.journey.convoyId===ship.convoy.id),'SO_DETOUR_UNAVAILABLE');
  const p=await inventoryParty(tx,s.id,x.pilotId);
  requireThat(p.active&&p.c.activeVoyageId===x.journey.id&&p.c.id===x.journey.pilotId&&available(s,p.c,time)&&!p.c.activeNavigationId&&navigationSkill(p.c,'PIL-02')>=1&&(!ship.convoy||ship.convoy.pilots.some(v=>v.id===p.c.id&&v.version===p.version)),'INVALID_RECIPIENT');
  const nextRoute=soRoute(route,x),cost=detourCost(x,nextRoute,time);rows.push({ship:x,route:nextRoute,cost,pilotGuard:p.version});
 }
 const points=actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at),canPay=rows.every(r=>r.ship.fuel>=r.cost.requiredFuel),confirmation=hash(JSON.stringify([s.revision,version,level,route,points,rows.map(r=>[r.ship,r.pilotGuard])]));
 const result={shipId:ship.id,route:soRoute(route,ship),level,cost:1,canPay,hasActionPoint:points.available>=1,convoy:rows.length>1,ships:rows.map(r=>({id:r.ship.id,name:r.ship.name,surcharge:r.cost.surcharge,extraFuel:r.cost.extraFuel,canPay:r.ship.fuel>=r.cost.requiredFuel,...(r.ship.id===ship.id?{remainingFuelOnSuccess:r.ship.fuel-r.cost.requiredFuel}:{} )})),remainingSeconds:Math.ceil(rows[0].cost.remainingMs/1000),confirmation};
 if(action==='prepareSoDetour')return result;
 requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(canPay,'SO_DETOUR_FUEL');const paid=spendActionPoints(points,1);
 requireThat(Number.isInteger(roll)&&roll>=1&&roll<=6,'INVALID_DIE');const total=roll+level,success=total>=7;
 // Read all freight/ambush dependencies before publishing any effects.
 const ambushes=[];if(success)for(const r of rows){if(r.ship.ambushId)ambushes.push(await tx.get(`${base}/spaceAmbushes/${r.ship.ambushId}`));await transportDetour(tx,s,r.ship,id,at);}
 if(ambushes.length){authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');for(const a of ambushes){requireThat(a?.status==='ACTIVE','SPACE_AMBUSH_CLOSED');tx.set(`${base}/spaceAmbushes/${a.id}`,{...a,status:'ROUTE_CHANGED',closedAt:at});}}
 for(const {ship:x,route:r,cost} of rows){
  const j=x.journey,detour={id,at,leaderShipId:ship.id,roll,level,total,success,fromRouteId:j.routeId,fromPort:j.fromPort,originalToPort:j.toPort,toRouteId:r.id,toPort:r.toPort,surcharge:cost.surcharge,extraFuel:success?cost.extraFuel:0};
  const journey={...j,...(success?{...r,id:j.id,routeId:r.id,arrivesAtGameMs:time+cost.remainingMs,remainingMs:j.suspended?cost.remainingMs:null}:{}),detour};
  const convoy=success&&x.convoy?{...x.convoy,routeId:r.id,routeName:r.name,fromPort:r.fromPort,toPort:r.toPort,navigationCode:code}:x.convoy;
  tx.set(`${base}/ships/${x.id}`,{...x,journey,...(convoy?{convoy}:{}),fuel:x.fuel-cost.surcharge-(success?cost.extraFuel:0),...(success?{ambushId:null}:{}),revision:x.revision+1});
  tx.set(`${base}/voyages/${j.id}`,{...journey,shipId:x.id,status:journey.suspended?'SUSPENDED':'IN_TRANSIT'});
 }
 tx.set(actionPointPath(s.id,c.id),paid);
 return {id,shipId:ship.id,roll,level,total,success,status:success?'DIVERTED':'FAILED'};
}
