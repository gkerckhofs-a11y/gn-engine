// Contract shared by the XLSX reader, the server and the downloadable templates.
export const masterVersion=1;
export const masterLimits={fileBytes:8*1024*1024,expandedBytes:16*1024*1024,payloadBytes:1024*1024,rows:250,writes:420};
export const masterSheets={
 Meta:['format','version','type','destination_id','campaign_id','base_revision'],
 Parametres:['cle','valeur'],
 Personnages:['id','operation','version','nom','metier','description_publique','publication_publique','publication','histoire','interpretation','secrets_joueur','notes_mj','niveau_global','pv_max_initiaux','portrait_media_id','image_privee_media_id'],
 Objets:['id','operation','version','nom','description','categorie','unite','type','consommable','volume_unitaire','legalite','publication','notes_mj','image_media_id'],
 Competences:['id','operation','version','nom','description','instructions','categorie','type','publication','notes_mj','soin_pv','usages','recuperation_secondes','portee_recuperation','consommable_id','consommable_quantite'],
 Classes:['id','operation','version','nom','description','publication','notes_mj','competences'],
 Attributions:['id','operation','version','personnage_id','classe_id','competences','publication'],
 Groupes:['id','operation','version','nom','description','briefing','visibilite','publication','notes_mj'],
 Membres:['id','operation','version','groupe_id','personnage_id','role','actif','revele','visible_membres','affiliation_publique','droits'],
 Connaissances:['id','operation','version','titre','texte','origine','type','publication','partage','verite_mj','notes_mj','personnages_initiaux','qr_actif','qr_audience','qr_personnages','qr_competence_id','qr_niveau'],
 Objectifs:['id','operation','version','personnage_id','titre','description','publication','notes_mj'],
 Relations:['id','operation','version','personnage_id','cible_id','titre','description','publication','notes_mj'],
 Dotations:['id','operation','version','personnage_id','type','objet_id','quantite'],
};
export const masterCollections={Personnages:'characters',Objets:'items',Competences:'skills',Classes:'classes',Groupes:'groups',Connaissances:'knowledge'};
export const masterIgnoredSheets=['Guide','Dictionnaire'];
export const masterParameters=['titre','resume','date','horaires','lieu','infos_pratiques','confidentialite','capacite','groupes_actifs','pa_actifs','pa_niveau_1','pa_niveau_2','pa_renouvellement_minutes','pa_cout','pa_recuperation_secondes','pa_recuperation_patient_secondes','economie_active','monnaie_nom','monnaie_unite','sante_active','pv_max_defaut'];
export const masterHints={
 operation:'CREER, MODIFIER ou ARCHIVER. Une ligne absente reste inchangée.',version:'Entier positif. Augmenter après une modification. Une même version ne peut changer de contenu.',
 publication:'DRAFT, READY ou PUBLISHED. Objectifs, relations et attributions : OUI ou NON.',publication_publique:'DRAFT, READY ou PUBLISHED.',
 competences:'Liste séparée par ; au format competence_id:1. Aucun JSON. Une attribution de session est réservée à un personnage créé dans cet import.',
 droits:'Liste séparée par ; : readBriefing, readMembers, readUpdates, publishUpdates, readWallet, payWallet, representMissions.',
 type:'Voir les valeurs autorisées pour cet onglet dans le Guide.',
 niveau_global:'Entier positif. Modification des acquis interdite en session. Un plafond PA doit être configuré.',
 pv_max_initiaux:'Maximum initial pour un nouveau personnage. Aucun soin des personnages existants.',
 quantite:'Entier positif. CREDIT = crédits initiaux, OBJET = quantité du modèle. Personnage créé dans le même import uniquement.',
 portrait_media_id:'Identifiant d’un média READY de votre médiathèque. Version 1.',image_media_id:'Identifiant d’un média READY de votre médiathèque. Version 1.',
 destination_id:'Identifiant du scénario pour CAMPAGNE, de la session pour SESSION. Facultatif ; si renseigné, doit correspondre à l’écran.',
 campaign_id:'Identifiant de la campagne. Obligatoire pour un complément dans une session de campagne.',
 base_revision:'Révision attendue, facultative. L’aperçu impose toujours une confirmation sur les données actuelles.',
 format:'gn-engine-master',version_format:'1',
};
export const masterGuide=[
 ['GN Engine 0.23 — masters complémentaires','Format 1. Contenus pris en charge par cette version du moteur.'],
 ['Destination','CAMPAGNE se charge dans un scénario modèle. SESSION se charge dans un épisode en PREPARATION, avant le premier lancement.'],
 ['Parcours','Importer le XLSX, corriger les erreurs, relire l’aperçu, saisir un motif puis confirmer. Le chargement seul ne modifie rien.'],
 ['Réimport','Identifiants durables. Même version et même contenu = inchangé. Pour une nouvelle modification, augmenter la version.'],
 ['Cellule vide','Ne pas modifier. Pour effacer explicitement un champ facultatif : !EFFACER. Une ligne absente ne supprime rien.'],
 ['Nouveaux personnages','CREER avec un identifiant neuf. Attributions et dotations de session sont réservées aux personnages créés dans le même import.'],
 ['Acquis','Soldes, lots détenus, niveaux, compétences attribuées et connaissances reçues ne sont jamais remplacés par ce master. Utiliser les corrections MJ dédiées.'],
 ['Archivage','ARCHIVER dépublie le contenu sans le supprimer. Les références encore utilisées et personnages attribués bloquent l’archivage.'],
 ['Types','Objets : STACKABLE ou INDIVIDUAL. Compétences : PASSIVE, ACTIVE_SELF ou ACTIVE_TARGET. Les actions actives importables sont des soins HEAL_HP.'],
 ['Connaissances','Types KNOWLEDGE, CLUE, DOCUMENT. Partage SHOW ou COPY. Audience ALL_PLAYERS ou SELECTED. Listes d’identifiants séparées par ;.'],
 ['Groupes et membres','PUBLIC ou SECRET. Booléens : OUI ou NON. Les droits sont explicites et n’accordent pas les anciens messages du groupe.'],
 ['Paramètres','PA : plafonds des niveaux 1 et 2, période en minutes, récupération en secondes. La santé et la monnaie se configurent dans le master CAMPAGNE.'],
 ['Relations et objectifs','Une ligne par relation ou objectif, avec un identifiant durable par personnage. Les étapes détaillées se règlent dans l’éditeur.'],
 ['Dotations','CREER uniquement. CREDIT ou OBJET. Une dotation est immuable et ne peut être rejouée sur un personnage existant.'],
 ['Images','Référencer des médias existants de votre médiathèque. Aucune URL d’image ou donnée de connexion dans ce classeur.'],
 ['Excel et Sheets','Pas de formules dans les onglets importés. Utiliser des valeurs. Exporter Google Sheets au format .xlsx avant import.'],
 ['Limites','250 lignes de contenu et 1 Mio de données par import, transaction limitée à 420 écritures avant indexation des médias. Fractionner les gros ajouts.'],
 ['Modules à venir','Fouilles, installations, entrepôts, vaisseaux, XP et effets avancés : non importables. Les onglets ou colonnes inconnus sont refusés.'],
 ['Source','Contrat du moteur : src/shared/master-schema.mjs et docs/MASTERS.md, 20 octobre 2026. Les données des exemples sont fictives.'],
];
