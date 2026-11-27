import {requireThat,documentId} from './validation.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

export const trainingFields={flightTraining:[],scheduleFlightTraining:['revision','kind','start','end'],cancelFlightTraining:['revision','slotId']};
const exercises=['VOYAGE','DUEL','ASTEROIDS'];
export function flightTraining(settings,s,at){
 const open=!s.safetyStop?.active&&['BRIEFING','EN_JEU'].includes(s.stage);
 return {serverNow:at,revision:settings?.trainingRevision??0,slots:(settings?.trainingSlots??[]).filter(x=>x.end>at).map(x=>({...x,active:open&&x.start<=at}))};
}
export async function scheduleTraining(tx,s,settings,at,id,action,actor,input){
 const base='sessions/'+s.id;
 requireThat(!s.safetyStop?.active&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
 const key='operations/'+hash(actor.uid+':'+documentId(input.requestId)),signature=hash(JSON.stringify([action,input])),previous=await tx.get(key);
 if(previous){requireThat(signature===previous.fingerprint,'REQUEST_ID_REUSED');return previous.result;}
 const revision=settings?.trainingRevision??0;
 requireThat(revision===input.revision,'STALE_REVISION');
 let slots=(settings?.trainingSlots??[]).filter(x=>x.end>at);
 if(action==='scheduleFlightTraining'){
  const {kind,start,end}=input;
  requireThat(exercises.includes(kind)&&[start,end].every(Number.isSafeInteger)&&start>=0&&end<=8640000000000000&&start<end&&end>at&&slots.length<50,'INVALID_TRAINING_SLOT');
  slots=[...slots,{id,kind,start,end}].sort((a,b)=>a.start-b.start);
 }else{
  const slotId=documentId(input.slotId);
  requireThat(slots.some(x=>x.id===slotId),'INVALID_TRAINING_SLOT');
  slots=slots.filter(x=>x.id!==slotId);
 }
 authorizeSpaceOutlaws(tx,s,'COCKPIT');
 const result={revision:revision+1};
 tx.set(base+'/cockpitSettings/main',{...settings,id:'main',trainingSlots:slots,trainingRevision:result.revision});
 tx.set(base+'/audit/'+id,{id,action,at,actorUid:actor.uid,slotId:action==='scheduleFlightTraining'?id:input.slotId});
 tx.set(key,{fingerprint:signature,result,at});
 return result;
}
