import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {requireThat} from './validation.mjs';
import {admissionKind,admissionSettings,validAdmissionRecord,emptyAdmissionCounts} from './admission-state.mjs';
import {admissionM2Id,requireAdmissionM2Link,approvedAdmissionM2,admissionM2Fiction} from './admission-m2.mjs';
import {validateCentralChange} from './central-check.mjs';

// Read budgets, not participation quotas. Refuse a partial report.
export const admissionM2CheckLimits={registrations:1000,activeIdentities:1000,characters:100,sourceBytes:16*1024*1024,reportBytes:4*1024*1024};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const uidHash=v=>createHash('sha256').update(v).digest('hex');
const knownBlockers=new Set(['ADMISSION_NOT_APPROVED','ADMISSION_CONSENT_STALE','INVALID_ADMISSION','INVALID_ADMISSION_CHOICE','ADMISSION_ACCOUNTING_CONFLICT','ADMISSION_M2_NAME_TOO_LONG']);
const identity=d=>({displayName:d.public.displayName,nature:d.nature,classId:d.creationPlan?.classId??null,speciesId:d.creationPlan?.speciesId??null,secondaryId:d.creationPlan?.secondaryId??null});
const validConfirmation=a=>a.status!=='APPROVED'||typeof a.confirmation.exception==='boolean'
 &&(a.confirmation.exception?typeof a.confirmation.exceptionReason==='string'&&!!a.confirmation.exceptionReason.trim():a.confirmation.exceptionReason===null)
 &&Number.isSafeInteger(a.confirmation.sourceRevision)&&a.confirmation.sourceRevision>0&&a.confirmation.sourceRevision<a.revision
 &&Number.isSafeInteger(a.confirmation.approvedAt)&&typeof a.confirmation.actorUid==='string'&&!!a.confirmation.actorUid;

