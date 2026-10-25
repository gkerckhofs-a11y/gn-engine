import {requireThat} from './validation.mjs';
import {fieldTargetInput} from './field-state.mjs';

const fields=['kind','title','description','gmNotes','profiles','rewards','dependencyId','offlineSeconds','failureLockSeconds','repairProtectionSeconds'];
const profileFields=['skillId','minLevel','instructions','durationSeconds','durationByLevel','test','threshold','cost','cooldownSeconds','bonusItems','consumable','successText','failureText'];
const keys=(v,allowed)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k)),'INVALID_CENTRAL_FIELD_TARGET');
export const centralFieldTargetBytes=96*1024;
export function centralFieldTargetEditable(d){
 return {...Object.fromEntries(fields.map(k=>[k,d[k]])),profiles:Object.fromEntries(Object.entries(d.profiles).map(([kind,{kind:storedKind,...p}])=>[kind,p]))};
}
export function centralFieldTargetInput(v,id,old={}){
 keys(v,fields);requireThat(Buffer.byteLength(JSON.stringify(v))<=centralFieldTargetBytes,'CENTRAL_FIELD_TARGET_SIZE');
 keys(v.profiles,['SEARCH','SABOTAGE','REPAIR']);
 for(const p of Object.values(v.profiles)){
  keys(p,profileFields);
  if(p.durationByLevel!==undefined)requireThat(p.durationByLevel&&typeof p.durationByLevel==='object'&&!Array.isArray(p.durationByLevel),'INVALID_CENTRAL_FIELD_TARGET');
  if(p.bonusItems!==undefined){requireThat(Array.isArray(p.bonusItems),'INVALID_CENTRAL_FIELD_TARGET');for(const b of p.bonusItems)keys(b,['itemId','bonus']);}
  if(p.consumable!=null)keys(p.consumable,['itemId','quantity']);
 }
 requireThat(Array.isArray(v.rewards),'INVALID_CENTRAL_FIELD_TARGET');
 for(const r of v.rewards){keys(r,['id','kind','quantity','stock','perCharacter','itemId','knowledgeId']);requireThat((r.kind==='ITEM'||r.itemId==null)&&(r.kind==='KNOWLEDGE'||r.knowledgeId==null),'INVALID_CENTRAL_FIELD_TARGET');}
 const data={...fieldTargetInput({...v,publicationState:'DRAFT'},id,{revision:old.revision??0}),masterArchived:false};
 requireThat(Buffer.byteLength(JSON.stringify(data))<=centralFieldTargetBytes,'CENTRAL_FIELD_TARGET_SIZE');return data;
}
const diagnostic=(c,field,reference,referenceType,code,message)=>({workshop:c.workshop,entityType:c.type,entityId:c.entityId,field,reference,referenceType,code,message,source:c.source,draftRevision:c.revision});
export const centralLocationReferences=changes=>({locationsReadable:changes!==null,locations:(changes??[]).filter(c=>c.type==='fieldTarget').map(c=>({id:c.entityId,title:c.data.title,kind:c.data.kind,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source}))});
// Existence of a definition never certifies a laboratory, public QR or action.
export function centralLocationDiagnostics(c,field,id,changes,required=false){
 const add=(code,message)=>[diagnostic(c,field,id,'fieldTarget',code,message)];
 if(!id)return required?add('REFERENCE_REQUIRED','Préparer la référence du lieu commun dans M6.'):[];
 if(changes===null)return add('REFERENCE_NOT_CHECKED','Lecture M6 requise pour contrôler le lieu commun.');
 const target=changes.find(t=>t.type==='fieldTarget'&&t.entityId===id);
 if(!target)return add('REFERENCE_MISSING','Préparer ce lieu dans M6 ou corriger son identifiant.');
 return target.operation==='UPSERT'?[]:add('REFERENCE_ARCHIVED','Restaurer ce lieu dans M6 ou modifier la référence.');
}
export function centralFieldTargetReferences(d){
 const refs=[];const add=(field,type,id,extra={})=>{if(id)refs.push({field,type,id,...extra});};
 add('dependencyId','fieldTarget',d.dependencyId);
 for(const [kind,p] of Object.entries(d.profiles)){
  const prefix=`profiles.${kind}`;add(`${prefix}.skillId`,'skill',p.skillId);
  p.bonusItems.forEach((b,i)=>add(`${prefix}.bonusItems.${i}.itemId`,'item',b.itemId));
  if(p.consumable)add(`${prefix}.consumable.itemId`,'item',p.consumable.itemId,{consumable:true,quantity:p.consumable.quantity});
 }
 d.rewards.forEach((r,i)=>{if(r.kind==='ITEM')add(`rewards.${i}.itemId`,'item',r.itemId,{quantity:r.quantity});if(r.kind==='KNOWLEDGE')add(`rewards.${i}.knowledgeId`,'knowledge',r.knowledgeId);});return refs;
}
export function centralFieldTargetProjection(changes,itemChanges=null){
 const diagnostics=[],items=itemChanges?.filter(c=>c.type==='item')??[];
 for(const c of changes.filter(c=>c.type==='fieldTarget'&&c.operation==='UPSERT')){
  const add=(field,ref,type,code,message)=>diagnostics.push(diagnostic(c,field,ref,type,code,message));
  for(const ref of centralFieldTargetReferences(c.data)){
   if(ref.type==='skill'){add(ref.field,ref.id,ref.type,'REFERENCE_NOT_CHECKED','Catalogue canonique et profil de compétence à raccorder.');continue;}
   if(ref.type==='item'&&itemChanges===null){add(ref.field,ref.id,ref.type,'REFERENCE_NOT_CHECKED','Lecture M1 requise pour contrôler cet objet.');continue;}
   const target=(ref.type==='item'?items:changes).find(t=>t.type===ref.type&&t.entityId===ref.id);
   if(!target){add(ref.field,ref.id,ref.type,'REFERENCE_MISSING','Préparer la définition cible dans son atelier ou corriger son identifiant.');continue;}
   if(target.operation!=='UPSERT'){add(ref.field,ref.id,ref.type,'REFERENCE_ARCHIVED','Restaurer la définition cible ou modifier la référence.');continue;}
   if(ref.field==='dependencyId'&&target.data.kind!=='INSTALLATION')add(ref.field,ref.id,ref.type,'FIELD_DEPENDENCY_TYPE','La dépendance d’une fouille doit être une installation native.');
   if(ref.type==='item'&&ref.consumable&&!target.data.consumable)add(ref.field,ref.id,ref.type,'FIELD_CONSUMABLE','Choisir un objet consommable.');
   if(ref.type==='item'&&ref.quantity!==undefined&&target.data.kind==='INDIVIDUAL'&&ref.quantity!==1)add(ref.field,ref.id,ref.type,'FIELD_ITEM_QUANTITY','Un objet individuel exige une quantité de 1.');
  }
  add('profiles',null,null,'FIELD_RULES_PENDING','Paramètres préparatoires : conformité V0.7, compétences, autorisations et QR de jeu restent à valider avant toute activation.');
  if(c.data.rewards.length)add('rewards',null,null,'FIELD_REWARD_SOURCE_PENDING','Quantités et plafonds proposés seulement ; source, réserve réelle et attribution transactionnelle restent à raccorder.');
 }
 return {references:{...centralLocationReferences(changes),itemsReadable:itemChanges!==null,items:items.map(c=>({id:c.entityId,name:c.data.name,kind:c.data.kind,consumable:c.data.consumable,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source}))},diagnostics,publicationAvailable:false};
}
