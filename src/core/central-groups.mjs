import {requireThat} from './validation.mjs';
import {groupInput,groupPermissions} from './groups.mjs';

export const centralGroupBytes=96*1024;
const keys=(v,allowed)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)),'INVALID_CENTRAL_GROUP');
export const centralGroupEditable=d=>Object.fromEntries(['name','description','briefing','gmNotes','visibility','members'].map(k=>[k,d[k]]));
export function centralGroupInput(v,id,old={}){
 keys(v,['name','description','briefing','gmNotes','visibility','members']);
 requireThat(Buffer.byteLength(JSON.stringify(v))<=centralGroupBytes,'CENTRAL_GROUP_SIZE');
 requireThat(Array.isArray(v.members)&&v.members.length<=100,'INVALID_CENTRAL_GROUP');
 for(const m of v.members){
  keys(m,['characterId','role','active','revealed','visibleToMembers','publicAffiliation','permissions']);
  for(const k of ['active','revealed','visibleToMembers','publicAffiliation'])requireThat(m[k]===undefined||typeof m[k]==='boolean','INVALID_CENTRAL_GROUP');
  if(m.permissions!==undefined){keys(m.permissions,groupPermissions);requireThat(Object.values(m.permissions).every(x=>typeof x==='boolean'),'INVALID_CENTRAL_GROUP');}
 }
 // Only native definition fields: never carry a session roster or wallet policy.
 const data={...groupInput({...v,publicationState:'DRAFT'},id,{revision:old.revision??0}),masterArchived:false};
 requireThat(Buffer.byteLength(JSON.stringify(data))<=centralGroupBytes,'CENTRAL_GROUP_SIZE');return data;
}
export function centralGroupProjection(changes){
 const groups=changes.filter(c=>c.type==='group'),characters=changes.filter(c=>c.type==='character'),diagnostics=[];
 for(const c of groups.filter(c=>c.operation==='UPSERT'))for(const [i,m] of c.data.members.entries()){
  // Inactive proposed affiliations still reference an identifiable definition.
  const target=characters.find(x=>x.entityId===m.characterId);
  if(!target||target.operation!=='UPSERT')diagnostics.push({workshop:'M2',entityType:'group',entityId:c.entityId,field:`members.${i}.characterId`,reference:m.characterId,referenceType:'character',code:target?'REFERENCE_ARCHIVED':'REFERENCE_MISSING',message:target?'Restaurer la fiche M2 ou retirer cette appartenance proposée.':'Préparer cette fiche dans M2 ou corriger son identifiant.',source:c.source,draftRevision:c.revision});
 }
 return {groups:groups.map(c=>({id:c.entityId,name:c.data.name,visibility:c.data.visibility,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source})),diagnostics};
}
