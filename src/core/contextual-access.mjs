import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {abilityLevel} from './abilities.mjs';
import {gameTime} from './clock.mjs';
import {requireGameAction} from './health-state.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
// Only operations actually connected to a native service can be published.
export const localOperations={shop:'shopId',prepareShopPurchase:'shopId',buyShopOffer:'shopId'};
export const contextualActions=new Set(['localAccessAdmin','saveLocalTerminal','scanLocalTerminal','localTerminal','revokeLocalPresence']);
const base=sid=>`localAccess/${sid}`;
export const localBindingId=(action,id)=>hash(JSON.stringify([action,id]));
const text=(v,max=160)=>{requireThat(typeof v==='string'&&v.trim().length>0&&v.length<=max,'INVALID_TEXT');return v.trim();};
const live=s=>{requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const terminalView=t=>({id:t.id,name:t.name,placeId:t.placeId,portId:t.portId,active:t.active,revision:t.revision,durationSeconds:t.durationSeconds,operations:t.operations.map(o=>({action:o.action,resourceId:o.resourceId}))});
function terminalInput(input){
 const t=input.terminal;requireThat(t&&typeof t==='object','INVALID_TERMINAL');admissionKeys(t,['id','name','placeId','portId','active','durationSeconds','operations']);
 const durationSeconds=whole(t.durationSeconds);requireThat(durationSeconds>=30&&durationSeconds<=3600,'INVALID_LOCAL_DURATION');
 requireThat(typeof t.active==='boolean'&&Array.isArray(t.operations)&&t.operations.length>0&&t.operations.length<=30,'INVALID_TERMINAL');
 const seen=new Set(),operations=t.operations.map(o=>{
  admissionKeys(o,['action','resourceId','characterIds','skillId','minLevel']);requireThat(Object.hasOwn(localOperations,o.action),'INVALID_LOCAL_OPERATION');
  const resourceId=documentId(o.resourceId),key=localBindingId(o.action,resourceId);requireThat(!seen.has(key),'DUPLICATE_LOCAL_OPERATION');seen.add(key);
  requireThat(Array.isArray(o.characterIds)&&o.characterIds.length<=100,'INVALID_LOCAL_POLICY');const characterIds=[...new Set(o.characterIds.map(documentId))];
  const skillId=o.skillId?documentId(o.skillId):null,minLevel=whole(o.minLevel??0);requireThat(skillId?minLevel>=1&&minLevel<=5:minLevel===0,'INVALID_LOCAL_POLICY');
  return {action:o.action,resourceId,characterIds,skillId,minLevel};
 });
 return {id:documentId(t.id),name:text(t.name),placeId:documentId(t.placeId),portId:t.portId?documentId(t.portId):null,active:t.active,durationSeconds,operations};
}
export async function localAuthorization(tx,ctx,action,resourceId,at){
 const {s,c,version}=ctx,b=base(s.id),binding=await tx.get(`${b}/bindings/${localBindingId(action,resourceId)}`);
 if(!binding)return null; // Historical, unconfigured resources retain their native contract.
 const t=await tx.get(`${b}/terminals/${binding.terminalId}`),p=await tx.get(`${b}/presence/${c.id}`);
 requireThat(t?.active&&binding.active,'LOCAL_TERMINAL_CLOSED');live(s);
 requireThat(p&&p.terminalId===t.id&&p.terminalRevision===t.revision&&p.characterVersion===version&&p.expiresGameMs>gameTime(s.clock,at),'LOCAL_SCAN_REQUIRED');
 const rule=t.operations.find(o=>o.action===action&&o.resourceId===resourceId);requireThat(rule,'FORBIDDEN');
 requireThat(!rule.characterIds.length||rule.characterIds.includes(c.id),'FORBIDDEN');
 requireThat(!rule.skillId||abilityLevel(c,rule.skillId)>=rule.minLevel,'LOCAL_SKILL_REQUIRED');
 return {terminalId:t.id,placeId:t.placeId,resourceId,characterId:c.id};
}
// The local guard runs INSIDE the very same transaction as stock/payment/receipt.
// Native resource mandates and economic checks still run independently afterwards.
export function localOperationStore(store,{actor,input,action,now,uuid,signed}){
 const resourceField=localOperations[action];if(!resourceField)return store;
 return {...store,runTransaction:callback=>store.runTransaction(async tx=>{
  signed(actor);const sid=documentId(input.sessionId),resourceId=documentId(input[resourceField]);
  const binding=await tx.get(`${base(sid)}/bindings/${localBindingId(action,resourceId)}`);
  let audit=null;
  if(binding){const ctx=await inventoryPlayer(tx,actor,input);audit=await localAuthorization(tx,ctx,action,resourceId,now());}
  const result=await callback(tx);
  if(audit){const id=uuid();tx.set(`${base(sid)}/journal/${id}`,{id,at:now(),action,...audit});}
  return result;
 })};
}
export function createContextualAccessService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),b=base(sid),at=now(),eventId=uuid();
  const admin=['localAccessAdmin','saveLocalTerminal','revokeLocalPresence'].includes(action);
  return store.runTransaction(async tx=>{
   const ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx;
   requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');
   if(action==='localAccessAdmin')return {sessionId:sid,terminals:await tx.list(`${b}/terminals`),journal:await tx.list(`${b}/journal`,null,{orderBy:'at',direction:'desc',limit:100}),operations:localOperations};
   if(action==='saveLocalTerminal'){
    admissionKeys(input,['sessionId','terminal','revision','requestId']);const t=terminalInput(input),old=await tx.get(`${b}/terminals/${t.id}`);
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),prior=await tx.get(op);
    if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
    requireThat((old?.revision??0)===input.revision,'STALE_REVISION');
    // Binding ownership cannot silently be stolen from another terminal.
    const bindings=[];for(const o of t.operations){const id=localBindingId(o.action,o.resourceId),prior=await tx.get(`${b}/bindings/${id}`);requireThat(!prior||prior.terminalId===t.id,'LOCAL_BINDING_CONFLICT');bindings.push([id,o]);
     const resource=await tx.get(`sessions/${sid}/shops/${o.resourceId}`);requireThat(resource?.versionId===s.versionId,'NOT_FOUND');
     for(const cid of o.characterIds)requireThat(await tx.get(`sessions/${sid}/characters/${cid}`),'NOT_FOUND');
    }
    const next={...t,revision:(old?.revision??0)+1};
    for(const o of old?.operations??[])tx.set(`${b}/bindings/${localBindingId(o.action,o.resourceId)}`,{terminalId:t.id,active:false});
    for(const [id] of bindings)tx.set(`${b}/bindings/${id}`,{terminalId:t.id,active:t.active});
    tx.set(`${b}/terminals/${t.id}`,next);tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,terminalId:t.id,actorUid:actor.uid});const result=terminalView(next);tx.set(op,{fingerprint,result});return result;
   }
   if(action==='revokeLocalPresence'){
    admissionKeys(input,['sessionId','characterId','requestId']);const cid=documentId(input.characterId);
    tx.set(`${b}/presence/${cid}`,{revokedAt:at});tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,characterId:cid,actorUid:actor.uid});return {revoked:true};
   }
   admissionKeys(input,['sessionId','terminalId',...(action==='scanLocalTerminal'?['requestId']:[])]);
   const t=await tx.get(`${b}/terminals/${documentId(input.terminalId)}`);requireThat(t?.active,'LOCAL_TERMINAL_CLOSED');
   if(action==='scanLocalTerminal'){
    live(s);requireGameAction(s,c,'publish',at);
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),prev=await tx.get(op);
    if(prev){requireThat(prev.fingerprint===fingerprint&&prev.guard===version,'FORBIDDEN');const current=await tx.get(`${b}/presence/${c.id}`);requireThat(current?.id===prev.result.id&&current.terminalRevision===t.revision,'LOCAL_SCAN_REQUIRED');return prev.result;}
    const p={id:eventId,terminalId:t.id,terminalRevision:t.revision,characterVersion:version,expiresGameMs:gameTime(s.clock,at)+t.durationSeconds*1000};
    tx.set(`${b}/presence/${c.id}`,p);tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,terminalId:t.id,characterId:c.id});const result={id:p.id,terminal:terminalView(t),expiresGameMs:p.expiresGameMs};tx.set(op,{fingerprint,guard:version,result});return result;
   }
   const operations=[];for(const o of t.operations){try{await localAuthorization(tx,ctx,o.action,o.resourceId,at);operations.push({action:o.action,resourceId:o.resourceId,allowed:true});}catch(e){if(!e.code)throw e;operations.push({action:o.action,resourceId:o.resourceId,allowed:false,reason:e.code});}}
   return {terminal:terminalView(t),operations};
  });
 };
}
