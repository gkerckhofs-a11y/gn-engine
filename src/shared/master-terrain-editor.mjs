// Form definitions only; every value is submitted through the existing Master import.
const text=(name,label,max=4000)=>({name,label,type:'textarea',max,clear:true});
const number=(name,label,min,max,extra={})=>({name,label,type:'number',min,max,...extra});
const ref=(name,label,ref,extra={})=>({name,label,ref,clear:true,...extra});
const choice=(name,label,choices,initial,extra={})=>({name,label,choices,initial,...extra});
const installation={type:['INSTALLATION']};
export const terrainEditor={sheet:'Lieux',title:'Lieux, actions et récompenses',name:'titre',collection:'fieldTargets',groupedTerrain:true,fields:[
 {name:'titre',label:'Titre du lieu',required:true,max:150},
 choice('type','Nature du lieu',[['SEARCH','Fouille'],['INSTALLATION','Installation']],'SEARCH',{immutable:true,refresh:true}),
 choice('publication','Publication',[['DRAFT','Brouillon'],['READY','Prêt'],['PUBLISHED','Publié']],'DRAFT'),
 text('description','Description',6000),text('notes_mj','Notes réservées au MJ',10000),
 ref('installation_id','Installation dont dépend cette fouille','installations',{when:{type:['SEARCH']},inactiveValue:'!EFFACER'}),
 number('panne_secondes','Durée de la panne en secondes (0 : jusqu’à réparation)',0,604800,{required:true,when:installation}),
 number('verrou_echec_secondes','Verrou après échec en secondes',0,86400,{required:true,when:installation}),
 number('protection_reparation_secondes','Protection après réparation en secondes',0,86400,{required:true,when:installation})],
 note:'Un lieu, ses actions et ses récompenses sont vérifiés ensemble. Les compétences, objets et connaissances référencés doivent déjà exister. Les stocks consommés, réservations et résultats de jeu ne sont jamais copiés. En session, les récompenses existantes sont protégées ; leur réapprovisionnement conserve son outil MJ.'};
export const terrainActionFields=[
 ref('competence_id','Compétence requise','skills',{refresh:true}),number('niveau_minimum','Niveau minimum',1,100,{required:true,when:{competence_id:'present'}}),
 text('instructions','Instructions de jeu'),number('duree_secondes','Durée en secondes de jeu',0,86400,{required:true}),
 {...text('durees_niveaux','Durées selon le niveau'),help:'Facultatif : niveau:secondes ; autre_niveau:secondes. Vide : durée commune.'},
 choice('test','Résolution',[['AUTO','Sans jet'],['D6','D6 + niveau + bonus']],'AUTO',{refresh:true}),
 number('seuil','Seuil du jet',0,10000,{required:true,when:{test:['D6']},inactiveValue:'0'}),
 number('cout_pa','Coût en PA',0,1000,{clear:true,help:'Vide : coût défini par les règles de la session.'}),
 number('recuperation_secondes','Récupération en secondes',0,86400,{clear:true,help:'Vide : récupération définie par les règles de la session.'}),
 {...text('bonus_objets','Bonus des objets'),help:'Facultatif : objet_id:bonus ; autre_id:bonus. Les bornes sont celles du moteur existant (0 à 2).'},
 ref('consommable_id','Consommable requis','fieldConsumables',{refresh:true}),number('consommable_quantite','Quantité consommée',1,1000000,{required:true,when:{consommable_id:'present'}}),
 text('texte_reussite','Texte de réussite'),text('texte_echec','Texte d’échec')];
export const terrainRewardFields=[
 choice('type','Nature de la récompense',[['CREDITS','Crédits de jeu'],['ITEM','Objet'],['KNOWLEDGE','Connaissance / indice']],'ITEM',{refresh:true}),
 ref('objet_id','Objet reçu','items',{required:true,clear:false,when:{type:['ITEM']},inactiveValue:'!EFFACER'}),
 ref('connaissance_id','Connaissance reçue','knowledge',{required:true,clear:false,when:{type:['KNOWLEDGE']},inactiveValue:'!EFFACER'}),
 number('quantite','Quantité par découverte',1,1000000,{required:true,help:'Objet individuel ou connaissance : renseigner 1.'}),
 number('stock_initial','Nombre initial de découvertes disponibles',1,1000000,{required:true}),
 number('limite_personnage','Découvertes maximum par personnage',1,1000,{required:true})];
export const terrainKinds=kind=>kind==='INSTALLATION'?['SABOTAGE','REPAIR']:['SEARCH'];
export const terrainActionLabels={SEARCH:'Fouille',SABOTAGE:'Sabotage',REPAIR:'Réparation'};
