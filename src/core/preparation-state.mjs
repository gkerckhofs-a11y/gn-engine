import {isDeepStrictEqual} from 'node:util';
import {requireThat,whole} from './validation.mjs';
import {createClock} from './clock.mjs';
import {admissionKind,validAdmissionRecord,validAdmissionOccupancy} from './admission-state.mjs';

// This selects the canonical rules target; it does not claim a published Master.
export const spaceOutlawsProfile='SPACE_OUTLAWS_V07';
export const isPreparation=s=>s?.preparationKind===spaceOutlawsProfile;
const fields={title:150,summary:4000,date:40,time:80,place:500,practical:4000,privacy:4000};
export function preparationInput(input,{creating=false}={}){
 const allowed=[...Object.keys(fields),'capacity','requestId',...(creating?['creationId','campaignTitle']:['sessionId','revision','reason'])];
 requireThat(input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).every(k=>allowed.includes(k)),'INVALID_PREPARATION');
 const result={};
 for(const [key,max] of Object.entries(fields)){
  const value=input[key]??'';requireThat(typeof value==='string'&&value.length<=max,'INVALID_PREPARATION');
  result[key]=value.trim();if(['title','privacy'].includes(key))requireThat(result[key],'INVALID_PREPARATION');
 }
 result.capacity=whole(input.capacity,'INVALID_CAPACITY');requireThat(result.capacity>0,'INVALID_CAPACITY');
 return result;
}
export function preparationSession(metadata,{id,campaignId,ownerUid,at}){
 return {...metadata,id,campaignId,ownerUid,preparationKind:spaceOutlawsProfile,preparationVersion:1,
  scenarioId:null,versionId:null,campaignEpisode:null,campaignSealed:false,accepted:0,registrationOpen:false,
  stage:'PREPARATION',fields:[],clock:createClock(),modules:{groups:false},revision:1,createdAt:at,
  economyRules:null,healthRules:null,actionPointRules:null,transportRules:null};
}

// Defence in depth for every existing service, in the same transaction as its writes.
// C1a permits only practical metadata, staff revisions and audit; future slices must
// deliberately extend this boundary. No legacy import or session command can seed it.
export function guardPreparationWrites(session,pending){
 if(!isPreparation(session))return;
 const base=`sessions/${session.id}`,mutable=[...Object.keys(fields),'capacity','accepted','revision','updatedAt'];
 const counts=pending.get(`${base}/admission/occupancy`),root=pending.get(base);
 if(counts)requireThat(validAdmissionOccupancy(counts)&&root&&Object.values(counts.byClass).reduce((a,b)=>a+b,0)===root.accepted,'ADMISSION_ACCOUNTING_CONFLICT');
 for(const [path,next] of pending){
  if(path===base){
   const fixed=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!mutable.includes(key)));
   requireThat(isDeepStrictEqual(fixed(session),fixed(next)),'PREPARATION_ONLY');
   requireThat(next.revision===session.revision+1,'STALE_REVISION');
   requireThat(next.accepted===session.accepted||!!counts,'PREPARATION_ONLY');
   requireThat(next.capacity>=session.capacity||next.capacity>=session.accepted,'ADMISSION_QUOTA_BELOW_CONFIRMED');
   preparationInput(Object.fromEntries([...Object.keys(fields),'capacity'].map(key=>[key,next[key]])));
  }else if(path.startsWith(`${base}/`)){
   const suffix=path.slice(base.length+1);
   const admission=(suffix==='admission/settings'||suffix==='admission/occupancy')&&next?.kind===admissionKind;
   const identity=/^admissionIdentities\/[a-f0-9]{64}$/.test(suffix)&&next?.kind===admissionKind&&typeof next.uid==='string'&&typeof next.active==='boolean'&&!!counts;
   const registration=/^registrations\/[a-f0-9]{64}$/.test(suffix)&&validAdmissionRecord(next);
   const history=/^registrations\/[a-f0-9]{64}\/history\/[0-9]+$/.test(suffix)&&next?.kind===admissionKind;
   requireThat(/^audit\/[A-Za-z0-9_-]+$/.test(suffix)||admission||identity||registration||history,'PREPARATION_ONLY');
  }
 }
}
