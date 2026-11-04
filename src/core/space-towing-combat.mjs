import {requireThat} from './validation.mjs';
import {flightShip,hasTowingCombat,validateModuleFlight} from './space-module-flight.mjs';
import {towingFlightContext} from './space-towing-flight.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

export function towingInterceptable(s,ship,time){
 return hasTowingCombat(s)&&ship?.towingAttachment?.role==='TUG'&&ship.maintenanceId===ship.towingAttachment.workId&&ship.journey?.towing?.workId===ship.towingAttachment.workId&&!ship.docked&&!ship.operation&&!ship.combatId&&!ship.rescueId&&ship.hull>0&&(ship.journey.suspended||time<ship.journey.arrivesAtGameMs);
}
export async function towingCombatContext(tx,s,ship,time,combat=null){
 if(!ship?.towingAttachment)return null;requireThat(hasTowingCombat(s),'TOWING_COMBAT_NOT_OPEN');
 const x=await towingFlightContext(tx,s,ship,'towingCombat',time);requireThat(x&&ship.journey?.towing&&x.r.towingJourneyId===ship.journey.id,'TOWING_RESERVATION');
 await validateModuleFlight(tx,s,ship);requireThat(ship.modules?.some(m=>m.code==='MOD-05'&&m.lotId===x.b.lotId&&m.size===ship.soProfile.size&&m.status==='OPERATIONAL'),'TOWING_MODULE_UNAVAILABLE');
 if(combat){requireThat(combat.towingCombatVersion===1&&combat.shipIds.length===2&&!combat.teams,'TOWING_COMBAT_NOT_OPEN');requireThat(x.r.towingCombatVersion===1&&x.r.towingCombatId===combat.id,'TOWING_RESERVATION');const b=combat.towingBindings?.[ship.id];requireThat(b?.workId===x.r.id&&b.wreckId===x.wreck.id&&b.lotId===x.b.lotId&&(combat.status==='CLOSED'||b.journeyId===ship.journey.id),'TOWING_RESERVATION');}
 return x;
}
export function registerTowingEncounter(tx,s,x,combatId,at){
 if(!x)return;authorizeSpaceOutlaws(tx,s,'TOWING_COMBAT');tx.set(`sessions/${s.id}/shipMaintenance/${x.r.id}`,{...x.r,towingCombatVersion:1,towingCombatId:combatId,revision:x.r.revision+1});
}
// Free release before a round, or mandatory interruption at 0 hull. No money,
// cargo, title, module or PA changes; the same wreck stays in the route zone.
export function releaseTowingInSpace(tx,s,x,tug,combat,at,time,reason){
 requireThat(hasTowingCombat(s)&&x&&tug.journey?.towing&&tug.maintenanceId===x.r.id&&x.wreck.maintenanceId===x.r.id,'TOWING_RESERVATION');
 authorizeSpaceOutlaws(tx,s,'TOWING_COMBAT');const base=`sessions/${s.id}`,{towingAttachment,towingTransit,...wreck}=x.wreck;
 const position={version:1,routeId:tug.journey.routeId,fromPort:tug.journey.fromPort,toPort:tug.journey.toPort,journeyId:tug.journey.id,combatId:combat.id,workId:x.r.id,releasedAtGameMs:time};
 tx.set(`${base}/ships/${wreck.id}`,{...wreck,docked:false,maintenanceId:null,wreckSpacePosition:position,revision:wreck.revision+1});
 tx.set(`${base}/shipMaintenance/${x.r.id}`,{...x.r,status:'TOWING_RELEASED_IN_SPACE',towingCombatVersion:1,towingCombatId:combat.id,spaceRelease:position,closedAt:at,revision:x.r.revision+1});
 tx.set(`${base}/logisticsHistory/${combat.id}-tow-${x.r.id}`,{id:`${combat.id}-tow-${x.r.id}`,kind:reason,workId:x.r.id,combatId:combat.id,shipId:tug.id,wreckId:wreck.id,at});
 const {towingAttachment:attachment,...rest}=tug,{towing,...journey}=tug.journey;
 return flightShip(s,{...rest,maintenanceId:null,journey:{...journey,releasedTowing:{version:1,workId:x.r.id,wreckId:wreck.id,combatId:combat.id,reason}},revision:tug.revision+1},time);
}
