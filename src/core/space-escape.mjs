import {createHash} from 'node:crypto';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {gameTime} from './clock.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const root=sid=>'sessions/'+sid;
const cp=(sid,id)=>root(sid)+'/characters/'+id;
const captivityPath=(sid,id)=>root(sid)+'/soCaptivities/'+id;
const roguePath=(sid,id)=>root(sid)+'/soEscapeRogues/'+id;
const actionPath=(sid,id)=>root(sid)+'/soEscapeActions/'+id;
const cooldown=600000,maximumCaptivity=1200000;
const durations=[null,60,45,45,30,30];
export const soEscapeActions=['soEscapeAdmin','mySoEscape','setSoCaptivity','guardSoCaptivity','endSoCaptivity','startSoEscape','finishSoEscape','cancelSoEscape'];
const compact=a=>a?{id:a.id,status:a.status,durationSeconds:a.durationSeconds??null,remainingMs:a.remainingMs??0,reason:a.reason??null}:null;
export function createSoEscapeService({store,signed,checkSession,now,uuid}){
 async function player(tx,actor,sid){
  signed(actor);const s=await tx.get(root(sid));
  requireThat(s?.spaceOutlaws?.escapeVersion===1,'SO_ESCAPE_CLOSED');
  const r=await tx.get(root(sid)+'/registrations/'+hash(actor.uid));
  requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(cp(sid,r.characterId));
  requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','FORBIDDEN');
  return {s,c};
 }
 function live(s,c){
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat,'SO_ESCAPE_UNAVAILABLE');
 }
 async function interrupt(tx,s,c,cap,a,at,discovered,reason){
  const p=actionPointPath(s.id,c.id),points=actionPointState(s,c,await tx.get(p),at);
  const t=gameTime(s.clock,at),state=await tx.get(roguePath(s.id,c.id))??{activeId:null,cooldownUntil:0};
  requireThat(state.activeId===a.id&&cap.activeId===a.id,'SO_ESCAPE_STALE');
  const ended={...a,status:discovered?'DISCOVERED':'CANCELLED',reason,finishedAtGameMs:t};
  tx.set(actionPath(s.id,a.id),ended);
  tx.set(captivityPath(s.id,c.id),{...cap,activeId:null});
  tx.set(roguePath(s.id,c.id),{...state,activeId:null,cooldownUntil:discovered?t+cooldown:state.cooldownUntil});
  tx.set(p,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
  return compact(ended);
 }
 return async function dispatch(action,actor,input){
  signed(actor);const sid=documentId(input.sessionId),at=now();
  return store.runTransaction(async tx=>{
   const admin=['soEscapeAdmin','setSoCaptivity','guardSoCaptivity','endSoCaptivity'].includes(action);
   const ctx=admin?null:await player(tx,actor,sid);
   const s=admin?await checkSession(tx,actor,sid,'content',true):ctx.s;
   requireThat(s?.spaceOutlaws?.escapeVersion===1,'SO_ESCAPE_CLOSED');
   if(action==='soEscapeAdmin'){
    const people=(await tx.list(root(sid)+'/characters',null,{limit:1001})).filter(c=>c.publicationState==='PUBLISHED');
    requireThat(people.length<=1000,'SO_RELEASE_LIMIT');
    const caps=await Promise.all(people.map(c=>tx.get(captivityPath(sid,c.id))));
    return {session:{id:sid,stage:s.stage},characters:people.map(c=>({id:c.id,name:c.public.displayName})),
     captivities:caps.filter(Boolean).map(c=>({...c,releaseDue:c.status==='ACTIVE'&&at>=c.expiresAt}))};
   }
   if(action==='mySoEscape'){
    const {c}=ctx,level=Math.min(5,abilityLevel(c,'ROG-03')),cap=await tx.get(captivityPath(sid,c.id));
    const state=await tx.get(roguePath(sid,c.id))??{activeId:null,cooldownUntil:0},time=gameTime(s.clock,at);
    const a=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
    return {enabled:level>0,level,releaseDue:cap?.status==='ACTIVE'&&at>=cap.expiresAt,
     captivity:cap?{status:cap.status,kind:cap.kind,guarded:cap.guarded,remainingRealMs:Math.max(0,cap.expiresAt-at)}:null,
     cooldownMs:Math.max(0,state.cooldownUntil-time),
     active:a?compact({...a,remainingMs:Math.max(0,a.readyAtGameMs-time)}):null};
   }
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId);
   const fingerprint=hash(JSON.stringify([action,input])),prior=await tx.get(op);
   if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
   authorizeSpaceOutlaws(tx,s,'ESCAPE');
   const record=result=>{tx.set(op,{fingerprint,result,at});return result;};
   if(admin){
    const cid=documentId(input.characterId),c=await tx.get(cp(sid,cid));
    requireThat(c?.publicationState==='PUBLISHED','SO_ESCAPE_UNAVAILABLE');
    const cap=await tx.get(captivityPath(sid,cid));
    requireThat(s.stage==='EN_JEU'||action==='endSoCaptivity','SESSION_NOT_RUNNING');
    requireThat(action==='endSoCaptivity'||!s.safetyStop?.active,'SO_SAFETY_STOP');
    if(action==='setSoCaptivity'){
     requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeVoyageId&&!c.activeMaintenanceId&&!c.activeCargoId,'SO_ESCAPE_BUSY');
     const pick=await tx.get(root(sid)+'/pickpocketRogues/'+cid);
     requireThat(!pick?.activeId,'SO_ESCAPE_BUSY');
     requireThat(!cap||cap.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');
     requireThat(['CELL','ESCORT','OPEN'].includes(input.kind)&&input.safePath===true,'SO_ESCAPE_OPPORTUNITY');
     requireThat(typeof input.reason==='string'&&input.reason.trim()&&input.reason.length<=500,'REASON_REQUIRED');
     const next={id:uuid(),characterId:cid,kind:input.kind,code:uuid(),status:'ACTIVE',
      guarded:input.guarded===true,activeId:null,startedAt:at,expiresAt:at+maximumCaptivity,
      reason:input.reason.trim(),createdBy:actor.uid};
     tx.set(captivityPath(sid,cid),next);
     return record({characterId:cid,status:'ACTIVE',kind:next.kind,code:next.code,expiresAt:next.expiresAt});
    }
    requireThat(cap?.status==='ACTIVE','SO_ESCAPE_UNAVAILABLE');
    if(action==='guardSoCaptivity'){
     requireThat(typeof input.guarded==='boolean','SO_ESCAPE_OPPORTUNITY');
     let interrupted=null;
     if(input.guarded&&cap.activeId){
      const a=await tx.get(actionPath(sid,cap.activeId));requireThat(a?.status==='RUNNING','SO_ESCAPE_STALE');
      interrupted=await interrupt(tx,s,c,cap,a,at,true,'GUARD_DISCOVERED');
     }
     tx.set(captivityPath(sid,cid),{...cap,activeId:interrupted?null:cap.activeId,guarded:input.guarded});
     return record({characterId:cid,guarded:input.guarded,discovered:!!interrupted});
    }
    requireThat(action==='endSoCaptivity','INVALID_ACTION');
    if(cap.activeId){
     const a=await tx.get(actionPath(sid,cap.activeId));requireThat(a?.status==='RUNNING','SO_ESCAPE_STALE');
     await interrupt(tx,s,c,cap,a,at,false,'MJ_RELEASE');
    }
    tx.set(captivityPath(sid,cid),{...cap,status:'RELEASED',activeId:null,releasedAt:at,releasedBy:actor.uid});
    return record({characterId:cid,status:'RELEASED',releaseDue:at>=cap.expiresAt});
   }
   const {c}=ctx,level=Math.min(5,abilityLevel(c,'ROG-03'));
   requireThat(level>0,'SO_ESCAPE_SKILL');
   const cap=await tx.get(captivityPath(sid,c.id));
   requireThat(cap?.status==='ACTIVE','SO_ESCAPE_UNAVAILABLE');
   requireThat(at<cap.expiresAt,'SO_ESCAPE_RELEASE_DUE');
   const time=gameTime(s.clock,at),state=await tx.get(roguePath(sid,c.id))??{activeId:null,cooldownUntil:0};
   if(action==='startSoEscape'){
    live(s,c);
    requireThat(!cap.activeId&&!state.activeId&&time>=state.cooldownUntil,'SO_ESCAPE_COOLDOWN');
    requireThat(!cap.guarded,'SO_ESCAPE_GUARDED');
    requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId&&!c.activeVoyageId&&!c.activeMaintenanceId&&!c.activeCargoId,'SO_ESCAPE_UNAVAILABLE');
    const pick=await tx.get(root(sid)+'/pickpocketRogues/'+c.id);
    requireThat(!pick?.activeId,'SO_ESCAPE_BUSY');
    requireThat(input.present===true,'SO_ESCAPE_PRESENCE');
    requireThat(cap.kind==='CELL'||cap.kind==='ESCORT'&&level>=3||cap.kind==='OPEN'&&level>=5,'SO_ESCAPE_SKILL');
    requireThat(cap.kind==='OPEN'||documentId(input.code)===cap.code,'SO_ESCAPE_QR');
    const seconds=durations[level],ready=time+seconds*1000;
    requireThat(at+seconds*1000<=cap.expiresAt,'SO_ESCAPE_RELEASE_DUE');
    const p=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(p),at),id=uuid();
    const attempt={id,characterId:c.id,captivityId:cap.id,status:'RUNNING',startedAtGameMs:time,readyAtGameMs:ready,durationSeconds:seconds};
    tx.set(p,reserveActionPoints(points,1));
    tx.set(roguePath(sid,c.id),{...state,activeId:id});
    tx.set(captivityPath(sid,c.id),{...cap,activeId:id});
    tx.set(actionPath(sid,id),attempt);
    return record(compact({...attempt,remainingMs:seconds*1000}));
   }
   const id=documentId(input.actionId),a=await tx.get(actionPath(sid,id));
   requireThat(a?.characterId===c.id&&a.captivityId===cap.id&&a.status==='RUNNING'&&cap.activeId===id&&state.activeId===id,'SO_ESCAPE_STALE');
   if(action==='cancelSoEscape')return record(await interrupt(tx,s,c,cap,a,at,false,'VOLUNTARY'));
   requireThat(action==='finishSoEscape','INVALID_ACTION');
   live(s,c);requireThat(!cap.guarded,'SO_ESCAPE_GUARDED');
   requireThat(time>=a.readyAtGameMs,'SO_ESCAPE_TOO_EARLY');
   requireThat(input.safeExit===true,'SO_ESCAPE_SAFE_EXIT');
   const p=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(p),at);
   const ended={...a,status:'ESCAPED',finishedAtGameMs:time};
   tx.set(p,resolveActionPoints(points,1));
   tx.set(roguePath(sid,c.id),{...state,activeId:null,cooldownUntil:time+cooldown});
   tx.set(captivityPath(sid,c.id),{...cap,status:'ESCAPED',activeId:null,escapedAt:at});
   tx.set(actionPath(sid,id),ended);
   return record(compact(ended));
  });
 };
}
