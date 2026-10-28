import {createHash} from 'node:crypto';
import {documentId,requireThat,whole} from './validation.mjs';
import {admissionKeys,admissionText,admissionProposal,admissionIdentity,admissionOccupancy} from './admission-state.mjs';
import {admissionM2Fiction} from './admission-m2.mjs';
import {centralCharacterInput} from './central-characters.mjs';
import {readSoEntryVersion,soBirthOptions,planSoBirthAssets,soBornCharacter,writeSoBirthAssets} from './space-outlaws-entry.mjs';
import {authorizeSpaceOutlaws} from './space-outlaws-entry-guard.mjs';
import {actionPointPath,actionPointSummary} from './action-point-state.mjs';
import {initialReceipt} from './knowledge.mjs';
import {retireCharacterMemberships} from './group-roster.mjs';
import {admissionClasses} from '../shared/admission-rules.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const digest=v=>hash(JSON.stringify(v));
const regPath=(sid,uid)=>`sessions/${sid}/registrations/${hash(uid)}`;
const reads=['spaceOutlawsSuccession','mySpaceOutlawsSuccession','prepareSpaceOutlawsSuccession'];
export const spaceOutlawsSuccessionActions=[...reads,'openSpaceOutlawsSuccession','submitSpaceOutlawsSuccessor','succeedSpaceOutlawsCharacter'];
const busy=c=>['activeFieldActionId','activePersonActionId','activeAidId','activeNavigationId','activeMaintenanceId','activeCargoId','activeVoyageId'].some(k=>c[k]);
const displayKey=name=>admissionIdentity({firstName:name,lastName:'display'});
const proposalFields=p=>Object.fromEntries(['firstName','lastName','speciesId','classId','secondaryId','background','friends'].map(k=>[k,p[k]??'']));
const nameOf=r=>`${r.admission.proposal.firstName} ${r.admission.proposal.lastName}`;
const currentAccess=(r,actor)=>r?.status==='ACCEPTED'&&r.accessActive===true&&actor.authTime>=r.minAuthTime;
const dossier=r=>r.succession?{status:r.succession.status,revision:r.succession.revision,predecessorId:r.succession.predecessorId,proposal:r.succession.proposal??null,message:r.succession.message??''}:null;

