import {effectiveFieldState} from './field-state.mjs';
import {createHash} from 'node:crypto';
import {gameTime} from './clock.mjs';
import {abilityLevel} from './abilities.mjs';
import {documentId,requireThat} from './validation.mjs';
import {personalLot,newLot,lotState} from './inventory-state.mjs';
import {documentReceiptAvailable} from './document-access.mjs';
import {activeMalaise,malaiseId,toxicologySummary} from './space-toxicology-state.mjs';
import {requireGameAction} from './health-state.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const base=s=>'sessions/'+s.id;
const closed=s=>requireThat(s.spaceOutlaws?.toxicologyVersion===1,'SO_TOXI_CLOSED');
export const isToxi=p=>['TOXI_CRAFT','TOXI_TREAT'].includes(p?.kind);
export const validToxiRecipe=r=>r&&['ANTIDOTE','MALAISE'].includes(r.kind)&&r.skillId==='TOXI-01'&&r.effectId===malaiseId&&r.productItemId&&r.laboratoryTargetId&&r.unlockKnowledgeId&&r.components?.length>0&&r.minLevel>=(r.kind==='MALAISE'?2:1)&&(r.kind!=='ANTIDOTE'||r.compatibleRecipeIds?.length>0);
export async function knownRecipe(tx,s,c,r,at){
 const k=await tx.get(base(s)+'/knowledge/'+r.unlockKnowledgeId),receipt=await tx.get(base(s)+'/characters/'+c.id+'/knowledge/'+r.unlockKnowledgeId);
 return k?.publicationState==='PUBLISHED'&&receipt?.snapshot?.revision===k.revision&&await documentReceiptAvailable(tx,s.id,c.id,receipt,at);
}
function profile(r,craft){return {id:`SO-TOXI-${craft?'CRAFT':'TREAT'}-${hash(r.id)}`,revision:r.revision,publicationState:'PUBLISHED',name:(craft?'Fabriquer : ':'Traiter avec : ')+r.name,kind:craft?'TOXI_CRAFT':'TOXI_TREAT',recipe:r,skillId:'TOXI-01',minLevel:r.minLevel,prerequisites:[],patientNature:craft?null:'HUMANOID',cost:1,cooldownSeconds:craft?600:0,durationSeconds:craft?300:120,durationByLevel:craft?{}:{1:120,2:105,3:90,4:75,5:60},test:'AUTO',threshold:0,consumable:craft?r.components[0]:{itemId:r.productItemId,quantity:1},extraConsumables:craft?r.components.slice(1):[],bonusItems:[],continuationSeconds:0,healAmount:0,reviveLevel:0,convalescenceSeconds:0,patientCooldownSeconds:0,instructions:craft?'Au laboratoire indiqué : 1 PA, cinq minutes et les composants préparés. Aucun produit réel.':'Auprès du patient : 1 PA et une dose d’antidote compatible. Identifier la substance en jeu ; aucun PV restauré.'};}
export async function toxiProfiles(tx,s,c,t,at){
 if(s.spaceOutlaws?.toxicologyVersion!==1||abilityLevel(c,'TOXI-01')<1)return [];
 const recipes=await tx.list(base(s)+'/recipes',null,{limit:101});requireThat(recipes.length<=100,'SO_RELEASE_LIMIT');const result=[];
 for(const r of recipes.filter(r=>r.publicationState==='PUBLISHED'&&validToxiRecipe(r)&&r.minLevel<=abilityLevel(c,'TOXI-01'))){if(c.id===t.id){if(await knownRecipe(tx,s,c,r,at))result.push(profile(r,true));}else if(r.kind==='ANTIDOTE')result.push(profile(r,false));}return result;
}
export async function requireToxi(tx,s,c,t,p,input,at){
 closed(s);requireThat(isToxi(p),'SO_TOXI_RECIPE');const r=await tx.get(base(s)+'/recipes/'+p.recipe.id);
 requireThat(validToxiRecipe(r)&&r.publicationState==='PUBLISHED'&&r.versionId===s.versionId&&r.revision===p.recipe.revision,'SO_TOXI_RECIPE');
 if(p.kind==='TOXI_CRAFT'){
  requireThat(c.id===t.id&&input.laboratoryId===r.laboratoryTargetId,'SO_TOXI_LAB');
  const lab=await tx.get(base(s)+'/fieldTargets/'+r.laboratoryTargetId),state=await tx.get(base(s)+'/fieldStates/'+r.laboratoryTargetId);
  requireThat(lab?.publicationState==='PUBLISHED'&&lab.laboratory===true&&state&&effectiveFieldState(s,state,at).status==='ONLINE'&&!state.activeActionId,'SO_TOXI_LAB');
  requireThat(await knownRecipe(tx,s,c,r,at),'SO_TOXI_RECIPE');
 }else{
  const effect=activeMalaise(s,t,at);requireThat(t.nature==='HUMANOID'&&t.hp>0&&!t.survival?.dead&&effect,'SO_TOXI_EFFECT');
  requireThat(input.substanceId===effect.recipeId,'SO_TOXI_IDENTIFICATION');
  requireThat(r.compatibleRecipeIds.includes(effect.recipeId),'SO_TOXI_ANTIDOTE');
 }
 return r;
}
export async function checkAntidote(tx,s,a,lots){
 if(a.kind!=='TOXI_TREAT')return;
 const supply=a.supplies[0],lot=lots.find(l=>l.id===supply.lotId),dose=lot?await tx.get(base(s)+'/toxicDoses/'+lot.id):null;
 requireThat(dose?.status==='FABRICATED'&&dose.recipe.id===a.profile.recipe.id&&dose.recipe.revision===a.profile.recipe.revision&&lot.origin?.kind==='SO_TOXICOLOGY'&&lot.origin.recipeId===dose.recipe.id&&lot.origin.recipeRevision===dose.recipe.revision&&lot.item.id===dose.recipe.productItemId&&lot.quantity===1,'SO_TOXI_ANTIDOTE');
 return dose;
}
export function makeDose(tx,s,c,r,id,at,item){
 const lot=newLot(id,item,1,c.id,at,{kind:'SO_TOXICOLOGY',recipeId:r.id,recipeRevision:r.revision});
 tx.set(base(s)+'/inventory/'+id,lot);tx.set(base(s)+'/toxicDoses/'+id,{id,status:'FABRICATED',recipe:r,createdAt:at,createdBy:c.id});
 tx.set(base(s)+'/inventory/'+id+'/history/'+id,{id,at,kind:'TOXI_FABRICATED',before:null,after:lotState(lot)});
 return {doseId:id,name:item.name};
}
export function treatDose(tx,s,t,dose,a,id,at){
 const effect=activeMalaise(s,t,at);requireThat(effect,'SO_TOXI_EFFECT');const next={...t,toxicology:{...effect,status:'TREATED',treatedAtGameMs:gameTime(s.clock,at),treatmentActionId:a.id},healthRevision:t.healthRevision+1};
 tx.set(base(s)+'/toxicDoses/'+dose.id,{...dose,status:'CONSUMED',consumedAt:at,actionId:a.id,targetId:t.id});
 tx.set(base(s)+'/characters/'+t.id+'/healthHistory/'+id,{id,at,kind:'TOXI_TREATED',actionId:a.id,before:{hp:t.hp,toxicology:effect},after:{hp:t.hp,toxicology:next.toxicology}});return next;
}
export const toxicologyReads=['myToxicology','toxicDose'];
export const toxicologyWrites=['placeToxicDose','retireToxicDose','activateToxicDose'];
export async function doseCommand(tx,s,c,r,action,input,{at,id,actor}){
 closed(s);
 if(action==='myToxicology'){
  const lots=await tx.list(base(s)+'/inventory',['holderId',c.id],{limit:1001});requireThat(lots.length<=1000,'SO_RELEASE_LIMIT');const doses=[];
  for(const lot of lots.filter(l=>l.origin?.kind==='SO_TOXICOLOGY'&&l.quantity===1)){const d=await tx.get(base(s)+'/toxicDoses/'+lot.id);if(d)doses.push({id:d.id,name:lot.item.name,kind:d.recipe.kind,status:d.status});}
  return {sessionId:s.id,characterId:c.id,effect:toxicologySummary(s,c,at),doses};
 }
 const doseId=documentId(input.doseId),d=await tx.get(base(s)+'/toxicDoses/'+doseId),lot=await tx.get(base(s)+'/inventory/'+doseId);
 requireThat(d&&lot&&lot.origin?.kind==='SO_TOXICOLOGY'&&validToxiRecipe(d.recipe)&&d.recipe.id===lot.origin.recipeId&&d.recipe.revision===lot.origin.recipeRevision&&lot.item.id===d.recipe.productItemId,'SO_TOXI_DOSE');
 if(action==='toxicDose')return {id:d.id,name:lot.item.name,available:d.status==='PLACED'&&lot.quantity===1&&d.recipe.kind==='MALAISE',instructions:'Activer volontairement l’effet de cet objet fictif. Aucun produit réel ni ingestion.'};
 const op='operations/'+hash(actor.uid+':'+documentId(input.requestId)),fingerprint=hash(JSON.stringify([action,input])),old=await tx.get(op);
 if(old){requireThat(old.fingerprint===fingerprint&&old.characterId===c.id&&old.accessVersion===r.accessVersion,'FORBIDDEN');return old.result;}
 requireThat(s.stage==='EN_JEU'&&!s.safetyStop?.active,'SESSION_NOT_RUNNING');let result;
 if(action==='activateToxicDose'){
  requireThat(input.voluntary===true&&input.present===true,'SO_TOXI_VOLUNTARY');
  requireThat(d.status==='PLACED'&&lot.status==='FIELD_RESERVED'&&lot.fieldActionId==='DOSE:'+d.id&&lot.quantity===1&&d.recipe.kind==='MALAISE','SO_TOXI_DOSE');
  requireThat(c.hp>0&&!c.survival?.dead,'SO_TOXI_EFFECT');const immune=c.nature==='DROID',oldEffect=activeMalaise(s,c,at),time=gameTime(s.clock,at);
  const next={...c,...(!immune&&!oldEffect?{toxicology:{effectId:malaiseId,status:'ACTIVE',recipeId:d.recipe.id,recipeName:d.recipe.name,sourceDoseId:d.id,startedAtGameMs:time,expiresAtGameMs:time+900000},healthRevision:c.healthRevision+1}:{})};
  tx.set(base(s)+'/inventory/'+d.id,{...lot,quantity:0,status:'CONSUMED',fieldActionId:null,revision:lot.revision+1});tx.set(base(s)+'/toxicDoses/'+d.id,{...d,status:'CONSUMED',consumedAt:at,targetId:c.id});
  if(!immune&&!oldEffect)tx.set(base(s)+'/characters/'+c.id,next);
  tx.set(base(s)+'/characters/'+c.id+'/healthHistory/'+id,{id,at,kind:'TOXI_ACTIVATED',before:{hp:c.hp,toxicology:c.toxicology??null},after:{hp:next.hp,toxicology:next.toxicology??null},doseId:d.id,immune,stacked:!!oldEffect});
  result={status:'CONSUMED',immune,effect:toxicologySummary(s,next,at)};
 }else{
  requireThat(personalLot(lot,c.id)&&lot.quantity===1,'FORBIDDEN');requireGameAction(s,c,'discover',at);requireThat(!c.activeFieldActionId&&!c.activePersonActionId,'FIELD_ACTOR_BUSY');requireThat(input.present===true,'FIELD_PRESENCE_REQUIRED');
  if(action==='placeToxicDose'){requireThat(d.status==='FABRICATED'&&lot.status==='AVAILABLE'&&d.recipe.kind==='MALAISE','SO_TOXI_DOSE');tx.set(base(s)+'/inventory/'+d.id,{...lot,status:'FIELD_RESERVED',fieldActionId:'DOSE:'+d.id,revision:lot.revision+1});tx.set(base(s)+'/toxicDoses/'+d.id,{...d,status:'PLACED',placedAt:at});result={status:'PLACED'};}
  else{requireThat(action==='retireToxicDose'&&(d.status==='FABRICATED'&&lot.status==='AVAILABLE'||d.status==='PLACED'&&lot.status==='FIELD_RESERVED'&&lot.fieldActionId==='DOSE:'+d.id),'SO_TOXI_DOSE');tx.set(base(s)+'/inventory/'+d.id,{...lot,quantity:0,status:'CONSUMED',fieldActionId:null,revision:lot.revision+1});tx.set(base(s)+'/toxicDoses/'+d.id,{...d,status:'RETIRED',retiredAt:at});result={status:'RETIRED'};}
 }
 tx.set(base(s)+'/inventory/'+d.id+'/history/'+id,{id,at,kind:action,doseId:d.id,characterId:c.id,status:result.status});tx.set(base(s)+'/audit/'+id,{id,at,action,actorUid:actor.uid,doseId:d.id,characterId:c.id});tx.set(op,{fingerprint,result,at,characterId:c.id,accessVersion:r.accessVersion});return result;
}
