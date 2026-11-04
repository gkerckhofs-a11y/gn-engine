import {isDeepStrictEqual} from 'node:util';
import {documentId,requireThat,DomainError} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {hasModuleFlights,activeModuleOutages} from './space-module-flight.mjs';
import {installedShipProfile} from '../shared/space-ship-modules.mjs';
import {spaceShipProfiles} from '../shared/space-outlaws-navigation.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

// Unpublished component. No finish, attachment, departure or reward capability.
export const hasTowingWork=s=>s.spaceOutlaws?.towingWorkVersion===1&&hasModuleFlights(s);
const offer=['shipId','wreckId','technicianId','present','source','reason'];
const fields={prepareTowingWork:offer,offerTowingWork:[...offer,'confirmation'],prepareTowingApproval:['workId'],approveTowingWork:['workId','confirmation','present'],towingWork:['workId'],towingWorkAdmin:['workId'],prepareTowingStart:['workId'],startTowingWork:['workId','confirmation','present'],cancelTowingWork:['workId','confirmation','reason'],cancelTowingWorkAdmin:['workId','confirmation','reason']};
export const towingWorkActions=Object.keys(fields);
const reads=new Set(['prepareTowingWork','prepareTowingApproval','towingWork','towingWorkAdmin','prepareTowingStart']);
const admins=new Set(['prepareTowingWork','offerTowingWork','towingWorkAdmin','cancelTowingWorkAdmin']);
const open=r=>['TOWING_OFFERED','TOWING_APPROVED','TOWING_ACTIVE'].includes(r.status);
const free=sh=>sh?.enabled&&sh.docked&&sh.soProfile&&!sh.journey&&!sh.operation&&!sh.combatId&&!sh.rescueId&&!sh.maintenanceId&&!sh.ambushId&&!sh.convoy&&!sh.convoyOffer;
const fit=(c,time)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeVoyageId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!(c.convalescentUntilGameMs>time);
const local=(s,c,sh)=>(c.spacePortId??s.transportRules?.homePort)===sh.portId;

