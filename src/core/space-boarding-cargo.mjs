import {documentId,requireThat} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryHash as hash,itemQuantity,readLot} from './inventory-state.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {moneyText} from './economy-state.mjs';
import {stockVolume,warehouseStock,incomingVolume} from './storage-state.mjs';
import {reserveCargoBatch,finishCargoBatch} from './cargo-batches.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {gameTime} from './clock.mjs';

const preparation=['combatId','boardingId','lotId','quantity','direction','reason','present','ordinary'];
const fields={prepareBoardingCargoTransfer:preparation,startBoardingCargoTransfer:[...preparation,'confirmation'],prepareBoardingCargoReceipt:['combatId','boardingId','transferId'],receiveBoardingCargo:['combatId','boardingId','transferId','confirmation','received'],cancelBoardingCargoTransfer:['combatId','boardingId','transferId','confirmation','reason']};
export const boardingCargoActions=Object.keys(fields);
const reads=new Set(['prepareBoardingCargoTransfer','prepareBoardingCargoReceipt']);
const ownerOf=l=>({type:l.ownerType??'CHARACTER',id:l.ownerId});
const local=x=>x?.soProfile&&x.docked&&!x.journey&&!x.operation&&!x.combatId&&!x.rescueId&&!x.maintenanceId;
const original=(e,ship)=>ship?.journey?.id===e.journeyIds?.[ship.id]&&ship.combatId===e.id;
const same=(a,b)=>a?.kind===b?.kind&&a?.id===b?.id;
export async function boardingCargoProjection(tx,s,r,time,admin){
 if(s.spaceOutlaws.boardingCargoVersion!==1||r.cargoVersion!==1)return {};
 const rows=(await tx.list(`sessions/${s.id}/cargoTransfers`,['boardingId',r.id])).filter(t=>t.boardingContext?.boardingId===r.id);
 return {cargoReady:admin,cargoTransfers:rows.map(t=>({id:t.id,lotId:t.lotId,name:t.name,quantity:t.quantity,volume:t.volume,direction:t.boardingContext.direction,status:t.status,remainingSeconds:t.status==='LOADING'?Math.max(0,Math.ceil((t.readyAtGameMs-time)/1000)):null})),cargoOpen:rows.some(t=>t.status==='LOADING')};
}
export function createBoardingCargoService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);admissionKeys(input,['sessionId',...fields[action],...(reads.has(action)?[]:['requestId'])]);const at=now(),id=uuid();
  return store.runTransaction(async tx=>{
   const s=await checkSession(tx,actor,documentId(input.sessionId)),base=`sessions/${s.id}`,time=gameTime(s.clock,at);requireThat(s.spaceOutlaws?.boardingCargoVersion===1&&s.spaceOutlaws.logisticsVersion===1,'SO_GAMEPLAY_NOT_OPEN');
   const e=await tx.get(`${base}/spaceCombats/${documentId(input.combatId)}`),rp=`${base}/spaceCombats/${documentId(input.combatId)}/boardings/${documentId(input.boardingId)}`,r=await tx.get(rp);requireThat(e?.status==='CLOSED'&&r?.cargoVersion===1,'BOARDING_UNAVAILABLE');
   const sourceShip=await tx.get(`${base}/ships/${r.targetShipId}`),receiver=await tx.get(`${base}/ships/${r.attackerShipId}`),active=r.status==='CONTROLLED'&&e.activeBoardingId===r.id&&original(e,sourceShip)&&original(e,receiver);
   requireThat(sourceShip&&receiver,'CARGO_UNAVAILABLE');
   const transfer=input.transferId?await tx.get(`${base}/cargoTransfers/${documentId(input.transferId)}`):null;
   if(input.transferId)requireThat(transfer?.boardingContext?.boardingId===r.id&&transfer.boardingContext.combatId===e.id,'FORBIDDEN');
   const lot=await readLot(tx,s.id,documentId(transfer?.lotId??input.lotId),at);requireThat(lot,'CARGO_UNAVAILABLE');
   const direction=transfer?.boardingContext.direction??input.direction;requireThat(['TAKE','RETURN'].includes(direction),'INVALID_DESTINATION');
   const owner=await inventoryParty(tx,s.id,lot.ownerId),custodian=receiver?.pilotId?await inventoryParty(tx,s.id,receiver.pilotId):null;
   const members=await Promise.all(r.crew.map(async p=>({...p,...await inventoryParty(tx,s.id,p.id)}))),port=receiver.portId?await tx.get(`${base}/ports/${receiver.portId}`):null;
   const stock=receiver?await warehouseStock(tx,s.id,receiver.id,'HOLD'):[],incoming=receiver?await incomingVolume(tx,s.id,receiver.id,'HOLD'):0,pending=await tx.list(`${base}/cargoTransfers`);
   const proof=()=>hash(JSON.stringify([s.revision,e.revision,r,transfer,lot,sourceShip,receiver,owner,custodian,members,port,stock,incoming]));
   const op=reads.has(action)?null:`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input]));
   if(op){const old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}}
   const write=(batch,before,after,reason)=>{authorizeSpaceOutlaws(tx,s,'SO_CARGO');authorizeSpaceOutlaws(tx,s,'SPACE_COMBAT');tx.set(rp,{...r,revision:r.revision+1});tx.set(`${base}/logisticsHistory/${id}`,{...batch.event,boardingId:r.id,combatId:e.id,direction,reason,before,after});tx.set(`${base}/audit/${id}`,{id,action,at,actorUid:actor.uid});tx.set(op,{fingerprint,result:batch.result,at});return batch.result;};
   const running=()=>{requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
   const placeCheck=()=>{
    requireThat(receiver?.soProfile&&['CARGO','TRANSPORT'].includes(receiver.soProfile.id)&&receiver.capacity>0,'BOARDING_CARGO_RECEIVER');
    if(direction==='TAKE'){
     requireThat(active&&sourceShip.journey.routeId===receiver.journey.routeId,'BOARDING_CLOSED');
     requireThat(members.every(p=>{const ship=p.shipId===sourceShip.id?sourceShip:receiver;return ship.journey.manifest.some(m=>m.id===p.id)&&p.c?.activeVoyageId===ship.journey.id;})&&[sourceShip,receiver].every(ship=>ship.journey.manifest.length===r.crew.filter(p=>p.shipId===ship.id).length),'BOARDING_CREW_CHANGED');
     requireThat(custodian?.active&&!custodian.c.survival?.dead&&r.crew.some(p=>p.id===receiver.pilotId&&p.shipId===receiver.id&&p.version===custodian.version),'FORBIDDEN');
     requireThat((lot.pillable??lot.item.pillable)===true&&lot.transferable!==false&&lot.ownerType!=='GROUP'&&lot.ownerType!=='SHOP'&&!lot.transportContractId&&!lot.boardingCustody&&!lot.hidden&&!lot.containerId&&!lot.compartmentId&&!lot.security,'BOARDING_CARGO_RESTRICTED');
     requireThat((lot.ownerType??'CHARACTER')==='CHARACTER'&&owner.c&&r.crew.some(p=>p.id===lot.ownerId&&p.shipId===r.targetShipId)&&same(lot.location,{kind:'HOLD',id:sourceShip.id}),'BOARDING_CARGO_RESTRICTED');
    }else{
     const custody=lot.boardingCustody;
     requireThat(custody?.boardingId===r.id&&custody.combatId===e.id&&custody.receiverShipId===receiver.id&&custody.sourceShipId===sourceShip.id&&same(lot.location,{kind:'HOLD',id:receiver.id}),'BOARDING_CARGO_RESTRICTED');
     requireThat(port&&local(receiver)&&owner.active&&!owner.c.survival?.dead&&owner.c.hp>0&&!owner.c.activeVoyageId&&(owner.c.spacePortId??s.transportRules.homePort)===receiver.portId,'SHIP_NOT_LOCAL');
    }
   };
   if(['prepareBoardingCargoTransfer','startBoardingCargoTransfer'].includes(action)){
    running();requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(input.ordinary===true,'BOARDING_CARGO_ACCESS');placeCheck();requireThat(lot.status==='AVAILABLE','INSUFFICIENT_STOCK');
    const quantity=itemQuantity(lot.item,input.quantity);requireThat(quantity<=lot.quantity,'INSUFFICIENT_STOCK');const volume=stockVolume([{...lot,quantity}]);requireThat(volume>0&&volume<=5,'SO_CARGO_BATCH');
    const source={kind:'HOLD',id:direction==='TAKE'?sourceShip.id:receiver.id},destination=direction==='TAKE'?{kind:'HOLD',id:receiver.id}:{kind:'CHARACTER',id:owner.c.id};
    requireThat(!pending.some(t=>t.status==='LOADING'&&same(t.source,source)),'CARGO_TRANSFERS_OPEN');if(direction==='TAKE')requireThat(stockVolume(stock)+incoming+volume<=receiver.capacity,'WAREHOUSE_FULL');
    const reason=moneyText(input.reason),confirmation=hash(JSON.stringify([proof(),quantity,direction,reason]));
    const view={name:lot.item.name,quantity,volume,direction,sourceName:direction==='TAKE'?sourceShip.name:receiver.name,destinationName:direction==='TAKE'?receiver.name:owner.c.public.displayName,durationSeconds:180,confirmation};
    if(action==='prepareBoardingCargoTransfer')return view;requireThat(input.confirmation===confirmation,'STALE_REVISION');
    const t={status:'LOADING',revision:1,name:lot.item.name,quantity,volume,source,destination,sourceName:view.sourceName,destinationName:view.destinationName,owner:ownerOf(lot),at,actorUid:actor.uid,characterId:null,clearance:null,readyAtGameMs:time+180000,boardingId:r.id,boardingContext:{combatId:e.id,boardingId:r.id,direction,custodianId:receiver.pilotId}};
    const batch=reserveCargoBatch(tx,s.id,{lot,quantity,transfer:t,id,at,actorUid:actor.uid});for(const ship of direction==='TAKE'?[sourceShip,receiver]:[receiver])tx.set(`${base}/ships/${ship.id}`,{...ship,revision:ship.revision+1});return write(batch,lot,batch.reserved,reason);
   }
   const t=transfer;requireThat(t?.status==='LOADING'&&lot.status==='CARGO_RESERVED'&&lot.cargoTransferId===t.id&&lot.quantity===t.quantity&&same(lot.location,t.source)&&JSON.stringify(ownerOf(lot))===JSON.stringify(t.owner),'CARGO_TRANSFER_CLOSED');
   const confirmation=proof();if(action==='prepareBoardingCargoReceipt')return {name:t.name,quantity:t.quantity,direction,status:t.status,remainingSeconds:Math.max(0,Math.ceil((t.readyAtGameMs-time)/1000)),canReceive:s.stage==='EN_JEU'&&!s.safetyStop?.active&&time>=t.readyAtGameMs,confirmation};
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(input.confirmation===confirmation,'STALE_REVISION');const receive=action==='receiveBoardingCargo';
   if(receive){running();placeCheck();requireThat(time>=t.readyAtGameMs,'SO_CARGO_NOT_READY');requireThat(input.received===true,'CARGO_RECEIPT_REQUIRED');if(direction==='TAKE')requireThat(stockVolume(stock)+incoming<=receiver.capacity,'WAREHOUSE_FULL');}
   else requireThat(action==='cancelBoardingCargoTransfer'&&['BRIEFING','EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');
   const patch=receive?direction==='TAKE'?{holderId:t.boardingContext.custodianId,boardingCustody:{combatId:e.id,boardingId:r.id,sourceShipId:sourceShip.id,receiverShipId:receiver.id}}:{holderId:lot.ownerId,boardingCustody:null}:{};
   const reason=receive?'Réception physique de fret sous garde confirmée par le MJ':moneyText(input.reason),batch=finishCargoBatch(tx,s.id,{lot,transfer:t,receive,id,at,actorUid:actor.uid,reason,patch});
   for(const ship of direction==='TAKE'?[sourceShip,receiver]:[receiver])tx.set(`${base}/ships/${ship.id}`,{...ship,revision:ship.revision+1});return write(batch,lot,batch.next,reason);
  });
 };
}
