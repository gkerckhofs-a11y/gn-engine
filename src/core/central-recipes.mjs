import {centralLocationDiagnostics,centralLocationReferences} from './central-field-targets.mjs';
import {validateRecipeItem} from './recipe-state.mjs';

// A private authoring projection, never a publication report. Missing references
// are allowed in the shared draft; no new item, effect or dose is created here.
// null means the M1/M6 catalogue is not readable, never that it is empty.
export function centralRecipeProjection(changes,itemChanges,knowledgeChanges=null){
 const items=itemChanges?.filter(c=>c.type==='item')??[],knowledge=knowledgeChanges?.filter(c=>c.type==='knowledge')??[],diagnostics=[];
 const columns={productItemId:'produit_id',components:'composants',skillId:'competence_id',effectId:'effet_id',laboratoryTargetId:'laboratoire_lieu_id',unlockKnowledgeId:'connaissance_id'};
 const add=(c,field,reference,code,message)=>diagnostics.push({...(c.provenance?{fileName:c.provenance.fileName,sheet:c.provenance.sheet,row:c.provenance.row,column:columns[field.split('.')[0]]??field}:{}),workshop:'M4',entityId:c.entityId,field,reference,entityType:'recipe',...(field==='unlockKnowledgeId'?{referenceType:'knowledge'}:field==='laboratoryTargetId'?{referenceType:'fieldTarget'}:{}),code,message,source:c.source,draftRevision:c.revision});
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
  if(r.unlockKnowledgeId){
   const target=knowledge.find(c=>c.entityId===r.unlockKnowledgeId);
   if(knowledgeChanges===null)add(c,'unlockKnowledgeId',r.unlockKnowledgeId,'REFERENCE_NOT_CHECKED','Lecture M6 requise pour contrôler la connaissance de déblocage.');
   else if(!target)add(c,'unlockKnowledgeId',r.unlockKnowledgeId,'REFERENCE_MISSING','Préparer cette connaissance dans M6 ou corriger son identifiant.');
   else if(target.operation!=='UPSERT')add(c,'unlockKnowledgeId',r.unlockKnowledgeId,'REFERENCE_ARCHIVED','Restaurer cette connaissance dans M6 ou changer la référence.');
  }
  diagnostics.push(...centralLocationDiagnostics(c,'laboratoryTargetId',r.laboratoryTargetId,knowledgeChanges,true).map(d=>({...d,...(c.provenance?{fileName:c.provenance.fileName,sheet:c.provenance.sheet,row:c.provenance.row,column:columns.laboratoryTargetId}:{})})));
  if(r.laboratoryTargetId)add(c,'laboratoryTargetId',r.laboratoryTargetId,'LABORATORY_AUTHORIZATION_PENDING','Lieu référencé seulement : habilitation du laboratoire et QR de fabrication restent à raccorder.');
  for(const field of ['skillId','effectId']){
   if(r[field])add(c,field,r[field],'REFERENCE_PENDING','Référence conservée ; son contrôle central et son activation restent à raccorder.');
   else add(c,field,null,'REFERENCE_REQUIRED','Préparer cette référence avant le futur contrôle global.');
  }
 }
 return {references:{...centralLocationReferences(knowledgeChanges),itemsReadable:itemChanges!==null,items:items.map(c=>({id:c.entityId,name:c.data.name,kind:c.data.kind,consumable:c.data.consumable,unit:c.data.unit,laserRecharge:!!c.data.laserRecharge,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source})),
  knowledgeReadable:knowledgeChanges!==null,knowledge:knowledge.map(c=>({id:c.entityId,title:c.data.title,kind:c.data.kind,archived:c.operation!=='UPSERT',revision:c.data.revision,source:c.source}))},diagnostics,publicationAvailable:false};
}
