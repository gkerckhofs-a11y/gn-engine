import {activeModuleOutages} from './space-module-flight.mjs';
import {DomainError,documentId,requireThat} from './validation.mjs';
import {isDeepStrictEqual} from 'node:util';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash,personalLot} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {navigationSkill} from './space-outlaws-navigation-state.mjs';
import {playableShipModuleQuote,standardShipModuleQuote} from '../shared/space-ship-modules.mjs';
import {hasHiddenCargo,concealedIn} from './space-hidden-cargo.mjs';
import {warehouseStock} from './storage-state.mjs';
import {spaceShipProfiles} from '../shared/space-outlaws-navigation.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

const offerFields=['moduleOperation','shipId','lotId','technicianId','present','workshopConfirmed','source','reason'];
const fields={moduleMandates:[],moduleMandatesAdmin:[],prepareModuleMandateOffer:offerFields,offerModuleMandate:[...offerFields,'confirmation'],prepareModuleMandateApproval:['mandateId'],approveModuleMandate:['mandateId','confirmation','present'],declineModuleMandate:['mandateId','confirmation','reason'],cancelModuleMandate:['mandateId','confirmation','reason'],cancelModuleMandateAdmin:['mandateId','confirmation','reason']};
export const moduleMandateActions=Object.keys(fields);
const reads=new Set(['moduleMandates','moduleMandatesAdmin','prepareModuleMandateOffer','prepareModuleMandateApproval']);
const admins=new Set(['moduleMandatesAdmin','prepareModuleMandateOffer','offerModuleMandate','cancelModuleMandateAdmin']);
const open=r=>['MODULE_OFFERED','MODULE_APPROVED'].includes(r.status);
export const hasModuleMandates=s=>s.spaceOutlaws?.moduleMandatesVersion===1&&s.spaceOutlaws.modulePurchasesVersion===1&&s.spaceOutlaws.navigationVersion===1&&s.spaceOutlaws.logisticsVersion===1;
export const hasModuleRemoval=s=>s.spaceOutlaws?.moduleRemovalVersion===1&&s.spaceOutlaws.moduleInstallationVersion===1&&s.spaceOutlaws.moduleWorkVersion===1&&hasModuleMandates(s);
export const installedModuleLot=(ship,lot)=>ship?.moduleInstallationVersion===1&&lot?.ownerId===ship.ownerId&&lot.quantity===1&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.holderId===ship.id&&lot.location?.kind==='SHIP_MODULE'&&lot.location.id===ship.id&&ship.modules?.filter(m=>m.lotId===lot.id&&m.code===lot.item?.shipModule?.code&&m.size===lot.item?.shipModule?.size&&m.status==='OPERATIONAL').length===1;
const fit=(c,time)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeVoyageId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&!(c.convalescentUntilGameMs>time);
const free=ship=>ship?.enabled&&ship.soProfile&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId&&!ship.ambushId&&!ship.convoy&&!ship.convoyOffer;
const local=(s,c,ship)=>(c.spacePortId??s.transportRules?.homePort)===ship.portId;
const proof=(s,r,version)=>hash(JSON.stringify([s.id,s.revision,r,version??null]));
// Removal-only component: this never makes MOD-04 purchasable or installable.
const removalQuote=(s,calibration)=>calibration?.code==='MOD-04'&&hasHiddenCargo(s)?standardShipModuleQuote(calibration):playableShipModuleQuote(calibration);
const view=(s,r,version,valid)=>({...((r.moduleOperation==='REMOVE')?{moduleOperation:'REMOVE'}:{}),id:r.id,status:r.status,shipId:r.shipId,shipName:r.shipName,lotId:r.lotId,module:r.module,ownerId:r.ownerId,ownerName:r.ownerName,technicianId:r.technicianId,technicianName:r.technicianName,portName:r.portName,install:r.install,valid,confirmation:proof(s,r,version)});

