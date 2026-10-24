import {validateRecipeItem} from './recipe-state.mjs';

// A private authoring projection, never a publication report. Missing references
// are allowed in the shared draft; no new item, effect or dose is created here.
// null means M1 is not readable, not that its catalogue is empty.
export function centralRecipeProjection(changes,itemChanges){
 const items=itemChanges?.filter(c=>c.type==='item')??[],diagnostics=[];
 const columns={productItemId:'produit_id',components:'composants',skillId:'competence_id',effectId:'effet_id',laboratoryTargetId:'laboratoire_lieu_id',unlockKnowledgeId:'connaissance_id'};
 const add=(c,field,reference,code,message)=>diagnostics.push({...(c.provenance?{fileName:c.provenance.fileName,sheet:c.provenance.sheet,row:c.provenance.row,column:columns[field.split('.')[0]]??field}:{}),workshop:'M4',entityId:c.entityId,field,reference,code,message,source:c.source,draftRevision:c.revision});
 for(const c of changes.filter(c=>c.type==='recipe'&&c.operation==='UPSERT')){
  const r=c.data;
  const check=(field,id)=>{
   if(itemChanges===null){add(c,field,id,'REFERENCE_NOT_CHECKED','Lecture M1 requise pour contrôler cette référence.');return;}
   const item=items.find(i=>i.entityId===id);
   if(!item){add(c,field,id,'REFERENCE_MISSING','Préparer ce modèle dans M1 ou corriger son identifiant.');return;}
   if(item.operation!=='UPSERT'){add(c,field,id,'REFERENCE_ARCHIVED','Restaurer ce modèle dans M1 ou changer la référence.');return;}
   try{validateRecipeItem(r,item.data);}catch(e){
    if(!['RECIPE_INGREDIENT','RECIPE_PRODUCT'].includes(e.code))throw e;
    add(c,field,id,e.code,'Choisir un consommable sans recharge laser ; un ingrédient individuel exige une quantité de 1.');
   }
  };
  if(!r.productItemId)add(c,'productItemId',null,'REFERENCE_REQUIRED','Choisir le modèle M1 de la dose produite.');
  else check('productItemId',r.productItemId);
  if(!r.components.length)add(c,'components',null,'COMPONENTS_REQUIRED','Préparer la composition de la formule.');
  r.components.forEach((component,i)=>check(`components.${i}.itemId`,component.itemId));
  for(const field of ['skillId','effectId','laboratoryTargetId','unlockKnowledgeId']){
   if(r[field])add(c,field,r[field],'REFERENCE_PENDING','Référence conservée ; son contrôle central et son activation restent à raccorder.');
   else if(field!=='unlockKnowledgeId')add(c,field,null,'REFERENCE_REQUIRED','Préparer cette référence avant le futur contrôle global.');
  }
 }
 return {references:{itemsReadable:itemChanges!==null,items:items.map(c=>({id:c.entityId,name:c.data.name,kind:c.data.kind,consumable:c.data.consumable,unit:c.data.unit,laserRecharge:!!c.data.laserRecharge,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source}))},diagnostics,publicationAvailable:false};
}
