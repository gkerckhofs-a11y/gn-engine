import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {createHash} from 'node:crypto';
import {documentId,requireThat} from './validation.mjs';
import {gameTime} from './clock.mjs';
import {abilityLevel} from './abilities.mjs';
import {activeCharacter} from './aid-state.mjs';
import {activeTraceMask} from './fictional-trace-state.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const base=s=>`sessions/${s.id}`;
const path=(s,collection,id)=>`${base(s)}/${collection}/${documentId(id)}`;
const enabled=s=>requireThat(s.spaceOutlaws?.fictionalTracesVersion===1,'SO_TRACE_CLOSED');
// Fictional, opt-in events. Technical audit records are never a source for player tracking.
export async function recordFictionalTrace(tx,s,c,target,kind,actionId,at){
 if(s.spaceOutlaws?.fictionalTracesVersion!==1||!target?.tracePolicy?.actions.includes(kind))return;
 authorizeSpaceOutlaws(tx,s,'FICTIONAL_TRACES');
 const id=hash([s.id,kind,actionId]),head=await tx.get(path(s,'fictionalTraceHeads',target.id));
 requireThat(Object.keys(head?.byCharacter??{}).length<1000||head?.byCharacter?.[c.id],'SO_RELEASE_LIMIT');
 const trace={id,sessionId:s.id,targetId:target.id,targetTitle:target.title,targetRevision:target.revision,minLevel:target.tracePolicy.minLevel,characterId:c.id,characterName:c.public.displayName,kind,actionId,atGameMs:gameTime(s.clock,at),at};
 tx.set(path(s,'fictionalTraces',id),trace);tx.set(path(s,'fictionalTraceHeads',target.id),{id:target.id,lastTraceId:id,byCharacter:{...head?.byCharacter,[c.id]:id},revision:(head?.revision??0)+1});
}
const profile=(mode,minLevel)=>({kind:'ANALYZE',skillId:mode==='TRACK'?'FIL-01':'EFF-01',minLevel,instructions:mode==='TRACK'?'Rechercher les traces fictives autorisées de ce point. Aucun accès aux journaux techniques ou à la localisation réelle.':'Brouiller une trace fictive admissible de moins de quinze minutes. Les événements réels et les biens restent inchangés.',durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},cost:1,cooldownSeconds:600,test:'AUTO',threshold:0,bonusItems:[],consumable:null,successText:'Recherche terminée.',failureText:''});
export async function traceTarget(tx,s,c,input,at){
 enabled(s);const sourceId=documentId(input.traceTargetId),mode=input.traceMode;requireThat(['TRACK','ERASE'].includes(mode),'SO_TRACE_POLICY');
 const source=await tx.get(path(s,'fieldTargets',sourceId)),sourceState=await tx.get(path(s,'fieldStates',sourceId));requireThat(source?.publicationState==='PUBLISHED'&&source.tracePolicy&&sourceState,'SO_TRACE_TARGET');
 const level=abilityLevel(c,mode==='TRACK'?'FIL-01':'EFF-01');requireThat(level>=source.tracePolicy.minLevel,'FIELD_SKILL_REQUIRED');
 const head=await tx.get(path(s,'fictionalTraceHeads',sourceId));
 let traceId=mode==='TRACK'?head?.lastTraceId:input.traceId??head?.byCharacter?.[c.id],trace=traceId?await tx.get(path(s,'fictionalTraces',traceId)):null,consent=null;
 requireThat(!trace||trace.targetId===source.id,'SO_TRACE_TARGET');
 if(mode==='ERASE'){
  requireThat(trace&&trace.sessionId===s.id&&head?.byCharacter?.[trace.characterId]===trace.id,'SO_TRACE_LAST');
  requireThat(gameTime(s.clock,at)-trace.atGameMs<=900000,'SO_TRACE_TOO_OLD');requireThat(level>=trace.minLevel,'FIELD_SKILL_REQUIRED');
  if(trace.characterId!==c.id){
   requireThat(level>=3,'FIELD_SKILL_REQUIRED');const subject=await activeCharacter(tx,s.id,trace.characterId),recipient=await activeCharacter(tx,s.id,c.id);consent=await tx.get(path(s,'fictionalTraceConsents',hash([trace.id,c.id])));
   requireThat(consent?.active===true&&consent.subjectAccessVersion===subject.r.accessVersion&&consent.recipientAccessVersion===recipient.r.accessVersion&&consent.subjectUid===subject.c.assignedUid,'SO_TRACE_CONSENT');
  }
 }
 const mask=trace?await tx.get(path(s,'fictionalTraceMasks',trace.id)):null;
 const lead=input.falseLeadId?source.tracePolicy.falseLeads.find(x=>x.id===input.falseLeadId):null;
 const actorState=mode==='ERASE'?await tx.get(path(s,'fictionalTraceActors',c.id)):null,oldLead=actorState?.falseLeadTraceId?await tx.get(path(s,'fictionalTraceMasks',actorState.falseLeadTraceId)):null;
 if(input.falseLeadId){requireThat(mode==='ERASE'&&level>=5&&lead?.scenarioAuthorized===true,'SO_TRACE_FALSE_LEAD');requireThat(!activeTraceMask(s,oldLead),'SO_TRACE_FALSE_LEAD_ACTIVE');}
 const work={sourceId,sourceRevision:source.revision,mode,traceId:trace?.id??null,trace,mask:activeTraceMask(s,mask)?mask:null,consentRevision:consent?.revision??null,falseLead:lead??null};
 return {id:`trace_${hash([sourceId,mode,c.id])}`,kind:'ANALYSIS',publicationState:'PUBLISHED',title:(mode==='TRACK'?'Pistage : ':'Effacement : ')+source.title,description:source.description,revision:hash(work),profiles:{ANALYZE:profile(mode,source.tracePolicy.minLevel)},rewards:[],dependencyId:sourceId,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,traceWork:work,traceInput:{traceTargetId:sourceId,traceMode:mode,...(mode==='ERASE'?{traceId:trace?.id}:{}),...(lead?{falseLeadId:lead.id}:{})}};
}
export async function resolveTrace(tx,s,c,a,t,at){
 const w=t.traceWork;requireThat(t.revision===a.targetRevision,'FIELD_STATE_CHANGED');
 if(w.mode==='TRACK'){
  if(!w.trace)return {text:'Aucune interaction traçable enregistrée sur ce point.',trace:{found:false}};
  if(w.mask&&a.level<w.mask.level)return {text:w.mask.falseLead?.text??'Aucune trace exploitable retrouvée.',trace:{found:false,information:w.mask.falseLead?.text??null}};
  if(w.mask)tx.set(path(s,'fictionalTraceMasks',w.trace.id),{...w.mask,status:'DISCOVERED',discoveredBy:c.id,discoveredAt:at,revision:w.mask.revision+1});
  return {text:'Trace fictive retrouvée.',trace:{found:true,characterName:w.trace.characterName,...(a.level>=2?{atGameMs:w.trace.atGameMs,at:w.trace.at}:{}),reconstructed:!!w.mask}};
 }
 const prior=await tx.get(path(s,'fictionalTraceMasks',w.trace.id));
 const mask={id:w.trace.id,sessionId:s.id,status:'ACTIVE',level:a.level,erasedBy:c.id,actionId:a.id,at,revision:(prior?.revision??0)+1,falseLead:w.falseLead};tx.set(path(s,'fictionalTraceMasks',w.trace.id),mask);
 if(w.falseLead)tx.set(path(s,'fictionalTraceActors',c.id),{id:c.id,falseLeadTraceId:w.trace.id});
 if(w.trace.characterId!==c.id){const id=hash([w.trace.id,c.id]),consent=await tx.get(path(s,'fictionalTraceConsents',id));tx.set(path(s,'fictionalTraceConsents',id),{...consent,active:false,usedByActionId:a.id,revision:consent.revision+1});}
 return {text:w.falseLead?'Fausse piste préparée activée.':'Trace fictive brouillée.',trace:{erased:true,falseLead:!!w.falseLead}};
}
export async function traceOptions(tx,s,c,sourceId,at){
 enabled(s);const source=await tx.get(path(s,'fieldTargets',sourceId));requireThat(source?.publicationState==='PUBLISHED'&&source.tracePolicy,'SO_TRACE_TARGET');
 const level=abilityLevel(c,'EFF-01');requireThat(level>=source.tracePolicy.minLevel,'FIELD_SKILL_REQUIRED');const head=await tx.get(path(s,'fictionalTraceHeads',sourceId)),candidates=[];
 for(const [cid,id] of Object.entries(head?.byCharacter??{})){
  const trace=await tx.get(path(s,'fictionalTraces',id));if(!trace||trace.sessionId!==s.id||gameTime(s.clock,at)-trace.atGameMs>900000)continue;
  if(cid!==c.id){if(level<3)continue;const consent=await tx.get(path(s,'fictionalTraceConsents',hash([trace.id,c.id])));if(!consent?.active)continue;try{const subject=await activeCharacter(tx,s.id,cid),recipient=await activeCharacter(tx,s.id,c.id);if(consent.subjectAccessVersion!==subject.r.accessVersion||consent.recipientAccessVersion!==recipient.r.accessVersion||consent.subjectUid!==subject.c.assignedUid)continue;}catch(e){if(e.code==='FORBIDDEN')continue;throw e;}}
  candidates.push({id:trace.id,name:trace.characterName,own:cid===c.id});
 }
 return {traceTargetId:sourceId,title:source.title,candidates,falseLeads:level>=5?source.tracePolicy.falseLeads.map(l=>({id:l.id,label:l.label})):[]};
}
export async function myTraceConsents(tx,s,c,at){
 enabled(s);const rows=await tx.list(`${base(s)}/fictionalTraces`,['characterId',c.id],{limit:1001});requireThat(rows.length<=1000,'SO_RELEASE_LIMIT');const traces=[];
 for(const t of rows.filter(t=>t.sessionId===s.id&&gameTime(s.clock,at)-t.atGameMs<=900000)){const h=await tx.get(path(s,'fictionalTraceHeads',t.targetId));if(h?.byCharacter?.[c.id]===t.id)traces.push({id:t.id,title:t.targetTitle});}
 const consents=await tx.list(`${base(s)}/fictionalTraceConsents`,['subjectId',c.id],{limit:1001});requireThat(consents.length<=1000,'SO_RELEASE_LIMIT');return {sessionId:s.id,traces,consents:consents.filter(x=>x.active).map(x=>({id:x.id,traceId:x.traceId,recipientId:x.recipientId,recipientName:x.recipientName}))};
}
export async function consentTrace(tx,s,c,r,input,at){
 enabled(s);requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active&&input.present===true,'FIELD_PRESENCE_REQUIRED');const recipient=await activeCharacter(tx,s.id,documentId(input.recipientId)),trace=await tx.get(path(s,'fictionalTraces',input.traceId));
 requireThat(trace?.characterId===c.id&&trace.sessionId===s.id&&gameTime(s.clock,at)-trace.atGameMs<=900000,'SO_TRACE_CONSENT');requireThat(typeof input.enabled==='boolean'&&c.id!==recipient.c.id,'SO_TRACE_CONSENT');
 const id=hash([trace.id,recipient.c.id]),old=await tx.get(path(s,'fictionalTraceConsents',id));const next={id,traceId:trace.id,subjectId:c.id,subjectUid:c.assignedUid,subjectAccessVersion:r.accessVersion,recipientId:recipient.c.id,recipientName:recipient.c.public.displayName,recipientAccessVersion:recipient.r.accessVersion,active:input.enabled,revision:(old?.revision??0)+1,at};tx.set(path(s,'fictionalTraceConsents',id),next);return {active:next.active};
}
