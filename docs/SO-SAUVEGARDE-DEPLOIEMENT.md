# SPACE OUTLAWS — sauvegarde, reprise et déploiement À FAIRE VALIDER

## Ergonomie et contrôle DOM fret/douane — 4 novembre 2026

Base 2e1c1ef, [CI 41836026173](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41836026173) réussie. Aucune nouvelle donnée, collection, permission, migration ou version de manifeste. Modifications limitées au contrôleur client partagé, aux textes/boutons et aux styles cargo-customs. Conserver app, contrôleur et styles comme un ensemble compatible ; données métier MOD-04 et règle B inchangées.

La recette DOM dédiée utilise MemoryStore et des identités fictives, sans réseau/Firebase/Auth réels. Captures et rapports dans dist/hidden-cargo-browser, contexte de commit/arbre/dirty/navigateur/viewport et humanAcceptance=NOT_EXECUTED. Pas de sauvegarde de session réelle ou de verdict humain. Aucun déploiement, fusion main, retour arrière ou sauvegarde/restauration externe exécuté.

Local : build, 843 applicatifs ciblés et huit parcours DOM, aucun débordement aux deux viewports. CI exacte dans PR #2 ; HTTP/Auth et Firestore distincts de cette vérification de composants.

## MOD-04 versionné, décision B — 4 novembre 2026

Base 6ebf2f2, [CI 41831727543](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41831727543) réussie. Nouveau hiddenCargoVersion=1 émis dans les prochains manifestes compatibles, confirmé dans digest/naissance. Anciens manifestes/sessions sans ce marqueur non enrichis. Aucune migration ou activation manuelle. Décision B : contenus déjà rangés protégés pendant panne, nouveaux rangements bloqués, inspections normales.

Conserver ensemble code client/serveur compatible, manifeste/pages/digests/version/marqueurs, comptes/stock/achats/reçus, accords et dossiers avec leurs versions, mêmes lots/historiques/découvertes/calibrations/propriétaires, modules/profils/points/dommages, échéances de neutralisation/horloges, PA/verrous, habilitations/identités/droits et escales/tentatives/voyages/convois. Lecture/expiration ne redistribuent ni module ni fret. Reprise vérifiée sur les documents de l’épisode restauré.

Ancien binaire refuse ou ignore MOD-04 : aucun retour seul ou effacement partiel de marqueur, échéance, réserve ou verrou. Code compatible pour annuler avant retour approuvé, ou restauration cohérente de l’ensemble. Aucun déploiement, retour arrière, sauvegarde/restauration externe, migration ou fusion main exécuté ici. Local : build et 840 ciblés ; CI exacte dans PR #2, recette visuelle/humaine mobile encore distincte.

## Interface fret/douane compatible avec le composant fermé — 4 novembre 2026

Base 678dffc, [CI 41827691829](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41827691829) réussie. Aucun nouveau marqueur émis, activation manuelle, migration ou publication MOD-04. Les liens et formulaires dépendent des projections serveur, les droits restent revalidés lors de chaque commande.

Conserver client/serveur compatibles avec les mêmes données : version/manifeste/pages/marqueurs, habilitations et leurs révisions, identités/droits, lots/découvertes/propriétaires, modules/profils/dommages, dossiers/accords/horloges/PA/verrous, escales/voyages, jetons et reçus. Les nouvelles projections sont des lectures sans écriture, aucune nouvelle collection ni sauvegarde à créer. Un écran ancien ne remplace pas les contrôles actuels du serveur.

Aucun retour logiciel seul ou effacement partiel de réserve/verrou/marqueur. Annulation compatible avant retour approuvé ou restauration cohérente. Aucun déploiement, retour arrière ou sauvegarde/restauration externe exécuté. Local : build et 829 ciblés ; CI exacte dans PR #2. Pas de recette visuelle ou humaine mobile revendiquée.

## MOD-04 — retrait vidé sous marqueur fermé — 4 novembre 2026

Base ecd29a8, [CI 41823800629](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41823800629) réussie. Aucun nouveau marqueur de manifeste, migration ou activation en partie. hiddenCargoVersion=1 reste un composant fermé ; dossier et binding de retrait MOD-04 portent également ce marqueur avec moduleOperation=REMOVE. Montage/commerce/vol/publication restent fermés.

Sauvegarder l’ensemble cohérent : version/manifeste/pages/marqueurs, accords/dossiers/bindings et identités/versions/droits, même module et inventory/history, fret réel et métadonnées de découverte, modules/profils/dommages, maintenanceId/activeMaintenanceId, réservations PA et horloges, opérations/reçus. Aucun fret ou découverte effacé par retrait/annulation. Réception native de fret ou rangement explicite hors compartiment précède le travail ; aucune consignation fictive.

Ancien binaire ne sait pas finaliser le retrait MOD-04. Annulation compatible avant retour approuvé ou restauration cohérente de l’ensemble ; aucun retour logiciel seul ni suppression partielle de marqueur/réserve/verrou. Les verrous bloquent la clôture, la reprise conserve le même module rendu et la découverte. Aucun déploiement, retour arrière ou sauvegarde/restauration externe exécuté ici. Local : build et 813 ciblés ; CI exacte dans PR #2.

## Fret caché préparatoire, aucune activation — 4 novembre 2026

hiddenCargoVersion=1 est un garde de composant non émis par publication/naissance. Les tests injectent le marqueur et un module monté synthétique. MOD-04 demeure fermé à la publication, au commerce, au montage et au vol ; aucune migration d’ancienne session. Ne pas appliquer ces données synthétiques en partie.

Conserver ensemble manifeste/pages/version/marqueurs, identité/droits/versions et customsAuthorization, mêmes lots et inventory/history (hiddenCargo.concealed/discovered/discoveredAt), modules/profils, shipMaintenance et ses résultats/échéances, maintenanceId/activeMaintenanceId, réservations PA/horloges, portVisitId/customsAttempt, voyages, logisticsHistory/audit et operations. Instantané/reprise natif déjà utilisé, aucune collection supplémentaire. Clôture refusée tant qu’une inspection est active. Retirer/replacer/transférer ne doit pas effacer la découverte ; réception retire uniquement la dissimulation active.

Ancien binaire non équivalent : ignore les dossiers et métadonnées de dissimulation/habilitation/escale. Aucun retour logiciel seul ni suppression partielle de marqueur/réserve/verrou. Annulation avec le code compatible avant un retour approuvé, ou restauration cohérente de l’ensemble. La fermeture du marqueur ne libère pas un dossier actif. Contrôles en panne MOD-04 volontairement refusés avant intégration complète. Aucun déploiement, sauvegarde externe/restauration globale ou retour arrière exécuté ici.

Build et 799 tests locaux ciblés ; CI exacte dans PR #2. Périmètre préparatoire détaillé dans [SO-FRET-CACHE.md](SO-FRET-CACHE.md).

## Définition préparatoire MOD-04 — 4 novembre 2026

Calibration M1 code/size inchangée. MOD-04 accepté dans le brouillon pour cargo/transport seulement, mais explicitement exclu des versions jouables, du commerce, des mandats et profils montés. Aucun marqueur actif, migration, nouvel inventaire ou collection. Les instances jouées ne sont pas modifiées.

Conserver ensemble brouillon/changements/révisions/historiques/délégations et offres liées. Ancien binaire ne reconnaît pas ce code : aucun retour logiciel seul sur un brouillon qui le contient ; archivage explicite compatible ou restauration cohérente selon procédure approuvée. Ne pas effacer uniquement sa calibration, qui changerait le sens de l’objet. Aucun retour, migration, publication ou sauvegarde/restauration externe exécuté ici.

Local : 748/748 ciblés et build ; CI exacte dans PR #2. L’ouverture future de MOD-04 exigera fret caché, inspection/découverte persistante, retrait et nouvelle compatibilité versionnée ; cette tranche ne l’autorise pas.


## Vols équipés et neutralisations — 4 novembre 2026

Nouveau moduleFlightVersion=1, dépendant de moduleRemovalVersion et de toute sa chaîne ainsi que combat/convoi. Nouveaux manifestes uniquement, transmission à la naissance et conservation entre épisodes ; aucune migration d’ancienne session. Les anciens manifestes gardent leur verrou de vol équipé.

Conserver ensemble manifeste/pages/marqueurs et version, mêmes lots INSTALLED/emplacements/historiques/propriétaires, modules du vaisseau, profil et points courants, moduleNeutralizations (lot/code/voyage/début/échéance en temps de jeu), clock, voyages/événements/convois/combats/rounds, droits/versions, PA et operations/logisticsHistory. L’instantané natif copie ces données ensemble sans régénération d’événement, module ou échéance. Aucune collection supplémentaire. Les lectures recalculent le profil effectif sans écrire ; le plafond des points à la désactivation est déjà enregistré atomiquement au départ. Expiration : retour du bonus, aucun soin implicite.

Un ancien binaire ignore les échéances et n’est pas équivalent : il pourrait conserver le mauvais profil et ne pas restaurer les bonus. Aucun retour de binaire seul, suppression de marqueur/neutralisation, restitution forcée ou remise à zéro. Avant tout retour approuvé, terminer les parcours sous code compatible ou restaurer un ensemble complet et cohérent. Aucune publication, migration, sauvegarde externe/restauration globale ni retour arrière exécuté ici.

Local : build et 742/742 tests ciblés ; CI exacte à consigner dans PR #2. Le retour d’épisode conserve événement, échéance et lot, sans redistribution. Recette humaine et validation globale avant publication restent distinctes.


## Adaptateur canon lourd préparatoire — 4 novembre 2026

Le serveur lit HEAVY dans le profil natif déjà produit par le montage et le transmet au résolveur duel/flotte ; les profils sans HEAVY conservent STANDARD. Aucun nouveau champ, marqueur de session, nouvelle collection ou migration. Conserver les profils, modules/lots, combats/rounds, droits et reçus ensemble selon la procédure existante. Un ancien binaire imposerait de nouveau STANDARD au combat : non équivalent pour un combat équipé synthétique ou futur ; aucun retour exécuté.

