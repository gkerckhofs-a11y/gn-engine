const flag=(name,label,extra={})=>({name,label,choices:[['','Non renseigné / conserver'],['NON','Non'],['OUI','Oui']],...extra});
const number=(name,label,min)=>({name,label,type:'number',min});
const note='Les champs vides conservent les valeurs existantes. La première configuration exige des valeurs explicites. Les autres réglages gardent leurs outils dédiés ; aucune ressource détenue n’est exportée.';
export const parameterEditors={
 personnages:{sheet:'Parametres',title:'Paramètres des personnages',note,fields:[
  flag('groupes_actifs','Groupes activés',{sessionOnly:true}),flag('pa_actifs','Points d’action activés'),
  number('pa_niveau_1','Plafond de PA au niveau 1',1),number('pa_niveau_2','Plafond de PA au niveau 2',1),number('pa_renouvellement_minutes','Renouvellement des PA en minutes de jeu',1),number('pa_cout','Coût commun en PA',0),number('pa_recuperation_secondes','Récupération commune en secondes de jeu',0),number('pa_recuperation_patient_secondes','Récupération du patient en secondes de jeu',0),
  flag('sante_active','Santé activée',{scenarioOnly:true}),{...number('pv_max_defaut','PV maximum par défaut',1),scenarioOnly:true}]},
 economie:{sheet:'Parametres',title:'Paramètres économiques',scenarioOnly:true,note:'Scénario uniquement. Nom et unité de monnaie doivent être renseignés avec son activation initiale. La monnaie des sessions existantes conserve son outil MJ.',fields:[flag('economie_active','Économie activée'),{name:'monnaie_nom',label:'Nom de la monnaie',max:100},{name:'monnaie_unite',label:'Unité de monnaie',max:50}]},
 spatioport:{sheet:'Parametres',title:'Paramètres du spatioport',note:'Port local du jeu : ce code influence les contrôles de navigation. Les ports, carburants et trajets déjà enregistrés sur les vaisseaux ne sont pas réécrits.',fields:[{name:'astroport_id',label:'Code du port local',max:100}]}
};
export const parameterFields=(module,session)=>parameterEditors[module].fields.filter(f=>!(f.scenarioOnly&&session)&&!(f.sessionOnly&&!session));
export function parameterRows(module,session,values){return parameterFields(module,session).filter(f=>values[f.name]!==undefined&&String(values[f.name]).trim()!=='').map(f=>({cle:f.name,valeur:String(values[f.name]).trim()}));}
