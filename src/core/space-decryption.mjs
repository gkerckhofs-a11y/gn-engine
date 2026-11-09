import {createHash,randomInt} from 'node:crypto';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const durations=[null,180,165,150,135,120],cooldownMs=600000;
const base=sid=>'sessions/'+sid;
const charPath=(sid,cid)=>base(sid)+'/characters/'+cid;
const receiptPath=(sid,cid,kid)=>charPath(sid,cid)+'/knowledge/'+kid;
const actorPath=(sid,cid)=>base(sid)+'/inf02Actors/'+cid;
const actionPath=(sid,id)=>base(sid)+'/inf02Actions/'+id;
const attemptPath=(sid,cid,kid,revision)=>base(sid)+'/inf02Attempts/'+hash(cid+':'+kid+':'+revision);
const summarize=a=>({id:a.id,status:a.status,knowledgeId:a.knowledgeId,readyAtGameMs:a.readyAtGameMs,
 durationSeconds:a.durationSeconds,roll:a.roll??null,total:a.total??null,threshold:a.threshold??null,success:a.success??null});
export const soDecryptionActions=['mySoDecryption','startSoDecryption','finishSoDecryption','cancelSoDecryption'];
export function createSoDecryptionService({store,signed,now,uuid,rollD6=()=>randomInt(1,7)}){
 async function access(tx,actor,sid){
  signed(actor);
  const s=await tx.get(base(sid));
  requireThat(s?.spaceOutlaws?.inf02Version===1,'SO_INF02_CLOSED');
  const r=await tx.get(base(sid)+'/registrations/'+hash(actor.uid));
  requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(charPath(sid,r.characterId));
  requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','FORBIDDEN');
  return {s,c,r};
 }
 const live=(s,c)=>{
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat,'SO_INF02_UNAVAILABLE');
 };
 async function document(tx,sid,cid,id){
  const k=await tx.get(base(sid)+'/knowledge/'+id);
  const r=await tx.get(receiptPath(sid,cid,id));
  requireThat(k?.publicationState==='PUBLISHED'&&k.kind==='DOCUMENT'&&k.cipher?.plaintext&&r?.active,'SO_INF02_DOCUMENT');
  return {k,r};
 }
 return async function dispatch(action,actor,input){
  const sid=documentId(input.sessionId),at=now(),roll=action==='finishSoDecryption'?rollD6():null;
  return store.runTransaction(async tx=>{
   const {s,c}=await access(tx,actor,sid),time=gameTime(s.clock,at),level=Math.min(5,abilityLevel(c,'INF-02'));
   const state=await tx.get(actorPath(sid,c.id))??{activeId:null,cooldownUntil:0};
   const active=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
   if(action==='mySoDecryption'){
    const receipts=await tx.list(charPath(sid,c.id)+'/knowledge',null,{limit:1001});
    requireThat(receipts.length<=1000,'SO_RELEASE_LIMIT');
    const documents=[];
    for(const receipt of receipts.filter(r=>r.active)){
     const k=await tx.get(base(sid)+'/knowledge/'+receipt.id);
     if(k?.publicationState!=='PUBLISHED'||k.kind!=='DOCUMENT'||!k.cipher?.plaintext)continue;
     const tried=await tx.get(attemptPath(sid,c.id,k.id,k.revision));
     documents.push({id:k.id,title:receipt.snapshot.title,revision:k.revision,requiredLevel:k.cipher.minLevel,
      attempted:['SUCCESS','FAILED'].includes(tried?.status),decoded:receipt.decodedRevision===k.revision});
    }
    return {enabled:level>0,level,documents,
      active:active?{...summarize(active),remainingMs:Math.max(0,active.readyAtGameMs-time)}:null,
      cooldownMs:Math.max(0,state.cooldownUntil-time)};
   }
   requireThat(level>0,'SO_INF02_SKILL');
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId),fingerprint=hash(JSON.stringify([action,input]));
   const previous=await tx.get(op);
   if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
   authorizeSpaceOutlaws(tx,s,'INF02');
   const record=result=>{tx.set(op,{fingerprint,result,at});return result;};
   if(action==='startSoDecryption'){
    live(s,c);
    requireThat(!active&&time>=state.cooldownUntil,'SO_INF02_COOLDOWN');
    requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeVoyageId,'SO_INF02_BUSY');
    if(s.spaceOutlaws.pickpocketVersion===1){const rogue=await tx.get(base(sid)+'/pickpocketRogues/'+c.id);requireThat(!rogue?.activeId,'SO_INF02_BUSY');}
    if(s.spaceOutlaws.escapeVersion===1){
     const rogue=await tx.get(base(sid)+'/soEscapeRogues/'+c.id);requireThat(!rogue?.activeId,'SO_INF02_BUSY');
     const cap=await tx.get(base(sid)+'/soCaptivities/'+c.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
    const kid=documentId(input.knowledgeId),{k,r}=await document(tx,sid,c.id,kid);
    requireThat(level>=k.cipher.minLevel,'SO_INF02_SKILL');
    requireThat(r.decodedRevision!==k.revision,'SO_INF02_ALREADY');
    const attempt=await tx.get(attemptPath(sid,c.id,k.id,k.revision));
    requireThat(!['RUNNING','FAILED','SUCCESS'].includes(attempt?.status),'SO_INF02_ALREADY');
    const pointsPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointsPath),at);
    const id=uuid(),durationSeconds=durations[level],a={id,characterId:c.id,knowledgeId:k.id,knowledgeRevision:k.revision,
      status:'RUNNING',level,durationSeconds,readyAtGameMs:time+durationSeconds*1000,startedAtGameMs:time,
      accessVersion: (await tx.get(base(sid)+'/registrations/'+hash(actor.uid))).accessVersion};
    tx.set(pointsPath,reserveActionPoints(points,1));
    tx.set(charPath(sid,c.id),{...c,activeFieldActionId:id});
    tx.set(actorPath(sid,c.id),{...state,activeId:id});
    tx.set(actionPath(sid,id),a);
    tx.set(attemptPath(sid,c.id,k.id,k.revision),{id,status:'RUNNING'});
    return record({...summarize(a),remainingMs:durationSeconds*1000});
   }
   requireThat(['finishSoDecryption','cancelSoDecryption'].includes(action),'INVALID_ACTION');
   const id=documentId(input.actionId),a=await tx.get(actionPath(sid,id));
   requireThat(a?.characterId===c.id&&a.status==='RUNNING'&&state.activeId===id,'SO_INF02_STALE');
   const mark=await tx.get(attemptPath(sid,c.id,a.knowledgeId,a.knowledgeRevision));
   requireThat(mark?.status==='RUNNING'&&mark.id===id,'SO_INF02_STALE');
   const pointsPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointsPath),at);
   requireThat(c.activeFieldActionId===id,'SO_INF02_STALE');
   if(action==='cancelSoDecryption'){
    const ended={...a,status:'CANCELLED',finishedAtGameMs:time};
    tx.set(actionPath(sid,id),ended);
    tx.set(attemptPath(sid,c.id,a.knowledgeId,a.knowledgeRevision),{id,status:'CANCELLED'});
    tx.set(actorPath(sid,c.id),{...state,activeId:null});
    tx.set(pointsPath,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
    tx.set(charPath(sid,c.id),{...c,activeFieldActionId:null});
    return record(summarize(ended));
   }
   live(s,c);
   requireThat(time>=a.readyAtGameMs,'SO_INF02_TOO_EARLY');
   const {k,r}=await document(tx,sid,c.id,a.knowledgeId);
   requireThat(k.revision===a.knowledgeRevision,'SO_INF02_STALE');
   const total=roll+a.level,success=total>=k.cipher.threshold;
   const ended={...a,status:success?'SUCCESS':'FAILED',finishedAtGameMs:time,roll,total,
    threshold:k.cipher.threshold,success};
   tx.set(actionPath(sid,id),ended);
   tx.set(attemptPath(sid,c.id,k.id,k.revision),{id,status:ended.status});
   tx.set(actorPath(sid,c.id),{...state,activeId:null,cooldownUntil:time+cooldownMs});
   tx.set(pointsPath,resolveActionPoints(points,1));
   tx.set(charPath(sid,c.id),{...c,activeFieldActionId:null});
   if(success)tx.set(receiptPath(sid,c.id,k.id),{...r,
    snapshot:{...r.snapshot,body:k.cipher.plaintext},decodedRevision:k.revision,decodedAtGameMs:time,
    grantRevision:(r.grantRevision??0)+1});
   return record(summarize(ended));
  });
 };
}
