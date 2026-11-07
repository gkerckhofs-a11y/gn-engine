import {randomInt} from 'node:crypto';
import {requireThat,documentId,whole} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {inventoryHash as hash,publicLot} from './inventory-state.mjs';
import {warehouseStock,stockVolume} from './storage-state.mjs';
import {hasHiddenCargo,activeModuleOutages} from './space-module-flight.mjs';
import {standardShipModuleQuote} from '../shared/space-ship-modules.mjs';
import {gameTime} from './clock.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,resolveActionPoints,releaseActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

// Decision B (4 November 2026): an outage blocks new storage only.
export {hasHiddenCargo};
export const concealedIn=(lot,shipId)=>lot.hiddenCargo?.concealed===true&&lot.hiddenCargo.shipId===shipId&&lot.location?.kind==='HOLD'&&lot.location.id===shipId;
export const hiddenFromOrdinary=(lot,shipId)=>concealedIn(lot,shipId)&&lot.hiddenCargo.discovered!==true;
export function hiddenCargoCapacity(ship,time){
 const m=ship.modules?.find(m=>m.code==='MOD-04'&&m.status==='OPERATIONAL'&&m.size===ship.soProfile?.size);
 const q=standardShipModuleQuote(m);return q&&!activeModuleOutages(ship,time).some(n=>n.lotId===m.lotId)?q.hiddenCargoCapacity:0;
}
const visit=ship=>ship.portVisitId??`INITIAL:${ship.id}`;
const idle=ship=>ship?.enabled&&ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId&&!ship.maintenanceId&&!ship.convoy&&!ship.convoyOffer;
const fit=(c,time,id=null)=>c?.hp>0&&!c.outOfCombat&&!c.survival?.dead&&!c.activeNavigationId&&!c.activeVoyageId&&!c.activeCargoId&&!c.activeAidId&&!c.activeFieldActionId&&!c.activePersonActionId&&(!c.activeMaintenanceId||c.activeMaintenanceId===id)&&!(c.convalescentUntilGameMs>time);
const fields={customsDesk:[],hiddenCargo:['shipId'],prepareCargoConcealment:['shipId','lotId','conceal'],setCargoConcealment:['shipId','lotId','conceal','confirmation','present'],customsAdmin:[],setCustomsAuthority:['characterId','level','portId','authorityRevision','reason'],authorizeCustomsRetry:['shipId','confirmation','reason'],prepareCustomsInspection:['shipId','kind'],startCustomsInspection:['shipId','kind','confirmation','present'],prepareCustomsInspectionAdmin:['shipId','kind','agentId'],startCustomsInspectionAdmin:['shipId','kind','agentId','confirmation','present'],customsInspection:['inspectionId'],customsInspectionAdmin:['inspectionId'],finishCustomsInspection:['inspectionId','confirmation','present','performed'],finishCustomsInspectionAdmin:['inspectionId','confirmation','present','performed'],cancelCustomsInspection:['inspectionId','confirmation','reason'],cancelCustomsInspectionAdmin:['inspectionId','confirmation','reason']};
export const hiddenCargoActions=Object.keys(fields);
const reads=new Set(['customsDesk','hiddenCargo','prepareCargoConcealment','customsAdmin','prepareCustomsInspection','prepareCustomsInspectionAdmin','customsInspection','customsInspectionAdmin']);
const admins=new Set(['customsAdmin','setCustomsAuthority','authorizeCustomsRetry','prepareCustomsInspectionAdmin','startCustomsInspectionAdmin','customsInspectionAdmin','finishCustomsInspectionAdmin','cancelCustomsInspectionAdmin']);
const jobs=['prepareCustomsInspection','startCustomsInspection','prepareCustomsInspectionAdmin','startCustomsInspectionAdmin'];
export function createHiddenCargoService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();let die;
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);
   requireThat(hasHiddenCargo(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');
   const session={id:s.id,stage:s.stage,safetyStopped:!!s.safetyStop?.active};
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   const prior=op?await tx.get(op):null;
   const token=(...data)=>hash(JSON.stringify([s.id,s.revision,version??null,...data]));
   const replay=()=>{if(!prior)return null;requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||prior.guard===version,'FORBIDDEN');return prior.result;};
   const running=()=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
   const write=(result,before,after,reason='')=>{authorizeSpaceOutlaws(tx,s,'HIDDEN_CARGO');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(action==='customsAdmin'){
    const ships=await tx.list(`${base}/ships`),characters=await tx.list(`${base}/characters`),ports=await tx.list(`${base}/ports`),records=await tx.list(`${base}/shipMaintenance`);
    return {session,ships:ships.filter(x=>x.soProfile).map(x=>({id:x.id,name:x.name,portId:x.portId,canInspect:idle(x),canRetry:idle(x)&&x.customsAttempt?.visitId===visit(x)&&!x.customsAttempt.retryAuthorized,attempt:x.customsAttempt??null,confirmation:token(x)})),characters:characters.map(x=>({id:x.id,name:x.public.displayName,player:!!x.birth||!!x.assignedUid,authority:x.customsAuthorization??null})),ports:ports.map(x=>({id:x.id,name:x.name})),inspections:records.filter(r=>r.customsInspectionVersion===1).map(r=>({id:r.id,shipName:r.shipName,kind:r.kind,status:r.status,pnj:r.pnj}))};
   }
   if(action==='setCustomsAuthority'){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');const target=await tx.get(`${base}/characters/${documentId(input.characterId)}`),level=whole(input.level,'INVALID_CUSTOMS_AUTHORITY'),port=await tx.get(`${base}/ports/${documentId(input.portId)}`);
    requireThat(target&&level<=5&&port?.versionId===s.versionId,'INVALID_CUSTOMS_AUTHORITY');if(prior)return replay();requireThat(input.authorityRevision===(target.customsAuthorization?.revision??0),'STALE_REVISION');
    const reason=admissionText(input.reason,500,true),grant={level,portId:port.id,revision:input.authorityRevision+1,grantedAt:at,grantedBy:actor.uid};
    tx.set(`${base}/characters/${target.id}`,{...target,customsAuthorization:grant});return write({id:target.id,authority:grant},target.customsAuthorization??null,grant,reason);
   }
   if(['hiddenCargo','prepareCargoConcealment','setCargoConcealment'].includes(action)){
    const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(ship?.ownerType==='CHARACTER'&&ship.ownerId===c.id,'FORBIDDEN');
    const stock=await warehouseStock(tx,s.id,ship.id,'HOLD'),capacity=hiddenCargoCapacity(ship,time),used=stockVolume(stock.filter(l=>concealedIn(l,ship.id)));
    if(action==='hiddenCargo')return {session,ship:{id:ship.id,name:ship.name,capacity:ship.capacity},hiddenCapacity:capacity,hiddenInstalledCapacity:standardShipModuleQuote(ship.modules?.find(m=>m.code==='MOD-04'))?.hiddenCargoCapacity??0,hiddenUsed:used,canMove:s.stage==='EN_JEU'&&!s.safetyStop?.active&&idle(ship)&&fit(c,time)&&(c.spacePortId??s.transportRules?.homePort)===ship.portId,stock:stock.filter(l=>l.ownerId===c.id&&(l.ownerType??'CHARACTER')==='CHARACTER').map(l=>({...publicLot(l),concealed:concealedIn(l,ship.id),discovered:l.hiddenCargo?.discovered===true})),confirmation:token(ship,stock)};
    const module=ship.modules?.find(m=>m.code==='MOD-04'),mounted=module?await tx.get(`${base}/inventory/${module.lotId}`):null;
    requireThat(!input.conceal||mounted?.status==='INSTALLED'&&!mounted.fieldActionId&&!mounted.cargoTransferId&&mounted.item?.kind==='INDIVIDUAL'&&!mounted.item.consumable&&mounted.transferable===true&&mounted.resellable===true&&(mounted.ownerType??'CHARACTER')==='CHARACTER'&&mounted.quantity===1&&mounted.ownerId===ship.ownerId&&mounted.holderId===ship.id&&mounted.location?.kind==='SHIP_MODULE'&&mounted.location.id===ship.id&&mounted.item?.shipModule?.code==='MOD-04'&&mounted.item.shipModule.size===module.size,'MODULE_LOT_UNAVAILABLE');
    running();requireThat(idle(ship)&&fit(c,time)&&(c.spacePortId??s.transportRules?.homePort)===ship.portId,'SHIP_NOT_LOCAL');requireThat(typeof input.conceal==='boolean','INVALID_ADMISSION');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    const lot=stock.find(l=>l.id===documentId(input.lotId));requireThat(lot&&lot.ownerId===c.id&&(lot.ownerType??'CHARACTER')==='CHARACTER'&&lot.status==='AVAILABLE'&&!lot.boardingCustody&&!lot.transportContractId,'FORBIDDEN');
    const volume=stockVolume([lot]);requireThat(volume>0&&(!input.conceal||capacity>0&&used-(concealedIn(lot,ship.id)?volume:0)+volume<=capacity),'HIDDEN_CARGO_FULL');
    if(prior)return replay();const confirmation=token(ship,stock,lot,input.conceal),preview={lotId:lot.id,name:lot.item.name,volume,conceal:input.conceal,discovered:lot.hiddenCargo?.discovered===true,confirmation};if(action==='prepareCargoConcealment')return preview;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const next={...lot,hiddenCargo:{...lot.hiddenCargo,shipId:ship.id,concealed:input.conceal,discovered:lot.hiddenCargo?.discovered===true},revision:lot.revision+1};
    tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,before:lot.hiddenCargo??null,after:next.hiddenCargo});tx.set(`${base}/ships/${ship.id}`,{...ship,revision:ship.revision+1});return write({id:lot.id,concealed:input.conceal},lot.hiddenCargo??null,next.hiddenCargo);
   }
   if(action==='customsDesk'){
    requireThat(c.customsAuthorization?.level>=1,'FORBIDDEN');const fleet=await tx.list(`${base}/ships`),records=await tx.list(`${base}/shipMaintenance`);
    return {session,level:c.customsAuthorization.level,ships:fleet.filter(x=>x.docked&&!x.journey&&x.portId===(c.spacePortId??s.transportRules?.homePort)).map(x=>({id:x.id,name:x.name,canInspect:idle(x)})),inspections:records.filter(r=>r.customsInspectionVersion===1&&r.agentId===c.id).map(r=>({id:r.id,shipName:r.shipName,kind:r.kind,status:r.status}))};
   }
   if(action==='authorizeCustomsRetry'){
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(idle(ship)&&ship.customsAttempt?.visitId===visit(ship),'CUSTOMS_ATTEMPT_UNAVAILABLE');if(prior)return replay();requireThat(input.confirmation===token(ship),'STALE_REVISION');const reason=admissionText(input.reason,500,true),next={...ship,customsAttempt:{...ship.customsAttempt,retryAuthorized:true,retryReason:reason},revision:ship.revision+1};tx.set(`${base}/ships/${ship.id}`,next);return write({id:ship.id,retryAuthorized:true},ship.customsAttempt,next.customsAttempt,reason);
   }
   let r=jobs.includes(action)?null:await tx.get(`${base}/shipMaintenance/${documentId(input.inspectionId)}`);if(r)requireThat(r.customsInspectionVersion===1,'FORBIDDEN');
   requireThat(jobs.includes(action)||r,'FORBIDDEN');const cancelling=action.startsWith('cancel'),agentId=r?.agentId??(admin?documentId(input.agentId):c.id),agent=await tx.get(`${base}/characters/${agentId}`),grant=agent?.customsAuthorization;
   const p=agent?.birth?await inventoryParty(tx,s.id,agent.id):null,pnj=!!agent&&!agent.birth&&!agent.assignedUid;
   const oversight=admin&&['customsInspectionAdmin','cancelCustomsInspectionAdmin'].includes(action);
   if(!oversight)requireThat(grant?.level>=1&&grant.level<=5&&(admin?pnj:agent.id===c.id&&p?.active&&p.version===version),'FORBIDDEN');
   if(r&&!oversight)requireThat(grant?.revision===r.authorityRevision&&(admin?r.pnj:r.actorVersion===version),'FORBIDDEN');
   const ship=await tx.get(`${base}/ships/${r?.shipId??documentId(input.shipId)}`);requireThat(ship?.soProfile,'CARGO_UNAVAILABLE');
   if(prior)return replay();
   const confirmation=token(ship,r,grant),view=record=>({session,inspection:{id:record.id,shipId:record.shipId,shipName:record.shipName,kind:record.kind,status:record.status,pnj:record.pnj,canFinish:record.status==='ACTIVE'&&s.stage==='EN_JEU'&&!s.safetyStop?.active&&time>=record.readyAtGameMs&&(!admin||record.pnj)&&grant?.level>=1&&grant.revision===record.authorityRevision,canCancel:record.status==='ACTIVE'&&['EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,remainingSeconds:record.status==='ACTIVE'?Math.max(0,Math.ceil((record.readyAtGameMs-time)/1000)):0,...(record.result?{result:record.result}:{})},confirmation});
   if(jobs.includes(action)){
    running();requireThat(['ORDINARY','DEEP'].includes(input.kind),'INVALID_CUSTOMS_KIND');requireThat(idle(ship),'SPACE_SHIP_BUSY');requireThat((pnj?grant.portId:(agent.spacePortId??s.transportRules?.homePort))===ship.portId,'SHIP_NOT_LOCAL');requireThat(pnj?!agent.activeMaintenanceId:fit(agent,time),'OUT_OF_COMBAT');
    requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===ship.id)),'CARGO_TRANSFERS_OPEN');
    requireThat(input.kind!=='DEEP'||ship.customsAttempt?.visitId!==visit(ship)||ship.customsAttempt.retryAuthorized,'CUSTOMS_ATTEMPT_USED');
    const points=pnj?null:actionPointState(s,agent,await tx.get(actionPointPath(s.id,agent.id)),at),reserved=!pnj&&input.kind==='DEEP'?reserveActionPoints(points,1):points;
    const preview={shipName:ship.name,kind:input.kind,level:grant.level,seconds:120,actionPoints:pnj||input.kind==='ORDINARY'?0:1,confirmation};if(action.startsWith('prepare'))return preview;
    requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={id,customsInspectionVersion:1,status:'ACTIVE',kind:input.kind,shipId:ship.id,shipName:ship.name,portId:ship.portId,visitId:visit(ship),agentId:agent.id,pnj,authorityRevision:grant.revision,actorVersion:pnj?null:version,level:grant.level,reservedActionPoints:pnj||input.kind==='ORDINARY'?0:1,readyAtGameMs:time+120000,revision:1};
    tx.set(`${base}/shipMaintenance/${id}`,next);tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:id,revision:ship.revision+1});tx.set(`${base}/characters/${agent.id}`,{...agent,activeMaintenanceId:id});if(next.reservedActionPoints)tx.set(actionPointPath(s.id,agent.id),reserved);return write({id,status:'ACTIVE'},null,next);
   }
   if(['customsInspection','customsInspectionAdmin'].includes(action))return view(r);
   requireThat(r.status==='ACTIVE'&&ship.maintenanceId===r.id&&visit(ship)===r.visitId&&ship.portId===r.portId,'CUSTOMS_INSPECTION_CLOSED');
   requireThat(agent?.activeMaintenanceId===r.id,'CUSTOMS_INSPECTION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU'||cancelling&&s.stage==='PAUSE','SESSION_NOT_RUNNING');requireThat(input.confirmation===confirmation,'STALE_REVISION');
   if(!cancelling){requireThat(input.present===true&&input.performed===true,'FIELD_PRESENCE_REQUIRED');requireThat(time>=r.readyAtGameMs,'CUSTOMS_NOT_READY');requireThat(pnj||fit(agent,time,r.id),'OUT_OF_COMBAT');requireThat((pnj?grant.portId:(agent.spacePortId??s.transportRules?.homePort))===ship.portId,'SHIP_NOT_LOCAL');requireThat(ship.docked&&!ship.journey&&!ship.operation&&!ship.combatId&&!ship.rescueId,'SHIP_NOT_LOCAL');}
   const points=!r.pnj&&r.reservedActionPoints?actionPointState(s,agent,await tx.get(actionPointPath(s.id,agent.id)),at):null;if(points)requireThat(points.reserved>=1,'CUSTOMS_RESERVATION');
   const stock=!cancelling?await warehouseStock(tx,s.id,ship.id,'HOLD'):[];const reason=cancelling?admissionText(input.reason,500,true):'';
   let result=null;if(!cancelling){if(r.kind==='DEEP'){die??=rollD6();requireThat(Number.isInteger(die)&&die>=1&&die<=6,'INVALID_DIE');const success=die+r.level>=7;result={roll:die,level:r.level,total:die+r.level,success,discovered:success?stock.filter(l=>concealedIn(l,ship.id)).map(publicLot):[]};}else result={documentsChecked:true,hiddenCargoRevealed:false,knownCargo:stock.filter(l=>l.hiddenCargo?.discovered===true).map(publicLot)};}
   if(result?.success)for(const lot of stock.filter(l=>concealedIn(l,ship.id))){const next={...lot,hiddenCargo:{...lot.hiddenCargo,discovered:true,discoveredAt:at},revision:lot.revision+1};tx.set(`${base}/inventory/${lot.id}`,next);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,actorUid:actor.uid,inspectionId:r.id,before:lot.hiddenCargo,after:next.hiddenCargo});}
   if(points)tx.set(actionPointPath(s.id,agent.id),cancelling?releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,agent)):resolveActionPoints(points,1));tx.set(`${base}/characters/${agent.id}`,{...agent,activeMaintenanceId:null});
   const next={...r,status:cancelling?'CANCELLED':'COMPLETED',result,closedAt:at,revision:r.revision+1};tx.set(`${base}/shipMaintenance/${r.id}`,next);tx.set(`${base}/ships/${ship.id}`,{...ship,maintenanceId:null,...(!cancelling&&r.kind==='DEEP'?{customsAttempt:{visitId:r.visitId,inspectionId:r.id,used:true,retryAuthorized:false}}:{}),revision:ship.revision+1});return write({id:r.id,status:next.status,...(result?{result}:{})},r,next,reason);
  });
 };
}
