import {shipCrewAccess} from './ship-crew-state.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {convoyFleet} from './space-convoy.mjs';
import {flightShip} from './space-module-flight.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {wavePenalty} from './flight-hazards.mjs';

export const engineeringFields={flightEngineering:[],repairFlightImpact:['journeyId','wave','system']};
const circuits=['THRUST','RADAR','STABILITY'];

function faults(j,time){
 const h=j.event.hazard;
 const elapsed=time-j.departedAtGameMs-30000;
 return [0,1,2].filter(wave=>{
  const outcome=h.outcomes?.[wave];
  return !h.repairs?.includes(wave)&&(outcome==='HIT'||(!outcome&&elapsed>=(wave+1)*20000));
 }).map(wave=>({wave,system:circuits[(h.pattern-1+wave)%3]}));
}

export async function flightEngineering(tx,ctx,action,input,actor,at,id,time,available){
 const {s,c,version}=ctx,base='sessions/'+s.id,read=action==='flightEngineering';
 const record=c.activeVoyageId?await tx.get(base+'/voyages/'+c.activeVoyageId):null;
 const ship=record?.shipId?flightShip(s,await tx.get(base+'/ships/'+record.shipId),time):null,j=ship?.journey;
 const qualified=j&&j.id===c.activeVoyageId&&j.manifest?.some(m=>m.id===c.id)&&navigationSkill(c,'MEC-02')>=1;
 const crew=qualified?await shipCrewAccess(tx,s,ship,c,at):null;
 const mechanic=qualified&&(!crew.bound||crew.permissions.maintenance);
 const visible=mechanic&&j.event?.hazard?.kind==='ASTEROIDS';
 if(!visible){if(read)return {aboard:!!mechanic,station:null};requireThat(false,'FORBIDDEN');}
 const pending=faults(j,time),h=j.event.hazard;
 const canRepair=s.stage==='EN_JEU'&&!s.safetyStop?.active&&available(s,c,time)&&!j.suspended&&!ship.combatId&&!ship.rescueId&&!j.intercepted&&!j.interceptionCovered&&time<j.arrivesAtGameMs;
 if(read)return {aboard:true,station:{shipName:ship.name,journeyId:j.id,canRepair,pending,recoveredSeconds:h.recoveredSeconds??0,secondsPerRepair:wavePenalty(j)/2}};
 requireThat(input.journeyId===j.id,'FORBIDDEN');
 const signature=hash(JSON.stringify([action,input])),op='operations/'+hash(actor.uid+':'+documentId(input.requestId)),old=await tx.get(op);
 if(old){requireThat(old.fingerprint===signature&&old.guard===version&&old.characterId===c.id,'REQUEST_ID_REUSED');return old.result;}
 requireThat(canRepair,'FLIGHT_REPAIR_CLOSED');
 const fault=pending.find(f=>f.wave===input.wave);
 requireThat(fault,'FLIGHT_REPAIR_CLOSED');requireThat(fault.system===input.system,'FLIGHT_REPAIR_SYSTEM');
 const fleet=await convoyFleet(tx,s,ship,time);
 for(const member of fleet){
  const flight=member.journey;
  requireThat(flight?.event.hazard?.kind==='ASTEROIDS'&&!flight.suspended&&!flight.intercepted&&!flight.interceptionCovered&&!member.combatId&&!member.rescueId&&time<flight.arrivesAtGameMs&&faults(flight,time).some(f=>f.wave===fault.wave),'FLIGHT_REPAIR_CLOSED');
 }
 const seconds=wavePenalty(j)/2;
 authorizeSpaceOutlaws(tx,s,'NAVIGATION');
 for(const member of fleet){
  const flight=member.journey,event=flight.event,hazard=event.hazard;
  const repaired={...flight,arrivesAtGameMs:Math.max(time,flight.arrivesAtGameMs-seconds*1000),event:{...event,delaySeconds:event.delaySeconds-seconds,hazard:{...hazard,repairs:[...(hazard.repairs??[]),input.wave],recoveredSeconds:(hazard.recoveredSeconds??0)+seconds}}};
  tx.set(base+'/ships/'+member.id,{...member,revision:member.revision+1,journey:repaired});
  tx.set(base+'/voyages/'+flight.id,{...repaired,shipId:member.id,status:'IN_TRANSIT'});
 }
 const result={recoveredSeconds:seconds};
 tx.set(base+'/logisticsHistory/'+id,{id,kind:action,shipId:ship.id,journeyId:j.id,wave:input.wave,technicianId:c.id,seconds,at});
 tx.set(base+'/audit/'+id,{id,action,actorUid:actor.uid,at});
 tx.set(op,{fingerprint:signature,guard:version,characterId:c.id,result,at});
 return result;
}
