// Navigation and import boundaries only. Domain records remain in their existing collections.
export const workshopModules = [
 {id:'personnages',label:'Personnages & Compétences',sheets:['Personnages','Classes','Competences','Attributions','Groupes','Membres','Relations','Dotations','Interactions'],parameters:['groupes_actifs','pa_actifs','pa_niveau_1','pa_niveau_2','pa_renouvellement_minutes','pa_cout','pa_recuperation_secondes','pa_recuperation_patient_secondes','sante_active','pv_max_defaut'],description:'Fiches, groupes, classes, compétences et interactions.'},
 {id:'communication',label:'Missions & Communication',sheets:['Objectifs'],parameters:[],description:'Objectifs des fiches. En session : annonces, contrats et primes. Les rendez-vous restent à développer.'},
 {id:'magasins',label:'Boutiques',sheets:['Objets'],parameters:[],description:'Catalogue commun des objets. Les boutiques avec stock, caisse et QR restent à développer.'},
 {id:'spatioport',label:'Spatioport',sheets:['Vaisseaux','Routes'],parameters:['astroport_id'],description:'Vaisseaux, routes, fret et carburant. Modèles, achats, passagers, interceptions, combats et réparations restent à développer.'},
 {id:'economie',label:'Économie & Stocks',sheets:['Entrepots','Cours','EvenementsEco','Tarifs'],parameters:['economie_active','monnaie_nom','monnaie_unite'],description:'Monnaie, entrepôts, cours, événements et tarifs douaniers.'},
 {id:'informations',label:'Informations & Fouilles',sheets:['Connaissances','Lieux','ActionsTerrain','Recompenses'],parameters:[],description:'Connaissances, lieux, récompenses et installations.'},
];
export const workshopModule = id => workshopModules.find(m=>m.id===id);
export function masterModuleErrors(sheets,selected){
 const declared=sheets.Meta?.[0]?.module, id=selected||declared;
 if(!id)return [];
 const module=workshopModule(id),errors=[];
 const add=(sheet,column,message,row=1)=>errors.push({sheet,row,column,message});
 if(!module){add('Meta','module','Module inconnu.');return errors;}
 if(declared&&declared!==id)add('Meta','module','Ce fichier appartient à un autre module.');
 for(const [sheet,rows] of Object.entries(sheets)){
  if(!['Meta','Parametres',...module.sheets].includes(sheet)&&rows.length)add(sheet,'',`Cet onglet ne relève pas du module ${module.label}. Utilisez le Master complet ou le module correspondant.`);
 }
 for(const r of sheets.Parametres??[])if(!module.parameters.includes(r.cle))add('Parametres','cle',`Ce paramètre ne relève pas du module ${module.label}.`,r._row??2);
 return errors;
}
