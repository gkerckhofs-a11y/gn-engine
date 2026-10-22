import {terrainActionFields} from './master-terrain-editor.mjs';
const care=['FIELD_CARE','CLINIC_SAFE','CLINIC_FAST'],skilled=[...care,'LOOT_METHODICAL'];
const number=(name,label,max,types,min=0)=>({name,label,type:'number',min,max,required:true,when:{type:types}});
// Shared Master controls; the existing person-profile validator remains authoritative.
const common=terrainActionFields.filter(f=>f.name!=='test').map(f=>{
 if(f.name==='competence_id')return {...f,required:true,when:{type:skilled},inactiveValue:'!EFFACER'};
 if(f.name==='niveau_minimum')return {...f,when:{type:skilled}};
 if(f.name==='seuil')return {...f,when:{type:['CLINIC_FAST']}};
 if(f.name==='recuperation_secondes')return {...f,when:{type:['LOOT_COMMON','LOOT_METHODICAL']},inactiveValue:'0'};
 if(f.name==='consommable_id')return {...f,when:{type:care},inactiveValue:'!EFFACER'};
 if(f.name==='consommable_quantite')return {...f,when:{type:care,consommable_id:'present'}};
 return f;
});
export const interactionEditor={sheet:'Interactions',title:'Interactions entre personnages',name:'nom',collection:'personProfiles',fields:[
 {name:'nom',label:'Nom',required:true,max:150},
 {name:'type',label:'Type d’interaction',choices:[['FIELD_CARE','Soin de terrain'],['CLINIC_SAFE','Clinique sûre'],['CLINIC_FAST','Clinique accélérée'],['LOOT_COMMON','Fouille ordinaire'],['LOOT_METHODICAL','Fouille méthodique']],initial:'FIELD_CARE',refresh:true},
 {name:'publication',label:'Publication',choices:[['DRAFT','Brouillon'],['READY','Prêt'],['PUBLISHED','Publié']],initial:'DRAFT'},
 ...common,
 {name:'prerequis',label:'Compétences supplémentaires requises',type:'levels',ref:'skills',clear:true,help:'Sélectionnez les expertises passives et leur niveau minimum. Maximum 10 prérequis.'},
 {name:'consommables_supplementaires',label:'Consommables supplémentaires',type:'textarea',clear:true,when:{type:care},inactiveValue:'!EFFACER',help:'objet_id:quantité ; autre_id:quantité. Maximum 3 consommables différents au total, consommable principal compris.'},
 number('complement_secondes','Durée supplémentaire après un échec en clinique accélérée',86400,['CLINIC_FAST']),
 number('soin_pv','PV rendus par un soin de terrain',1000,['FIELD_CARE'],1),
 number('niveau_reanimation','Niveau requis pour soigner à zéro PV',100,['FIELD_CARE'],1),
 number('convalescence_secondes','Convalescence après réanimation, en secondes',86400,['FIELD_CARE']),
 number('recuperation_patient_secondes','Récupération du patient après un soin de terrain, en secondes',86400,['FIELD_CARE'])],
 note:'Ces profils utilisent les soins et fouilles de personnages existants. La clinique accélérée utilise un D6 ; les autres types sont sans jet. Les cliniques rendent les PV maximum selon les règles existantes. Les soins ont une récupération personnelle nulle ; le soin de terrain règle celle du patient. Passer à une fouille retire les consommables du profil. Aucun objet détenu, PV, droit privé ou résultat de jeu n’est copié.'};
