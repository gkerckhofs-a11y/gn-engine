import {createHash,randomInt} from 'node:crypto';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {readLot,personalLot,lotState,newLot} from './inventory-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const base=sid=>'sessions/'+sid;
const characterPath=(sid,cid)=>base(sid)+'/characters/'+cid;
const actorPath=(sid,cid)=>base(sid)+'/inf03Actors/'+cid;
const actionPath=(sid,id)=>base(sid)+'/inf03Actions/'+id;
const targetPath=(sid,id)=>base(sid)+'/fieldTargets/'+id;
const invPath=(sid,id)=>base(sid)+'/inventory/'+id;
const statePath=(sid,id)=>base(sid)+'/fieldStates/'+id;
const durations=[null,300,270,240,210,180],cooldownMs=600000;
const isBlank=(lot,itemId)=>lot?.item?.id===itemId&&(lot.item.consumable===true||lot.origin?.kind==='SO_BIRTH'&&lot.origin?.slotId==='blank-forms');
export const soForgeryActions=['inspectSoForgery','mySoForgery','startSoForgery','finishSoForgery','cancelSoForgery'];
const view=a=>({id:a.id,targetId:a.targetId,status:a.status,durationSeconds:a.durationSeconds,
 remainingMs:a.remainingMs??0,roll:a.roll??null,total:a.total??null,threshold:a.threshold??null,
 success:a.success??null,documentId:a.documentId??null});
