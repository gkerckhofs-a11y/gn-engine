export const masterExample=()=>({
 Meta:[{format:'gn-engine-master',version:'1',type:'CAMPAGNE'}],
 Parametres:[{cle:'economie_active',valeur:'OUI'},{cle:'monnaie_nom',valeur:'Crédits'},{cle:'monnaie_unite',valeur:'CR'},{cle:'pa_actifs',valeur:'OUI'},{cle:'pa_niveau_1',valeur:'5'},{cle:'pa_niveau_2',valeur:'8'},{cle:'pa_renouvellement_minutes',valeur:'300'},{cle:'sante_active',valeur:'OUI'},{cle:'pv_max_defaut',valeur:'3'}],
 Personnages:[{id:'pilote',operation:'CREER',version:'1',nom:'Pilote de démonstration',publication:'PUBLISHED',publication_publique:'PUBLISHED',histoire:'Une histoire fictive.',niveau_global:'2',pv_max_initiaux:'4'}],
 Objets:[{id:'kit',operation:'CREER',version:'1',nom:'Kit de démonstration',type:'STACKABLE',consommable:'OUI',publication:'PUBLISHED'}],
 Competences:[{id:'medecine',operation:'CREER',version:'1',nom:'Médecine',type:'ACTIVE_TARGET',publication:'PUBLISHED',soin_pv:'1',consommable_id:'kit',consommable_quantite:'1'},{id:'savoir',operation:'CREER',version:'1',nom:'Savoir',type:'PASSIVE',publication:'PUBLISHED'}],
 Classes:[{id:'medic',operation:'CREER',version:'1',nom:'Médecin de démonstration',publication:'PUBLISHED',competences:'medecine:1;savoir:2'}],
 Attributions:[{id:'profil-pilote',operation:'CREER',version:'1',personnage_id:'pilote',classe_id:'medic',publication:'OUI'}],
 Groupes:[{id:'equipage',operation:'CREER',version:'1',nom:'Équipage de démonstration',visibilite:'SECRET',publication:'PUBLISHED'}],
 Membres:[{id:'membre-pilote',operation:'CREER',version:'1',personnage_id:'pilote',groupe_id:'equipage',actif:'OUI',revele:'OUI',droits:'readBriefing;readMembers'}],
 Connaissances:[{id:'secret',operation:'CREER',version:'1',titre:'Une route discrète',texte:'Document fictif de démonstration.',publication:'PUBLISHED',personnages_initiaux:'pilote',qr_actif:'OUI',qr_competence_id:'savoir',qr_niveau:'1'}],
 Objectifs:[{id:'objectif-pilote',operation:'CREER',version:'1',personnage_id:'pilote',titre:'Trouver un passage',publication:'OUI'}],
 Dotations:[{id:'credits-pilote',operation:'CREER',version:'1',personnage_id:'pilote',type:'CREDIT',quantite:'100'},{id:'kit-pilote',operation:'CREER',version:'1',personnage_id:'pilote',type:'OBJET',objet_id:'kit',quantite:'3'}]
});
export const sessionMasterExample=()=>({
 Meta:[{format:'gn-engine-master',version:'1',type:'SESSION',campaign_id:''}],
 Personnages:[{id:'renfort-demo',operation:'CREER',version:'1',nom:'Renfort de démonstration',publication:'PUBLISHED',publication_publique:'PUBLISHED',histoire:'Ce personnage fictif rejoint l’équipage au deuxième épisode.',niveau_global:'1'}],
 Attributions:[{id:'profil-renfort-demo',operation:'CREER',version:'1',personnage_id:'renfort-demo',classe_id:'medic',publication:'OUI'}],
 Membres:[{id:'membre-renfort-demo',operation:'CREER',version:'1',personnage_id:'renfort-demo',groupe_id:'equipage',actif:'OUI',revele:'OUI',droits:'readBriefing;readMembers'}],
 Relations:[{id:'contact-renfort-demo',operation:'CREER',version:'1',personnage_id:'renfort-demo',cible_id:'pilote',titre:'Votre contact sur place',description:'Le pilote vous attend. Ce lien est un exemple fictif.',publication:'OUI'}],
 Dotations:[{id:'credits-renfort-demo',operation:'CREER',version:'1',personnage_id:'renfort-demo',type:'CREDIT',quantite:'20'},{id:'kits-renfort-demo',operation:'CREER',version:'1',personnage_id:'renfort-demo',type:'OBJET',objet_id:'kit',quantite:'2'}]
});