export async function moduleMandateBinding(tx,s,input,at){
  const removing=input.moduleOperation==='REMOVE';if(removing)requireThat(hasModuleRemoval(s),'SO_GAMEPLAY_NOT_OPEN');
  const base=`sessions/${s.id}`,time=gameTime(s.clock,at),ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);
  requireThat(free(ship)&&activeModuleOutages(ship,time).length===0,'SPACE_SHIP_BUSY');
  const owner=await inventoryParty(tx,s.id,ship.ownerId),tech=await inventoryParty(tx,s.id,documentId(input.technicianId));
  requireThat(owner.active&&fit(owner.c,time)&&local(s,owner.c,ship),'INVALID_MODULE_OWNER');
  const port=await tx.get(`${base}/ports/${ship.portId}`);requireThat(port?.versionId===s.versionId,'SHIP_NOT_LOCAL');
  const lot=await tx.get(`${base}/inventory/${documentId(input.lotId)}`),q=(removing?removalQuote(s,lot?.item?.shipModule):playableShipModuleQuote(lot?.item?.shipModule)),profile=spaceShipProfiles.find(p=>p.id===ship.soProfile.id);
  requireThat(q&&profile&&profile.size===q.size&&Array.isArray(ship.modules)&&(removing?ship.modules.length<=profile.moduleSlots&&installedModuleLot(ship,lot):ship.modules.length<profile.moduleSlots&&!ship.modules.some(m=>m.code===q.code)),'INVALID_MODULE_CALIBRATION');
  requireThat(lot.item.kind==='INDIVIDUAL'&&!lot.item.consumable&&(removing?installedModuleLot(ship,lot)&&lot.status==='INSTALLED':personalLot(lot,ship.ownerId)&&lot.status==='AVAILABLE')&&!lot.fieldActionId&&!lot.cargoTransferId&&lot.quantity===1&&lot.transferable===true&&lot.resellable===true&&!lot.transportContractId,'MODULE_LOT_UNAVAILABLE');
  requireThat(tech.active&&fit(tech.c,time)&&local(s,tech.c,ship)&&navigationSkill(tech.c,'MEC-03')>=(removing?q.remove:q.install).level,'MODULE_TECH_REQUIRED');
  requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(l=>l.kind==='HOLD'&&l.id===ship.id)),'CARGO_TRANSFERS_OPEN');
  if(q.code==='MOD-04')requireThat(!(await warehouseStock(tx,s.id,ship.id,'HOLD')).some(l=>concealedIn(l,ship.id)),'MODULE_CONTENT_NOT_EMPTY');
  return {...(removing?{moduleOperation:'REMOVE',moduleRemovalVersion:1}:{}),...(q.code==='MOD-04'?{hiddenCargoVersion:1}:{}),shipId:ship.id,shipName:ship.name,shipRevision:ship.revision,ownerId:owner.c.id,ownerVersion:owner.version,ownerName:owner.c.public.displayName,technicianId:tech.c.id,technicianVersion:tech.version,technicianName:tech.c.public.displayName,lotId:lot.id,lotRevision:lot.revision,module:{code:q.code,size:q.size,label:q.label},portId:port.id,portName:port.name,install:removing?q.remove:q.install};
 }

