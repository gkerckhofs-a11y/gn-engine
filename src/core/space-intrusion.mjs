import {recordFictionalTrace} from './space-fictional-traces.mjs';
import {readLot,personalLot,lotState} from './inventory-state.mjs';
import {prepareAid,reserveAid,checkAid,finishAid,aidSnapshot,cooldownPath} from './aid-state.mjs';
import {offeredAid} from './person-actions.mjs';
import {requireGameAction} from './health-state.mjs';
import {createHash,randomInt} from 'node:crypto';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';
import {intrusionAnswerDigest} from './field-state.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const base=sid=>'sessions/'+sid;
const characterPath=(sid,cid)=>base(sid)+'/characters/'+cid;
const actorPath=(sid,cid)=>base(sid)+'/inf01Actors/'+cid;
const actionPath=(sid,id)=>base(sid)+'/inf01Actions/'+id;
const targetPath=(sid,tid)=>base(sid)+'/fieldTargets/'+tid;
const statePath=(sid,tid)=>base(sid)+'/fieldStates/'+tid;
const cooldownMs=600000,durations=[null,180,165,150,135,120];
export const soIntrusionActions=['soIntrusionAdmin','cancelSoIntrusionMJ','cancelSoIntrusionAid','claimSoIntrusionHint','mySoIntrusion','startSoIntrusion','finishSoIntrusion','cancelSoIntrusion'];
const resultView=a=>({id:a.id,status:a.status,targetId:a.targetId,mode:a.mode??'D6',durationSeconds:a.durationSeconds,
 remainingMs:a.remainingMs??0,roll:a.roll??null,total:a.total??null,threshold:a.threshold??null,
 bonus:a.bonus??0,aid:a.aid?1:0,success:a.success??null,...(a.text?{text:a.text}:{})});
