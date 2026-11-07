import {requireThat} from './validation.mjs';
import {resumeSpaceJourney} from './space-combat-state.mjs';

// User decision B, 2026-11-05: keep the attachment and wait for MOD-05.
export const waitingTowingOutage=(j,time)=>!!j?.towing&&j.towingOutage?.state==='WAITING'&&time<j.towingOutage.untilGameMs;
export function startTowingOutage(j,event,time){
 if(!j.towing||event.neutralizedModule?.code!=='MOD-05')return j;
 requireThat(j.towing.outageVersion===1&&event.neutralizedModule.lotId===j.towing.lotId,'TOWING_OUTAGE_NOT_OPEN');
 return {...j,suspended:true,remainingMs:j.remainingMs??Math.max(0,j.arrivesAtGameMs-time),towingOutage:{version:1,lotId:j.towing.lotId,startedAtGameMs:time,untilGameMs:time+900000,state:'WAITING'}};
}
export function normalizeTowingOutage(ship,time){
 const j=ship?.journey,o=j?.towingOutage;if(!o)return ship;
 requireThat(j.towing&&o.version===1&&o.lotId===j.towing.lotId&&Number.isFinite(o.startedAtGameMs)&&o.untilGameMs===o.startedAtGameMs+900000&&['WAITING','EXPIRED'].includes(o.state),'TOWING_OUTAGE_STATE');
 if(o.state==='EXPIRED')return ship;
 requireThat(j.suspended&&Number.isFinite(j.remainingMs)&&j.remainingMs>=0,'TOWING_OUTAGE_STATE');
 if(time<o.untilGameMs)return ship;
 // Resume at expiry, even if the first later read occurs much later. Other
 // native blockers keep the voyage suspended and are cleared by their service.
 const maintenanceId=ship.maintenanceId,ownLock=maintenanceId===ship.towingAttachment?.workId&&maintenanceId===j.towing.workId;
 const next=resumeSpaceJourney({...ship,maintenanceId:ownLock?null:maintenanceId,journey:{...j,towingOutage:{...o,state:'EXPIRED'}}},o.untilGameMs);
 return {...next,maintenanceId};
}
