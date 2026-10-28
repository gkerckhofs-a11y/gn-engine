import {admissionClasses} from './admission-rules.mjs';

// V0.7, chapter 3. These are preparation slots, never inventory or grants.
// Quantity 1 for plural supplies/tools denotes one prepared set, not a rule
// defining its internal contents. Weapon applicability is decided at birth.
const common=[['communicator','Communicateur',1],['weapon','Arme ordinaire homologuée, si applicable',1]];
const specialized={
 COM:[['armor','Armure légère — 1 protection',1],['field-supplies','Fournitures de terrain (ensemble)',1]],
 ROG:[['discretion-pouch','Pochette de discrétion',1]],
 TRA:[['investigation-scanner','Scanner d’enquête',1]],
 MED:[['medical-tool','Outil médical',1],['medical-supplies','Trousse médicale consommable',2,true]],
 MEC:[['mechanical-tools','Outils mécaniques (ensemble)',1],['repair-supplies','Kit de réparation consommable',2,true],['parts','Lot de pièces — 50 Cr d’usage',1]],
 PIL:[['navigation-terminal','Terminal de navigation',1]],
 COU:[['commercial-terminal','Terminal commercial',1]],
 INF:[['intrusion-interface','Interface fictive de piratage',1],['blank-forms','Formulaire vierge',2]],
};
const notes={COM:'La protection personnelle reste plafonnée à 1 ; aucun effet actif attribué ici.',ROG:'Aucune cache Dissimulation active gratuite.',TRA:'Aucun bonus automatique au dé.',PIL:'Codes commerciaux publics à préparer séparément ; aucun accès accordé ici.',COU:'Contacts initiaux à préparer séparément ; aucun accès accordé ici.'};
export function initialClassKit(classId){
 const c=admissionClasses.find(c=>c.id===classId);if(!c)return null;
 return {classId:c.id,className:c.label,name:`Kit initial — ${c.label}`,slots:[...common,...specialized[c.id]].map(([id,label,quantity,consumable])=>({id,label,quantity,requiresConsumable:consumable===true})),
  note:notes[c.id]??'',startingCredits:200,pillable:false,resellable:false,activationAvailable:false};
}
