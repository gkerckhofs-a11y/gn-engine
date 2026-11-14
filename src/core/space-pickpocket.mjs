import {activeMalaise} from './space-toxicology-state.mjs';
import {activeConcealment} from './space-person-loot.mjs';
import {createHash} from 'node:crypto';
import {admissionIdentity} from './admission-state.mjs';
import {abilityLevel} from './abilities.mjs';
import {actionPointPath,actionPointState,actionPointMaximum,reserveActionPoints,resolveActionPoints,releaseActionPoints} from './action-point-state.mjs';
import {gameTime} from './clock.mjs';
import {readLot,lotState,personalLot} from './inventory-state.mjs';
import {forgedLotIntegrity} from './space-forgery-evidence.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {documentId,requireThat} from './validation.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const prefix=sid=>'sessions/'+sid;
const characterPath=(sid,cid)=>prefix(sid)+'/characters/'+cid;
const roguePath=(sid,cid)=>prefix(sid)+'/pickpocketRogues/'+cid;
const victimPath=(sid,cid)=>prefix(sid)+'/pickpocketVictims/'+cid;
const actionPath=(sid,id)=>prefix(sid)+'/pickpocketActions/'+id;
const alertPath=(sid,cid)=>prefix(sid)+'/pickpocketAlerts/'+cid;
const cooldownMs=600000;
const durations=Object.freeze([null,60,45,45,30,30]);
const hashInput=(action,input)=>hash(JSON.stringify([action,input]));
const commands=['mySoPickpocket','mySoPickpocketAlerts','startSoPickpocket','finishSoPickpocket','chooseSoPickpocket','cancelSoPickpocket'];
export const soPickpocketActions=commands;

const eligible=lot=>lot?.status==='AVAILABLE'&&lot.quantity>0&&lot.item?.pickpocketable===true&&lot.transferable!==false
 &&!lot.item?.shipModule&&!lot.boardingCustody&&!lot.hiddenCargo&&!lot.isHidden
 &&!['SO_BIRTH','SO_INITIAL'].includes(lot.origin?.kind);
const compact=a=>({id:a.id,status:a.status,targetId:a.targetId,level:a.level,durationSeconds:a.durationSeconds,
  startedAtGameMs:a.startedAtGameMs,readyAtGameMs:a.readyAtGameMs,finishedAtGameMs:a.finishedAtGameMs??null,
  ...(a.status==='CHOOSING'?{choices:a.choices}:{}),...(a.result?{result:a.result}:{})});

