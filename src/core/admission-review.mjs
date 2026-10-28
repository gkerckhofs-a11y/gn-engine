import {requireThat} from './validation.mjs';
import {admissionKind,admissionKeys,admissionText,admissionProposal,admissionIdentity,admissionConsent} from './admission-state.mjs';

export const reviewActions=['reviewAdmission','withdrawAdmission','acknowledgeAdmissionDecision'];
const decisions=['APPROVE','OVERRIDE_APPROVE','WAITLIST','CORRECT','REFUSE','WITHDRAW','CHANGE_CLASS','OVERRIDE_CHANGE_CLASS'];
export async function reviewAdmission({tx,action,input,actor,at,ctx,r,path}){
 const {s,settings,policy,draft,occupancy}=ctx,a=r?.admission;
 requireThat(a?.kind===admissionKind,'FORBIDDEN');
 if(action==='acknowledgeAdmissionDecision'){
  admissionKeys(input,['sessionId','requestId','noticeRevision']);
  requireThat(a.decision&&Number.isSafeInteger(input.noticeRevision)&&input.noticeRevision===a.decision.revision,'STALE_REVISION');
  tx.set(path,{...r,admission:{...a,decisionReadRevision:input.noticeRevision}});
  return {revision:a.revision,status:a.status,noticeRevision:input.noticeRevision};
 }
 const staff=action==='reviewAdmission';
 admissionKeys(input,staff?['sessionId','requestId','uid','revision','policyRevision','draftRevision','decision','reason','classId','secondaryId']:['sessionId','requestId','revision','reason']);
 const decision=staff?input.decision:'WITHDRAW',reason=admissionText(input.reason,1000,true);
 requireThat(decisions.includes(decision),'INVALID_ADMISSION');
 requireThat(input.revision===a.revision,'STALE_REVISION');
 if(staff)requireThat(input.policyRevision===policy?.revision&&input.draftRevision===draft?.revision,'STALE_REVISION');
 const changeClass=decision.endsWith('CHANGE_CLASS'),approve=decision.endsWith('APPROVE')||changeClass,override=decision.startsWith('OVERRIDE_');
 if(!changeClass)requireThat(input.classId===undefined&&input.secondaryId===undefined,'INVALID_ADMISSION');
 if(changeClass)requireThat(a.status==='APPROVED','ADMISSION_LOCKED');
 else if(approve)requireThat(['SUBMITTED','WAITLISTED'].includes(a.status),'ADMISSION_LOCKED');
 else if(decision==='WITHDRAW'&&a.status==='WITHDRAWN')return {revision:a.revision,status:a.status};
 else requireThat(a.status!=='WITHDRAWN'&&(!['CORRECT','WAITLIST'].includes(decision)||a.proposal),'ADMISSION_LOCKED');
 let proposal=a.proposal,identityKey=null;
 if(approve){
  requireThat(a.consentHash===admissionConsent(s,settings),'ADMISSION_CONSENT_STALE');
  const {nature,secondaryLevel,...submitted}=proposal??{};
  proposal=admissionProposal(changeClass?{...submitted,classId:input.classId,secondaryId:input.secondaryId}:submitted,settings,true);
  requireThat(nature===proposal.nature&&secondaryLevel===proposal.secondaryLevel,'INVALID_ADMISSION_CHOICE');
  identityKey=admissionIdentity(proposal);
 }
 const old=a.confirmation,counts={...occupancy.byClass};let accepted=s.accepted;
 const identityPath=key=>`sessions/${s.id}/admissionIdentities/${key}`;
 const oldLock=old?await tx.get(identityPath(old.identityKey)):null;
 if(old){
  requireThat(a.status==='APPROVED'&&oldLock?.active===true&&oldLock.uid===r.uid&&counts[old.classId]>0&&accepted>0,'ADMISSION_ACCOUNTING_CONFLICT');
  counts[old.classId]--;accepted--;
 }
 let status={WAITLIST:'WAITLISTED',CORRECT:'CORRECTION',REFUSE:'REFUSED',WITHDRAW:'WITHDRAWN'}[decision],confirmation=null,waitReason=null;
 if(approve){
  const lock=identityKey===old?.identityKey?oldLock:await tx.get(identityPath(identityKey));
  requireThat(!lock?.active||lock.uid===r.uid,'ADMISSION_IDENTITY_TAKEN');
  requireThat(!lock?.active||old?.identityKey===identityKey,'ADMISSION_ACCOUNTING_CONFLICT');
  if(counts[proposal.classId]>=settings.quotas[proposal.classId])waitReason='CLASS_FULL';
  else if(accepted>=s.capacity)waitReason='SESSION_FULL';
  if(waitReason&&changeClass&&!override)requireThat(false,'ADMISSION_QUOTA_FULL');
  if(waitReason&&!override)status='WAITLISTED';
  else{
   status='APPROVED';counts[proposal.classId]++;accepted++;
   confirmation={classId:proposal.classId,identityKey,approvedAt:at,actorUid:actor.uid,sourceRevision:a.revision,exception:override,exceptionReason:override?reason:null};
  }
 }
 const revision=a.revision+1,next={...a,proposal,revision,status,confirmation,updatedAt:at,
  decision:{revision,decision,status,reason,waitReason:status==='WAITLISTED'?waitReason:null,at},decisionReadRevision:a.decisionReadRevision??0};
 if(old||confirmation){
  tx.set(`sessions/${s.id}`,{...s,accepted,revision:s.revision+1,updatedAt:at});
  tx.set(`sessions/${s.id}/admission/occupancy`,{...occupancy,revision:occupancy.revision+1,byClass:counts});
  if(old)tx.set(identityPath(old.identityKey),{kind:admissionKind,uid:r.uid,active:false,at});
  if(confirmation)tx.set(identityPath(identityKey),{kind:admissionKind,uid:r.uid,active:true,at});
 }
 tx.set(path,{...r,admission:next});
 tx.set(`${path}/history/${revision}`,{id:String(revision),kind:admissionKind,admission:next,at,actorUid:actor.uid,reason,decision});
 return {revision,status,waitReason:next.decision.waitReason,exception:confirmation?.exception??false};
}

// Never return operator IDs, invitation hashes or other candidates in player history.
export const admissionHistoryView=rows=>rows.sort((a,b)=>Number(a.id)-Number(b.id)).map(h=>({revision:h.admission.revision,status:h.admission.status,proposal:h.admission.proposal,decision:h.admission.decision??null,at:h.at}));
