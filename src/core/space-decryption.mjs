import {documentReceiptAvailable} from './document-access.mjs';
import {intrusionAnswerDigest} from './field-state.mjs';
import {readLot,personalLot,lotState} from './inventory-state.mjs';
import {prepareAid,reserveAid,checkAid,finishAid,aidSnapshot,cooldownPath} from './aid-state.mjs';
import {requireGameAction} from './health-state.mjs';
import {createHash,randomInt} from 'node:crypto';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const family='SKILL:INF-02';
const durations=[null,180,165,150,135,120],cooldownMs=600000;
const base=sid=>'sessions/'+sid;
const charPath=(sid,cid)=>base(sid)+'/characters/'+cid;
const receiptPath=(sid,cid,kid)=>charPath(sid,cid)+'/knowledge/'+kid;
const actorPath=(sid,cid)=>base(sid)+'/inf02Actors/'+cid;
const actionPath=(sid,id)=>base(sid)+'/inf02Actions/'+id;
const attemptPath=(sid,cid,kid,revision)=>base(sid)+'/inf02Attempts/'+hash(cid+':'+kid+':'+revision);
const summarize=a=>({id:a.id,status:a.status,mode:a.mode??'D6',knowledgeId:a.knowledgeId,readyAtGameMs:a.readyAtGameMs,
 durationSeconds:a.durationSeconds,roll:a.roll??null,total:a.total??null,threshold:a.threshold??null,success:a.success??null,bonus:a.bonus??0,aid:a.aid?1:0});
