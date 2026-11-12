import {documentId,requireThat} from './validation.mjs';
import {canGameAction,requireGameAction} from './health-state.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';

// Membership, registration and publication are checked on every read and retry.
export async function groupChat({action,actor,input,store,groupContext,hash,uuid,at}) {
  const sid=documentId(input.sessionId),sending=action==='sendGroupMessage';
  const id=uuid();
  return store.runTransaction(async tx=>{
    const {s,c,g}=await groupContext(tx,actor,sid,input);
    requireThat(!s.spaceOutlaws||(s.spaceOutlaws.actionsVersion===1&&s.spaceOutlaws.groupsVersion===1),'SO_GAMEPLAY_NOT_OPEN');
    const base=`sessions/${sid}/groups/${g.id}`;
    const canSend=s.stage==='EN_JEU'&&!s.safetyStop?.active&&canGameAction(s,c,'publish',at);
    if(!sending){
      const rows=await tx.list(`${base}/inboxes/${c.id}/messages`,null,{orderBy:'at',direction:'desc',limit:50});
      return {canSend,characterName:c.public.displayName,messages:rows.map(m=>({id:m.id,body:m.body,authorName:m.authorName,at:m.at})).reverse()};
    }
    requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
    requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'publish',at);
    requireThat(typeof input.body==='string'&&input.body.trim().length>0&&input.body.length<=2000,'INVALID_TEXT');
    const requestId=documentId(input.requestId),receiptPath=`operations/${hash(`${actor.uid}:${requestId}`)}`;
    const fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(receiptPath);
    if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
    const message={id,body:input.body.trim(),authorName:c.public.displayName,at};
    const recipients=g.members.filter(m=>m.active&&m.revealed);
    // Bound transactional fan-out; SO groups are already capped below this limit.
    requireThat(recipients.length<=200,'CAPACITY_REACHED');
    authorizeSpaceOutlaws(tx,s,'GROUP_CHAT');
    tx.set(`${base}/messages/${id}`,{...message,authorCharacterId:c.id});
    for(const m of recipients)tx.set(`${base}/inboxes/${m.characterId}/messages/${id}`,message);
    const result={id};tx.set(receiptPath,{fingerprint,result});
    tx.set(`sessions/${sid}/audit/${id}`,{id,action,at,actorUid:actor.uid,groupId:g.id,characterId:c.id,messageId:id});
    return result;
  });
}
