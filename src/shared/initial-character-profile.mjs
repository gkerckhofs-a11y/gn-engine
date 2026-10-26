import {admissionClasses} from './admission-rules.mjs';

// V0.7, chapter 3 and class sheets. Preparation only: these are not executable
// abilities, historical catalogue IDs, or grants to a session character.
const names={COM:['Vétéran','Désarmement','Lecture tactique'],ROG:['Neutralisation furtive','Vol à la tire','Évasion'],
 TRA:['Lecture des traces','Fouille méthodique','Vérification documentaire'],MED:['Diagnostic','Soins de terrain','Traitement clinique'],
 MEC:['Diagnostic technique','Réparation','Amélioration'],PIL:['Navigation','Préparation de vol','Manœuvres de pilotage'],
 COU:['Expertise marchande','Négociation commerciale','Réseau de contacts'],INF:['Intrusion','Déchiffrement','Falsification']};
export const initialSkillIds=Object.keys(names).flatMap(k=>[1,2,3].map(n=>`${k}-0${n}`));
const fixed=new Set(['COM-01','COM-02','ROG-01']);
export const initialSecondaryChoices=classId=>admissionClasses.filter(c=>c.id!==classId);
export function initialCharacterProfile(classId,secondaryId){
 const model=admissionClasses.find(c=>c.id===classId),secondary=initialSecondaryChoices(classId).find(c=>c.secondaryId===secondaryId);
 if(!model||!secondary)return null;
 return {classId:model.id,className:model.label,skills:[...names[model.id].map((name,i)=>{
  const id=`${model.id}-0${i+1}`;return {id,name,source:'CLASS',kind:fixed.has(id)?'FIXED':'EVOLVING',level:fixed.has(id)?null:2};
 }),{id:secondary.secondaryId,name:secondary.secondaryLabel,source:'INITIATION',kind:'EVOLVING',level:1}],secondarySlotsUsed:1};
}
