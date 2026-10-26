import {isPlaceSearch,searchBonuses} from './space-outlaws-search-state.mjs';
import {discoverPlace,provisionPlaceFind,takePlaceFind} from './space-outlaws-search-finds.mjs';
import {offeredAid} from './person-actions.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {prepareAid,reserveAid,checkAid,finishAid,aidSnapshot} from './aid-state.mjs';
import {createHash,randomInt} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {abilityLevel} from './abilities.mjs';
import {requireGameAction} from './health-state.mjs';
import {actionPointPath,actionPointState,actionPointSummary,actionPointMaximum,reserveActionPoints,releaseActionPoints,resolveActionPoints} from './action-point-state.mjs';
import {readLot,personalLot,newLot,publicItem,lotState} from './inventory-state.mjs';
import {accountId,moneyState,writeLedger} from './economy-state.mjs';
import {knowledgeSnapshot} from './knowledge.mjs';
import {fieldTargetInput,validateFieldReferences,initialFieldState,effectiveFieldState} from './field-state.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const digest=v=>hash(JSON.stringify(v));
const reason=v=>{requireThat(typeof v==='string'&&v.trim()&&v.length<=500,'REASON_REQUIRED');return v.trim();};
const cp=(s,c)=>`sessions/${s}/characters/${c}`;
const sp=(s,t)=>`sessions/${s}/fieldStates/${t}`;
const ap=(s,a)=>`sessions/${s}/fieldActions/${a}`;
const claimsFor=(state,cid)=>Object.hasOwn(state.claims,cid)?state.claims[cid]:{};
const claimed=(state,cid,rid)=>Object.hasOwn(claimsFor(state,cid),rid)?claimsFor(state,cid)[rid]:0;
const uses=(s,c,f)=>`${cp(s,c)}/fieldCooldowns/${hash(f)}`;
const publicTarget=(t,state)=>({id:t.id,title:t.title,description:t.description,kind:t.kind,status:state?.status??null,busy:!!state?.activeActionId});
const viewAction=(a,s,at)=>({id:a.id,...(a.searchVersion===1?{sessionId:s.id}:{}),characterId:a.characterId,characterName:a.characterName,targetId:a.targetId,targetTitle:a.targetTitle,kind:a.kind,status:a.status,startedAt:a.startedAt,
  remainingMs:a.status==='ACTIVE'?Math.max(0,a.readyAtGameMs-gameTime(s.clock,at)):0,durationSeconds:a.durationSeconds,cost:a.cost,level:a.level,bonus:a.bonus,bonusName:a.bonusName,aidName:a.aid?.name??null,test:a.profile.test,threshold:a.searchVersion===1&&!a.showDifficulty?null:a.profile.threshold,
  instructions:a.profile.instructions,cooldownSeconds:a.cooldownSeconds,result:a.result??null,cancelReason:a.cancelReason??null});
const adminReads=['fieldAdmin'];
const adminWrites=['saveFieldTarget','replenishFieldTarget','cancelFieldActionMJ','provisionFieldFind'];
const playerReads=['fieldTarget','myFieldActions','prepareFieldAction'];
const playerWrites=['startFieldAction','finishFieldAction','cancelFieldAction','cancelFieldActionAid','takeFieldFind'];
export const fieldCommands=[...adminReads,...adminWrites,...playerReads,...playerWrites];
export const fieldAction=a=>fieldCommands.includes(a);

