import {documentId,requireThat} from './validation.mjs';
export const isClinic=p=>['CLINIC_SAFE','CLINIC_FAST'].includes(p?.kind);
export const clinicForLevel=(s,p,level)=>s.spaceOutlaws?.workshopVersion===1&&p.kind==='CLINIC_FAST'&&p.patientNature==='DROID'&&level>=5?{...p,test:'AUTO',threshold:0,bonusItems:[],instructions:p.instructions+' Niveau 5 : réussite automatique, sans dé ni bonus.'}:p;
export function clinicProfile(input,id,revision,records,session){
 requireThat(isClinic(input)&&id.startsWith('SO-CLINIC-')&&['DRAFT','PUBLISHED'].includes(input.publicationState),'INVALID_PERSON_PROFILE');
 requireThat(input.patientNature==null||['HUMANOID','DROID'].includes(input.patientNature),'INVALID_PERSON_PROFILE');
 const mechanical=input.patientNature==='DROID',care=records.personProfiles.find(p=>p.id===(mechanical?'SO-MEC-02':'SO-MED-02'));
 const clinicTargetId=documentId(input.clinicTargetId),bactaId=mechanical?care?.partsItemId:documentId(input.bactaId);
 requireThat(!mechanical||session.spaceOutlaws?.workshopVersion===1,'SO_GAMEPLAY_NOT_OPEN');
 const kit=care?.consumable?.itemId;
 const target=records.fieldTargets.find(t=>t.id===clinicTargetId&&t.publicationState==='PUBLISHED');
 requireThat(target&&kit&&bactaId!==kit&&records.items.some(i=>i.id===bactaId&&(mechanical||i.consumable)&&i.versionId===session.spaceOutlaws.versionId),'FIELD_REFERENCE');
 const fast=input.kind==='CLINIC_FAST';
 const bonusItems=(input.bonusItems??[]).map(b=>{requireThat([1,2].includes(b.bonus)&&records.items.some(i=>i.id===b.itemId&&!i.consumable&&i.versionId===session.spaceOutlaws.versionId),'FIELD_REFERENCE');return {itemId:documentId(b.itemId),bonus:b.bonus};});
 requireThat(bonusItems.length<=20&&new Set(bonusItems.map(b=>b.itemId)).size===bonusItems.length&&(fast||!bonusItems.length),'INVALID_PERSON_PROFILE');
 return {id,revision,kind:input.kind,publicationState:input.publicationState,name:`${mechanical?'Révision en atelier':'Clinique'} ${target.title} — ${fast?'accéléré':'sûr'}`,clinicTargetId,clinicTargetRevision:target.revision,clinicTitle:target.title,
  ...(mechanical?{partsItemId:bactaId}:{}),skillId:mechanical?'MEC-02':'MED-03',minLevel:2,prerequisites:[{skillId:mechanical?'MEC-01':'MED-02',minLevel:2}],patientNature:mechanical?'DROID':'HUMANOID',cost:1,cooldownSeconds:0,
  test:fast?'D6':'AUTO',threshold:fast?6:0,durationSeconds:fast?180:300,durationByLevel:fast?{2:180,3:165,4:150,5:135}:{2:300,3:270,4:240,5:210},
  continuationSeconds:fast?120:0,consumable:{itemId:kit,quantity:1},extraConsumables:[{itemId:bactaId,quantity:1}],bonusItems,
  healAmount:0,reviveLevel:2,convalescenceSeconds:0,patientCooldownSeconds:0,
  instructions:`${mechanical?`Dans l’atelier équipé ${target.title}, auprès d’un autre droïde consentant ou hors combat. MEC-02 N2 et MEC-01 N2 requis. 1 PA, un composant compatible et un lot de pièces de 50 Cr d’usage. PV au maximum, fin du recalibrage ; aucun effet sur la protection ou les modules.`:`Dans la clinique équipée ${target.title}, avec un autre patient humanoïde consentant ou hors combat. MED-03 N2 et MED-02 N2 requis. 1 PA, une trousse médicale et une dose de bacta. PV au maximum, fin de convalescence ; aucun effet sur la protection ou les substances.`} ${fast?'Après un échec : deux minutes supplémentaires sans second jet ni dépense ; interruption sans remboursement.':'Ressources consommées à la résolution.'}`};
}
export async function requireClinic(tx,s,p){
 if(!s.spaceOutlaws||!isClinic(p))return;
 requireThat(p.id.startsWith('SO-CLINIC-')&&(p.patientNature!=='DROID'||s.spaceOutlaws.workshopVersion===1),'SO_GAMEPLAY_NOT_OPEN');
 const target=await tx.get(`sessions/${s.id}/fieldTargets/${p.clinicTargetId}`),state=await tx.get(`sessions/${s.id}/fieldStates/${p.clinicTargetId}`);
 requireThat(target?.publicationState==='PUBLISHED'&&target.revision===p.clinicTargetRevision&&state?.status==='ONLINE','FIELD_UNAVAILABLE');
}
