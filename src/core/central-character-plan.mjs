import {requireThat,documentId} from './validation.mjs';
import {spaceOutlawsProfile} from './preparation-state.mjs';
import {initialCharacterProfile} from '../shared/initial-character-profile.mjs';

export function centralCharacterPlan(value){
 if(value===null)return null;
 requireThat(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['classId','speciesId','secondaryId'].includes(k)),'INVALID_CENTRAL_PROFILE');
 requireThat(initialCharacterProfile(value.classId,value.secondaryId),'INVALID_CENTRAL_PROFILE');
 documentId(value.speciesId);
 return {schemaVersion:1,ruleProfile:spaceOutlawsProfile,classId:value.classId,speciesId:value.speciesId,secondaryId:value.secondaryId};
}
export function storedCharacterPlan(value){
 if(value===null)return null;
 requireThat(value&&value.schemaVersion===1&&value.ruleProfile===spaceOutlawsProfile&&Object.keys(value).every(k=>['schemaVersion','ruleProfile','classId','speciesId','secondaryId'].includes(k)),'INVALID_CENTRAL_PROFILE');
 return centralCharacterPlan({classId:value.classId,speciesId:value.speciesId,secondaryId:value.secondaryId});
}
export function centralPlanProjection(characters,species,add){
 const profiles=[];
 for(const c of characters.filter(c=>c.operation==='UPSERT'&&c.data.creationPlan!=null)){
  let plan;try{plan=storedCharacterPlan(c.data.creationPlan);}catch{add(c,'creationPlan',null,'INVALID_CENTRAL_PROFILE','Corriger les choix de création dans M2.');continue;}
  const target=species.find(s=>s.id===plan.speciesId);
  if(!target)add(c,'creationPlan.speciesId',plan.speciesId,'REFERENCE_MISSING','Préparer cette espèce dans le catalogue narratif M2 partagé ou corriger son identifiant.');
  else if(target.nature!==c.data.nature)add(c,'creationPlan.speciesId',plan.speciesId,'SPECIES_NATURE_MISMATCH','La nature de la fiche doit correspondre à celle de son espèce narrative.');
  profiles.push({characterId:c.entityId,speciesId:plan.speciesId,speciesLabel:target?.label??null,...initialCharacterProfile(plan.classId,plan.secondaryId)});
 }
 return profiles;
}