export const soDecryptionActions=['soDecryptionAdmin','cancelSoDecryptionMJ','cancelSoDecryptionAid','mySoDecryption','startSoDecryption','finishSoDecryption','cancelSoDecryption'];
export function createSoDecryptionService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
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
 const live=async(tx,s,c,at)=>{
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat,'SO_INF02_UNAVAILABLE');
  requireGameAction(s,c,'discover',at);
  if(s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(base(s.id)+'/soCaptivities/'+c.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
 };
 async function document(tx,sid,cid,id,at){
  const k=await tx.get(base(sid)+'/knowledge/'+id);
  const r=await tx.get(receiptPath(sid,cid,id));
  requireThat(k?.publicationState==='PUBLISHED'&&k.kind==='DOCUMENT'&&k.cipher?.plaintext&&await documentReceiptAvailable(tx,sid,cid,r,at),'SO_INF02_DOCUMENT');
  return {k,r};
 }
 async function reservedBonus(tx,s,c,a,at){
  if(!a.bonusLotId)return null;
  const l=await readLot(tx,s.id,a.bonusLotId,at);
  requireThat(l&&personalLot(l,c.id)&&l.status==='FIELD_RESERVED'&&l.fieldActionId===a.id&&l.quantity>0&&l.revision===a.bonusLotRevision&&l.item.id===a.bonusItemId&&!l.item.consumable,'FIELD_EQUIPMENT_UNAVAILABLE');
  return l;
 }
 function releaseBonus(tx,s,a,l,at,cancelled){
  if(!l)return;
  const next={...l,status:'AVAILABLE',fieldActionId:null,revision:l.revision+1},path=base(s.id)+'/inventory/'+l.id;
  tx.set(path,next);tx.set(path+'/history/'+a.id,{id:a.id,at,kind:cancelled?'FIELD_RELEASE':'FIELD_USE',actorUid:a.actorUid??null,actionId:a.id,before:lotState(l),after:lotState(next)});
 }
 async function cancel(tx,s,c,state,a,at,moderation=null){
  const time=gameTime(s.clock,at),id=a.id,sid=s.id;
  requireThat(c?.activeFieldActionId===id&&state?.activeId===id,'SO_INF02_STALE');
  const mark=await tx.get(attemptPath(sid,c.id,a.knowledgeId,a.knowledgeRevision));
  requireThat(mark?.status==='RUNNING'&&mark.id===id,'SO_INF02_STALE');
  const pointsPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointsPath),at);
  const bonusLot=await reservedBonus(tx,s,c,a,at);
  const ended={...a,status:'CANCELLED',finishedAtGameMs:time};
  await finishAid(tx,s,a,at,{cancel:true});
  releaseBonus(tx,s,a,bonusLot,at,true);
  tx.set(actionPath(sid,id),ended);
  tx.set(attemptPath(sid,c.id,a.knowledgeId,a.knowledgeRevision),{id,status:'CANCELLED'});
  tx.set(actorPath(sid,c.id),{...state,activeId:null});
  tx.set(pointsPath,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
  tx.set(charPath(sid,c.id),{...c,activeFieldActionId:null});
  if(moderation){const auditId=uuid();tx.set(base(sid)+'/audit/'+auditId,{id:auditId,at,action:'cancelSoDecryptionMJ',actionId:id,characterId:c.id,...moderation});}
  return summarize(ended);
 }
 return async function dispatch(action,actor,input){
  const sid=documentId(input.sessionId),at=now();let rolled=null;
  return store.runTransaction(async tx=>{
   if(['soDecryptionAdmin','cancelSoDecryptionMJ'].includes(action)){
    signed(actor);
    const s=await checkSession(tx,actor,sid,'content',true);
    requireThat(s?.spaceOutlaws?.inf02Version===1,'SO_INF02_CLOSED');
    if(action==='soDecryptionAdmin'){
     const rows=await tx.list(base(sid)+'/inf02Actions',['status','RUNNING'],{limit:1001});
     requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');
     const actions=[];
     for(const a of rows){const c=await tx.get(charPath(sid,a.characterId));actions.push({...summarize(a),characterName:c?.public?.displayName??a.characterId,remainingMs:Math.max(0,a.readyAtGameMs-gameTime(s.clock,at))});}
     return {actions};
    }
    requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
    const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId),fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
    if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
    const a=await tx.get(actionPath(sid,documentId(input.actionId)));
    requireThat(a,'NOT_FOUND');
    requireThat(a.status==='RUNNING'||a.status==='CANCELLED','SO_INF02_STALE');
    let result=summarize(a);
    if(a.status==='RUNNING'){
     const c=await tx.get(charPath(sid,a.characterId)),state=await tx.get(actorPath(sid,a.characterId));
     authorizeSpaceOutlaws(tx,s,'INF02');
     result=await cancel(tx,s,c,state,a,at,{actorUid:actor.uid,reason:input.reason.trim()});
    }
    tx.set(op,{fingerprint,result,at});return result;
   }
   const {s,c,r:registration}=await access(tx,actor,sid),time=gameTime(s.clock,at),level=Math.min(5,abilityLevel(c,'INF-02'));
   const state=await tx.get(actorPath(sid,c.id))??{activeId:null,cooldownUntil:0};
   const sharedCooldown=await tx.get(cooldownPath(sid,c.id,family)),readyAt=Math.max(state.cooldownUntil,sharedCooldown?.readyAtGameMs??0);
   const active=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
   if(action==='mySoDecryption'){
    const receipts=await tx.list(charPath(sid,c.id)+'/knowledge',null,{limit:1001});
    requireThat(receipts.length<=1000,'SO_RELEASE_LIMIT');
    const lots=(await tx.list(base(sid)+'/inventory',['holderId',c.id])).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0&&!l.item.consumable&&!l.item.shipModule);
    const documents=[];let challenge=null;
    for(const receipt of receipts.filter(r=>r.active)){
     if(!await documentReceiptAvailable(tx,sid,c.id,receipt,at))continue;
     const k=await tx.get(base(sid)+'/knowledge/'+receipt.id);
     if(k?.publicationState!=='PUBLISHED'||k.kind!=='DOCUMENT'||!k.cipher?.plaintext)continue;
     const tried=await tx.get(attemptPath(sid,c.id,k.id,k.revision));
     if(active?.knowledgeId===k.id&&active.status==='RUNNING'&&active.knowledgeRevision===k.revision&&active.accessVersion===registration.accessVersion&&level>=k.cipher.minLevel&&k.cipher.challenge)challenge={type:'CODE',prompt:k.cipher.challenge.prompt,durationSeconds:k.cipher.challenge.durationSeconds};
     documents.push({mode:k.cipher.challenge?'CODE':'D6',durationSeconds:k.cipher.challenge?.durationSeconds??durations[level]??null,id:k.id,title:receipt.snapshot.title,revision:k.revision,requiredLevel:k.cipher.minLevel,
      bonusLots:lots.filter(l=>(k.cipher.bonusItemIds??[]).includes(l.item.id)).map(l=>({id:l.id,name:l.item.name,bonus:1})),
      attempted:['SUCCESS','FAILED'].includes(tried?.status),decoded:receipt.decodedRevision===k.revision});
    }
    const inventoryDocuments=[];
    for(const l of lots.filter(l=>l.item.knowledgeId&&!documents.some(d=>d.id===l.item.knowledgeId))){
     const receipt=receipts.find(r=>r.id===l.item.knowledgeId),k=await tx.get(base(sid)+'/knowledge/'+l.item.knowledgeId);
     if((!receipt||receipt.active)&&k?.publicationState==='PUBLISHED'&&k.kind==='DOCUMENT'&&k.cipher?.plaintext)
      inventoryDocuments.push({lotId:l.id,name:l.item.name,requiredLevel:k.cipher.minLevel});
    }
    const offers=await tx.list(base(sid)+'/aidOffers',['recipientId',c.id]);
    return {enabled:level>0,level,documents,inventoryDocuments,aidOffers:offers.filter(o=>o.status==='OFFERED'&&o.skillId==='INF-02').map(o=>({id:o.id,helperName:o.helperName})),
      active:active?{...summarize(active),...(challenge?{challenge}:{}),remainingMs:Math.max(0,active.readyAtGameMs-time)}:null,
      cooldownMs:Math.max(0,readyAt-time)};
   }
   if(action!=='cancelSoDecryptionAid')requireThat(level>0,'SO_INF02_SKILL');
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId),fingerprint=hash(JSON.stringify([action,input]));
   const previous=await tx.get(op);
   if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');requireThat(previous.characterId===c.id&&previous.accessVersion===registration.accessVersion,'FORBIDDEN');return previous.result;}
   authorizeSpaceOutlaws(tx,s,'INF02');
   const record=result=>{tx.set(op,{fingerprint,result,at,characterId:c.id,accessVersion:registration.accessVersion});return result;};
   if(action==='cancelSoDecryptionAid'){
    const a=await tx.get(actionPath(sid,documentId(input.actionId)));
    requireThat(a?.aid?.characterId===c.id&&a.aid.uid===actor.uid&&a.aid.accessVersion===registration.accessVersion,'FORBIDDEN');
    requireThat(a.status==='RUNNING','SO_INF02_STALE');
    const initiator=await tx.get(charPath(sid,a.characterId)),state=await tx.get(actorPath(sid,a.characterId));
    await cancel(tx,s,initiator,state,a,at);
    return record({id:a.id,status:'CANCELLED'});
   }
   if(action==='startSoDecryption'){
    await live(tx,s,c,at);
    requireThat(!active&&time>=readyAt,'SO_INF02_COOLDOWN');
    requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeMaintenanceId&&!c.activeCargoId&&!c.activeVoyageId,'SO_INF02_BUSY');
    if(s.spaceOutlaws.pickpocketVersion===1){const rogue=await tx.get(base(sid)+'/pickpocketRogues/'+c.id);requireThat(!rogue?.activeId,'SO_INF02_BUSY');}
    if(s.spaceOutlaws.escapeVersion===1){
     const rogue=await tx.get(base(sid)+'/soEscapeRogues/'+c.id);requireThat(!rogue?.activeId,'SO_INF02_BUSY');
     const cap=await tx.get(base(sid)+'/soCaptivities/'+c.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
    const kid=documentId(input.knowledgeId),{k,r}=await document(tx,sid,c.id,kid,at);
    requireThat(level>=k.cipher.minLevel,'SO_INF02_SKILL');
    requireThat(r.decodedRevision!==k.revision,'SO_INF02_ALREADY');
    const attempt=await tx.get(attemptPath(sid,c.id,k.id,k.revision));
    requireThat(!['RUNNING','FAILED','SUCCESS'].includes(attempt?.status),'SO_INF02_ALREADY');
    requireThat(!k.cipher.challenge||(!input.bonusLotId&&!input.aidOfferId),'AID_NOT_ALLOWED');
    let bonusLot=null;
    if(input.bonusLotId){bonusLot=await readLot(tx,sid,documentId(input.bonusLotId),at);requireThat(bonusLot&&personalLot(bonusLot,c.id)&&bonusLot.status==='AVAILABLE'&&bonusLot.quantity>0&&!bonusLot.item.consumable&&!bonusLot.item.shipModule&&(k.cipher.bonusItemIds??[]).includes(bonusLot.item.id),'FIELD_EQUIPMENT_UNAVAILABLE');}
    const profile={test:'D6',skillId:'INF-02',minLevel:k.cipher.minLevel};
    const aid=await prepareAid(tx,s,c,input,profile,family,at);
    if(aid){
     await live(tx,s,aid.character,at);
     const helperState=await tx.get(actorPath(sid,aid.character.id));
     requireThat((helperState?.cooldownUntil??0)<=time,'SO_INF02_COOLDOWN');
    }
    const pointsPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointsPath),at);
    const id=uuid(),durationSeconds=k.cipher.challenge?.durationSeconds??durations[level],a={id,mode:k.cipher.challenge?'CODE':'D6',characterId:c.id,knowledgeId:k.id,knowledgeRevision:k.revision,
      status:'RUNNING',level,durationSeconds,readyAtGameMs:time+durationSeconds*1000,startedAtGameMs:time,
      accessVersion:registration.accessVersion,actorUid:actor.uid,bonus:bonusLot?1:0,bonusLotId:bonusLot?.id??null,bonusItemId:bonusLot?.item.id??null,bonusLotRevision:bonusLot?bonusLot.revision+1:null,profile,aid:aidSnapshot(aid),family,cooldownSeconds:600};
    reserveAid(tx,s,a,aid,'inf02Actions');
    if(bonusLot)tx.set(base(sid)+'/inventory/'+bonusLot.id,{...bonusLot,status:'FIELD_RESERVED',fieldActionId:id,revision:bonusLot.revision+1});
    tx.set(pointsPath,reserveActionPoints(points,1));
    tx.set(charPath(sid,c.id),{...c,activeFieldActionId:id});
    tx.set(actorPath(sid,c.id),{...state,activeId:id});
    tx.set(actionPath(sid,id),a);
    tx.set(attemptPath(sid,c.id,k.id,k.revision),{id,status:'RUNNING'});
    return record({...summarize(a),remainingMs:durationSeconds*1000});
   }
   requireThat(['finishSoDecryption','cancelSoDecryption'].includes(action),'INVALID_ACTION');
   const id=documentId(input.actionId),a=await tx.get(actionPath(sid,id));
   requireThat(a?.characterId===c.id&&a.accessVersion===registration.accessVersion&&a.status==='RUNNING'&&state.activeId===id,'SO_INF02_STALE');
   const mark=await tx.get(attemptPath(sid,c.id,a.knowledgeId,a.knowledgeRevision));
   requireThat(mark?.status==='RUNNING'&&mark.id===id,'SO_INF02_STALE');
   const pointsPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointsPath),at);
   requireThat(c.activeFieldActionId===id,'SO_INF02_STALE');
   if(action==='cancelSoDecryption'){
    return record(await cancel(tx,s,c,state,a,at));
   }
   await live(tx,s,c,at);
   requireThat(time>=a.readyAtGameMs,'SO_INF02_TOO_EARLY');
   const {k,r}=await document(tx,sid,c.id,a.knowledgeId,at);
   requireThat(k.revision===a.knowledgeRevision,'SO_INF02_STALE');
   requireThat(level>=a.level&&level>=k.cipher.minLevel,'SO_INF02_SKILL');
   const challenge=k.cipher.challenge;requireThat((a.mode??'D6')===(challenge?'CODE':'D6'),'SO_INF02_STALE');
   const bonusLot=await reservedBonus(tx,s,c,a,at);
   if(bonusLot)requireThat((k.cipher.bonusItemIds??[]).includes(bonusLot.item.id),'FIELD_EQUIPMENT_UNAVAILABLE');
   await checkAid(tx,s,a,at);
   if(a.aid&&s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(base(sid)+'/soCaptivities/'+a.aid.characterId);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
   let roll=null,total=null,success;
   if(challenge){
    requireThat(!a.aid&&!a.bonusLotId,'SO_INF02_STALE');
    requireThat(typeof input.answer==='string'&&input.answer.length<=128,'SO_INF02_ANSWER');
    let digest;try{digest=intrusionAnswerDigest(input.answer);}catch{requireThat(false,'SO_INF02_ANSWER');}
    success=digest===challenge.answerDigest;
   }else{
    roll=rolled??(rolled=rollD6());requireThat(Number.isInteger(roll)&&roll>=1&&roll<=6,'INVALID_DIE');
    total=roll+a.level+(a.bonus??0)+(a.aid?1:0);success=total>=k.cipher.threshold;
   }
   const ended={...a,status:success?'SUCCESS':'FAILED',finishedAtGameMs:time,roll,total,
    threshold:challenge?null:k.cipher.threshold,success};
   await finishAid(tx,s,a,at);
   releaseBonus(tx,s,a,bonusLot,at,false);
   tx.set(cooldownPath(sid,c.id,family),{readyAtGameMs:time+cooldownMs,actionId:id});
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