Les départs équipés restent fermés. Tests de combat avec équipement synthétique après départ uniquement ; neutralisation temporaire et reprise du profil encore à raccorder avant ouverture. Local 675/675 ciblés et build ; résultat CI exact dans PR #2. Aucune publication ou restauration effectuée.


## Compatibilité du retrait des modules — 4 novembre 2026

Nouveau marqueur moduleRemovalVersion=1, dépendant de moduleInstallationVersion=1 et de ses dépendances. Nouveaux manifestes seulement ; naissance et reprise natives le conservent. Aucun enrichissement d’une ancienne session, migration ou nouvelle collection.

Conserver ensemble manifeste/pages/marqueurs, mandat `moduleOperation=REMOVE` et versions d’identité, états MODULE_OFFERED/APPROVED/ACTIVE/REMOVED/CANCELLED, délais de jeu, même inventaire/lot/emplacement/historique, vaisseau/modules/profil/verrous, personnage/PA/horloges, droits courants et operations/logisticsHistory. Retrait actif : lot FIELD_RESERVED restant attaché au vaisseau et bonus conservés jusqu’à confirmation ; interruption rétablit INSTALLED et libère le PA ; finalisation consomme le PA et rend AVAILABLE au même propriétaire. Profil recalculé et points plafonnés sont atomiques avec la remise.

Ancien binaire ne traite pas correctement ce retrait actif : retour logiciel seul non équivalent. Annuler explicitement les travaux sous le code compatible avant un retour approuvé, ou restaurer l’ensemble cohérent ; ne pas supprimer marqueur, dossier ou réservation séparément. Aucun retour arrière, export/restauration global ou migration exécuté ici. Local : 516 tests ciblés et build ; CI exacte dans PR #2. Aucune fusion ni publication. Les voyages équipés restent bloqués ; vol nu possible après retrait du dernier module.


## Finalisation du montage à quai — 2 novembre 2026

Base réelle : `065329a438d69afd9f579b712ebfbfd4ce44fc61`, [CI ciblée 41515892870](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41515892870) réussie, huit jobs requis : build, 455 applicatifs, 373 Firestore (95 + 82 + 54 + 142), six HTTP. Pas de reprise d’audit historique. Source métier : [règles V0.7, chapitre 17](source/SO_Regles_V07.txt), montage et maximums sans effacer les dégâts.

Le Mécano désigné ouvre un aperçu après le délai puis confirme présence, atelier et montage réellement effectué. Ni propriétaire ni MJ ne finalisent à sa place. Mandat personnel, droits/versions d’identité, propriétaire vivant, qualification MEC-03, port, atelier, même lot ordinaire, calibration, emplacement/doublon et réservations sont recontrôlés. Validation partagée du mandat, avec retrait des seuls verrous de ce dossier pour le contrôle ; révisions du lot et du vaisseau strictement liées au démarrage. PAUSE/STOP bloquent la finalisation. Pas de montage à l’échéance sans confirmation.

Une seule transaction consomme le PA réservé, libère les verrous, ferme le dossier MODULE_INSTALLED et attache le même exemplaire : inventaire INSTALLED, emplacement SHIP_MODULE, quantité/propriété/code/gabarit inchangés ; aucune monnaie ni nouvelle collection. Le profil natif soProfile est recalculé depuis la base canonique et les modules montés : MOD-01 +1 maximum Bouclier, MOD-02 +1 maximum Coque, MOD-03 +1 Manœuvrabilité (plafond permanent 3), MOD-06 canon lourd préparé. Points actuels Coque/Bouclier conservés, aucune réparation implicite. Les réparations natives voient les nouveaux maximums. MODULE_WORK conserve sa capacité existante, sans accès aux comptes/ledger/contrats/connaissances. Réessai, concurrence avec confirmation/annulation et rollback ne doublent ni PA ni exemplaire.

Périmètre explicitement **limité à quai** : retrait, effets en combat et neutralisation en voyage restent à développer. Les départs solo et en convoi avec module monté sont bloqués au serveur (aperçu, démarrage et ultime confirmation, y compris partenaire du convoi), et l’interface masque le formulaire de départ équipé. Le plein reste possible. Ne pas ouvrir les vols équipés tant que canon lourd, dommages/maximums, neutralisation temporaire de quinze minutes et convoi commun ne sont pas raccordés ensemble. Le module monté est affiché séparément du sac, de la soute et des biens à récupérer au comptoir ; référence du même lot et accès privé au vaisseau conservés. Aucun transfert/rachat/pillage ajouté.

Nouveaux manifestes uniquement : moduleInstallationVersion=1 dépend de moduleWorkVersion=1 ; transmis à la naissance, conservé entre épisodes. Ancien manifeste/session reste aux travaux avec interruption, sans finalisation ajoutée implicitement. Données montées conservées par le snapshot/reprise natif, sans nouvelle attribution ; PA renouvelés selon le cycle natif. Sauvegarder ensemble manifeste/pages et marqueurs, dossiers/mandats/versions, identités/droits, vaisseaux/profils/modules, mêmes lots/emplacements/historiques, réservations PA/horloges et operations/logisticsHistory. **Ancien binaire non équivalent** : il ignore INSTALLED/SHIP_MODULE et la garde de départ. Aucun retour de binaire seul, suppression d’un marqueur, libération forcée ou effacement partiel ; restauration seulement d’un ensemble cohérent selon procédure approuvée. Aucune migration ou remise à zéro implicite.

Validation locale : **498/498 tests ciblés dans 38 fichiers**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. Treize nouveaux cas partagés mémoire/Firestore, un cas pur du profil, trois UI et un HTTP/Auth ; ciblage explicite et dépendances voyages/convois inclus. Profil `[ci targeted:module-installation]` : 23 suites Firestore, sept parcours HTTP bornés, aucun Chromium ni suite complète. Émulateurs non exécutés localement (Java 17, CI Java 21). Build réussi ; preuves du commit exact dans PR #2 avant le lot suivant. Résultat ciblé distinct d’une régression intégrale et d’une recette humaine.

Même branche `work/space-pilot-handover`, PR #2 brouillon. Aucune fusion main, publication ou modification d’environnement Firebase. Suite : retrait chronométré du même module puis raccordement complet des voyages équipés/combats/neutralisation avant de retirer le verrou de départ.


## Démarrage et interruption des travaux modules — 2 novembre 2026

Tranche courante : accord propriétaire valide → aperçu personnel Mécano → présence/atelier confirmés → réservation atomique → interruption et restitution. Base vérifiée : `94aa82ae2fd4cf3de84ef5fa9e18b4b5570c0745`, [CI ciblée 41502708140](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41502708140) réussie : 413 applicatifs, 335 Firestore, cinq HTTP et build. Source : V0.7 chapitre 17, profils MEC-03 du catalogue commun : N2/10 min ou N3/15 min, 1 PA.

Le Mécano désigné est seul à pouvoir démarrer ; propriétaire et MJ ne le remplacent pas. Mandat, versions d’identité, propriétaire vivant, module reçu et disponible, calibration/emplacement, qualification, port et atelier revalidés avant effet. Le service partage la même vérification métier du mandat, sans reconstruire une autorisation. Un PA passe de disponible à réservé, le lot devient FIELD_RESERVED avec fieldActionId, le vaisseau porte maintenanceId et le Mécano activeMaintenanceId. Même shipMaintenance, inventory/history, ressources PA, logisticsHistory/audit/operations ; aucune nouvelle collection, aucun compte/ledger touché, aucune monnaie créée ou dépensée.

Délai en temps de jeu natif, figé par PAUSE/STOP. La fin du délai ne finalise pas le montage et ne consomme pas automatiquement le PA. Le module reste non monté et réservé tant que le travail n’est pas explicitement interrompu ; finalisation et effets restent le lot suivant. Cette limite est affichée avant démarrage et dans le suivi. Propriétaire ou Mécano courants peuvent interrompre, la régie peut restituer après décès/révocation. Annulation vérifie toutes les réserves, libère uniquement celles de ce dossier et ferme le mandat : même exemplaire/code/gabarit/propriété/quantité, PA rendu sans dépasser le plafond, y compris après renouvellement. État incohérent refusé atomiquement, pas de déverrouillage forcé d’un autre travail.

Nouveaux manifestes seulement : moduleWorkVersion=1 dépend de moduleMandatesVersion=1 et de ses dépendances. Même marqueur sur le travail démarré. Ancienne session/ancien manifeste conserve uniquement son parcours antérieur, sans activation ou réservation implicite. Droits et marqueur vérifiés avant anciens reçus. Capacité MODULE_WORK limitée aux dossiers/historiques, verrous ships/inventory/characters et ressources PA ; comptes, ledger, contrats et connaissances interdits. Entretien ordinaire continue d’exclure les mandats modules. Verrous natifs bloquent navigation, activités incompatibles et clôture ; interruption nécessaire avant reprise d’épisode, aucun report automatique d’un montage actif.

Douze nouveaux cas partagés mémoire/Firestore, un test de capacité, deux UI, un HTTP/Auth et un cas du sélecteur. Local : 455/455 tests ciblés dans trente-quatre fichiers, build réussi, Node 24.22.1 / npm 11.9.0. Profil [ci targeted:module-work] : vingt-et-une suites Firestore et six parcours HTTP bornés ; aucun Chromium ni suite complète. Émulateurs non exécutés localement (Java 17 ; CI Java 21). Preuves CI du candidat exact à consigner dans PR #2 avant le lot suivant. Tests ciblés distincts d’une régression intégrale et d’une recette humaine.

Sauvegarder ensemble marqueurs/manifeste/pages, demandes/travaux/délais/versions, identité et droits des deux participants, vaisseaux/verrous, lots/réserves/historiques, ressources PA/horloges et operations/logisticsHistory. Ancien binaire incapable de démarrer ou d’annuler ce travail : retour non équivalent, annuler les travaux actifs avant un retour de version approuvé, ou restaurer un ensemble cohérent sans effacement partiel des réserves. Aucune migration ou remise à zéro implicite. Même branche et PR #2 brouillon ; aucune fusion main ou publication.

Suite : finalisation explicite du montage avec consommation unique du PA, équipement/effets, retrait, interactions avec dommages/combat et neutralisation temporaire en voyage. Le présent lot livre le démarrage/interruption, pas l’atelier complet.

