import {requireThat} from './validation.mjs';
import {characterInput} from './character-state.mjs';
import {centralCharacterPlan,centralPlanProjection,storedCharacterPlan} from './central-character-plan.mjs';

export const centralCharacterBytes=96*1024;
const check=v=>requireThat(v,'INVALID_CENTRAL_CHARACTER');
const keys=(v,allowed)=>check(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)));
const fields=['displayName','profession','description','nature','biography','roleplay','playerSecrets','gmNotes','objectives','relations','creationPlan'];
export function centralCharacterEditable(d){
 const strip=rows=>rows?.map(({published,...row})=>({...row,...(row.steps?{steps:row.steps.map(({published,...s})=>s)}:{})}));
 const plan=Object.hasOwn(d,'creationPlan')?storedCharacterPlan(d.creationPlan):undefined;
 return {displayName:d.public?.displayName,profession:d.public?.profession,description:d.public?.description,nature:d.nature,biography:d.biography,roleplay:d.roleplay,playerSecrets:d.playerSecrets,gmNotes:d.gmNotes,objectives:strip(d.objectives),relations:strip(d.relations),
  ...(plan!==undefined?{creationPlan:plan===null?null:{classId:plan.classId,speciesId:plan.speciesId,secondaryId:plan.secondaryId}}:{})};
}
export function centralCharacterInput(input,id,old){
 keys(input,fields);requireThat(Buffer.byteLength(JSON.stringify(input))<=centralCharacterBytes,'CENTRAL_CHARACTER_SIZE');
 check(['HUMANOID','DROID',null].includes(input.nature));
 const narrative=(rows,kind)=>{
  check(Array.isArray(rows));return rows.map(row=>{
   keys(row,['id','title','description','gmNotes',...(kind==='relations'?['targetId']:['steps'])]);
   if(kind==='relations'){check(row.targetId===null||typeof row.targetId==='string');check(row.targetId!==id);return {...row,published:false};}
   check(Array.isArray(row.steps));return {...row,published:false,steps:row.steps.map(step=>{keys(step,['id','title','description']);return {...step,published:false};})};
  });
 };
 const next={...characterInput({...input,publicationState:'DRAFT',objectives:narrative(input.objectives,'objectives'),relations:narrative(input.relations,'relations')},id,old),masterArchived:false,
  ...(input.creationPlan!==undefined?{creationPlan:centralCharacterPlan(input.creationPlan)}:{})};
 requireThat(Buffer.byteLength(JSON.stringify(next))<=centralCharacterBytes,'CENTRAL_CHARACTER_SIZE');return next;
}
// Only fictional definitions from the current M2 draft. Never query admissions,
// accounts or session characters to resolve a narrative contact.
export function centralCharacterProjection(changes){
 const characters=changes.filter(c=>c.type==='character'),species=changes.find(c=>c.id==='speciesCatalogue_player'&&c.operation==='UPSERT')?.data??[],diagnostics=[];
 const add=(c,field,reference,code,message)=>diagnostics.push({workshop:'M2',entityId:c.entityId,field,reference,code,message,source:c.source,draftRevision:c.revision});
 for(const c of characters.filter(c=>c.operation==='UPSERT')){
  if(!c.data.nature)add(c,'nature',null,'NATURE_REQUIRED','Préciser la nature humanoïde ou droïde dans la définition.');
  for(const r of c.data.relations??[]){
   if(!r.targetId)continue;const target=characters.find(t=>t.entityId===r.targetId);
   if(!target)add(c,`relations.${r.id}.targetId`,r.targetId,'REFERENCE_MISSING','Préparer le personnage cible dans ce même brouillon M2 ou corriger son identifiant.');
   else if(target.operation!=='UPSERT')add(c,`relations.${r.id}.targetId`,r.targetId,'REFERENCE_ARCHIVED','Restaurer le personnage cible ou modifier la relation avant le futur contrôle global.');
  }
 }
 const creationProfiles=centralPlanProjection(characters,species,add);
 return {references:{characters:characters.map(c=>({id:c.entityId,displayName:c.data.public.displayName,nature:c.data.nature??null,archived:c.operation!=='UPSERT',revision:c.data.contentRevision,source:c.source})),
  species:species.map(s=>({id:s.id,label:s.label,nature:s.nature,available:s.available}))},creationProfiles,diagnostics,publicationAvailable:false};
}
