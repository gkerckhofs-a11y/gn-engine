import {documentId,requireThat} from './validation.mjs';
import {initialClassKit} from '../shared/initial-class-kit.mjs';
import {spaceOutlawsProfile} from './preparation-state.mjs';

const check=value=>requireThat(value,'INVALID_CENTRAL_KIT');
const keys=(value,allowed)=>check(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k)));
export function centralClassKitInput(input,id,old={}){
 const spec=initialClassKit(id);check(spec);keys(input,['bindings','gmNotes']);
 check(Array.isArray(input.bindings)&&input.bindings.length<=spec.slots.length);
 const seen=new Set(),bindings=input.bindings.map(b=>{
  keys(b,['slotId','itemId']);check(spec.slots.some(s=>s.id===b.slotId)&&!seen.has(b.slotId));seen.add(b.slotId);
  return {slotId:b.slotId,itemId:documentId(b.itemId)};
 }).sort((a,b)=>spec.slots.findIndex(s=>s.id===a.slotId)-spec.slots.findIndex(s=>s.id===b.slotId));
 check(typeof (input.gmNotes??'')==='string'&&(input.gmNotes??'').length<=4000);
 return {id,schemaVersion:1,ruleProfile:spaceOutlawsProfile,name:spec.name,bindings,gmNotes:(input.gmNotes??'').trim(),publicationState:'DRAFT',masterArchived:false,revision:(old.revision??0)+1};
}
export function centralClassKitProjection(changes){
 const items=changes.filter(c=>c.type==='item'),kits=changes.filter(c=>c.type==='classKit'),diagnostics=[],kitPlans=[];
 const add=(c,field,reference,code,message)=>diagnostics.push({workshop:'M1',entityType:'classKit',entityId:c.entityId,field,reference,code,message,source:c.source,draftRevision:c.revision});
 for(const c of kits.filter(c=>c.operation==='UPSERT')){
  const spec=initialClassKit(c.entityId);if(!spec)continue;
  const slots=spec.slots.map(slot=>{
   const binding=c.data.bindings.find(b=>b.slotId===slot.id),item=binding?items.find(x=>x.entityId===binding.itemId):null,field=`bindings.${slot.id}.itemId`;
   if(!binding)add(c,field,null,'REFERENCE_REQUIRED','Choisir le modèle M1 de cet élément du kit.');
   else if(!item)add(c,field,binding.itemId,'REFERENCE_MISSING','Préparer le modèle dans ce même brouillon M1 ou corriger son identifiant.');
   else if(item.operation!=='UPSERT')add(c,field,binding.itemId,'REFERENCE_ARCHIVED','Restaurer le modèle ou modifier la référence du kit.');
   else if(slot.requiresConsumable&&!item.data.consumable)add(c,field,binding.itemId,'KIT_CONSUMABLE_REQUIRED','Cet élément du kit exige un modèle consommable.');
   return {...slot,itemId:binding?.itemId??null,itemName:item?.data.name??null,archived:item?.operation==='ARCHIVE'};
  });
  kitPlans.push({...spec,slots,revision:c.data.revision});
 }
 return {kitPlans,diagnostics,publicationAvailable:false};
}