async function context(tx,s){
 const campaign=await tx.get(`campaigns/${s.campaignId}`);
 requireThat(campaign?.activeSessionId===s.id&&!campaign.activeBuildId&&!s.campaignSealed,'SO_SUCCESSION_CLOSED');
 const version=await readSoEntryVersion(tx,campaign);
 requireThat(version.header.successionVersion===1&&version.header.id===s.versionId,'SO_GAMEPLAY_NOT_OPEN');
 const [policy,counts,registrations,characters,groups]=await Promise.all([
  tx.get(`sessions/${s.id}/admission/settings`),tx.get(`sessions/${s.id}/admission/occupancy`),
  tx.list(`sessions/${s.id}/registrations`,null,{limit:1001}),tx.list(`sessions/${s.id}/characters`,null,{limit:1001}),tx.list(`sessions/${s.id}/groups`,null,{limit:51})]);
 requireThat(policy&&registrations.length<=1000&&characters.length<=1000&&groups.length<=50,'SO_RELEASE_LIMIT');
 const settings={...policy,species:version.changes.find(ch=>ch.type==='speciesCatalogue'&&ch.operation==='UPSERT')?.data??[]};
 const occupancy=admissionOccupancy(counts,s.accepted),confirmed=registrations.filter(r=>r.admission?.status==='APPROVED');
 requireThat(confirmed.length===s.accepted&&Object.entries(occupancy.byClass).every(([id,n])=>confirmed.filter(r=>r.admission.confirmation?.classId===id).length===n),'ADMISSION_ACCOUNTING_CONFLICT');
 const reservedIds=new Set(registrations.map(r=>r.admission?.m2Preparation?.characterId).filter(Boolean));
 const reserves=version.changes.filter(ch=>ch.type==='character'&&ch.operation==='UPSERT'&&ch.data.creationPlan&&!reservedIds.has(ch.entityId)&&!characters.some(c=>c.id===ch.entityId));
 return {campaign,version,policy,settings,occupancy,registrations,characters,groups,confirmed,reserves};
}
function deceased(ctx,r,predecessorId){
 requireThat(r?.status==='ACCEPTED'&&r.admission?.status==='APPROVED'&&r.accessActive,'FORBIDDEN');
 requireThat(r.characterId===predecessorId,'SO_SUCCESSION_STALE');
 const old=ctx.characters.find(c=>c.id===predecessorId&&c.assignedUid===r.uid);
 requireThat(old?.survival?.dead===true,'SO_SUCCESSION_DEATH_REQUIRED');
 requireThat(!ctx.characters.some(c=>c.id!==old.id&&c.assignedUid===r.uid&&!c.survival?.dead),'SO_BIRTH_CONFLICT');
 requireThat(!busy(old),'SO_SUCCESSION_BUSY');return old;
}
async function plan(tx,s,ctx,r,input,actor,at){
 requireThat(ctx.characters.length<1000,'SO_RELEASE_LIMIT');
 const old=deceased(ctx,r,documentId(input.predecessorId)),options=soBirthOptions(input.options);
 const points=await tx.get(actionPointPath(s.id,old.id));requireThat(!points?.reserved,'SO_SUCCESSION_BUSY');
 requireThat(['RESERVE','PROPOSAL'].includes(input.source),'INVALID_ADMISSION');
 let definition,proposal,id;
 if(input.source==='PROPOSAL'){
  requireThat(!input.reserveId&&r.succession?.status==='SUBMITTED'&&r.succession.predecessorId===old.id,'SO_SUCCESSION_NOT_SUBMITTED');
  proposal=admissionProposal(proposalFields(r.succession.proposal),ctx.settings,true);
  id=`successor_${hash(`${s.campaignId}:${old.id}:${r.uid}`)}`;
  definition=centralCharacterInput({...admissionM2Fiction(proposal),profession:'',description:'',roleplay:'',playerSecrets:'',gmNotes:'',objectives:[],relations:[]},id);
 }else{
  const reserve=ctx.reserves.find(ch=>ch.entityId===documentId(input.reserveId));requireThat(reserve,'SO_SUCCESSION_RESERVE_UNAVAILABLE');
  definition=reserve.data;id=reserve.entityId;
  // The complete published name remains unchanged; split only for the native admission fields.
  const [firstName,...rest]=definition.public.displayName.split(' ');
  proposal=admissionProposal({firstName,lastName:rest.join(' '),classId:definition.creationPlan.classId,speciesId:definition.creationPlan.speciesId,secondaryId:definition.creationPlan.secondaryId,background:definition.biography||'Personnage de réserve validé par le MJ.',friends:''},ctx.settings,true);
  requireThat(proposal.nature===definition.nature,'INVALID_ADMISSION_CHOICE');
 }
 const identityKey=displayKey(definition.public.displayName);
 requireThat(!ctx.characters.some(c=>c.id===id||displayKey(c.public.displayName)===identityKey),'ADMISSION_IDENTITY_TAKEN');
 requireThat(!ctx.confirmed.some(x=>x.uid!==r.uid&&displayKey(nameOf(x))===identityKey),'ADMISSION_IDENTITY_TAKEN');
 requireThat(!ctx.version.changes.some(ch=>ch.type==='character'&&ch.operation==='UPSERT'&&ch.entityId!==id&&displayKey(ch.data.public.displayName)===identityKey),'ADMISSION_IDENTITY_TAKEN');
 // A succession consumes the participant's existing place, but never carries a quota exception implicitly.
 const ordinary=ctx.confirmed.filter(x=>x.uid!==r.uid&&!x.admission.confirmation.exception);
 requireThat(ordinary.length<s.capacity&&ordinary.filter(x=>x.admission.confirmation.classId===proposal.classId).length<ctx.settings.quotas[proposal.classId],'ADMISSION_QUOTA_FULL');
 const oldClass=r.admission.confirmation.classId,byClass={...ctx.occupancy.byClass};byClass[oldClass]--;byClass[proposal.classId]++;
 requireThat(byClass[oldClass]>=0,'ADMISSION_ACCOUNTING_CONFLICT');
 // Reserve faction membership must be resolved explicitly by its own MJ command before activation.
 requireThat(!ctx.groups.some(g=>g.members.some(m=>m.characterId===id&&(m.active||Object.values(m.permissions??{}).some(Boolean)))),'SO_SUCCESSION_GROUP_CONFLICT');
 const assets=await planSoBirthAssets(tx,s,ctx.version,id,proposal.classId,proposal.secondaryId,options);
 requireThat(assets.profile,'INVALID_ADMISSION_CHOICE');
 const earned=whole(old.earnedXp??0),inheritedXp=Math.min(9,Math.floor(earned/4));
 const completedSessions=whole(r.progression?.completedSessions??0),pendingXp=whole(r.progression?.pendingXp??0);
 const progression={globalLevel:completedSessions>=4?2:1,xp:whole(inheritedXp+pendingXp),inheritedXp,earnedXp:pendingXp};
 const confirmation=digest([actor.uid,s,ctx.version.header.manifestDigest,ctx.policy,ctx.occupancy,r,old,definition,options,progression,assets.lots,ctx.groups]);
 return {...assets,definition,proposal,id,old,options,progression,pendingXp,byClass,confirmation};
}

