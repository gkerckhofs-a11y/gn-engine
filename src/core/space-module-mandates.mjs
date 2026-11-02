import {DomainError,documentId,requireThat} from './validation.mjs';
import {isDeepStrictEqual} from 'node:util';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash,personalLot} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {standardShipModuleQuote} from '../shared/space-ship-modules.mjs';
import {spaceShipProfiles} from '../shared/space-outlaws-navigation.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

const offerFields=['shipId','lotId','technicianId','present','workshopConfirmed','source','reason'];
const fields={moduleMandates:[],moduleMandatesAdmin:[],prepareModuleMandateOffer:offerFields,offerModuleMandate:[...offerFields,'confirmation'],prepareModuleMandateApproval:['mandateId'],approveModuleMandate:['mandateId','confirmation','present'],declineModuleMandate:['mandateId','confirmation','reason'],cancelModuleMandate:['mandateId','confirmation','reason'],cancelModuleMandateAdmin:['mandateId','confirmation','reason']};
export const moduleMandateActions=Object.keys(fields);
const reads=new Set(['moduleMandates','moduleMandatesAdmin','prepareModuleMandateOffer','prepareModuleMandateApproval']);
const admins=new Set(['moduleMandatesAdmin','prepareModuleMandateOffer','offerModuleMandate','cancelModuleMandateAdmin']);
const open=r=>['MODULE_OFFERED','MODULE_APPROVED'].includes(r.status);
export const hasModuleMandates=s=>s.spaceOutlaws?.moduleMandatesVersion===1&&s.spaceOutlaws.modulePurchasesVersion===1&&s.spaceOutlaws.navigationVersion===1&&s.spaceOutlaws.logisticsVersion===1;
const fit=(c,time)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeVoyageId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!(c.convalescentUntilGameMs>time);
const free=ship=>ship?.enabled&&ship.soProfile&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId&&!ship.ambushId&&!ship.convoy&&!ship.convoyOffer;
const local=(s,c,ship)=>(c.spacePortId??s.transportRules?.homePort)===ship.portId;
const proof=(s,r,version)=>hash(JSON.stringify([s.id,s.revision,r,version??null]));
const view=(s,r,version,valid)=>({id:r.id,status:r.status,shipId:r.shipId,shipName:r.shipName,lotId:r.lotId,module:r.module,ownerId:r.ownerId,ownerName:r.ownerName,technicianId:r.technicianId,technicianName:r.technicianName,portName:r.portName,install:r.install,valid,confirmation:proof(s,r,version)});

