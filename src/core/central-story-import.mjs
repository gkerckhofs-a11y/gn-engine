import {centralKnowledgeInput} from './central-knowledge.mjs';
import {centralMissionInput} from './central-missions.mjs';
import {centralStoryColumns,centralStoryCellLimit} from '../shared/central-import-schema.mjs';

const fail=(column,message)=>{throw Object.assign(new Error(message),{column});};
const fields={
 knowledge:{type:['kind','text'],titre:['title','text'],texte:['body','text'],origine:['origin','text',''],partage:['shareMode','text'],verite_mj:['gmTruth','text',''],notes_mj:['gmNotes','text',''],destinataires_initiaux_json:['initialCharacterIds','json',[]],qr_propose:['qrEnabled','bool'],audience_qr:['qrAudience','text'],destinataires_qr_json:['qrCharacterIds','json',[]],competence_qr_id:['qrSkillId','text',null],niveau_competence_qr:['qrSkillLevel','number',null]},
 mission:{titre:['title','text'],description:['description','text',''],notes_mj:['gmNotes','text',''],etapes_json:['steps','json',[]],donneur_personnage_id:['giverCharacterId','text',null],prerequis_informations_json:['requiredKnowledgeIds','json',[]],recompenses_objets_json:['rewardItems','json',[]],conditions:['conditions','text',''],preuves_attendues:['proofExpected','text','']},
};
const validate=(type,v,id,old)=>type==='knowledge'?centralKnowledgeInput(v,id,old):centralMissionInput(v,id,old);
const editable=(type,d)=>Object.fromEntries(Object.values(fields[type]).filter(([field])=>Object.hasOwn(d,field)).map(([field])=>[field,field==='steps'?d.steps.map(({published,...s})=>s):d[field]]));
export function checkStoryCells(type,row){
 for(const column of centralStoryColumns[type])if(String(row[column]??'').length>centralStoryCellLimit)fail(column,`Maximum ${centralStoryCellLimit} caractères par cellule ; utiliser l’éditeur web pour ce contenu.`);
}
export function importedStory(type,row,old){
 const values=old?editable(type,old.data):type==='mission'?{steps:[]}:{};
 for(const [column,[field,kind,cleared]] of Object.entries(fields[type])){
  let value=row[column];if(value===undefined||value==='')continue;
  if(value==='!EFFACER'){if(cleared===undefined)fail(column,'Ce champ obligatoire ne peut pas être effacé.');values[field]=structuredClone(cleared);continue;}
  if(kind==='json'){
   try{value=JSON.parse(value);}catch{fail(column,'Tableau JSON invalide.');}if(!Array.isArray(value))fail(column,'Un tableau JSON est requis.');
   // Use the same validators as web editing, including nested allowlists and IDs.
   const probe=type==='mission'?{title:'Validation',steps:[]}:{kind:'KNOWLEDGE',title:'Validation',body:'Validation',shareMode:'SHOW',qrAudience:'ALL_PLAYERS'};
   try{validate(type,{...probe,[field]:value},row.id);}catch(e){e.column=column;throw e;}
  }else if(kind==='bool'){if(!['OUI','NON'].includes(value))fail(column,'Utiliser OUI ou NON.');value=value==='OUI';}
  else if(kind==='number'){if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))fail(column,'Entier positif ou nul attendu.');value=Number(value);}
  else if(value.startsWith('!!'))value=value.slice(1);
  values[field]=value;
 }
 if(type==='knowledge'&&(values.qrSkillId?!(Number.isSafeInteger(values.qrSkillLevel)&&values.qrSkillLevel>=1&&values.qrSkillLevel<=5):values.qrSkillLevel!=null))fail('niveau_competence_qr','Une compétence renseignée exige un niveau de 1 à 5 ; retirer explicitement les deux champs pour la supprimer.');
 return validate(type,values,row.id,old?.data);
}
export function exportedStory(c){
 const row={id:c.entityId,operation:c.operation==='ARCHIVE'?'ARCHIVER':'MODIFIER',revision:c.data.revision};
 if(c.operation==='ARCHIVE')return row;
 const d=editable(c.type,c.data);
 for(const [column,[field,kind]] of Object.entries(fields[c.type])){
  const value=d[field];row[column]=value==null?'':kind==='json'?JSON.stringify(value):kind==='bool'?(value?'OUI':'NON'):typeof value==='string'&&value.startsWith('!')?`!${value}`:value;
 }
 return row;
}
export const storyImportColumn=(type,field)=>Object.entries(fields[type]).find(([, [key]])=>field===key||field.startsWith(`${key}.`))?.[0]??field;
