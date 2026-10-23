import {createHash} from 'node:crypto';
import {requireThat,documentId,whole} from './validation.mjs';
import {isPreparation,spaceOutlawsProfile} from './preparation-state.mjs';
import {admissionKind,admissionKeys,admissionSettings,admissionProposal,admissionText} from './admission-state.mjs';
import {admissionClasses} from '../shared/admission-rules.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const settingsPath=sid=>`sessions/${sid}/admission/settings`;
const regPath=(sid,uid)=>`sessions/${sid}/registrations/${hash(uid)}`;
const draftPath=cid=>`campaigns/${cid}/masterDrafts/initial`;
const speciesPath=cid=>`${draftPath(cid)}/changes/speciesCatalogue_player`;
const reads=['admissionAdmin','admissionInvitation','myAdmission'];
export const admissionCommands=[...reads,'saveAdmissionSettings','issueAdmissionInvitation','revokeAdmissionInvitation','beginAdmission','saveAdmissionProposal'];
export const admissionAction=a=>admissionCommands.includes(a);

export function createAdmissionService({store,signed,checkSession,now,uuid}){
 const context=async(tx,sid)=>{
  const s=await tx.get(`sessions/${sid}`);requireThat(isPreparation(s),'NOT_A_PREPARATION');
  const c=await tx.get(`campaigns/${s.campaignId}`);requireThat(c?.preparationSessionId===sid&&c.ownerUid===s.ownerUid,'FORBIDDEN');
  const [policy,draft,change]=await Promise.all([tx.get(settingsPath(sid)),tx.get(draftPath(c.id)),tx.get(speciesPath(c.id))]);
  // This first slice cannot edit an activated/rebased/general-purpose central draft.
  requireThat(!c.master||(c.master.openDraftId==='initial'&&c.master.activeVersionId===null&&c.master.pointerRevision===0),'ADMISSION_DRAFT_UNAVAILABLE');
  requireThat(!draft||(draft.status==='DRAFT'&&draft.baseVersionId===null&&draft.ruleProfile===spaceOutlawsProfile),'ADMISSION_DRAFT_UNAVAILABLE');
  return {s,c,policy,draft,settings:policy?{...policy,species:change?.data??[]}:null};
 };
 const invitation=async(tx,sid,cid,token)=>{
  requireThat(typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token),'INVALID_INVITATION');
  const id=hash(token),inv=await tx.get(`invitations/${id}`);
  requireThat(inv?.purpose==='ADMISSION'&&inv.sessionId===sid&&inv.campaignId===cid,'INVALID_INVITATION');return {id,inv};
 };
 const active=(inv,at)=>inv?.purpose==='ADMISSION'&&inv.status==='ACTIVE'&&at<inv.expiresAt;
 const view=({s,c,policy,draft,settings},r,editable)=>({session:{id:s.id,campaignId:c.id,title:s.title,summary:s.summary,date:s.date,time:s.time,place:s.place,practical:s.practical,privacy:s.privacy},
  sessionRevision:s.revision,policyRevision:policy?.revision??0,draftRevision:draft?.revision??0,instructions:settings?.instructions??'',
  species:(settings?.species??[]).filter(x=>x.available),classes:admissionClasses.filter(x=>(settings?.quotas[x.id]??0)>0),secondaryChoices:admissionClasses,
  proposal:r?.admission?.proposal??null,status:r?.admission?.status??null,revision:r?.admission?.revision??0,editable});
 return async(action,actor,input)=>{
  signed(actor);const sid=documentId(input.sessionId),isRead=reads.includes(action),eventId=uuid();
  const requestId=isRead?null:documentId(input.requestId),op=requestId?`operations/${hash(`${actor.uid}:${requestId}`)}`:null;
  const fingerprint=isRead?null:hash(JSON.stringify([action,input]));
  return store.runTransaction(async tx=>{
   // Evaluate time and current grants on every Firestore retry, before cached results.
   const at=now(),staff=['admissionAdmin','saveAdmissionSettings','issueAdmissionInvitation','revokeAdmissionInvitation'].includes(action);
   if(staff)await checkSession(tx,actor,sid,'content',true);
   const ctx=await context(tx,sid),{s,c,policy,draft,settings}=ctx;
   if(action==='admissionAdmin'){
    const [registrations,invitations]=await Promise.all([tx.list(`sessions/${sid}/registrations`),tx.list('invitations',['sessionId',sid])]);
    return {sessionId:sid,policyRevision:policy?.revision??0,draftRevision:draft?.revision??0,settings:settings??{open:false,instructions:'',quotas:Object.fromEntries(admissionClasses.map(c=>[c.id,0])),species:[]},
     registrations:registrations.filter(r=>r.admission?.kind===admissionKind),invitations:invitations.filter(i=>i.purpose==='ADMISSION').map(i=>({id:i.id,label:i.label,status:active(i,at)?'ACTIVE':i.status==='REVOKED'?'REVOKED':'EXPIRED',uses:i.uses,maxUses:i.maxUses,expiresAt:i.expiresAt}))};
   }
   const r=staff?null:await tx.get(regPath(sid,actor.uid));
   let link;
   if(['admissionInvitation','beginAdmission'].includes(action)){
    link=await invitation(tx,sid,c.id,input.token);
    requireThat(active(link.inv,at),'INVITATION_EXPIRED_OR_USED');requireThat(settings?.open,'ADMISSION_CLOSED');
    const use=await tx.get(`invitations/${link.id}/uses/${hash(actor.uid)}`);
    requireThat(use||link.inv.uses<link.inv.maxUses,'ADMISSION_LINK_FULL');link.used=!!use;
    if(action==='admissionInvitation')return view(ctx,r,true);
   }
   if(['myAdmission','saveAdmissionProposal'].includes(action)){
    requireThat(r?.admission?.kind===admissionKind&&r.uid===actor.uid,'FORBIDDEN');
    const inv=await tx.get(`invitations/${r.admission.invitationHash}`);
    const editable=settings?.open===true&&active(inv,at)&&inv.sessionId===sid&&inv.campaignId===c.id;
    if(action==='myAdmission')return view(ctx,r,editable);
    requireThat(editable,'ADMISSION_CLOSED');
   }
   const previous=await tx.get(op);if(previous){requireThat(previous.fingerprint===fingerprint,'REQUEST_ID_REUSED');return previous.result;}
   let result;
   if(action==='saveAdmissionSettings'){
    admissionKeys(input,['sessionId','requestId','policyRevision','draftRevision','settings','reason']);
    requireThat(input.policyRevision===(policy?.revision??0)&&input.draftRevision===(draft?.revision??0),'STALE_REVISION');
    const next=admissionSettings(input.settings),reason=admissionText(input.reason,500,true);
    // Keep durable species identities: disable instead of deleting or changing nature.
    for(const old of settings?.species??[]){const same=next.species.find(x=>x.id===old.id);requireThat(same&&same.nature===old.nature,'ADMISSION_SPECIES_IDENTITY');}
    const revision=(draft?.revision??0)+1,pr=(policy?.revision??0)+1;
    const d={...(draft??{id:'initial',baseVersionId:null,basePointerRevision:0,ruleProfile:spaceOutlawsProfile,status:'DRAFT',createdAt:at}),revision,updatedAt:at};
    const change={id:'speciesCatalogue_player',type:'speciesCatalogue',entityId:'player',workshop:'M2',operation:'UPSERT',data:next.species,revision,source:'ADMISSION_SETTINGS',actorUid:actor.uid,at};
    const {species,...p}=next;
    tx.set(settingsPath(sid),{...p,kind:admissionKind,revision:pr,draftId:'initial',updatedAt:at});
    if(!c.master)tx.set(`campaigns/${c.id}`,{...c,revision:c.revision+1,master:{schemaVersion:1,activeVersionId:null,pointerRevision:0,openDraftId:'initial'}});
    tx.set(draftPath(c.id),d);tx.set(speciesPath(c.id),change);tx.set(`${draftPath(c.id)}/history/${revision}`,{id:String(revision),change,reason,admissionPolicy:{...p,revision:pr},privacy:s.privacy,sessionRevision:s.revision});
    tx.set(`sessions/${sid}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,reason,policyRevision:pr,draftRevision:revision});
    result={policyRevision:pr,draftRevision:revision};
   }else if(action==='issueAdmissionInvitation'){
    admissionKeys(input,['sessionId','requestId','tokenHash','hours','maxUses','label']);
    requireThat(settings?.open,'ADMISSION_CLOSED');requireThat(typeof input.tokenHash==='string'&&/^[a-f0-9]{64}$/.test(input.tokenHash),'INVALID_INVITATION');
    requireThat(!await tx.get(`invitations/${input.tokenHash}`),'INVALID_INVITATION');
    const hours=whole(input.hours),maxUses=whole(input.maxUses);requireThat(hours>=1&&hours<=168&&maxUses>=1&&maxUses<=s.capacity,'INVALID_ADMISSION');
    const expiresAt=at+hours*3600000,label=admissionText(input.label,100,true);
    tx.set(`invitations/${input.tokenHash}`,{id:input.tokenHash,purpose:'ADMISSION',sessionId:sid,campaignId:c.id,status:'ACTIVE',expiresAt,maxUses,uses:0,label,createdAt:at,actorUid:actor.uid});
    result={id:input.tokenHash,expiresAt};
   }else if(action==='revokeAdmissionInvitation'){
    admissionKeys(input,['sessionId','requestId','invitationId','reason']);const id=documentId(input.invitationId),inv=await tx.get(`invitations/${id}`);
    requireThat(inv?.purpose==='ADMISSION'&&inv.sessionId===sid&&inv.campaignId===c.id,'INVALID_INVITATION');
    const reason=admissionText(input.reason,500,true);tx.set(`invitations/${id}`,{...inv,status:'REVOKED',revokedAt:at,revokedBy:actor.uid,reason});result={revoked:true};
   }else if(action==='beginAdmission'){
    admissionKeys(input,['sessionId','requestId','token','consent','policyRevision','draftRevision','sessionRevision']);requireThat(input.consent===true,'ADMISSION_CONSENT_REQUIRED');
    requireThat(input.policyRevision===policy.revision&&input.draftRevision===draft.revision&&input.sessionRevision===s.revision,'STALE_REVISION');
    requireThat(!r||r.admission?.kind===admissionKind,'FORBIDDEN');
    if(!link.used){tx.set(`invitations/${link.id}`,{...link.inv,uses:link.inv.uses+1});tx.set(`invitations/${link.id}/uses/${hash(actor.uid)}`,{uid:actor.uid,at});}
    const admission={...(r?.admission??{kind:admissionKind,status:'DRAFT',revision:1,proposal:null,createdAt:at}),invitationHash:link.id,consentedAt:at,policyRevision:policy.revision,sessionRevision:s.revision};
    tx.set(regPath(sid,actor.uid),r?{...r,admission}:{id:hash(actor.uid),uid:actor.uid,email:actor.email,status:'RECEIVED',characterId:null,accessActive:false,admission});
    result={sessionId:sid};
   }else if(action==='saveAdmissionProposal'){
    admissionKeys(input,['sessionId','requestId','revision','policyRevision','draftRevision','proposal','submit','consent','sessionRevision']);
    requireThat(typeof input.submit==='boolean'&&input.consent===true,'ADMISSION_CONSENT_REQUIRED');
    requireThat(input.revision===r.admission.revision&&input.policyRevision===policy.revision&&input.draftRevision===draft.revision&&input.sessionRevision===s.revision,'STALE_REVISION');
    requireThat(['DRAFT','SUBMITTED'].includes(r.admission.status),'ADMISSION_LOCKED');
    const proposal=admissionProposal(input.proposal,settings,input.submit),revision=r.admission.revision+1;
    const admission={...r.admission,proposal,revision,status:input.submit?'SUBMITTED':'DRAFT',policyRevision:policy.revision,draftRevision:draft.revision,updatedAt:at,consentedAt:at,sessionRevision:s.revision};
    tx.set(regPath(sid,actor.uid),{...r,admission});
    tx.set(`${regPath(sid,actor.uid)}/history/${revision}`,{id:String(revision),kind:admissionKind,admission,at,actorUid:actor.uid});
    result={sessionId:sid,revision,status:admission.status};
   }else requireThat(false,'UNKNOWN_ACTION');
   if(action!=='saveAdmissionSettings')tx.set(`sessions/${sid}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,...(action==='revokeAdmissionInvitation'?{invitationId:input.invitationId,reason:input.reason}:action==='issueAdmissionInvitation'?{invitationId:result.id}:action==='beginAdmission'?{invitationId:link.id}:action==='saveAdmissionProposal'?{proposalRevision:result.revision,status:result.status}:{})});
   tx.set(op,{fingerprint,result,at});return result;
  });
 };
}
