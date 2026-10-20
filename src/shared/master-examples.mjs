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
