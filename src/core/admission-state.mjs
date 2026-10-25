import {requireThat,whole,documentId} from './validation.mjs';
import {admissionClasses} from '../shared/admission-rules.mjs';
import {createHash} from 'node:crypto';
export const admissionKind='SO_ADMISSION_V1';
export const admissionText=(v,max,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),'INVALID_ADMISSION');return v.trim();};
export function admissionKeys(v,keys){requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k)),'INVALID_ADMISSION');}
export function admissionSettings(input){
 admissionKeys(input,['open','instructions','quotas','species']);
 requireThat(typeof input.open==='boolean','INVALID_ADMISSION');
 admissionKeys(input.quotas,admissionClasses.map(c=>c.id));
 const quotas=Object.fromEntries(admissionClasses.map(c=>[c.id,whole(input.quotas[c.id],'INVALID_ADMISSION')]));
 requireThat(Object.values(quotas).every(n=>n<=10000),'INVALID_ADMISSION');
 requireThat(Array.isArray(input.species)&&input.species.length<=50,'INVALID_ADMISSION');
 const ids=new Set();const species=input.species.map(s=>{
  admissionKeys(s,['id','label','description','nature','available']);documentId(s.id);
  requireThat(!ids.has(s.id)&&['HUMANOID','DROID'].includes(s.nature)&&typeof s.available==='boolean','INVALID_ADMISSION');ids.add(s.id);
  return {id:s.id,label:admissionText(s.label,100,true),description:admissionText(s.description??'',1000),nature:s.nature,available:s.available};
 });
 const instructions=admissionText(input.instructions,4000,input.open);
 if(input.open)requireThat(species.some(s=>s.available)&&Object.values(quotas).some(n=>n>0),'ADMISSION_NOT_CONFIGURED');
 return {open:input.open,instructions,quotas,species};
}
export function admissionProposal(value,settings,submit){
 admissionKeys(value,['firstName','lastName','speciesId','classId','secondaryId','background','friends']);
 const out={};for(const [key,max] of Object.entries({firstName:80,lastName:80,speciesId:128,classId:16,secondaryId:16,background:4000,friends:1000}))out[key]=admissionText(value[key]??'',max,submit&&key!=='friends');
 const species=settings.species.find(s=>s.id===out.speciesId&&s.available);
 if(out.speciesId)requireThat(species,'INVALID_ADMISSION_CHOICE');
 if(out.classId)requireThat(admissionClasses.some(c=>c.id===out.classId)&&settings.quotas[out.classId]>0,'INVALID_ADMISSION_CHOICE');
 if(out.secondaryId)requireThat(admissionClasses.some(c=>c.secondaryId===out.secondaryId&&c.id!==out.classId),'INVALID_ADMISSION_CHOICE');
 return {...out,nature:species?.nature??null,secondaryLevel:out.secondaryId?1:null};
}

export function validM2Preparation(p){
 return p&&Object.keys(p).every(k=>['schemaVersion','characterId','characterRevision','sourceRevision','admissionRevision','draftRevision','preparedAt','actorUid','requestId'].includes(k))&&p.schemaVersion===1&&/^admission_[a-f0-9]{64}$/.test(p.characterId)&&p.characterRevision===1&&Number.isSafeInteger(p.sourceRevision)&&p.sourceRevision>0&&p.admissionRevision===p.sourceRevision+1&&Number.isSafeInteger(p.draftRevision)&&p.draftRevision>0&&Number.isSafeInteger(p.preparedAt)&&typeof p.actorUid==='string'&&p.actorUid&&typeof p.requestId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(p.requestId);
}

// Only an inert candidature shape can cross the preparation-session boundary.
export function validAdmissionRecord(r){
 const keys=['id','uid','email','status','characterId','accessActive','admission'];
 if(!r||Object.keys(r).some(k=>!keys.includes(k))||r.status!=='RECEIVED'||r.characterId!==null||r.accessActive!==false)return false;
 const a=r.admission;
 return a?.kind===admissionKind&&(a.m2Preparation===undefined||validM2Preparation(a.m2Preparation)&&a.m2Preparation.admissionRevision<=a.revision)&&['DRAFT','SUBMITTED','APPROVED','WAITLISTED','CORRECTION','REFUSED','WITHDRAWN'].includes(a.status)&&Number.isSafeInteger(a.revision)&&a.revision>0
  &&(a.status==='APPROVED'?!!a.confirmation&&admissionClasses.some(c=>c.id===a.confirmation.classId)&&/^[a-f0-9]{64}$/.test(a.confirmation.identityKey):!a.confirmation);
}

export const emptyAdmissionCounts=()=>Object.fromEntries(admissionClasses.map(c=>[c.id,0]));
export function validAdmissionOccupancy(o){
 return o?.kind===admissionKind&&Number.isSafeInteger(o.revision)&&o.revision>0&&o.byClass&&Object.keys(o.byClass).length===8&&admissionClasses.every(c=>Number.isSafeInteger(o.byClass[c.id])&&o.byClass[c.id]>=0);
}
export function admissionOccupancy(o,accepted){
 const counts=o?.byClass??emptyAdmissionCounts();
 requireThat((!o||validAdmissionOccupancy(o))&&Object.values(counts).reduce((a,b)=>a+b,0)===accepted,'ADMISSION_ACCOUNTING_CONFLICT');
 return {kind:admissionKind,revision:o?.revision??0,byClass:{...counts}};
}
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
// Fictional display names remain unchanged. This key is scoped to one session.
export function admissionIdentity(p){
 const normalize=v=>v.normalize('NFKD').replace(/\s+/gu,' ').replace(/[\p{M}\p{Cf}\p{Cc}]/gu,'').toLowerCase().replace(/[’‘ʼ]/g,"'").replace(/[‐‑–—]/g,'-').replace(/\s+/gu,' ').trim();
 const pair=[normalize(p.firstName),normalize(p.lastName)];requireThat(pair.every(Boolean),'INVALID_ADMISSION');return digest(pair);
}
export const admissionConsent=(s,settings)=>digest([...['title','summary','date','time','place','practical','privacy'].map(k=>s[k]??''),settings?.instructions??'']);
