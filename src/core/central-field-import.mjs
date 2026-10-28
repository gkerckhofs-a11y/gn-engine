import {centralFieldTargetInput,centralFieldTargetEditable} from './central-field-targets.mjs';
import {centralFieldColumns,centralStoryCellLimit} from '../shared/central-import-schema.mjs';

const fields={nature:['kind','text'],titre:['title','text'],description:['description','text',''],notes_mj:['gmNotes','text',''],profils_json:['profiles','object'],recompenses_json:['rewards','array',[]],dependance_installation_id:['dependencyId','text',null],indisponibilite_secondes:['offlineSeconds','number'],verrou_echec_secondes:['failureLockSeconds','number'],protection_reparation_secondes:['repairProtectionSeconds','number']};
const fail=(column,message)=>{throw Object.assign(new Error(message),{column});};
export function checkFieldCells(row){for(const column of centralFieldColumns)if(String(row[column]??'').length>centralStoryCellLimit)fail(column,`Maximum ${centralStoryCellLimit} caractères par cellule ; utiliser l’éditeur web pour ce contenu.`);}
export function importedField(row,old){
 const data=old?centralFieldTargetEditable(old.data):{};
 for(const [column,[key,kind,cleared]] of Object.entries(fields)){
  let value=row[column];if(value===undefined||value==='')continue;
  if(value==='!EFFACER'){if(cleared===undefined)fail(column,'Ce champ obligatoire ne peut pas être effacé.');value=structuredClone(cleared);}
  else if(['object','array'].includes(kind)){
   try{value=JSON.parse(value);}catch{fail(column,'JSON invalide.');}
   if(kind==='array'?!Array.isArray(value):!value||typeof value!=='object'||Array.isArray(value))fail(column,kind==='array'?'Tableau JSON requis.':'Objet JSON requis.');
  }else if(kind==='number'){if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))fail(column,'Entier positif ou nul attendu.');value=Number(value);}
  else if(value.startsWith('!!'))value=value.slice(1);
  data[key]=value;
 }
 // A newly created XLSX definition must state its parameters explicitly. No
 // probe defaults are persisted; both profiles and rewards use native validators.
 for(const column of ['nature','titre','profils_json','recompenses_json','indisponibilite_secondes','verrou_echec_secondes','protection_reparation_secondes'])if(data[fields[column][0]]===undefined)fail(column,'Champ obligatoire à renseigner.');
 // Executable analyses use a coupled canonical profile and tiered information.
 // Preserve that native contract when an existing M6 file is read back.
 if(data.kind==='ANALYSIS')return centralFieldTargetInput(data,row.id,old?.data);
 const probe={kind:'INSTALLATION',title:'Validation',profiles:{SABOTAGE:{test:'AUTO',durationSeconds:0},REPAIR:{test:'AUTO',durationSeconds:0}},rewards:[]};
 for(const [column,[key]] of Object.entries(fields)){
  if(key==='profiles'||key==='rewards'||key==='dependencyId')continue;
  try{centralFieldTargetInput({...probe,[key]:data[key],...(key==='kind'&&data.kind==='SEARCH'?{profiles:{SEARCH:{test:'AUTO',durationSeconds:0}},rewards:[{id:'probe',kind:'CREDITS',quantity:1,stock:1,perCharacter:1}]}:{})},row.id);}catch(e){e.column=column;throw e;}
 }
 const rewardProbe={id:'probe',kind:'CREDITS',quantity:1,stock:1,perCharacter:1};
 try{centralFieldTargetInput({...probe,kind:data.kind,profiles:data.profiles,rewards:data.kind==='SEARCH'?[rewardProbe]:[]},row.id);}catch(e){e.column='profils_json';throw e;}
 try{centralFieldTargetInput({...probe,kind:data.kind,profiles:data.profiles,rewards:data.rewards},row.id);}catch(e){e.column='recompenses_json';throw e;}
 try{return centralFieldTargetInput(data,row.id,old?.data);}catch(e){if(data.dependencyId&&e.code!=='CENTRAL_FIELD_TARGET_SIZE')e.column='dependance_installation_id';throw e;}
}
export function exportedField(c){
 const row={id:c.entityId,operation:c.operation==='ARCHIVE'?'ARCHIVER':'MODIFIER',revision:c.data.revision};if(c.operation==='ARCHIVE')return row;
 const data=centralFieldTargetEditable(c.data);
 for(const [column,[key,kind]] of Object.entries(fields)){const v=data[key];row[column]=v==null?'':['object','array'].includes(kind)?JSON.stringify(v):typeof v==='string'&&v.startsWith('!')?`!${v}`:v;}
 return row;
}
export const fieldImportColumn=field=>Object.entries(fields).find(([, [key]])=>field===key||field.startsWith(`${key}.`))?.[0]??field;
