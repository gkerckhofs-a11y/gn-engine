import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const root=sid=>'sessions/'+sid;
const appealPath=(sid,id)=>root(sid)+'/customsSeizureAppeals/'+id;
const seizurePath=(sid,id)=>root(sid)+'/customsSeizures/'+id;
export const customsAppealActions=['myCustomsAppeals','customsAppealsAdmin','submitCustomsAppeal','decideCustomsAppeal'];
const playerView=a=>({id:a.id,seizureId:a.seizureId,receiptCode:a.receiptCode,
 itemName:a.itemName,reason:a.reason,at:a.at,status:a.status,
 ...(a.outcome?{outcome:a.outcome,publicReply:a.publicReply,decidedAt:a.decidedAt}: {})});
// The MJ needs the fictional case and private decision note, not real authentication identifiers.
const adminView=a=>({...playerView(a),ownerId:a.ownerId,
 ...(a.outcome?{privateReason:a.privateReason}:{})});
const appealAuditPath=(sid,actorUid,requestId)=>
 root(sid)+'/audit/'+hash('SO_CUSTOMS_APPEAL:'+actorUid+':'+requestId);
export function createCustomsAppealService({store,signed,checkSession,now}){
 return async function dispatch(action,actor,input){
  signed(actor);
  const sid=documentId(input.sessionId),at=now();
  return store.runTransaction(async tx=>{
   const s=await tx.get(root(sid));
   requireThat(s?.spaceOutlaws?.customsDetentionVersion===1,'SO_CUSTOMS_HOLD_CLOSED');
   if(action==='customsAppealsAdmin'){
    await checkSession(tx,actor,sid,'content',true);
    const appeals=await tx.list(root(sid)+'/customsSeizureAppeals',null,{limit:1001});
    requireThat(appeals.length<=1000,'SO_RELEASE_LIMIT');
    const projected=await Promise.all(appeals.sort((a,b)=>b.at-a.at).slice(0,80).map(async a=>{
      const seizure=await tx.get(seizurePath(sid,a.seizureId));
      return adminView({...a,status:seizure?.status==='RETURNED'?'CLOSED_RETURNED':a.status});
    }));
    return {session:{id:sid,stage:s.stage},appeals:projected};
   }
   if(action==='decideCustomsAppeal'){
    await checkSession(tx,actor,sid,'content',true);
    requireThat(['EN_JEU','PAUSE'].includes(s.stage)&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');
    requireThat(['MAINTAINED','RETURN_RECOMMENDED'].includes(input.outcome),'SO_CUSTOMS_APPEAL_DECISION');
    requireThat(typeof input.publicReply==='string'&&input.publicReply.trim()
      &&input.publicReply.length<=1000,'SO_CUSTOMS_APPEAL_REPLY');
    requireThat(typeof input.privateReason==='string'&&input.privateReason.trim()
      &&input.privateReason.length<=1000,'SO_CUSTOMS_APPEAL_REASON');
    const rid=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+rid);
    const fingerprint=hash(JSON.stringify([action,input])),prior=await tx.get(op);
    if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
    const id=documentId(input.seizureId),a=await tx.get(appealPath(sid,id));
    requireThat(a?.status==='PENDING','SO_CUSTOMS_APPEAL_DECIDED');
    const seizure=await tx.get(seizurePath(sid,id));
    requireThat(seizure?.status==='SEIZED'&&seizure.ownerId===a.ownerId,'SO_CUSTOMS_APPEAL_CLOSED');
    const next={...a,status:'DECIDED',outcome:input.outcome,
      publicReply:input.publicReply.trim(),privateReason:input.privateReason.trim(),
      decidedAt:at,decidedBy:actor.uid};
    authorizeSpaceOutlaws(tx,s,'CUSTOMS_APPEAL');
    tx.set(appealPath(sid,id),next);
    tx.set(appealAuditPath(sid,actor.uid,rid),{
      id:hash('SO_CUSTOMS_APPEAL:'+actor.uid+':'+rid),
      kind:'SO_CUSTOMS_APPEAL_DECIDED',at,actorUid:actor.uid,
      seizureId:id,characterId:a.ownerId,outcome:input.outcome,
    });
    const result=playerView(next);
    tx.set(op,{fingerprint,result,at});
    return result;
   }
   const r=await tx.get(root(sid)+'/registrations/'+hash(actor.uid));
   requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId
     &&actor.authTime>=r.minAuthTime,'FORBIDDEN');
   const c=await tx.get(root(sid)+'/characters/'+r.characterId);
   requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'
     &&c.public?.publicationState==='PUBLISHED','FORBIDDEN');
   if(action==='myCustomsAppeals'){
    const appeals=await tx.list(root(sid)+'/customsSeizureAppeals',['ownerId',c.id],{limit:101});
    requireThat(appeals.length<=100,'SO_RELEASE_LIMIT');
    const projected=await Promise.all(appeals.map(async a=>{
      const seizure=await tx.get(seizurePath(sid,a.seizureId));
      return playerView({...a,status:seizure?.status==='RETURNED'?'CLOSED_RETURNED':a.status});
    }));
    return {session:{id:sid},appeals:projected.sort((a,b)=>b.at-a.at)};
   }
   requireThat(action==='submitCustomsAppeal','INVALID_ACTION');
   requireThat(['EN_JEU','PAUSE','FINISHED'].includes(s.stage),'SESSION_NOT_RUNNING');
   const rid=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+rid);
   const fingerprint=hash(JSON.stringify([action,input])),prior=await tx.get(op);
   if(prior){requireThat(prior.fingerprint===fingerprint&&prior.ownerId===c.id
     &&prior.accessVersion===r.accessVersion,'FORBIDDEN');return prior.result;}
   const seizureId=documentId(input.seizureId);
   const seizure=await tx.get(seizurePath(sid,seizureId));
   requireThat(seizure?.ownerId===c.id,'FORBIDDEN');
   requireThat(seizure.status==='SEIZED','SO_CUSTOMS_APPEAL_CLOSED');
   requireThat(typeof input.reason==='string'&&input.reason.trim()
     &&input.reason.length<=1000,'SO_CUSTOMS_APPEAL_REASON');
   requireThat(!await tx.get(appealPath(sid,seizureId)),'SO_CUSTOMS_APPEAL_EXISTS');
   const appeal={id:seizureId,seizureId,receiptCode:seizure.receiptCode,
     itemName:seizure.itemName,ownerId:c.id,at,status:'PENDING',reason:input.reason.trim(),
     sourceUid:actor.uid,sourceAccessVersion:r.accessVersion};
   authorizeSpaceOutlaws(tx,s,'CUSTOMS_APPEAL');
   tx.set(appealPath(sid,seizureId),appeal);
   tx.set(appealAuditPath(sid,actor.uid,rid),{
     id:hash('SO_CUSTOMS_APPEAL:'+actor.uid+':'+rid),
     kind:'SO_CUSTOMS_APPEAL_FILED',at,actorUid:actor.uid,
     seizureId,characterId:c.id,
   });
   const result=playerView(appeal);
   tx.set(op,{fingerprint,result,at,ownerId:c.id,accessVersion:r.accessVersion});
   return result;
  });
 };
}
