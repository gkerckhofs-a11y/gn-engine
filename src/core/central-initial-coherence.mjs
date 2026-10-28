import {admissionClasses} from '../shared/admission-rules.mjs';

// Called only by the authorized global check, on its validated transaction
// snapshot. Counts are definitions, never admissions, quotas or incarnations.
export function centralInitialCoherence(records,invalidIds,kitDiagnostics){
 const characters=records.filter(c=>c.type==='character'),active=characters.filter(c=>c.operation==='UPSERT');
 const planned=active.filter(c=>c.data.creationPlan!=null),diagnostics=[];
 const messages={
  MISSING:'Préparer dans M1 le kit de la classe principale de cette fiche.',
  ARCHIVED:'Restaurer le kit de cette classe dans M1 ou corriger la classe de la fiche M2.',
  INVALID:'Corriger la définition incohérente du kit de cette classe dans M1.',
  INCOMPLETE:'Corriger les références ou les consommables du kit dans M1 ; consulter ses diagnostics détaillés.',
 };
 const classes=admissionClasses.map(({id,label})=>{
  const kit=records.find(c=>c.type==='classKit'&&c.entityId===id),users=planned.filter(c=>c.data.creationPlan.classId===id);
  const kitStatus=invalidIds.has(`classKit_${id}`)?'INVALID':!kit?'MISSING':kit.operation==='ARCHIVE'?'ARCHIVED':
   kitDiagnostics.some(d=>d.entityType==='classKit'&&d.entityId===id)?'INCOMPLETE':'REFERENCES_CHECKED';
  if(kitStatus!=='REFERENCES_CHECKED')for(const c of users)diagnostics.push({workshop:'M2',entityType:'character',entityId:c.entityId,
   field:'creationPlan.classId',reference:id,referenceType:'classKit',code:`CLASS_KIT_${kitStatus}`,message:messages[kitStatus]});
  return {classId:id,className:label,characterIds:users.map(c=>c.entityId),plannedCharacters:users.length,kitStatus};
 });
 return {summary:{scope:'CLASS_KIT_REFERENCES',plannedCharacters:planned.length,narrativeOnlyCharacters:active.length-planned.length,
  archivedCharacters:characters.length-active.length,requiredClasses:classes.filter(c=>c.plannedCharacters>0).length,classes},diagnostics};
}
