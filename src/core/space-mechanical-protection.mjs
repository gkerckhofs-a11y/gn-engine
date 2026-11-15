import {documentId,requireThat} from './validation.mjs';
import {personalLot} from './inventory-state.mjs';
import {gameTime} from './clock.mjs';

export const mechanicalProtection=p=>p?.kind==='PROTECTION'&&['DROID_ARMOR','PERSONAL_SHIELD'].includes(p.protectionType);
export function protectionProfile(input,id,revision,records,s){
 const type=input.protectionType??'ARMOR',mechanical=['DROID_ARMOR','PERSONAL_SHIELD'].includes(type);
 requireThat(type==='ARMOR'||mechanical,'INVALID_PERSON_PROFILE');
 requireThat(!mechanical||s.spaceOutlaws?.mechanicalProtectionVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 const equipment=documentId(input.protectedItemId),supply=documentId(input.consumable?.itemId);
 requireThat(records.items.some(i=>i.id===equipment&&i.versionId===s.spaceOutlaws.versionId&&!i.consumable)&&records.items.some(i=>i.id===supply&&i.versionId===s.spaceOutlaws.versionId&&i.consumable),'FIELD_REFERENCE');
 requireThat(equipment!==supply&&['DRAFT','PUBLISHED'].includes(input.publicationState),'INVALID_PERSON_PROFILE');
 return {id,revision,kind:'PROTECTION',...(mechanical?{protectionType:type}:{}),
  name:mechanical?type==='DROID_ARMOR'?'Recharger un blindage de droïde':'Recharger un bouclier personnel':'Entretien de protection',publicationState:input.publicationState,
  protectedItemId:equipment,skillId:mechanical?'MEC-02':'ENTRETIEN_PROTECTION',minLevel:1,patientNature:type==='DROID_ARMOR'?'DROID':null,test:'AUTO',threshold:0,cost:1,cooldownSeconds:600,
  bonusItems:[],consumable:{itemId:supply,quantity:1},extraConsumables:[],prerequisites:[],durationSeconds:120,durationByLevel:{1:120,2:105,3:90,4:75,5:60},continuationSeconds:0,healAmount:0,reviveLevel:0,convalescenceSeconds:0,patientCooldownSeconds:0,
  instructions:`À l’abri, hors combat, sur soi ou autrui. ${mechanical?'MEC-02 et '+(type==='DROID_ARMOR'?'une pièce de blindage compatible':'une cellule énergétique compatible'):'Entretien de protection et une plaque compatible'}. Restaure 1 protection au maximum, aucun PV. 1 PA ; 120 / 105 / 90 / 75 / 60 secondes selon le niveau. Récupération de cette action : 10 minutes de jeu. ${mechanical?'Aucun atelier requis. Une neutralisation ou une panne doit être levée séparément.':''}`.trim()};
}

export async function protectionEquipment(tx,s,t,p,at){
 const mechanical=mechanicalProtection(p);
 requireThat(!mechanical||s.spaceOutlaws?.mechanicalProtectionVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 if(p.protectionType==='DROID_ARMOR')requireThat(t.nature==='DROID','PATIENT_NATURE_MISMATCH');
 const equipment=await tx.list(`sessions/${s.id}/inventory`,['holderId',t.id]),time=gameTime(s.clock,at);
 const lot=equipment.find(l=>l.item.id===p.protectedItemId&&l.quantity>0&&(p.protectionType==='DROID_ARMOR'
  ?l.status==='INSTALLED'&&l.location?.kind==='DROID_MODULE'&&l.location.id===t.id&&t.droidModules?.some(m=>m.lotId===l.id&&m.code==='DR-01')
  :personalLot(l,t.id)&&l.status==='AVAILABLE'));
 requireThat(lot,'PROTECTION_EQUIPMENT_REQUIRED');
 if(mechanical){
  const module=p.protectionType==='DROID_ARMOR'?t.droidModules.find(m=>m.lotId===lot.id):lot.mechanicalState;
  requireThat(module?.status!=='DAMAGED'&&(module?.neutralizedUntilGameMs??0)<=time,'SO_PROTECTION_DISABLED');
  const current=await tx.get(`sessions/${s.id}/personProfiles/${p.id}`);
  requireThat(current?.publicationState==='PUBLISHED'&&current.revision===p.revision,'FIELD_STATE_CHANGED');
 }
 return lot;
}
