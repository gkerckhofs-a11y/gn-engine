import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {lotState} from './inventory-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const root=sid=>'sessions/'+sid;
const detentionPath=(sid,id)=>root(sid)+'/customsDetentions/'+id;
const seizurePath=(sid,id)=>root(sid)+'/customsSeizures/'+id;
const stockPath=(sid,id)=>root(sid)+'/customsOfficialInventory/'+id;
const lotPath=(sid,id)=>root(sid)+'/inventory/'+id;
const officialHolder='CUSTOMS_OFFICIAL';
export const customsSeizureActions=['customsSeizuresAdmin','myCustomsSeizures','seizeCustomsDetention'];
const publicReceipt=s=>({id:s.id,receiptCode:s.receiptCode,lotId:s.lotId,itemName:s.itemName,
 quantity:s.quantity,at:s.at,reason:s.reason,status:s.status});
export function createCustomsSeizureService({store,signed,checkSession,now,uuid}){
 return async function dispatch(action,actor,input){
  signed(actor);const sid=documentId(input.sessionId),at=now();
  return store.runTransaction(async tx=>{
   if(action==='myCustomsSeizures'){
    const session=await tx.get(root(sid));
    requireThat(session?.spaceOutlaws?.customsDetentionVersion===1,'SO_CUSTOMS_HOLD_CLOSED');
    const r=await tx.get(root(sid)+'/registrations/'+hash(actor.uid));
    requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
    const c=await tx.get(root(sid)+'/characters/'+r.characterId);
    requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED','FORBIDDEN');
    const records=await tx.list(root(sid)+'/customsSeizures',['ownerId',c.id],{limit:101});
    requireThat(records.length<=100,'SO_RELEASE_LIMIT');
    return {session:{id:sid},receipts:records.map(publicReceipt).sort((a,b)=>b.at-a.at)};
   }
   // A class/skill/customs-authority level is not a seizure mandate.
   const session=await checkSession(tx,actor,sid,'content',true);
   requireThat(session?.spaceOutlaws?.customsDetentionVersion===1,'SO_CUSTOMS_HOLD_CLOSED');
   if(action==='customsSeizuresAdmin'){
    const records=await tx.list(root(sid)+'/customsSeizures',null,{limit:1001});
    requireThat(records.length<=1000,'SO_RELEASE_LIMIT');
    return {session:{id:sid,stage:session.stage},
      officialStock:records.map(x=>({...x})).sort((a,b)=>b.at-a.at).slice(0,80)};
   }
   requireThat(action==='seizeCustomsDetention','INVALID_ACTION');
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId);
   const fingerprint=hash(JSON.stringify([action,input])),prior=await tx.get(op);
   if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
   requireThat(session.stage==='EN_JEU'&&!session.safetyStop?.active,'SESSION_NOT_RUNNING');
   requireThat(input.decision==='REGULARIZATION_FAILED'&&input.authorized===true
     &&input.officialCustodyConfirmed===true,'SO_CUSTOMS_SEIZURE_DECISION');
   requireThat(typeof input.reasonText==='string'&&input.reasonText.trim()
     &&input.reasonText.length<=500,'REASON_REQUIRED');
   const id=documentId(input.detentionId),caseRecord=await tx.get(detentionPath(sid,id));
   requireThat(caseRecord?.status==='ACTIVE','SO_CUSTOMS_HOLD_FINISHED');
   // No seizure after real-time expiry, even if raw Firestore still says held.
   requireThat(at<caseRecord.expiresAt,'SO_CUSTOMS_HOLD_EXPIRED');
   const lot=await tx.get(lotPath(sid,caseRecord.lotId));
   requireThat(lot?.status==='CUSTOMS_HELD'&&lot.customsDetention?.id===id
     &&lot.quantity>0&&lot.ownerId===caseRecord.ownerId
     &&lot.holderId===caseRecord.holderId&&lot.location?.kind==='CHARACTER'
     &&lot.location.id===caseRecord.ownerId,'SO_CUSTOMS_HOLD_STALE');
   requireThat(!await tx.get(stockPath(sid,lot.id)),'SO_CUSTOMS_SEIZURE_DUPLICATE');
   const seizureId=uuid(),receiptCode=uuid(),reasonText=input.reasonText.trim();
   const seizure={id:seizureId,receiptCode,detentionId:id,lotId:lot.id,
     itemName:lot.item.name,quantity:lot.quantity,ownerId:lot.ownerId,
     at,reason:'REGULATED_NO_LICENSE_UNRESOLVED',reasonText,decisionBy:actor.uid,
     status:'SEIZED',officialInventoryId:officialHolder};
   const nextLot={...lot,status:'SEIZED',holderId:officialHolder,
     location:{kind:'CUSTOMS',id:officialHolder},customsDetention:null,
     customsSeizureId:seizureId,revision:lot.revision+1};
   const closedCase={...caseRecord,status:'SEIZED',closedAt:at,closedBy:actor.uid,
     closeReason:reasonText,seizureId};
   authorizeSpaceOutlaws(tx,session,'CUSTOMS_SEIZURE');
   tx.set(lotPath(sid,lot.id),nextLot);
   tx.set(lotPath(sid,lot.id)+'/history/'+seizureId,{
    id:seizureId,kind:'SO_CUSTOMS_SEIZED',at,actorUid:actor.uid,
    reason:reasonText,receiptCode,before:lotState(lot),after:lotState(nextLot)});
   tx.set(detentionPath(sid,id),closedCase);
   tx.set(seizurePath(sid,seizureId),seizure);
   tx.set(stockPath(sid,lot.id),{lotId:lot.id,seizureId,quantity:lot.quantity,
     ownerId:lot.ownerId,receiptCode,createdAt:at,status:'SEIZED'});
   const response=publicReceipt(seizure);
   tx.set(op,{fingerprint,result:response,at});
   return response;
  });
 };
}
