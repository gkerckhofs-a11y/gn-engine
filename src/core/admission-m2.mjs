import {createHash} from 'node:crypto';
import {requireThat} from './validation.mjs';
import {admissionKind,validM2Preparation,admissionKeys,admissionText,admissionProposal,admissionIdentity,admissionConsent} from './admission-state.mjs';
import {centralCharacterInput} from './central-characters.mjs';
import {centralLimits} from './central-master.mjs';

export const admissionM2Actions=['previewAdmissionM2','prepareAdmissionM2'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// Only this private registration carries the participant-to-definition link.
export const admissionM2State=r=>r.admission?.m2Preparation?{characterId:r.admission.m2Preparation.characterId,sourceRevision:r.admission.m2Preparation.sourceRevision,preparedAt:r.admission.m2Preparation.preparedAt,changedSincePreparation:r.admission.revision!==(r.admission.m2Reconciliation??r.admission.m2Preparation).admissionRevision,approved:r.admission.status==='APPROVED',reconciledAt:r.admission.m2Reconciliation?.at??null}:null;
export const admissionM2Id=(ctx,r)=>`admission_${hash([ctx.c.id,ctx.s.id,r.id])}`;
export function requireAdmissionM2Link(ctx,r,old){
 const a=r.admission,p=a.m2Preparation,id=admissionM2Id(ctx,r);
 requireThat(validM2Preparation(p)&&p.admissionRevision<=a.revision&&p.characterId===id&&old?.type==='character'&&old.entityId===id&&old.workshop==='M2'&&['UPSERT','ARCHIVE'].includes(old.operation)&&Number.isSafeInteger(old.data?.contentRevision)&&old.data.contentRevision>0,'ADMISSION_M2_LINK_BROKEN');
}
export async function approvedAdmissionM2(tx,ctx,r){
 const {s,settings,occupancy}=ctx,a=r.admission;
 requireThat(a.status==='APPROVED'&&a.confirmation,'ADMISSION_NOT_APPROVED');
 requireThat(a.consentHash===admissionConsent(s,settings),'ADMISSION_CONSENT_STALE');
 const {nature,secondaryLevel,...submitted}=a.proposal??{},proposal=admissionProposal(submitted,settings,true);
 requireThat(nature===proposal.nature&&secondaryLevel===proposal.secondaryLevel,'INVALID_ADMISSION_CHOICE');
 const identity=admissionIdentity(proposal),lock=await tx.get(`sessions/${s.id}/admissionIdentities/${identity}`);
 requireThat(a.confirmation.identityKey===identity&&a.confirmation.classId===proposal.classId&&lock?.active===true&&lock.uid===r.uid&&occupancy.byClass[proposal.classId]>0&&s.accepted>0,'ADMISSION_ACCOUNTING_CONFLICT');
 return proposal;
}
export function admissionM2Fiction(proposal){
 const displayName=`${proposal.firstName} ${proposal.lastName}`;requireThat(displayName.length<=150,'ADMISSION_M2_NAME_TOO_LONG');
 return {displayName,nature:proposal.nature,biography:proposal.background,creationPlan:{classId:proposal.classId,speciesId:proposal.speciesId,secondaryId:proposal.secondaryId}};
}
const resultOf=p=>({characterId:p.characterId,characterRevision:p.characterRevision,draftRevision:p.draftRevision,admissionRevision:p.admissionRevision});
export async function admissionM2({tx,action,input,actor,at,ctx,r,path,authority,op,fingerprint,eventId}){
 const preview=action==='previewAdmissionM2',{c,s,draft,policy}=ctx,a=r?.admission;
 admissionKeys(input,['sessionId','uid',...(preview?[]:['requestId','confirmation','reason'])]);requireThat(a?.kind===admissionKind,'FORBIDDEN');
 if(!preview){const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}}
 const base=`campaigns/${c.id}/masterDrafts/initial`,id=admissionM2Id(ctx,r),changePath=`${base}/changes/character_${id}`,old=await tx.get(changePath);
 if(a.m2Preparation){
  const p=a.m2Preparation;requireAdmissionM2Link(ctx,r,old);
  if(preview)return {campaignId:c.id,sessionId:s.id,alreadyPrepared:resultOf(p),state:admissionM2State(r),archived:old.operation==='ARCHIVE',currentCharacterRevision:old.data.contentRevision,confirmation:null};
  // A new command ID also returns the original result; never overwrite later M2 edits.
  const result=resultOf(p);tx.set(op,{fingerprint,result,at});return result;
 }
 requireThat(a.status==='APPROVED'&&a.confirmation,'ADMISSION_NOT_APPROVED');
 requireThat(!old,'ADMISSION_M2_COLLISION');
 const proposal=await approvedAdmissionM2(tx,ctx,r);
 requireThat((await tx.list(`${base}/changes`,['type','character'],{limit:centralLimits.characters})).length<centralLimits.characters,'CENTRAL_LIMIT');
 const data=centralCharacterInput({...admissionM2Fiction(proposal),profession:'',description:'',roleplay:'',playerSecrets:'',gmNotes:'',objectives:[],relations:[]},id);
 const confirmation=hash([actor.uid,c.revision,s.revision,draft.revision,policy.revision,authority.grant?.revision??0,authority.rights,a,data]);
 if(preview)return {campaignId:c.id,sessionId:s.id,characterId:id,sourceRevision:a.revision,draftRevision:draft.revision,character:data,confirmation};
 requireThat(typeof input.confirmation==='string'&&input.confirmation===confirmation,'ADMISSION_M2_STALE');const reason=admissionText(input.reason,500,true),revision=draft.revision+1;
 const preparation={schemaVersion:1,characterId:id,characterRevision:1,sourceRevision:a.revision,admissionRevision:a.revision+1,draftRevision:revision,preparedAt:at,actorUid:actor.uid,requestId:input.requestId};
 const admission={...a,revision:preparation.admissionRevision,updatedAt:at,m2Preparation:preparation};
 const change={id:`character_${id}`,type:'character',entityId:id,workshop:'M2',operation:'UPSERT',data,revision,source:'ADMISSION',provenance:{schemaVersion:1,kind:'APPROVED_SNAPSHOT'},actorUid:actor.uid,requestId:input.requestId,at};
 tx.set(base,{...draft,revision,updatedAt:at});tx.set(changePath,change);
 tx.set(`${base}/history/${revision}`,{id:String(revision),revision,workshop:'M2',action,actorUid:actor.uid,at,reason,before:null,change});
 tx.set(path,{...r,admission});tx.set(`${path}/history/${admission.revision}`,{id:String(admission.revision),kind:admissionKind,admission,at,actorUid:actor.uid,reason,decision:'PREPARE_M2'});
 const result=resultOf(preparation);
 tx.set(`sessions/${s.id}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,targetUid:r.uid,requestId:input.requestId,reason,...result});
 tx.set(op,{fingerprint,result,at});return result;
}
