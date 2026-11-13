import {mediaFields} from './media-state.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {standardShipModuleQuote} from '../shared/space-ship-modules.mjs';
export const inventoryHash=v=>createHash('sha256').update(v).digest('hex');
const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_ITEM');return v.trim();};
export function itemInput(input,id,old={}){
  requireThat(['INDIVIDUAL','STACKABLE'].includes(input.kind)&&typeof input.consumable==='boolean','INVALID_ITEM');
  requireThat(['DRAFT','READY','PUBLISHED'].includes(input.publicationState),'INVALID_ITEM');
  requireThat(['UNSPECIFIED','LEGAL','ILLEGAL'].includes(input.legality??'UNSPECIFIED'),'INVALID_ITEM');
  requireThat(input.pillable===undefined||typeof input.pillable==='boolean','INVALID_ITEM');
  requireThat(input.concealable===undefined||typeof input.concealable==='boolean','INVALID_ITEM');
  requireThat(input.pickpocketable===undefined||typeof input.pickpocketable==='boolean','INVALID_ITEM');
  const laserRecharge=input.laserRecharge===undefined?old.laserRecharge??null:input.laserRecharge;
  if(laserRecharge!==null)requireThat(input.consumable&&Number.isSafeInteger(laserRecharge?.pelletsPerUnit)&&laserRecharge.pelletsPerUnit>0,'INVALID_RECHARGE');
  const shipModule=input.shipModule===undefined?old.shipModule??null:input.shipModule;
  if(shipModule!==null)requireThat(typeof shipModule==='object'&&!Array.isArray(shipModule)&&Object.keys(shipModule).length===2&&Object.hasOwn(shipModule,'code')&&Object.hasOwn(shipModule,'size')&&standardShipModuleQuote(shipModule)!==null&&input.kind==='INDIVIDUAL'&&!input.consumable&&laserRecharge===null,'INVALID_SHIP_MODULE');
  const knowledgeId=input.knowledgeId===undefined?old.knowledgeId??null:input.knowledgeId;
  if(knowledgeId!==null){documentId(knowledgeId);requireThat(input.kind==='INDIVIDUAL'&&!input.consumable&&!shipModule&&!laserRecharge,'INVALID_ITEM');}
  const unitVolume=input.unitVolume==null?null:whole(input.unitVolume,'INVALID_ITEM');
  // Optional canonical preparation price for each inventory unit, not a sale or tax.
  const referenceUnitValueCr=input.referenceUnitValueCr===undefined?old.referenceUnitValueCr??null:input.referenceUnitValueCr;
  requireThat(referenceUnitValueCr===null||Number.isSafeInteger(referenceUnitValueCr)&&referenceUnitValueCr>0,'INVALID_REFERENCE_VALUE');
  return {...(input.concealable!==undefined||old.concealable!==undefined?{concealable:input.concealable??old.concealable}:{}),...(knowledgeId?{knowledgeId}:{}),...mediaFields(old,['illustration']),id,name:text(input.name,150,true),description:text(input.description??'',6000),category:text(input.category??'',150),
    pillable:input.pillable??old.pillable??false,...(input.pickpocketable!==undefined||old.pickpocketable!==undefined?{pickpocketable:input.pickpocketable??old.pickpocketable}:{}),unit:text(input.unit??'unité',50,true),kind:input.kind,consumable:input.consumable,unitVolume,legality:input.legality??'UNSPECIFIED',...(referenceUnitValueCr===null?{}:{referenceUnitValueCr}),
    ...(shipModule?{shipModule:{code:shipModule.code,size:shipModule.size}}:{}),...(laserRecharge?{laserRecharge:{pelletsPerUnit:laserRecharge.pelletsPerUnit}}:{}),gmNotes:text(input.gmNotes??'',10000),publicationState:input.publicationState,revision:(old.revision??0)+1};
}
export const publicItem=d=>({...(d.concealable!==undefined?{concealable:d.concealable}:{}),...(d.knowledgeId?{knowledgeId:d.knowledgeId}:{}),...(d.shipModule?{shipModule:{code:d.shipModule.code,size:d.shipModule.size}}:{}),...(d.laserRecharge?{laserRecharge:{pelletsPerUnit:d.laserRecharge.pelletsPerUnit}}:{}),...mediaFields(d,['illustration']),id:d.id,name:d.name,pillable:d.pillable??false,pickpocketable:d.pickpocketable??false,description:d.description,category:d.category,unit:d.unit,kind:d.kind,consumable:d.consumable,unitVolume:d.unitVolume,legality:d.legality,...(d.referenceUnitValueCr==null?{}:{referenceUnitValueCr:d.referenceUnitValueCr}),revision:d.revision});
export function itemQuantity(definition,value,allowZero=false){
  const quantity=whole(value,'INVALID_QUANTITY');requireThat((allowZero||quantity>0)&&(definition.kind!=='INDIVIDUAL'||quantity<=1),'INVALID_QUANTITY');return quantity;
}
// Reservations expire on server time. The virtual revision invalidates old consent even before a write persists the release.
export function effectiveLot(l,at){
  // Customs custody ends after fifteen *real* minutes, even if the game clock
  // is paused or the organizer has not reopened their dashboard. Retain the
  // separate MJ case for audit, but never keep the item blocked after expiry.
  const available=l?.status==='CUSTOMS_HELD'
    &&Number.isSafeInteger(l.customsDetention?.expiresAt)&&at>=l.customsDetention.expiresAt
      ?{...l,status:'AVAILABLE',revision:l.revision+1,customsDetention:null}:l;
  return available?.status==='RESERVED'
    &&Number.isSafeInteger(available.marketReservation?.expiresAt)&&at>=available.marketReservation.expiresAt
      ?{...available,status:'AVAILABLE',revision:available.revision+1,marketReservation:null}:available;
}
export const readLot=async(tx,sid,id,at)=>effectiveLot(await tx.get(`sessions/${sid}/inventory/${id}`),at);
export const lotState=l=>({quantity:l.quantity,status:l.status,revision:l.revision});
export const personalLot=(l,cid)=>(l.ownerType??'CHARACTER')==='CHARACTER'&&l.ownerId===cid&&l.holderId===cid&&l.location.kind==='CHARACTER'&&l.location.id===cid;
export const publicLot=l=>({id:l.id,...(l.boardingCustody?{boardingCustody:{combatId:l.boardingCustody.combatId,boardingId:l.boardingCustody.boardingId}}:{}),...(l.transferable!==undefined?{transferable:l.transferable}:{}),...(l.resellable!==undefined?{resellable:l.resellable}:{}),pillable:(l.pillable??l.item.pillable)===true,item:publicItem(l.item),quantity:l.quantity,status:l.status,revision:l.revision,ownerType:l.ownerType??'CHARACTER',ownerId:l.ownerId,holderId:l.holderId,location:l.location,...(l.status==='RESERVED'?{marketReservation:{listingId:l.marketReservation.listingId,expiresAt:l.marketReservation.expiresAt}}:{})});
export function newLot(id,item,quantity,characterId,at,origin){
  return {id,item:publicItem(item),quantity:itemQuantity(item,quantity),ownerId:characterId,holderId:characterId,location:{kind:'CHARACTER',id:characterId},status:'AVAILABLE',revision:1,createdAt:at,origin};
}
export function seedInventory(tx,sid,characters,at,actorUid){
  for(const c of characters)for(const x of c.startingInventory?.items??[]){
    const id=inventoryHash(`initial:${c.id}:${x.item.id}`),lot=newLot(id,x.item,x.quantity,c.id,at,{kind:'SCENARIO_VERSION'});
    tx.set(`sessions/${sid}/inventory/${id}`,lot);
    tx.set(`sessions/${sid}/inventory/${id}/history/${id}`,{id,kind:'INITIAL',at,actorUid,reason:'Matériel de la version figée',before:null,after:lotState(lot)});
  }
}
export async function validateConsumable(tx,base,healing){
  const cost=healing?.consumable;if(!cost)return;
  const d=await tx.get(`${base}/items/${cost.itemId}`);
  requireThat(d?.publicationState==='PUBLISHED'&&d.consumable,'INVALID_CONSUMABLE');
  itemQuantity(d,cost.quantity);healing.consumable={itemId:d.id,quantity:cost.quantity,name:d.name,unit:d.unit,itemRevision:d.revision};
}
export async function treatmentLot(tx,sid,cid,cost,lotId,at){
  if(!cost)return null;
  const l=await readLot(tx,sid,documentId(lotId),at);
  requireThat(l&&personalLot(l,cid)&&l.item.id===cost.itemId&&l.item.revision===cost.itemRevision&&l.item.consumable,'INVALID_CONSUMABLE');return l;
}
export function treatmentStock(cost,lot){
  if(!cost)return null;
  requireThat(lot.status==='AVAILABLE'&&lot.quantity>=cost.quantity,'INSUFFICIENT_STOCK');
  return {lotId:lot.id,itemId:lot.item.id,name:lot.item.name,unit:lot.item.unit,quantity:cost.quantity,before:lot.quantity,remaining:lot.quantity-cost.quantity,revision:lot.revision};
}
export function consumeTreatmentLot(tx,sid,lot,cost,{id,at,actorUid,skillId}){
  if(!cost)return;
  const next={...lot,quantity:cost.remaining,status:cost.remaining===0?'CONSUMED':'AVAILABLE',revision:lot.revision+1};
  tx.set(`sessions/${sid}/inventory/${lot.id}`,next);
  tx.set(`sessions/${sid}/inventory/${lot.id}/history/${id}`,{id,kind:'TREATMENT',at,actorUid,skillId,healthEventId:id,reason:'Consommation du soin confirmé',before:lotState(lot),after:lotState(next)});
}
