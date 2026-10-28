import {documentId,requireThat,whole} from './validation.mjs';
import {narrativeInput} from './narrative.mjs';
import {itemQuantity} from './inventory-state.mjs';

const code='INVALID_CENTRAL_MISSION';
const keys=(v,fields)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>fields.includes(k)),code);
const text=(v,max)=>{requireThat(typeof v==='string'&&v.length<=max,code);return v.trim();};
const list=v=>{requireThat(Array.isArray(v)&&v.length<=100,code);return v;};
export function centralMissionInput(v,id,old={}){
 keys(v,['title','description','gmNotes','steps','giverCharacterId','requiredKnowledgeIds','rewardItems','conditions','proofExpected']);
 requireThat(Buffer.byteLength(JSON.stringify(v))<=96*1024,'CENTRAL_MISSION_SIZE');
 requireThat(Array.isArray(v.steps),code);for(const step of v.steps)keys(step,['id','title','description']);
 const {published,...narrative}=narrativeInput([{id,title:v.title,description:v.description??'',gmNotes:v.gmNotes??'',steps:v.steps}],'objectives')[0];
 const requiredKnowledgeIds=list(v.requiredKnowledgeIds??[]).map(documentId);
 const rewardItems=list(v.rewardItems??[]).map(row=>{keys(row,['itemId','quantity']);const quantity=whole(row.quantity,code);requireThat(quantity>0,code);return {itemId:documentId(row.itemId),quantity};});
 requireThat(new Set(requiredKnowledgeIds).size===requiredKnowledgeIds.length&&new Set(rewardItems.map(r=>r.itemId)).size===rewardItems.length,code);
 const data={...narrative,schemaVersion:1,giverCharacterId:v.giverCharacterId==null||v.giverCharacterId===''?null:documentId(v.giverCharacterId),requiredKnowledgeIds,rewardItems,
  conditions:text(v.conditions??'',4000),proofExpected:text(v.proofExpected??'',2000),publicationState:'DRAFT',masterArchived:false,revision:(old.revision??0)+1};
 requireThat(Buffer.byteLength(JSON.stringify(data))<=96*1024,'CENTRAL_MISSION_SIZE');return data;
}

// These are preparation dependencies, never executable conditions or rewards.
export function centralMissionReferences(data){
 return [...(data.giverCharacterId?[{field:'giverCharacterId',type:'character',id:data.giverCharacterId}]:[]),
  ...data.requiredKnowledgeIds.map((id,i)=>({field:`requiredKnowledgeIds.${i}`,type:'knowledge',id})),
  ...data.rewardItems.map((r,i)=>({field:`rewardItems.${i}.itemId`,type:'item',id:r.itemId,quantity:r.quantity,quantityField:`rewardItems.${i}.quantity`}))];
}
export function centralMissionProjection(changes,itemChanges,characterChanges,knowledgeChanges){
 const catalogs={item:itemChanges,character:characterChanges,knowledge:knowledgeChanges},owners={item:'M1',character:'M2',knowledge:'M6'},diagnostics=[];
 const add=(c,field,reference,type,code,message)=>diagnostics.push({workshop:'M7',entityType:'mission',entityId:c.entityId,field,reference,referenceType:type,code,message,source:c.source,draftRevision:c.revision});
 for(const c of changes.filter(c=>c.type==='mission'&&c.operation==='UPSERT')){
  for(const ref of centralMissionReferences(c.data)){
   const {field,type,id}=ref,workshop=owners[type],catalog=catalogs[type];
   if(catalog===null){add(c,field,id,type,'REFERENCE_NOT_CHECKED',`Lecture ${workshop} requise pour contrôler cette référence.`);continue;}
   const target=catalog.find(t=>t.type===type&&t.entityId===id);
   if(!target)add(c,field,id,type,'REFERENCE_MISSING',`Préparer cette définition dans ${workshop} ou corriger son identifiant.`);
   else if(target.operation!=='UPSERT')add(c,field,id,type,'REFERENCE_ARCHIVED',`Restaurer cette définition dans ${workshop} ou modifier la référence.`);
   else if(type==='item')try{itemQuantity(target.data,ref.quantity);}catch(e){if(e.code!=='INVALID_QUANTITY')throw e;add(c,ref.quantityField,id,type,'REWARD_QUANTITY_INVALID','Un objet individuel ne peut représenter qu’une unité par proposition.');}
  }
  c.data.rewardItems.forEach((r,i)=>add(c,`rewardItems.${i}` ,r.itemId,'item','REWARD_SOURCE_PENDING','Récompense proposée : source réelle, réserve et remise restent à préparer ; aucun bien créé.'));
 }
 const refs=type=>(catalogs[type]??[]).filter(c=>c.type===type).map(c=>({id:c.entityId,name:type==='character'?c.data.public.displayName:type==='knowledge'?c.data.title:c.data.name,archived:c.operation!=='UPSERT',revision:type==='character'?c.data.contentRevision:c.data.revision,source:c.source}));
 return {references:{itemsReadable:itemChanges!==null,charactersReadable:characterChanges!==null,knowledgeReadable:knowledgeChanges!==null,items:refs('item'),characters:refs('character'),knowledge:refs('knowledge')},diagnostics,publicationAvailable:false};
}
