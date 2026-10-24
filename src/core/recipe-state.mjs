import {documentId,requireThat,whole} from './validation.mjs';

// SO-06b is an authoring slice. No recipe may become playable before the
// transactional action and the closed effect registry have been implemented.
const check=v=>requireThat(v,'INVALID_RECIPE');
const text=(v,max,required=false)=>{check(typeof v==='string'&&v.length<=max&&(!required||v.trim()));return v.trim();};
const reference=v=>v==null||v===''?null:documentId(v);
export function recipeInput(v,id,old={}){
 check(v&&typeof v==='object'&&!Array.isArray(v));
 requireThat(v.publicationState==='DRAFT','RECIPE_PUBLICATION_UNAVAILABLE');
 check(['ANTIDOTE','MALAISE','SCENARIO'].includes(v.kind));
 const minLevel=whole(v.minLevel,'INVALID_RECIPE');check(minLevel>=1&&minLevel<=5);
 check(Array.isArray(v.components)&&v.components.length<=20);
 const components=v.components.map(c=>{check(c&&typeof c==='object');const quantity=whole(c.quantity,'INVALID_RECIPE');check(quantity>0&&quantity<=1000000);return {itemId:documentId(c.itemId),quantity};});
 check(new Set(components.map(c=>c.itemId)).size===components.length);
 const productItemId=reference(v.productItemId);check(!components.some(c=>c.itemId===productItemId));
 const indicativePrice=v.indicativePrice==null?null:whole(v.indicativePrice,'INVALID_RECIPE');
 return {id,name:text(v.name,150,true),description:text(v.description??'',6000),kind:v.kind,minLevel,
  skillId:reference(v.skillId),productItemId,effectId:reference(v.effectId),laboratoryTargetId:reference(v.laboratoryTargetId),unlockKnowledgeId:reference(v.unlockKnowledgeId),
  components,indicativePrice,gmNotes:text(v.gmNotes??'',10000),publicationState:'DRAFT',masterArchived:v.masterArchived===true,revision:(old.revision??0)+1};
}
export function validateRecipeItem(recipe,item){
 if(recipe.masterArchived)return;
 const component=recipe.components.find(c=>c.itemId===item.id);
 if(component)requireThat(!item.masterArchived&&item.consumable&&!item.laserRecharge&&(item.kind!=='INDIVIDUAL'||component.quantity===1),'RECIPE_INGREDIENT');
 if(recipe.productItemId===item.id)requireThat(!item.masterArchived&&item.consumable&&!item.laserRecharge,'RECIPE_PRODUCT');
}
export function validateRecipeReferences(recipe,records){
 const ref=(kind,id)=>{const record=records[kind]?.find(r=>r.id===id);requireThat(record&&(recipe.masterArchived||!record.masterArchived),'RECIPE_REFERENCE');return record;};
 // Keep archived definitions readable, but an active draft must retain usable references.
 for(const c of recipe.components)validateRecipeItem(recipe,ref('items',c.itemId));
 if(recipe.productItemId)validateRecipeItem(recipe,ref('items',recipe.productItemId));
 if(recipe.skillId)requireThat(ref('skills',recipe.skillId).kind==='PASSIVE','RECIPE_SKILL');
 if(recipe.laboratoryTargetId)ref('fieldTargets',recipe.laboratoryTargetId);
 if(recipe.unlockKnowledgeId)ref('knowledge',recipe.unlockKnowledgeId);
}