// Fictitious training data, deliberately separate from any Port-Brèche canon.
export function terrainMasterExample(){
 const s=masterExample(),row=(id,extra)=>({id,operation:'CREER',version:'1',...extra});
 s.Objets.push(row('outil',{nom:'Multitool de démonstration',type:'INDIVIDUAL',consommable:'NON',pillable:'OUI',publication:'PUBLISHED'}),row('bacta',{nom:'Dose de bacta de démonstration',type:'STACKABLE',consommable:'OUI',pillable:'NON',publication:'PUBLISHED'}));
 s.Competences.push(...[['mecanique','Mécanique'],['secours','Secours'],['clinique','Clinique'],['pillage-fin','Fouille méthodique']].map(([id,nom])=>row(id,{nom,type:'PASSIVE',publication:'PUBLISHED',description:'Expertise fictive destinée à essayer les actions du moteur.'})));
 s.Classes[0].competences+=';mecanique:2;secours:2;clinique:1;pillage-fin:1';
 s.Lieux=[row('generateur',{titre:'Générateur de démonstration',type:'INSTALLATION',publication:'PUBLISHED',description:'Une console de test à identifier sur le terrain.',panne_secondes:'600',verrou_echec_secondes:'300',protection_reparation_secondes:'300'}),row('cache',{titre:'Cache de démonstration',type:'SEARCH',publication:'PUBLISHED',installation_id:'generateur',description:'Cache de test accessible quand le générateur fonctionne.'})];
 s.ActionsTerrain=[row('sabotage-generateur',{lieu_id:'generateur',type:'SABOTAGE',competence_id:'mecanique',niveau_minimum:'1',duree_secondes:'120',durees_niveaux:'2:60',test:'D6',seuil:'6',cout_pa:'1',recuperation_secondes:'600',bonus_objets:'outil:1',instructions:'Mimer une intervention sur la console de jeu.'}),row('reparation-generateur',{lieu_id:'generateur',type:'REPAIR',competence_id:'mecanique',niveau_minimum:'1',duree_secondes:'120',test:'AUTO',cout_pa:'1',recuperation_secondes:'600'}),row('fouille-cache',{lieu_id:'cache',type:'SEARCH',competence_id:'savoir',niveau_minimum:'1',duree_secondes:'60',durees_niveaux:'2:30',test:'D6',seuil:'5',cout_pa:'1',recuperation_secondes:'600',bonus_objets:'outil:1',texte_reussite:'La cache révèle son contenu.',texte_echec:'La cache reste introuvable.'})];
 s.Recompenses=[row('cache-kit',{lieu_id:'cache',type:'ITEM',objet_id:'kit',quantite:'1',stock_initial:'3',limite_personnage:'1'}),row('cache-credits',{lieu_id:'cache',type:'CREDITS',quantite:'10',stock_initial:'2',limite_personnage:'1'}),row('cache-indice',{lieu_id:'cache',type:'KNOWLEDGE',connaissance_id:'secret',quantite:'1',stock_initial:'1',limite_personnage:'1'})];
 s.Interactions=[row('soin-terrain',{nom:'Soin de terrain de démonstration',type:'FIELD_CARE',publication:'PUBLISHED',competence_id:'secours',niveau_minimum:'1',duree_secondes:'60',durees_niveaux:'2:30',cout_pa:'1',consommable_id:'kit',consommable_quantite:'1',soin_pv:'1',niveau_reanimation:'2',convalescence_secondes:'600',recuperation_patient_secondes:'600',instructions:'Jouer le soin avec le consentement du patient.'}),row('clinique-sure',{nom:'Clinique sûre de démonstration',type:'CLINIC_SAFE',publication:'PUBLISHED',competence_id:'clinique',prerequis:'secours:2',duree_secondes:'300',cout_pa:'1',consommable_id:'kit',consommable_quantite:'1',consommables_supplementaires:'bacta:1'}),row('clinique-rapide',{nom:'Clinique accélérée de démonstration',type:'CLINIC_FAST',publication:'PUBLISHED',competence_id:'clinique',prerequis:'secours:2',duree_secondes:'180',seuil:'5',complement_secondes:'120',cout_pa:'1',consommable_id:'kit',consommable_quantite:'1',consommables_supplementaires:'bacta:1',bonus_objets:'outil:1'}),row('pillage-ordinaire',{nom:'Fouille ordinaire de démonstration',type:'LOOT_COMMON',publication:'PUBLISHED',duree_secondes:'60',cout_pa:'1',recuperation_secondes:'600'}),row('pillage-methodique',{nom:'Fouille méthodique de démonstration',type:'LOOT_METHODICAL',publication:'PUBLISHED',competence_id:'pillage-fin',duree_secondes:'60',cout_pa:'1',recuperation_secondes:'600'})];
 return s;
}
export function terrainSessionMasterExample(){
 const s=sessionMasterExample();
 s.Lieux=[{id:'cache-episode',operation:'CREER',version:'1',titre:'Cache du nouvel épisode',type:'SEARCH',publication:'PUBLISHED'}];
 s.ActionsTerrain=[{id:'fouille-episode',operation:'CREER',version:'1',lieu_id:'cache-episode',type:'SEARCH',duree_secondes:'60',test:'AUTO',cout_pa:'1'}];
 s.Recompenses=[{id:'reserve-episode',operation:'CREER',version:'1',lieu_id:'cache-episode',type:'ITEM',objet_id:'kit',quantite:'1',stock_initial:'2',limite_personnage:'1'}];
 s.Interactions=[{id:'soin-terrain',operation:'MODIFIER',version:'2',instructions:'Jouer le soin avec le consentement du patient. Consigne fictive de ce nouvel épisode.'}];
 return s;
}

