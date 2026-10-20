import {mediaFields} from './media-state.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
export const inventoryHash=v=>createHash('sha256').update(v).digest('hex');
const text=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_ITEM');return v.trim();};
export function itemInput(input,id,old={}){
  requireThat(['INDIVIDUAL','STACKABLE'].includes(input.kind)&&typeof input.consumable==='boolean','INVALID_ITEM');
  requireThat(['DRAFT','READY','PUBLISHED'].includes(input.publicationState),'INVALID_ITEM');
  requireThat(['UNSPECIFIED','LEGAL','ILLEGAL'].includes(input.legality??'UNSPECIFIED'),'INVALID_ITEM');
  requireThat(input.pillable===undefined||typeof input.pillable==='boolean','INVALID_ITEM');
  const unitVolume=input.unitVolume==null?null:whole(input.unitVolume,'INVALID_ITEM');
  return {...mediaFields(old,['illustration']),id,name:text(input.name,150,true),description:text(input.description??'',6000),category:text(input.category??'',150),
    pillable:input.pillable??old.pillable??false,unit:text(input.unit??'unité',50,true),kind:input.kind,consumable:input.consumable,unitVolume,legality:input.legality??'UNSPECIFIED',
    gmNotes:text(input.gmNotes??'',10000),publicationState:input.publicationState,revision:(old.revision??0)+1};
}
export const publicItem=d=>({...mediaFields(d,['illustration']),id:d.id,name:d.name,pillable:d.pillable??false,description:d.description,category:d.category,unit:d.unit,kind:d.kind,consumable:d.consumable,unitVolume:d.unitVolume,legality:d.legality,revision:d.revision});
export function itemQuantity(definition,value,allowZero=false){
  const quantity=whole(value,'INVALID_QUANTITY');requireThat((allowZero||quantity>0)&&(definition.kind!=='INDIVIDUAL'||quantity<=1),'INVALID_QUANTITY');return quantity;
}
// Reservations expire on server time. The virtual revision invalidates old consent even before a write persists the release.
export function effectiveLot(l,at){
  return l?.status==='RESERVED'&&Number.isSafeInteger(l.marketReservation?.expiresAt)&&at>=l.marketReservation.expiresAt
    ?{...l,status:'AVAILABLE',revision:l.revision+1,marketReservation:null}:l;
}
export const readLot=async(tx,sid,id,at)=>effectiveLot(await tx.get(`sessions/${sid}/inventory/${id}`),at);
export const lotState=l=>({quantity:l.quantity,status:l.status,revision:l.revision});
export const personalLot=(l,cid)=>l.ownerId===cid&&l.holderId===cid&&l.location.kind==='CHARACTER'&&l.location.id===cid;
export const publicLot=l=>({id:l.id,pillable:(l.pillable??l.item.pillable)===true,item:publicItem(l.item),quantity:l.quantity,status:l.status,revision:l.revision,ownerId:l.ownerId,holderId:l.holderId,location:l.location,...(l.status==='RESERVED'?{marketReservation:{listingId:l.marketReservation.listingId,expiresAt:l.marketReservation.expiresAt}}:{})});
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