export function createSoIntrusionService({store,signed,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 async function access(tx,actor,sid){
  signed(actor);
  const s=await tx.get(base(sid));
  requireThat(s?.spaceOutlaws?.inf01Version===1,'SO_INF01_CLOSED');
  const r=await tx.get(base(sid)+'/registrations/'+hash(actor.uid));
  requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(characterPath(sid,r.characterId));
  requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','FORBIDDEN');
  return {s,c,r};
 }
 const live=(s,c,at)=>{
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat,'SO_INF01_UNAVAILABLE');requireGameAction(s,c,'discover',at);
 };
 const family='SKILL:INF-01';
 async function reservedLots(tx,s,c,a){
  const lots=[];for(const spec of a.resources??[]){const l=await tx.get(base(s.id)+'/inventory/'+spec.id);requireThat(l&&personalLot(l,c.id)&&l.status==='FIELD_RESERVED'&&l.fieldActionId===a.id&&l.revision===spec.revision&&l.item.id===spec.itemId&&l.quantity>=spec.quantity,'FIELD_EQUIPMENT_UNAVAILABLE');lots.push({lot:l,spec});}return lots;
 }
 function releaseLots(tx,s,a,lots,at,cancelled){
  for(const {lot:l,spec} of lots){const quantity=l.quantity-(cancelled||!spec.consume?0:spec.quantity),next={...l,quantity,status:quantity?'AVAILABLE':'CONSUMED',fieldActionId:null,revision:l.revision+1},path=base(s.id)+'/inventory/'+l.id;tx.set(path,next);tx.set(path+'/history/'+a.id,{id:a.id,at,kind:cancelled?'FIELD_RELEASE':spec.consume?'FIELD_CONSUME':'FIELD_USE',actionId:a.id,before:lotState(l),after:lotState(next)});}
 }
 async function cancel(tx,s,c,state,field,a,at,moderation=null){
  requireThat(c?.activeFieldActionId===a.id&&state?.activeId===a.id&&field?.activeActionId===a.id,'SO_INF01_STALE');
  const path=actionPointPath(s.id,c.id),points=actionPointState(s,c,await tx.get(path),at),lots=await reservedLots(tx,s,c,a);
  const ended={...a,status:'CANCELLED',finishedAtGameMs:gameTime(s.clock,at)};
  await finishAid(tx,s,a,at,{cancel:true});releaseLots(tx,s,a,lots,at,true);
  tx.set(path,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
  tx.set(characterPath(s.id,c.id),{...c,activeFieldActionId:null});tx.set(actorPath(s.id,c.id),{...state,activeId:null});
  tx.set(statePath(s.id,a.targetId),{...field,activeActionId:null,revision:field.revision+1});tx.set(actionPath(s.id,a.id),ended);
  if(moderation){const id=uuid();tx.set(base(s.id)+'/audit/'+id,{id,at,action:'cancelSoIntrusionMJ',actionId:a.id,characterId:c.id,...moderation});}return resultView(ended);
 }
 return async function dispatch(action,actor,input){
  const sid=documentId(input.sessionId),at=now();
  let rolled=null; // One random draw per ordinary command, stable across transactional retries.
  return store.runTransaction(async tx=>{
   if(['soIntrusionAdmin','cancelSoIntrusionMJ'].includes(action)){
    signed(actor);const s=await checkSession(tx,actor,sid,'content',true);requireThat(s?.spaceOutlaws?.inf01Version===1,'SO_INF01_CLOSED');
    if(action==='soIntrusionAdmin'){const rows=await tx.list(base(sid)+'/inf01Actions',['status','RUNNING'],{limit:1001});requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');const actions=[];for(const a of rows){const c=await tx.get(characterPath(sid,a.characterId));actions.push({...resultView(a),characterName:c?.public?.displayName??a.characterId,remainingMs:Math.max(0,a.readyAtGameMs-gameTime(s.clock,at))});}return {actions};}
    requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
    const op='operations/'+hash(actor.uid+':'+documentId(input.requestId)),fingerprint=hash(JSON.stringify([action,input])),old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}
    const a=await tx.get(actionPath(sid,documentId(input.actionId)));requireThat(a,'NOT_FOUND');requireThat(['RUNNING','CANCELLED'].includes(a.status),'SO_INF01_STALE');let result=resultView(a);
    if(a.status==='RUNNING'){const c=await tx.get(characterPath(sid,a.characterId)),state=await tx.get(actorPath(sid,a.characterId)),field=await tx.get(statePath(sid,a.targetId));authorizeSpaceOutlaws(tx,s,'INF01');result=await cancel(tx,s,c,state,field,a,at,{actorUid:actor.uid,reason:input.reason.trim()});}tx.set(op,{fingerprint,result,at});return result;
   }
   const {s,c,r}=await access(tx,actor,sid);
   const aiding=action==='cancelSoIntrusionAid'?await tx.get(actionPath(sid,documentId(input.actionId))):null;
   if(action==='cancelSoIntrusionAid')requireThat(aiding?.aid?.characterId===c.id&&aiding.aid.uid===actor.uid&&aiding.aid.accessVersion===r.accessVersion,'FORBIDDEN');
   const tid=documentId(aiding?.targetId??input.targetId);
   const t=await tx.get(targetPath(sid,tid)),field=await tx.get(statePath(sid,tid));
   requireThat(t?.publicationState==='PUBLISHED'&&t.kind==='INTRUSION'&&t.intrusion&&field,'SO_INF01_TARGET');
   const time=gameTime(s.clock,at),level=Math.min(5,abilityLevel(c,'INF-01'));
   const state=await tx.get(actorPath(sid,c.id))??{activeId:null,cooldownUntil:0};
   const active=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
   const shared=await tx.get(cooldownPath(sid,c.id,family)),readyAt=Math.max(state.cooldownUntil,shared?.readyAtGameMs??0);
   if(action==='mySoIntrusion'){
    const last=await tx.list(base(sid)+'/inf01Actions',['characterId',c.id],{limit:1001});
    requireThat(last.length<=1000,'SO_RELEASE_LIMIT');
    const inventory=await tx.list(base(sid)+'/inventory',['holderId',c.id],{limit:1001});requireThat(inventory.length<=1000,'SO_RELEASE_LIMIT');const lots=inventory.filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0);
    const hintViews=(t.intrusion.hints??[]).filter(h=>h.minLevel<=level).map(h=>({id:h.id,minLevel:h.minLevel,used:!!field.hintClaims?.[hash(JSON.stringify([c.id,t.revision,h.id]))]}));
    return {bonusLots:lots.filter(l=>(t.intrusion.bonusItemIds??[]).includes(l.item.id)&&!l.item.consumable&&!l.item.shipModule).map(l=>({id:l.id,name:l.item.name})),consumable:t.intrusion.consumable??null,consumableLots:lots.filter(l=>l.item.id===t.intrusion.consumable?.itemId&&l.item.consumable&&l.quantity>=t.intrusion.consumable.quantity).map(l=>({id:l.id,name:l.item.name,quantity:l.quantity})),aidOffers:(await offeredAid(tx,sid,c.id)).filter(a=>a.skillId==='INF-01'),hints:hintViews,enabled:level>0,level,session:{id:sid,stage:s.stage},
     target:{id:t.id,title:t.title,description:t.description,category:t.intrusion.category,
      minLevel:t.intrusion.minLevel,threshold:t.intrusion.challenge?null:t.intrusion.threshold,busy:!!field.activeActionId||field.lockedUntilGameMs>time,lockedMs:Math.max(0,(field.lockedUntilGameMs??0)-time),
      ...(t.intrusion.challenge&&level>=t.intrusion.minLevel?{challenge:{type:'CODE',
       prompt:t.intrusion.challenge.prompt,durationSeconds:t.intrusion.challenge.durationSeconds}}:{})},
     cooldownMs:Math.max(0,readyAt-time),
     active:active?resultView({...active,remainingMs:Math.max(0,active.readyAtGameMs-time)}):null,
     previous:last.filter(a=>a.targetId===tid&&a.status!=='RUNNING').slice(-5).map(resultView)};
   }
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId);
   const fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
   if(previous){requireThat(previous.fingerprint===fingerprint&&previous.characterId===c.id&&previous.accessVersion===r.accessVersion,'FORBIDDEN');return previous.result;}
   authorizeSpaceOutlaws(tx,s,'INF01');
   const record=v=>{tx.set(op,{fingerprint,result:v,at,characterId:c.id,accessVersion:r.accessVersion});return v;};
   if(action==='cancelSoIntrusionAid'){
    if(aiding.status==='CANCELLED')return record(resultView(aiding));requireThat(aiding.status==='RUNNING','SO_INF01_STALE');
    const initiator=await tx.get(characterPath(sid,aiding.characterId)),ownerState=await tx.get(actorPath(sid,aiding.characterId));return record(await cancel(tx,s,initiator,ownerState,field,aiding,at));
   }
   if(action==='claimSoIntrusionHint'){
    live(s,c,at);if(s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(base(sid)+'/soCaptivities/'+c.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}requireThat(input.present===true,'SO_INF01_PRESENCE');
    requireThat(active?.status==='RUNNING'&&active.mode==='CODE'&&active.targetId===tid&&active.targetRevision===t.revision&&active.accessVersion===r.accessVersion&&c.activeFieldActionId===active.id&&field.activeActionId===active.id,'SO_INF01_STALE');
    const hint=t.intrusion.hints?.find(h=>h.id===documentId(input.hintId));requireThat(hint&&level>=hint.minLevel&&level>=active.level,'SO_INF01_SKILL');
    const key=hash(JSON.stringify([c.id,t.revision,hint.id]));requireThat(!field.hintClaims?.[key],'SO_INF01_HINT_USED');
    requireThat(Object.keys(field.hintClaims??{}).length<1000,'SO_RELEASE_LIMIT');
    tx.set(statePath(sid,tid),{...field,hintClaims:{...field.hintClaims,[key]:{actionId:active.id,at}},revision:field.revision+1});return record({id:hint.id,text:hint.text});
   }
   if(action==='startSoIntrusion'){
    live(s,c,at);requireThat(input.present===true,'SO_INF01_PRESENCE');
    requireThat(level>=t.intrusion.minLevel,'SO_INF01_SKILL');
    requireThat(!state.activeId&&time>=readyAt,'SO_INF01_COOLDOWN');
    requireThat(field.status==='ONLINE'&&!field.activeActionId&&!(field.lockedUntilGameMs>time),'SO_INF01_BUSY');
    requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeVoyageId&&!c.activeMaintenanceId&&!c.activeCargoId,'SO_INF01_BUSY');
    if(s.spaceOutlaws.escapeVersion===1){
     const cap=await tx.get(base(sid)+'/soCaptivities/'+c.id),rogue=await tx.get(base(sid)+'/soEscapeRogues/'+c.id);
     requireThat(cap?.status!=='ACTIVE'&&!rogue?.activeId,'SO_INF01_BUSY');
    }
    if(s.spaceOutlaws.pickpocketVersion===1){
     const pick=await tx.get(base(sid)+'/pickpocketRogues/'+c.id);requireThat(!pick?.activeId,'SO_INF01_BUSY');
    }
    if(s.spaceOutlaws.inf02Version===1){
     const decoding=await tx.get(base(sid)+'/inf02Actors/'+c.id);requireThat(!decoding?.activeId,'SO_INF01_BUSY');
    }
    requireThat(!t.intrusion.challenge||!input.bonusLotId&&!input.consumableLotId&&!input.aidOfferId,'AID_NOT_ALLOWED');
    const resources=[],selected=[];
    for(const [key,consume] of [['bonusLotId',false],['consumableLotId',true]]){
     const need=consume?t.intrusion.consumable:null;if(consume&&need)requireThat(input[key],'FIELD_CONSUMABLE_REQUIRED');
     if(!input[key])continue;const l=await readLot(tx,sid,documentId(input[key]),at),quantity=need?.quantity??1;
     requireThat(l&&personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>=quantity&&!l.item.shipModule&&(consume?need&&l.item.consumable&&l.item.id===need.itemId:!l.item.consumable&&(t.intrusion.bonusItemIds??[]).includes(l.item.id)),'FIELD_EQUIPMENT_UNAVAILABLE');
     resources.push({id:l.id,itemId:l.item.id,revision:l.revision+1,quantity,consume});selected.push(l);
    }
    const profile={test:t.intrusion.challenge?'CODE':'D6',skillId:'INF-01',minLevel:t.intrusion.minLevel},aid=await prepareAid(tx,s,c,input,profile,family,at);
    if(aid){live(s,aid.character,at);const helper=await tx.get(actorPath(sid,aid.character.id));requireThat((helper?.cooldownUntil??0)<=time,'SO_INF01_COOLDOWN');if(s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(base(sid)+'/soCaptivities/'+aid.character.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}}
    const path=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(path),at),id=uuid();
    const seconds=t.intrusion.challenge?.durationSeconds??durations[level],a={id,characterId:c.id,targetId:tid,targetRevision:t.revision,
     resources,bonus:input.bonusLotId?1:0,aid:aidSnapshot(aid),profile,family,cooldownSeconds:600,actorUid:actor.uid,mode:t.intrusion.challenge?'CODE':'D6',
     accessVersion:r.accessVersion,status:'RUNNING',durationSeconds:seconds,level,
     startedAtGameMs:time,readyAtGameMs:time+seconds*1000};
    reserveAid(tx,s,a,aid,'inf01Actions');for(const l of selected)tx.set(base(sid)+'/inventory/'+l.id,{...l,status:'FIELD_RESERVED',fieldActionId:id,revision:l.revision+1});
    tx.set(path,reserveActionPoints(points,1));
    tx.set(characterPath(sid,c.id),{...c,activeFieldActionId:id});
    tx.set(actorPath(sid,c.id),{...state,activeId:id});
    tx.set(statePath(sid,tid),{...field,activeActionId:id,revision:field.revision+1});
    tx.set(actionPath(sid,id),a);
    return record(resultView({...a,remainingMs:seconds*1000}));
   }
   requireThat(['finishSoIntrusion','cancelSoIntrusion'].includes(action),'INVALID_ACTION');
   const id=documentId(input.actionId),a=await tx.get(actionPath(sid,id));
   requireThat(a?.characterId===c.id&&a.targetId===tid&&a.accessVersion===r.accessVersion&&a.status==='RUNNING'
    &&state.activeId===id&&field.activeActionId===id&&c.activeFieldActionId===id,'SO_INF01_STALE');
   const path=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(path),at);
   if(action==='cancelSoIntrusion')return record(await cancel(tx,s,c,state,field,a,at));
   live(s,c,at);if(s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(base(sid)+'/soCaptivities/'+c.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
   requireThat(time>=a.readyAtGameMs,'SO_INF01_TOO_EARLY');
   requireThat(input.present===true,'SO_INF01_PRESENCE');
   requireThat(t.revision===a.targetRevision&&field.status==='ONLINE','SO_INF01_STALE');
   requireThat(level>=a.level,'SO_INF01_SKILL');const lots=await reservedLots(tx,s,c,a);await checkAid(tx,s,a,at);
   if(a.aid&&s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(base(sid)+'/soCaptivities/'+a.aid.characterId);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
   const challenge=t.intrusion.challenge;
   requireThat(a.mode===(challenge?'CODE':'D6'),'SO_INF01_STALE');
   let roll=null,total=null,success;
   if(challenge){
    requireThat(typeof input.answer==='string'&&input.answer.length<=128&&input.answer.trim().length>=4,'SO_INF01_ANSWER');
    let digest;
    try{digest=intrusionAnswerDigest(input.answer);}catch{requireThat(false,'SO_INF01_ANSWER');}
    success=digest===challenge.answerDigest;
   }else{
    roll=rolled??(rolled=rollD6());
    requireThat(Number.isInteger(roll)&&roll>=1&&roll<=6,'INVALID_DIE');
    total=roll+a.level+(a.bonus??0)+(a.aid?1:0);success=total>=t.intrusion.threshold;
   }
   await recordFictionalTrace(tx,s,c,t,'INTRUSION',a.id,at);
   const text=success?t.intrusion.successText:t.intrusion.failureText;
   const ended={...a,status:success?'SUCCESS':'FAILED',finishedAtGameMs:time,
    roll,total,threshold:challenge?null:t.intrusion.threshold,success,text};
   await finishAid(tx,s,a,at);releaseLots(tx,s,a,lots,at,false);tx.set(cooldownPath(sid,c.id,family),{readyAtGameMs:time+cooldownMs,actionId:id});
   tx.set(path,resolveActionPoints(points,1));
   tx.set(characterPath(sid,c.id),{...c,activeFieldActionId:null});
   tx.set(actorPath(sid,c.id),{...state,activeId:null,cooldownUntil:time+cooldownMs});
   tx.set(statePath(sid,tid),{...field,activeActionId:null,lockedUntilGameMs:!success&&!challenge?time+(t.failureLockSeconds??0)*1000:field.lockedUntilGameMs??0,revision:field.revision+1});
   tx.set(actionPath(sid,id),ended);
   return record(resultView(ended));
  });
 };
}
