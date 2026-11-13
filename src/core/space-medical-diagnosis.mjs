import {requireThat,documentId} from './validation.mjs';
export const diagnosisProfile={id:'SO-MED-01',publicationState:'PUBLISHED',revision:1,name:'Diagnostic médical',kind:'DIAGNOSIS',skillId:'MED-01',minLevel:1,prerequisites:[],patientNature:'HUMANOID',cost:1,cooldownSeconds:600,durationSeconds:60,durationByLevel:{},test:'AUTO',threshold:0,consumable:null,extraConsumables:[],bonusItems:[],continuationSeconds:0,healAmount:0,reviveLevel:0,convalescenceSeconds:0,patientCooldownSeconds:0,instructions:'À couvert, auprès du patient consentant ou hors combat. Une minute, 1 PA ; récupération personnelle de 10 minutes de jeu. Seules les informations fictives enregistrées et autorisées par votre niveau sont révélées.'};
export function medicalDossier(input,revision,items=[],versionId){
 requireThat(input&&typeof input==='object'&&!Array.isArray(input),'INVALID_PERSON_PROFILE');
 const text=v=>{requireThat(typeof v==='string'&&v.length<=4000,'INVALID_PERSON_PROFILE');return v.trim();};
 const information=(input.information??[]).map(r=>{requireThat([1,2,3,4,5].includes(r.level)&&typeof r.bonus==='boolean'&&!(r.level===3&&r.bonus),'INVALID_PERSON_PROFILE');return {level:r.level,bonus:r.bonus,text:text(r.text)};});
 requireThat(information.length<=20,'INVALID_PERSON_PROFILE');
 const bonusItems=(input.bonusItems??[]).map(b=>{requireThat(b.bonus===1&&items.some(i=>i.id===b.itemId&&!i.consumable&&i.versionId===versionId),'FIELD_REFERENCE');return {itemId:documentId(b.itemId),bonus:b.bonus};});requireThat(bonusItems.length<=20&&new Set(bonusItems.map(b=>b.itemId)).size===bonusItems.length,'INVALID_PERSON_PROFILE');
 return {revision,information,bonusItems,reason:text(input.reason??''),updatedBy:null};
}
export const diagnosisVersion=(t,d)=>JSON.stringify([t.hp,t.maxHp,t.survival?.stabilized??false,t.survival?.dead??false,t.convalescentUntilGameMs??0,d?.revision??0]);
export function diagnosisFor(d,level){const extra=d?.information?.some(r=>r.bonus&&r.level<=level);return {...diagnosisProfile,...(extra?{test:'D6',threshold:6,bonusItems:d?.bonusItems??[]}:{})};}
export function diagnosisResult(t,d,level,success){return {hp:t.hp,maxHp:t.maxHp,stabilized:t.survival?.stabilized===true,convalescentUntilGameMs:t.convalescentUntilGameMs??0,bonusSuccess:success,information:(d?.information??[]).filter(r=>r.level<=level&&(!r.bonus||success)).map(r=>r.text)};}
export async function patientDossier(tx,sid,cid){return tx.get(`sessions/${documentId(sid)}/medicalDossiers/${documentId(cid)}`);}
