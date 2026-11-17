import {inventoryPlayer} from './inventory-transfers.mjs';
import {documentId,requireThat} from './validation.mjs';
import {dockEntry,dockMandates} from './dock-state.mjs';
import {warehouseStock} from './storage-state.mjs';

export function createDockService({store,signed,now}){
 return async(action,actor,input)=>{
  signed(actor);return store.runTransaction(async tx=>{
   const ctx=await inventoryPlayer(tx,actor,{sessionId:input.sessionId}),{s,c}=ctx;
   requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');
   const w=await tx.get(`sessions/${s.id}/warehouses/${documentId(input.warehouseId)}`);
   requireThat(w?.commercialStorage&&w.dock?.schemaVersion===1,'WAREHOUSE_UNAVAILABLE');
   let entry=null,reason=null;try{entry=await dockEntry(tx,ctx,w,now());}catch(e){if(!['LOCAL_CREDENTIAL_REQUIRED','LOCAL_SCAN_REQUIRED','LOCAL_TERMINAL_CLOSED','DOCK_NOT_LOCAL','LOCAL_SKILL_REQUIRED'].includes(e.code))throw e;reason=e.code;}
   const access=await dockMandates(tx,s,c,w),stock=entry&&w.dock.revealFields.length?await warehouseStock(tx,s.id,w.id):[];
   return {session:{id:s.id},warehouse:{id:w.id,name:w.name,securityTier:w.dock.securityTier},entry,reason,
    intrusionTargetId:reason==='LOCAL_CREDENTIAL_REQUIRED'?w.dock.intrusionTargetId:null,
    canManageStock:!!entry&&access.access,
    theftEnabled:!!entry&&w.enabled&&w.dock.theftEnabled,
    revealed:stock.map(l=>({...(w.dock.theftEnabled?{id:l.id}:{}),...Object.fromEntries(w.dock.revealFields.map(k=>[k,k==='name'?l.item.name:k==='legality'?l.item.legality??'UNKNOWN':l.quantity]))}))};
  });
 };
}