export function createFieldService({store,signed,checkScenario,checkSession,now,uuid,rollD6=()=>randomInt(1,7),rollD12=()=>randomInt(1,13)}){
 async function organizer(tx,actor,input){const session=!!input.sessionId,id=documentId(session?input.sessionId:input.scenarioId),s=session?await checkSession(tx,actor,id):await checkScenario(tx,actor,id);return {s,session,base:`${session?'sessions':'scenarios'}/${id}`};}
 async function player(tx,actor,input){
  const sid=documentId(input.sessionId),s=await tx.get(`sessions/${sid}`);requireThat(s&&['BRIEFING','EN_JEU','PAUSE','FINISHED'].includes(s.stage),'FORBIDDEN');
  const r=await tx.get(`sessions/${sid}/registrations/${hash(actor.uid)}`);requireThat(r?.status==='ACCEPTED'&&r.accessActive&&r.characterId&&actor.authTime>=r.minAuthTime,'FORBIDDEN');
  const c=await tx.get(cp(sid,r.characterId));requireThat(c?.assignedUid===actor.uid&&c.publicationState==='PUBLISHED'&&c.public?.publicationState==='PUBLISHED','FORBIDDEN');return {s,c,r};
 }
 async function target(tx,s,id,at){const t=await tx.get(`sessions/${s.id}/fieldTargets/${documentId(id)}`),state=await tx.get(sp(s.id,id));requireThat(t?.publicationState==='PUBLISHED'&&state,'FIELD_UNAVAILABLE');return {t,state:effectiveFieldState(s,state,at)};}
 async function dependency(tx,s,t,at){if(!t.dependencyId)return;const d=await target(tx,s,t.dependencyId,at);requireThat(d.state.status==='ONLINE','INSTALLATION_OFFLINE');}
 async function ownedAction(tx,ctx,input,actor){const a=await tx.get(ap(ctx.s.id,documentId(input.actionId)));requireThat(a&&(input.aidCancellation?a.aid?.characterId===ctx.c.id&&a.aid.uid===actor.uid&&a.aid.accessVersion===ctx.r.accessVersion:a.characterId===ctx.c.id&&a.actorUid===actor.uid&&a.accessVersion===ctx.r.accessVersion),'FORBIDDEN');return a;}
 async function plan(tx,ctx,input,at){
  const {s,c,r}=ctx;requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'discover',at);requireThat(!c.activeFieldActionId&&!c.activePersonActionId,'FIELD_ACTOR_BUSY');
  const {t,state}=await target(tx,s,input.targetId,at),kind=input.kind,p=Object.hasOwn(t.profiles,kind)?t.profiles[kind]:null;requireThat(p,'INVALID_FIELD_TARGET');
  if(s.spaceOutlaws)requireThat(s.spaceOutlaws.actionsVersion===1&&(t.kind==='ANALYSIS'&&kind==='ANALYZE'||s.spaceOutlaws.searchVersion===1&&isPlaceSearch(t)&&kind==='SEARCH'),'SO_GAMEPLAY_NOT_OPEN');
  await dependency(tx,s,t,at);const time=gameTime(s.clock,at);requireThat(!state.activeActionId,'FIELD_TARGET_BUSY');requireThat(time>=state.lockedUntilGameMs,'FIELD_TARGET_LOCKED');
  requireThat(kind==='SEARCH'||kind==='ANALYZE'||(kind==='SABOTAGE'?state.status==='ONLINE':state.status==='OFFLINE'),'FIELD_STATE_CHANGED');
  if(kind==='SABOTAGE')requireThat(time>=state.protectedUntilGameMs,'FIELD_TARGET_LOCKED');
  if(isPlaceSearch(t)){requireThat(s.spaceOutlaws?.searchVersion===1,'SO_GAMEPLAY_NOT_OPEN');requireThat(t.search.active&&state.status==='ONLINE','FIELD_UNAVAILABLE');requireThat(t.search.maxAttempts===null||(state.attempts[c.id]??0)<t.search.maxAttempts,'FIELD_ATTEMPTS_EXHAUSTED');requireThat(!input.aidOfferId&&!input.bonusLotId&&!input.consumableLotId,'INVALID_PLACE_SEARCH');}
  const level=p.skillId?abilityLevel(c,p.skillId):0;requireThat(!p.skillId||level>=p.minLevel,'FIELD_SKILL_REQUIRED');
  const family=kind==='SEARCH'?'FOUILLE':p.skillId?`SKILL:${p.skillId}`:kind,use=await tx.get(uses(s.id,c.id,family));requireThat(time>=(use?.readyAtGameMs??0),'COOLDOWN_ACTIVE');
  const cost=s.actionPointRules?.enabled?(p.cost??s.actionPointRules.cost):0,cooldownSeconds=p.cooldownSeconds??s.actionPointRules?.cooldownSeconds??600;
  const points=s.actionPointRules?.enabled?actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at):null;if(points)reserveActionPoints(points,cost);
  let bonusLot=null,consumableLot=null,bonus=0;
  if(input.bonusLotId){bonusLot=await readLot(tx,s.id,documentId(input.bonusLotId),at);const b=p.bonusItems.find(b=>b.itemId===bonusLot?.item.id);requireThat(b&&bonusLot.quantity>0&&bonusLot.status==='AVAILABLE'&&personalLot(bonusLot,c.id),'FIELD_EQUIPMENT_UNAVAILABLE');bonus=b.bonus;}
  if(p.consumable){consumableLot=await readLot(tx,s.id,documentId(input.consumableLotId),at);requireThat(consumableLot&&personalLot(consumableLot,c.id)&&consumableLot.status==='AVAILABLE'&&consumableLot.item.id===p.consumable.itemId&&consumableLot.item.consumable&&consumableLot.quantity>=p.consumable.quantity,'FIELD_EQUIPMENT_UNAVAILABLE');}
  let reward=null;
  const information=[];
  if(kind==='ANALYZE'){
   requireThat(state.analyses?.[c.id]!==t.revision,'FIELD_ANALYSIS_DONE');
   for(const r of t.rewards.filter(r=>r.minLevel<=level)){
    const k=await tx.get(`sessions/${s.id}/knowledge/${r.knowledgeId}`),receipt=await tx.get(`${cp(s.id,c.id)}/knowledge/${r.knowledgeId}`);
    requireThat(k?.publicationState==='PUBLISHED'&&(!receipt||receipt.active),'FIELD_UNAVAILABLE');
    information.push({...r,knowledge:knowledgeSnapshot(k)});
   }
  }
  if(kind==='SEARCH'&&!isPlaceSearch(t)){
   for(const candidate of t.rewards){
    if((state.stock[candidate.id]??0)<=0||claimed(state,c.id,candidate.id)>=candidate.perCharacter)continue;
    if(candidate.kind==='KNOWLEDGE'){
     const k=await tx.get(`sessions/${s.id}/knowledge/${candidate.knowledgeId}`),receipt=await tx.get(`${cp(s.id,c.id)}/knowledge/${candidate.knowledgeId}`);
     if(!k||k.publicationState!=='PUBLISHED'||receipt)continue;reward={...candidate,knowledge:knowledgeSnapshot(k)};
    }else if(candidate.kind==='ITEM'){const i=await tx.get(`sessions/${s.id}/items/${candidate.itemId}`);if(i?.publicationState!=='PUBLISHED')continue;reward={...candidate,item:publicItem(i)};}
    else {requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');moneyState(await tx.get(`sessions/${s.id}/accounts/${accountId(c.id)}`));reward={...candidate};}
    break;
   }
   requireThat(reward,'FIELD_EMPTY');
  }
  const bonuses=isPlaceSearch(t)?searchBonuses(t,c,await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id])):[];
  if(isPlaceSearch(t))bonus=bonuses.reduce((n,b)=>n+b.value,0);
  const aid=await prepareAid(tx,s,c,input,p,family,at);
  const durationSeconds=p.durationByLevel[level]??p.durationSeconds;
  const confirmation=digest({target:t,state,character:{id:c.id,profile:c.abilityProfile??null,health:c.healthRevision??0},access:r.accessVersion,rules:s.actionPointRules??null,rulesRevision:s.actionPointRulesRevision??0,points,bonusLot,consumableLot,kind,reward,information,aid,bonuses});
  const preview={target:publicTarget(t,state),kind,level,bonus,aidName:aid?.character.public.displayName??null,aid:aid?1:0,bonusName:bonusLot?.item.name??null,cost,durationSeconds,cooldownSeconds,test:p.test,threshold:isPlaceSearch(t)&&!t.search.showDifficulty?null:p.threshold,bonuses,instructions:p.instructions,
   consumable:consumableLot?{name:consumableLot.item.name,quantity:p.consumable.quantity}:null,actionPoints:actionPointSummary(s,c,points,at),confirmation};
  return {t,state,p,reward,information,family,points,bonusLot,consumableLot,preview,aid,bonuses};
 }
 async function catalog(tx,base){const names=['skills','items','knowledge','fieldTargets'];return Object.fromEntries(await Promise.all(names.map(async k=>[k,await tx.list(`${base}/${k}`)])));}
 return async function dispatch(action,actor,input){
  signed(actor);const at=now();
  if([...adminReads,...playerReads].includes(action))return store.runTransaction(async tx=>{
   if(action==='fieldAdmin'){
    const {s,base,session}=await organizer(tx,actor,input),records=await catalog(tx,base),states=session?await tx.list(`${base}/fieldStates`):[],actions=session?await tx.list(`${base}/fieldActions`):[];
    return {scope:session?'session':'scenario',parent:{id:s.id,title:s.title,stage:s.stage??null,sealed:s.campaignSealed===true||!!s.spaceOutlaws,searchReady:s.spaceOutlaws?.searchVersion===1,canReset:actor.uid===s.ownerUid},...records,...(s.spaceOutlaws?.searchVersion===1?{sources:{lots:(await tx.list(`${base}/inventory`)).filter(l=>l.ownerType==='SHOP'&&l.status==='AVAILABLE'&&l.transferable!==false).map(l=>({id:l.id,name:l.item.name,itemId:l.item.id,quantity:l.quantity})),accounts:(await tx.list(`${base}/accounts`)).filter(a=>a.ownerType==='SHOP'&&a.status==='ACTIVE').map(a=>({id:a.id,name:a.label??a.shopId??a.id,available:a.balance-a.reserved}))}}:{}),states:states.map(st=>effectiveFieldState(s,st,at)),actions:actions.filter(a=>a.status==='ACTIVE').map(a=>viewAction(a,s,at)),history:actions.filter(a=>a.status!=='ACTIVE').sort((a,b)=>b.finishedAt-a.finishedAt).slice(0,30).map(a=>viewAction(a,s,at))};
   }
   const ctx=await player(tx,actor,input),{s,c}=ctx;
   if(action==='myFieldActions'){const rows=await tx.list(`sessions/${s.id}/fieldActions`,['characterId',c.id]);const actions=[];for(const a of rows.filter(a=>a.actorUid===actor.uid&&a.accessVersion===ctx.r.accessVersion).sort((a,b)=>b.startedAt-a.startedAt).slice(0,50)){const v=viewAction(a,s,at);if(a.searchVersion===1&&v.result){const st=await tx.get(sp(s.id,a.targetId));v.result={...v.result,discoveries:v.result.discoveries.map(d=>({...d,status:st?.finds[d.id]?.generation!==d.generation?'UNAVAILABLE':st.finds[d.id].status==='TAKEN'?(st.finds[d.id].takenBy===c.id?'TAKEN':'UNAVAILABLE'):d.status}))};}actions.push(v);}return {session:{id:s.id,stage:s.stage},actions};}
   if(action==='prepareFieldAction')return (await plan(tx,ctx,input,at)).preview;
   const {t,state}=await target(tx,s,input.targetId,at),lots=(await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id])).filter(l=>personalLot(l,c.id)&&l.status==='AVAILABLE'&&l.quantity>0);
   const time=gameTime(s.clock,at),profiles=[];
   for(const p of Object.values(t.profiles)){const family=p.kind==='SEARCH'?'FOUILLE':p.skillId?`SKILL:${p.skillId}`:p.kind,use=await tx.get(uses(s.id,c.id,family)),level=p.skillId?abilityLevel(c,p.skillId):0;
    profiles.push({kind:p.kind,skillId:p.skillId,instructions:p.instructions,level,qualified:isPlaceSearch(t)?t.search.active&&(t.search.maxAttempts===null||(state.attempts[c.id]??0)<t.search.maxAttempts):!p.skillId||level>=p.minLevel,waitMs:Math.max(0,(use?.readyAtGameMs??0)-time),durationSeconds:p.durationByLevel[level]??p.durationSeconds,test:p.test,threshold:isPlaceSearch(t)&&!t.search.showDifficulty?null:p.threshold,bonuses:isPlaceSearch(t)?searchBonuses(t,c,lots):[],
     cost:s.actionPointRules?.enabled?(p.cost??s.actionPointRules.cost):0,bonusLots:lots.flatMap(l=>{const b=p.bonusItems.find(b=>b.itemId===l.item.id);return b?[{id:l.id,name:l.item.name,bonus:b.bonus}]:[];}),consumable:p.consumable?{quantity:p.consumable.quantity,lots:lots.filter(l=>l.item.id===p.consumable.itemId&&l.item.consumable&&l.quantity>=p.consumable.quantity).map(l=>({id:l.id,name:l.item.name}))}:null});
   }
   return {session:{id:s.id,stage:s.stage},target:publicTarget(t,state),profiles,analysisDone:t.kind==='ANALYSIS'&&state.analyses?.[c.id]===t.revision,aidOffers:await offeredAid(tx,s.id,c.id),activeActionId:c.activeFieldActionId??null,lockedMs:Math.max(0,state.lockedUntilGameMs-time),protectedMs:Math.max(0,state.protectedUntilGameMs-time)};
  });
  const requestId=documentId(input.requestId),op=`operations/${hash(`${actor.uid}:${requestId}`)}`,fingerprint=digest([action,input]),id=uuid(),die=action==='finishFieldAction'?rollD6():null,searchDie=action==='finishFieldAction'?rollD12():null;
  return store.runTransaction(async tx=>{
   let org,ctx,a;
   if(adminWrites.includes(action)){org=await organizer(tx,actor,input);requireThat(org.s.stage!=='ARCHIVED','SESSION_CLOSED');}
   else {ctx=await player(tx,actor,input);if(action!=='startFieldAction')a=await ownedAction(tx,ctx,{...input,aidCancellation:action==='cancelFieldActionAid'},actor);}
   const session=(ctx??org).s;
   if(session.spaceOutlaws){
    requireThat(action!=='replenishFieldTarget'&&(action!=='saveFieldTarget'||session.spaceOutlaws.searchVersion===1&&isPlaceSearch(input.target)),'SO_GAMEPLAY_NOT_OPEN');
    authorizeSpaceOutlaws(tx,session,'FIELD');
    if(session.spaceOutlaws.searchVersion===1)authorizeSpaceOutlaws(tx,session,'SEARCH');
    if(a)requireThat(a.kind==='ANALYZE'||session.spaceOutlaws.searchVersion===1&&a.searchVersion===1,'SO_GAMEPLAY_NOT_OPEN');
   }
   if(session.spaceOutlaws&&action==='saveFieldTarget')requireThat(actor.uid===session.ownerUid,'FORBIDDEN');
   if(action==='provisionFieldFind'){requireThat(session.spaceOutlaws?.searchVersion===1,'SO_GAMEPLAY_NOT_OPEN');if(input.reset===true)requireThat(actor.uid===session.ownerUid,'FIELD_RESET_FORBIDDEN');}
   const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');if(ctx)requireThat(previous.characterId===ctx.c.id&&previous.accessVersion===ctx.r.accessVersion,'FORBIDDEN');return previous.result;}
   let result;
   if(action==='provisionFieldFind'){const {s}=org;const {t,state}=await target(tx,s,input.targetId,at);result=await provisionPlaceFind(tx,s,t,state,input,actor,id,at);}
   else if(action==='takeFieldFind'){const {s,c}=ctx;const {t,state}=await target(tx,s,a.targetId,at);result=await takePlaceFind(tx,s,c,t,state,a,input,actor,id,at);}
   else if(action==='saveFieldTarget'){
    const {s,base,session}=org,tid=input.targetId?documentId(input.targetId):id,old=await tx.get(`${base}/fieldTargets/${tid}`),state=session?await tx.get(sp(s.id,tid)):null;
    requireThat((old?.revision??0)===(input.revision??0),'STALE_REVISION');requireThat(!state?.activeActionId,'FIELD_TARGET_BUSY');
    if(s.spaceOutlaws){requireThat(!old||actor.uid===s.ownerUid,'FORBIDDEN');requireThat(s.stage==='BRIEFING'&&(!old||isPlaceSearch(old)),'FIELD_PREPARATION_REQUIRED');requireThat(!old||JSON.stringify(old.search.bonuses)===JSON.stringify(input.target.search.bonuses),'FIELD_BONUS_PUBLISHED_ONLY');requireThat(old||!input.target.search.bonuses.length,'FIELD_BONUS_PUBLISHED_ONLY');}
    const next=fieldTargetInput(input.target,tid,old??{}),records=await catalog(tx,base);records.fieldTargets=records.fieldTargets.filter(t=>t.id!==tid).concat(next);
    requireThat(records.fieldTargets.length<=100,'INVALID_FIELD_TARGET');
    for(const t of records.fieldTargets)validateFieldReferences(t,records);
    if(next.publicationState==='PUBLISHED'&&next.rewards.some(r=>r.kind==='CREDITS'))requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');
    if(session&&old){if(isPlaceSearch(old)){const identity=rows=>rows.map(({active,difficulty,title,...r})=>r).sort((a,b)=>a.id.localeCompare(b.id));requireThat(digest(identity(old.finds))===digest(identity(next.finds)),'FIELD_STOCK_IMMUTABLE');}requireThat(old.kind===next.kind&&digest(old.rewards)===digest(next.rewards),'FIELD_STOCK_IMMUTABLE');}
    const why=reason(input.reason);tx.set(`${base}/fieldTargets/${tid}`,next);tx.set(base,{...s,revision:s.revision+1});
    if(session&&!state)tx.set(sp(s.id,tid),initialFieldState(next));
    tx.set(`${base}/fieldTargets/${tid}/history/${id}`,{id,at,actorUid:actor.uid,reason:why,before:old??null,after:next});
    if(session)tx.set(`${base}/audit/${id}`,{id,at,action,actorUid:actor.uid,reason:why,targetId:tid});result={id:tid};
   }else if(action==='replenishFieldTarget'){
    const {s,base,session}=org;requireThat(session,'INVALID_ID');const tid=documentId(input.targetId),t=await tx.get(`${base}/fieldTargets/${tid}`),state=await tx.get(sp(s.id,tid)),rid=documentId(input.rewardId),quantity=whole(input.quantity,'INVALID_QUANTITY');
    requireThat(t?.kind==='SEARCH'&&state&&t.rewards.some(r=>r.id===rid)&&quantity>0,'INVALID_FIELD_TARGET');requireThat(state.stock[rid]+quantity<=1000000,'INVALID_QUANTITY');requireThat(!state.activeActionId,'FIELD_TARGET_BUSY');requireThat(state.revision===input.revision,'STALE_REVISION');
    const next={...state,stock:{...state.stock,[rid]:whole(state.stock[rid]+quantity,'INVALID_QUANTITY')},revision:state.revision+1},why=reason(input.reason);
    tx.set(sp(s.id,tid),next);tx.set(`${base}/audit/${id}`,{id,at,action,actorUid:actor.uid,reason:why,targetId:tid,rewardId:rid,quantity,before:state.stock[rid],after:next.stock[rid]});result={id:tid};
   }else if(action==='startFieldAction'){
    requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');const p=await plan(tx,ctx,input,at);requireThat(p.preview.confirmation===input.confirmation,'STALE_REVISION');const {s,c,r}=ctx,time=gameTime(s.clock,at);
    a={id,characterId:c.id,characterName:c.public.displayName,actorUid:actor.uid,accessVersion:r.accessVersion,targetId:p.t.id,targetTitle:p.t.title,kind:input.kind,status:'ACTIVE',startedAt:at,startedAtGameMs:time,readyAtGameMs:time+p.preview.durationSeconds*1000,
     aid:aidSnapshot(p.aid),durationSeconds:p.preview.durationSeconds,cost:p.preview.cost,apEnabled:!!p.points,cooldownSeconds:p.preview.cooldownSeconds,family:p.family,level:p.preview.level,bonus:p.preview.bonus,bonusName:p.preview.bonusName,profile:p.p,reward:p.reward,
     ...(isPlaceSearch(p.t)?{searchVersion:1,searchEpoch:p.state.epoch,showDifficulty:p.t.search.showDifficulty,bonuses:p.bonuses,targetRevision:p.t.revision}:{}),
     ...(input.kind==='ANALYZE'?{information:p.information,targetRevision:p.t.revision}:{}),
     bonusLotId:p.bonusLot?.id??null,consumableLotId:p.consumableLot?.id??null,offlineSeconds:p.t.offlineSeconds,failureLockSeconds:p.t.failureLockSeconds,repairProtectionSeconds:p.t.repairProtectionSeconds};
    reserveAid(tx,s,a,p.aid,'fieldActions');tx.set(ap(s.id,id),a);tx.set(cp(s.id,c.id),{...c,activeFieldActionId:id});tx.set(sp(s.id,p.t.id),{...p.state,activeActionId:id,revision:p.state.revision+1});
    if(p.points)tx.set(actionPointPath(s.id,c.id),reserveActionPoints(p.points,a.cost));
    for(const l of new Map([p.bonusLot,p.consumableLot].filter(Boolean).map(l=>[l.id,l])).values())tx.set(`sessions/${s.id}/inventory/${l.id}`,{...l,status:'FIELD_RESERVED',fieldActionId:id,revision:l.revision+1});
    tx.set(`sessions/${s.id}/audit/${id}`,{id,at,action,actorUid:actor.uid,characterId:c.id,targetId:a.targetId,cost:a.cost});result=viewAction(a,s,at);
   }else{
    const gm=action==='cancelFieldActionMJ';let s,c,r;
    if(gm){requireThat(org.session,'INVALID_ID');s=org.s;a=await tx.get(ap(s.id,documentId(input.actionId)));requireThat(a,'NOT_FOUND');if(s.spaceOutlaws)requireThat(a.kind==='ANALYZE'||s.spaceOutlaws.searchVersion===1&&a.searchVersion===1,'SO_GAMEPLAY_NOT_OPEN');c=await tx.get(cp(s.id,a.characterId));}
    else {({s,c,r}=ctx);if(action==='cancelFieldActionAid')c=await tx.get(cp(s.id,a.characterId));}
    const cancel=action!=='finishFieldAction';
    if(a.status!=='ACTIVE')result=viewAction(a,s,at);
    else{
     requireThat(c&&c.activeFieldActionId===a.id,'FIELD_STATE_CHANGED');const t=await tx.get(`sessions/${s.id}/fieldTargets/${a.targetId}`),stored=await tx.get(sp(s.id,a.targetId));requireThat(stored?.activeActionId===a.id,'FIELD_STATE_CHANGED');
     let state=effectiveFieldState(s,stored,at);const time=gameTime(s.clock,at),lots=[];
     for(const lid of new Set([a.bonusLotId,a.consumableLotId].filter(Boolean))){const l=await tx.get(`sessions/${s.id}/inventory/${lid}`);requireThat(l?.status==='FIELD_RESERVED'&&l.fieldActionId===a.id&&personalLot(l,c.id),'FIELD_EQUIPMENT_UNAVAILABLE');lots.push(l);}
     const points=a.apEnabled?actionPointState(s,c,await tx.get(actionPointPath(s.id,c.id)),at):null;
     let outcome=null,why=cancel?reason(input.reason):'';
     if(!cancel){
      requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');requireGameAction(s,c,'discover',at);requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');requireThat(time>=a.readyAtGameMs,'FIELD_TOO_EARLY');requireThat(t?.publicationState==='PUBLISHED','FIELD_UNAVAILABLE');await dependency(tx,s,t,at);
      requireThat(!a.profile.skillId||abilityLevel(c,a.profile.skillId)>=a.profile.minLevel,'FIELD_SKILL_REQUIRED');requireThat(a.kind==='SEARCH'||a.kind==='ANALYZE'||(a.kind==='SABOTAGE'?state.status==='ONLINE':state.status==='OFFLINE'),'FIELD_STATE_CHANGED');
      await checkAid(tx,s,a,at);const roll=a.searchVersion===1?searchDie:a.profile.test==='D6'?die:null;if(roll!==null)requireThat(Number.isInteger(roll)&&roll>=1&&roll<=(a.searchVersion===1?12:6),'INVALID_DIE');
      const total=roll===null?null:roll+a.level+a.bonus+(a.aid?1:0),success=roll===null||total>=a.profile.threshold;outcome={success,roll,level:a.level,bonus:a.bonus,aid:a.aid?1:0,total,threshold:a.searchVersion===1&&!a.showDifficulty?null:a.profile.threshold,text:success?a.profile.successText:a.profile.failureText,reward:null};
      if(a.searchVersion===1){
       requireThat(isPlaceSearch(t)&&t.search.active&&t.revision===a.targetRevision&&state.epoch===a.searchEpoch,'FIELD_STATE_CHANGED');
       const live=searchBonuses(t,c,await tx.list(`sessions/${s.id}/inventory`,['holderId',c.id]));requireThat(digest(live)===digest(a.bonuses),'FIELD_EQUIPMENT_UNAVAILABLE');
       const found=await discoverPlace(tx,s,c,t,state,a,total,at);state=found.state;outcome={...outcome,success:found.discoveries.length>0,threshold:a.showDifficulty?a.profile.threshold:null,text:found.discoveries.length?'Découvertes accessibles.':'Vous ne trouvez rien de plus.',bonuses:a.bonuses,discoveries:found.discoveries};
      }else if(a.kind==='ANALYZE'){
       requireThat(t.revision===a.targetRevision&&state.analyses?.[c.id]!==t.revision,'FIELD_STATE_CHANGED');
       const received=[];
       for(const r of a.information.filter(r=>!r.bonus||success)){
        const path=`${cp(s.id,c.id)}/knowledge/${r.knowledgeId}`,old=await tx.get(path),k=await tx.get(`sessions/${s.id}/knowledge/${r.knowledgeId}`);
        requireThat(k?.publicationState==='PUBLISHED'&&(!old||old.active),'FIELD_STATE_CHANGED');
        if(!old)tx.set(path,{id:r.knowledgeId,active:true,snapshot:r.knowledge,receivedAt:at,source:'FIELD',sourceName:a.targetTitle,readAt:null,grantRevision:1});
        received.push({id:r.knowledgeId,title:r.knowledge.title,bonus:r.bonus});
       }
       outcome={...outcome,success:true,bonusSuccess:a.profile.test==='D6'?success:null,information:received};
       state={...state,analyses:{...state.analyses,[c.id]:t.revision}};
      }else if(success&&a.kind==='SEARCH'){
       const rw=a.reward;requireThat(state.stock[rw.id]>0,'FIELD_EMPTY');
       if(rw.kind==='CREDITS'){
        requireThat(s.economyRules?.enabled,'ECONOMY_DISABLED');const wallet=await tx.get(`sessions/${s.id}/accounts/${accountId(c.id)}`),before=moneyState(wallet),next={...wallet,balance:whole(wallet.balance+rw.quantity,'BALANCE_OVERFLOW'),revision:wallet.revision+1};
        tx.set(`sessions/${s.id}/accounts/${wallet.id}`,next);writeLedger(tx,s.id,{id:a.id,at,kind:'FIELD_FIND',actorUid:actor.uid,memo:`Découverte : ${a.targetTitle}`,createdCurrency:0,removedCurrency:0,source:{kind:'FIELD_RESERVE',targetId:a.targetId,rewardId:rw.id,before:state.stock[rw.id]*rw.quantity,after:(state.stock[rw.id]-1)*rw.quantity},entries:[{accountId:wallet.id,characterId:c.id,delta:rw.quantity,before,after:moneyState(next)}]});outcome.reward={kind:rw.kind,quantity:rw.quantity,name:s.economyRules.unit};
       }else if(rw.kind==='ITEM'){
        const lot=newLot(a.id,rw.item,rw.quantity,c.id,at,{kind:'FIELD_FIND',targetId:a.targetId,actionId:a.id});tx.set(`sessions/${s.id}/inventory/${lot.id}`,lot);tx.set(`sessions/${s.id}/inventory/${lot.id}/history/${a.id}`,{id:a.id,at,kind:'FIELD_FIND',actorUid:actor.uid,before:null,after:lotState(lot),targetId:a.targetId});outcome.reward={kind:rw.kind,quantity:rw.quantity,name:rw.item.name,lotId:lot.id};
       }else{
        const path=`${cp(s.id,c.id)}/knowledge/${rw.knowledgeId}`,receipt=await tx.get(path),k=await tx.get(`sessions/${s.id}/knowledge/${rw.knowledgeId}`);requireThat(!receipt&&k?.publicationState==='PUBLISHED','FIELD_STATE_CHANGED');
        tx.set(path,{id:rw.knowledgeId,active:true,snapshot:rw.knowledge,receivedAt:at,source:'FIELD',sourceName:a.targetTitle,readAt:null,grantRevision:1});outcome.reward={kind:rw.kind,name:rw.knowledge.title,knowledgeId:rw.knowledgeId};
       }
       state={...state,stock:{...state.stock,[rw.id]:state.stock[rw.id]-1},claims:{...state.claims,[c.id]:{...claimsFor(state,c.id),[rw.id]:claimed(state,c.id,rw.id)+1}}};
      }else if(success&&a.kind==='SABOTAGE')state={...state,status:'OFFLINE',offlineUntilGameMs:a.offlineSeconds?time+a.offlineSeconds*1000:null};
      else if(success&&a.kind==='REPAIR')state={...state,status:'ONLINE',offlineUntilGameMs:null,protectedUntilGameMs:time+a.repairProtectionSeconds*1000};
      else if(!success&&a.kind!=='SEARCH')state={...state,lockedUntilGameMs:time+a.failureLockSeconds*1000};
      tx.set(uses(s.id,c.id,a.family),{readyAtGameMs:time+a.cooldownSeconds*1000,actionId:a.id});
     }
     await finishAid(tx,s,a,at,{cancel});
     for(const l of lots){const quantity=l.quantity-(!cancel&&l.id===a.consumableLotId?a.profile.consumable.quantity:0);requireThat(quantity>=0,'FIELD_EQUIPMENT_UNAVAILABLE');const next={...l,quantity,status:quantity?'AVAILABLE':'CONSUMED',fieldActionId:null,revision:l.revision+1};tx.set(`sessions/${s.id}/inventory/${l.id}`,next);tx.set(`sessions/${s.id}/inventory/${l.id}/history/${id}`,{id,at,kind:cancel?'FIELD_RELEASE':'FIELD_USE',actorUid:actor.uid,actionId:a.id,before:lotState(l),after:lotState(next)});}
     if(points)tx.set(actionPointPath(s.id,c.id),cancel?releaseActionPoints(points,a.cost,actionPointMaximum(s.actionPointRules,c)):resolveActionPoints(points,a.cost));
     const next={...a,status:cancel?'CANCELLED':outcome.success?'SUCCEEDED':'FAILED',finishedAt:at,finishedAtGameMs:time,result:outcome,cancelReason:why};
     tx.set(ap(s.id,a.id),next);tx.set(cp(s.id,c.id),{...c,activeFieldActionId:null});tx.set(sp(s.id,a.targetId),{...state,activeActionId:null,revision:state.revision+1});
     tx.set(`sessions/${s.id}/audit/${id}`,{id,at,action,actorUid:actor.uid,characterId:c.id,targetId:a.targetId,actionId:a.id,result:outcome,reason:why});result=viewAction(next,s,at);
    }
   }
   if(action==='cancelFieldActionAid')result={...result,result:null};
   tx.set(op,{fingerprint,result,at,...(ctx?{characterId:ctx.c.id,accessVersion:ctx.r.accessVersion}:{})});return result;
  });
 };
}
