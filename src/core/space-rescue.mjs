import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryHash as hash,lotState,itemQuantity} from './inventory-state.mjs';
import {inventoryPlayer,inventoryParty} from './inventory-transfers.mjs';
import {accountId,moneyState,moneyText,writeLedger} from './economy-state.mjs';
import {accountEntry,accountParty} from './collective-accounts.mjs';
import {shopStockId,shopAccountId} from './space-outlaws-shop-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {hasSoCombat,resumeSpaceJourney} from './space-combat-state.mjs';
import {gameTime} from './clock.mjs';

const offerFields=['shipId','shopId','offerId','quantity','source','reason','present'];
const fields={spaceRescues:[],spaceRescueAdmin:[],prepareSpaceRescueOffer:offerFields,offerSpaceRescue:[...offerFields,'confirmation'],prepareSpaceRescue:['rescueId'],startSpaceRescue:['rescueId','confirmation','present'],finishSpaceRescue:['rescueId','confirmation','received'],cancelSpaceRescue:['rescueId','confirmation','reason'],cancelSpaceRescueAdmin:['rescueId','confirmation','reason']};
export const spaceRescueActions=Object.keys(fields);
const reads=new Set(['spaceRescues','spaceRescueAdmin','prepareSpaceRescueOffer','prepareSpaceRescue']);
const admins=new Set(['spaceRescueAdmin','prepareSpaceRescueOffer','offerSpaceRescue','cancelSpaceRescueAdmin']);
const active=s=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const eligible=(ship,journeyId)=>ship?.journey?.id===journeyId&&ship.journey.suspended&&ship.journey.event.fuelDebt>0&&!ship.combatId&&!ship.maintenanceId&&!ship.operation;
const view=(r,time,confirmation)=>({id:r.id,shipId:r.shipId,shipName:r.shipName,provider:r.provider,quantity:r.quantity,amount:r.amount,intervention:100,fuelPrice:25,status:r.status,remainingSeconds:r.status==='ACTIVE'?Math.max(0,Math.ceil((r.readyAtGameMs-time)/1000)):null,confirmation});
export function createSpaceRescueService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const admin=admins.has(action),ctx=admin?{s:await checkSession(tx,actor,documentId(input.sessionId))}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx,base=`sessions/${s.id}`,time=gameTime(s.clock,at);requireThat(hasSoCombat(s),'SO_GAMEPLAY_NOT_OPEN');
   const proof=r=>hash(JSON.stringify([r,s.revision,version??null]));
   if(action==='spaceRescues'||action==='spaceRescueAdmin'){
    const rows=await tx.list(`${base}/spaceRescues`),out=[];for(const r of rows){if(!admin&&r.pilotId!==c.id)continue;out.push(view(r,time,proof(r)));}
    const choices=[];if(admin)for(const shop of await tx.list(`${base}/shops`))for(const offer of await tx.list(`${base}/shops/${shop.id}/offers`)){const lot=await tx.get(`${base}/inventory/${shopStockId(offer.id)}`);if(offer.unitPrice===25&&offer.item.kind==='STACKABLE'&&offer.item.consumable&&!offer.item.laserRecharge)choices.push({shopId:shop.id,offerId:offer.id,itemId:offer.item.id,name:`${shop.name} · ${offer.name}`,stock:lot?.status==='AVAILABLE'?lot.quantity:0});}
    return {session:{id:s.id,stage:s.stage},admin,rescues:out,...(admin?{choices,ships:(await tx.list(`${base}/ships`)).filter(x=>x.journey?.event.fuelDebt>0&&!x.combatId&&!x.rescueId).map(x=>({id:x.id,name:x.name,fuelItemId:x.navigation.fuelItemId,fuelDebt:x.journey.event.fuelDebt,tankCapacity:x.navigation.tankCapacity}))}:{})};
   }
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(admin||old.guard===version,'FORBIDDEN');return old.result;}}
   const audit=(result,before,after,extra={})=>{authorizeSpaceOutlaws(tx,s,'SPACE_RESCUE');tx.set(`${base}/logisticsHistory/${id}`,{id,kind:action,at,actorUid:actor.uid,before,after,...extra});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,guard:version??null,result,at});return result;};
   if(['prepareSpaceRescueOffer','offerSpaceRescue'].includes(action)){
    active(s);requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const ship=await tx.get(`${base}/ships/${documentId(input.shipId)}`);requireThat(eligible(ship,ship?.journey?.id)&&!ship.rescueId,'VOYAGE_SUSPENDED');const pilot=await inventoryParty(tx,s.id,ship.pilotId);requireThat(pilot.active,'INVALID_RECIPIENT');
    const shop=await tx.get(`${base}/shops/${documentId(input.shopId)}`),offer=await tx.get(`${base}/shops/${documentId(input.shopId)}/offers/${documentId(input.offerId)}`);requireThat(shop?.versionId===s.versionId&&offer?.versionId===s.versionId&&offer.unitPrice===25&&offer.item.id===ship.navigation.fuelItemId,'SO_FUEL_OFFER_REQUIRED');
    const quantity=itemQuantity(offer.item,input.quantity);requireThat(quantity>=ship.journey.event.fuelDebt&&ship.fuel+quantity<=ship.navigation.tankCapacity,'TANK_FULL');const source=moneyText(input.source),reason=moneyText(input.reason),amount=whole(100+25*quantity,'INVALID_AMOUNT');
    const result={shipId:ship.id,shipName:ship.name,provider:shop.name,quantity,amount,intervention:100,fuelPrice:25,durationSeconds:120,source,reason,confirmation:hash(JSON.stringify([s.revision,ship,shop,offer,quantity,source,reason,pilot.version]))};
    if(action==='prepareSpaceRescueOffer')return result;requireThat(input.confirmation===result.confirmation,'STALE_REVISION');
    const prior=await tx.list(`${base}/spaceRescues`);requireThat(!prior.some(r=>r.shipId===ship.id&&['OFFERED','ACTIVE'].includes(r.status)),'SPACE_SHIP_BUSY');
    const r={id,shipId:ship.id,shipName:ship.name,journeyId:ship.journey.id,pilotId:ship.pilotId,pilotVersion:pilot.version,provider:shop.name,shopId:shop.id,offerId:offer.id,fuelItemId:offer.item.id,quantity,amount,status:'OFFERED',revision:1,createdAt:at,source,reason};tx.set(`${base}/spaceRescues/${id}`,r);return audit({id,status:'OFFERED'},null,r);
   }
   const r=await tx.get(`${base}/spaceRescues/${documentId(input.rescueId)}`);requireThat(r&&(admin||r.pilotId===c.id),'FORBIDDEN');
   const ship=await tx.get(`${base}/ships/${r.shipId}`),pilot=await inventoryParty(tx,s.id,r.pilotId),cancel=action.startsWith('cancel');
   if(cancel){requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(['EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');}else {active(s);requireThat(pilot.active&&pilot.version===r.pilotVersion&&ship?.pilotId===c.id&&c.hp>0&&!c.outOfCombat,'INVALID_RECIPIENT');}
   const lot=await tx.get(`${base}/inventory/${shopStockId(r.offerId)}`),a=await tx.get(`${base}/accounts/${accountId(r.pilotId)}`),b=await tx.get(`${base}/accounts/${shopAccountId(r.shopId)}`);
   if(action==='prepareSpaceRescue'||action==='startSpaceRescue'){
    requireThat(r.status==='OFFERED'&&eligible(ship,r.journeyId)&&!ship.rescueId,'SPACE_SHIP_BUSY');
    requireThat(lot?.ownerType==='SHOP'&&lot.ownerId===r.shopId&&lot.location.kind==='SHOP'&&lot.item.id===r.fuelItemId&&lot.status==='AVAILABLE'&&lot.quantity>=r.quantity,'INSUFFICIENT_STOCK');
    requireThat(lot.transferable!==false||ship.ownerId===c.id,'SO_PROTECTED_PURCHASE');requireThat(a?.ownerType==='CHARACTER'&&a.characterId===c.id&&b?.ownerType==='SHOP'&&b.shopId===r.shopId,'ACCOUNT_UNAVAILABLE');
    const before=moneyState(a);moneyState(b);requireThat(before.available>=r.amount,'INSUFFICIENT_FUNDS');whole(b.balance+r.amount,'BALANCE_OVERFLOW');requireThat(ship.fuel+r.quantity<=ship.navigation.tankCapacity,'TANK_FULL');
    const confirmation=hash(JSON.stringify([proof(r),ship,lot,a,b])),result={...view(r,time,confirmation),before,after:{...before,available:before.available-r.amount,reserved:before.reserved+r.amount},durationSeconds:120};
    if(action==='prepareSpaceRescue')return result;requireThat(input.confirmation===confirmation,'STALE_REVISION');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
    const next={...r,status:'ACTIVE',readyAtGameMs:time+120000,revision:r.revision+1};tx.set(`${base}/spaceRescues/${r.id}`,next);tx.set(`${base}/ships/${ship.id}`,{...ship,rescueId:r.id,revision:ship.revision+1});tx.set(`${base}/accounts/${a.id}`,{...a,reserved:a.reserved+r.amount,revision:a.revision+1});tx.set(`${base}/inventory/${lot.id}`,{...lot,status:'FIELD_RESERVED',fieldActionId:r.id,revision:lot.revision+1});return audit({id:r.id,status:'ACTIVE'},r,next);
   }
   requireThat(input.confirmation===proof(r),'STALE_REVISION');requireThat(['OFFERED','ACTIVE'].includes(r.status),'RESCUE_CLOSED');
   if(r.status==='ACTIVE'){
    requireThat(ship?.rescueId===r.id&&lot?.status==='FIELD_RESERVED'&&lot.fieldActionId===r.id,'SPACE_SHIP_BUSY');moneyState(a);requireThat(a.reserved>=r.amount,'INSUFFICIENT_FUNDS');
    if(!cancel){requireThat(action==='finishSpaceRescue'&&input.received===true,'HANDOVER_REQUIRED');requireThat(time>=r.readyAtGameMs,'VOYAGE_NOT_READY');requireThat(eligible(ship,r.journeyId),'VOYAGE_SUSPENDED');moneyState(b);whole(b.balance+r.amount,'BALANCE_OVERFLOW');}
    const nextLot={...lot,quantity:lot.quantity-(cancel?0:r.quantity),status:'AVAILABLE',fieldActionId:null,revision:lot.revision+1},an={...a,balance:a.balance-(cancel?0:r.amount),reserved:a.reserved-r.amount,revision:a.revision+1};
    let nextShip={...ship,rescueId:null,revision:ship.revision+1};
    if(!cancel){const debt=ship.journey.event.fuelDebt;nextShip={...nextShip,fuel:ship.fuel+r.quantity-debt,journey:{...ship.journey,event:{...ship.journey.event,fuelDebt:0,fuelCost:ship.journey.event.fuelCost+debt}}};requireThat(nextShip.fuel<=ship.navigation.tankCapacity&&nextShip.fuel>=0,'TANK_FULL');nextShip=resumeSpaceJourney(nextShip,time);const bn={...b,balance:b.balance+r.amount,revision:b.revision+1};tx.set(`${base}/accounts/${b.id}`,bn);writeLedger(tx,s.id,{id,kind:'SPACE_RESCUE',at,actorUid:actor.uid,memo:`Dépannage : 100 Cr + ${r.quantity} × 25 Cr`,source:accountParty({a,name:pilot.c.public.displayName}),recipient:accountParty({a:b,name:r.provider}),createdCurrency:0,removedCurrency:0,entries:[accountEntry(a,-r.amount,an),accountEntry(b,r.amount,bn)]});}
    tx.set(`${base}/accounts/${a.id}`,an);tx.set(`${base}/inventory/${lot.id}`,nextLot);tx.set(`${base}/inventory/${lot.id}/history/${id}`,{id,kind:action,at,before:lotState(lot),after:lotState(nextLot)});tx.set(`${base}/ships/${ship.id}`,nextShip);tx.set(`${base}/voyages/${ship.journey.id}`,{...nextShip.journey,shipId:ship.id,status:nextShip.journey.suspended?'SUSPENDED':'IN_TRANSIT'});
   }else requireThat(cancel,'RESCUE_CLOSED');
   const next={...r,status:cancel?'CANCELLED':'COMPLETED',revision:r.revision+1,closedAt:at};tx.set(`${base}/spaceRescues/${r.id}`,next);return audit({id:r.id,status:next.status},r,next,cancel?{reason:moneyText(input.reason)}:{});
  });
 };
}