export function createSoForgeryService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 async function access(tx,actor,sid){
  signed(actor);const s=await tx.get(base(sid));requireThat(s?.spaceOutlaws?.inf03Version===1,'SO_INF03_CLOSED');
  const r=await tx.get(base(sid)+'/registrations/'+hash(actor.uid));
  requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(characterPath(sid,r.characterId));
  requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','FORBIDDEN');
  return {s,c,r};
 }
 const live=(s,c)=>{
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat,'SO_INF03_UNAVAILABLE');
 };
 return async function dispatch(action,actor,input){
  const sid=documentId(input.sessionId),at=now(),roll=action==='finishSoForgery'?rollD6():null;
  return store.runTransaction(async tx=>{
   if(action==='inspectSoForgery'){
    const s=await checkSession(tx,actor,sid,'content',true);
    requireThat(s?.spaceOutlaws?.inf03Version===1,'SO_INF03_CLOSED');
    const lotId=documentId(input.lotId),lot=await tx.get(invPath(sid,lotId));
    const evidence=await tx.get(base(sid)+'/forgeryRecords/'+lotId);
    requireThat(lot&&evidence&&lot.origin?.kind==='SO_FORGERY'&&lot.origin?.actionId===evidence.actionId,'SO_INF03_RECORD');
    return {lotId,documentName:lot.item.name,documentText:lot.item.description,
     holderId:lot.holderId,ownerId:lot.ownerId,status:lot.status,
     templateId:evidence.templateId,templateRevision:evidence.templateRevision,
     quality:evidence.quality,anomalies:evidence.anomalies,createdAt:evidence.at,
     originActionId:evidence.actionId};
   }
   const {s,c,r}=await access(tx,actor,sid),tid=documentId(input.targetId);
   const target=await tx.get(targetPath(sid,tid)),field=await tx.get(statePath(sid,tid));
   requireThat(target?.publicationState==='PUBLISHED'&&target.kind==='FORGERY'&&target.forgery&&field,'SO_INF03_TARGET');
   const time=gameTime(s.clock,at),level=Math.min(5,abilityLevel(c,'INF-03'));
   const state=await tx.get(actorPath(sid,c.id))??{activeId:null,cooldownUntil:0};
   const active=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
   if(action==='mySoForgery'){
    const inventory=await tx.list(base(sid)+'/inventory',['holderId',c.id],{limit:1001});
    requireThat(inventory.length<=1000,'SO_RELEASE_LIMIT');
    const blanks=inventory.filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&isBlank(l,target.forgery.blankItemId)&&l.quantity>0).map(l=>({id:l.id,name:l.item.name,quantity:l.quantity}));
    return {enabled:level>0,level,session:{id:sid,stage:s.stage},target:{id:tid,title:target.title,
     description:target.description,category:target.forgery.category,minLevel:target.forgery.minLevel,
     threshold:target.forgery.threshold,blankItemId:target.forgery.blankItemId,busy:!!field.activeActionId},
     blanks,cooldownMs:Math.max(0,state.cooldownUntil-time),
     active:active?view({...active,remainingMs:Math.max(0,active.readyAtGameMs-time)}):null};
   }
   requireThat(level>0,'SO_INF03_SKILL');
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId);
   const fingerprint=hash(JSON.stringify([action,input])),receipt=await tx.get(op);
   if(receipt){requireThat(receipt.fingerprint===fingerprint&&receipt.characterId===c.id
     &&receipt.accessVersion===r.accessVersion,'FORBIDDEN');return receipt.result;}
   authorizeSpaceOutlaws(tx,s,'INF03');
   const record=result=>{tx.set(op,{fingerprint,result,at,characterId:c.id,accessVersion:r.accessVersion});return result;};
   if(action==='startSoForgery'){
    live(s,c);requireThat(input.present===true,'SO_INF03_PRESENCE');
    requireThat(level>=target.forgery.minLevel,'SO_INF03_SKILL');
    requireThat(!state.activeId&&time>=state.cooldownUntil,'SO_INF03_COOLDOWN');
    requireThat(field.status==='ONLINE'&&!field.activeActionId,'SO_INF03_BUSY');
    requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeVoyageId
      &&!c.activeMaintenanceId&&!c.activeCargoId,'SO_INF03_BUSY');
    if(s.spaceOutlaws.escapeVersion===1){
     const cap=await tx.get(base(sid)+'/soCaptivities/'+c.id),escape=await tx.get(base(sid)+'/soEscapeRogues/'+c.id);
     requireThat(cap?.status!=='ACTIVE'&&!escape?.activeId,'SO_INF03_BUSY');
    }
    if(s.spaceOutlaws.pickpocketVersion===1){
     const pick=await tx.get(base(sid)+'/pickpocketRogues/'+c.id);requireThat(!pick?.activeId,'SO_INF03_BUSY');
    }
    if(s.spaceOutlaws.inf02Version===1){
     const decoding=await tx.get(base(sid)+'/inf02Actors/'+c.id);requireThat(!decoding?.activeId,'SO_INF03_BUSY');
    }
    const lid=documentId(input.blankLotId),blank=await readLot(tx,sid,lid,at);
    requireThat(blank&&personalLot(blank,c.id)&&blank.status==='AVAILABLE'&&blank.quantity>0
      &&isBlank(blank,target.forgery.blankItemId)
      &&!blank.forgeryEvidence&&!blank.marketReservation&&!blank.boardingCustody,'SO_INF03_FORM');
    const path=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(path),at),id=uuid();
    const durationSeconds=durations[level];
    const a={id,characterId:c.id,targetId:tid,targetRevision:target.revision,blankLotId:lid,
      blankRevision:blank.revision,accessVersion:r.accessVersion,level,status:'RUNNING',
      durationSeconds,readyAtGameMs:time+durationSeconds*1000};
    tx.set(path,reserveActionPoints(points,1));
    tx.set(invPath(sid,lid),{...blank,status:'FIELD_RESERVED',forgeryActionId:id,revision:blank.revision+1});
    tx.set(characterPath(sid,c.id),{...c,activeFieldActionId:id});
    tx.set(actorPath(sid,c.id),{...state,activeId:id});
    tx.set(statePath(sid,tid),{...field,activeActionId:id,revision:field.revision+1});
    tx.set(actionPath(sid,id),a);
    return record(view({...a,remainingMs:durationSeconds*1000}));
   }
   requireThat(['finishSoForgery','cancelSoForgery'].includes(action),'INVALID_ACTION');
   const aid=documentId(input.actionId),a=await tx.get(actionPath(sid,aid));
   requireThat(a?.characterId===c.id&&a.targetId===tid&&a.accessVersion===r.accessVersion
    &&a.status==='RUNNING'&&state.activeId===aid&&field.activeActionId===aid
    &&c.activeFieldActionId===aid,'SO_INF03_STALE');
   const blank=await tx.get(invPath(sid,a.blankLotId));
   requireThat(blank?.status==='FIELD_RESERVED'&&blank.forgeryActionId===aid
    &&blank.revision===a.blankRevision+1&&personalLot(blank,c.id),'SO_INF03_FORM');
   const pointPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointPath),at);
   const unlock=()=>{tx.set(characterPath(sid,c.id),{...c,activeFieldActionId:null});
    tx.set(actorPath(sid,c.id),{...state,activeId:null});
    tx.set(statePath(sid,tid),{...field,activeActionId:null,revision:field.revision+1});};
   if(action==='cancelSoForgery'){
    const ended={...a,status:'CANCELLED',finishedAtGameMs:time};
    tx.set(pointPath,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
    tx.set(invPath(sid,a.blankLotId),{...blank,status:'AVAILABLE',forgeryActionId:null,revision:blank.revision+1});
    tx.set(actionPath(sid,aid),ended);unlock();
    return record(view(ended));
   }
   live(s,c);requireThat(time>=a.readyAtGameMs,'SO_INF03_TOO_EARLY');
   requireThat(input.present===true,'SO_INF03_PRESENCE');
   requireThat(target.revision===a.targetRevision&&field.status==='ONLINE','SO_INF03_STALE');
   requireThat(Number.isSafeInteger(roll)&&roll>=1&&roll<=6,'INVALID_DIE');
   const total=roll+a.level,success=total>=target.forgery.threshold;
   const next={...blank,quantity:blank.quantity-1,status:blank.quantity===1?'CONSUMED':'AVAILABLE',
    forgeryActionId:null,revision:blank.revision+1};
   tx.set(invPath(sid,blank.id),next);
   tx.set(invPath(sid,blank.id)+'/history/'+aid,{id:aid,at,kind:'SO_FORGERY_FORM_SPENT',
    characterId:c.id,before:lotState(blank),after:lotState(next)});
   let documentIdCreated=null;
   if(success){
    documentIdCreated=uuid();
    const item={id:'forged_'+hash(tid).slice(0,24),name:target.forgery.documentTitle,
     description:target.forgery.documentText,category:'Document de fiction',unit:'document',
     kind:'INDIVIDUAL',consumable:false,unitVolume:null,legality:'UNSPECIFIED',
     publicationState:'PUBLISHED',revision:1,pillable:true,pickpocketable:true,gmNotes:''};
    const lot=newLot(documentIdCreated,item,1,c.id,at,{kind:'SO_FORGERY',actionId:aid,
     templateId:tid,templateRevision:target.revision});
    tx.set(invPath(sid,documentIdCreated),{...lot,pillable:true,transferable:true,resellable:false});
    tx.set(invPath(sid,documentIdCreated)+'/history/'+aid,{id:aid,at,kind:'SO_FORGERY_CREATED',
     characterId:c.id,before:null,after:lotState(lot)});
    tx.set(base(sid)+'/forgeryRecords/'+documentIdCreated,{id:documentIdCreated,at,characterId:c.id,
     templateId:tid,templateRevision:target.revision,quality:a.level,
     anomalies:target.forgery.anomalies,actionId:aid});
   }
   const ended={...a,status:success?'SUCCESS':'FAILED',finishedAtGameMs:time,roll,total,
    threshold:target.forgery.threshold,success,documentId:documentIdCreated};
   tx.set(actionPath(sid,aid),ended);
   tx.set(pointPath,resolveActionPoints(points,1));
   unlock();tx.set(actorPath(sid,c.id),{...state,activeId:null,cooldownUntil:time+cooldownMs});
   return record(view(ended));
  });
 };
}