// Logistics demonstration values are examples, never session defaults or game canon.
export function logisticsMasterExample(){
 const s=terrainMasterExample();
 s.Objets.push({id:'recharge-demo',operation:'CREER',version:'1',nom:'Recharge laser de démonstration',type:'STACKABLE',consommable:'OUI',volume_unitaire:'1',billes_par_recharge:'500',publication:'PUBLISHED'});
 s.Entrepots=[{id:'hangar-demo',operation:'CREER',version:'1',nom:'Hangar de démonstration',description:'Valeurs fictives à remplacer pour votre partie.',capacite_volume:'20',loyer:'30',periode_minutes:'300',ouvert:'OUI'}];
 s.Membres[0].droits+=';readStock;depositStock;withdrawStock;manageStorage';
 return s;
}
export function logisticsSessionMasterExample(){
 const s=terrainSessionMasterExample();
 s.Entrepots=[{id:'hangar-demo',operation:'MODIFIER',version:'2',capacite_volume:'25',loyer:'35'}];
 s.Membres[0].droits+=';readStock;withdrawStock';
 return s;
}

// Fictitious navigation training values. Blank masters activate no route or tank.
export function navigationMasterExample(){
 const s=logisticsMasterExample();
 s.Parametres.push({cle:'astroport_id',valeur:'port-demo'});
 s.Objets.push({id:'carburant-demo',operation:'CREER',version:'1',nom:'Carburant de démonstration',description:'Une unité de ce lot remplit une unité du réservoir.',categorie:'Carburant',unite:'unité de carburant',type:'STACKABLE',consommable:'OUI',volume_unitaire:'1',publication:'PUBLISHED'});
 s.Membres[0].droits+=';pilotShip';
 s.Vaisseaux=[{id:'cargo-demo',operation:'CREER',version:'1',nom:'Cargo de démonstration',description:'Réservoir vide. Valeurs fictives à remplacer.',proprietaire_type:'GROUP',proprietaire_id:'equipage',capacite_volume:'30',a_quai:'OUI',ouvert:'OUI',carburant_objet_id:'carburant-demo',capacite_reservoir:'20',carburant_initial:'0',port_initial:'port-demo'}];
 s.Routes=[{id:'aller-demo',operation:'CREER',version:'1',nom:'Vers le relais de démonstration',depart_port:'port-demo',arrivee_port:'relais-demo',duree_secondes:'300',carburant_cout:'3',ouvert:'OUI'},{id:'retour-demo',operation:'CREER',version:'1',nom:'Retour de démonstration',depart_port:'relais-demo',arrivee_port:'port-demo',duree_secondes:'300',carburant_cout:'3',ouvert:'OUI'}];
 return s;
}
export function navigationSessionMasterExample(){
 const s=logisticsSessionMasterExample();
 s.Vaisseaux=[{id:'cargo-demo',operation:'MODIFIER',version:'2',capacite_reservoir:'25'}];
 s.Routes=[{id:'retour-demo',operation:'MODIFIER',version:'2',carburant_cout:'4'}];
 return s;
}
