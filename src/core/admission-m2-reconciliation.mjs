import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {requireThat} from './validation.mjs';
import {admissionKind,admissionKeys,admissionText,validM2Reconciliation} from './admission-state.mjs';
import {admissionM2Id,requireAdmissionM2Link,approvedAdmissionM2,admissionM2Fiction} from './admission-m2.mjs';
import {centralCharacterInput,centralCharacterEditable} from './central-characters.mjs';
import {validateCentralChange} from './central-check.mjs';

export const admissionM2ReconciliationActions=['previewAdmissionM2Reconciliation','reconcileAdmissionM2'];
const modes=['KEEP','PROPOSAL'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const summary=d=>({displayName:d.public.displayName,nature:d.nature,classId:d.creationPlan?.classId??null,speciesId:d.creationPlan?.speciesId??null,secondaryId:d.creationPlan?.secondaryId??null,biography:d.biography});
const resultOf=p=>({characterId:p.characterId,characterRevision:p.characterRevision,draftRevision:p.draftRevision,admissionRevision:p.admissionRevision,characterChanged:p.characterChanged});
const blockers=['ADMISSION_M2_ARCHIVED','ADMISSION_NOT_APPROVED','ADMISSION_CONSENT_STALE','INVALID_ADMISSION','INVALID_ADMISSION_CHOICE','ADMISSION_ACCOUNTING_CONFLICT','ADMISSION_M2_NAME_TOO_LONG'];
export async function admissionM2Reconciliation({tx,action,input,actor,at,ctx,r,path,authority,op,fingerprint,eventId}){
 const preview=action==='previewAdmissionM2Reconciliation',{c,s,draft,policy}=ctx,a=r?.admission;
 admissionKeys(input,['sessionId','uid',...(preview?[]:['requestId','confirmation','reason','biographyMode'])]);requireThat(a?.kind===admissionKind,'FORBIDDEN');
 if(!preview){requireThat(modes.includes(input.biographyMode),'INVALID_ADMISSION');const receipt=await tx.get(op);if(receipt){requireThat(receipt.fingerprint===fingerprint,'REQUEST_ID_REUSED');return receipt.result;}}
 requireThat(a.m2Preparation,'ADMISSION_M2_NOT_PREPARED');
 const base=`campaigns/${c.id}/masterDrafts/initial`,id=admissionM2Id(ctx,r),changePath=`${base}/changes/character_${id}`,old=await tx.get(changePath);
 requireAdmissionM2Link(ctx,r,old);
 try{validateCentralChange(old,draft.revision);}catch{requireThat(false,'ADMISSION_M2_LINK_BROKEN');}
 const last=a.m2Reconciliation;
 requireThat(last===undefined||validM2Reconciliation(last,a.m2Preparation)&&last.admissionRevision<=a.revision&&last.characterRevision<=old.data.contentRevision&&last.draftRevision<=draft.revision,'ADMISSION_M2_LINK_BROKEN');
 if(!preview&&last?.confirmation===input.confirmation&&last.actorUid===actor.uid&&last.biographyMode===input.biographyMode){const result=resultOf(last);tx.set(op,{fingerprint,result,at});return result;}
 const context={campaignId:c.id,sessionId:s.id,characterId:id,admissionRevision:a.revision,characterRevision:old.data.contentRevision,draftRevision:draft.revision,current:summary(old.data),publicationAvailable:false,speciesLabels:Object.fromEntries((ctx.settings?.species??[]).map(s=>[s.id,s.label])),
  lastReview:last?{at:last.at,revisionsUnchanged:last.admissionRevision===a.revision&&last.characterRevision===old.data.contentRevision}:null};
 let fiction;
 try{requireThat(old.operation==='UPSERT','ADMISSION_M2_ARCHIVED');fiction=admissionM2Fiction(await approvedAdmissionM2(tx,ctx,r));}
 catch(e){if(!preview||!blockers.includes(e.code))throw e;return {...context,status:'BLOCKED',blockers:[e.code],proposed:null,differences:[],confirmations:null};}
 const editable=centralCharacterEditable(old.data),variants={},confirmations={};
 for(const mode of modes){
  const data=centralCharacterInput({...editable,...fiction,biography:mode==='KEEP'?old.data.biography:fiction.biography},id,old.data);
  const changed=!isDeepStrictEqual({...data,contentRevision:old.data.contentRevision},old.data);
  variants[mode]={data:changed?data:old.data,changed};
  confirmations[mode]=hash([actor.uid,c.revision,s.revision,draft.revision,policy.revision,authority.grant?.revision??0,authority.rights,a,old,mode,data]);
 }
 const proposed=summary(variants.PROPOSAL.data),differences=Object.keys(proposed).filter(key=>!isDeepStrictEqual(context.current[key],proposed[key]));
 if(preview)return {...context,status:differences.length?'DIFFERENCES':'MATCHED',blockers:[],proposed,differences,confirmations};
 requireThat(input.confirmation===confirmations[input.biographyMode],'ADMISSION_M2_STALE');const reason=admissionText(input.reason,500,true),{data,changed}=variants[input.biographyMode],revision=draft.revision+(changed?1:0);
 const reconciliation={schemaVersion:1,characterId:id,sourceRevision:a.revision,admissionRevision:a.revision+1,characterRevision:data.contentRevision,draftRevision:revision,at,actorUid:actor.uid,requestId:input.requestId,confirmation:input.confirmation,biographyMode:input.biographyMode,characterChanged:changed};
 const admission={...a,revision:reconciliation.admissionRevision,updatedAt:at,m2Reconciliation:reconciliation};
 if(changed){
  const change={id:`character_${id}`,type:'character',entityId:id,workshop:'M2',operation:'UPSERT',data,revision,source:'ADMISSION',provenance:{schemaVersion:1,kind:'RECONCILED_SNAPSHOT'},actorUid:actor.uid,requestId:input.requestId,at};
  tx.set(base,{...draft,revision,updatedAt:at});tx.set(changePath,change);
  tx.set(`${base}/history/${revision}`,{id:String(revision),revision,workshop:'M2',action,actorUid:actor.uid,at,reason,before:old,change});
 }
 tx.set(path,{...r,admission});tx.set(`${path}/history/${admission.revision}`,{id:String(admission.revision),kind:admissionKind,admission,at,actorUid:actor.uid,reason,decision:'RECONCILE_M2'});
 const result=resultOf(reconciliation);
 tx.set(`sessions/${s.id}/audit/${eventId}`,{id:eventId,action,at,actorUid:actor.uid,targetUid:r.uid,requestId:input.requestId,reason,biographyMode:input.biographyMode,...result});
 tx.set(op,{fingerprint,result,at});return result;
}
