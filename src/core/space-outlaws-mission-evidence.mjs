import {escortOptions} from './space-escort.mjs';
import {transportOptions} from './space-transport.mjs';
import {documentId,requireThat} from './validation.mjs';

export const hasMissionExecution=s=>s.spaceOutlaws?.missionExecutionVersion===1;

// Private organizer projection. Codes, outcomes, knowledge and passenger lists
// never become part of the contract's evidence catalogue.
export async function missionExecutionOptions(tx,s,a){
 if(!hasMissionExecution(s))return {};
 const base=`sessions/${s.id}`,offers=[];
 for(const shop of await tx.list(`${base}/shops`))for(const o of await tx.list(`${base}/shops/${shop.id}/offers`))if(o.versionId===s.spaceOutlaws.versionId)offers.push({id:o.id,name:o.name,shopId:shop.id,shopName:shop.name,itemId:o.item.id});
 return {...await escortOptions(tx,s),...await transportOptions(tx,s),missionExecution:{steps:a.missionSteps,rewards:a.rewardItems??[],
  targets:(await tx.list(`${base}/fieldTargets`)).filter(t=>t.publicationState==='PUBLISHED'&&t.kind==='ANALYSIS').map(t=>({id:t.id,name:t.title})),
  routes:(await tx.list(`${base}/routes`)).filter(r=>r.versionId===s.spaceOutlaws.versionId).map(r=>({id:r.id,name:r.name})),
  offers}};
}
export async function missionStepBindings(tx,s,a,input){
 const bindings=input.stepEvidence??[];
 requireThat(Array.isArray(bindings)&&bindings.length<=(a.missionSteps??[]).length,'SO_MISSION_EVIDENCE_INVALID');
 requireThat(!bindings.length||hasMissionExecution(s),'SO_GAMEPLAY_NOT_OPEN');
 const byStep=new Map();
 for(const b of bindings){
  requireThat(b&&a.missionSteps.some(st=>st.id===b.stepId)&&!byStep.has(b.stepId)&&['FIELD','VOYAGE'].includes(b.kind),'SO_MISSION_EVIDENCE_INVALID');
  const id=documentId(b.kind==='FIELD'?b.targetId:b.routeId),record=await tx.get(`sessions/${s.id}/${b.kind==='FIELD'?'fieldTargets':'routes'}/${id}`);
  requireThat(b.kind==='FIELD'?record?.publicationState==='PUBLISHED'&&record.kind==='ANALYSIS':record?.versionId===s.spaceOutlaws.versionId,'SO_MISSION_EVIDENCE_INVALID');
  byStep.set(b.stepId,{kind:b.kind,id,name:b.kind==='FIELD'?record.title:record.name});
 }
 return (a.missionSteps??[]).map(st=>({...st,...(byStep.has(st.id)?{evidence:byStep.get(st.id)}:{})}));
}
export async function missionEvidence(tx,s,c,ctx){
 const steps=(c.missionSteps??[]).filter(st=>st.evidence);
 if(!steps.length)return [];
 requireThat(hasMissionExecution(s),'SO_GAMEPLAY_NOT_OPEN');
 const base=`sessions/${s.id}`,fields=steps.some(st=>st.evidence.kind==='FIELD')?await tx.list(`${base}/fieldActions`,['characterId',ctx.c.id]):[],voyages=steps.some(st=>st.evidence.kind==='VOYAGE')?await tx.list(`${base}/voyages`):[];
 return steps.map(st=>{
  const b=st.evidence,rows=b.kind==='FIELD'?fields.filter(a=>a.targetId===b.id&&a.kind==='ANALYZE'&&a.status==='SUCCEEDED'&&a.actorUid===ctx.c.assignedUid&&a.accessVersion===ctx.r.accessVersion&&a.startedAt>=c.acceptedAt&&a.finishedAt>=a.startedAt):voyages.filter(v=>v.routeId===b.id&&v.status==='ARRIVED'&&v.departedAt>=c.acceptedAt&&v.closedAt>=v.departedAt&&v.missionManifest?.some(m=>m.id===ctx.c.id&&m.version===ctx.version));
  const r=rows.sort((a,b)=>(a.finishedAt??a.closedAt)-(b.finishedAt??b.closedAt)||a.id.localeCompare(b.id))[0];
  return {stepId:st.id,kind:b.kind,name:b.name,verified:!!r,...(r?{recordId:r.id,completedAt:r.finishedAt??r.closedAt}:{})};
 });
}
