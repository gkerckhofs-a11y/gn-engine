import {installedDroidModule} from './space-droid-work.mjs';
import {readLot,personalLot} from './inventory-state.mjs';
// A copied text is a native knowledge receipt, never a second inventory lot.
export async function heldDocument(tx,sid,cid,kid,lotId,at){
 const l=await readLot(tx,sid,lotId,at);
 let held=l&&personalLot(l,cid);
 if(l?.location?.kind==='DROID_CONTENT'&&l.ownerId===cid&&l.holderId===cid){const s=await tx.get(`sessions/${sid}`),c=await tx.get(`sessions/${sid}/characters/${cid}`),module=await tx.get(`sessions/${sid}/inventory/${l.location.id}`);held=s?.spaceOutlaws?.droidModulesVersion===1&&c&&installedDroidModule(c,module)&&c.droidModules.some(m=>m.lotId===module.id&&m.code==='DR-05'&&m.contentLotId===l.id);}
 return l&&l.quantity===1&&l.item.kind==='INDIVIDUAL'&&!l.item.consumable&&l.item.knowledgeId===kid&&held&&['AVAILABLE','FIELD_RESERVED'].includes(l.status)?l:null;
}
export async function documentReceiptAvailable(tx,sid,cid,r,at){
 if(!r?.active)return false;
 if(r.source!=='INVENTORY'||r.inventoryCopy===true)return true;
 return !!(r.documentLotId&&await heldDocument(tx,sid,cid,r.id,r.documentLotId,at));
}