## Jalon précédent — accords préparatoires de montage — 2 novembre 2026

Tranche courante : proposition MJ → aperçu privé du propriétaire → accord ou refus personnel → annulation explicite. Base vérifiée : `86a46c6495d18fdef43cd38f99247fd54c0e4b3a`, [CI ciblée 41496836753](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41496836753) réussie : 299 applicatifs, 242 Firestore, quatre HTTP et build. Source : V0.7 chapitre 17, montage standard en atelier sur mandat valide, profils MEC-03 du catalogue commun.

Le MJ atteste présence et atelier réellement disponible. Proposition liée au vaisseau, propriétaire, exemplaire effectivement reçu dans son sac, Mécano MEC-03 qualifié et port publié ; gabarit, emplacement disponible et absence de doublon vérifiés. Propriétaire distinct du pilote : ni le pilote seul, ni le Mécano, ni le MJ ne peuvent approuver à sa place. Versions d’identité, révisions du vaisseau/lot et qualification revérifiées ; évolution incompatible ferme l’approbation et demande une nouvelle proposition après annulation. Refus et annulation ne nécessitent aucune ressource. MJ peut annuler une demande devenue périmée après décès/révocation. Pause permet le refus/l’annulation, STOP bloque tout nouvel effet.

Accord PRÉPARATOIRE : aucun montage ou retrait commencé, aucune réservation de vaisseau/lot, aucun PA ou crédit consommé. Le futur démarrage devra revalider le mandat et réserver les ressources. Une seule demande ouverte par vaisseau ou module, borne de concurrence du parcours ; aucun statut d’équipement inventé. Même collection shipMaintenance, discriminant moduleMandateVersion=1 et statuts MODULE_OFFERED/APPROVED/DECLINED/CANCELLED. Les commandes et listes d’entretien ordinaire les excluent. Capacité serveur MODULE_MANDATES limitée à shipMaintenance et logisticsHistory, plus audit/reçus natifs ; écriture de vaisseaux, inventaire, personnages/PA, comptes et ledger interdite et testée.

Nouveaux manifestes seulement : moduleMandatesVersion=1 dépend de modulePurchasesVersion/navigationVersion/logisticsVersion. Transmission à la naissance, conservation native entre épisodes, aucune activation implicite d’un ancien manifeste ou d’une ancienne session. Données et marqueur conservés ensemble ; aucun travail automatique à la reprise. Sauvegarder demandes/versions/états/décisions, manifestes/pages, identités/droits, vaisseaux/ports, inventaires et historique/logisticsHistory/operations ensemble. Ancien binaire non équivalent pour l’affichage, les décisions et la conservation du marqueur à une naissance suivante ; aucun retour avec réécriture partielle ou suppression implicite des demandes.

Interface privée accessible depuis l’entretien : proposition MJ avec aperçu, approbation du propriétaire avec présence, refus et annulation, gabarit/Mécano/port et exigences futures affichés, limites sans réservation explicites. Secrets de préparation, empreintes de droits et données de tiers non exposés. Douze nouveaux cas partagés mémoire/Firestore, un test de capacité, deux UI, un HTTP/Auth et un cas du sélecteur. Local : 413/413 tests ciblés dans trente fichiers et build réussis, Node 24.22.1 / npm 11.9.0. Profil [ci targeted:module-mandates] : dix-huit suites Firestore et cinq HTTP filtrés ; aucun Chromium ni parcours complet. Émulateurs non exécutés localement (Java 17, CI Java 21). CI exacte dans PR #2 avant le lot suivant ; résultats ciblés distincts d’une régression intégrale et de la recette humaine.

Suite : démarrage personnel par le Mécano, réservation native, délais et PA, montage/retrait atomiques et effets/neutralisation en voyage. Cette tranche livre uniquement l’accord préparatoire, pas l’atelier complet. Même branche work/space-pilot-handover/PR #2 brouillon ; aucune nouvelle collection, migration, fusion main ou publication.

## Jalon précédent — achat des modules standards au comptoir — 2 novembre 2026

Tranche courante : MOD-01/02/03/06 achetables comme exemplaires non montés. Base de reprise vérifiée : `da3ab002662fe3ab9dfe2e0b2a95066ad340cf47`, [CI ciblée 41416610494](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41416610494) réussie : 205 applicatifs, 158 Firestore et trois HTTP, build. Aucun nouvel audit historique. Source des tarifs : V0.7 chapitre 17.

M1 calibré → offre M5 au tarif canonique du gabarit, sans rachat → provision MJ réelle et motivée → devis personnel → paiement ordinaire → propriété au joueur, détention au comptoir → remise MJ → réception personnelle du même lot. Même shops/offers, shopProvisions, inventory/history, lotSales, comptes/ledger et operations ; aucune collection créée. Les règles INDIVIDUAL natives limitent chaque stock d’offre à un exemplaire disponible ; réapprovisionnement distinct après sa vente, nouveau lot acheté. Aucune monnaie créée ou détruite et aucun PA consommé par l’achat, aucune installation ni statistique de vaisseau modifiée. Achat en crédits ordinaires disponibles seulement ; crédits de création, stock protégé, quantité multiple et substitution à un élément du kit initial refusés. Les attributs ordinaires du lot n’ouvrent pas de nouveau parcours de revente/transfert entre joueurs.

`modulePurchasesVersion=1`, dépendant de shopsVersion=1, figure sur les nouveaux manifestes et passe à la session à la naissance. Ancien manifeste sans ce marqueur conservé, consommables natifs toujours disponibles ; aucun enrichissement implicite. Module actif sans marqueur refusé à la lecture ; tarif/gabarit et extension revérifiés avant effet et ancien reçu. Module sans offre canonique reste bloquant à la publication. L’ancien blocage général du catalogue est remplacé seulement pour ce parcours d’achat ; aucun marqueur d’installation ajouté. Un module ne peut pas remplacer gratuitement un objet du kit, même au dernier contrôle de naissance.

Comptoir, devis, reçu et sac affichent code, gabarit, tarif et « non monté », sans présenter de bonus actif. M1/M5 précisent tarif canonique et montage séparé. Pause/STOP, révocation, concurrence sur le dernier exemplaire, réessais, stock/calibration incohérents, interruption atomique et reprise d’épisode testés. Douze nouveaux cas partagés mémoire/Firestore, un UI, un HTTP/Auth et un cas du sélecteur. Local : 299/299 tests ciblés dans vingt-trois fichiers, build réussi, Node 24.22.1 / npm 11.9.0. Profil `[ci targeted:module-purchases]` : quatorze suites Firestore et quatre parcours HTTP bornés, aucun Chromium. Émulateurs non exécutés localement (Java 17 ; CI Java 21). CI du commit exact à consigner dans PR #2 avant le lot suivant ; aucun résultat global revendiqué.

Préserver marqueur/manifeste/pages, droits/identités, offres figées et calibration, stocks et reçus de provision, achats/retraits, inventaires/historiques, comptes/ledger et operations ensemble. La reprise native conserve lot, code/gabarit, propriété et paiement, sans nouvelle attribution ; la conversion ordinaire des anciens crédits protégés reste celle du cycle existant. Binaire précédent incapable de publier/relire un manifeste actif de module et d’en exécuter les achats : retour non équivalent, pas de suppression de métadonnée ni conversion implicite. Masters et Excel inchangés. Aucune migration, fusion main ou publication.

Suite : mandat personnel du propriétaire, atelier MEC-03, montage/retrait chronométrés avec PA et verrouillage, effets de coque/bouclier/manœuvrabilité/canon et neutralisation temporaire en voyage. Les modules achetés restent hors des emplacements de vaisseau tant que ce parcours n’est pas livré. MOD-04/05, rares et prototypes restent distincts.

## Jalon précédent — catalogue M1 des modules standards — 2 novembre 2026

Suite à l’accord « OK avec ciblage des tests », premier lot de la tranche atelier Mécano : définitions M1 des MOD-01/02/03/06 uniquement. Source : V0.7 chapitre 17, tarifs par gabarit 1/2/3, profils MEC-03 fixes. Métadonnée optionnelle `shipModule:{code,size}` fermée, objet individuel non consommable ; aucun prix, bonus ou niveau injectable. Le catalogue commun calcule les douze prix canoniques et les exigences d’installation/retrait ; il ne modifie aucun vaisseau.

Formulaire et liste M1 : type, gabarit et tarif de référence, exigences MEC-03, limite de préparation affichée. `itemInput` conserve la calibration omise par un ancien client ; `null` la retire explicitement de la nouvelle définition. `publicItem` copie code/gabarit dans les instantanés de lots, sans référence mutable au modèle. L’Excel schéma 1 conserve ces données lors d’une modification dans le même brouillon mais ne les transporte pas vers un autre Master ; aucune nouvelle colonne ni conversion silencieuse. Les instantanés centraux natifs conservent le contenu complet.

Publication d’un module actif refusée (`SO_SHIP_MODULE_NOT_CONNECTED`), y compris sans offre M5 ni kit. L’archiver permet de publier les autres définitions. Lecture d’une version jouable contenant une définition de module active refusée : aucun marqueur de session ajouté, ancienne version ordinaire inchangée. Achat, mandat personnel du propriétaire, montage/retrait chronométrés, réserve de 1 PA, effets et neutralisation temporaire de quinze minutes en voyage restent à développer avant ouverture du parcours jouable. MOD-04/05, modules rares et prototypes hors de ce catalogue.

Validation locale ciblée : 205/205 tests dans seize fichiers et build réussis, Node 24.22.1 / npm 11.9.0. Neuf nouveaux cas métier (deux purs, sept partagés mémoire/Firestore), un UI et un HTTP/Auth ; test supplémentaire du sélecteur. Profil explicite `[ci targeted:module-catalog]` : M1, import historique, captures, kits, boutiques, inventaire et publication ; neuf suites Firestore, trois parcours HTTP filtrés, aucun Chromium. Émulateurs non exécutés localement (Java 17, CI Java 21). Résultats CI à vérifier sur le commit exact et à consigner dans PR #2 ; ces résultats ne constituent pas une régression intégrale ni une recette humaine. Aucun déploiement, migration ou fusion.

