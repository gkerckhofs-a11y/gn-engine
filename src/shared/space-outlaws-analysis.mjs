// SO_Regles_V07, chapitres 4, 7, 9, 11 et 12. Prepared analyses only;
// no repair, hidden-system access or other class ability is granted.
export const analysisSkills=[['COM-03','Lecture tactique'],['TRA-01','Lecture des traces'],['TRA-03','Vérification documentaire'],['PIL-01','Navigation et itinéraires'],['MEC-01','Diagnostic technique préparé'],['COU-01','Expertise marchande'],['COU-03','Réseau de contacts']];
export function analysisProfile(skillId,{instructions='',bonusItems=[],minLevel=1}={}){
 if(skillId==='COU-03'&&(!Number.isInteger(minLevel)||minLevel<1||minLevel>5))return null;
 if(!analysisSkills.some(([id])=>id===skillId))return null;
 const tactical=skillId==='COM-03',technical=skillId==='MEC-01',automatic=tactical||technical||skillId==='COU-03';
 return {skillId,minLevel:skillId==='COU-03'?minLevel:1,instructions,durationSeconds:skillId==='COU-03'?300:technical||skillId==='COU-01'?60:120,durationByLevel:tactical||skillId==='PIL-01'?{1:120,2:105,3:90,4:75,5:60}:{},
  test:automatic?'AUTO':'D6',threshold:automatic?0:6,cost:1,cooldownSeconds:600,bonusItems:automatic?[]:bonusItems,consumable:null,successText:'Analyse terminée.',failureText:'Les informations ordinaires restent acquises ; aucun supplément obtenu.'};
}
