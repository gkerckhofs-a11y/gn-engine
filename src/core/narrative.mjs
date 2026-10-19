import {requireThat,documentId} from './validation.mjs';
import {participantCharacter} from './projections.mjs';

const text=(value,max,required=false)=>{
  requireThat(typeof value==='string' && value.length<=max && (!required || value.trim()),'INVALID_TEXT');
  return value.trim();
};
export function narrativeInput(value,kind) {
  requireThat(Array.isArray(value) && value.length<=60,'INVALID_NARRATIVE');
  const items=value.map(item=>{
    requireThat(item && typeof item==='object' && !Array.isArray(item),'INVALID_NARRATIVE');
    const base={id:documentId(item.id),title:text(item.title,200,true),description:text(item.description??'',10000),
      published:item.published===true,gmNotes:text(item.gmNotes??'',4000)};
    if(kind==='relations') return {...base,targetId:item.targetId ? documentId(item.targetId) : null};
    const steps=item.steps??[];
    requireThat(Array.isArray(steps) && steps.length<=40,'INVALID_NARRATIVE');
    const clean=steps.map(step=>{
      requireThat(step && typeof step==='object' && !Array.isArray(step),'INVALID_NARRATIVE');
      return {id:documentId(step.id),title:text(step.title,200,true),
        description:text(step.description??'',4000),published:step.published===true};
    });
    requireThat(new Set(clean.map(s=>s.id)).size===clean.length,'DUPLICATE_NARRATIVE');
    return {...base,steps:clean};
  });
  requireThat(new Set(items.map(x=>x.id)).size===items.length,'DUPLICATE_NARRATIVE');
  return items;
}
export async function validateRelations(tx,base,character) {
  for(const relation of character.relations??[]) {
    if(relation.targetId) requireThat(relation.targetId!==character.id
      && await tx.get(`${base}/${relation.targetId}`),'INVALID_RELATION');
  }
}
export function publishedSnapshot(c) {
  const sessionId=c.sessionId??'scenario';
  return participantCharacter({...c,sessionId,publicCode:c.publicCode??c.id},
    {active:true,uid:'snapshot',characterId:c.id,sessionId},'snapshot');
}
export function recordPublication(tx,base,previous,next,{id,at,actorUid,reason,stage=null}) {
  // Legacy records have no history. Capture the previous published text without
  // inventing its original publication date.
  if(previous?.publicationState==='PUBLISHED' && !previous.historyStarted) {
    tx.set(`${base}/${next.id}/history/legacy-initial`,{id:'legacy-initial',at,actorUid,
      reason:'État publié avant le premier suivi de versions',stage,source:'LEGACY_CAPTURE',
      revision:previous.contentRevision??1,character:publishedSnapshot(previous)});
  }
  if(next.publicationState==='PUBLISHED') {
    tx.set(`${base}/${next.id}/history/${id}`,{id,at,actorUid,reason,stage,source:'PUBLICATION',
      revision:next.contentRevision,character:publishedSnapshot(next)});
  }
}
