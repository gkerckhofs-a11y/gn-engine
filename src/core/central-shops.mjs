import {documentId,requireThat} from './validation.mjs';
import {amountInput} from './economy-state.mjs';

const keys=(v,fields,code)=>requireThat(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>fields.includes(k)),code);
const text=(v,max,code,required=false)=>{requireThat(typeof v==='string'&&v.length<=max&&(!required||v.trim()),code);return v.trim();};
const ref=v=>v==null||v===''?null:documentId(v);
export function centralShopInput(v,id,old={}){
 const code='INVALID_CENTRAL_SHOP';keys(v,['name','description','sellerCharacterId','locationTargetId','gmNotes'],code);
 return {id,schemaVersion:1,name:text(v.name,150,code,true),description:text(v.description??'',6000,code),sellerCharacterId:ref(v.sellerCharacterId),locationTargetId:ref(v.locationTargetId),
  gmNotes:text(v.gmNotes??'',10000,code),publicationState:'DRAFT',masterArchived:false,revision:(old.revision??0)+1};
}
export function centralOfferInput(v,id,old={}){
 const code='INVALID_CENTRAL_OFFER';keys(v,['name','shopId','itemId','unitPrice','buybackPrice','conditions','gmNotes'],code);
 return {id,schemaVersion:1,name:text(v.name,150,code,true),shopId:ref(v.shopId),itemId:ref(v.itemId),unitPrice:v.unitPrice==null?null:amountInput(v.unitPrice),buybackPrice:v.buybackPrice==null?null:amountInput(v.buybackPrice),
  conditions:text(v.conditions??'',2000,code),gmNotes:text(v.gmNotes??'',10000,code),publicationState:'DRAFT',masterArchived:false,revision:(old.revision??0)+1};
}

// null is a denied foreign-workshop read, never an empty catalogue. References
// stay in the common draft; no copied product, seller, cash account or stock.
export function centralShopProjection(changes,itemChanges,characterChanges){
 const shops=changes.filter(c=>c.type==='shop'),offers=changes.filter(c=>c.type==='offer');
 const items=itemChanges?.filter(c=>c.type==='item')??[],characters=characterChanges?.filter(c=>c.type==='character')??[],diagnostics=[];
 const add=(c,field,reference,referenceType,code,message)=>diagnostics.push({workshop:'M5',entityType:c.type,entityId:c.entityId,field,reference,referenceType,code,message,source:c.source,draftRevision:c.revision});
 const check=(c,field,type,targets,allowed,workshop)=>{
  const id=c.data[field];
  if(!id){add(c,field,null,type,'REFERENCE_REQUIRED',`Renseigner cette référence ${workshop} dans le brouillon.`);return;}
  if(!allowed){add(c,field,id,type,'REFERENCE_NOT_CHECKED',`Lecture ${workshop} requise pour contrôler cette référence.`);return;}
  const target=targets.find(t=>t.entityId===id);
  if(!target)add(c,field,id,type,'REFERENCE_MISSING',`Préparer cette définition dans ${workshop} ou corriger son identifiant.`);
  else if(target.operation!=='UPSERT')add(c,field,id,type,'REFERENCE_ARCHIVED',`Restaurer cette définition dans ${workshop} ou modifier la référence.`);
 };
 for(const c of shops.filter(c=>c.operation==='UPSERT')){
  check(c,'sellerCharacterId','character',characters,characterChanges!==null,'M2');
  add(c,'locationTargetId',c.data.locationTargetId,'fieldTarget',c.data.locationTargetId?'REFERENCE_PENDING':'REFERENCE_REQUIRED',c.data.locationTargetId?'Lieu conservé ; son contrôle central reste à raccorder.':'Préparer la référence du lieu de la boutique.');
 }
 for(const c of offers.filter(c=>c.operation==='UPSERT')){
  check(c,'shopId','shop',shops,true,'M5');check(c,'itemId','item',items,itemChanges!==null,'M1');
  if(c.data.unitPrice===null)add(c,'unitPrice',null,null,'PRICE_REQUIRED','Renseigner un prix unitaire en crédits avant le contrôle complet.');
 }
 const reference=c=>({id:c.entityId,name:c.data.name,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source});
 return {references:{itemsReadable:itemChanges!==null,charactersReadable:characterChanges!==null,shops:shops.map(reference),items:items.map(reference),
  characters:characters.map(c=>({id:c.entityId,name:c.data.public.displayName,archived:c.operation!=='UPSERT',revision:c.data.contentRevision,source:c.source}))},diagnostics,publicationAvailable:false};
}