Sauvegarder le brouillon et ses changements, révisions, droits, historiques, reçus et captures ensemble. Ancien binaire non équivalent : il peut perdre la calibration à l’édition ou dans une projection d’objet ; restaurer un ensemble cohérent sans réécriture implicite. Dépôt et branche conservés, PR #2 brouillon. Prochain lot : achat M5 et atelier après prise en charge cohérente de la neutralisation en voyage ; pas de paiement/ressource débloqué par ce catalogue.

## C2q — Excel des lieux et informations M6

[C2q — contrat, tests et limites](SO-06-C2Q-EXCEL-LIEUX.md). Préserver les provenances XLSX M6 schéma 1 et 2 avec définitions, références, droits, révisions, historiques, lots, reçus et captures/pages. Les anciens fichiers restent lus ; C2p refuse le schéma et les provenances 2 et ne constitue pas un retour équivalent. Aucun effacement/conversion implicite. Export ciblé et capture JSON ne sont pas une restauration complète. Masters, règles/index/IAM et production inchangés.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1477/1477 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 18 nouveaux cas partagés mémoire/Firestore, trois UI et un HTTP/Auth. Firebase non exécuté localement (Java 17.0.20) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2p archivées](PR-1-HISTORIQUE-AVANT-C2Q.md) : 1456 applicatifs/1179 Firebase/HTTP chacun.

## C2p — lieux, fouilles et installations préparés dans M6

[C2p — lieux, fouilles et installations M6](SO-02-C2P-LIEUX-CENTRAUX.md) ajoute des changements `fieldTarget` dans M6, conservés avec profils et récompenses proposés dans les captures C2n. Sauvegarder l’ensemble cohérent des lieux, références, droits, brouillon, historiques, imports, reçus et captures/pages. Excel M6 demeure ciblé sur les informations. Retour C2o non équivalent : contrôleur ignorant ce type et import M6 non adapté aux homonymes. Aucun effacement ou conversion implicite ; restauration complète à éprouver. Quatre Masters, règles/index/IAM et marqueur de production inchangés ; aucune migration, fusion ou production.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1456/1456 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 25 nouveaux cas partagés mémoire/Firestore, cinq UI et un HTTP/Auth. Firebase non exécuté localement (Java 17.0.20) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2o archivées](PR-1-HISTORIQUE-AVANT-C2P.md) : 1426 applicatifs/1153 Firebase/HTTP chacun.

## C2o — groupes et factions préparés dans M2

[C2o — groupes et factions M2](SO-02-C2O-GROUPES-CENTRAUX.md) ajoute des changements natifs `group` dans M2, avec historiques et reçus existants ; les instantanés C2n conservent ces définitions. Préserver groupes, personnages, droits, imports, captures/pages et états privés cohérents. Excel M2 reste ciblé sur les personnages ; aucune restauration globale. Retour C2n non équivalent : lecteur, contrôle I3c et import M2 ignorent le nouveau type. Quatre Masters, règles/index/IAM et marqueur de production inchangés ; aucune migration, fusion ou mise en production.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1426 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth. Firebase non exécuté localement (Java 17) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2n archivées](PR-1-HISTORIQUE-AVANT-C2O.md) : 1399 applicatifs/1129 Firebase chacun.

## C2n — instantanés privés du brouillon central

[C2n — instantanés centraux](SO-02-C2N-INSTANTANES-CENTRAUX.md) ajoute `masterDrafts/initial/checks/{id}` et ses pages, audit de campagne et reçus. Les conserver ensemble avec le brouillon, droits et données privées d’admission. Le JSON privé contient définitions et rapport, pas une sauvegarde complète ni un format de restauration. Retour I3c sans conversion des définitions, mais sans lecteur des captures ; conserver les sous-collections. Empreinte centrale 12, quatre Masters et contrats historiques inchangés. Aucun déploiement, migration, règles/index/IAM ou marqueur de production modifié.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1399/1399 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 21 nouveaux cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth ; Firebase non exécuté localement (Java 17). Preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves I3c archivées](PR-1-HISTORIQUE-AVANT-C2N.md) : 1374 applicatifs/1107 Firebase chacun.

## I3c — contrôle privé de l’ensemble des dossiers M2

[I3c — contrôle des dossiers M2](SO-01-I3C-CONTROLE-DOSSIERS-M2.md) ajoute une lecture transactionnelle de la régie : concordance identité/plan, premières fiches manquantes, retraits encore liés, archives, orphelins, confirmations, compteurs et verrous d’identité. Les biographies MJ peuvent différer ; les exceptions I2 motivées restent admises. MJ de session + lecture M2 requis, sans édition obligatoire ni accès implicite aux autres ateliers.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1374/1374 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés Firestore, quatre UI et un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves finales du candidat exact dans la PR après les deux CI. Base I3b `8dcd82bf423e1d913d338b2a8c969b3799dddf4f` : deux CI vertes, 1347 applicatifs/1083 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3C.md).

Rapport de préparation, pas un consentement : publication et naissance indisponibles, revalidation nécessaire lors de leurs futurs actes. Aucun état persistant nouveau, aucun export civil ou récit dans le rapport, aucune ressource ni correction automatique. Budgets de lecture 1000 dossiers/1000 verrous actifs/100 fiches M2/16 Mio sources/4 Mio rapport, refus intégral sans troncature ; ce ne sont pas des quotas de participation. Empreinte centrale 12, budgets centraux et quatre Masters historiques inchangés. Retour I3b sans conversion, avec perte du nouveau contrôle ; sauvegarde cohérente et restauration complète restent distinctes. C2, I3/INS-06 complet, I4/I5, 55 verdicts complets et SO-GAP-12/13/14 restent ouverts ; aucune recette mobile, charge, restauration globale ou production revendiquée.

## I3b — rapprochement courant du dossier et de M2

[I3b — comparaison et rapprochement](SO-01-I3B-RAPPROCHEMENT-M2.md) ajoute un aperçu privé, une confirmation motivée et l’alignement de l’identité/du plan M2 sur le dossier actuellement approuvé. Biographie conservée par défaut, remplacement explicite ; autres textes, secrets, objectifs et relations conservés. Relecture sans changement = aucune révision centrale supplémentaire. Double autorité MJ/M2, garde de cycle, conflits, réessais et audit préservés.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1347/1347 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés Firestore, cinq UI et un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après les deux CI. Base I3a `e97102c92aaef221c57003109112955368b869a9` : deux CI vertes, 1319 applicatifs/1059 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3B.md). Plafond CI porté de 40 à 50 minutes après un push I3a de plus de 38 minutes, commandes de test inchangées.

Le reçu privé n’autorise aucune activation et un réessai restitue un résultat historique. Retrait/consentement/choix invalide/archive bloquent une nouvelle application. Provenance RECONCILED_SNAPSHOT et empreinte globale 12 ; budgets 1659/16 Mio/4 Mio et Masters historiques inchangés. Conserver marqueurs privés, brouillon, droits, compteurs/verrous, historiques et reçus ensemble ; I3a n’est pas un retour fonctionnel équivalent. Validation courante dans les futures publication/naissance, C2 complet, I4/I5, restauration globale et recette humaine restent ouverts. INS-06/I3 complets, 55 verdicts complets et SO-GAP-12/13/14 non certifiés par cette tranche.

## I3a — candidature approuvée vers une fiche M2 privée

[I3a — préparation M2](SO-01-I3A-ADMISSION-VERS-M2.md) ajoute aperçu et confirmation explicites depuis une admission approuvée, avec droits MJ et lecture/édition M2 indépendants. Une copie native de la fiction et un lien privé stable, une transaction/révision commune, réessais sans doublon. Aucune incarnation, dotation, publication ou donnée civile copiée automatiquement dans M2.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1319/1319 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 22 nouveaux cas partagés Firestore, cinq UI et un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après les deux CI. Base C2m `6052b7ab38c3bd56b61beb803144080951ea0434` : deux CI vertes, 1292 applicatifs/1036 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3A.md).

Retrait/changement de classe conserve la fiche et signale le rapprochement requis ; les éditions/archives M2 ne sont jamais écrasées par réessai. Lien courant et publication restent à valider avant naissance : I3 complet/INS-06 ne sont pas livrés. 100 fiches archives comprises, empreinte interne 11, budgets 1659/16 Mio/4 Mio inchangés. Conserver lien privé, brouillon, droits, compteurs/verrous, historiques et reçus ensemble ; C2m n’est pas un retour fonctionnel équivalent. Quatre Masters historiques, 55 verdicts complets et SO-GAP-12/13/14 inchangés. C2 complet, I4/I5, restauration globale et recette humaine restent ouverts.

## C2m — Excel des modèles, ports et routes M3

[C2m — import/export M3](SO-04-C2M-EXCEL-SPATIOPORT.md) réunit Modeles/Ports/Routes dans un lot atomique avec aperçu, confirmation et révision commune. Sélection typée, homonymes, liens finaux, codes privés et validations natives ; caractéristiques V0.7 dérivées, aucun profil/code/barème libre par défaut. Aucune instance, voyage, ressource ou publication activée.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1292/1292 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI/XLSX, un HTTP/Auth ; syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après les deux CI. Base C2l `944f0569b1f7815eb98ab193ed966dcc2b446b75` : deux CI vertes, 1263 applicatifs/1011 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2M.md).

Trois feuilles requises même vides, 100 lignes cumulées/1 Mio ; 100 modèles/100 ports/200 routes archives comprises. Empreinte interne 10, bornes globales 1659/16 Mio/4 Mio inchangées. Les sept ateliers ont un import/export pour leurs types raccordés ; les gabarits documentaires complets ne sont pas certifiés. Quatre Masters historiques inchangés. Conserver provenances M3, brouillon, droits, historiques et reçus ensemble : C2l n’est pas un retour fonctionnel équivalent. MST-02/03/07/08/09 : preuves partielles ; 55 verdicts complets, navigation jouée et SO-GAP-12/13/14 inchangés. Publication, I3/I4/I5, restauration globale et recette humaine restent ouverts.

## C2l — Excel des boutiques et offres M5

