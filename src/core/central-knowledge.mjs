import {requireThat} from './validation.mjs';
import {knowledgeInput} from './knowledge.mjs';

export function centralKnowledgeInput(v,id,old={}){
 const code='INVALID_CENTRAL_KNOWLEDGE';
 requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['kind','title','body','origin','shareMode','gmTruth','gmNotes','initialCharacterIds','qrEnabled','qrAudience','qrCharacterIds','qrSkillId','qrSkillLevel'].includes(k)),code);
 for(const key of ['initialCharacterIds','qrCharacterIds'])requireThat(v[key]===undefined||Array.isArray(v[key])&&v[key].length<=100,code);
 requireThat(v.qrEnabled===undefined||typeof v.qrEnabled==='boolean',code);
 const skill=v.qrSkillId??null,level=v.qrSkillLevel??null;
 requireThat(skill?Number.isSafeInteger(level)&&level>=1&&level<=5:level===null,code);
 const data={...knowledgeInput({...v,qrSkillId:skill,qrSkillLevel:level,publicationState:'DRAFT'},id,old),masterArchived:false};
 requireThat(Buffer.byteLength(JSON.stringify(data))<=96*1024,'CENTRAL_KNOWLEDGE_SIZE');return data;
}

// Recipients are proposals for definitions in this draft. No receipt is issued.
// null means M2 is unreadable, never an empty or absent character catalogue.
export function centralKnowledgeProjection(changes,characterChanges){
 const characters=characterChanges?.filter(c=>c.type==='character')??[],diagnostics=[];
 const add=(c,field,reference,referenceType,code,message)=>diagnostics.push({workshop:'M6',entityType:'knowledge',entityId:c.entityId,field,reference,referenceType,code,message,source:c.source,draftRevision:c.revision});
 for(const c of changes.filter(c=>c.type==='knowledge'&&c.operation==='UPSERT')){
  for(const key of ['initialCharacterIds','qrCharacterIds'])c.data[key].forEach((id,i)=>{
   const field=`${key}.${i}`;
   if(characterChanges===null){add(c,field,id,'character','REFERENCE_NOT_CHECKED','Lecture M2 requise pour contrôler ce destinataire proposé.');return;}
   const target=characters.find(t=>t.entityId===id);
   if(!target)add(c,field,id,'character','REFERENCE_MISSING','Préparer cette fiche dans M2 ou corriger son identifiant.');
   else if(target.operation!=='UPSERT')add(c,field,id,'character','REFERENCE_ARCHIVED','Restaurer cette fiche M2 ou modifier le destinataire proposé.');
  });
  if(c.data.qrEnabled&&c.data.qrAudience==='SELECTED'&&!c.data.qrCharacterIds.length)add(c,'qrCharacterIds',null,'character','RECIPIENTS_REQUIRED','Préparer les destinataires de cette découverte ciblée.');
  if(c.data.qrSkillId)add(c,'qrSkillId',c.data.qrSkillId,'skill','REFERENCE_PENDING','Compétence conservée ; le catalogue canonique et ses conditions de découverte restent à raccorder.');
 }
 return {references:{charactersReadable:characterChanges!==null,characters:characters.map(c=>({id:c.entityId,name:c.data.public.displayName,archived:c.operation!=='UPSERT',revision:c.data.contentRevision,source:c.source}))},diagnostics,publicationAvailable:false};
}