export function createModuleMandateService({store,signed,checkSession,now,uuid}){
 async function binding(tx,s,input){
  const base=`sessions/${s.id}`,time=gameTime(s.clock,now()),ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);
  requireThat(free(ship),'SPACE_SHIP_BUSY');
  const owner=await inventoryParty(tx,s.id,ship.ownerId),tech=await inventoryParty(tx,s.id,documentId(input.technicianId));
  requireThat(owner.active&&fit(owner.c,time)&&local(s,owner.c,ship),'INVALID_MODULE_OWNER');
  const port=await tx.get(`${base}/ports/${ship.portId}`);requireThat(port?.versionId===s.versionId,'SHIP_NOT_LOCAL');
  const lot=await tx.get(`${base}/inventory/${documentId(input.lotId)}`),q=standardShipModuleQuote(lot?.item?.shipModule),profile=spaceShipProfiles.find(p=>p.id===ship.soProfile.id);
  requireThat(q&&profile&&profile.size===q.size&&Array.isArray(ship.modules)&&ship.modules.length<profile.moduleSlots&&!ship.modules.some(m=>m.code===q.code),'INVALID_MODULE_CALIBRATION');
  requireThat(lot.item.kind==='INDIVIDUAL'&&!lot.item.consumable&&personalLot(lot,ship.ownerId)&&lot.status==='AVAILABLE'&&lot.quantity===1&&lot.transferable===true&&lot.resellable===true&&!lot.transportContractId,'MODULE_LOT_UNAVAILABLE');
  requireThat(tech.active&&fit(tech.c,time)&&local(s,tech.c,ship)&&navigationSkill(tech.c,'MEC-03')>=q.install.level,'MODULE_TECH_REQUIRED');
  requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
  return {shipId:ship.id,shipName:ship.name,shipRevision:ship.revision,ownerId:owner.c.id,ownerVersion:owner.version,ownerName:owner.c.public.displayName,technicianId:tech.c.id,technicianVersion:tech.version,technicianName:tech.c.public.displayName,lotId:lot.id,lotRevision:lot.revision,module:{code:q.code,size:q.size,label:q.label},portId:port.id,portName:port.name,install:q.install};
 }
 async function current(tx,s,r){
  try{return isDeepStrictEqual(await binding(tx,s,r),r.binding);}
  catch(e){if(e instanceof DomainError)return false;throw e;}
 }
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
   requireThat(hasModuleMandates(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const rights=async r=>{if(admin)return true;const ship=await tx.get(`${base}/ships/${r.shipId}`);return c.id===r.ownerId&&version===r.ownerVersion&&ship?.ownerId===c.id||c.id===r.technicianId&&version===r.technicianVersion;};
   if(['moduleMandates','moduleMandatesAdmin'].includes(action)){
    const jobs=[];for(const r of await tx.list(`${base}/shipMaintenance`))if(r.moduleMandateVersion===1&&await rights(r))jobs.push({...view(s,r,version,open(r)&&await current(tx,s,r)),owner:c?.id===r.ownerId,canCancel:open(r)});
    if(!admin)return {session:{id:s.id,stage:s.stage,safetyStopped:!!s.safetyStop?.active},admin:false,jobs};
    const ships=(await tx.list(`${base}/ships`)).filter(free).map(sh=>({id:sh.id,name:sh.name,ownerId:sh.ownerId})),lots=(await tx.list(`${base}/inventory`)).filter(l=>l.item?.shipModule&&l.status==='AVAILABLE'&&l.quantity===1&&personalLot(l,l.ownerId)).map(l=>({id:l.id,name:l.item.name,ownerId:l.ownerId,code:l.item.shipModule.code,size:l.item.shipModule.size})),characters=(await tx.list(`${base}/characters`)).filter(ch=>ch.birth).map(ch=>({id:ch.id,name:ch.public.displayName,level:navigationSkill(ch,'MEC-03')}));
    return {session:{id:s.id,stage:s.stage,safetyStopped:!!s.safetyStop?.active},admin:true,jobs,ships,lots,characters};
   }
   let r=null;
   if(input.mandateId){r=await tx.get(`${base}/shipMaintenance/${documentId(input.mandateId)}`);requireThat(r?.moduleMandateVersion===1&&await rights(r),'FORBIDDEN');}
   if(action==='approveModuleMandate'){
    requireThat(c.id===r.ownerId,'FORBIDDEN');requireThat(open(r)&&await current(tx,s,r),'MODULE_MANDATE_STALE');
   }
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
   const write=(record,reason)=>{authorizeSpaceOutlaws(tx,s,'MODULE_MANDATES');tx.set(`${base}/shipMaintenance/${record.id}`,record);tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:record.id,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});const result={id:record.id,status:record.status};tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(['prepareModuleMandateOffer','offerModuleMandate'].includes(action)){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(input.present===true&&input.workshopConfirmed===true,'FIELD_PRESENCE_REQUIRED');
    const b=await binding(tx,s,input),source=admissionText(input.source,500,true),reason=admissionText(input.reason,500,true);
    requireThat(!(await tx.list(`${base}/shipMaintenance`)).some(x=>x.moduleMandateVersion===1&&open(x)&&(x.shipId===b.shipId||x.lotId===b.lotId)),'MODULE_MANDATE_OPEN');
    const confirmation=hash(JSON.stringify([s.id,s.revision,actor.uid,b,source,reason]));if(action==='prepareModuleMandateOffer')return {...b,confirmation};
    requireThat(input.confirmation===confirmation,'STALE_REVISION');return write({id,moduleMandateVersion:1,...b,binding:b,source,reason,status:'MODULE_OFFERED',revision:1,createdAt:at},reason);
   }
   requireThat(open(r),'MODULE_MANDATE_CLOSED');
   if(['prepareModuleMandateApproval','approveModuleMandate'].includes(action)){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(c.id===r.ownerId&&r.status==='MODULE_OFFERED','FORBIDDEN');requireThat(await current(tx,s,r),'MODULE_MANDATE_STALE');
    const confirmation=proof(s,r,version);if(action==='prepareModuleMandateApproval')return view(s,r,version,true);
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');return write({...r,status:'MODULE_APPROVED',approvedAt:at,revision:r.revision+1},'Accord personnel pour ce module, vaisseau et Mécano ; aucun travail commencé');
   }
   requireThat(input.confirmation===proof(s,r,version),'STALE_REVISION');const reason=admissionText(input.reason,500,true);
   if(action==='declineModuleMandate')requireThat(c.id===r.ownerId&&r.status==='MODULE_OFFERED','FORBIDDEN');
   return write({...r,status:action==='declineModuleMandate'?'MODULE_DECLINED':'MODULE_CANCELLED',closedAt:at,revision:r.revision+1},reason);
  });
 };
}
