import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash,itemQuantity} from './inventory-state.mjs';
import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {gameTime} from './clock.mjs';
import {dockEntry,dockMandates,dockLeaseActive} from './dock-state.mjs';
import {warehouseStock,stockVolume,incomingVolume,storageGroups} from './storage-state.mjs';
import {shipAccess} from './navigation-state.mjs';
import {crewCargoGrant} from './ship-crew-state.mjs';
import {reserveCargoBatch,finishCargoBatch} from './cargo-batches.mjs';
import {personalTransferActorReady} from './personal-transfer-policy.mjs';
import {planetCommerceSession} from './planet-market-state.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {recordDockAlarm,dockAlerts} from './dock-alarms.mjs';

export const dockTheftActions=new Set(['prepareDockTheft','startDockTheft','dockTheft','myDockThefts','dockTheftsAdmin','resolveDockTheft','resolveDockTheftAdmin','cancelDockTheft','cancelDockTheftAdmin','confirmDockTheftPhysical','myDockAlerts']);
const writes=new Set(['startDockTheft','resolveDockTheft','resolveDockTheftAdmin','cancelDockTheft','cancelDockTheftAdmin','confirmDockTheftPhysical']);
const adminActions=new Set(['dockTheftsAdmin','resolveDockTheftAdmin','cancelDockTheftAdmin','confirmDockTheftPhysical']);
const running=t=>['RUNNING','HANDOVER'].includes(t.status);
const b=s=>`sessions/${s.id}`,path=(s,id)=>`${b(s)}/dockThefts/${id}`;
const location=v=>{requireThat(v&&['WAREHOUSE','HOLD'].includes(v.kind),'DOCK_THEFT_DESTINATION');admissionKeys(v,['kind','id']);return {kind:v.kind,id:documentId(v.id)};};
const eligible=l=>l&&l.quantity>0&&l.item?.usage==='COMMERCIAL'&&l.origin?.kind!=='SO_BIRTH'&&(l.transferable??l.item.transferable)!==false&&!l.transportContractId&&!l.boardingCustody&&!l.customsDetention&&!l.hiddenCargo?.concealed&&!l.fieldActionId;
const projection=(t,time)=>({id:t.id,status:t.status,warehouseId:t.warehouseId,warehouseName:t.warehouseName,name:t.visibleName??'Lot de stockage',quantity:t.quantity,volume:t.volume,destination:t.destination,destinationName:t.destinationName,physical:t.physical,remainingMs:running(t)?Math.max(0,t.readyAtGameMs-time):0,reason:t.failureReason??null});
async function readyActor(tx,s,c,at,ownId=null){
 const time=gameTime(s.clock,at);return c&&c.hp>0&&!c.survival?.dead&&!c.outOfCombat&&!c.activePersonActionId&&!c.activeAidId&&!c.activeCargoId&&!c.activeNavigationId&&!c.activeVoyageId&&!c.activeMaintenanceId&&(!c.activeFieldActionId||c.activeFieldActionId===ownId)&&!(c.convalescentUntilGameMs>time)&&await personalTransferActorReady(tx,planetCommerceSession(s,c.spacePortId??s.transportRules?.homePort),{...c,activeFieldActionId:null});
}
async function destination(tx,ctx,loc,portId,at,ownTransferId=null){
 loc=location(loc);const {s,c}=ctx,collection=loc.kind==='HOLD'?'ships':'warehouses',record=await tx.get(`${b(s)}/${collection}/${loc.id}`);requireThat(record&&record.enabled,'DOCK_THEFT_DESTINATION');requireThat(record.portId===portId,'DOCK_NOT_LOCAL');
 if(loc.kind==='WAREHOUSE'){
  requireThat(record.commercialStorage&&record.dock?.schemaVersion===1&&dockLeaseActive(record,gameTime(s.clock,at)),'DOCK_THEFT_DESTINATION');const p=await dockMandates(tx,s,c,record);requireThat(p.deposit,'FORBIDDEN');
 }else{
  requireThat(record.soProfile&&record.docked&&!record.journey&&!record.operation&&!record.combatId&&!record.rescueId&&!record.maintenanceId&&record.capacity>0,'DOCK_THEFT_DESTINATION');
  const groups=storageGroups(s,await tx.list(`${b(s)}/groups`),c.id),p=shipAccess(record,c.id,groups),crew=await crewCargoGrant(tx,s,record,c,at);requireThat(p.deposit||crew.logistics,'FORBIDDEN');
 }
 const used=stockVolume(await warehouseStock(tx,s.id,record.id,loc.kind)),incoming=await incomingVolume(tx,s.id,record.id,loc.kind),own=ownTransferId?await tx.get(`${b(s)}/cargoTransfers/${ownTransferId}`):null;
 return {location:loc,record,collection,used,incoming,ownVolume:own?.status==='LOADING'&&own.destination.kind===loc.kind&&own.destination.id===loc.id?own.volume:0,name:record.name};
}
function bump(tx,s,w,d){if(w)tx.set(`${b(s)}/warehouses/${w.id}`,{...w,revision:w.revision+1});if(d?.record)tx.set(`${b(s)}/${d.collection}/${d.record.id}`,{...d.record,revision:d.record.revision+1});}
export function createDockTheftService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),at=now(),eventId=uuid(),admin=adminActions.has(action),write=writes.has(action);
  const keys=action==='prepareDockTheft'?['warehouseId','lotId','quantity','destination']:action==='startDockTheft'?['warehouseId','lotId','quantity','destination','confirmation','present']:['dockTheft','resolveDockTheft','resolveDockTheftAdmin','cancelDockTheft','cancelDockTheftAdmin','confirmDockTheftPhysical'].includes(action)?['theftId',...(action==='cancelDockTheftAdmin'?['reason']:[]),...(action==='confirmDockTheftPhysical'?['handedOver']:[])]:[];
  admissionKeys(input,['sessionId',...keys,...(write?['requestId']:[])]);
  return store.runTransaction(async tx=>{
   const ctx=admin?{s:await checkSession(tx,actor,sid,'content',true)}:await inventoryPlayer(tx,actor,{sessionId:sid}),{s}=ctx;
   requireThat(s.spaceOutlaws?.dockStorageVersion===1&&!s.campaignSealed&&s.stage!=='ARCHIVED','SO_GAMEPLAY_NOT_OPEN');const time=gameTime(s.clock,at);
   if(write){requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(action==='cancelDockTheftAdmin'||['cancelDockTheft'].includes(action)&&s.stage==='PAUSE'||s.stage==='EN_JEU','SESSION_NOT_RUNNING');}
   if(action==='myDockAlerts')return {session:{id:sid,stage:s.stage,safetyStop:!!s.safetyStop?.active},alerts:await dockAlerts(tx,s,ctx.c,at)};
   if(['myDockThefts','dockTheftsAdmin'].includes(action)){
    let rows;if(admin){const active=[...await tx.list(`${b(s)}/dockThefts`,['status','RUNNING'],{limit:101}),...await tx.list(`${b(s)}/dockThefts`,['status','HANDOVER'],{limit:101})];requireThat(active.length<=100,'SO_RELEASE_LIMIT');rows=[...new Map([...active,...await tx.list(`${b(s)}/dockThefts`,null,{orderBy:'at',direction:'desc',limit:100})].map(t=>[t.id,t])).values()];}
    else {rows=await tx.list(`${b(s)}/dockThefts`,['characterId',ctx.c.id],{limit:1001});requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');}
    const views=[];for(const t of rows.sort((a,b)=>b.at-a.at)){const v=projection(t,time);if(admin){views.push({...v,name:t.name,character:{id:t.characterId,name:t.characterName??'Personnage indisponible'}});}else views.push(v);}return {session:{id:sid,stage:s.stage,safetyStop:!!s.safetyStop?.active},admin,thefts:views,...(admin?{}:{alerts:await dockAlerts(tx,s,ctx.c,at)})};
   }
   const op=write?`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`:null,fingerprint=hash(JSON.stringify([action,input])),old=op?await tx.get(op):null;
   if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===ctx.version,'FORBIDDEN');return old.result;}
   const audit=result=>{tx.set(`${b(s)}/audit/${eventId}`,{id:eventId,at,action,actorUid:actor.uid,...(result.id?{theftId:result.id}:{})});tx.set(op,{fingerprint,guard:ctx.version??null,result,at});return result;};
   if(['prepareDockTheft','startDockTheft'].includes(action)){
    requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');const {c}=ctx;requireThat(await readyActor(tx,s,c,at),'OUT_OF_COMBAT');
    const w=await tx.get(`${b(s)}/warehouses/${documentId(input.warehouseId)}`);requireThat(w?.commercialStorage&&w.dock?.schemaVersion===1&&w.dock.theftEnabled&&w.enabled,'DOCK_THEFT_CLOSED');await dockEntry(tx,ctx,w,at);
    const state=await tx.get(`${b(s)}/dockTheftActors/${c.id}`)??{activeId:null,cooldownUntilGameMs:0};requireThat(!state.activeId&&time>=state.cooldownUntilGameMs,'DOCK_THEFT_COOLDOWN');const quotaPath=`${b(s)}/dockTheftQuotas/${hash(JSON.stringify([c.id,w.id]))}`;requireThat(!await tx.get(quotaPath),'DOCK_THEFT_QUOTA');
    const lot=await tx.get(`${b(s)}/inventory/${documentId(input.lotId)}`);requireThat(eligible(lot)&&lot.status==='AVAILABLE'&&!lot.cargoTransferId&&lot.location.kind==='WAREHOUSE'&&lot.location.id===w.id,'DOCK_THEFT_LOT');
    const quantity=itemQuantity(lot.item,input.quantity);requireThat(quantity<=lot.quantity,'INSUFFICIENT_STOCK');const volume=stockVolume([{...lot,quantity}]);requireThat(volume<=5,'DOCK_THEFT_VOLUME');const loc=location(input.destination);requireThat(loc.kind!=='WAREHOUSE'||loc.id!==w.id,'DOCK_THEFT_DESTINATION');
    const dest=await destination(tx,ctx,loc,w.portId,at);requireThat(dest.used+dest.incoming+volume<=dest.record.capacity,'WAREHOUSE_FULL');const points=actionPointState(s,c,await tx.get(actionPointPath(sid,c.id)),at);reserveActionPoints(points,1);
    const view={warehouseId:w.id,warehouseName:w.name,lotId:lot.id,name:w.dock.revealFields.includes('name')?lot.item.name:'Lot de stockage',quantity,volume,destination:loc,destinationName:dest.name,physical:w.dock.physical,durationSeconds:180,actionPointsOnSuccess:1,cooldownSeconds:600,maxVolume:5};
    const confirmation=hash(JSON.stringify([ctx.version,w,lot,dest.record,dest.used,dest.incoming,points,state,view]));if(action==='prepareDockTheft')return {...view,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    authorizeSpaceOutlaws(tx,s,'DOCK_THEFT');const t={id:eventId,schemaVersion:1,status:'RUNNING',at,characterId:c.id,characterName:c.public.displayName,actorVersion:ctx.version,actorUid:actor.uid,warehouseId:w.id,warehouseName:w.name,name:lot.item.name,visibleName:view.name,quantity,volume,destination:loc,destinationName:dest.name,physical:w.dock.physical,startedAtGameMs:time,readyAtGameMs:time+180000,portId:w.portId};
    const transfer={id:eventId,status:'LOADING',revision:1,name:lot.item.name,quantity,volume,source:{kind:'WAREHOUSE',id:w.id},destination:loc,sourceName:w.name,destinationName:dest.name,owner:{type:lot.ownerType??'CHARACTER',id:lot.ownerId},at,actorUid:actor.uid,characterId:c.id,actorVersion:ctx.version,readyAtGameMs:t.readyAtGameMs,clearance:null,dockTheft:true};
    const batch=reserveCargoBatch(tx,sid,{lot,quantity,transfer,id:eventId,at,actorUid:actor.uid});tx.set(path(s,t.id),{...t,lotId:batch.record.lotId});tx.set(actionPointPath(sid,c.id),reserveActionPoints(points,1));tx.set(`${b(s)}/characters/${c.id}`,{...c,activeFieldActionId:t.id});tx.set(`${b(s)}/dockTheftActors/${c.id}`,{...state,activeId:t.id});bump(tx,s,w,dest);tx.set(`${b(s)}/logisticsHistory/${eventId}`,{...batch.event,kind:'DOCK_THEFT_STARTED',warehouseId:w.id,characterId:c.id});recordDockAlarm(tx,s,w,'THEFT_STARTED',t.id,at);return audit(projection(t,time));
   }
   const t=await tx.get(path(s,documentId(input.theftId)));requireThat(t?.schemaVersion===1,'NOT_FOUND');requireThat(admin||t.characterId===ctx.c.id,'FORBIDDEN');if(action==='dockTheft')return {session:{id:sid,stage:s.stage,safetyStop:!!s.safetyStop?.active},theft:projection(t,time)};
   if(action==='confirmDockTheftPhysical')requireThat(t.physical,'DOCK_PHYSICAL_ONLY');
   if(!running(t))return audit(projection(t,time));
   const party=admin?await inventoryParty(tx,sid,t.characterId):ctx,person=admin?party.c:ctx.c,version=admin?party.version:ctx.version,active=admin?party.active:true;
   const w=await tx.get(`${b(s)}/warehouses/${t.warehouseId}`),lot=await tx.get(`${b(s)}/inventory/${t.lotId}`),transfer=await tx.get(`${b(s)}/cargoTransfers/${t.id}`),state=await tx.get(`${b(s)}/dockTheftActors/${t.characterId}`),quotaPath=`${b(s)}/dockTheftQuotas/${hash(JSON.stringify([t.characterId,t.warehouseId]))}`;
   requireThat(person?.activeFieldActionId===t.id&&state?.activeId===t.id&&transfer?.status==='LOADING'&&transfer.dockTheft&&transfer.quantity===t.quantity&&transfer.volume===t.volume&&transfer.source.kind==='WAREHOUSE'&&transfer.source.id===t.warehouseId&&transfer.destination.kind===t.destination.kind&&transfer.destination.id===t.destination.id&&lot?.status==='CARGO_RESERVED'&&lot.cargoTransferId===t.id&&lot.quantity===t.quantity&&lot.location.kind==='WAREHOUSE'&&lot.location.id===t.warehouseId&&transfer.owner.type===(lot.ownerType??'CHARACTER')&&transfer.owner.id===lot.ownerId,'DOCK_THEFT_STALE');
   const points=actionPointState(s,person,await tx.get(actionPointPath(sid,person.id)),at),quota=await tx.get(quotaPath),cancel=['cancelDockTheft','cancelDockTheftAdmin'].includes(action);let dest=null,failure=null;
   // Recheck every live prerequisite. A resolved failure releases both native
   // reservations and PA; a refusal before start never creates a recovery timer.
   if(!cancel){
    requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');requireThat(time>=t.readyAtGameMs,'DOCK_THEFT_TOO_EARLY');
    try{requireThat(active&&version===t.actorVersion,'FORBIDDEN');requireThat(w?.enabled&&w.portId===t.portId&&w.dock?.theftEnabled,'DOCK_THEFT_CLOSED');requireThat(eligible(lot)&&t.volume===stockVolume([lot])&&t.volume<=5,'DOCK_THEFT_LOT');requireThat(!quota,'DOCK_THEFT_QUOTA');requireThat(await readyActor(tx,s,person,at,t.id),'OUT_OF_COMBAT');const current={s,c:person,r:admin?party.r:ctx.r,version};await dockEntry(tx,current,w,at);dest=await destination(tx,current,t.destination,t.portId,at,t.id);requireThat(dest.ownVolume===t.volume&&dest.used+dest.incoming<=dest.record.capacity,'WAREHOUSE_FULL');}catch(e){if(!e.code)throw e;failure=e.code;}
    if(!failure&&t.physical&&action!=='confirmDockTheftPhysical'){authorizeSpaceOutlaws(tx,s,'DOCK_THEFT');const pending={...t,status:'HANDOVER'};tx.set(path(s,t.id),pending);return audit(projection(pending,time));}
    if(!failure&&t.physical)requireThat(input.handedOver===true,'CARGO_RECEIPT_REQUIRED');
   }else if(admin)requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
   if(!dest){const r=await tx.get(`${b(s)}/${t.destination.kind==='HOLD'?'ships':'warehouses'}/${t.destination.id}`);if(r)dest={record:r,collection:t.destination.kind==='HOLD'?'ships':'warehouses'};}
   authorizeSpaceOutlaws(tx,s,'DOCK_THEFT');const success=!cancel&&!failure,ended={...t,status:cancel?'CANCELLED':success?'SUCCESS':'FAILED',finishedAtGameMs:time,...(failure?{failureReason:failure}:{}),...(success&&t.physical?{handedOverBy:actor.uid,handedOverAt:at}:{})};
   const batch=finishCargoBatch(tx,sid,{lot,transfer,receive:success,id:eventId,at,actorUid:actor.uid,reason:cancel?admin?input.reason:'Tentative abandonnée avant résolution':success?'Vol de stockage : garde transférée, propriété légale conservée':`Tentative échouée : ${failure}`,patch:success?{holderId:person.id,dockCustody:{theftId:t.id,sessionId:sid,sourceWarehouseId:t.warehouseId,legalOwnerType:lot.ownerType??'CHARACTER',legalOwnerId:lot.ownerId,at}}:{}});
   tx.set(actionPointPath(sid,person.id),success?resolveActionPoints(points,1):releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,person)));tx.set(`${b(s)}/characters/${person.id}`,{...person,activeFieldActionId:null});tx.set(`${b(s)}/dockTheftActors/${person.id}`,{...state,activeId:null,cooldownUntilGameMs:cancel?state.cooldownUntilGameMs:time+600000});if(success)tx.set(quotaPath,{characterId:person.id,warehouseId:t.warehouseId,theftId:t.id});tx.set(path(s,t.id),ended);bump(tx,s,w,dest);tx.set(`${b(s)}/logisticsHistory/${eventId}`,{...batch.event,kind:cancel?'DOCK_THEFT_CANCELLED':success?'DOCK_THEFT_SUCCESS':'DOCK_THEFT_FAILED',warehouseId:t.warehouseId,characterId:person.id,legalOwnerId:lot.ownerId,holderId:success?person.id:lot.holderId});if(!cancel)recordDockAlarm(tx,s,w,success?'THEFT_SUCCESS':'THEFT_FAILED',t.id,at);return audit(projection(ended,time));
  });
 };
}

export async function dockTheftDestinations(tx,ctx,w,at){
 const cache=new Map(),cached={...tx,get:p=>{const k=`get:${p}`;if(!cache.has(k))cache.set(k,tx.get(p));return cache.get(k);},list:(...args)=>{const k=`list:${JSON.stringify(args)}`;if(!cache.has(k))cache.set(k,tx.list(...args));return cache.get(k);}},out=[];
 const [cells,ships]=await Promise.all([cached.list(`${b(ctx.s)}/warehouses`,null,{limit:501}),cached.list(`${b(ctx.s)}/ships`,null,{limit:501})]);requireThat(cells.length<=500&&ships.length<=500,'SO_RELEASE_LIMIT');
 for(const [kind,rows]of [['WAREHOUSE',cells],['HOLD',ships]])for(const r of rows){if(r.portId!==w.portId||kind==='WAREHOUSE'&&r.id===w.id)continue;try{const d=await destination(cached,ctx,{kind,id:r.id},w.portId,at);if(d.used+d.incoming<d.record.capacity)out.push({location:d.location,name:d.name});}catch(e){if(!['FORBIDDEN','DOCK_THEFT_DESTINATION','DOCK_NOT_LOCAL'].includes(e.code))throw e;}}
 return out;
}