[C2l — import/export M5](SO-05-C2L-EXCEL-BOUTIQUES-OFFRES.md) ajoute un fichier à deux feuilles Boutiques/Offres, sélection privée typée, aperçu, confirmation et transaction unique. Homonymes distincts, liens calculés sur les deux feuilles finales, validation native des prix et références, lectures M1/M2 indépendantes. Aucun stock, compte, QR, droit de vente ou achat activé.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1263/1263 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI/XLSX, un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; résultats du candidat exact dans la PR après les deux CI. Base C2k `78699b2a483191fdd3243d5dc90ec69b02ae96ea` : deux CI vertes, 1234 applicatifs/986 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2L.md).

100 lignes au total sur les deux feuilles, 1 Mio ; 50 boutiques/250 offres archives comprises. Bornes globales 1659/16 Mio/4 Mio inchangées, empreinte interne 9. Excel M1/M2/M4/M5/M6/M7 disponible ; M3 reste à livrer. Quatre Masters historiques inchangés. Préserver nouvelles provenances, droits, historiques et reçus avec le brouillon complet : C2k n’est pas un retour fonctionnel équivalent. MST-02/03/06/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Sept ateliers partiels, publication, I3/I4/I5, restauration globale et recette humaine encore ouverts.

## C2k — Excel des informations M6 et missions M7

[C2k — import/export M6/M7](SO-06-C2K-EXCEL-INFORMATIONS-MISSIONS.md) ajoute les feuilles `Informations` et `Missions` au contrat central v1 : sélection privée, aperçu, confirmation motivée et lot atomique. Textes et IDs conservés, listes JSON complètes, effacement explicite, diagnostics localisés et lectures croisées indépendantes. Aucun savoir, QR, mission jouée, récompense ou ressource activé.

**Local, 24 octobre 2026 : compilation et 1234/1234 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI/XLSX, un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après terminaison des deux CI. Base C2j `1fb8a7a47e4a185f3f50bde784fb58dd4995853c` : deux CI vertes, 1205 applicatifs/961 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2K.md).

100 lignes/1 Mio par fichier, 32 000 caractères par cellule sans troncature ; bornes natives et budgets globaux 1659/16 Mio/4 Mio inchangés. Empreinte interne 8. Excel central disponible pour M1/M2/M4/M6/M7 ; M3/M5 restent à livrer. Quatre Masters historiques inchangés. Conserver les nouvelles provenances avec brouillon, historiques, grants et reçus : C2j n’est pas un retour fonctionnel équivalent. MST-02/05/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Sept ateliers partiels, publication, I3/I4/I5, restauration globale et recette humaine encore ouverts.

## C2j — modèles, ports et routes M3

[C2j — préparation du spatioport](SO-04-C2J-SPATIOPORT-BROUILLON.md) ouvre les modèles des trois familles V0.7, les ports codés et les routes à distance/risque explicites. Valeurs canoniques fixes, ports différés et archives contrôlés, délégation M3, révisions communes, audit et réessais. Aucun vaisseau joué, carburant, voyage, événement, QR ou paiement créé.

**Local, 24 octobre 2026 : compilation et 1205/1205 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI, un HTTP/Auth. Firebase non exécuté localement (Java 17) ; résultats du candidat exact dans la PR après terminaison des deux CI. Base C2i `1a30c227ea85ebf149442015dc056a99984a08b3` revérifiée : deux CI vertes, 1176 applicatifs/936 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2J.md).

M3 reste partiel ; les sept ateliers ont désormais une édition préparatoire partielle, sans publication. Limites techniques : 100 modèles de vaisseaux, 100 ports, 200 routes, archives comprises ; 1659 changements globaux, 16 Mio/4 Mio inchangés, empreinte interne 7. Instances, carburant/modules M1, pilotes M2, lieux/QR, événements, rencontres financées, navigation jouée et Excel M3 restent à raccorder. Quatre Masters historiques inchangés. Préserver nouveaux types et grants M3 avec le brouillon complet : C2i n’est pas un retour fonctionnel équivalent. REC-SO-13 à 19 et MST-09 non certifiés ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication, I3/I4/I5 et recette humaine restent ouverts.

## C2i — missions M7 dans le brouillon commun

[C2i — préparation des missions](SO-06-C2I-MISSIONS-BROUILLON.md) ajoute missions narratives, étapes ordonnées avec identifiants stables, donneur M2, prérequis M6 et récompenses proposées M1. Lectures croisées explicites et suggestions sans secrets étrangers ; aucune attribution, progression, annonce, réservation, récompense ou paiement de session.

**Local, 24 octobre 2026 : compilation et 1176/1176 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI, un HTTP/Auth. Firebase non exécuté localement (Java 17) ; résultats du commit exact dans la PR après terminaison des deux CI. Base C2h `b080ed9dae51c5959cf809fc4d4008aa7caa8fd2` revérifiée : deux CI vertes, 1147 applicatifs/911 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2I.md).

M7 partiel, publication indisponible. Limites techniques : 100 missions, 40 étapes, 100 entrées par liste de prérequis/récompenses, 96 Kio par définition ; 1259 changements globaux, 16 Mio/4 Mio inchangés, empreinte interne 6. Sources réelles des récompenses, réussite, groupes, annonces, rendez-vous, événements et Excel M7 restent à livrer. Quatre Masters historiques inchangés. Préserver missions et grants M7 avec le brouillon complet : C2h n’est pas un retour fonctionnel équivalent. REC-SO-MST-05/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication, I3/I4/I5 et recette humaine restent ouverts.

## C2h — informations M6 et références M4

[C2h — préparation M6](SO-06-C2H-INFORMATIONS-BROUILLON.md) ajoute connaissances, indices et documents privés, destinataires proposés M2, archive/restauration et contrôle des références M4 vers M6. Lectures croisées explicites ; suggestions M4 sans texte, vérité MJ, notes ou destinataires. Aucun reçu de connaissance joueur, partage, déblocage de recette ou QR actif.

**Local, 24 octobre 2026 : compilation et 1147/1147 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 26 cas métier partagés Firestore, six UI, un HTTP/Auth ajoutés. Firebase non exécuté localement (Java 17) ; preuves du commit exact dans la PR après terminaison des deux CI. Base C2g `fad9bc4ed8be49087b19ef3a7a5de066b0161537` revérifiée : deux CI vertes, 1115 applicatifs/884 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2H.md).

M6 reste partiel, publication indisponible. Limites techniques : 250 informations, 100 destinataires par liste, 96 Kio par définition, 1159 changements globaux, budgets 16 Mio/4 Mio inchangés ; empreinte interne 5. Excel M6, cibles terrain, découverte et attribution restent à livrer. Quatre Masters historiques inchangés. Préserver nouveaux types et grants M6 avec le brouillon complet : C2g n’est pas un retour fonctionnel équivalent ; exports ciblés insuffisants pour une sauvegarde globale. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés ; publication, I3/I4/I5 et recette humaine ouvertes.

## C2g — boutiques et offres dans le brouillon M5

[C2g — préparation M5](SO-05-C2G-BOUTIQUES-BROUILLON.md) ouvre création, modification, archive/restauration des boutiques et offres, références au même objet M1 que M4 et au vendeur M2, diagnostics typés et contrôle commun. Lecture M1/M2 explicitement requise pour les suggestions ; aucun nom/état étranger révélé avec M5 seul. Prix proposés sans tarif par défaut ; aucun stock, compte, crédit, QR ou droit de vente créé.

**Local, 24 octobre 2026 : compilation et 1 115/1 115 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI, un HTTP/Auth. Firebase non exécuté localement (Java 17) ; résultats du commit exact à consigner dans la PR après terminaison. Base C2f `4ed82c3f56b3c9969f6ea176edcab19ed00758cc` : deux CI vertes revérifiées, 1 086 applicatifs/859 Firebase chacune, preuves [archivées](PR-1-HISTORIQUE-AVANT-C2G.md).

M5 reste partiel et non publiable. Limites techniques : 50 boutiques, 250 offres, 909 changements globaux, budgets 16 Mio/4 Mio inchangés ; empreinte interne 4. Excel M5, lieux, habilitations, caisse/stock, tarifs de jeu et transactions restent à livrer. Quatre Masters historiques inchangés. MST-03/06/08 : preuves préparatoires partielles seulement ; les 55 verdicts complets et SO-GAP-12/13/14 ne changent pas. Publication, I3/I4/I5 et recette humaine restent ouverts. Préserver types et grants M5 lors d’une reprise : C2f n’est pas un retour fonctionnel équivalent.

## C2f — cohérence des plans M2 et kits M1

[C2f — dépendances de dotation](SO-02-C2F-COHERENCE-INITIALE.md) : chaque plan initial actif référence le kit de sa classe principale ; absence, archive, corruption et références/consommables incomplets sont signalés sur les fiches concernées. Tableau des huit classes, nombres de définitions distincts des participants, provenance Excel jusqu’à `classe_id`, lecture transactionnelle sous droits C2b. Aucun accès supplémentaire en M2 isolé et aucune ressource créée.

**Validation locale du 24 octobre 2026 : 1086/1086 tests applicatifs réussis, zéro échec/annulé/ignoré/todo ; compilation réussie.** Node 24.22.1 / npm 11.9.0. 14 nouveaux cas métier partagés avec Firestore, deux cas purs, trois UI et un parcours HTTP/Auth. Firebase non exécuté localement (Java 17) ; CI du commit exact à consigner dans la PR après terminaison. Base C2e distante `0fa4d4af7855492fbffdc6e92c7a504816f959d0` : deux CI vertes revérifiées avant ce lot, preuves [archivées](PR-1-HISTORIQUE-AVANT-C2F.md).

`REFERENCES_CHECKED` ne certifie ni effets ni naissance ; `publicationAvailable=false`. Bornes 609 définitions/16 Mio/4 Mio conservées. Aucun état persistant ou migration C2f ; empreinte interne de contrôle portée à 3. Contrats et quatre Masters historiques inchangés. REC-SO-01/24, MST-03/06/08 et INS-06 : preuves préparatoires partielles seulement ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication, effets, I3/I4/I5, recette mobile et restauration complète restent à livrer.

