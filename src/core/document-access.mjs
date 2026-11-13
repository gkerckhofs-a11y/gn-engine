import {readLot,personalLot} from './inventory-state.mjs';
// A copied text is a native knowledge receipt, never a second inventory lot.
export async function heldDocument(tx,sid,cid,kid,lotId,at){
 const l=await readLot(tx,sid,lotId,at);
 return l&&l.quantity===1&&l.item.kind==='INDIVIDUAL'&&!l.item.consumable&&l.item.knowledgeId===kid&&personalLot(l,cid)&&['AVAILABLE','FIELD_RESERVED'].includes(l.status)?l:null;
}
export async function documentReceiptAvailable(tx,sid,cid,r,at){
 if(!r?.active)return false;
 if(r.source!=='INVENTORY'||r.inventoryCopy===true)return true;
 return !!(r.documentLotId&&await heldDocument(tx,sid,cid,r.id,r.documentLotId,at));
}