export function createSpaceOutlawsSuccessionService({store,signed,checkSession,now,uuid}){
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),read=reads.includes(action),player=['mySpaceOutlawsSuccession','submitSpaceOutlawsSuccessor'].includes(action);
  const requestId=read?null:documentId(input.requestId);
  return store.runTransaction(async tx=>{
   const at=now(),s=player?await tx.get(`sessions/${sid}`):await checkSession(tx,actor,sid,'content',true);
   requireThat(s?.spaceOutlaws?.successionVersion===1,'SO_GAMEPLAY_NOT_OPEN');
   requireThat(['BRIEFING','EN_JEU','PAUSE'].includes(s.stage)&&!s.campaignSealed,'SO_SUCCESSION_CLOSED');
   const uid=player?actor.uid:input.uid?documentId(input.uid):null;
   const r=uid?await tx.get(regPath(sid,uid)):null;
   if(player)requireThat(currentAccess(r,actor),'FORBIDDEN');
   if(!read&&uid)requireThat(r?.status==='ACCEPTED'&&r.accessActive,'FORBIDDEN');
   const ctx=await context(tx,s),base=`sessions/${sid}`;
   if(action==='spaceOutlawsSuccession'){
    admissionKeys(input,['sessionId']);
    return {session:{id:sid,title:s.title,stage:s.stage},registrations:ctx.confirmed.map(r=>{const c=ctx.characters.find(c=>c.id===r.characterId);return {uid:r.uid,name:c?.public.displayName??nameOf(r),characterId:r.characterId,dead:c?.survival?.dead===true,accessActive:r.accessActive,dossier:dossier(r)};}),reserves:ctx.reserves.map(ch=>({id:ch.entityId,name:ch.data.public.displayName,classId:ch.data.creationPlan.classId,biography:ch.data.biography,groups:ctx.groups.filter(g=>g.members.some(m=>m.characterId===ch.entityId)).map(g=>g.name)}))};
   }
   if(action==='mySpaceOutlawsSuccession'){
    admissionKeys(input,['sessionId']);const c=ctx.characters.find(c=>c.id===r.characterId&&c.assignedUid===uid);requireThat(c,'FORBIDDEN');
    return {session:{id:sid,title:s.title},characterId:c.id,name:c.public.displayName,dead:c.survival?.dead===true,dossier:dossier(r),species:ctx.settings.species.filter(s=>s.available),classes:admissionClasses.filter(c=>ctx.settings.quotas[c.id]>0)};
   }
   // Current authority and participant revocation are checked before a stored result.
   const op=requestId?`operations/${hash(`${actor.uid}:${requestId}`)}`:null,fingerprint=digest([action,input]);
   const previous=op?await tx.get(op):null;if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');if(player)requireThat(previous.accessVersion===r.accessVersion,'FORBIDDEN');return previous.result;}
   requireThat(!s.safetyStop?.active,'SO_SAFETY_STOP');
   if(action==='openSpaceOutlawsSuccession'||action==='submitSpaceOutlawsSuccessor'){
    const opening=action==='openSpaceOutlawsSuccession';
    admissionKeys(input,['sessionId','requestId','predecessorId','revision',...(opening?['uid','reason']:['proposal'])]);
    const old=deceased(ctx,r,documentId(input.predecessorId));
    requireThat((r.succession?.revision??0)===input.revision,'SO_SUCCESSION_STALE');
    if(!opening)requireThat(r.succession?.predecessorId===old.id&&['OPEN','CORRECTION'].includes(r.succession.status),'SO_SUCCESSION_NOT_OPEN');
    const proposal=opening?(r.succession?.predecessorId===old.id?r.succession.proposal??null:null):admissionProposal(input.proposal,ctx.settings,true);
    const message=opening?admissionText(input.reason,500,true):r.succession.message;
    const succession={version:1,predecessorId:old.id,status:opening?(proposal?'CORRECTION':'OPEN'):'SUBMITTED',revision:(r.succession?.revision??0)+1,proposal,message,at,actorUid:actor.uid};
    const eventId=uuid();authorizeSpaceOutlaws(tx,s,'SUCCESSION');tx.set(regPath(sid,uid),{...r,succession});
    tx.set(`${regPath(sid,uid)}/successionHistory/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,before:r.succession??null,after:succession});
    const result={status:succession.status,revision:succession.revision};tx.set(op,{fingerprint,result,at,accessVersion:r.accessVersion});return result;
   }
   admissionKeys(input,['sessionId','uid','predecessorId','source','reserveId','options',...(read?[]:['requestId','confirmation','reason'])]);
   const p=await plan(tx,s,ctx,r,input,actor,at);
   if(read)return {name:p.definition.public.displayName,biography:p.definition.biography,nature:p.definition.nature,predecessor:p.old.public.displayName,profile:p.profile,hp:p.profile.classId==='COM'?4:3,protection:p.profile.classId==='COM'?1:0,actionPoints:p.progression.globalLevel===2?8:5,protectedCredits:200,kit:p.lots.map(l=>({name:l.item.name,quantity:l.quantity})),options:p.options,inheritedXp:p.progression.inheritedXp,pendingXp:p.pendingXp,xp:p.progression.xp,globalLevel:p.progression.globalLevel,nextRefillGameMs:actionPointSummary(s,p.old,await tx.get(actionPointPath(sid,p.old.id)),at).nextRefillGameMs,confirmation:p.confirmation};
   requireThat(p.confirmation===input.confirmation,'SO_SUCCESSION_STALE');const reason=admissionText(input.reason,500,true),eventId=uuid();
   const character=soBornCharacter({definition:p.definition,sid,uid,profile:p.profile,options:p.options,version:ctx.version,at,actor,uuid,progression:p.progression});
   character.birth={...character.birth,predecessorId:p.old.id,order:(p.old.birth?.order??1)+1,source:input.source};
   const succession={version:1,predecessorId:p.old.id,successorId:p.id,status:'COMPLETED',revision:(r.succession?.revision??0)+1,at,actorUid:actor.uid,source:input.source};
   const admission={...r.admission,revision:r.admission.revision+1,proposal:p.proposal,confirmation:{classId:p.proposal.classId,identityKey:admissionIdentity(p.proposal),approvedAt:at,actorUid:actor.uid,sourceRevision:r.admission.revision,exception:false,exceptionReason:null},updatedAt:at};
   const next={...r,previousCharacterId:p.old.id,characterId:p.id,accessVersion:r.accessVersion+1,briefingReadAt:null,briefingReadRevision:null,admission,succession,progression:{...r.progression,completedSessions:whole(r.progression?.completedSessions??0),pendingXp:0}};
   authorizeSpaceOutlaws(tx,s,'SUCCESSION');
   tx.set(`${base}/characters/${p.old.id}`,{...p.old,assignedUid:null,successorId:p.id});tx.set(`${base}/characters/${p.id}`,character);
   retireCharacterMemberships(tx,s,ctx.groups,p.old.id,{id:eventId,at,actorUid:actor.uid,reason});
   writeSoBirthAssets({tx,s,character,lots:p.lots,version:ctx.version,at,actor,reason,eventId});
   // Only information explicitly published for this reserve, never the deceased's receipts.
   for(const ch of ctx.version.changes)if(ch.type==='knowledge'&&ch.operation==='UPSERT'&&ch.data.initialCharacterIds.includes(p.id))tx.set(`${base}/characters/${p.id}/knowledge/${ch.entityId}`,initialReceipt({...ch.data,publicationState:'PUBLISHED'},at));
   tx.set(regPath(sid,uid),next);
   tx.set(`${regPath(sid,uid)}/successionHistory/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason,before:r.succession??null,after:succession,previousAdmission:r.admission,admission,inheritedXp:p.progression.inheritedXp,pendingXp:p.pendingXp});
   tx.set(`${base}/admission/occupancy`,{...ctx.occupancy,revision:ctx.occupancy.revision+1,byClass:p.byClass});
   tx.set(`${base}/admissionIdentities/${admission.confirmation.identityKey}`,{id:admission.confirmation.identityKey,active:true,uid,characterId:p.id});
   tx.set(`${base}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason,predecessorId:p.old.id,characterId:p.id,uid,inheritedXp:p.progression.inheritedXp,pendingXp:p.pendingXp});
   const result={characterId:p.id,predecessorId:p.old.id,accessActive:true};tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
