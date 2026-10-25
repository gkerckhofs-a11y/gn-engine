// SO_Regles_V07, chapitres 4, 7 et 9. These profiles execute only the three
// location/document analyses; they do not grant other class abilities.
export const analysisSkills=[['COM-03','Lecture tactique'],['TRA-01','Lecture des traces'],['TRA-03','Vérification documentaire']];
export function analysisProfile(skillId,{instructions='',bonusItems=[]}={}){
 if(!analysisSkills.some(([id])=>id===skillId))return null;
 const tactical=skillId==='COM-03';
 return {skillId,minLevel:1,instructions,durationSeconds:120,durationByLevel:tactical?{1:120,2:105,3:90,4:75,5:60}:{},
  test:tactical?'AUTO':'D6',threshold:tactical?0:6,cost:1,cooldownSeconds:600,bonusItems:tactical?[]:bonusItems,consumable:null,successText:'Analyse terminée.',failureText:'Les informations ordinaires restent acquises ; aucun supplément obtenu.'};
}