async function binding(tx,s,input,at){
 const base=`sessions/${s.id}`,time=gameTime(s.clock,at),ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`),wreck=await tx.get(`${base}/ships/${documentId(input.wreckId)}`);
 requireThat(ship?.id!==wreck?.id&&free(ship)&&free(wreck),'TOWING_SHIPS_BUSY');
 const profile=spaceShipProfiles.find(p=>p.id===ship.soProfile.id),target=spaceShipProfiles.find(p=>p.id===wreck.soProfile.id);
 requireThat(profile?.size>=2&&target&&profile.size>=target.size&&ship.soProfile.size===profile.size&&wreck.soProfile.size===target.size&&ship.hull>0&&wreck.hull===0&&!ship.revisionRequired,'TOWING_INCOMPATIBLE');
 requireThat(ship.ownerType==='CHARACTER'&&wreck.ownerType==='CHARACTER','TOWING_OWNER_REQUIRED');
 requireThat(ship.portId===wreck.portId,'SHIP_NOT_LOCAL');const port=await tx.get(`${base}/ports/${ship.portId}`);requireThat(port?.versionId===s.versionId,'SHIP_NOT_LOCAL');
 const ownerIds=[...new Set([ship.ownerId,wreck.ownerId])],owners=[];
 for(const ownerId of ownerIds){const p=await inventoryParty(tx,s.id,ownerId);requireThat(p.active&&fit(p.c,time)&&local(s,p.c,ship),'TOWING_OWNER_REQUIRED');owners.push({id:ownerId,version:p.version,name:p.c.public.displayName});}
 const tech=await inventoryParty(tx,s.id,documentId(input.technicianId));requireThat(tech.active&&fit(tech.c,time)&&local(s,tech.c,ship)&&navigationSkill(tech.c,'MEC-02')>=2,'TOWING_TECH_REQUIRED');
 const modules=ship.modules??[],m=modules.find(m=>m.code==='MOD-05'),lot=m?await tx.get(`${base}/inventory/${m.lotId}`):null;
 requireThat(ship.moduleInstallationVersion===1&&m?.status==='OPERATIONAL'&&m.size===profile.size&&modules.length<=profile.moduleSlots&&new Set(modules.map(m=>m.code)).size===modules.length&&new Set(modules.map(m=>m.lotId)).size===modules.length&&installedShipProfile(ship.soProfile,modules.filter(m=>m.code!=='MOD-05'),{hiddenCargo:s.spaceOutlaws.hiddenCargoVersion===1}),'TOWING_MODULE_REQUIRED');
 requireThat(!activeModuleOutages(ship,time).some(n=>n.lotId===m.lotId),'TOWING_MODULE_UNAVAILABLE');
 requireThat(lot?.status==='INSTALLED'&&!lot.fieldActionId&&!lot.cargoTransferId&&!lot.transportContractId&&lot.item?.kind==='INDIVIDUAL'&&!lot.item.consumable&&lot.transferable===true&&lot.resellable===true&&lot.quantity===1&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.ownerId===ship.ownerId&&lot.holderId===ship.id&&lot.location?.kind==='SHIP_MODULE'&&lot.location.id===ship.id&&lot.item.shipModule?.code==='MOD-05'&&lot.item.shipModule.size===m.size,'MODULE_LOT_UNAVAILABLE');
 requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&[ship.id,wreck.id].includes(p.id))),'CARGO_TRANSFERS_OPEN');
 return {shipId:ship.id,shipName:ship.name,shipRevision:ship.revision,shipOwnerId:ship.ownerId,wreckOwnerId:wreck.ownerId,wreckId:wreck.id,wreckName:wreck.name,wreckRevision:wreck.revision,portId:port.id,portName:port.name,owners,technicianId:tech.c.id,technicianVersion:tech.version,technicianName:tech.c.public.displayName,lotId:lot.id,lotRevision:lot.revision,seconds:300,actionPoints:1,skillId:'MEC-02',level:2};
}

export function createTowingWorkService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasTowingWork(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const running=()=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
   const token=(...v)=>hash(JSON.stringify([s.id,s.revision,version??null,...v]));
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),prior=op?await tx.get(op):null;
   const replay=()=>{requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||prior.guard===version,'FORBIDDEN');return prior.result;};
   const write=(next,reason)=>{authorizeSpaceOutlaws(tx,s,'TOWING_WORK');tx.set(`${base}/shipMaintenance/${next.id}`,next);tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,workId:next.id,shipId:next.binding.shipId,wreckId:next.binding.wreckId,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});const result={id:next.id,status:next.status};tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(['prepareTowingWork','offerTowingWork'].includes(action)){
    running();requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const source=admissionText(input.source,1000,true),reason=admissionText(input.reason,500,true);
    if(prior)return replay();const b=await binding(tx,s,input,at),jobs=await tx.list(`${base}/shipMaintenance`);requireThat(!jobs.some(r=>r.towingWorkVersion===1&&open(r)&&[r.binding.shipId,r.binding.wreckId].some(x=>[b.shipId,b.wreckId].includes(x))),'TOWING_WORK_OPEN');
    const confirmation=token(b);if(action==='prepareTowingWork')return {...publicBinding(b),confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');
    return write({id,towingWorkVersion:1,status:'TOWING_OFFERED',binding:b,approvals:[],source,reason,revision:1,createdAt:at},reason);
   }
   const r=await tx.get(`${base}/shipMaintenance/${documentId(input.workId)}`);requireThat(r?.towingWorkVersion===1,'FORBIDDEN');const b=r.binding,ship=await tx.get(`${base}/ships/${b.shipId}`),wreck=await tx.get(`${base}/ships/${b.wreckId}`),tech=await inventoryParty(tx,s.id,b.technicianId);
   const owner=b.owners.find(o=>o.id===c?.id);requireThat(admin||owner&&owner.version===version&&[ship?.ownerId,wreck?.ownerId].includes(c.id)||c?.id===b.technicianId&&version===b.technicianVersion,'FORBIDDEN');
   const stored=tech.c?await tx.get(actionPointPath(s.id,b.technicianId)):null,points=tech.c?actionPointState(s,tech.c,stored,at):null,confirmation=token(r,ship,wreck,points),view={id:r.id,status:r.status,...publicBinding(b),approvals:r.approvals,remainingSeconds:r.status==='TOWING_ACTIVE'?Math.max(0,Math.ceil((r.readyAtGameMs-time)/1000)):null,confirmation,canFinish:false};
   if(['towingWork','towingWorkAdmin'].includes(action))return view;
   if(action.startsWith('cancel')){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');if(prior)return replay();requireThat(open(r),'TOWING_WORK_CLOSED');requireThat(input.confirmation===confirmation,'STALE_REVISION');const reason=admissionText(input.reason,500,true);
    if(r.status==='TOWING_ACTIVE'){
     requireThat(ship?.maintenanceId===r.id&&wreck?.maintenanceId===r.id&&tech.c?.activeMaintenanceId===r.id&&points?.reserved>=1,'TOWING_RESERVATION');
     tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:null,revision:ship.revision+1});tx.set(`${base}/ships/${wreck.id}`,{...wreck,maintenanceId:null,revision:wreck.revision+1});tx.set(`${base}/characters/${tech.c.id}`,{...tech.c,activeMaintenanceId:null});tx.set(actionPointPath(s.id,tech.c.id),releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,tech.c)));
    }
    return write({...r,status:'TOWING_CANCELLED',revision:r.revision+1,closedAt:at},reason);
   }
   running();requireThat(ship?.ownerId===b.shipOwnerId&&wreck?.ownerId===b.wreckOwnerId,'TOWING_WORK_STALE');
   for(const o of b.owners){const p=await inventoryParty(tx,s.id,o.id);requireThat(p.active&&p.version===o.version,'TOWING_WORK_STALE');}
   if(['prepareTowingStart','startTowingWork'].includes(action))requireThat(c.id===b.technicianId&&tech.active&&version===b.technicianVersion&&navigationSkill(c,'MEC-02')>=2,'TOWING_TECH_REQUIRED');else requireThat(owner&&owner.version===version,'FORBIDDEN');
   if(prior)return replay();requireThat(['TOWING_OFFERED','TOWING_APPROVED'].includes(r.status),'TOWING_WORK_CLOSED');let current;
   try{current=await binding(tx,s,b,at);}catch(e){if(e instanceof DomainError)requireThat(false,'TOWING_WORK_STALE');throw e;}requireThat(isDeepStrictEqual(current,b),'TOWING_WORK_STALE');
   if(['prepareTowingApproval','approveTowingWork'].includes(action)){
    requireThat(!r.approvals.includes(c.id),'TOWING_ALREADY_APPROVED');if(action==='prepareTowingApproval')return view;requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const approvals=[...r.approvals,c.id];return write({...r,approvals,status:b.owners.every(o=>approvals.includes(o.id))?'TOWING_APPROVED':'TOWING_OFFERED',revision:r.revision+1},'Accord personnel du propriétaire ; aucun attelage créé');
   }
   requireThat(r.status==='TOWING_APPROVED'&&b.owners.every(o=>r.approvals.includes(o.id)),'TOWING_OWNER_APPROVAL_REQUIRED');const reserved=reserveActionPoints(points,1);if(action==='prepareTowingStart')return {...view,before:points,after:reserved};
   requireThat(action==='startTowingWork','TOWING_WORK_CLOSED');requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
   tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:r.id,revision:ship.revision+1});tx.set(`${base}/ships/${wreck.id}`,{...wreck,maintenanceId:r.id,revision:wreck.revision+1});tx.set(`${base}/characters/${c.id}`,{...c,activeMaintenanceId:r.id});tx.set(actionPointPath(s.id,c.id),reserved);
   return write({...r,status:'TOWING_ACTIVE',startedAtGameMs:time,readyAtGameMs:time+300000,revision:r.revision+1},'Travail MEC-02 N2 démarré ; deux vaisseaux et 1 PA réservés, aucun attelage finalisé');
  });
 };
}
const publicBinding=b=>({shipId:b.shipId,shipName:b.shipName,wreckId:b.wreckId,wreckName:b.wreckName,portName:b.portName,owners:b.owners.map(o=>({id:o.id,name:o.name})),technicianId:b.technicianId,technicianName:b.technicianName,seconds:b.seconds,actionPoints:b.actionPoints,skillId:b.skillId,level:b.level});
