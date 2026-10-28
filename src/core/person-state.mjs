import {naturePatch} from './character-nature.mjs';
import {fieldProfile} from './field-state.mjs';
import {documentId,requireThat,whole} from './validation.mjs';
import {gameTime} from './clock.mjs';
export const personKinds=['FIELD_CARE','CLINIC_SAFE','CLINIC_FAST','LOOT_COMMON','LOOT_METHODICAL'];
export const personOpen=a=>['ACTIVE','CONTINUING','AWAITING_PICK','AWAITING_HANDOVER'].includes(a.status);
export const isLoot=p=>p.kind.startsWith('LOOT_');
const num=(v,max=86400)=>{whole(v,'INVALID_PERSON_PROFILE');requireThat(v<=max,'INVALID_PERSON_PROFILE');return v;};
export function personProfileInput(v,id,old={}){
 requireThat(v&&personKinds.includes(v.kind)&&['DRAFT','READY','PUBLISHED'].includes(v.publicationState),'INVALID_PERSON_PROFILE');
 requireThat(typeof v.name==='string'&&v.name.trim()&&v.name.length<=150,'INVALID_PERSON_PROFILE');
 requireThat((v.healAmount??1)>0&&(v.reviveLevel??2)>0,'INVALID_PERSON_PROFILE');
 const p=fieldProfile({...v,test:v.kind==='CLINIC_FAST'?'D6':'AUTO',cooldownSeconds:isLoot(v)?v.cooldownSeconds??null:0},v.kind);
 requireThat(v.kind==='LOOT_COMMON'?!p.skillId:!!p.skillId,'INVALID_PERSON_PROFILE');
 requireThat(Array.isArray(v.prerequisites??[])&&Array.isArray(v.extraConsumables??[]),'INVALID_PERSON_PROFILE');
 const prerequisites=(v.prerequisites??[]).map(r=>{requireThat(r&&typeof r==='object','INVALID_PERSON_PROFILE');return ({skillId:documentId(r.skillId),minLevel:num(r.minLevel,100)});});
 requireThat(prerequisites.length<=10&&prerequisites.every(r=>r.minLevel>0),'INVALID_PERSON_PROFILE');
 const supplies=[p.consumable,...(v.extraConsumables??[]).map(x=>{requireThat(x&&typeof x==='object','INVALID_PERSON_PROFILE');return {itemId:documentId(x.itemId),quantity:num(x.quantity,1000)};})].filter(Boolean);
 requireThat(supplies.length<=3&&new Set(supplies.map(x=>x.itemId)).size===supplies.length&&supplies.every(x=>x.quantity>0),'INVALID_PERSON_PROFILE');
 requireThat(!isLoot(p)||supplies.length===0,'INVALID_PERSON_PROFILE');
 const nature=naturePatch(v,old,'patientNature');
 requireThat(!isLoot(p)||nature.patientNature==null,'INVALID_PERSON_PROFILE');
 return {...p,...nature,id,name:v.name.trim(),publicationState:v.publicationState,prerequisites,extraConsumables:supplies.slice(p.consumable?1:0),
  continuationSeconds:num(v.continuationSeconds??120),healAmount:num(v.healAmount??1,1000),reviveLevel:num(v.reviveLevel??2,100),
  convalescenceSeconds:num(v.convalescenceSeconds??600),patientCooldownSeconds:num(v.patientCooldownSeconds??600),revision:(old.revision??0)+1};
}
export function validatePersonReferences(p,records){
 const get=(kind,id)=>{const d=records[kind]?.find(x=>x.id===id);requireThat(d&&(p.publicationState!=='PUBLISHED'||d.publicationState==='PUBLISHED'),'FIELD_REFERENCE');return d;};
 for(const r of [{skillId:p.skillId},...p.prerequisites].filter(x=>x.skillId))requireThat(get('skills',r.skillId).kind==='PASSIVE','FIELD_REFERENCE');
 for(const b of p.bonusItems)get('items',b.itemId);
 for(const c of [p.consumable,...p.extraConsumables].filter(Boolean)){const i=get('items',c.itemId);requireThat(i.consumable&&(i.kind!=='INDIVIDUAL'||c.quantity===1),'FIELD_REFERENCE');}
}
export const convalescent=(s,c,at)=>(c.convalescentUntilGameMs??0)>gameTime(s.clock,at);
export function encounter(c,at){
 const e=c.lootEncounter??{number:1,taken:false,freeSince:null,captureUntil:null,captureDeadline:null};
 return e.freeSince!==null&&at-e.freeSince>=1800000?{...e,number:e.number+1,taken:false,freeSince:null,captureUntil:null,captureDeadline:null}:e;
}
export const lootEligible=(s,c,at)=>!!(s.healthRules?.enabled&&(c.hp===0||c.outOfCombat))||(c.lootEncounter?.captureUntil??0)>at;
