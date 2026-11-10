import {createHash} from 'node:crypto';
import {requireThat,documentId} from './validation.mjs';
import {readLot,lotState,personalLot,effectiveLot} from './inventory-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const root=sid=>'sessions/'+sid;
const itemPath=(sid,id)=>root(sid)+'/inventory/'+id;
const casePath=(sid,id)=>root(sid)+'/customsDetentions/'+id;
const indexPath=(sid,id)=>root(sid)+'/customsDetentionByLot/'+id;
export const customsDetentionActions=['customsDetentionsAdmin','startCustomsDetention','releaseCustomsDetention'];
export const customsHoldLimitMs=15*60*1000;
export const customsHoldReason='REGULATED_NO_LICENSE';
const shown=(record,at)=>({
 id:record.id,lotId:record.lotId,itemName:record.itemName,ownerId:record.ownerId,
 holderId:record.holderId,reason:record.reason,openedAt:record.openedAt,
 expiresAt:record.expiresAt,remainingRealMs:Math.max(0,record.expiresAt-at),
 status:record.status==='ACTIVE'&&at>=record.expiresAt?'EXPIRED':record.status,
 closedAt:record.closedAt??null,closedBy:record.closedBy??null,
 ...(record.reasonText?{reasonText:record.reasonText}:{})
});
export function createCustomsDetentionService({store,signed,checkSession,now,uuid}){
 return async function dispatch(action,actor,input){
  signed(actor);
  const at=now(),sid=documentId(input.sessionId);
  return store.runTransaction(async tx=>{
   // MJ/content privilege only. A gameplay customs level does not authorize seizures.
   const s=await checkSession(tx,actor,sid,'content',true);
   requireThat(s?.spaceOutlaws?.customsDetentionVersion===1,'SO_CUSTOMS_HOLD_CLOSED');
   if(action==='customsDetentionsAdmin'){
    const all=await tx.list(root(sid)+'/customsDetentions',null,{limit:1001});
    requireThat(all.length<=1000,'SO_RELEASE_LIMIT');
    return {session:{id:sid,stage:s.stage},maxRealMs:customsHoldLimitMs,
      cases:all.map(x=>shown(x,at)).sort((a,b)=>b.openedAt-a.openedAt).slice(0,80)};
   }
   const requestId=documentId(input.requestId);
   const op='operations/'+hash(actor.uid+':'+requestId),fingerprint=hash(JSON.stringify([action,input]));
   const prior=await tx.get(op);
   if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
   authorizeSpaceOutlaws(tx,s,'CUSTOMS_DETENTION');
   const record=result=>{tx.set(op,{fingerprint,result,at});return result;};
   if(action==='startCustomsDetention'){
    requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
    requireThat(input.reason===customsHoldReason,'SO_CUSTOMS_HOLD_REASON');
    requireThat(input.secured===true,'SO_CUSTOMS_HOLD_CUSTODY');
    requireThat(typeof input.reasonText==='string'&&input.reasonText.trim()&&input.reasonText.length<=500,'REASON_REQUIRED');
    const id=documentId(input.lotId),lot=await readLot(tx,sid,id,at);
    requireThat(lot?.status==='AVAILABLE'&&lot.quantity>0&&
      lot.location?.kind==='CHARACTER'&&personalLot(lot,lot.ownerId)
      &&!lot.boardingCustody&&!lot.marketReservation&&!lot.cargoTransferId,'SO_CUSTOMS_HOLD_LOT');
    // A strict one-hold-per-lot-per-session rule prevents indefinite recapture.
    requireThat(!await tx.get(indexPath(sid,id)),'SO_CUSTOMS_HOLD_REPEAT');
    const cid=uuid(),expiresAt=at+customsHoldLimitMs;
    const detention={id:cid,lotId:id,itemName:lot.item.name,ownerId:lot.ownerId,holderId:lot.holderId,
      reason:customsHoldReason,reasonText:input.reasonText.trim(),status:'ACTIVE',
      openedAt:at,expiresAt,createdBy:actor.uid,closedAt:null,closedBy:null};
    const next={...lot,status:'CUSTOMS_HELD',revision:lot.revision+1,
      customsDetention:{id:cid,openedAt:at,expiresAt}};
    tx.set(itemPath(sid,id),next);
    tx.set(itemPath(sid,id)+'/history/'+cid,{id:cid,kind:'SO_CUSTOMS_HOLD',at,actorUid:actor.uid,
      reason:'Retenue provisoire réglementée, sans droit de saisir',
      before:lotState(lot),after:lotState(next)});
    tx.set(casePath(sid,cid),detention);
    tx.set(indexPath(sid,id),{lotId:id,detentionId:cid,openedAt:at});
    return record(shown(detention,at));
   }
   requireThat(action==='releaseCustomsDetention','INVALID_ACTION');
   const cid=documentId(input.detentionId),detention=await tx.get(casePath(sid,cid));
   requireThat(detention?.status==='ACTIVE','SO_CUSTOMS_HOLD_FINISHED');
   requireThat(typeof input.reasonText==='string'&&input.reasonText.trim()&&input.reasonText.length<=500,'REASON_REQUIRED');
   const lot=await tx.get(itemPath(sid,detention.lotId));
   const expired=at>=detention.expiresAt;
   // Even if a separate action has already applied the virtual expiry,
   // do not rewind ownership or move a lot back to its former owner.
   const held=lot?.status==='CUSTOMS_HELD'&&lot.customsDetention?.id===cid;
   if(!held)requireThat(expired,'SO_CUSTOMS_HOLD_STALE');
   if(held){
    const next={...lot,status:'AVAILABLE',customsDetention:null,revision:lot.revision+1};
    tx.set(itemPath(sid,lot.id),next);
    const historyId=uuid();
    tx.set(itemPath(sid,lot.id)+'/history/'+historyId,{
      id:historyId,kind:expired?'SO_CUSTOMS_EXPIRED':'SO_CUSTOMS_RELEASED',
      at,actorUid:actor.uid,reason:input.reasonText.trim(),
      before:lotState(lot),after:lotState(next)});
   }
   const next={...detention,status:expired?'EXPIRED':'RELEASED',closedAt:at,closedBy:actor.uid,
     closeReason:input.reasonText.trim()};
   tx.set(casePath(sid,cid),next);
   return record(shown(next,at));
  });
 };
}