export function createModuleMandateService({store,signed,checkSession,now,uuid}){
 async function current(tx,s,r){
  try{return isDeepStrictEqual(await moduleMandateBinding(tx,s,r,now()),r.binding);}
  catch(e){if(e instanceof DomainError)return false;throw e;}
 }
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`;
   requireThat(hasModuleMandates(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const rights=async r=>{if(admin)return true;const ship=await tx.get(`${base}/ships/${r.shipId}`);return c.id===r.ownerId&&version===r.ownerVersion&&ship?.ownerId===c.id||c.id===r.technicianId&&version===r.technicianVersion;};
   if(['prepareModuleMandateOffer','offerModuleMandate'].includes(action)){requireThat(input.moduleOperation===undefined||['INSTALL','REMOVE'].includes(input.moduleOperation),'INVALID_ADMISSION');if(input.moduleOperation==='REMOVE')requireThat(hasModuleRemoval(s),'SO_GAMEPLAY_NOT_OPEN');}
   if(['moduleMandates','moduleMandatesAdmin'].includes(action)){
    const jobs=[];for(const r of await tx.list(`${base}/shipMaintenance`))if(r.moduleMandateVersion===1&&await rights(r))jobs.push({...view(s,r,version,open(r)&&await current(tx,s,r)),owner:c?.id===r.ownerId,canCancel:open(r),technician:c?.id===r.technicianId,workEnabled:s.spaceOutlaws.moduleWorkVersion===1,working:r.status==='MODULE_ACTIVE'&&r.moduleWorkVersion===1,remainingSeconds:r.status==='MODULE_ACTIVE'?Math.max(0,Math.ceil((r.readyAtGameMs-gameTime(s.clock,at))/1000)):null});
    if(!admin)return {session:{id:s.id,stage:s.stage,safetyStopped:!!s.safetyStop?.active},admin:false,jobs};
    const ships=(await tx.list(`${base}/ships`)).filter(free).map(sh=>({id:sh.id,name:sh.name,ownerId:sh.ownerId})),lots=(await tx.list(`${base}/inventory`)).filter(l=>l.item?.shipModule&&l.quantity===1&&(l.status==='AVAILABLE'&&personalLot(l,l.ownerId)&&playableShipModuleQuote(l.item.shipModule)||hasModuleRemoval(s)&&l.status==='INSTALLED'&&l.location?.kind==='SHIP_MODULE'&&removalQuote(s,l.item.shipModule))).map(l=>({id:l.id,name:l.item.name,ownerId:l.ownerId,code:l.item.shipModule.code,size:l.item.shipModule.size,mounted:l.status==='INSTALLED',shipId:l.status==='INSTALLED'?l.location.id:null})),characters=(await tx.list(`${base}/characters`)).filter(ch=>ch.birth).map(ch=>({id:ch.id,name:ch.public.displayName,level:navigationSkill(ch,'MEC-03')}));
    return {session:{id:s.id,stage:s.stage,safetyStopped:!!s.safetyStop?.active},admin:true,removalEnabled:hasModuleRemoval(s),jobs,ships,lots,characters};
   }
   let r=null;
   if(!['prepareModuleMandateOffer','offerModuleMandate'].includes(action)){r=await tx.get(`${base}/shipMaintenance/${documentId(input.mandateId)}`);requireThat(r?.moduleMandateVersion===1&&await rights(r),'FORBIDDEN');if(r.module?.code==='MOD-04')requireThat(hasHiddenCargo(s)&&r.hiddenCargoVersion===1&&r.moduleOperation==='REMOVE','SO_GAMEPLAY_NOT_OPEN');if(r.moduleOperation==='REMOVE')requireThat(hasModuleRemoval(s)&&r.moduleRemovalVersion===1,'SO_GAMEPLAY_NOT_OPEN');}
   if(action==='approveModuleMandate'){
    requireThat(c.id===r.ownerId,'FORBIDDEN');requireThat(open(r)&&await current(tx,s,r),'MODULE_MANDATE_STALE');
   }
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
   const write=(record,reason)=>{authorizeSpaceOutlaws(tx,s,'MODULE_MANDATES');tx.set(`${base}/shipMaintenance/${record.id}`,record);tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,mandateId:record.id,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});const result={id:record.id,status:record.status};tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(['prepareModuleMandateOffer','offerModuleMandate'].includes(action)){
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(input.present===true&&input.workshopConfirmed===true,'FIELD_PRESENCE_REQUIRED');
    const b=await moduleMandateBinding(tx,s,input,at),source=admissionText(input.source,500,true),reason=admissionText(input.reason,500,true);
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
