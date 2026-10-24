import {recipeInput,validateRecipeReferences} from './recipe-state.mjs';

export function importRecipes({rows,m,stamp,checkOperation,summary,mark,addError,issue,num,empty,patch}){
 for(const r of rows.Recettes??[])try{
  if(!stamp('Recettes',r))continue;
  const old=m.recipes.get(r.id);checkOperation(r,old);
  let d=patch(r,{kind:'SCENARIO',minLevel:1,components:[],publicationState:'DRAFT',...old},{nom:'name',description:'description',type:'kind',publication:'publicationState',notes_mj:'gmNotes',competence_id:'skillId',produit_id:'productItemId',effet_id:'effectId',laboratoire_lieu_id:'laboratoryTargetId',connaissance_id:'unlockKnowledgeId'});
  if(r.operation==='ARCHIVER'){
   if(Object.entries(r).some(([k,v])=>!['_row','id','operation','version'].includes(k)&&v))issue('operation','ARCHIVER ne contient que id, operation et version.');
  }else{
   if(d.publicationState!=='DRAFT')issue('publication','Publication indisponible : conserver DRAFT jusqu’à la livraison des déblocages, de la fabrication et des effets autorisés.');
   if(!empty(r.niveau_minimum))d.minLevel=num(r.niveau_minimum,'niveau_minimum',true);
   if(!empty(r.prix_indicatif))d.indicativePrice=r.prix_indicatif==='!EFFACER'?null:num(r.prix_indicatif,'prix_indicatif');
   if(!empty(r.composants))d.components=r.composants==='!EFFACER'?[]:r.composants.split(';').map(entry=>{
    const [itemId,quantity,...extra]=entry.trim().split(':');if(extra.length)issue('composants','Utiliser objet_id:quantité ; autre_id:quantité.');
    return {itemId,quantity:num(quantity,'composants',true)};
   });
  }
  d=recipeInput({...d,masterArchived:r.operation==='ARCHIVER'},r.id,old);
  m.recipes.set(r.id,d);mark('recipes',r.id);summary('Recettes',r,old,d);
 }catch(e){addError('Recettes',r,e);}
 const records=Object.fromEntries(Object.entries(m).map(([key,value])=>[key,[...value.values()]]));
 for(const r of m.recipes.values())try{validateRecipeReferences(r,records);}catch(e){addError('Recettes',(rows.Recettes??[]).find(row=>row.id===r.id),Object.assign(e,{masterMessage:`${r.id} : référence absente, archivée ou incompatible (${e.code}). Conserver les objets consommables et les références de cette recette, ou archiver d’abord la recette.`}));}
}
