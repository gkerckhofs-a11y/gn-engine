import {localNativePreview} from './contextual-preview.mjs';
import {localReadiness} from './contextual-readiness.mjs';
import {localServiceCatalog} from '../shared/local-service-catalog.mjs';
import {isBroker} from '../shared/player-access.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {saveLocalCredential,credentialView,localCodeDigest} from './contextual-credentials.mjs';
import {inventoryParty} from './inventory-transfers.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys} from './admission-state.mjs';
import {inventoryPlayer} from './inventory-transfers.mjs';
import {localAuthorization,localBindingId} from './contextual-policy.mjs';
export {localAuthorization,localBindingId} from './contextual-policy.mjs';
import {gameTime} from './clock.mjs';
import {requireGameAction} from './health-state.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
// Only operations actually connected to a native service can be published.
export const localOperations=Object.fromEntries(Object.entries(localServiceCatalog).map(([a,v])=>[a,v.field]));
export const contextualActions=new Set(['setTerminalQrMode','localAccessAdmin','saveLocalTerminal','scanLocalTerminal','localTerminal','revokeLocalPresence','saveLocalCredential','unlockLocalCode','simulateLocalAccess']);
const base=sid=>`localAccess/${sid}`;
const text=(v,max=160)=>{requireThat(typeof v==='string'&&v.trim().length>0&&v.length<=max,'INVALID_TEXT');return v.trim();};
const live=s=>{requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');requireThat(s.stage==='EN_JEU','SESSION_NOT_RUNNING');};
const terminalView=t=>({id:t.id,name:t.name,placeId:t.placeId,portId:t.portId,active:t.active,revision:t.revision,durationSeconds:t.durationSeconds,operations:t.operations.map(o=>({action:o.action,resourceId:o.resourceId}))});
function terminalInput(input){
 const t=input.terminal;requireThat(t&&typeof t==='object','INVALID_TERMINAL');admissionKeys(t,['id','name','placeId','portId','active','durationSeconds','operations']);
 const durationSeconds=whole(t.durationSeconds);requireThat(durationSeconds>=30&&durationSeconds<=3600,'INVALID_LOCAL_DURATION');
 requireThat(typeof t.active==='boolean'&&Array.isArray(t.operations)&&t.operations.length>0&&t.operations.length<=30,'INVALID_TERMINAL');
 const seen=new Set(),operations=t.operations.map(o=>{
  admissionKeys(o,['action','resourceId','characterIds','skillId','minLevel','credentialIds','credentialMode']);requireThat(Object.hasOwn(localOperations,o.action),'INVALID_LOCAL_OPERATION');
  const resourceId=documentId(o.resourceId),key=localBindingId(o.action,resourceId);requireThat(!seen.has(key),'DUPLICATE_LOCAL_OPERATION');seen.add(key);
  requireThat(Array.isArray(o.characterIds)&&o.characterIds.length<=100,'INVALID_LOCAL_POLICY');const characterIds=[...new Set(o.characterIds.map(documentId))];
  const skillId=o.skillId?documentId(o.skillId):null,minLevel=whole(o.minLevel??0);requireThat(skillId?minLevel>=1&&minLevel<=5:minLevel===0,'INVALID_LOCAL_POLICY');
  requireThat(o.credentialIds==null||Array.isArray(o.credentialIds),'INVALID_LOCAL_POLICY');const credentialIds=(o.credentialIds??[]).map(documentId),credentialMode=o.credentialMode??'ALL';requireThat(credentialIds.length<=10&&new Set(credentialIds).size===credentialIds.length&&['ALL','ANY'].includes(credentialMode),'INVALID_LOCAL_POLICY');
  return {action:o.action,resourceId,characterIds,skillId,minLevel,...(credentialIds.length?{credentialIds,credentialMode}:{})};
 });
 return {id:documentId(t.id),name:text(t.name),placeId:documentId(t.placeId),portId:t.portId?documentId(t.portId):null,active:t.active,durationSeconds,operations};
}
// The local guard runs INSIDE the very same transaction as stock/payment/receipt.
// Native resource mandates and economic checks still run independently afterwards.
export function localOperationStore(store,{actor,input,action,now,uuid,signed}){
 const resourceField=localOperations[action];if(!resourceField)return store;
 return {...store,runTransaction:callback=>store.runTransaction(async tx=>{
  signed(actor);const sid=documentId(input.sessionId),resourceId=documentId(input[resourceField]);
  const binding=await tx.get(`${base(sid)}/bindings/${localBindingId(action,resourceId)}`);
  let audit=null;
  if(binding||(await tx.get(`sessions/${sid}`))?.spaceOutlaws?.terminalQrVersion===1){const ctx=await inventoryPlayer(tx,actor,input),paidReceipt=action==='buyShopOffer'&&ctx.s.spaceOutlaws?.terminalQrVersion===1&&input.requestId?await tx.get(`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`):null;if(!paidReceipt)audit=await localAuthorization(tx,ctx,action,resourceId,now());}
  const result=await callback(tx);
  if(audit){const id=uuid();tx.set(`${base(sid)}/journal/${id}`,{id,at:now(),action,...audit});}
  return result;
 })};
}
export function createContextualAccessService({store,signed,checkSession,now,uuid,nativePreview}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),b=base(sid),at=now(),eventId=uuid();
  const admin=['setTerminalQrMode','localAccessAdmin','saveLocalTerminal','revokeLocalPresence','saveLocalCredential','simulateLocalAccess'].includes(action);
  return store.runTransaction(async tx=>{
   const ctx=admin?{s:await checkSession(tx,actor,sid)}:await inventoryPlayer(tx,actor,input),{s,c,version}=ctx;
   requireThat(!s.campaignSealed&&s.stage!=='ARCHIVED','SESSION_CLOSED');
   if(action==='setTerminalQrMode'){
    admissionKeys(input,['sessionId','revision','requestId','version']);requireThat(input.version===1,'INVALID_LOCAL_POLICY');
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),old=await tx.get(op);
    if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}
    requireThat(s.spaceOutlaws?.actionsVersion===1,'SO_GAMEPLAY_NOT_OPEN');requireThat(['BRIEFING','PAUSE'].includes(s.stage),'SESSION_NOT_PAUSED');requireThat(input.revision===s.revision,'STALE_REVISION');
    authorizeSpaceOutlaws(tx,s,'TERMINAL_QR_CONFIG');const next={...s,revision:s.revision+1,spaceOutlaws:{...s.spaceOutlaws,terminalQrVersion:1}};tx.set(`sessions/${sid}`,next);
    const result={version:1,revision:next.revision};tx.set(op,{fingerprint,result});tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,actorUid:actor.uid});return result;
   }
   if(action==='localAccessAdmin'){
    const terminals=await tx.list(`${b}/terminals`,null,{limit:101}),credentials=await tx.list(`${b}/credentials`,null,{limit:501}),shops=await tx.list(`sessions/${sid}/shops`,null,{limit:101});
    requireThat(terminals.length<=100&&credentials.length<=500&&shops.length<=100,'LOCAL_LIMIT');
    const offers=[];for(const shop of shops)for(const o of await tx.list(`sessions/${sid}/shops/${shop.id}/offers`,null,{limit:501}))offers.push({id:o.id,name:o.name,shopId:shop.id});requireThat(offers.length<=500,'LOCAL_LIMIT');
    const docks=(await tx.list(`sessions/${sid}/warehouses`)).filter(w=>w.dock).map(w=>({id:w.id,name:w.name}));
    return {readiness:await localReadiness(tx,s),targets:(await tx.list(`sessions/${sid}/fieldTargets`)).filter(t=>t.publicationState==='PUBLISHED').map(t=>({id:t.id,name:t.title})),ports:(await tx.list(`sessions/${sid}/ports`)).map(p=>({id:p.id,name:p.name})),sessionId:sid,sessionRevision:s.revision,terminalQrVersion:s.spaceOutlaws?.terminalQrVersion??0,docks,credentials:credentials.map(credentialView),characters:(await tx.list(`sessions/${sid}/characters`)).map(c=>({id:c.id,name:c.public.displayName})),shops:shops.map(s=>({id:s.id,name:s.name})),offers,terminals,journal:await tx.list(`${b}/journal`,null,{orderBy:'at',direction:'desc',limit:100}),operations:localOperations};
   }
   if(action==='saveLocalCredential')return saveLocalCredential({tx,s,input,actor,at,eventId});
   if(action==='simulateLocalAccess'){
    admissionKeys(input,['sessionId','terminalId','characterId','operation','resourceId','assumePresent','code','quantity','useProtected','offerId','nativeInput']);
    const party=await inventoryParty(tx,sid,documentId(input.characterId));requireThat(party.active,'LOCAL_CHARACTER_UNAVAILABLE');
    requireThat(typeof input.assumePresent==='boolean'&&Object.hasOwn(localOperations,input.operation),'INVALID_LOCAL_POLICY');
    const t=await tx.get(`${b}/terminals/${documentId(input.terminalId)}`);requireThat(t?.operations.some(o=>o.action===input.operation&&o.resourceId===input.resourceId),'NOT_FOUND');
    const simulated={s,c:party.c,r:party.r,version:party.version};
    try{await localAuthorization(tx,simulated,input.operation,documentId(input.resourceId),at,{assumePresent:input.assumePresent,code:input.code??null});}catch(e){if(!e.code)throw e;return {localAllowed:false,nativeAllowed:false,reason:e.code};}
    try{return await localNativePreview({tx,ctx:simulated,t,input,actor,at,nativePreview});
    }catch(e){if(!e.code)throw e;return {localAllowed:true,nativeAllowed:false,reason:e.code};}
   }
   if(action==='saveLocalTerminal'){
    admissionKeys(input,['sessionId','terminal','revision','requestId']);const t=terminalInput(input),old=await tx.get(`${b}/terminals/${t.id}`);
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),prior=await tx.get(op);
    if(prior){requireThat(prior.fingerprint===fingerprint,'REQUEST_ID_REUSED');return prior.result;}
    requireThat((old?.revision??0)===input.revision,'STALE_REVISION');
    // Binding ownership cannot silently be stolen from another terminal.
    const bindings=[];for(const o of t.operations){const id=localBindingId(o.action,o.resourceId),prior=await tx.get(`${b}/bindings/${id}`);requireThat(!prior||prior.terminalId===t.id,'LOCAL_BINDING_CONFLICT');bindings.push([id,o]);
     if(localServiceCatalog[o.action].kind==='TARGET'){const target=await tx.get(`sessions/${sid}/fieldTargets/${o.resourceId}`);requireThat(target?.publicationState==='PUBLISHED'&&t.placeId===target.id,'NOT_FOUND');}else if(localServiceCatalog[o.action].kind==='PORT'){const port=await tx.get(`sessions/${sid}/ports/${o.resourceId}`);requireThat(port?.versionId===s.versionId&&t.portId===port.id,'NOT_FOUND');}else if(localOperations[o.action]==='sessionId'){requireThat(o.resourceId===sid,'NOT_FOUND');}else{const resource=await tx.get(`sessions/${sid}/${o.action==='dockEntry'?'warehouses':'shops'}/${o.resourceId}`);requireThat(o.action==='dockEntry'?resource?.dock?.schemaVersion===1&&resource.portId===t.portId:resource?.versionId===s.versionId,'NOT_FOUND');}
     for(const cid of o.characterIds)requireThat(await tx.get(`sessions/${sid}/characters/${cid}`),'NOT_FOUND');
    }
    const all=await tx.list(`${b}/terminals`,null,{limit:101});requireThat(old||all.length<100,'LOCAL_LIMIT');
    for(const o of t.operations)for(const cid of o.credentialIds??[]){const g=await tx.get(`${b}/credentials/${cid}`);requireThat(g?.terminalId===t.id&&(o.action!=='dockEntry'||['CODE','KEY'].includes(g.kind)),'INVALID_LOCAL_CREDENTIAL');}
    const next={...t,schemaVersion:1,revision:(old?.revision??0)+1};
    for(const o of old?.operations??[])tx.set(`${b}/bindings/${localBindingId(o.action,o.resourceId)}`,{terminalId:t.id,active:false});
    for(const [id] of bindings)tx.set(`${b}/bindings/${id}`,{terminalId:t.id,active:t.active});
    tx.set(`${b}/terminals/${t.id}`,next);tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,terminalId:t.id,actorUid:actor.uid,before:old??null,after:next});const result=terminalView(next);tx.set(op,{fingerprint,result});return result;
   }
   if(action==='revokeLocalPresence'){
    admissionKeys(input,['sessionId','characterId','requestId']);const cid=documentId(input.characterId);
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
    tx.set(op,{fingerprint,result:{revoked:true}});tx.set(`${b}/presence/${cid}`,{revokedAt:at});tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,characterId:cid,actorUid:actor.uid});return {revoked:true};
   }
   admissionKeys(input,['sessionId','terminalId',...(['scanLocalTerminal','unlockLocalCode'].includes(action)?['requestId']:[]),...(action==='unlockLocalCode'?['code']:[])]);
   const t=await tx.get(`${b}/terminals/${documentId(input.terminalId)}`);requireThat(t?.active,'LOCAL_TERMINAL_CLOSED');
   if(action==='unlockLocalCode'){
    live(s);requireThat(typeof input.code==='string'&&input.code.length>=4&&input.code.length<=100,'INVALID_LOCAL_CREDENTIAL');
    const p=await tx.get(`${b}/presence/${c.id}`);requireThat(p&&p.terminalId===t.id&&p.terminalRevision===t.revision&&p.characterVersion===version&&p.expiresGameMs>gameTime(s.clock,at),'LOCAL_SCAN_REQUIRED');
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),old=await tx.get(op);if(old){requireThat(old.fingerprint===fingerprint,'REQUEST_ID_REUSED');return old.result;}
    const grants=(await tx.list(`${b}/credentials`,['terminalId',t.id],{limit:501})).filter(g=>g.kind==='CODE'&&g.active&&g.codeDigest===localCodeDigest(t.id,input.code));requireThat(grants.length,'LOCAL_CREDENTIAL_REQUIRED');
    const codeProofs={...(p.codeProofs??{})};for(const g of grants)codeProofs[g.id]=g.revision;
    tx.set(`${b}/presence/${c.id}`,{...p,codeProofs});tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,terminalId:t.id,characterId:c.id});tx.set(op,{fingerprint,result:{unlocked:true}});return {unlocked:true};
   }
   if(action==='scanLocalTerminal'){
    live(s);requireGameAction(s,c,'publish',at);
    const op=`operations/${hash(`${actor.uid}:${documentId(input.requestId)}`)}`,fingerprint=hash(JSON.stringify([action,input])),prev=await tx.get(op);
    if(prev){requireThat(prev.fingerprint===fingerprint&&prev.guard===version,'FORBIDDEN');const current=await tx.get(`${b}/presence/${c.id}`);requireThat(current?.id===prev.result.id&&current.terminalRevision===t.revision,'LOCAL_SCAN_REQUIRED');return prev.result;}
    const p={id:eventId,terminalId:t.id,terminalRevision:t.revision,characterVersion:version,expiresGameMs:gameTime(s.clock,at)+t.durationSeconds*1000};
    tx.set(`${b}/presence/${c.id}`,p);tx.set(`${b}/journal/${eventId}`,{id:eventId,at,action,terminalId:t.id,characterId:c.id});const result={id:p.id,terminal:terminalView(t),expiresGameMs:p.expiresGameMs};tx.set(op,{fingerprint,guard:version,result});return result;
   }
   const operations=[];for(const o of t.operations){try{if(['galacticMarkets','preparePlanetSale','sellToPlanetMarket'].includes(o.action))requireThat(isBroker(c),'FORBIDDEN');await localAuthorization(tx,ctx,o.action,o.resourceId,at);operations.push({action:o.action,resourceId:o.resourceId,allowed:true});}catch(e){if(!e.code)throw e;operations.push({action:o.action,resourceId:o.resourceId,allowed:false,reason:e.code});}}
   const presence=await tx.get(`${b}/presence/${c.id}`);return {terminal:terminalView(t),remainingSeconds:presence?.terminalId===t.id?Math.max(0,Math.ceil((presence.expiresGameMs-gameTime(s.clock,at))/1000)):0,operations};
  });
 };
}