## C2e — préparation des kits initiaux M1

[C2e — huit kits de classe](SO-02-C2E-KITS-INITIAUX.md) : éléments/quantités V0.7 fermés, références aux modèles M1, diagnostics différés et contrôle commun, révisions/archives/réessais sans dotation. **1067 tests applicatifs locaux et build réussis** ; 19 nouveaux cas partagés Firestore, un cas canonique, quatre UI et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. Limite centrale 609 définitions ; fichiers Excel M1 limités aux objets. Preuves préparatoires partielles uniquement, SO-GAP-12/13/14 et 55 verdicts complets inchangés. Effets/protections actifs, publication, I3/I4/I5 et recette humaine à compléter.

## C2d — Excel des personnages M2

[C2d — import/export M2](SO-02-C2D-EXCEL-PERSONNAGES.md) : sélection privée, aperçu, fiches narratives et plans C2c, références différées/localisées, lot atomique avec révisions natives et catalogue partagé intact. **1043 tests applicatifs locaux et build réussis** ; 17 nouveaux cas partagés Firestore, quatre UI/XLSX et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. MST-01/02/07 et INS-06 : preuves préparatoires partielles ; SO-GAP-12/13/14 et les 55 verdicts complets restent inchangés. Publication, effets/dotations, I3/I4/I5 et recette humaine à compléter. Export ciblé, pas une sauvegarde globale.

## Complément C2c — plans initiaux M2

[C2c](SO-02-C2C-PROFILS-INITIAUX.md) ajoute le champ privé `creationPlan` aux définitions M2 C1e. Sauvegarder avec les changements, histoires, révisions et reçus ; les exports M1/M4 ou Masters historiques ne le couvrent pas. Omission par un ancien client conserve, null explicite retire ; un ancien lecteur C2b ne sait pas valider ces plans et ne constitue pas un retour fonctionnel équivalent. Aucun profil actif ni ressource créé, aucune migration ou restauration complète exécutée.

## Complément C2b — droit de contrôle et révisions

[C2b](SO-02-C2B-DELEGATION-CONTROLE.md) ajoute `campaignStaff.checkCentral` et lie le rapport aux droits courants. Préserver ce champ avec les révisions, historiques et reçus C1b ; les exports ciblés ne les sauvegardent pas. Désactiver efface le droit, réactiver ou rejouer un ancien reçu ne le restaure pas. Un ancien binaire C2a ferme le contrôle aux délégués et son éditeur peut effacer le champ : retrait de capacité, pas retour fonctionnel équivalent. Revalider explicitement les délégations après reprise. Aucun rapport persistant, migration, restauration complète ou production exécuté.

## Complément C2a — contrôle en lecture seule

[C2a](SO-02-C2A-CONTROLE-CENTRAL.md) ne crée ni rapport persistant, version, pointeur, reçu ni donnée économique. Son empreinte n'est pas une sauvegarde ni une autorisation de publication. Un retour logiciel conserve les contrats et états des lots antérieurs ; aucune restauration de données C2a à exécuter. Les limites agrégées du contrôleur ne sont pas une certification de charge. Publication/reprise et restauration globale restent à éprouver sur données fictives.

## Complément C1e — définitions narratives M2

[C1e](SO-01-C1E-PERSONNAGES.md) ajoute les changements `character_{id}` et délégations M2 au même ensemble cohérent du brouillon. Préserver leurs IDs, `contentRevision`, histoires et reçus avec campagne/droits/opérations. Les Masters historiques et exports ciblés M1/M4 ne les sauvegardent pas. Aucun rollback fonctionnel vers un lecteur refusant les grants M2, aucune restauration complète ni production exécutée.

## Complément C1d — reçus de lots Excel centraux

[C1d](SO-01-C1D-EXCEL-CENTRAL.md) ajoute les reçus `masterDrafts/initial/imports` à préserver avec changements/historiques et `operations`. Un export ciblé M1/M4 contient les définitions sélectionnées et le contexte, pas les droits, reçus ou historiques : il ne permet pas une restauration complète. Aucun exercice de restauration ni déploiement exécuté.

## Complément C1b — brouillon, délégations et reçus cohérents

[Contrat C1b et reprise](SO-01-C1B-BROUILLON.md) : sauvegarder ensemble le header de campagne, `masterDrafts/initial` et changements/historiques, `campaignStaff`, audit et `operations`, avec la préparation et ses admissions I1/I2. XLSX historique et archive de scénario insuffisants. Ne pas revenir à un lecteur ignorant ces droits/changements. Interruption transactionnelle, réponse perdue et restauration d’une définition archivée testées automatiquement ; **sauvegarde/restauration complète et rollback opérationnel non exécutés**. Aucun déploiement autorisé.

## Complément I2b — groupes et permissions cohérents

[Contrat et reprise I2b](SO-01-I2B-GROUPES.md) : sauvegarder ensemble `group.roster`, membres, versions, audit, opérations et autorisations, avec comptes/ledger/stocks/contrats. XLSX seul insuffisant. Ne pas revenir à un binaire pré-I2b ignorant la politique. Interruption avant commit, réessai après réponse perdue et contre-opération liée testés automatiquement ; sauvegarde/restauration complète, retour arrière opérationnel et recette mobile non exécutés. Aucun déploiement autorisé.

## Complément I2 — confirmations cohérentes

[Contrat I2 et reprise](SO-01-I2-DECISIONS.md) : sauvegarder ensemble registrations/historiques, total de session, compteurs par classe, réservations d’identité, invitations/usages, reçus/audit et contexte central. Ne jamais restaurer un seul compteur ou revenir à un binaire I1 qui ignore les confirmations. Annulation avant commit et réessai après réponse perdue sont testés automatiquement ; restauration complète et retour arrière opérationnel restent non exécutés. Aucun déploiement autorisé par ces preuves.


**Procédure préparée, jamais lancée. Aucune mise en production autorisée.** Le candidat actuel n'est pas prêt : voir [rapport de conformité](SO-VALIDATION.md). Aucun nom de projet de recette, URL, compte ni stockage de sauvegarde disponible n'est présumé. Aucun changement de droits Firebase, IAM, DNS ou comptes de production n'est inclus dans les autorisations actuelles.

## 1. Préparer le candidat et la recette isolée

1. Figer le SHA de branche, la version applicative, le référentiel publié et les éventuelles migrations. Relire le diff, l'intégrité des quatre Masters et les dépendances. Identifier la base main réelle et les changements concurrents.
2. Vérifier la CI de ce SHA : build, `npm test`, Firestore/Auth/Storage Emulator avec Node 22 et Java 21. Vérifier l'absence de job ou déclenchement de déploiement. Ne pas modifier `.github/deploy-request.json`.
3. Identifier un environnement de test séparé, sa configuration, son stockage et ses comptes fictifs propriétaire/MJ/accueil/joueurs. Tester les identifiants de projet réellement utilisés avant toute écriture ; refuser les identifiants de production. Les émulateurs `demo-gn-engine` suffisent aux tests automatiques, pas à l'homologation des appareils et du terrain.
4. Préparer la recette REC-SO-01 à 24, REC-SO-FOR-01 à 06, REC-SO-REC-01 à 05 et SEC-SO-01 à 10 ; utiliser les barèmes FINAL, comptes PNJ/assureur réellement provisionnés, stocks et lots fictifs identifiés. Fixer les seuils de performance avant la mesure à environ 60 utilisateurs ; ne pas assimiler une fixture de 60 fiches à une charge de 60 utilisateurs.
5. Jouer les cas sur Android/iOS, plusieurs rôles, coupure/reprise réseau, double clic et concurrence. L'organisation valide séparément armes, protections, sorties sûres et scénographie. Tout blocage de sécurité, perte/duplication ou résultat inconnu suspend la validation.

## 2. Sauvegarde préalable à une future migration

L'export catalogue XLSX et l'archive `.gnscenario.zip` ne couvrent pas une session vivante. Une sauvegarde complète doit être définie et restaurée en test avant toute demande de déploiement avec migration.

| Ensemble à inventorier | Exigence de sauvegarde / vérification |
|---|---|
| Scénarios, versions, campagnes, sessions et sous-collections | Export cohérent des documents, identifiants et relations, comprenant profils, santé, PA, horloges, clôtures et constructions d'épisodes en cours |
| Comptes, ledger, opérations/idempotence, contrats, réservations et stocks | Même point de cohérence ; total par compte, réservé/disponible, nombre/quantité de lots, propriétaires et liens aux opérations |
| Navires, trajets, états terrain et futurs combats/assurances | Temps restant, tirages, ordres, usages, sinistres et réserves associés ; aucun effet rejoué à la restauration |
| Authentification et attributions | Plan distinct de conservation/restauration des UID et des liens, sans exposer de secrets dans Git ; éviter restauration partielle incompatible avec les sessions |
| Storage et médias | Objets et métadonnées, empreintes, références et autorisations associées ; vérifier objets manquants et références privées |
| Configuration et code | SHA, lockfile, versions outils, règles/index/configuration existants, inventaire des secrets et droits sans valeur secrète dans le rapport |

Après autorisation dédiée d'accès à la cible réelle : définir la fenêtre cohérente de sauvegarde et la suspension des mutations, le responsable, la destination protégée, la rétention et les restrictions d'accès. Relever date, projet, volumes, inventaire et empreintes. Vérifier le statut de chaque export. Aucune commande de production n'est exécutée dans le cadre de cette préparation.

## 3. Répéter la reprise en environnement isolé

1. Restaurer une copie autorisée dans une cible isolée ; utiliser des données fictives pour les essais actuels. Toute utilisation de données réelles exige un traitement approprié et ne doit pas être copiée dans les fixtures Git.
2. Vérifier les comptes Auth/UID et relations de médias sans élargir les droits. Contrôler les totaux des comptes, crédits réservés, lots et propriétés avant/après ; aucune création de monnaie ou d'objet.
3. Exécuter une migration versionnée en aperçu, l'appliquer sur la copie, interrompre/reprendre à une frontière prévue, puis répéter. Exiger l'idempotence et une trace de chaque décision ; ne pas réécrire les versions historiques.
4. Tester spécialement la reprise des voyages/contrats/réserves, les horloges et expirations A38, la mort stabilisée et les demandes en attente. Une sauvegarde Firestore sans Auth/Storage cohérents n'est pas déclarée restaurable.
5. Consigner commandes exactes, durées mesurées, volumes, erreurs et preuve de restauration. Les objectifs de perte de données et délai de reprise restent à fixer ; aucune durée n'est promise ici.

