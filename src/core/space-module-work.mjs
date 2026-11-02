import {isDeepStrictEqual} from 'node:util';
import {documentId,requireThat,DomainError} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash,lotState} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {hasModuleMandates,moduleMandateBinding} from './space-module-mandates.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

const fields={prepareModuleWorkStart:['mandateId'],startModuleWork:['mandateId','confirmation','present','workshopConfirmed'],moduleWork:['mandateId'],moduleWorkAdmin:['mandateId'],cancelModuleWork:['mandateId','confirmation','reason'],cancelModuleWorkAdmin:['mandateId','confirmation','reason']};
export const moduleWorkActions=Object.keys(fields);
const reads=new Set(['prepareModuleWorkStart','moduleWork','moduleWorkAdmin']);
const admins=new Set(['moduleWorkAdmin','cancelModuleWorkAdmin']);
export const hasModuleWork=s=>s.spaceOutlaws?.moduleWorkVersion===1&&hasModuleMandates(s);
const view=(s,r,time,confirmation)=>({id:r.id,status:r.status,shipName:r.shipName,lotId:r.lotId,module:r.module,ownerName:r.ownerName,technicianName:r.technicianName,portName:r.portName,install:r.install,remainingSeconds:r.status==='MODULE_ACTIVE'?Math.max(0,Math.ceil((r.readyAtGameMs-time)/1000)):null,confirmation});

export function createModuleWorkService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasModuleWork(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const r=await tx.get(`${base}/shipMaintenance/${documentId(input.mandateId)}`);requireThat(r?.moduleMandateVersion===1,'FORBIDDEN');
   const ship=await tx.get(`${base}/ships/${r.shipId}`),lot=await tx.get(`${base}/inventory/${r.lotId}`),tech=await inventoryParty(tx,s.id,r.technicianId),owner=await inventoryParty(tx,s.id,r.ownerId);
   requireThat(admin||c.id===r.ownerId&&version===r.ownerVersion&&ship?.ownerId===c.id||c.id===r.technicianId&&version===r.technicianVersion,'FORBIDDEN');
   const starting=['prepareModuleWorkStart','startModuleWork'].includes(action),cancel=action.startsWith('cancel');
   if(starting)requireThat(c.id===r.technicianId&&version===r.technicianVersion&&tech.active&&owner.active&&owner.version===r.ownerVersion&&ship?.ownerId===r.ownerId&&c.hp>0&&!c.outOfCombat&&!c.survival?.dead&&owner.c.hp>0&&!owner.c.outOfCombat&&!owner.c.survival?.dead,'FORBIDDEN');
   requireThat(r.moduleWorkVersion===undefined||r.moduleWorkVersion===1,'MODULE_WORK_CLOSED');
   const stored=tech.c?await tx.get(actionPointPath(s.id,r.technicianId)):null,points=tech.c?actionPointState(s,tech.c,stored,at):null;
   const confirmation=hash(JSON.stringify([s.id,s.revision,r,ship?.revision,lot?.revision,points,version??null]));
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   const write=(next,reason)=>{authorizeSpaceOutlaws(tx,s,'MODULE_WORK');tx.set(`${base}/shipMaintenance/${r.id}`,next);tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:r.id,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});const result={id:r.id,status:next.status,...(next.status==='MODULE_ACTIVE'?{readyAtGameMs:next.readyAtGameMs}:{})};tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(starting){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(r.status==='MODULE_APPROVED'&&r.moduleWorkVersion===undefined,'MODULE_WORK_CLOSED');
    let b;try{b=await moduleMandateBinding(tx,s,r,at);}catch(e){if(e instanceof DomainError)requireThat(false,'MODULE_MANDATE_STALE');throw e;}
    requireThat(isDeepStrictEqual(b,r.binding),'MODULE_MANDATE_STALE');
    const reserved=reserveActionPoints(points,1),result={...view(s,r,time,confirmation),before:points,after:reserved,install:b.install};
    if(action==='prepareModuleWorkStart')return result;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true&&input.workshopConfirmed===true,'FIELD_PRESENCE_REQUIRED');
    tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:r.id,revision:ship.revision+1});
    const nextLot={...lot,status:'FIELD_RESERVED',fieldActionId:r.id,revision:lot.revision+1};tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:r.id,before:lotState(lot),after:lotState(nextLot)});
    tx.set(`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:r.id});tx.set(actionPointPath(s.id,tech.c.id),reserved);
    return write({...r,moduleWorkVersion:1,status:'MODULE_ACTIVE',install:b.install,startedAtGameMs:time,readyAtGameMs:time+b.install.seconds*1000,revision:r.revision+1},'Démarrage personnel, module et 1 PA réservés ; montage non finalisé');
   }
   requireThat(r.status==='MODULE_ACTIVE'&&r.moduleWorkVersion===1,'MODULE_WORK_CLOSED');
   requireThat(ship?.maintenanceId===r.id&&lot?.status==='FIELD_RESERVED'&&lot.fieldActionId===r.id&&tech.c?.activeMaintenanceId===r.id&&points?.reserved>=1,'MODULE_WORK_RESERVATION');
   if(!cancel)return {...view(s,r,time,confirmation),reservedActionPoints:1,canCancel:!s.safetyStop?.active};
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(input.confirmation===confirmation,'STALE_REVISION');const reason=admissionText(input.reason,500,true),released=releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,tech.c));
   tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:null,revision:ship.revision+1});
   const nextLot={...lot,status:'AVAILABLE',fieldActionId:null,revision:lot.revision+1};tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:r.id,reason,before:lotState(lot),after:lotState(nextLot)});
   tx.set(`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:null});tx.set(actionPointPath(s.id,tech.c.id),released);
   return write({...r,status:'MODULE_CANCELLED',closedAt:at,revision:r.revision+1},reason);
  });
 };
}
