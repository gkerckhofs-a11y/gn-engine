import {isDeepStrictEqual} from 'node:util';
import {requireThat,documentId,whole,DomainError} from './validation.mjs';
import {admissionKeys,admissionText} from './admission-state.mjs';
import {inventoryHash as hash} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {accountId,moneyState,writeLedger} from './economy-state.mjs';
import {accountEntry,accountParty} from './collective-accounts.mjs';
import {shopAccountId} from './space-outlaws-shop-state.mjs';
import {spaceShipProfiles} from '../shared/space-outlaws-navigation.mjs';
import {hasCompleteTowing} from './space-module-flight.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

// V0.7 chapter 22: an available NPC tug supplies a paid service, including fuel.
// No invented NPC vessel, voyage timer, salvage bonus or transfer of title.
const offer=['shipId','payerId','shopId','portId','source','reason','present'];
const fields={prepareTowingRecoveryOffer:offer,offerTowingRecovery:[...offer,'confirmation'],prepareTowingRecovery:['recoveryId'],acceptTowingRecovery:['recoveryId','confirmation','present'],prepareTowingRecoveryFinish:['recoveryId'],finishTowingRecovery:['recoveryId','confirmation','performed','reason'],cancelTowingRecovery:['recoveryId','confirmation','reason'],cancelTowingRecoveryAdmin:['recoveryId','confirmation','reason']};
export const towingRecoveryActions=Object.keys(fields);
const reads=new Set(towingRecoveryActions.filter(a=>a.startsWith('prepare')));
const admins=new Set(['prepareTowingRecoveryOffer','offerTowingRecovery','prepareTowingRecoveryFinish','finishTowingRecovery','cancelTowingRecoveryAdmin']);
const open=r=>['RECOVERY_OFFERED','RECOVERY_ACTIVE'].includes(r.status);
const free=sh=>sh?.enabled&&sh.hull===0&&!sh.towingAttachment&&!sh.towingTransit&&!sh.operation&&!sh.combatId&&!sh.rescueId&&!sh.maintenanceId&&!sh.ambushId&&!sh.convoy&&!sh.convoyOffer&&!sh.pirateAlliance&&sh.ownerType==='CHARACTER';
async function target(tx,s,shipId,activeId=null){
 const base=`sessions/${s.id}`,sh=await tx.get(`${base}/ships/${shipId}`),p=spaceShipProfiles.find(p=>p.id===sh?.soProfile?.id);
 requireThat(p&&p.size===sh.soProfile.size&&sh.versionId===s.versionId&&free(activeId&&sh?.rescueId===activeId?{...sh,rescueId:null}:sh),'TOWING_RECOVERY_UNAVAILABLE');
 requireThat(await tx.get(`${base}/characters/${sh.ownerId}`),'TOWING_OWNER_REQUIRED');
 if(sh.wreckSpacePosition){
  const pos=sh.wreckSpacePosition,record=await tx.get(`${base}/shipMaintenance/${pos.workId}`),combat=await tx.get(`${base}/spaceCombats/${pos.combatId}`);
  requireThat(!sh.docked&&!sh.journey&&pos.version===1&&record?.status==='TOWING_RELEASED_IN_SPACE'&&record.binding?.wreckId===sh.id&&isDeepStrictEqual(record.spaceRelease,pos)&&combat?.status==='CLOSED','TOWING_RECOVERY_ENCOUNTER');
 }else requireThat(sh.docked&&!sh.journey||!sh.docked&&sh.journey?.suspended&&!sh.journey.towing,'TOWING_RECOVERY_UNAVAILABLE');
 requireThat(!(await tx.list(`${base}/cargoTransfers`)).some(t=>t.status==='LOADING'&&[t.source,t.destination].some(p=>p.kind==='HOLD'&&p.id===sh.id)),'CARGO_TRANSFERS_OPEN');
 return sh;
}
const publicRecovery=(r,confirmation,admin,running)=>({id:r.id,shipName:r.shipName,provider:r.provider,portName:r.portName,amount:r.amount,status:r.status,confirmation,canAccept:!admin&&running&&r.status==='RECOVERY_OFFERED',canFinish:admin&&running&&r.status==='RECOVERY_ACTIVE',canCancel:open(r),...(admin?{source:r.source,reason:r.reason}:{})});
export async function towingRecoveryDesk(tx,s,c,version,admin){
 if(!hasCompleteTowing(s))return null;
 const base=`sessions/${s.id}`,rows=(await tx.list(`${base}/shipMaintenance`)).filter(r=>r.towingRecoveryVersion===1&&(admin||r.payerId===c.id&&r.payerVersion===version)),running=s.stage==='EN_JEU'&&!s.safetyStop?.active,jobs=rows.map(r=>({...publicRecovery(r,hash(JSON.stringify([s.id,s.revision,r,version??null])),admin,running),canCancel:open(r)&&!s.safetyStop?.active}));
 const choices={ships:[],payers:[],shops:[],ports:[]};
 if(admin){
  const reserved=new Set(rows.filter(open).map(r=>r.shipId));
  for(const sh of await tx.list(`${base}/ships`)){if(reserved.has(sh.id))continue;try{await target(tx,s,sh.id);choices.ships.push({id:sh.id,name:sh.name});}catch(e){if(!(e instanceof DomainError))throw e;}}
  for(const ch of await tx.list(`${base}/characters`)){const p=await inventoryParty(tx,s.id,ch.id);if(p.active)choices.payers.push({id:ch.id,name:ch.public.displayName});}
  for(const shop of await tx.list(`${base}/shops`)){const a=await tx.get(`${base}/accounts/${shopAccountId(shop.id)}`);if(shop.versionId===s.versionId&&a?.status==='ACTIVE'&&a.ownerType==='SHOP'&&a.shopId===shop.id)choices.shops.push({id:shop.id,name:shop.name});}
  choices.ports=(await tx.list(`${base}/ports`)).filter(p=>p.versionId===s.versionId).map(p=>({id:p.id,name:p.name}));
 }
 return {jobs,canOffer:admin&&running,...(admin?{choices}:{})};
}
export function createTowingRecoveryService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),{s,c,version}=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),base=`sessions/${s.id}`;
   requireThat(hasCompleteTowing(s),'SO_GAMEPLAY_NOT_OPEN');requireThat(['EN_JEU','PAUSE'].includes(s.stage),'SESSION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
   const cancel=action.startsWith('cancel');if(!cancel)requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),prior=op?await tx.get(op):null;
   const write=(r,reason)=>{authorizeSpaceOutlaws(tx,s,'TOWING_RECOVERY');tx.set(`${base}/shipMaintenance/${r.id}`,r);tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,recoveryId:r.id,shipId:r.shipId,reason});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid,reason});const result={id:r.id,status:r.status};tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   const replay=()=>{requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||prior.guard===version,'FORBIDDEN');return prior.result;};
   if(['prepareTowingRecoveryOffer','offerTowingRecovery'].includes(action)){
    if(prior)return replay();requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const sh=await target(tx,s,documentId(input.shipId)),payer=await inventoryParty(tx,s.id,documentId(input.payerId)),shop=await tx.get(`${base}/shops/${documentId(input.shopId)}`),port=await tx.get(`${base}/ports/${documentId(input.portId)}`),till=await tx.get(`${base}/accounts/${shopAccountId(input.shopId)}`);
    requireThat(payer.active,'INVALID_RECIPIENT');requireThat(shop?.versionId===s.versionId&&port?.versionId===s.versionId&&till?.ownerType==='SHOP'&&till.shopId===shop.id,'ACCOUNT_UNAVAILABLE');moneyState(till);requireThat(!sh.docked||port.id!==sh.portId,'TOWING_RECOVERY_SAME_PORT');
    requireThat(!(await tx.list(`${base}/shipMaintenance`)).some(r=>r.towingRecoveryVersion===1&&r.shipId===sh.id&&open(r)),'TOWING_WORK_OPEN');
    const source=admissionText(input.source,1000,true),reason=admissionText(input.reason,500,true),amount=spaceShipProfiles.find(p=>p.id===sh.soProfile.id).referencePrice*0.05,binding={ship:sh,payerVersion:payer.version,shopVersion:shop.versionId,portVersion:port.versionId},data={shipId:sh.id,shipName:sh.name,payerId:payer.c.id,payerName:payer.c.public.displayName,payerVersion:payer.version,shopId:shop.id,provider:shop.name,portId:port.id,portName:port.name,amount,binding,source,reason},confirmation=hash(JSON.stringify([s.id,s.revision,data]));
    if(reads.has(action))return {shipName:sh.name,payerName:payer.c.public.displayName,provider:shop.name,portName:port.name,amount,source,confirmation};requireThat(input.confirmation===confirmation,'STALE_REVISION');return write({id,towingRecoveryVersion:1,...data,status:'RECOVERY_OFFERED',revision:1,createdAt:at},reason);
   }
   const r=await tx.get(`${base}/shipMaintenance/${documentId(input.recoveryId)}`);requireThat(r?.towingRecoveryVersion===1&&(admin||r.payerId===c.id&&r.payerVersion===version),'FORBIDDEN');if(prior)return replay();requireThat(open(r),'TOWING_WORK_CLOSED');
   const sh=await tx.get(`${base}/ships/${r.shipId}`),a=await tx.get(`${base}/accounts/${accountId(r.payerId)}`),b=await tx.get(`${base}/accounts/${shopAccountId(r.shopId)}`),port=await tx.get(`${base}/ports/${r.portId}`);
   const proof=hash(JSON.stringify([s.id,s.revision,r,version??null]));
   if(cancel){
    requireThat(input.confirmation===proof,'STALE_REVISION');const reason=admissionText(input.reason,500,true);
    if(r.status==='RECOVERY_ACTIVE'){requireThat(sh?.rescueId===r.id,'TOWING_RESERVATION');moneyState(a);requireThat(a.reserved>=r.amount,'INSUFFICIENT_FUNDS');authorizeSpaceOutlaws(tx,s,'TOWING_RECOVERY');tx.set(`${base}/accounts/${a.id}`,{...a,reserved:a.reserved-r.amount,revision:a.revision+1});tx.set(`${base}/ships/${sh.id}`,{...sh,rescueId:null,revision:sh.revision+1});}
    return write({...r,status:'RECOVERY_CANCELLED',closedAt:at,revision:r.revision+1},reason);
   }
   await target(tx,s,r.shipId,r.status==='RECOVERY_ACTIVE'?r.id:null);requireThat(port?.versionId===s.versionId,'SHIP_NOT_LOCAL');requireThat(a?.ownerType==='CHARACTER'&&a.characterId===r.payerId&&b?.ownerType==='SHOP'&&b.shopId===r.shopId,'ACCOUNT_UNAVAILABLE');const before=moneyState(a);moneyState(b);whole(b.balance+r.amount,'BALANCE_OVERFLOW');
   const confirmation=hash(JSON.stringify([proof,sh,a,b,port]));
   if(['prepareTowingRecovery','acceptTowingRecovery'].includes(action)){
    requireThat(r.status==='RECOVERY_OFFERED'&&isDeepStrictEqual(sh,r.binding.ship),'TOWING_WORK_STALE');requireThat(c.hp>0&&!c.outOfCombat&&!c.survival?.dead,'OUT_OF_COMBAT');requireThat(before.available>=r.amount,'INSUFFICIENT_FUNDS');
    if(reads.has(action))return {...publicRecovery(r,confirmation,false,true),before,after:{available:before.available-r.amount}};requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');authorizeSpaceOutlaws(tx,s,'TOWING_RECOVERY');tx.set(`${base}/accounts/${a.id}`,{...a,reserved:a.reserved+r.amount,revision:a.revision+1});const nextShip={...sh,rescueId:r.id,revision:sh.revision+1};tx.set(`${base}/ships/${sh.id}`,nextShip);return write({...r,status:'RECOVERY_ACTIVE',acceptedShip:nextShip,acceptedAt:at,revision:r.revision+1},'Prestation PNJ acceptée ; fonds et bâtiment réservés, aucun déplacement');
   }
   requireThat(r.status==='RECOVERY_ACTIVE'&&sh.rescueId===r.id&&isDeepStrictEqual(sh,r.acceptedShip),'TOWING_RESERVATION');requireThat(before.reserved>=r.amount,'INSUFFICIENT_FUNDS');
   const crew=[];if(sh.journey)for(const m of sh.journey.manifest){const ch=await tx.get(`${base}/characters/${m.id}`);requireThat(ch?.activeVoyageId===sh.journey.id,'INVALID_MANIFEST');crew.push(ch);}
   const finalProof=hash(JSON.stringify([confirmation,crew]));if(reads.has(action))return {...publicRecovery(r,finalProof,true,true),source:r.source};requireThat(input.confirmation===finalProof,'STALE_REVISION');requireThat(input.performed===true,'FIELD_PRESENCE_REQUIRED');const reason=admissionText(input.reason,500,true);
   authorizeSpaceOutlaws(tx,s,'TOWING_RECOVERY');const an={...a,balance:a.balance-r.amount,reserved:a.reserved-r.amount,revision:a.revision+1},bn={...b,balance:b.balance+r.amount,revision:b.revision+1};tx.set(`${base}/accounts/${a.id}`,an);tx.set(`${base}/accounts/${b.id}`,bn);
   writeLedger(tx,s.id,{id,kind:'SHIP_MAINTENANCE',at,actorUid:actor.uid,memo:`Remorquage PNJ : 5 % (${r.amount} Cr), carburant inclus`,source:accountParty({a,name:r.payerName}),recipient:accountParty({a:b,name:r.provider}),createdCurrency:0,removedCurrency:0,entries:[accountEntry(a,-r.amount,an),accountEntry(b,r.amount,bn)]});
   const {wreckSpacePosition,...rest}=sh;tx.set(`${base}/ships/${sh.id}`,{...rest,docked:true,portId:r.portId,journey:null,rescueId:null,revision:sh.revision+1});
   if(sh.journey){tx.set(`${base}/voyages/${sh.journey.id}`,{...sh.journey,shipId:sh.id,status:'RECOVERED',recoveryId:r.id,recoveredPortId:r.portId,closedAt:at});for(const ch of crew)tx.set(`${base}/characters/${ch.id}`,{...ch,activeVoyageId:null,spacePortId:r.portId});}
   return write({...r,status:'RECOVERY_COMPLETED',recoveredFrom:wreckSpacePosition??sh.journey??{portId:sh.portId},closedAt:at,revision:r.revision+1},reason);
  });
 };
}
