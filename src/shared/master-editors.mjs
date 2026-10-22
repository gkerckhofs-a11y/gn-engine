import {parameterEditors} from './master-parameters-editor.mjs';
import {characterCreationFields} from './master-character-creation.mjs';
import {interactionEditor} from './master-interaction-editor.mjs';
import {terrainEditor} from './master-terrain-editor.mjs';
// Form metadata for existing Master sheets; no domain data is stored here.
const field=(name,label,extra={})=>({name,label,...extra});
const text=(n,l,extra={})=>field(n,l,{clear:true,...extra});
const long=(n,l,max=10000)=>text(n,l,{type:'textarea',max});
const required=(n,l,max=150)=>field(n,l,{required:true,max});
const number=(n,l,min=0,extra={})=>field(n,l,{type:'number',min,...extra});
const choice=(n,l,choices,initial)=>field(n,l,{choices,initial});
const publication=()=>choice('publication','Publication',[['DRAFT','Brouillon'],['READY','Prêt'],['PUBLISHED','Publié']],'DRAFT');
const yesNo=(n,l)=>choice(n,l,[['NON','Non'],['OUI','Oui']],'NON');
const reference=(n,l,ref,extra={})=>field(n,l,{ref,clear:true,...extra});
export const masterEditors={
 personnages:{sheet:'Personnages',title:'Fiches personnages',name:'nom',collection:'characters',fields:[
  required('nom','Nom'),text('metier','Métier',{max:150}),long('description_publique','Présentation publique',4000),
  choice('publication_publique','Publication du badge',[['DRAFT','Brouillon'],['READY','Prêt'],['PUBLISHED','Publié']],'DRAFT'),publication(),
  long('histoire','Histoire',20000),long('interpretation','Interprétation'),long('secrets_joueur','Secrets du personnage',20000),long('notes_mj','Notes réservées au MJ',20000),
  number('niveau_global','Niveau initial',1,{initialOnly:true}),number('pv_max_initiaux','PV maximum initiaux',1,{initialOnly:true}),
  text('portrait_media_id','Portrait : identifiant du média'),text('image_privee_media_id','Image privée : identifiant du média'),...characterCreationFields],
  note:'À la création, choisissez explicitement le profil et les dotations : tout est vérifié et confirmé ensemble. Une duplication copie uniquement la fiche, sans compétences, crédits, objets, relations ou objectifs. Les acquis existants conservent leurs outils dédiés.'},
 communication:{sheet:'Objectifs',title:'Objectifs des personnages',name:'titre',archiveLabel:'Dépublier',fields:[
  reference('personnage_id','Personnage','characters',{required:true,clear:false,immutable:true}),required('titre','Titre',200),long('description','Description'),yesNo('publication','Visible dans la fiche'),long('notes_mj','Notes réservées au MJ',4000)],
  note:'Les étapes détaillées restent dans l’éditeur de fiche. Modifier ou exporter un objectif conserve ses étapes ; dupliquer copie seulement les champs affichés.'},
 magasins:{sheet:'Objets',title:'Catalogue des objets',name:'nom',collection:'items',fields:[
  required('nom','Nom'),long('description','Description',6000),text('categorie','Catégorie',{max:150}),required('unite','Unité commerciale',50),
  choice('type','Conditionnement',[['STACKABLE','Quantité empilable'],['INDIVIDUAL','Objet individuel']],'STACKABLE'),yesNo('consommable','Consommable'),
  number('volume_unitaire','Volume unitaire',0,{clear:true}),choice('legalite','Légalité',[['UNSPECIFIED','Non précisée'],['LEGAL','Légal'],['ILLEGAL','Illégal']],'UNSPECIFIED'),publication(),
  long('notes_mj','Notes réservées au MJ'),text('image_media_id','Illustration : identifiant du média'),yesNo('pillable','Pillable'),number('billes_par_recharge','Billes par recharge',1,{clear:true})],
  note:'Catalogue partagé par l’économie. Modifier un modèle ne transforme pas les lots déjà détenus. Les boutiques avec caisse et QR restent à développer.'},
 spatioport:{sheet:'Routes',title:'Routes',name:'nom',collection:'routes',fields:[
  required('nom','Nom'),long('description','Description',4000),required('depart_port','Code du port de départ',128),required('arrivee_port','Code du port d’arrivée',128),
  number('duree_secondes','Durée en secondes de jeu',1,{required:true}),number('carburant_cout','Carburant consommé',0,{required:true}),yesNo('ouvert','Route ouverte')],
  note:'Une route a un seul sens ; prévoir séparément le retour. Les trajets déjà partis conservent leurs conditions. La feuille Vaisseaux est accessible dans ce même module.'},
 economie:{sheet:'Entrepots',title:'Entrepôts',name:'nom',collection:'warehouses',fields:[
  required('nom','Nom'),long('description','Description',4000),number('capacite_volume','Capacité en volume',1,{required:true}),number('loyer','Loyer en crédits de jeu',0,{required:true}),
  number('periode_minutes','Période de location en minutes de jeu',1,{required:true}),yesNo('ouvert','Ouvert'),reference('loyer_groupe_id','Caisse bénéficiaire du loyer','wallets',{emptyLabel:'Retrait de la circulation'})],
  note:'Aucun locataire, stock ou temps de location n’est exporté ou dupliqué. Le Master des tarifs reste accessible séparément.'},
 informations:{sheet:'Connaissances',title:'Connaissances et indices',name:'titre',collection:'knowledge',fields:[
  required('titre','Titre'),field('texte','Texte reçu par le joueur',{type:'textarea',required:true,max:20000}),text('origine','Origine',{max:300}),
  choice('type','Nature',[['KNOWLEDGE','Information'],['CLUE','Indice'],['DOCUMENT','Document']],'KNOWLEDGE'),publication(),choice('partage','Partage',[['SHOW','Montrer'],['COPY','Copier']],'SHOW'),
  long('verite_mj','Vérité réservée au MJ'),long('notes_mj','Notes réservées au MJ'),text('personnages_initiaux','Destinataires initiaux',{initialOnly:true,help:'Identifiants de personnages séparés par ;. Les accès déjà distribués se gèrent dans l’outil de connaissances.'}),
  yesNo('qr_actif','Découverte par QR activée'),choice('qr_audience','Audience du QR',[['ALL_PLAYERS','Tous les joueurs'],['SELECTED','Personnages sélectionnés']],'ALL_PLAYERS'),
  text('qr_personnages','Personnages autorisés au QR',{help:'Identifiants séparés par ;. Utilisés pour l’audience sélectionnée.'}),reference('qr_competence_id','Compétence requise au QR','skills'),number('qr_niveau','Niveau de compétence requis',1)],
  note:'L’export porte sur les définitions, sans les reçus des joueurs. Une duplication désactive le QR et vide les destinataires initiaux.'},
};
const activeSkill={type:['ACTIVE_SELF','ACTIVE_TARGET']};
const catalogueEditors={informations:{Lieux:terrainEditor},personnages:{
 Attributions:{sheet:'Attributions',title:'Attributions du scénario',name:'personnage_id',scenarioOnly:true,duplicate:false,archiveLabel:'Dépublier',fields:[
  reference('personnage_id','Personnage','characters',{createRef:'unprofiledCharacters',required:true,clear:false,immutable:true}),
  reference('classe_id','Classe publiée','publishedClasses'),
  field('competences','Ajustements des compétences',{type:'levels',ref:'publishedSkills',clear:true,help:'Niveaux positifs explicites. Les compétences non ajustées de la classe restent conservées. Pour un profil entièrement personnalisé, choisir aucune classe.'}),yesNo('publication','Profil visible au joueur')],
  note:'Scénario uniquement. Confirmer recalcule le profil avec les catalogues actuels : relisez les différences. Les sessions déjà créées conservent leurs profils acquis. Un profil existant ne change pas de personnage et ne se duplique pas.'},
 Interactions:interactionEditor,
 Competences:{sheet:'Competences',title:'Compétences',name:'nom',collection:'skills',fields:[
  required('nom','Nom'),long('description','Description',6000),long('instructions','Instructions',6000),text('categorie','Catégorie',{max:150}),
  {...choice('type','Type',[['PASSIVE','Expertise passive'],['ACTIVE_SELF','Soin sur soi'],['ACTIVE_TARGET','Soin sur une cible']],'PASSIVE'),refresh:true},publication(),long('notes_mj','Notes réservées au MJ'),
  number('soin_pv','PV rendus',1,{required:true,when:activeSkill}),number('usages','Nombre d’usages',1,{clear:true,when:activeSkill,help:'Vide : aucun plafond d’usages. Les usages déjà consommés restent conservés.'}),
  number('recuperation_secondes','Récupération en secondes de jeu',0,{required:true,when:activeSkill,help:'Les règles PA de la session remplacent cette durée lorsqu’elles sont actives. La portée « Aucune récupération » impose zéro en jeu.'}),
  {...choice('portee_recuperation','Récupération portée par',[['ACTOR','Le soignant'],['PATIENT','Le patient'],['NONE','Aucune récupération']],'ACTOR'),when:activeSkill},
  reference('consommable_id','Consommable requis','consumables',{when:activeSkill,refresh:true}),
  number('consommable_quantite','Quantité consommée',1,{required:true,when:{...activeSkill,consommable_id:'present'}})],
  note:'Définition du catalogue : les profils déjà attribués et leurs usages ne sont pas remplacés. Le moteur importe actuellement les expertises passives et les soins en PV. Les autres effets restent dans leurs outils dédiés.'},
 Classes:{sheet:'Classes',title:'Classes',name:'nom',collection:'classes',fields:[
  required('nom','Nom'),long('description','Description',6000),publication(),long('notes_mj','Notes réservées au MJ'),
  field('competences','Compétences de la classe',{type:'levels',ref:'allSkills',clear:true,help:'Cochez les compétences puis renseignez leur niveau. Une classe publiée exige des compétences publiées. Maximum 60 compétences.'})],
  note:'Les compétences sélectionnées référencent le catalogue commun. Modifier la classe ne change pas les profils déjà attribués ; leur réattribution conserve son aperçu et ses contrôles dédiés.'},
 Groupes:{sheet:'Groupes',title:'Groupes',name:'nom',collection:'groups',fields:[
  required('nom','Nom'),long('description','Description',4000),long('briefing','Briefing du groupe',20000),
  choice('visibilite','Visibilité',[['SECRET','Secret'],['PUBLIC','Public']],'SECRET'),publication(),long('notes_mj','Notes réservées au MJ',20000)],
  note:'Définition du groupe : les membres et leurs droits se règlent dans la feuille Membres. La caisse, les stocks et les messages conservent leurs outils. Une duplication crée un groupe secret en brouillon, sans membre ni caisse.'},
 Relations:{sheet:'Relations',title:'Relations',name:'titre',archiveLabel:'Dépublier',fields:[
  reference('personnage_id','Personnage qui connaît la relation','characters',{required:true,clear:false,immutable:true}),reference('cible_id','Personnage concerné','characters'),
  required('titre','Titre',200),long('description','Description'),yesNo('publication','Visible dans la fiche'),long('notes_mj','Notes réservées au MJ',4000)],
  note:'La relation appartient à une seule fiche : elle n’est pas réciproque automatiquement. Les notes MJ restent privées. Dupliquer crée une relation non publiée, avec un nouvel identifiant.'},
 Membres:{sheet:'Membres',title:'Membres des groupes',name:'role',stateLabels:{active:'Appartenance active',draft:'Appartenance inactive'},archiveLabel:'Désactiver',duplicate:false,duplicateMessage:'Une appartenance est unique par personnage et groupe. Créez une appartenance en choisissant ce couple, ou réactivez celle qui existe.',fields:[
  reference('groupe_id','Groupe','groups',{required:true,clear:false,immutable:true}),reference('personnage_id','Personnage','characters',{required:true,clear:false,immutable:true}),text('role','Rôle dans le groupe',{max:150}),
  yesNo('actif','Appartenance active'),yesNo('revele','Révéler le groupe au personnage'),yesNo('visible_membres','Nom visible aux membres autorisés'),yesNo('affiliation_publique','Affiliation sur le badge public'),
  field('droits','Droits de jeu dans le groupe',{type:'checks',ref:'groupPermissions',clear:true,help:'Aucun droit à la création. Les droits prennent effet avec une appartenance active, révélée et un groupe publié. Retirer du stock exige aussi sa lecture. Une affiliation publique exige un groupe public et révélé.'})],
  note:'Une appartenance ne révèle rien automatiquement. Désactiver conserve la fiche et ses réglages ; la réactivation est explicite. Les comptes, caisses, stocks et messages existants sont conservés. Ces droits concernent le jeu, jamais les accès organisateurs ou Firebase.'},
},spatioport:{
 Vaisseaux:{sheet:'Vaisseaux',title:'Vaisseaux',name:'nom',collection:'ships',fields:[
  required('nom','Nom'),long('description','Description',4000),
  {...choice('proprietaire_type','Propriétaire',[['CHARACTER','Personnage'],['GROUP','Groupe']],'GROUP'),refresh:true},
  reference('proprietaire_id','Nom du propriétaire',{field:'proprietaire_type',values:{CHARACTER:'characters',GROUP:'groups'}},{required:true,clear:false,dependsOn:'proprietaire_type'}),
  number('capacite_volume','Capacité de soute en volume',1,{required:true}),{...yesNo('a_quai','Initialement à quai'),initialOnly:true},yesNo('ouvert','Vaisseau ouvert'),
  reference('carburant_objet_id','Objet utilisé comme carburant','fuels',{refresh:true,help:'Vide : soute sans navigation. Une navigation déjà configurée ne peut pas être supprimée.'}),
  number('capacite_reservoir','Capacité du réservoir',1,{required:true,when:{carburant_objet_id:'present'}}),
  number('carburant_initial','Carburant initial',0,{required:true,navigationInitialOnly:true,when:{carburant_objet_id:'present'}}),
  {...required('port_initial','Code du port initial',128),navigationInitialOnly:true,when:{carburant_objet_id:'present'}}],
  note:'Vaisseaux possédés du moteur actuel. Les stocks ne sont jamais copiés. En session, carburant et position acquis restent conservés ; une première activation de navigation demande ses valeurs initiales. Un vaisseau en trajet ne peut pas être modifié. Les modèles commerciaux et combats restent à développer.'},
},economie:{
 Cours:{sheet:'Cours',title:'Cours des marchandises',name:'id',collection:'commodityPrices',identity:true,duplicate:false,fields:[
  reference('id','Objet coté','items',{createRef:'unpricedItems',required:true,clear:false,immutable:true}),
  number('prix_base','Prix de base par unité en crédits de jeu',1,{required:true}),yesNo('actif','Cours actif')],
  note:'Un seul cours par objet du catalogue commun. Pour ajouter un cours, choisissez un objet publié sans cours existant. Un cours archivé se réactive depuis sa fiche. Les prix et transactions passés ne sont pas recalculés.'},
 EvenementsEco:{sheet:'EvenementsEco',title:'Événements économiques',name:'titre',collection:'priceEvents',fields:[
  required('titre','Titre'),long('description','Description',2000),
  {...choice('cible_type','Effet sur',[['COMMODITY','Une marchandise'],['ROUTE','Une route']],'COMMODITY'),refresh:true},
  reference('objet_id','Marchandise','items',{required:true,clear:false,when:{cible_type:['COMMODITY']},inactiveValue:'!EFFACER'}),
  number('variation_prix_pct','Variation du prix en %',-100,{max:1000,required:true,when:{cible_type:['COMMODITY']},inactiveValue:'0'}),
  {...yesNo('commerce_suspendu','Commerce suspendu'),when:{cible_type:['COMMODITY']},inactiveValue:'NON'},
  reference('route_id','Route','routes',{required:true,clear:false,when:{cible_type:['ROUTE']},inactiveValue:'!EFFACER'}),
  number('variation_carburant_pct','Variation du carburant en %',-100,{max:1000,required:true,when:{cible_type:['ROUTE']},inactiveValue:'0'}),
  number('variation_duree_pct','Variation de la durée en %',-100,{max:1000,required:true,when:{cible_type:['ROUTE']},inactiveValue:'0'}),
  {...yesNo('depart_suspendu','Départs suspendus'),when:{cible_type:['ROUTE']},inactiveValue:'NON'},
  {...choice('declenchement','Déclenchement',[['MANUAL','Manuel'],['INSTALLATION_OFFLINE','Installation hors service']],'MANUAL'),refresh:true},
  reference('installation_id','Installation déclencheuse','installations',{required:true,clear:false,when:{declenchement:['INSTALLATION_OFFLINE']},inactiveValue:'!EFFACER'}),yesNo('actif','Événement activé')],
  note:'Les effets utilisent les règles économiques existantes. Renseignez explicitement chaque variation, y compris zéro. Changer de type retire les effets de l’ancien type. Un événement dupliqué est désactivé.'},
}};
// Existing callers without a sheet keep their original editor (or the separate tariff workspace).
export function masterEditor(module,sheet){
 const first=Object.hasOwn(masterEditors,module)?masterEditors[module]:null;
 if(!first)return null;
 if(sheet==='Parametres')return parameterEditors[module]??null;
 if(sheet===undefined||sheet===first.sheet)return first;
 const extra=Object.hasOwn(catalogueEditors,module)?catalogueEditors[module]:{};
 return Object.hasOwn(extra,sheet)?extra[sheet]:null;
}
export const masterEditorsFor=module=>masterEditor(module)?[masterEditor(module),...Object.values(catalogueEditors[module]??{}),...(parameterEditors[module]?[parameterEditors[module]]:[])]:[];
export const editorFields=(module,session,existing,sheet)=>masterEditor(module,sheet).fields.filter(f=>!(f.initialOnly&&session&&existing)&&!(f.creationOnly&&existing));
export const editorFieldVisible=(field,row)=>Object.entries(field.when??{}).every(([key,allowed])=>allowed==='present'?!!row[key]&&row[key]!=='!EFFACER':allowed.includes(row[key]));
