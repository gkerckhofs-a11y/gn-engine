import {createHash,randomInt} from 'node:crypto';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const base=sid=>'sessions/'+sid;
const characterPath=(sid,cid)=>base(sid)+'/characters/'+cid;
const actorPath=(sid,cid)=>base(sid)+'/inf01Actors/'+cid;
const actionPath=(sid,id)=>base(sid)+'/inf01Actions/'+id;
const targetPath=(sid,tid)=>base(sid)+'/fieldTargets/'+tid;
const statePath=(sid,tid)=>base(sid)+'/fieldStates/'+tid;
const cooldownMs=600000,durations=[null,180,165,150,135,120];
export const soIntrusionActions=['mySoIntrusion','startSoIntrusion','finishSoIntrusion','cancelSoIntrusion'];
const resultView=a=>({id:a.id,status:a.status,targetId:a.targetId,durationSeconds:a.durationSeconds,
 remainingMs:a.remainingMs??0,roll:a.roll??null,total:a.total??null,threshold:a.threshold??null,
 success:a.success??null,...(a.text?{text:a.text}:{})});
export function createSoIntrusionService({store,signed,now,uuid,rollD6=()=>randomInt(1,7)}){
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
 const live=(s,c)=>{
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat,'SO_INF01_UNAVAILABLE');
 };
 return async function dispatch(action,actor,input){
  const sid=documentId(input.sessionId),at=now(),roll=action==='finishSoIntrusion'?rollD6():null;
  return store.runTransaction(async tx=>{
   const {s,c,r}=await access(tx,actor,sid);
   const tid=documentId(input.targetId);
   const t=await tx.get(targetPath(sid,tid)),field=await tx.get(statePath(sid,tid));
   requireThat(t?.publicationState==='PUBLISHED'&&t.kind==='INTRUSION'&&t.intrusion&&field,'SO_INF01_TARGET');
   const time=gameTime(s.clock,at),level=Math.min(5,abilityLevel(c,'INF-01'));
   const state=await tx.get(actorPath(sid,c.id))??{activeId:null,cooldownUntil:0};
   const active=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
   if(action==='mySoIntrusion'){
    const last=await tx.list(base(sid)+'/inf01Actions',['characterId',c.id],{limit:1001});
    requireThat(last.length<=1000,'SO_RELEASE_LIMIT');
    return {enabled:level>0,level,session:{id:sid,stage:s.stage},
     target:{id:t.id,title:t.title,description:t.description,category:t.intrusion.category,
      minLevel:t.intrusion.minLevel,threshold:t.intrusion.threshold,busy:!!field.activeActionId},
     cooldownMs:Math.max(0,state.cooldownUntil-time),
     active:active?resultView({...active,remainingMs:Math.max(0,active.readyAtGameMs-time)}):null,
     previous:last.filter(a=>a.targetId===tid&&a.status!=='RUNNING').slice(-5).map(resultView)};
   }
   requireThat(level>0,'SO_INF01_SKILL');
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId);
   const fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);
   if(previous){requireThat(previous.fingerprint===fingerprint&&previous.characterId===c.id&&previous.accessVersion===r.accessVersion,'FORBIDDEN');return previous.result;}
   authorizeSpaceOutlaws(tx,s,'INF01');
   const record=v=>{tx.set(op,{fingerprint,result:v,at,characterId:c.id,accessVersion:r.accessVersion});return v;};
   if(action==='startSoIntrusion'){
    live(s,c);requireThat(input.present===true,'SO_INF01_PRESENCE');
    requireThat(level>=t.intrusion.minLevel,'SO_INF01_SKILL');
    requireThat(!state.activeId&&time>=state.cooldownUntil,'SO_INF01_COOLDOWN');
    requireThat(field.status==='ONLINE'&&!field.activeActionId,'SO_INF01_BUSY');
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
    const path=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(path),at),id=uuid();
    const seconds=durations[level],a={id,characterId:c.id,targetId:tid,targetRevision:t.revision,
     accessVersion:r.accessVersion,status:'RUNNING',durationSeconds:seconds,level,
     startedAtGameMs:time,readyAtGameMs:time+seconds*1000};
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
   if(action==='cancelSoIntrusion'){
    const ended={...a,status:'CANCELLED',finishedAtGameMs:time};
    tx.set(path,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
    tx.set(characterPath(sid,c.id),{...c,activeFieldActionId:null});
    tx.set(actorPath(sid,c.id),{...state,activeId:null});
    tx.set(statePath(sid,tid),{...field,activeActionId:null,revision:field.revision+1});
    tx.set(actionPath(sid,id),ended);
    return record(resultView(ended));
   }
   live(s,c);
   requireThat(time>=a.readyAtGameMs,'SO_INF01_TOO_EARLY');
   requireThat(input.present===true,'SO_INF01_PRESENCE');
   requireThat(t.revision===a.targetRevision&&field.status==='ONLINE','SO_INF01_STALE');
   const total=roll+a.level,success=total>=t.intrusion.threshold;
   const text=success?t.intrusion.successText:t.intrusion.failureText;
   const ended={...a,status:success?'SUCCESS':'FAILED',finishedAtGameMs:time,
    roll,total,threshold:t.intrusion.threshold,success,text};
   tx.set(path,resolveActionPoints(points,1));
   tx.set(characterPath(sid,c.id),{...c,activeFieldActionId:null});
   tx.set(actorPath(sid,c.id),{...state,activeId:null,cooldownUntil:time+cooldownMs});
   tx.set(statePath(sid,tid),{...field,activeActionId:null,revision:field.revision+1});
   tx.set(actionPath(sid,id),ended);
   return record(resultView(ended));
  });
 };
}