SO-06a n'a aucune migration : le retour arrière du code d'export suffit pour cette tranche. Les futures migrations économiques ou de campagne nécessiteront leur propre procédure ; restaurer une sauvegarde après reprise des transactions peut perdre des opérations nouvelles. Prévoir une compensation auditée ou une reprise contrôlée, jamais une restauration aveugle en activité.

## 4. Dossier à soumettre avant publication

- SHA exact et diff final, version du profil, CI complète de ce SHA et registre des 24 recettes + 6 FOR + 5 Recettes & Potions et 10 essais avec preuves ; anomalies résiduelles et acceptation motivée des seules limites non bloquantes.
- Cible exacte, services affectés et migrations, preuve de sauvegarde/restauration, fenêtre, responsable et possibilité de retour arrière.
- Plan de déploiement détaillé adapté aux workflows réels de ce jour, contrôles après publication et conditions d'arrêt. Le présent document ne vaut pas demande d'exécution implicite.
- Autorisation explicite du propriétaire pour la mise en production et pour les éventuelles opérations de configuration distinctes. Sans cet accord, conserver branche/PR et ne déclencher aucun workflow de déploiement.

## 5. Ordre proposé après autorisation future seulement

Reconfirmer les prérequis et le SHA approuvé → sauvegarde cohérente vérifiée → suspension des mutations si nécessaire → migrations approuvées et journalisées → déploiement du seul candidat approuvé selon le mécanisme alors autorisé → contrôles de version, accès privé, QR, transactions, comptes/stock, médias et reprise → décision de réouverture.

Arrêter si cible/SHA inattendu, backup incomplet, test bloquant, dérive de droits, divergence de compte/lot, duplication, rupture d'accès privé ou migration non idempotente. Conserver les preuves, empêcher les nouvelles mutations selon la procédure approuvée et choisir le retour arrière adapté au code **et** aux données. Ne pas improviser de changement IAM/DNS pour débloquer un incident.

**État actuel :** sauvegarde de production non réalisée ; restauration non exécutée ; recette terrain non passée ; procédure de déploiement non validée et non lancée.

## Complément V3.2 / SO-06b

Inclure `recipes`, ses historiques et reçus Master dans toute sauvegarde future, ainsi que les objets, compétences, connaissances et lieux référencés. Les archives scénario de ce candidat incluent ces définitions, mais restent distinctes d’une sauvegarde de session vivante. Aucun stock de potions n’est créé dans SO-06b. Les futures doses devront conserver version de recette, origine des composants et opération idempotente.

Aucune migration des anciens documents n’est requise. Un ancien code ignorant `recipes` ne doit pas servir à exporter ou copier une campagne qui en contient : il omettrait cette collection. Un retour arrière devra préserver les nouvelles données et empêcher ces opérations, ou utiliser un correctif compatible. Ne pas effacer les brouillons pour revenir à un ancien code. Les contrôles automatisés d’archive/campagne de SO-06b ne remplacent pas une restauration complète Auth/Firestore/Storage en environnement isolé.

Avant de rendre les recettes jouables, exécuter les cinq REC-SO-REC avec une publication valide comme témoin, ainsi que refus de droits, double clic, interruption avant/après commit et reprise réseau. Tester l’activation volontaire sur mobile et l’absence totale d’effet depuis un compte tiers. Préparer ces essais ne vaut pas autorisation de provisionner ou publier en production.

## Complément V3.4 — conception à valider avant migration

Le [plan central SO-00](SO-00-V34-PLAN-CENTRAL.md) est soumis à validation explicite conformément à la demande utilisateur. Aucune adoption de campagne ni conversion de données n’a été exécutée. Les sept ateliers importent dans un brouillon commun ; la future publication active une version complète par pointeur après contrôle global. Les sessions restent épinglées à leur configuration, et le jeu déjà effectué n’est jamais restauré par un rollback de configuration.

Inclure les futurs en-têtes/pointeurs, révisions, brouillons, changements, imports et provenance, manifestes, graphes de dépendances, publications en cours, pages et reçus idempotents dans le plan de sauvegarde. Les permissions de campagne sont distinctes des droits de session : aucune attribution héritée implicitement lors d’une adoption/restauration.

Tester REC-SO-MST-01 à 10, en plus des 24 SO, six FOR, cinq REC et dix SEC. Le test crucial doit refuser globalement une recette référençant un ingrédient absent, puis activer M1/M4/M5 en une version après correction. Tester M3 seul, deux MJ publiant sur une base obsolète, une coupure entre préparation et bascule et un rollback conservant achats/XP/stock/contrats.

La sonde SO-00 a seulement exécuté l’archive existante sans images vers un nouveau scénario et vérifié les comptes/stock de la session source inchangés. Elle ne démontre pas la restauration complète de Firebase ni un retour de pointeur V3.4, qui n’existe pas encore. Aucune sauvegarde de production effectuée. Une autorisation de ce plan ne permet ni migration d’une session active ni déploiement ; la procédure de production reste à faire approuver séparément.

## Complément V3.5 — admissions, naissances et groupes

[Diagnostic et dépendances](SO-00-V35-INSCRIPTIONS.md). Le registre comporte désormais **55 cas ciblés** (24 SO, 6 FOR, 5 REC, 10 MST, 10 INS) et 10 SEC transversaux. Aucun résultat de recette Android/iOS ou de restauration complète n’est affirmé.

Inclure dans les sauvegardes futures : propositions et historiques privés, invitations par but et reçus de consommation (jamais jetons en clair), quotas et clés d’identité fictive, progression participant/XP, réserves déjà incarnées, naissances et reçus de dotation, mandats et contre-opérations de groupe. Les liens UID restent cohérents avec Auth ; ni données civiles ni préférences d’amis dans les exports publics/M2.

Réessayer une naissance après restauration ne doit créer aucun kit, crédit protégé ou PA supplémentaire ; rejouer une vieille permission ne doit pas restaurer un mandat retiré. Tester réserve et création à chaud, deux décès dans une session, quota concurrent et transfert de groupe pendant une dépense. Les contre-opérations de groupe corrigent l’appartenance sans annuler les transactions passées ou transférer les actifs de la caisse. La restauration d’un Master n’est pas le retour arrière du jeu vécu.

Cette tranche ne change que documentation et tests : aucun retour arrière de données nécessaire, aucun revert exécuté. Une future adoption de campagne reste soumise au plan de migration validé et à la preuve de restauration isolée. Le déploiement reste **À FAIRE VALIDER, NON LANCÉ**.


## C1a — contexte neuf et retour logiciel

[Guide C1a](SO-01-C1A-PREPARATION.md). Les nouvelles préparations conservent une identité campagne/session, une empreinte d’intention, des révisions, reçus d’opérations et grants de session. Inclure ces éléments et leurs journaux dans la sauvegarde cohérente avec Auth. Ne jamais supprimer les reçus puis rejouer une création.

Un ancien binaire ignorant `preparationKind` ne protège pas ces contextes. Dès qu’ils existent, un rollback exige suspension des écritures et conservation d’une garde compatible, ou restauration cohérente explicitement approuvée ; un simple revert n’est pas présenté comme sûr. Les tests simulent seulement une exception avant commit puis un réessai. Sauvegarde/restauration intégrale et rollback logiciel réels : NON EXÉCUTÉS. Aucun environnement de production n’est modifié.

## Complément I1 — aucune opération de production exécutée

Conserver avec C1a le brouillon initial et ses changements/historiques, les paramètres d’admission, registrations/historiques, invitations/usages, grants, audit et reçus operations. Ne jamais restaurer isolément les compteurs de liens ou supprimer les reçus pour rejouer une création. Le test d’exception avant commit démontre l’atomicité, pas une restauration complète. Retour à un ancien binaire ignorant C1a/I1 interdit comme procédure implicite ; geler les écritures puis conserver une garde compatible ou faire valider une restauration cohérente. [Détails et limites I1](SO-01-I1-ADMISSIONS.md).


## Dossiers d’abordage après duel

Les nouveaux manifestes boardingVersion=1 (combatVersion/navigationVersion requis) et rencontres marquées figent les trajets et équipages d’origine. Sauvegarder/restaurer ensemble `spaceCombats` et ses enfants `rounds`/`boardings`, le pointeur activeBoardingId, ships/combatId, voyages et manifestes, personnages/droits, opérations/reçus, logisticsHistory/audit et horloges. Ne jamais restaurer seulement le parent : cela pourrait perdre une scène ou laisser un verrou sans dossier. La reprise native d’épisode copie aussi les enfants boardings et garde le temps de jeu ; aucun enrichissement d’un ancien manifeste ou combat. Un binaire antérieur ignorant cette phase ne constitue pas un retour fonctionnel. Le contrôle enregistré ne transfère ni titre ni fret ; les services de survie et limites de captivité restent indépendants. Cette procédure est documentaire : aucune sauvegarde distante, migration ou publication exécutée par cette tranche.

### Extension des abordages aux rencontres de flotte — 1er novembre 2026

`fleetBoardingVersion=1` dépend de boardingVersion/convoyVersion, scellé dans les nouveaux manifestes et rencontres seulement. Sauvegarder les trajets/équipages figés à l’interception, `boardingTargets` (redditions acceptées et Coques zéro par round), `boardingDepartedShipIds` (fuites/décrochages), la carte des camps, chaque enfant boardings/rounds, activeBoardingId, les deux verrous de la paire et les autres voyages indépendants, avec personnages/droits/horloges/audit/reçus. Une restauration partielle perdrait une exclusion de fuite ou une preuve de reddition. Reprise native entre épisodes sans écoulement hors jeu ; pas de reconstruction d’anciennes flottes depuis leur dernier round. Les dossiers de duels antérieurs restent lisibles sous boardingVersion. Le binaire précédent ne comprend pas le parcours de flotte ; aucun retour fonctionnel garanti pour lui. Un dossier de passerelle ne transfère ni fret ni titre de propriété. Aucun déploiement, migration ou sauvegarde distante effectué par cette tranche.

