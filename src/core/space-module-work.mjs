import {hasHiddenCargo} from './space-hidden-cargo.mjs';
import {isDeepStrictEqual} from 'node:util';
import {documentId,requireThat,DomainError} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash,lotState} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {hasModuleMandates,moduleMandateBinding,hasModuleRemoval,installedModuleLot} from './space-module-mandates.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,releaseActionPoints,actionPointMaximum,resolveActionPoints} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {installedShipProfile} from '../shared/space-ship-modules.mjs';
import {gameTime} from './clock.mjs';

const fields={prepareModuleRemoval:['mandateId'],finishModuleRemoval:['mandateId','confirmation','present','workshopConfirmed','performed'],prepareModuleInstallation:['mandateId'],finishModuleInstallation:['mandateId','confirmation','present','workshopConfirmed','performed'],prepareModuleWorkStart:['mandateId'],startModuleWork:['mandateId','confirmation','present','workshopConfirmed'],moduleWork:['mandateId'],moduleWorkAdmin:['mandateId'],cancelModuleWork:['mandateId','confirmation','reason'],cancelModuleWorkAdmin:['mandateId','confirmation','reason']};
export const moduleWorkActions=Object.keys(fields);
const reads=new Set(['prepareModuleRemoval','prepareModuleInstallation','prepareModuleWorkStart','moduleWork','moduleWorkAdmin']);
const admins=new Set(['moduleWorkAdmin','cancelModuleWorkAdmin']);
export const hasModuleInstallation=s=>s.spaceOutlaws?.moduleInstallationVersion===1&&hasModuleWork(s);
export const hasModuleWork=s=>s.spaceOutlaws?.moduleWorkVersion===1&&hasModuleMandates(s);
const view=(s,r,time,confirmation)=>({...((r.moduleOperation==='REMOVE')?{moduleOperation:'REMOVE'}:{}),id:r.id,status:r.status,shipName:r.shipName,lotId:r.lotId,module:r.module,ownerName:r.ownerName,technicianName:r.technicianName,portName:r.portName,install:r.install,remainingSeconds:r.status==='MODULE_ACTIVE'?Math.max(0,Math.ceil((r.readyAtGameMs-time)/1000)):null,confirmation});