// Called inside the authority/cycle transaction. This report is never a token
// for publication or birth; those commands must revalidate their own snapshot.
export async function checkAdmissionM2({tx,ctx,actor,authority,at}){
 const {c,s,draft,settings,policy,occupancy}=ctx,base=`campaigns/${c.id}/masterDrafts/initial`;
 requireThat(settings&&draft,'ADMISSION_NOT_CONFIGURED');
 admissionSettings({open:settings.open,instructions:settings.instructions,quotas:settings.quotas,species:settings.species});
 const [registrations,changes,locks]=await Promise.all([
  tx.list(`sessions/${s.id}/registrations`,null,{limit:admissionM2CheckLimits.registrations+1}),
  tx.list(`${base}/changes`,['workshop','M2'],{limit:admissionM2CheckLimits.characters+2}),
  tx.list(`sessions/${s.id}/admissionIdentities`,['active',true],{limit:admissionM2CheckLimits.activeIdentities+1}),
 ]);
 requireThat(registrations.length<=admissionM2CheckLimits.registrations&&changes.length<=admissionM2CheckLimits.characters+1&&locks.length<=admissionM2CheckLimits.activeIdentities,'ADMISSION_M2_CHECK_LIMIT');
 requireThat(Buffer.byteLength(JSON.stringify([registrations,changes,locks,settings]))<=admissionM2CheckLimits.sourceBytes,'ADMISSION_M2_CHECK_LIMIT');
 const diagnostics=[],rows=[],characters=new Map(),linked=new Set(),approvedUids=new Set(),seenUids=new Set(),counts=emptyAdmissionCounts(),ordinary=emptyAdmissionCounts();let catalogueChecked=false;
 const add=(code,row=null,extra={})=>{const d={code,...(row?{registrationId:row.registrationId,characterId:row.characterId}:{}),...extra};diagnostics.push(d);if(row)row.blockers.push(code);};
 for(const change of changes){
  try{validateCentralChange(change,draft.revision);}catch{add('INVALID_M2_DEFINITION',null,{characterId:typeof change.entityId==='string'?change.entityId:null});continue;}
  if(change.type==='speciesCatalogue'){catalogueChecked=isDeepStrictEqual(change.data,settings.species);continue;}
  if(change.type!=='character'||characters.has(change.entityId)){add('INVALID_M2_DEFINITION');continue;}
  characters.set(change.entityId,change);
 }
 requireThat(characters.size<=admissionM2CheckLimits.characters,'ADMISSION_M2_CHECK_LIMIT');
 if(!catalogueChecked)add('INVALID_M2_DEFINITION');
 let exceptions=0;
 for(const r of registrations.sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
  const a=r.admission,row={registrationId:typeof r.id==='string'?r.id:null,displayName:'Dossier à vérifier',admissionStatus:typeof a?.status==='string'?a.status:null,admissionRevision:Number.isSafeInteger(a?.revision)?a.revision:null,characterId:null,characterRevision:null,status:'BLOCKED',differences:[],warnings:[],blockers:[]};rows.push(row);
  if(!validAdmissionRecord(r)||typeof r.uid!=='string'||!r.uid||r.id!==uidHash(r.uid)||seenUids.has(r.uid)||!validConfirmation(a)){add('INVALID_ADMISSION_RECORD',row);continue;}
  if(!isDeepStrictEqual(await tx.get(`sessions/${s.id}/registrations/${r.id}`),r)){add('INVALID_ADMISSION_RECORD',row);continue;}
  seenUids.add(r.uid);
  const p=a.proposal;if(typeof p?.firstName==='string'&&typeof p?.lastName==='string')row.displayName=`${p.firstName} ${p.lastName}`;
  if(a.status==='APPROVED'){approvedUids.add(r.uid);counts[a.confirmation.classId]++;if(a.confirmation.exception)exceptions++;else ordinary[a.confirmation.classId]++;}
  const id=admissionM2Id(ctx,r),old=characters.get(id);
  if(a.m2Preparation){
   row.characterId=id;linked.add(id);row.characterRevision=old?.data.contentRevision??null;
   const stored=await tx.get(`${base}/changes/character_${id}`);
   try{requireAdmissionM2Link(ctx,r,old);requireThat(isDeepStrictEqual(stored,old)&&a.m2Preparation.draftRevision<=draft.revision,'ADMISSION_M2_LINK_BROKEN');
    const last=a.m2Reconciliation;requireThat(!last||last.characterRevision<=old.data.contentRevision&&last.draftRevision<=draft.revision,'ADMISSION_M2_LINK_BROKEN');
   }catch{add('ADMISSION_M2_LINK_BROKEN',row);continue;}
  }
  if(a.status!=='APPROVED'){
   if(!a.m2Preparation)row.status='NOT_REQUIRED';
   else if(old.operation==='ARCHIVE')row.status='EXCLUDED';
   else add('UNAPPROVED_M2_ACTIVE',row);
   continue;
  }
  let fiction;
  try{fiction=admissionM2Fiction(await approvedAdmissionM2(tx,ctx,r));}
  catch(e){if(!knownBlockers.has(e.code))throw e;add(e.code,row);}
  if(!a.m2Preparation)add('ADMISSION_M2_NOT_PREPARED',row);
  else if(old.operation==='ARCHIVE')add('ADMISSION_M2_ARCHIVED',row);
  else if(fiction){
   const expected={displayName:fiction.displayName,nature:fiction.nature,...fiction.creationPlan},current=identity(old.data);
   row.differences=Object.keys(expected).filter(key=>!isDeepStrictEqual(expected[key],current[key]));
   if(row.differences.length)add('ADMISSION_M2_DIVERGED',row);
   // I3b permits an explicitly authored M2 biography. Do not overwrite or
   // demand equality with the participant's original proposal.
   if(old.data.biography!==fiction.biography)row.warnings.push('BIOGRAPHY_DIFFERENT');
  }
  if(!row.blockers.length)row.status='MATCHED';
 }
 for(const [id,change] of characters)if((change.source==='ADMISSION'||id.startsWith('admission_'))&&!linked.has(id))add('ORPHAN_ADMISSION_M2',null,{characterId:id});
 if(!isDeepStrictEqual(counts,occupancy.byClass)||approvedUids.size!==s.accepted)add('ADMISSION_ACCOUNTING_CONFLICT');
 const lockedUids=new Set();
 for(const lock of locks){if(lock.kind!==admissionKind||!approvedUids.has(lock.uid)||lockedUids.has(lock.uid))add('ADMISSION_IDENTITY_INDEX_CONFLICT');lockedUids.add(lock.uid);}
 if(lockedUids.size!==approvedUids.size||[...approvedUids].some(uid=>!lockedUids.has(uid)))add('ADMISSION_IDENTITY_INDEX_CONFLICT');
 // Explicit I2 exceptions remain valid; ordinary confirmations cannot exceed
 // configured positive quotas or session capacity.
 if(Object.keys(ordinary).some(id=>ordinary[id]>settings.quotas[id])||Object.values(ordinary).reduce((a,b)=>a+b,0)>s.capacity)add('ADMISSION_QUOTA_WITHOUT_EXCEPTION');
 const report={schemaVersion:1,scope:'ADMISSION_M2_PREPARATION',campaignId:c.id,sessionId:s.id,checkedAt:at,
  snapshot:{sessionRevision:s.revision,policyRevision:policy.revision,draftRevision:draft.revision,occupancyRevision:occupancy.revision},
  fingerprint:digest({schema:1,actorUid:actor.uid,authority,c,s,draft,policy,occupancy,settings,registrations,changes:[...changes].sort((a,b)=>String(a.id).localeCompare(String(b.id))),locks:[...locks].sort((a,b)=>JSON.stringify(canonical(a)).localeCompare(JSON.stringify(canonical(b))))}),
  status:diagnostics.length?'CORRECTIONS_REQUIRED':'NO_DETECTED_ERROR',publicationAvailable:false,birthAvailable:false,
  totals:{registrations:registrations.length,approved:approvedUids.size,matched:rows.filter(r=>r.status==='MATCHED').length,blocked:rows.filter(r=>r.status==='BLOCKED').length,excluded:rows.filter(r=>r.status==='EXCLUDED').length,notRequired:rows.filter(r=>r.status==='NOT_REQUIRED').length,exceptions,diagnostics:diagnostics.length},
  byClass:Object.keys(counts).map(classId=>({classId,confirmed:occupancy.byClass[classId],observed:counts[classId],quota:settings.quotas[classId]})),rows,diagnostics};
 requireThat(Buffer.byteLength(JSON.stringify(report))<=admissionM2CheckLimits.reportBytes,'ADMISSION_M2_CHECK_LIMIT');return report;
}