export function createSoPickpocketService({store,signed,now,uuid}){
 async function identity(tx,actor,sid){
  signed(actor);
  const s=await tx.get(prefix(sid));
  requireThat(s?.spaceOutlaws?.pickpocketVersion===1,'SO_PICKPOCKET_CLOSED');
  const r=await tx.get(prefix(sid)+'/registrations/'+hash(actor.uid));
  requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(characterPath(sid,r.characterId));
  requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED','FORBIDDEN');
  return {s,c,r};
 }
 const levelOf=c=>Math.min(5,abilityLevel(c,'ROG-02'));
 const validateGame=(s,c,at)=>{
  requireThat(s.stage==='EN_JEU'&&s.clock?.runningSince!==null,'SESSION_NOT_RUNNING');
  requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
  requireThat(!c.survival?.dead&&c.hp>0&&!c.outOfCombat&&!activeMalaise(s,c,at),'SO_PICKPOCKET_UNAVAILABLE');
 };
 async function stocked(tx,sid,targetId,at){
  const s=await tx.get(prefix(sid)),target=await tx.get(characterPath(sid,targetId)),lots=await tx.list(prefix(sid)+'/inventory',['holderId',targetId]);
  const byType=new Map();
  for(const raw of lots){
   const l=await readLot(tx,sid,raw.id,at);
   if(activeConcealment(s,target,l,at)||!eligible(l)||!personalLot(l,targetId)||!await forgedLotIntegrity(tx,sid,l))continue;
   if(!byType.has(l.item.id))byType.set(l.item.id,{itemId:l.item.id,name:l.item.name});
  }
  return [...byType.values()];
 }
 async function getLot(tx,sid,targetId,itemId,at){
  const s=await tx.get(prefix(sid)),target=await tx.get(characterPath(sid,targetId)),lots=await tx.list(prefix(sid)+'/inventory',['holderId',targetId]);
  for(const raw of lots){
   const l=await readLot(tx,sid,raw.id,at);
   if(l.item?.id===itemId&&!activeConcealment(s,target,l,at)&&eligible(l)&&personalLot(l,targetId)&&await forgedLotIntegrity(tx,sid,l))return l;
  }
  return null;
 }
 async function finishTransfer(tx,s,a,rogue,rogueState,quota,points,at,itemId,uuid){
  const lot=await getLot(tx,s.id,a.targetId,itemId,at);
  const when=gameTime(s.clock,at),base=prefix(s.id);
  if(!lot||quota.success===true){
   const ended={...a,status:'EMPTY',finishedAtGameMs:when,choices:[],result:{success:false,reason:'NO_ELIGIBLE_ITEM'}};
   tx.set(actionPath(s.id,a.id),ended);
   tx.set(victimPath(s.id,a.targetId),{...quota,activeId:null});
   tx.set(roguePath(s.id,rogue.id),{...rogueState,activeId:null});
   tx.set(actionPointPath(s.id,rogue.id),releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,rogue)));
   return compact(ended);
  }
  const destination=lot.quantity===1?lot.id:uuid();
  const sourceNext=lot.quantity===1?{...lot,ownerId:rogue.id,holderId:rogue.id,location:{kind:'CHARACTER',id:rogue.id},revision:lot.revision+1}:
   {...lot,quantity:lot.quantity-1,revision:lot.revision+1};
  const moved=lot.quantity===1?sourceNext:{...lot,id:destination,quantity:1,ownerId:rogue.id,holderId:rogue.id,location:{kind:'CHARACTER',id:rogue.id},revision:1,origin:{kind:'SO_PICKPOCKET',sourceLotId:lot.id}};
  tx.set(base+'/inventory/'+lot.id,sourceNext);
  if(destination!==lot.id)tx.set(base+'/inventory/'+destination,moved);
  tx.set(base+'/inventory/'+lot.id+'/history/'+a.id,{id:a.id,at,kind:'SO_PICKPOCKET',sourceId:a.targetId,destinationId:rogue.id,quantity:1,before:lotState(lot),after:lotState(sourceNext)});
  if(destination!==lot.id)tx.set(base+'/inventory/'+destination+'/history/'+a.id,{id:a.id,at,kind:'SO_PICKPOCKET',before:null,after:lotState(moved)});
  tx.set(actionPointPath(s.id,rogue.id),resolveActionPoints(points,1));
  tx.set(victimPath(s.id,a.targetId),{...quota,success:true,activeId:null});
  tx.set(roguePath(s.id,rogue.id),{...rogueState,activeId:null});
  tx.set(alertPath(s.id,a.targetId),{victimId:a.targetId,readyAtGameMs:when+cooldownMs,message:'Une unité a disparu de votre inventaire. Consultez votre sac.'});
  const ended={...a,status:'SUCCESS',finishedAtGameMs:when,choices:[],result:{success:true,itemName:lot.item.name,quantity:1}};
  tx.set(actionPath(s.id,a.id),ended);
  return compact(ended);
 }
 return async function dispatch(action,actor,input){
  const sid=documentId(input.sessionId),at=now();
  return store.runTransaction(async tx=>{
   const {s,c}=await identity(tx,actor,sid);
   const clock=gameTime(s.clock,at);
   if(action==='mySoPickpocketAlerts'){
    const alert=await tx.get(alertPath(sid,c.id));
    return {alerts:alert&&clock>=alert.readyAtGameMs?[{message:alert.message,atGameMs:alert.readyAtGameMs}]:[]};
   }
   const level=levelOf(c);
   const state=await tx.get(roguePath(sid,c.id))??{activeId:null,cooldownUntil:0};
   const active=state.activeId?await tx.get(actionPath(sid,state.activeId)):null;
   if(action==='mySoPickpocket')return {enabled:level>0,level,durationSeconds:durations[level]??null,
    cooldownMs:Math.max(0,state.cooldownUntil-clock),active:active?{...compact(active),remainingMs:Math.max(0,active.readyAtGameMs-clock)}:null};
   requireThat(level>0,'SO_PICKPOCKET_SKILL');
   requireThat(action!=='startSoPickpocket'||input.present===true,'SO_PICKPOCKET_PRESENCE');
   requireThat(['startSoPickpocket','finishSoPickpocket','chooseSoPickpocket','cancelSoPickpocket'].includes(action),'INVALID_ACTION');
   const requestId=documentId(input.requestId),op='operations/'+hash(actor.uid+':'+requestId),fingerprint=hashInput(action,input);
   const prior=await tx.get(op);
   if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
   validateGame(s,c,at);
   authorizeSpaceOutlaws(tx,s,'PICKPOCKET');
   const record=(result)=>{tx.set(op,{fingerprint,result,at});return result;};
   if(action==='startSoPickpocket'){
    if(s.spaceOutlaws.escapeVersion===1){const cap=await tx.get(prefix(sid)+'/soCaptivities/'+c.id);requireThat(cap?.status!=='ACTIVE','SO_ESCAPE_CAPTIVE');}
    requireThat(!active&&clock>=state.cooldownUntil,'SO_PICKPOCKET_COOLDOWN');
    requireThat(!c.activeFieldActionId&&!c.activePersonActionId&&!c.activeNavigationId,'SO_PICKPOCKET_UNAVAILABLE');
    const targetId=documentId(input.targetId);
    requireThat(targetId!==c.id,'SO_PICKPOCKET_TARGET');
    const target=await tx.get(characterPath(sid,targetId));
    requireThat(target?.publicationState==='PUBLISHED'&&!target.survival?.dead&&target.assignedUid,'SO_PICKPOCKET_TARGET');
    const targetR=await tx.get(prefix(sid)+'/registrations/'+hash(target.assignedUid));
    requireThat(targetR?.characterId===targetId,'SO_PICKPOCKET_TARGET');
    const firstName=input.firstName,lastName=input.lastName;
    requireThat(typeof firstName==='string'&&firstName.length<=80&&typeof lastName==='string'&&lastName.length<=80,'INVALID_ADMISSION');
    const match=admissionIdentity({firstName,lastName})===admissionIdentity(targetR.admission?.proposal??{firstName:'-',lastName:'-'});
    if(!match){
     tx.set(roguePath(sid,c.id),{...state,cooldownUntil:clock+cooldownMs});
     return record({status:'WRONG_IDENTITY',cooldownMs});
    }
    const quota=await tx.get(victimPath(sid,targetId))??{attempts:0,success:false,activeId:null};
    requireThat(!quota.success&&quota.attempts<2&&!quota.activeId,'SO_PICKPOCKET_QUOTA');
    const pointPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointPath),at);
    const id=uuid(),durationSeconds=durations[level],readyAtGameMs=clock+durationSeconds*1000;
    const attempt={id,rogueId:c.id,targetId,level,startedAtGameMs:clock,readyAtGameMs,durationSeconds,status:'RUNNING'};
    tx.set(pointPath,reserveActionPoints(points,1));
    tx.set(roguePath(sid,c.id),{...state,activeId:id});
    tx.set(victimPath(sid,targetId),{...quota,activeId:id});
    tx.set(actionPath(sid,id),attempt);
    return record({...compact(attempt),remainingMs:durationSeconds*1000});
   }
   const id=documentId(input.actionId),a=await tx.get(actionPath(sid,id));
   requireThat(a?.rogueId===c.id,'SO_PICKPOCKET_UNAVAILABLE');
   if(['EMPTY','SUCCESS','CANCELLED'].includes(a.status))return record(compact(a));
   const pointPath=actionPointPath(sid,c.id),points=actionPointState(s,c,await tx.get(pointPath),at);
   const quota=await tx.get(victimPath(sid,a.targetId));
   requireThat(state.activeId===id&&quota,'SO_PICKPOCKET_UNAVAILABLE');
   if(action==='cancelSoPickpocket'){
    const ended={...a,status:'CANCELLED',finishedAtGameMs:clock,choices:[],result:{success:false,reason:'CANCELLED'}};
    tx.set(actionPath(sid,id),ended);
    tx.set(roguePath(sid,c.id),{...state,activeId:null});
    requireThat(quota.activeId===id,'SO_PICKPOCKET_UNAVAILABLE');tx.set(victimPath(sid,a.targetId),{...quota,activeId:null});
    tx.set(pointPath,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
    return record(compact(ended));
   }
   if(action==='finishSoPickpocket'){
    requireThat(a.status==='RUNNING'&&clock>=a.readyAtGameMs,'SO_PICKPOCKET_TOO_EARLY');
    requireThat(quota.activeId===id&&!quota.success&&quota.attempts<2,'SO_PICKPOCKET_QUOTA');
    const choices=await stocked(tx,sid,a.targetId,at);
    const chosen=[...choices].sort((l,r)=>hash(a.id+':'+l.itemId).localeCompare(hash(a.id+':'+r.itemId)));
    const available=a.level<=2?chosen.slice(0,1):a.level<=4?chosen.slice(0,2):chosen;
    // Keep victim locked during choice phase.
     const updatedQuota={...quota,attempts:quota.attempts+1,activeId:available.length>1?id:null};
    const updatedState={...state,cooldownUntil:clock+cooldownMs};
    // Every transactional read (including selected lot) must precede all writes.
    if(available.length===1)return record(await finishTransfer(tx,s,a,c,updatedState,updatedQuota,points,at,available[0].itemId,uuid));
    tx.set(victimPath(sid,a.targetId),updatedQuota);
    tx.set(roguePath(sid,c.id),updatedState);
    if(available.length===0){
     const ended={...a,status:'EMPTY',finishedAtGameMs:clock,choices:[],result:{success:false,reason:'NO_ELIGIBLE_ITEM'}};
     tx.set(actionPath(sid,id),ended);
     tx.set(roguePath(sid,c.id),{...updatedState,activeId:null});
     tx.set(pointPath,releaseActionPoints(points,1,actionPointMaximum(s.actionPointRules,c)));
     return record(compact(ended));
    }
    const selecting={...a,status:'CHOOSING',finishedAtGameMs:clock,choices:available};
    tx.set(actionPath(sid,id),selecting);
    return record(compact(selecting));
   }
   requireThat(action==='chooseSoPickpocket'&&a.status==='CHOOSING','SO_PICKPOCKET_UNAVAILABLE');
   const itemId=documentId(input.itemId);
   requireThat(quota.activeId===id&&a.choices.some(x=>x.itemId===itemId),'SO_PICKPOCKET_CHOICE');
   return record(await finishTransfer(tx,s,a,c,state,quota,points,at,itemId,uuid));
  });
 };
}