export function createModuleWorkService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasModuleWork(s),'SO_GAMEPLAY_NOT_OPEN');const finishing=['prepareModuleInstallation','finishModuleInstallation','prepareModuleRemoval','finishModuleRemoval'].includes(action);if(finishing)requireThat(hasModuleInstallation(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const r=await tx.get(`${base}/shipMaintenance/${documentId(input.mandateId)}`);requireThat(r?.moduleMandateVersion===1,'FORBIDDEN');if(r.module?.code==='MOD-04')requireThat(hasHiddenCargo(s)&&r.hiddenCargoVersion===1&&r.moduleOperation==='REMOVE','SO_GAMEPLAY_NOT_OPEN');const removing=r.moduleOperation==='REMOVE';if(removing)requireThat(hasModuleRemoval(s)&&r.moduleRemovalVersion===1,'SO_GAMEPLAY_NOT_OPEN');if(finishing)requireThat(removing===['prepareModuleRemoval','finishModuleRemoval'].includes(action),'MODULE_WORK_CLOSED');
   const ship=await tx.get(`${base}/ships/${r.shipId}`),lot=await tx.get(`${base}/inventory/${r.lotId}`),tech=await inventoryParty(tx,s.id,r.technicianId),owner=await inventoryParty(tx,s.id,r.ownerId);
   requireThat(admin||c.id===r.ownerId&&version===r.ownerVersion&&ship?.ownerId===c.id||c.id===r.technicianId&&version===r.technicianVersion,'FORBIDDEN');
   const starting=['prepareModuleWorkStart','startModuleWork'].includes(action),cancel=action.startsWith('cancel');
   if(starting||finishing)requireThat(c.id===r.technicianId&&version===r.technicianVersion&&tech.active&&owner.active&&owner.version===r.ownerVersion&&ship?.ownerId===r.ownerId&&c.hp>0&&!c.outOfCombat&&!c.survival?.dead&&owner.c.hp>0&&!owner.c.outOfCombat&&!owner.c.survival?.dead,'FORBIDDEN');
   requireThat(r.moduleWorkVersion===undefined||r.moduleWorkVersion===1,'MODULE_WORK_CLOSED');
   if(finishing)requireThat(navigationSkill(c,'MEC-03')>=r.install.level,'MODULE_TECH_REQUIRED');
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
   if(finishing){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(time>=r.readyAtGameMs,'MODULE_WORK_NOT_READY');
    requireThat(ship.revision===r.binding.shipRevision+1&&lot.revision===r.binding.lotRevision+1,'MODULE_MANDATE_STALE');
    // Reuse the full consent validator, removing only this job's proven reservations.
    const normalized=new Map([[`${base}/ships/${ship.id}`,{...ship,maintenanceId:null,revision:r.binding.shipRevision}],[`${base}/inventory/${lot.id}`,{...lot,status:removing?'INSTALLED':'AVAILABLE',fieldActionId:null,revision:r.binding.lotRevision}],[`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:null}]]);
    const reader={get:path=>normalized.has(path)?Promise.resolve(normalized.get(path)):tx.get(path),list:(...args)=>tx.list(...args)};
    let b;try{b=await moduleMandateBinding(reader,s,r,at);}catch(e){if(e instanceof DomainError)requireThat(false,'MODULE_MANDATE_STALE');throw e;}
    requireThat(isDeepStrictEqual(b,r.binding),'MODULE_MANDATE_STALE');
    const modules=removing?ship.modules.filter(m=>m.lotId!==lot.id):[...ship.modules,{lotId:lot.id,code:r.module.code,size:r.module.size,status:'OPERATIONAL',installationId:r.id}],profile=installedShipProfile(ship.soProfile,modules);
    requireThat(profile,'INVALID_MODULE_CALIBRATION');
    const result={...view(s,r,time,confirmation),beforeProfile:ship.soProfile,afterProfile:profile,hull:ship.hull,shield:ship.shield,afterHull:removing?Math.min(ship.hull,profile.hullMax):ship.hull,afterShield:removing?Math.min(ship.shield,profile.shieldMax):ship.shield};
    if(['prepareModuleInstallation','prepareModuleRemoval'].includes(action))return result;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true&&input.workshopConfirmed===true&&input.performed===true,'FIELD_PRESENCE_REQUIRED');
    tx.set(`${base}/ships/${ship.id}`,{...ship,hull:result.afterHull,shield:result.afterShield,modules,soProfile:profile,moduleInstallationVersion:1,maintenanceId:null,revision:ship.revision+1});
    const nextLot={...lot,status:removing?'AVAILABLE':'INSTALLED',fieldActionId:null,holderId:removing?r.ownerId:ship.id,location:removing?{kind:'CHARACTER',id:r.ownerId}:{kind:'SHIP_MODULE',id:ship.id},revision:lot.revision+1};
    tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:r.id,shipId:ship.id,before:lotState(lot),after:lotState(nextLot)});
    tx.set(`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:null});tx.set(actionPointPath(s.id,tech.c.id),resolveActionPoints(points,1));
    return write({...r,status:removing?'MODULE_REMOVED':'MODULE_INSTALLED',moduleInstallationVersion:1,closedAt:at,revision:r.revision+1},removing?'Retrait personnel confirmé ; même module au propriétaire, 1 PA consommé, maximums réduits sans restitution de points':'Montage personnel confirmé à quai ; 1 PA consommé, points de Coque/Bouclier inchangés');
   }
   if(removing)requireThat(installedModuleLot(ship,lot),'MODULE_WORK_RESERVATION');
   if(!cancel)return {...view(s,r,time,confirmation),reservedActionPoints:1,canCancel:!s.safetyStop?.active,canFinish:hasModuleInstallation(s)&&c?.id===r.technicianId&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&time>=r.readyAtGameMs};
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(input.confirmation===confirmation,'STALE_REVISION');const reason=admissionText(input.reason,500,true),released=releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,tech.c));
   tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:null,revision:ship.revision+1});
   const nextLot={...lot,status:removing?'INSTALLED':'AVAILABLE',fieldActionId:null,revision:lot.revision+1};tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:r.id,reason,before:lotState(lot),after:lotState(nextLot)});
   tx.set(`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:null});tx.set(actionPointPath(s.id,tech.c.id),released);
   return write({...r,status:'MODULE_CANCELLED',closedAt:at,revision:r.revision+1},reason);
  });
 };
}
