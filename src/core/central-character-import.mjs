import {centralCharacterInput} from './central-characters.mjs';
import {storedCharacterPlan} from './central-character-plan.mjs';
import {centralCharacterColumns,centralCharacterCellLimit} from '../shared/central-import-schema.mjs';

const fail=(column,message)=>{throw Object.assign(new Error(message),{column});};
const fields={nom:['displayName',undefined],profession:['profession',''],description:['description',''],nature:['nature',null],biographie:['biography',''],interpretation:['roleplay',''],secrets_joueur:['playerSecrets',''],notes_mj:['gmNotes',''],objectifs_json:['objectives',[]],relations_json:['relations',[]]};
const narrative=rows=>(rows??[]).map(({published,...row})=>({...row,...(row.steps?{steps:row.steps.map(({published,...step})=>step)}:{})}));
const rawPlan=plan=>{const p=storedCharacterPlan(plan);return p===null?null:{classId:p.classId,speciesId:p.speciesId,secondaryId:p.secondaryId};};
export function importedCharacter(row,old){
 const d=old?.data,values={displayName:d?.public?.displayName??'',profession:d?.public?.profession??'',description:d?.public?.description??'',nature:d?.nature??null,
  biography:d?.biography??'',roleplay:d?.roleplay??'',playerSecrets:d?.playerSecrets??'',gmNotes:d?.gmNotes??'',objectives:narrative(d?.objectives),relations:narrative(d?.relations),
  ...(d&&Object.hasOwn(d,'creationPlan')?{creationPlan:rawPlan(d.creationPlan)}:{})};
 for(const [column,[field,cleared]] of Object.entries(fields)){
  let value=row[column];if(value===undefined||value==='')continue;
  if(value==='!EFFACER'){if(cleared===undefined)fail(column,'Ce champ obligatoire ne peut pas être effacé.');values[field]=structuredClone(cleared);}
  else if(column.endsWith('_json')){try{values[field]=JSON.parse(value);}catch{fail(column,'Tableau JSON invalide.');}if(!Array.isArray(values[field]))fail(column,'Un tableau JSON est requis.');
   try{centralCharacterInput({displayName:'Validation',nature:null,objectives:[],relations:[],[field]:values[field]},row.id);}catch(e){e.column=column;throw e;}}
  else values[field]=value.startsWith('!!')?value.slice(1):value;
 }
 const mode=row.profil_initial,choices=['classe_id','espece_id','initiation_id'];
 if(mode==='JOUEUR'){
  if(choices.some(k=>!row[k]||row[k]==='!EFFACER'))fail('profil_initial','Renseigner ensemble classe_id, espece_id et initiation_id.');
  values.creationPlan={classId:row.classe_id,speciesId:row.espece_id,secondaryId:row.initiation_id};
 }else{
  if(mode&&!['SANS','!EFFACER'].includes(mode))fail('profil_initial','Utiliser JOUEUR ou SANS ; vide conserve le plan.');
  if(choices.some(k=>row[k]))fail('profil_initial','Les choix de classe, espèce et initiation exigent le mode JOUEUR.');
  if(mode)values.creationPlan=null;
 }
 try{return centralCharacterInput(values,row.id,d);}catch(e){
  if(e.code==='INVALID_CENTRAL_PROFILE')e.column='profil_initial';
  throw e;
 }
}
export function exportedCharacter(c){
 const d=c.data,row={id:c.entityId,operation:c.operation==='ARCHIVE'?'ARCHIVER':'MODIFIER',revision:d.contentRevision};
 if(c.operation==='ARCHIVE')return row;
 const values={...d,...d.public,objectives:narrative(d.objectives),relations:narrative(d.relations)};
 for(const [column,[field]] of Object.entries(fields)){
  const value=values[field];row[column]=value==null?'':column.endsWith('_json')?JSON.stringify(value):typeof value==='string'&&value.startsWith('!')?`!${value}`:value;
 }
 if(Object.hasOwn(d,'creationPlan')){const p=rawPlan(d.creationPlan);Object.assign(row,p?{profil_initial:'JOUEUR',classe_id:p.classId,espece_id:p.speciesId,initiation_id:p.secondaryId}:{profil_initial:'SANS'});}
 return row;
}
export function checkCharacterCells(row){
 for(const column of centralCharacterColumns)if(String(row[column]??'').length>centralCharacterCellLimit)fail(column,`Maximum ${centralCharacterCellLimit} caractères par cellule M2 ; utiliser l’éditeur web pour ce contenu.`);
}
export const characterImportColumn=field=>field.startsWith('relations.')?'relations_json':field==='creationPlan.speciesId'?'espece_id':field.startsWith('creationPlan')?'profil_initial':field;