### Rançon volontaire liée à l’abordage — 1er novembre 2026

Les nouveaux manifestes boardingRansomVersion=1 dépendent de boardingVersion/shopsVersion. Les nouveaux dossiers ransomVersion=1 peuvent conserver un unique reçu de paiement personnel natif dans ransom, sans transfert de titre ou de fret. Sauvegarder/restaurer ensemble le dossier d’abordage et son reçu, les deux comptes et historiques, le ledger TRANSFER, les opérations idempotentes, les identités/versions/droits et les voyages/verrous/horloges. Ne pas restaurer les soldes seuls : cela perdrait le lien du paiement et pourrait permettre un second débit. Les autres membres de la paire ne voient que le statut payé ; conserver les projections privées du montant/libellé. La libération reste indépendante du paiement et de la limite réelle de captivité. Reprise d’épisode sans nouveau paiement, dotation ou transmission patrimoniale. Aucune ancienne version/dossier enrichi ; binaire antérieur non équivalent. Aucun déploiement, migration ou sauvegarde distante exécuté.

### Transbordement supervisé sous garde — 1er novembre 2026

Nouveaux manifestes boardingCargoVersion=1 (boardingVersion/logisticsVersion), nouveaux dossiers cargoVersion=1 seulement. Sauvegarder ensemble spaceCombats et enfants boardings, cargoTransfers/boardingContext, inventory/scissions/boardingCustody et historiques, logisticsHistory/audit/operations, ships/voyages/manifeste/identités/droits, horloges et marqueurs. Les fonctions natives partagées n’ajoutent ni collection ni conversion. Une restauration partielle des seuls lots perdrait une réservation ou la garde provisoire ; ownerId doit rester inchangé. Réception ou annulation obligatoire avant libération et clôture native ; les tranches reçues traversent les épisodes sans nouvelle attribution. La restitution conserve le propriétaire et exige sa présence vivante au port du receveur, avec trois nouvelles minutes. Aucun accès automatique aux compartiments cachés/coffres, fret confié ou droit de vendre/utiliser/acquérir. Anciennes versions non enrichies ; binaire ignorant boardingContext/custody non équivalent pour reprendre ces dossiers. Aucun déploiement, migration ou sauvegarde distante exécuté. CI du candidat exact à consulter dans PR #2 ; recette humaine distincte.

### Récapitulatif de garde en régie/bilan — 1er novembre 2026

La projection boardingCustodyReport ne persiste aucune donnée : elle se recalcule depuis inventory/boardingCustody, cargoTransfers, ships/ports, characters/registrations et les parents spaceCombats/dossiers boardings déjà sauvegardés. Ne pas la restaurer comme une seconde source de droits ou un second stock. Même état en régie et au bilan, scissions et restitutions comptées sur les lots actuels, alertes sans correction automatique. Garder l’ensemble natif cohérent : une référence manquante est signalée sans reconstructeur de titre. Marqueur boardingCargoVersion existant, aucune migration/version nouvelle ; retour au parent perd la vue sans changer les biens. Clôture/reprise inchangées. Aucun déploiement, sauvegarde distante ni recette humaine exécuté par cette tranche ; CI exacte dans PR #2.

### Fret PNJ confié sous garde — 1er novembre 2026

boardingFreightVersion=1 (boardingCargoVersion/transportVersion) et freightVersion=1 sur nouveaux dossiers uniquement. Sauvegarder/restaurer ensemble dossier/parents, lots/scissions/boardingCustody, cargoTransfers, contrat/termes/propriétaire/comptoir/transporteur et versions d’accès, preuves et réserves salariales, références de voyage/tronçon, vaisseaux et horloges. Ni garde ni voyage du receveur ne remplacent le transport confié d’origine. Une restitution ne valide pas la remise finale ; ownerId reste celui du comptoir et le titulaire d’origine retrouve la garde dans sa propre soute avant le parcours natif. Restaurer seulement emplacement/holderId ferait perdre un droit ou une exclusion de livraison. Aucun nouveau registre ou collection ; anciennes données non enrichies. Binaire précédent incapable de reprendre ce retour PNJ/voyage sous garde. Aucune migration, sauvegarde distante, fusion ou publication exécutée ; CI exacte du candidat dans PR #2, recette humaine distincte.

### Retour au comptoir propriétaire — 1er novembre 2026

Nouveaux boardingShopReturnVersion=1 et dossiers shopReturnVersion=1, direction RETURN_SHOP. Sauvegarder/restaurer ensemble marqueurs/dossiers/parents, lots/scissions/custody/cargoTransfers, contrat/termes/port d’origine/comptoir/stock, identités/droits, réserves et preuves financières, voyages et horloges. Le lot rendu à SHOP reste lié au contrat jusqu’au traitement natif : ne pas fusionner ou recréer son stock commercial à la restauration. Retour physique, remise en stock et règlement sont trois effets distincts ; aucune somme ni propriété héritée. Réserves conservées après décès/révocation sans règlement forcé. Anciennes données non enrichies, aucune migration ; binaire parent incapable de reprendre une tranche RETURN_SHOP en cours. Les biens déjà retournés conservent les états natifs. Aucun déploiement, sauvegarde distante, fusion ou recette humaine exécuté ; CI exacte dans PR #2.

### Soutien volontaire à une rançon — 1er novembre 2026

boardingRansomSponsorVersion=1 (boardingRansomVersion/fleetBoardingVersion), nouveaux dossiers sponsorVersion=1. Conserver ensemble le parent spaceCombats et tous ses équipages/versions d’origine, enfants boardings/sponsor/ransom, voyages/verrous, identités/droits, comptes/historiques/ledger TRANSFER/operations et horloges. La demande ne réserve aucun fonds et n’ajoute aucun membre à la scène. Restaurer seulement la demande sans ses versions pourrait ouvrir une identité différente ; restaurer seulement les soldes perdrait le reçu unique du dossier. Le payeur réel peut être hors de la paire : maintenir la projection minimale et la confidentialité du détail financier au payeur/bénéficiaire/MJ. Retrait/remplacement sans débit, libération indépendante. Épisodes sans dotation ou réhabilitation d’une ancienne version d’accès. Pas de collection nouvelle ou migration ; ancien binaire sans parcours de soutien, comptes et ledger restent natifs. Aucun déploiement, sauvegarde distante, fusion ou recette humaine exécuté ; CI du candidat exact dans PR #2.


### Refus personnel du soutien — 1er novembre 2026

Marqueurs boardingRansomSponsorVersion/sponsorVersion existants, aucune migration. La décision explicite retire sponsor et conserve sponsorDecision (identité/version, DECLINED, date) dans le dossier natif ; sauvegarder ensemble dossier, parent/équipages d’origine, droits, historiques/reçus, comptes/ledger, voyages/verrous et horloges. Le refus ne modifie aucun fonds, bien ou délai. Une restauration ne doit jamais réintroduire le sponsor refusé en perdant la décision/révision. Le binaire précédent ne montre pas l’accusé, mais trouve sponsor absent et refuse l’ancien paiement. Nouvelle demande explicite seulement, effaçant la décision courante avec une nouvelle révision ; historique conservé. Accusé privé minimal et continuité native, sans nouveau droit ni dotation. Preuves du candidat exact dans PR #2 ; aucune restauration distante, migration, fusion ou publication exécutée.


### Nom d’usage des vaisseaux — 1er novembre 2026

shipNamingVersion=1 dépend de navigationVersion, nouveaux manifestes seulement. Aucun ancien manifeste enrichi ni nouvelle collection. Chaque renommage explicite conserve transponder et ajoute le nom précédent à previousNames dans ships ; garder ces champs avec propriétaire/pilote, identifiant, profil/état, stocks, contrats, droits, logisticsHistory/audit/operations et marqueur du manifeste. La reprise native copie ces données sans nouvelle dotation. Un retour au binaire précédent perd le parcours et l’affichage des anciens noms ; ses mises à jour natives du vaisseau conservent ces champs. Ne pas réattribuer l’exemplaire par provisionnement ou effacer les anciens noms pour contourner le maximum technique de cent changements. Le nom d’usage ne constitue ni une nouvelle identité technique/documentaire ni un transfert de propriété. Preuves du candidat exact dans PR #2 ; aucune restauration distante, migration, fusion ou publication exécutée.


### Diagnostic technique préparé MEC-01 — 2 novembre 2026

Nouveau technicalAnalysisVersion=1, garde actionsVersion=1 en session, aucun ancien manifeste enrichi. Garder ensemble manifeste/pages M6, fieldTargets/profil/révision, fieldStates.analyses par personnage, fieldActions, personnages/droits, PA réservés et fieldCooldowns, horloges et carnet knowledge avec textes figés, audit/historiques/reçus. Une restauration partielle ne doit pas effacer une tentative déjà résolue ou distribuer de nouveau une information/PA. La reprise native conserve dossier et tentative, applique les expirations temporaires A38 sans nouvelle analyse de la même version ; aucun changement de panne inféré. Aucun compte/stock/réparation technique ni nouvelle collection. Le binaire précédent ne reconnaît pas le profil MEC-01 : retour non fonctionnel équivalent pour ce parcours. Preuves du candidat exact dans PR #2 ; aucune sauvegarde/restauration distante, migration, fusion ou publication exécutée.


### Contrôles explicitement ciblés — 2 novembre 2026

La sélection CI ajoute un plan de test et deux exécuteurs, sans donnée de jeu persistante ni migration. Conserver source du candidat, arbre/checkout, plan et journaux avec la preuve de validation. Un succès [ci targeted:ci] ou [ci targeted:diagnostic] ne devient pas référence ancestrale pour une validation ordinaire ; les changements restent comparés depuis un succès antérieur hors marqueur. Tests non sélectionnés et étapes navigateur non requises ne constituent pas une couverture exécutée. Avant fusion/publication, exiger la validation complète du candidat prévue par le cycle ; aucune fusion, publication, sauvegarde ou restauration distante exécutée ici.
