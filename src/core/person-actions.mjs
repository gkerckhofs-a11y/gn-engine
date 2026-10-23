import {requirePatientNature} from './character-nature.mjs';
import {acceptsPatientNature} from '../shared/character-nature.mjs';
import {randomInt} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {abilityLevel} from './abilities.mjs';
import {healthState,requireGameAction} from './health-state.mjs';
import {personProfileInput,validatePersonReferences,personOpen,isLoot,convalescent,encounter,lootEligible} from './person-state.mjs';
import {aidHash as hash,characterPath as cp,cooldownPath,activeCharacter,prepareAid,reserveAid,checkAid,finishAid,aidSnapshot} from './aid-state.mjs';
import {actionPointPath,actionPointState,reserveActionPoints,releaseActionPoints,resolveActionPoints,actionPointMaximum} from './action-point-state.mjs';
import {readLot,personalLot,lotState,publicLot} from './inventory-state.mjs';
const digest=x=>hash(JSON.stringify(x));
const memo=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=500,'REASON_REQUIRED');return v.trim();};
const path=(sid,id)=>`sessions/${sid}/personActions/${id}`;
const patientPath=(sid,cid)=>`${cp(sid,cid)}/cooldowns/field-care`;
const admin=['personAdmin','savePersonProfile','cancelPersonActionMJ','setLotPillable'];
const reads=['personAdmin','personTarget','myPersonActions','preparePersonAction'];
export const personCommands=[...new Set([...admin,...reads,'startPersonAction','finishPersonAction','cancelPersonAction','cancelPersonActionAid','chooseLoot','confirmLootHandover','offerAid','cancelAidOffer','declareCapture','declareFreedom'])];
export const personAction=a=>personCommands.includes(a);
const view=(a,s,cid,at)=>({id:a.id,kind:a.kind,status:a.status,name:a.profile.name,actorName:a.characterName,targetName:a.targetName,characterId:a.characterId,targetId:a.targetId,
 role:cid===a.characterId?'ACTOR':cid===a.targetId?'TARGET':'HELPER',remainingMs:Math.max(0,a.readyAtGameMs-gameTime(s.clock,at)),cost:a.cost,paid:a.paid,startedAt:a.startedAt,
 result:cid===a.aid?.characterId?null:a.result??null,aidName:a.aid?.name??null,instructions:a.profile.instructions,cancelReason:a.cancelReason??null,
 canChoose:a.status==='AWAITING_PICK'&&cid===(a.kind==='LOOT_COMMON'?a.targetId:a.characterId),canHandover:a.status==='AWAITING_HANDOVER'&&cid===a.targetId,lootName:a.lootName??null});
