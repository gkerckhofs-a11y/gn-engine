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
  text('portrait_media_id','Portrait : identifiant du média'),text('image_privee_media_id','Image privée : identifiant du média')],
  note:'Cette fiche ne copie ni dotations, ni compétences, ni relations, ni objectifs. Les outils dédiés restent disponibles.'},
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
  note:'Une route a un seul sens ; prévoir séparément le retour. Les trajets déjà partis conservent leurs conditions. Les vaisseaux restent dans leurs outils et imports existants.'},
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
export const masterEditor=id=>Object.hasOwn(masterEditors,id)?masterEditors[id]:null;
export const editorFields=(module,session,existing)=>masterEditor(module).fields.filter(f=>!(f.initialOnly&&session&&existing));