export async function offeredAid(tx,sid,cid){return (await tx.list(`sessions/${sid}/aidOffers`,['recipientId',cid])).filter(x=>x.status==='OFFERED').map(x=>({id:x.id,helperName:x.helperName,skillId:x.skillId}));}
export function createPersonService({store,signed,checkScenario,checkSession,now,uuid,rollD6=()=>randomInt(1,7)}){
 const player=async(tx,actor,input)=>{const sid=documentId(input.sessionId),s=await tx.get(`sessions/${sid}`);requireThat(s&&['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'FORBIDDEN');const r=await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');const c=await tx.get(cp(sid,r.characterId));requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','FORBIDDEN');return {s,c,r};};
 const catalog=async(tx,base)=>Object.fromEntries(await Promise.all(['personProfiles','skills','items'].map(async k=>[k,await tx.list(`${base}/${k}`)])));
 async function participant(tx,s,a,c,r,actor,allowAid=false){
  const expected=c.id===a.characterId?{uid:a.actorUid,version:a.accessVersion}:c.id===a.targetId?{uid:a.targetUid,version:a.targetAccessVersion}:allowAid&&c.id===a.aid?.characterId?{uid:a.aid.uid,version:a.aid.accessVersion}:null;
  requireThat(expected?.uid===actor.uid&&expected.version===r.accessVersion,'FORBIDDEN');
 }
 async function lootLots(tx,s,t,at){return (await tx.list(`sessions/${s.id}/inventory`,['holderId',t.id])).map(l=>l.status==='RESERVED'&&l.marketReservation?.expiresAt<=at?{...l,status:'AVAILABLE',revision:l.revision+1,marketReservation:null}:l).filter(l=>personalLot(l,t.id)&&l.quantity>0&&l.status==='AVAILABLE'&&(l.pillable??l.item.pillable)===true);}
 function eligible(s,c,t,p,level,at){
  requireThat(c.id!==t.id||p.kind==='FIELD_CARE','INVALID_RECIPIENT');
  requireGameAction(s,c,isLoot(p)?'discover':'heal',at);requireThat(!convalescent(s,c,at),'OUT_OF_COMBAT');
  if(s.healthRules?.enabled)requireThat(c.hp>0,'OUT_OF_COMBAT');
  if(isLoot(p)){requireThat(lootEligible(s,t,at),'LOOT_TARGET_REQUIRED');requireThat(!encounter(t,at).taken,'LOOT_ENCOUNTER_LIMIT');}
  else {requirePatientNature(p,t);requireThat(s.healthRules?.enabled,'HEALTH_DISABLED');healthState(t);requireThat(t.hp<t.maxHp||convalescent(s,t,at),'NO_HEAL_NEEDED');if(p.kind==='FIELD_CARE'){requireThat(t.hp<t.maxHp,'NO_HEAL_NEEDED');requireThat(t.hp>0||level>=p.reviveLevel,'FIELD_SKILL_REQUIRED');requireThat(c.id!==t.id||!convalescent(s,t,at),'OUT_OF_COMBAT');}}
 }
 async function plan(tx,ctx,input,at){
  const {s,c,r}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(!c.activeFieldActionId&&!c.activePersonActionId,'FIELD_ACTOR_BUSY');
  const p=await tx.get(`sessions/${s.id}/personProfiles/${documentId(input.profileId)}`);requireThat(p?.publicationState==='PUBLISHED','PERSON_PROFILE_UNAVAILABLE');
  const target=await activeCharacter(tx,s.id,input.targetId),t=target.c;requireThat(!t.activePersonActionId&&!t.activeFieldActionId,'FIELD_TARGET_BUSY');
  const level=p.skillId?abilityLevel(c,p.skillId):0;requireThat(!p.skillId||level>=p.minLevel,'FIELD_SKILL_REQUIRED');for(const req of p.prerequisites)requireThat(abilityLevel(c,req.skillId)>=req.minLevel,'FIELD_SKILL_REQUIRED');eligible(s,c,t,p,level,at);
  const family=isLoot(p)?'FOUILLE':`SKILL:${p.skillId}`,time=gameTime(s.clock,at),use=await tx.get(cooldownPath(s.id,c.id,family));requireThat((use?.readyAtGameMs??0)<=time,'COOLDOWN_ACTIVE');
  const patient=p.kind==='FIELD_CARE'?await tx.get(patientPath(s.id,t.id)):null;requireThat((patient?.readyAtGameMs??0)<=time,'PATIENT_COOLDOWN_ACTIVE');
  const cost=s.actionPointRules?.enabled?(p.cost??s.actionPointRules.cost):0,points=s.actionPointRules?.enabled?actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at):null;if(points)reserveActionPoints(points,cost);
  const lots=new Map(),supplies=[];let bonus=0,bonusName=null;
  if(input.bonusLotId){requireThat(p.test==='D6','AID_NOT_ALLOWED');const l=await readLot(tx,s.id,documentId(input.bonusLotId),at),b=p.bonusItems.find(b=>b.itemId===l?.item.id);requireThat(b&&l.quantity>0&&l.status==='AVAILABLE'&&personalLot(l,c.id),'FIELD_EQUIPMENT_UNAVAILABLE');lots.set(l.id,l);bonus=b.bonus;bonusName=l.item.name;}
  for(const supply of [p.consumable,...p.extraConsumables].filter(Boolean)){const lid=input.supplyLots?.[supply.itemId],l=await readLot(tx,s.id,documentId(lid),at);requireThat(l&&personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.item.id===supply.itemId&&l.item.consumable&&l.quantity>=supply.quantity,'FIELD_EQUIPMENT_UNAVAILABLE');lots.set(l.id,l);supplies.push({...supply,lotId:l.id,name:l.item.name});}
  const aid=await prepareAid(tx,s,c,input,p,family,at);requireThat(!aid||aid.character.id!==t.id,'AID_NOT_ALLOWED');
  const durationSeconds=p.durationByLevel[level]??p.durationSeconds,cooldownSeconds=isLoot(p)?p.cooldownSeconds??s.actionPointRules?.cooldownSeconds??600:0;
  const confirmation=digest({s:s.id,rules:s.actionPointRules??null,p,c,access:r.accessVersion,t,targetAccess:target.r.accessVersion,points,lots:[...lots.values()],aid,patient});
  return {p,t,tr:target.r,points,lots:[...lots.values()],supplies,aid,family,preview:{name:p.name,kind:p.kind,target:{id:t.id,name:t.public.displayName},cost,level,bonus,bonusName,aid:aid?1:0,aidName:aid?.character.public.displayName??null,durationSeconds,cooldownSeconds,test:p.test,threshold:p.threshold,continuationSeconds:p.continuationSeconds,instructions:p.instructions,supplies,confirmation}};
 }
 async function release(tx,s,a,c,t,at,id,actor,cancel){
  const time=gameTime(s.clock,at);
  if(!a.paid&&a.apEnabled){const points=actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at);tx.set(actionPointPath(s.id,c.id),cancel?releaseActionPoints(points,a.cost,actionPointMaximum(s.actionPointRules,c)):resolveActionPoints(points,a.cost));}
  for(const lid of a.lotIds){const l=await tx.get(`sessions/${s.id}/inventory/${lid}`);requireThat(l?.status==='FIELD_RESERVED'&&l.fieldActionId===a.id,'FIELD_EQUIPMENT_UNAVAILABLE');const quantity=l.quantity-(!cancel&&!a.paid?(a.supplies.find(x=>x.lotId===lid)?.quantity??0):0);requireThat(quantity>=0,'FIELD_EQUIPMENT_UNAVAILABLE');const next={...l,quantity,status:quantity?'AVAILABLE':'CONSUMED',fieldActionId:null,revision:l.revision+1};tx.set(`sessions/${s.id}/inventory/${lid}`,next);tx.set(`sessions/${s.id}/inventory/${lid}/history/${id}`,{id,at,kind:cancel?'PERSON_RELEASE':'PERSON_USE',actorUid:actor.uid,actionId:a.id,before:lotState(l),after:lotState(next)});}
  if(!cancel&&!a.paid)tx.set(cooldownPath(s.id,c.id,a.family),{readyAtGameMs:time+a.cooldownSeconds*1000,actionId:a.id});
  await finishAid(tx,s,a,at,{cancel,release:true,cooldown:!a.paid});
 }
 const unlock=(tx,s,a,c,t)=>{if(c.id===t.id)tx.set(cp(s.id,c.id),{...c,activeFieldActionId:null,activePersonActionId:null});else {tx.set(cp(s.id,c.id),{...c,activeFieldActionId:null});tx.set(cp(s.id,t.id),{...t,activePersonActionId:null});}};
 return async function dispatch(action,actor,input){
  signed(actor);const at=now(),id=uuid(),die=action==='finishPersonAction'?rollD6():null;
  return store.runTransaction(async tx=>{
   let ctx,org;
   if(admin.includes(action)){const session=!!input.sessionId,sid=documentId(session?input.sessionId:input.scenarioId),s=session?await checkSession(tx,actor,sid):await checkScenario(tx,actor,sid);org={s,session,base:`${session?'sessions':'scenarios'}/${sid}`};}
   else ctx=await player(tx,actor,input);
   if(action==='personAdmin'){const {s,session,base}=org;return {scope:session?'session':'scenario',parent:{id:s.id,title:s.title,sealed:s.campaignSealed===true},...await catalog(tx,base),actions:session?(await tx.list(`${base}/personActions`)).filter(personOpen).map(a=>view(a,s,a.characterId,at)):[],inventory:session?(await tx.list(`${base}/inventory`)).filter(l=>l.quantity>0).map(l=>({...publicLot(l),pillable:(l.pillable??l.item.pillable)===true})):[]};}
   if(action==='myPersonActions'){
    const {s,c,r}=ctx,all=await tx.list(`sessions/${s.id}/personActions`),actions=[];
    for(const a of all){const identity=c.id===a.characterId?[a.actorUid,a.accessVersion]:c.id===a.targetId?[a.targetUid,a.targetAccessVersion]:c.id===a.aid?.characterId?[a.aid.uid,a.aid.accessVersion]:null;if(!identity||identity[0]!==actor.uid||identity[1]!==r.accessVersion)continue;const v=view(a,s,c.id,at);if(v.canChoose){const t=await tx.get(cp(s.id,a.targetId));v.lootLots=(await lootLots(tx,s,t,at)).map(l=>({id:l.id,name:l.item.name}));}actions.push(v);}
    const offers=(await tx.list(`sessions/${s.id}/aidOffers`,['helperId',c.id])).filter(o=>o.helperUid===actor.uid&&o.accessVersion===r.accessVersion&&['OFFERED','ACTIVE'].includes(o.status));
    return {session:{id:s.id,stage:s.stage},character:{id:c.id,name:c.public.displayName},skills:(c.abilityProfile?.published?c.abilityProfile.skills:[]).filter(k=>k.kind==='PASSIVE').map(k=>({id:k.id,name:k.name})),actions:actions.sort((a,b)=>b.startedAt-a.startedAt).slice(0,100),aidOffers:offers.map(o=>({id:o.id,status:o.status,recipientName:o.recipientName,skillId:o.skillId,actionId:o.actionId??null,collection:o.collection??null})),encounter:encounter(c,at),convalescenceMs:Math.max(0,(c.convalescentUntilGameMs??0)-gameTime(s.clock,at)),captureMs:Math.max(0,(c.lootEncounter?.captureUntil??0)-at)};
   }
   if(action==='personTarget'){
    const {s,c}=ctx,{c:t}=await activeCharacter(tx,s.id,input.targetId),profiles=(await tx.list(`sessions/${s.id}/personProfiles`)).filter(p=>p.publicationState==='PUBLISHED'&&(isLoot(p)||acceptsPatientNature(p,t))),lots=(await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id])).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0);
    return {session:{id:s.id,stage:s.stage},target:{id:t.id,name:t.public.displayName},profiles:profiles.map(p=>({id:p.id,name:p.name,kind:p.kind,instructions:p.instructions,test:p.test,skillId:p.skillId,bonusItems:p.bonusItems,supplies:[p.consumable,...p.extraConsumables].filter(Boolean)})),lots:lots.map(publicLot),aidOffers:await offeredAid(tx,s.id,c.id)};
   }
   if(action==='preparePersonAction')return (await plan(tx,ctx,input,at)).preview;
   const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=digest([action,input]),previous=await tx.get(op);
   let a;
   if(['finishPersonAction','cancelPersonAction','cancelPersonActionAid','chooseLoot','confirmLootHandover','cancelPersonActionMJ'].includes(action)){const s=(ctx??org).s;a=await tx.get(path(s.id,documentId(input.actionId)));requireThat(a,'NOT_FOUND');if(ctx)await participant(tx,s,a,ctx.c,ctx.r,actor,action==='cancelPersonActionAid');}
   if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');if(ctx)requireThat(previous.characterId===ctx.c.id&&previous.accessVersion===ctx.r.accessVersion,'FORBIDDEN');for(const party of previous.parties??[]){const current=await activeCharacter(tx,(ctx??org).s.id,party.id);requireThat(current.c.assignedUid===party.uid&&current.r.accessVersion===party.version,'FORBIDDEN');}return previous.result;}
   if(org)requireThat(org.s.stage!=='ARCHIVED','SESSION_CLOSED');let result;
   if(action==='savePersonProfile'){
    const {s,base}=org,pid=input.profileId?documentId(input.profileId):id,old=await tx.get(`${base}/personProfiles/${pid}`);requireThat((old?.revision??0)===(input.revision??0),'STALE_REVISION');const p=personProfileInput(input.profile,pid,old??{}),records=await catalog(tx,base);validatePersonReferences(p,records);requireThat(records.personProfiles.length<100||old,'INVALID_PERSON_PROFILE');tx.set(`${base}/personProfiles/${pid}`,p);tx.set(base,{...s,revision:s.revision+1});tx.set(`${base}/personProfiles/${pid}/history/${id}`,{id,at,actorUid:actor.uid,reason:memo(input.reason),before:old??null,after:p});result={id:pid};
   }else if(action==='setLotPillable'){
    const {s,session}=org;requireThat(session&&typeof input.pillable==='boolean','INVALID_ITEM');const lid=documentId(input.lotId),l=await readLot(tx,s.id,lid,at);requireThat(l?.status==='AVAILABLE'&&l.quantity>0,'INSUFFICIENT_STOCK');requireThat(l.revision===input.revision,'STALE_REVISION');const next={...l,pillable:input.pillable,revision:l.revision+1};tx.set(`sessions/${s.id}/inventory/${lid}`,next);tx.set(`sessions/${s.id}/inventory/${lid}/history/${id}`,{id,at,kind:'PILLABLE_SETTING',actorUid:actor.uid,reason:memo(input.reason),before:l.pillable??l.item.pillable??false,after:input.pillable});result={id:lid};
   }else if(action==='offerAid'){
    const {s,c,r}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(!c.activeFieldActionId&&!c.activePersonActionId,'FIELD_ACTOR_BUSY');requireGameAction(s,c,'discover',at);const skillId=documentId(input.skillId);requireThat(abilityLevel(c,skillId)>0,'FIELD_SKILL_REQUIRED');const target=await activeCharacter(tx,s.id,input.targetId);requireThat(target.c.id!==c.id,'INVALID_RECIPIENT');const offers=await tx.list(`sessions/${s.id}/aidOffers`,['helperId',c.id]);requireThat(offers.filter(o=>o.status==='OFFERED').length<10,'AID_OFFER_LIMIT');
    const offer={id,status:'OFFERED',helperId:c.id,helperName:c.public.displayName,helperUid:actor.uid,accessVersion:r.accessVersion,recipientId:target.c.id,recipientUid:target.c.assignedUid,recipientAccessVersion:target.r.accessVersion,recipientName:target.c.public.displayName,skillId,at};tx.set(`sessions/${s.id}/aidOffers/${id}`,offer);result={id};
   }else if(action==='cancelAidOffer'){
    const {s,c,r}=ctx,oid=documentId(input.offerId),offer=await tx.get(`sessions/${s.id}/aidOffers/${oid}`);requireThat(offer?.helperId===c.id&&offer.helperUid===actor.uid&&offer.accessVersion===r.accessVersion,'FORBIDDEN');requireThat(offer.status==='OFFERED'||offer.status==='CANCELLED','AID_ACTION_ACTIVE');tx.set(`sessions/${s.id}/aidOffers/${oid}`,{...offer,status:'CANCELLED'});result={id:oid};
   }else if(action==='declareCapture'||action==='declareFreedom'){
    const {s,c}=ctx;requireThat(input.confirmed===true,'FIELD_PRESENCE_REQUIRED');requireThat(['EN_JEU','PAUSE'].includes(s.stage),'SESSION_NOT_RUNNING');let e=encounter(c,at);
    if(action==='declareCapture'){const deadline=e.captureDeadline??e.captureUntil??at+1200000;e={...e,freeSince:null,captureUntil:deadline,captureDeadline:deadline};}
    else {requireThat(!s.healthRules?.enabled||c.hp>0,'OUT_OF_COMBAT');e={...e,captureUntil:null,freeSince:e.freeSince??at};}
    tx.set(cp(s.id,c.id),{...c,lootEncounter:e});tx.set(`sessions/${s.id}/audit/${id}`,{id,at,action,actorUid:actor.uid,characterId:c.id,before:c.lootEncounter??null,after:e});result={encounter:e};
   }else if(action==='startPersonAction'){
    requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const p=await plan(tx,ctx,input,at);requireThat(p.preview.confirmation===input.confirmation,'STALE_REVISION');const {s,c,r}=ctx,time=gameTime(s.clock,at);
    a={id,kind:p.p.kind,status:'ACTIVE',profile:p.p,characterId:c.id,characterName:c.public.displayName,actorUid:actor.uid,accessVersion:r.accessVersion,targetId:p.t.id,targetName:p.t.public.displayName,targetUid:p.t.assignedUid,targetAccessVersion:p.tr.accessVersion,startedAt:at,readyAtGameMs:time+p.preview.durationSeconds*1000,
     cost:p.preview.cost,apEnabled:!!p.points,paid:false,level:p.preview.level,bonus:p.preview.bonus,aid:aidSnapshot(p.aid),family:p.family,cooldownSeconds:p.preview.cooldownSeconds,supplies:p.supplies,lotIds:p.lots.map(l=>l.id),lootEncounterNumber:isLoot(p.p)?encounter(p.t,at).number:null};
    if(p.points)tx.set(actionPointPath(s.id,c.id),reserveActionPoints(p.points,a.cost));for(const l of p.lots)tx.set(`sessions/${s.id}/inventory/${l.id}`,{...l,status:'FIELD_RESERVED',fieldActionId:id,revision:l.revision+1});reserveAid(tx,s,a,p.aid,'personActions');
    tx.set(cp(s.id,c.id),{...c,activeFieldActionId:id,...(c.id===p.t.id?{activePersonActionId:id}:{})});if(c.id!==p.t.id)tx.set(cp(s.id,p.t.id),{...p.t,activePersonActionId:id,...(isLoot(p.p)?{lootEncounter:{...encounter(p.t,at),freeSince:null}}:{})});
    tx.set(path(s.id,id),a);result=view(a,s,c.id,at);
   }else {
    const s=(ctx??org).s,c=await tx.get(cp(s.id,a.characterId)),t=await tx.get(cp(s.id,a.targetId)),cancel=['cancelPersonAction','cancelPersonActionAid','cancelPersonActionMJ'].includes(action),time=gameTime(s.clock,at);
    if(!personOpen(a))result=view(a,s,ctx?.c.id??a.characterId,at);
    else {
     requireThat(c?.activeFieldActionId===a.id&&t?.activePersonActionId===a.id,'FIELD_STATE_CHANGED');let next=a,target=t,source=c;
     if(cancel){
      await release(tx,s,a,c,t,at,id,actor,true);if(a.lootLotId){const l=await tx.get(`sessions/${s.id}/inventory/${a.lootLotId}`);requireThat(l?.fieldActionId===a.id,'FIELD_STATE_CHANGED');tx.set(`sessions/${s.id}/inventory/${l.id}`,{...l,status:'AVAILABLE',fieldActionId:null,revision:l.revision+1});}
      next={...a,status:'CANCELLED',cancelReason:memo(input.reason),finishedAt:at};unlock(tx,s,a,c,t);
     }else {
      requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
      const ca=await activeCharacter(tx,s.id,c.id),ta=await activeCharacter(tx,s.id,t.id);requireThat(ca.c.assignedUid===a.actorUid&&ca.r.accessVersion===a.accessVersion&&ta.c.assignedUid===a.targetUid&&ta.r.accessVersion===a.targetAccessVersion,'FORBIDDEN');
      if(action==='finishPersonAction'){
       requireThat(ctx.c.id===a.characterId,'FORBIDDEN');if(['AWAITING_PICK','AWAITING_HANDOVER'].includes(a.status))return view(a,s,c.id,at);
       requireThat(time>=a.readyAtGameMs,'FIELD_TOO_EARLY');eligible(s,c,t,a.profile,abilityLevel(c,a.profile.skillId),at);for(const req of [{skillId:a.profile.skillId,minLevel:a.profile.minLevel},...a.profile.prerequisites].filter(x=>x.skillId))requireThat(abilityLevel(c,req.skillId)>=req.minLevel,'FIELD_SKILL_REQUIRED');
       if(a.kind==='FIELD_CARE')requireThat((await tx.get(patientPath(s.id,t.id)))?.readyAtGameMs<=time||!(await tx.get(patientPath(s.id,t.id))),'PATIENT_COOLDOWN_ACTIVE');
       await checkAid(tx,s,a,at);
       const roll=a.status==='CONTINUING'||a.profile.test==='AUTO'?null:die;if(roll!==null)requireThat(Number.isInteger(roll)&&roll>=1&&roll<=6,'INVALID_DIE');const total=roll===null?null:roll+a.level+a.bonus+(a.aid?1:0),success=roll===null||total>=a.profile.threshold;
       const outcome=a.status==='CONTINUING'?{...a.result,completedAfterContinuation:true}: {roll,total,level:a.level,bonus:a.bonus,aid:a.aid?1:0,threshold:a.profile.threshold,success};
       if(a.kind==='CLINIC_FAST'&&!success){
        // Spend once at the failed roll; retain only the actor, patient and helper until completion.
        await release(tx,s,a,c,t,at,id,actor,false);
        next={...a,paid:true,lotIds:[],status:'CONTINUING',result:outcome,readyAtGameMs:time+a.profile.continuationSeconds*1000};
        if(a.aid){const helper=await tx.get(cp(s.id,a.aid.characterId)),offer=await tx.get(`sessions/${s.id}/aidOffers/${a.aid.offerId}`);tx.set(cp(s.id,helper.id),{...helper,activeFieldActionId:a.id,activeAidId:a.aid.offerId});tx.set(`sessions/${s.id}/aidOffers/${offer.id}`,{...offer,status:'ACTIVE'});}
       }else if(isLoot(a.profile)){
        await release(tx,s,a,c,t,at,id,actor,false);const candidates=await lootLots(tx,s,t,at);next={...a,paid:true,lotIds:[],status:candidates.length?'AWAITING_PICK':'SUCCEEDED',result:{...outcome,empty:candidates.length===0},readyAtGameMs:time};if(!candidates.length){next.finishedAt=at;unlock(tx,s,a,c,t);}
       }else {
        await release(tx,s,a,c,t,at,id,actor,false);const before=healthState(t),hp=a.kind==='FIELD_CARE'?Math.min(t.maxHp,t.hp+a.profile.healAmount):t.maxHp,convalescentUntilGameMs=a.kind==='FIELD_CARE'?(t.hp===0?time+a.profile.convalescenceSeconds*1000:t.convalescentUntilGameMs??0):0;
        target={...t,hp,outOfCombat:s.healthRules.returnMode==='HP_POSITIVE'?false:t.outOfCombat,healthRevision:before.revision+1,convalescentUntilGameMs};if(c.id===t.id)source=target;
        const event={id,at,kind:'HEAL',sourceName:c.public.displayName,targetName:t.public.displayName,skillName:a.profile.name,before,after:healthState(target),restored:hp-t.hp,actionId:a.id};tx.set(`${cp(s.id,t.id)}/healthHistory/${id}`,event);if(t.id!==c.id)tx.set(`${cp(s.id,c.id)}/healthHistory/${id}`,{...event,kind:'HEAL_SENT'});
        if(a.kind==='FIELD_CARE')tx.set(patientPath(s.id,t.id),{readyAtGameMs:time+a.profile.patientCooldownSeconds*1000,actionId:a.id});
        next={...a,paid:true,lotIds:[],status:'SUCCEEDED',result:{...outcome,restored:hp-t.hp,hp,maxHp:t.maxHp,convalescentUntilGameMs},finishedAt:at};unlock(tx,s,a,source,target);
       }
      }else if(action==='chooseLoot'){
       requireGameAction(s,c,'discover',at);if(s.healthRules?.enabled)requireThat(c.hp>0,'OUT_OF_COMBAT');requireThat(a.status==='AWAITING_PICK'&&ctx.c.id===(a.kind==='LOOT_COMMON'?t.id:c.id),'FORBIDDEN');requireThat(!encounter(t,at).taken&&encounter(t,at).number===a.lootEncounterNumber,'LOOT_ENCOUNTER_LIMIT');requireThat(lootEligible(s,t,at),'LOOT_TARGET_REQUIRED');
       const lots=await lootLots(tx,s,t,at),l=lots.find(x=>x.id===input.lotId);requireThat(l,'LOOT_ITEM_UNAVAILABLE');tx.set(`sessions/${s.id}/inventory/${l.id}`,{...l,status:'FIELD_RESERVED',fieldActionId:a.id,revision:l.revision+1});target={...t,lootEncounter:{...encounter(t,at),taken:true}};tx.set(cp(s.id,t.id),target);next={...a,status:'AWAITING_HANDOVER',lootLotId:l.id,lootName:l.item.name};
      }else if(action==='confirmLootHandover'){
       requireThat(a.status==='AWAITING_HANDOVER'&&ctx.c.id===t.id&&input.handedOver===true,'FORBIDDEN');const l=await tx.get(`sessions/${s.id}/inventory/${a.lootLotId}`);requireThat(l?.status==='FIELD_RESERVED'&&l.fieldActionId===a.id&&personalLot(l,t.id)&&l.quantity>0,'LOOT_ITEM_UNAVAILABLE');
       const moved={...l,id:l.quantity===1?l.id:a.id,quantity:1,ownerId:c.id,holderId:c.id,location:{kind:'CHARACTER',id:c.id},status:'AVAILABLE',fieldActionId:null,revision:l.quantity===1?l.revision+1:1,origin:l.quantity===1?l.origin:{kind:'LOOT_SPLIT',parentLotId:l.id,actionId:a.id}};
       if(l.quantity>1)tx.set(`sessions/${s.id}/inventory/${l.id}`,{...l,quantity:l.quantity-1,status:'AVAILABLE',fieldActionId:null,revision:l.revision+1});tx.set(`sessions/${s.id}/inventory/${moved.id}`,moved);tx.set(`sessions/${s.id}/inventory/${l.id}/history/${id}`,{id,at,kind:'LOOT',actorUid:actor.uid,actionId:a.id,quantity:1,before:lotState(l),after:lotState(l.quantity===1?moved:{...l,quantity:l.quantity-1,status:'AVAILABLE',revision:l.revision+1}),destinationId:c.id});
       if(moved.id!==l.id)tx.set(`sessions/${s.id}/inventory/${moved.id}/history/${id}`,{id,at,kind:'LOOT_SPLIT',parentLotId:l.id,actionId:a.id,before:null,after:lotState(moved)});next={...a,status:'SUCCEEDED',finishedAt:at,result:{...a.result,lootName:l.item.name,quantity:1,lotId:moved.id}};unlock(tx,s,a,c,t);
      }else requireThat(false,'UNKNOWN_ACTION');
     }
     tx.set(path(s.id,a.id),next);tx.set(`sessions/${s.id}/audit/${id}`,{id,at,action,actorUid:actor.uid,actionId:a.id,status:next.status});result=view(next,s,ctx?.c.id??a.characterId,at);
    }
   }
   const parties=a&&!action.startsWith('cancel')?[{id:a.characterId,uid:a.actorUid,version:a.accessVersion},{id:a.targetId,uid:a.targetUid,version:a.targetAccessVersion},...(a.aid?[{id:a.aid.characterId,uid:a.aid.uid,version:a.aid.accessVersion}]:[])]:[];
   tx.set(op,{fingerprint,result,at,parties,...(ctx?{characterId:ctx.c.id,accessVersion:ctx.r.accessVersion}:{})});return result;
  });
 }
}
