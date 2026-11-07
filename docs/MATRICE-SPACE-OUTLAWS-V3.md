# Matrice SPACE OUTLAWS V3.2 / V0.7

## Comparaison et contrôle du Master Vn+1 — 7 novembre 2026

Le rapport du brouillon compare la base publiée vérifiée et les modifications web. Il distingue les ajouts, modifications, archivages et restaurations. Une définition revenue à son état publié disparaît du diff net. Le rapport indique les champs modifiés, y compris ceux liés à la confidentialité, à la visibilité et aux QR, sans afficher leurs valeurs privées.

Le graphe vérifie les définitions héritées et modifiées ensemble. Il identifie les liens ajoutés, retirés ou dont la cible a changé d’état, par exemple un kit intact dont un objet est archivé dans le brouillon. Les diagnostics gardent la provenance des définitions. Le propriétaire et les délégués explicitement habilités au contrôle global y accèdent avec l’identifiant et la révision du brouillon. Le rapport est en lecture seule et respecte les limites centrales de 1 809 définitions effectives, 16 Mio d’entrées et 4 Mio de sortie.

Périmètre §3.6, aperçu du diff et contrôle des références raccordées. Les vérifications sur les données opérationnelles et les références signalées comme non contrôlées restent à compléter. Excel, instantanés, publication et retour de version Vn+1 restent à raccorder. Preuves du commit exact dans [PR #2](https://github.com/gkerckhofs-a11y/gn-engine/pull/2).

## Brouillon du Master après publication — 7 novembre 2026

Le propriétaire ouvre depuis le tableau de bord un brouillon commun Vn+1 rattaché au manifeste publié et à la révision de son pointeur. Les ateliers héritent des définitions figées. Ils enregistrent seulement les ajouts, modifications et archivages web dans ce brouillon. Les droits de lecture et d’édition restent distincts par atelier. Chaque modification conserve le motif, l’auteur et la définition précédente.

Le brouillon utilise l’époque du pointeur comme identifiant. L’ouverture ne modifie ni le pointeur, ni les pages publiées, ni les sessions et leurs confirmations en cours. L’édition vérifie l’identité et la révision du brouillon, ainsi que la révision de la définition. Sauvegarder ensemble le manifeste et ses pages, le brouillon et ses changements, historiques, délégations et reçus.

Périmètre §3.6, étapes 1 et 2 pour l’édition web. L’import/export Excel, les instantanés, le diff et les contrôles globaux du Vn+1, sa publication et le retour de version restent à raccorder. Preuves du commit exact dans [PR #2](https://github.com/gkerckhofs-a11y/gn-engine/pull/2).

## Recherche unifiée des personnages — 6 novembre 2026

Base `918e68f0afad1b55de7da1f904dad42c32c23c85`, [CI 42237060772](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42237060772) completed/success : 1 082 applicatifs, 858 Firestore et 25 HTTP. [Parcours, sources et limites](SO-RECHERCHE-PERSONNAGES.md).

La régie propriétaire/MJ réunit instances actives, premières naissances à préparer, réserves non incarnées, décès et remplacements. Définitions de la version figée de session ; un dossier même retiré conserve sa définition réservée. Liens prédécesseur/successeur seulement réciproques. Recherche par nom courant, nom lié et souhait privé courant. Aucun UID ni secret de fiche dans la projection.

Lecture seule : aucune incarnation, attribution de ressources ou permission ajoutée. Réserves, décès, remplacés, incohérences, STOP et clôture n’ouvrent pas de formulaire d’affectation. Les parcours natifs de naissance/relève restent requis. Anciens marqueurs et sessions génériques conservés ; aucun nouveau marqueur ni migration.

Validation locale ciblée : 136/136 tests dans neuf fichiers et build réussis ; dix parcours Chromium bureau/petit écran simulé réussis, capture petit écran inspectée. Profil CI targeted-roster-search : 87 fichiers applicatifs, 52 suites Firestore et 26 HTTP sélectionnés, périmètre cumulé des dépendances non fusionnées ; aucun complet. Consigner le résultat du commit exact dans PR #2 après CI. Aucun appareil réel ou test humain certifié.

Restent mandats collectifs, nouvelle version Master et recette. Même branche/PR #2, sans merge ni déploiement Firebase.

## Souhaits privés d’amis en régie — 6 novembre 2026

Base `b8625fac61405db8c213a007e1e83821129444c6`, [CI 42226337186](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42226337186) completed/success : 1 068 applicatifs / 846 Firestore / 24 HTTP, huit jobs réussis. [Parcours et limites](SO-SOUHAITS-GROUPES.md).

Lecture privée du champ natif admission.proposal.friends dans groupManagement, propriétaire/MJ courants seulement, après autorisation et sous groupsVersion=1. Aucun marqueur de jeu ou stockage supplémentaire. Projection bornée des seuls dossiers approuvés avec souhait courant ; pas d’UID/courriel/métadonnées d’inscription, ni de texte dans M2/groupe/historique/joueur/public. Le texte libre peut contenir les coordonnées saisies par l’auteur, jamais interprétées. Aucun lien ou consentement entre personnes déduit.

Recherche commune nom fictif/souhait et bouton vers le formulaire natif, sans groupe/permission/autorisation présélectionnés. Avant naissance, décès, STOP et clôture : consultation sans affectation. Le rattachement au personnage courant est vérifié ; la relève n’hérite pas d’un ancien souhait depuis l’historique, les épisodes conservent uniquement le dossier courant. Affectation et ressources restent sous commandes natives.

Validation locale explicitement ciblée : build et 127/127 tests dans huit fichiers, douze nouveaux cas partagés ; huit parcours Chromium bureau/petit écran simulé réussis, captures inspectées. CI targeted-friend-requests : 86 fichiers applicatifs / 51 suites Firestore / 25 HTTP, périmètre cumulé des dépendances non fusionnées, aucun complet. Résultat du commit exact à consigner dans PR #2 après CI Node 22/Java 21. Aucun appareil réel ou recette humaine certifiés.

Restent recherche unifiée de toutes réserves/remplacés, mandats collectifs, Master Vn+1 et recette ; pas de réseau d’invitations entre amis ajouté. Conserver rôles, dossier privé courant/projection, commandes/reçus/historiques, relève et épisodes. Aucune copie du souhait dans la fiction ni reconstruction pour un successeur. Même branche/PR #2 ; aucun merge, déploiement Firebase ou migration.


## Groupes M2 vers la session — 6 novembre 2026

Base `a5e33fd6e3bc85c33c4f29373675692d5ce88c7a`, [CI 42220814560](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42220814560) completed/success : huit jobs, 1 027 applicatifs, 811 Firestore et 23 HTTP. [Périmètre, preuves et reprise](SO-GROUPES-M2.md).

Les définitions group M2 deviennent publiables sous groupDefinitionsVersion=1 et groupsVersion=1. Forme native, références même inactives, droits raccordés, 50 groupes et budget des définitions contrôlés avant publication et lecture de version. La publication ne crée aucune instance. Première naissance seulement : groupes avec contenu natif, membres vides, sans roster/type/capacité inventés ; provenance vers le manifeste, aucune dotation. Les naissances suivantes ne rejouent pas les groupes.

Les appartenances prévues, dont réserves, sont relues depuis la version de session en régie propriétaire/MJ. Configuration puis aperçu et confirmation par les commandes de session existantes ; autorisation de droits jamais précochée. Les propositions ne donnent aucun accès ni affiliation de badge avant validation. Droits non raccordés bloqués à la publication avec champ précis, sans suppression silencieuse. Réserve et successeur sans héritage automatique ; groupes/choix conservés entre épisodes. Anciens manifestes non enrichis.

Local : build, 1 068 applicatifs ciblés réussis, douze nouveaux cas partagés et six parcours Chromium bureau/petit écran simulé réussis, captures inspectées. Profil targeted-group-definitions : 85 fichiers applicatifs, 50 suites Firestore, 24 HTTP sélectionnés ; aucun complet. Résultat du commit exact à consigner dans PR #2 après émulateurs CI Node 22/Java 21. Pas de téléphone réel ni recette humaine certifiés.

Permissions limitées à readBriefing/readMembers ; restent demandes d’amis intégrées, recherche unifiée, mandats collectifs et Master Vn+1. Conserver code/marqueurs/version/pages, provenance/groupes/rosters/mandats, accès, décès/relève, épisodes, historiques et reçus cohérents. Aucun marqueur rétroactif ou réapplication de M2 à une incarnation. Même branche/PR #2, aucun merge ou déploiement Firebase.


## Groupes SO — première régie en session — 6 novembre 2026

Base `f40023ab225295a7cdf7241a16e0c7758ee582f9`, [CI 42206813645](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42206813645) completed/success : huit jobs, 957 applicatifs, 750 Firestore, 22 HTTP. [Parcours, limites et reprise](SO-GROUPES-SESSION.md).

`groupsVersion=1` publié/propagé à la naissance seulement ; espaces de groupe activés pour les nouvelles versions compatibles. Commandes natives de régie : création/configuration, affectation/retrait/transfert, responsable, archivage/restauration et contre-opération. Un TEAM principal, factions cumulables, capacités explicites ; limite technique de 50 groupes alignée sur décès/relève. Capacité GROUP_MANAGEMENT limitée aux groupes/historiques, aucun droit d’actifs ou de personnage ; le garde de révision de session reste en place. Propriétaire/MJ courants avant ancien reçu, STOP et clôture respectés.

Premier raccord limité aux permissions readBriefing/readMembers ; autres cases masquées et attributions refusées au serveur. Transfert révoque tous les anciens droits sans redistribution ; décès et relève réutilisent leur révocation native, nouvelle incarnation sans héritage, nouvelle affectation explicite. Lectures des secrets fermées au défunt. Groupes/mandats conservés dans l’épisode suivant. Anciennes sessions fermées sans enrichissement manuel. Publication des définitions group M2, demandes d’amis/réserves intégrées et opérations collectives restent à livrer ; §4.11/INS-09/10 seulement partiels.

Build et 1 027 tests applicatifs ciblés locaux réussis (82 fichiers), onze nouveaux cas partagés, quatre parcours Chromium bureau/petit écran simulé réussis et captures inspectées. Nouveau HTTP/Auth de création/affectation/transfert/révocation ; 48 suites Firestore et 23 HTTP dans targeted-space-groups. Sélecteur borné à 96 fichiers afin de conserver la couverture cumulée ; aucun complet. Émulateurs CI Node 22/Java 21 : résultat du commit exact à consigner dans PR #2 avant le lot suivant. Aucun appareil réel, recette humaine, fusion ou déploiement Firebase revendiqué.

Reprise : code/manifeste/marqueur/modules, groupes/mandats/responsables/révisions/historiques, accès courants, décès/relève, épisodes/sauvegardes/reçus à conserver ensemble. Aucun marqueur ajouté aux anciennes sessions ni adhésion copiée vers un successeur. Même branche/PR #2.


## Remorquage individuel et récupération PNJ — candidat du 6 novembre 2026

Base exacte `05c1eec4afe3ed4fbde294c3a50de149e41b08f5`, [CI 42201564805](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42201564805) terminée/success, huit jobs requis. Le parcours individuel peut désormais publier/acheter/monter MOD-05 via les services natifs, atteler, remplir, partir, conserver/larguer en duel compatible, attendre la panne B, être dépanné en carburant, arriver, repartir sur un autre tronçon et retirer le même module après détachement à quai. Carburant ×2 et Manœuvrabilité −1 minimum 0 ; coûts, PA, exemplaires et titres restent natifs.

Les six marqueurs towingWork/Attachment/Flight/Combat/Outage/Recovery sont émis ensemble dans les nouveaux manifestes et propagés/recontrôlés à la naissance. MOD-05 porte requiresTowing ; commerce et atelier exigent la chaîne complète courante. Aucun enrichissement des anciens manifestes ou activation manuelle en partie. Les fixtures de composants fermés retirent explicitement ces marqueurs pour conserver leur périmètre historique ; les tests de chaîne complète prouvent publication/achat/remise/montage natifs. Qualifications et dégâts de scénario restent des données contrôlées de test, pas des attributions de jeu nouvelles.

Récupération PNJ dans shipMaintenance : devis régie avec prestataire disponible, prix canonique 5 % et carburant compris, payeur volontaire qui réserve le solde ordinaire, puis confirmation régie de la prestation réellement effectuée. Le bâtiment et les fonds sont réservés ; aucun minuteur de PNJ, exemplaire, déplacement ou paiement automatique. Retour au même quai refusé, affrontement du largage clos requis, Coque/Bouclier/fret/tiers/propriété conservés. Bâtiment immobilisé en voyage : équipage libéré au port et même voyage conservé comme RECOVERED. Annulation libère les réserves ; pause/STOP/révocation, accès courant, concurrence et rollback contrôlés. Capacité TOWING_RECOVERY bornée aux comptes/ledger, vaisseaux/voyages/équipage/dossier/audit, sans droit d’inventaire ni de PA. Les dossiers PNJ ne sont pas pris pour de l’entretien technique.

Limites explicites : remorqueur victime seul contre pirate seul ; attaque pirate remorqueur, flottes/convois/alliance avec attelage et abordage/capture restent fermés. La récupération spatiale par un remorqueur joueur n’est pas livrée : la voie PNJ est raccordée. Caution/revendication S+1, prime spontanée, titre, identité/casse et crédits protégés du service restent distincts/non livrés. Aucun « chapitre 22 complet » ni recette intégrale REC-SO-19 revendiqués.

Validation locale du candidat : build, **957/957 applicatifs ciblés** dans 76 fichiers ; trois nouveaux cas métier de chaîne complète, six de récupération partagés mémoire/Firestore, un test de périmètre de capacité, deux UI et un sélecteur. Deux HTTP/Auth nouveaux préparés : voyage avec module réellement acquis/monté, puis récupération payée une fois, refus tiers et révocation. Profil targeted-towing-complete : 44 suites Firestore, 22 HTTP, navigateur global désactivé. Les émulateurs restent réservés à la CI Node 22/Java 21 ; résultat exact du commit à consigner dans PR #2 avant la suite. Vérification visuelle locale : 8/8 cas Chromium 153.0.8010.0 (1280×900 / 360×800 tactile simulé), puis deux cas de récupération revérifiés ; workflow natif MemoryStore, captures inspectées, pas de réseau ni débordement horizontal. Pas de recette Firebase navigateur, appareil réel ou validation humaine revendiquée.

À la demande de l’utilisateur, [audit fonctionnel global](AUDIT-GLOBAL-2026-11-06.md) établi après implémentation du candidat : grille V3.5, 55 recettes, V3.6 (12), sécurité (10), code/tests et manques. Sondes locales natives : groupe après naissance refusé SO_GAMEPLAY_NOT_OPEN ; atelier après publication refusé CENTRAL_PREPARATION_REQUIRED. Ces manques ne sont pas corrigés en retirant les gardes. Audit ≠ certification opérationnelle ni campagne prête.

Compatibilité/reprise : conserver ensemble code, version publiée et six marqueurs, membres/versions d’accès, PA et réserves, vaisseaux/modules/lots/fret/tiers, dossier/accords/liens, voyage/événement/dette/horloges, panne B/combat/positions, comptes réservés/prestataire/ledger et reçus/historiques. Les nouveaux dossiers PNJ requièrent ce code pour règlement/annulation ; pas de retour logiciel seul ou suppression de marqueur pour forcer une reprise. Aucun déploiement, fusion main, migration ou restauration externe. Même branche/PR #2 ; envoi GitHub des modifications et de l’audit explicitement autorisé par l’utilisateur le 6 novembre.


## Remorquage — commandes de navigation attachée — 6 novembre 2026

Reprise demandée : terminer le remorquage puis produire un audit global des fonctions réalisées/restantes. Base `ef2d7def38e525371647c6611aef783bedc17ac3`, CI 42093021370 réussie. Cette étape corrige le raccord de navigation ; elle ne termine pas encore la récupération spatiale ou l’ouverture de MOD-05.

Le plein natif (préparation, réservation du lot, interruption et finalisation) fonctionne sur le remorqueur attaché à quai. Le contexte vérifie toujours les liens réciproques et le dossier ; un vrai verrou technique reste bloquant. Projection publique `towingAttached`/`towingWreck` sans lot/binding : l’interface n’assimile plus le remorqueur attaché à une réparation active, permet les commandes normales et l’arrivée joueur/régie, et garde fermées les commandes de convoi/embuscade non raccordées. Une épave larguée n’est plus annoncée à quai à cause de son ancien port. Aucun déplacement, coût ou propriété arbitraire ajouté.

Validation locale : build et **944/944 tests applicatifs ciblés**, 73 fichiers du profil towing-desk ; deux nouveaux cas partagés mémoire/Firestore (plein, interruption, arrivée MJ, verrou incohérent et STOP), un cas UI des commandes pilote/régie, HTTP du trajet enrichi avec le plein attaché. Tests Firestore/HTTP réservés à la CI Java 21 ; résultat exact à consigner dans la PR avant le prochain lot. Installation du Chromium Playwright échouée (archive distante vide/invalide) ; aucune recette visuelle de cette étape revendiquée à ce stade. Node 24.22.1 local, cible CI Node 22.

Conserver ensemble deux vaisseaux, dossier/liens, module/lot/fret, équipage, PA/réserves, voyage/événement/dette/horloge, panne B et reçus/historiques. Anciennes sessions inchangées ; aucun marqueur émis, MOD-05 reste preparationOnly jusqu’à sa chaîne complète. Suite : secours en panne sèche sous attelage, récupération spatiale, ouverture cohérente et recette visuelle. Puis audit global demandé, fondé sur le code et les preuves courantes. Même branche/PR #2 brouillon ; aucune fusion ni publication Firebase.


## MOD-05 — bureau d’attelage à quai, rôles et confirmations — 5 novembre 2026

Base vérifiée : `60039f509254aab3c14abd90afd56bfb60157221`, [CI 42030868030](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42030868030) completed/success : huit jobs, build, 927 applicatifs, 732 Firestore, dix-neuf HTTP ; preuve finale présente dans PR #2. Source métier : V0.7 chapitre 22 et services d’attelage déjà implantés ; décision B du 5 novembre conservée. Aucun audit historique repris.

Nouveaux accès de lecture towingDesk/towingDeskAdmin, sous towingWorkVersion=1 et ses dépendances existantes. Joueur : seuls dossiers où son accord de propriétaire ou sa désignation de Mécano correspond encore à sa version d’accès et à la propriété actuelle. Aucun choix de régie, source, motif privé, lot, binding ou version technique dans la liste joueur. Régie : dossiers et préselection des remorqueurs/épaves libres à quai et Mécanos actifs MEC-02 N2, avec noms de ports. Les demandes déjà ouvertes retirent les bâtiments des choix. La préselection ne remplace pas la validation complète de la proposition.

Les lectures produisent les droits courants canApprove/canStart/canFinish/canCancel/canRelease ; même projection sur dossier direct et liste. Demandes avant démarrage revalidées par le validateur natif ; une situation périmée ferme l’accord/démarrage mais reste annulable selon les droits existants. Finalisation limitée au Mécano courant, disponible et local, avec ses réservations propres et les cinq minutes échues. Annulation en pause conservée, STOP prioritaire. Interruption de l’attelage proposée à la régie uniquement pour les deux mêmes bâtiments à quai, au port courant du dossier, avec les liens/verrous attendus ; jamais pendant le vol. Les commandes natives revalident intégralement chaque situation, y compris après aperçu.

Interface Mes attelages dans le Terminal et Régie des attelages depuis le spatioport compatible. Parcours : préselection physique et aperçu régie ; proposition aux propriétaires ; accord personnel de chacun (un seul si même propriétaire) ; aperçu/démarrage du Mécano avec 1 PA réservé ; attente de cinq minutes de jeu ; aperçu final et double attestation présence/travail effectué ; 1 PA consommé, Mécano libéré, deux bâtiments liés et verrouillés. Aucun départ, réparation ou transfert de propriété automatique. Annulation avant confirmation rend seulement les réserves natives ; interruption à quai après confirmation ne rend pas le PA consommé. Dossier largué dans l’espace en lecture seule, sans action de récupération ajoutée.

Contrôleur dédié towingCommand : protocole borné par action, présence jamais héritée d’un ancien aperçu, contrôle séparé performed pour fin/interruption. Aucun coût, dé, propriétaire ou résultat choisi côté client. Handler natif api/mutate, garde busy et reçus existants. Les réponses et erreurs tardives après navigation ne rouvrent pas une confirmation et ne remplacent pas la nouvelle page. Les commandes personnelles ne sont jamais rendues dans l’écran régie. Noms et attributs échappés, confirmation et attestation avant chaque étape de consommation ; aucun droit dérivé de la seule classe du personnage.

Validation locale : build et **941/941 applicatifs ciblés**, puis treize vérifications ciblées du nouveau bureau et six UI après le dernier ajustement de libellé. Sept nouveaux cas partagés mémoire/Firestore : préselection/permissions, filtrage d’un participant sans lien, rôle courant et parcours complet, état physique du Mécano, pause/STOP, dossier périmé, interruption seulement à quai après vol, révocation. Six cas UI/contrôleur et un sélecteur. HTTP/Auth ajouté : proposition, deux accords, démarrage, délai, finalisation par le Mécano seul, interruption régie, PA consommé une fois et accès révoqué. SDK Firestore sans commit : 213 documents sérialisables après attelage confirmé.

Profil targeted-towing-desk : 73 fichiers applicatifs, 42 suites Firestore, vingt HTTP, 108 chemins depuis la base globale 70afa57. Navigateur global/régression intégrale désactivés ; émulateurs réservés à CI Java 21. Preuve finale de cette tête à consigner dans PR #2 avant la suite. Recette DOM dédiée préparée : deux scénarios × bureau/petit écran (parcours à plusieurs rôles, STOP), mais non exécutée : lancement de Chromium impossible, binaire attendu absent. Syntaxe des fichiers de recette vérifiée ; aucune preuve visuelle actuelle, téléphone réel ou recette humaine revendiquée. Styles 44 px définis pour les contrôles du bureau et des confirmations, sans mesure DOM actuelle.

Aucun nouveau marqueur de métier émis ni activation manuelle en partie. Les marqueurs towingWork/Attachment/Flight/Combat/Outage restent fermés à la publication/naissance ; les autres modules conservent leurs marqueurs déjà émis. MOD-05 preparationOnly, achat/montage/publication jouables fermés. Cette étape s’arrête à l’attelage et à son interruption à quai : tous les contrôles de navigation ne sont pas encore raccordés aux verrous propres de l’attelage. Suite : raccord de navigation compatible, récupération spatiale, ouverture versionnée cohérente et recette visuelle. Aucune alliance, capture ou appropriation nouvelle.

Reprise : conserver code/projections compatibles, mêmes participants et versions d’accès, PA/réserves, deux bâtiments, module/lot/fret, liens/dossier, voyage/événement/dette/horloge, panne/décision B, combat/historique/reçus et éventuelle position spatiale. Ne pas supprimer un verrou ou déplacer un bâtiment pour rendre un formulaire utilisable. Aucune restauration externe exécutée. Même branche et PR #2 brouillon ; aucune fusion main ni publication/déploiement Firebase.


## MOD-05 — décision B : attelage conservé pendant neutralisation — 5 novembre 2026

Décision explicite de l’utilisateur le 5 novembre : **B, attelage conservé ; le voyage attend le rétablissement de MOD-05**. Ce complément remplace « neutralisation à arbitrer » pour ce cas précis, sans modifier l’archive brute des règles V0.7. Source générale : V0.7 chapitres 19 et 22 ; choix B pour leur articulation. Base vérifiée : `e0d0c8f3eb3e0b092d2772b54a4e43cd3b09e9cb`, [CI 41903330353](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41903330353) completed/success : huit jobs, build, 911 applicatifs, 720 Firestore, dix-huit HTTP ; preuve finale présente dans PR #2. Aucun audit historique repris.

Capacité fermée towingOutageVersion=1, dépendante de towingCombat et de toute la chaîne towingFlight/attachment/work/modules/navigation. Aucun marqueur émis à publication/naissance et aucune activation manuelle en partie. MOD-05 reste preparationOnly ; achat, montage et publication jouables toujours fermés. Les routes DANGEROUS/HOSTILE sont permises au seul composant explicitement compatible ; sans cette capacité, le trajet remorqué reste SECURED uniquement. Routes, tirage, sélection du module, surcharge, événements MJ et dette restent natifs ; aucun événement parallèle ou immunité.

L’événement natif neutralisant le même MOD-05 installé crée une attente de 900 000 ms de jeu sur le voyage existant. L’attelage, les liens/verrous réciproques, le dossier, le même module, l’épave, son propriétaire, sa Coque et son fret restent conservés. Le coût de départ déjà débité et le PA pilote restent consommés une seule fois ; aucune consommation supplémentaire pour l’attente. Manœuvrabilité –1 minimum 0 conservée tant que l’attelage reste en place. Pas de dommage durable, largage automatique à cause de la seule panne, réparation ou transfert de propriété.

Reprise déterministe au terme de la panne : un premier accès tardif ne recommence pas quinze minutes et n’ajoute pas un délai depuis l’actualisation. Le temps de trajet restant repart à l’expiration exacte ; l’arrivée doit toujours être confirmée. Lecture normalisée sans écriture implicite ni tâche de fond ; la mutation native suivante conserve l’état cohérent du vaisseau/voyage. Pause et STOP figent l’horloge commune. Combat, autre verrou, immobilisation, événement MJ ou dette de carburant restent bloquants : l’expiration ne les efface pas. Une clôture MJ avant l’échéance peut résoudre son événement, sans avancer le trajet pendant la panne. Une paix avant échéance conserve l’attente ; une paix après échéance reprend seulement après le combat. Aucun contournement par reprise régie.

Le largage volontaire en combat reste possible selon les droits courants : il retire l’attente liée à cet attelage, sans réactiver le module ; l’épave reste dans la zone et le voyage attend encore la clôture du combat. L’interruption à zéro Coque reste régie par le combat et conserve la propriété. Route revalidée après préparation si la capacité a été retirée, même sans tirage de panne. Anciennes capacités/manifestes fermés avant reprise d’un reçu ; marqueur du voyage et reçu de navigation contrôlés. Aucune permission d’écriture nouvelle : capacités NAVIGATION/SPACE_COMBAT/TOWING_FLIGHT existantes, sans nouveau portefeuille, stock ou moteur d’équipage.

Affichage navigation/régie : délai d’attente, conservation de l’attelage et reprise conditionnée aux autres blocages. Le message n’exige pas une clôture MJ pour la seule panne. Projection towingWait sans identifiant interne de lot ni état technique towingOutage ; identifiant de module neutralisé également masqué dans l’événement public comme auparavant. Pas d’ouverture d’un parcours complet d’attelage/récupération spatiale ou d’un nouveau contrôle régie de téléportation.

Validation locale : build et **927/927 applicatifs ciblés** ; douze nouveaux cas partagés mémoire/Firestore, un test pur des autres modules, deux UI et un sélecteur. Départ natif DANGEROUS/HOSTILE, limite exacte, lecture tardive, pause/STOP, dette/MJ, paix avant/après échéance, largage et zéro Coque pendant panne, concurrence/réessai, confirmation périmée et rollback après écritures couverts. Des blocages MJ/dette combinés à la panne sont injectés en fixture pour vérifier leur indépendance ; le tirage canonique n’est pas modifié. HTTP/Auth ajouté : événement créé par fixture core native déterministe, puis lectures authentifiées, arrivée anticipée refusée, expiration tardive, arrivée atomique et révocation ; aucune prétention de tirage HTTP déterministe. SDK Firestore sans commit : 228 documents pendant l’attente, 232 après arrivée.

Profil targeted-towing-outage : 71 fichiers applicatifs, 41 suites Firestore, dix-neuf HTTP, 102 chemins depuis la base globale 70afa57 ; navigateur global/régression intégrale désactivés. Émulateurs réservés à CI Java 21 ; preuve finale de cette tête à consigner dans PR #2 avant la suite. Recette DOM ciblée préparée : dix scénarios bureau/petit écran dans la config dédiée existante, mais **non exécutés : échec de lancement, binaire Chromium absent ; téléchargement indisponible dans cet environnement**. Les huit cas visuels du 4 novembre restent une preuve antérieure uniquement. Aucune validation visuelle actuelle, téléphone réel ou recette humaine revendiquée.

Reprise/sauvegarde : conserver ensemble code compatible, marqueurs, vaisseaux/module/lot/fret, liens/dossier, voyage unique avec towing.outageVersion/towingOutage/horodatages, moduleNeutralizations, combat/towingDrops/reçus, événements/dette, horloge, équipage et PA. Ne pas retirer un marqueur ou réécrire un instant pour forcer une reprise, ni effacer une dette ou déplacer l’épave à quai. Récupération spatiale et ouverture jouable cohérente restent à traiter. Aucune restauration externe exécutée ; même branche et PR #2 brouillon, aucune fusion main ou publication/déploiement Firebase.


## MOD-05 — interface du largage et résultat conservé — 4 novembre 2026

Cette étape complète l’interface du composant fermé et remplace les mentions historiques « interface non ouverte » pour le seul écran de combat. Base vérifiée : `b9439a3b50078400c62e2b51b23c548b54e6263b`, [CI 41897013559](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41897013559) completed/success : huit jobs, build, 905 applicatifs, 720 Firestore, dix-huit HTTP ; preuve finale présente dans PR #2. Aucun audit historique repris. Source métier : règles V0.7 chapitre 22 ; services de combat et navigation existants.

L’écran natif des rencontres affiche au pilote du remorqueur les conséquences du maintien/largage, le coût nul, le retour immédiat à la manœuvrabilité normale, la conservation de l’ordre déjà déposé et l’impossibilité de raccrocher pendant cette rencontre. Une attestation de présence est obligatoire avant la commande dropTowedWreck. Aucun calcul de résultat, dé, PA ou propriété côté client. Payload session/combat/vaisseau/confirmation courants et présence seulement ; parser et handler natifs, garde busy, désactivation du bouton, reçus et contrôles serveur existants. Message de succès explicite, erreurs d’attelage lisibles. L’expiration des 90 secondes laisse le largage possible tant que le round n’a pas réellement été résolu ; aucune rétroactivité après résolution.

Affichage conditionné à la projection serveur towing : aucun bouton pour pirate, équipage observateur ou régie ; bouton indisponible si canDrop/canOrder faux. Pause/STOP et état courant continuent d’être contrôlés au serveur. Pas d’inférence du droit à partir du catalogue, de MOD-05 ou d’un champ client. Dans un historique clos, un nouvel attelage ultérieur ne peut pas faire apparaître une nouvelle commande de largage.

Résultat conservé dans towingDrops sur le combat : motif volontaire TOWING_DROPPED ou automatique TOWING_INTERRUPTED_ZERO_HULL. Projection towingReleases limitée au pilote du bâtiment concerné et à la régie, sans dossier, épave/lot internes, cargo ou bindings. Anciennes entrées volontaires sans reason gardent le sens de largage ; aucune réécriture d’historique. Résultat toujours lisible après fermeture du duel et arrivée du remorqueur, sans dépendre du voyage courant. Le serveur reste seul responsable de l’interruption à zéro Coque et de la position de l’épave. Propriété, état et fret conservés ; aucune récupération spatiale, prime ou réparation ajoutée.

Validation locale : build et **911/911 applicatifs ciblés** (cinq nouveaux tests UI et un sélecteur ; douze cas métier partagés enrichis pour vérifier projection, rôle et historique). HTTP/Auth existant enrichi pour le résultat du largage et son absence chez l’autre pilote. Profil targeted-towing-ui : 70 fichiers applicatifs, 40 suites Firestore, dix-huit HTTP, 98 chemins depuis la base globale 70afa57 ; navigateur global/régression intégrale désactivés. Émulateurs en CI Java 21, preuve de tête à consigner dans PR #2 avant la suite. SDK Firestore : 279 documents sérialisables après largage, sans commit.

Recette locale de composants : **8/8 cas Chromium 156.0.8078.4**, quatre scénarios × bureau 1280×900 et petit écran tactile simulé 360×800 : présence native, double clic, round échu non résolu, zéro Coque, pause, pirate/régie sans commande. Workflow natif MemoryStore et rendu réel des composants/shell ; aucun accès réseau, aucune erreur JS, aucun débordement horizontal, cibles du bloc ≥44 px. Captures petit écran inspectées. Config test/browser/towing-combat.config.mjs uniquement ; pas de recette globale, authentification Firebase navigateur, téléphone réel ou validation humaine revendiquée. Les résultats DOM sont locaux, sur arbre de travail ; ils ne remplacent pas la CI.

Toujours towingCombatVersion=1 et dépendances fermées, aucun marqueur émis à la publication/naissance, aucune activation manuelle en partie. MOD-05 reste preparationOnly : achat/montage/publication jouables fermés. Victime seule contre pirate seul, SECURED uniquement ; pirate remorqueur, alliances, convois et abordage/capture hors périmètre. Neutralisation MOD-05 pendant remorquage et récupération dans l’espace restent à traiter selon source/arbitrage, sans règle inventée.

Reprise : conserver ensemble code/projections compatibles, marqueurs, bâtiments/modules/lots/fret, dossier, combat/towingDrops/rounds/reçus, wreckSpacePosition/releasedTowing, voyage/événement/dette/horloge, équipage et PA. Ne pas déduire une récupération du simple résultat affiché ni déplacer l’épave à quai. Aucune restauration externe exécutée ; même branche et PR #2 brouillon, aucune fusion main ou publication/déploiement Firebase.


## MOD-05 — interception et largage sous capacité fermée — 4 novembre 2026

Cette section remplace les limitations « sans interception/largage » des étapes historiques ci-dessous. Base vérifiée : `da0f8ba3fcd9e54e130379e9f4f425d8bc174eed`, [CI 41892086884](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41892086884) completed/success : huit jobs, build, 891 applicatifs, 708 Firestore, dix-sept HTTP. Preuve finale consignée dans PR #2. Source métier : règles V0.7, chapitre 22, `docs/source/SO_Regles_V07.txt` ; combat, PA, horloge et voyage natifs.

Composant supplémentaire `towingCombatVersion=1`, dépendant de toute la chaîne towingFlight/towingAttachment/towingWork/modules/vol/navigation. Aucun marqueur émis à la publication/naissance ; ne pas activer manuellement en partie. MOD-05 reste preparationOnly : publication, commerce et montage jouables fermés. Les fixtures utilisent personnages/vaisseaux/carburant natifs mais module monté, dégâts et marqueurs synthétiques ; elles ne prouvent aucune ouverture jouable.

Périmètre : interception native d’un remorqueur victime seul par un pirate seul, sur le trajet SECURED déjà compatible. L’épave reste hors participants, sans pilote, ordre, événement ou PA supplémentaire. Liens réciproques, propriétaires personnels, dossier, module, fret et voyage courant sont revalidés avant action ; leur état entre dans les confirmations joueur/MJ. Le dossier conserve le lien au combat. Les combats historiques clos ne sont pas revalidés contre un nouvel attelage ultérieur. Pirate remorqueur, alliances, convois et abordage/capture restent fermés dans ce premier composant ; absence de boardingVersion sur ces rencontres, sans en faire une immunité métier publiée. Routes dangereuses/hostiles toujours fermées : neutralisation MOD-05 pendant remorquage non arbitrée dans la source.

`dropTowedWreck` : seul pilote courant du remorqueur, présence attestée, rencontre avant premier round ou round non encore résolu, session EN_JEU sans STOP. Aucun PA ni dé ; ordre déjà déposé et réserves conservés. Confirmation périmée après résolution refuse toute rétroactivité. Manœuvrabilité canonique restaurée immédiatement avant le prochain calcul ; Coque/Bouclier, carburant, module, fret et propriété inchangés. L’épave existante perd les liens et verrous, demeure docked=false dans la zone de route enregistrée par wreckSpacePosition (route, ports, voyage, combat, dossier, instant). Son ancien portId ne représente pas un retour à quai. Dossier TOWING_RELEASED_IN_SPACE et historique conservés. Aucun transfert de propriété, récompense ou restitution du PA d’attelage.

Si le round natif réduit le remorqueur à zéro Coque, même interruption atomique avec motif TOWING_INTERRUPTED_ZERO_HULL, avant les écritures natives de résolution. Une victoire ne transfère jamais l’épave. Si le pilote garde l’attelage, fermeture native du duel reprend le même voyage avec pénalité –1 minimum 0 et verrous réciproques conservés ; l’épave suit l’arrivée. Après largage, elle ne suit pas cette arrivée et ne peut être raccrochée pendant la rencontre. Sa position est conservée pour une récupération future ; aucune procédure de récupération dans l’espace n’est ouverte ici. Ni réparation, retour forcé, nouveau bâtiment ou changement implicite de propriétaire.

Capacité additionnelle TOWING_COMBAT limitée aux vaisseaux, dossier et historique ; voyage, combat, PA et reçus utilisent les capacités natives existantes. Droits/marqueurs courants contrôlés avant anciens reçus. Réessais, concurrence, pause/STOP, données réciproques corrompues, confirmation périmée et rollback après écritures couverts. Lecture publique sans lot, identité technique, codes secrets ou bindings. Sérialisation SDK Firestore sans commit : 276 documents après largage, 283 après interruption à zéro Coque.

Validation locale : build et **905/905 tests applicatifs ciblés**. Profil targeted-towing-combat : 69 fichiers applicatifs, 40 suites Firestore, dix-huit HTTP sélectionnés ; douze nouveaux cas partagés mémoire/Firestore, un cas pur de capacité, un sélecteur et un HTTP/Auth. Émulateurs en CI Java 21 uniquement ; preuve de cette tête à consigner dans PR #2 avant la suite. Aucun test navigateur global, régression intégrale ou recette humaine revendiqué.

Reprise/sauvegarde : conserver ensemble code compatible, marqueurs, deux vaisseaux, module/lot/fret, dossier, combat/rounds/reçus, voyage unique/événement/dette/horloge, équipage et PA. Après largage conserver aussi wreckSpacePosition, releasedTowing, historique et propriétaire ; ne pas effacer une position pour simuler une récupération ou forcer l’épave à quai. Une restauration doit garder cet ensemble cohérent ; aucun retour logiciel seul ni sauvegarde/restauration externe exécutée. Les fermetures avec voyage/combat actif restent soumises aux blocages natifs. Suite : arbitrage neutralisation MOD-05, récupération de l’épave, ouverture versionnée cohérente et interface selon périmètre validé. Même branche et PR #2 brouillon ; aucune fusion main ni publication/déploiement Firebase.


## MOD-05 — trajet natif sécurisé sous capacité fermée — 4 novembre 2026

Base vérifiée : `9ccabccaa2701875be2f05ef3aca5e72554348d7`, [CI 41861450804](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41861450804) completed/success : build, 876 applicatifs, 696 Firestore, seize HTTP et huit jobs requis. Attente du contrôle final levée et preuve dans PR #2. Aucun audit historique repris. Source métier : règles V0.7 chapitre 22 ; moteur natif de navigation/événements/PA/horloge.

`towingFlightVersion=1` dépend de towingAttachment/towingWork et de la chaîne modules/vol/navigation. Aucun de ces marqueurs n’est émis à la publication/naissance ; ne pas les activer manuellement en partie. MOD-05 reste preparationOnly au catalogue : publication/achat/montage fermés. Profil installé MOD-05 permis seulement au calcul du composant explicitement compatible, jamais au devis jouable/commerce. Fixtures natives pour personnages/vaisseaux/carburant, mais marqueurs, MOD-05 monté et dégâts synthétiques ; aucune preuve d’achat/montage MOD-05 jouable.

Premier périmètre : un trajet solo par attelage confirmé, sur route SECURED uniquement. Deux mêmes bâtiments, propriétaires personnels connus, même MOD-05, accords courants, liens réciproques et verrous, gabarit et état de l’épave, volume/fret ouverts revalidés. L’épave est non pilotable pendant ce transport. Ni convoi, détour, réapprovisionnement attaché, alliance ni interception : commandes non raccordées refusées et verrous conservés. Routes dangereuses/hostiles fermées avant réservation pour ne pas inventer l’effet d’une neutralisation MOD-05 en cours de remorquage.

Parcours natif prepareVoyage/departShip/finishSoPreparation/arriveShip : PIL-02 et son PA de préparation, route et durée natives, un seul tirage d’événement et un seul voyage. Coût de trajet ×2 (cargo court 4 unités, transport court 6), carburant insuffisant refusé avant réservation. Le doublement est également appliqué à la surcharge consommée pendant le trajet : surcharge ordinaire 1 devient 2 ; reliquat partiel consommé et dette native conservée, sans carburant gratuit ni arrivée forcée. Événements sécurisés et éventuelle résolution MJ restent natifs ; dette non réglée garde le voyage suspendu. Les routes et préparations restent immuables suivant le parcours natif.

Départ atomique : PA pilote consommé une fois, carburant débité une fois, voyage du remorqueur lié au dossier/épave/lot ; épave docked=false avec towingTransit référant ce même voyage, sans second équipage, événement, PA ou voyage. Manœuvrabilité effective –1 minimum 0 durant le voyage, recalculée depuis le profil canonique sans cumul/soin ; pas de pénalité avant départ ou après arrivée. Pause/STOP figent le voyage et les deux positions ; liens et état restent conservés. Annulation avant départ restitue seulement le PA pilote réservé, jamais le PA d’attelage déjà consommé.

Arrivée native atomique : même épave au même port d’arrivée que le remorqueur, sans déplacer implicitement son propriétaire ou son pilote. Propriété, Coque/Bouclier, fret et module conservés ; seule la position suit le transport. Dossier TOWING_ARRIVED, currentPortId et liens/verrous conservés. Interruption administrative à ce port possible suivant la procédure précédente, sans restitution du PA consommé ; nouveau trajet sur le même attelage refusé dans ce premier composant. Pas de détachement joueur, largage en combat, prime, transfert de propriété ou PNJ ajouté.

Capacité TOWING_FLIGHT limitée aux deux vaisseaux, dossier et historiques ; écritures pilote/voyage/carburant par les capacités natives existantes seulement. Confirmation des lectures joueur et régie liée à l’état courant du dossier, épave, module, propriétaires et fret. Droits/marqueurs/propriété revalidés avant anciens reçus de départ ; réessai/concurrence et rollback après écritures au départ et à l’arrivée couverts. Sérialisation SDK Firestore vérifiée sans commit : 228 documents après départ, 232 après arrivée, 235 après interruption administrative.

Validation locale : build et **891/891 tests applicatifs ciblés**, profil targeted-towing-flight : 68 fichiers, 39 suites Firestore et dix-sept HTTP ; navigateur global/régression intégrale désactivés, 90 chemins depuis 70afa57. Douze nouveaux cas métier partagés mémoire/Firestore, deux cas purs de capacité/profil, un sélecteur et un HTTP/Auth natif. Émulateurs en CI Java 21 seulement. Consigner la CI exacte dans PR #2 avant la suite. Aucune recette humaine/navigateur revendiquée.

Conserver ensemble code compatible, manifestes/marqueurs, mêmes vaisseaux/modules/lots/fret, liens réciproques/towingTransit/dossier, voyage unique/événement/dette/horloges, équipage, PA/réserves/consommations, droits et reçus/historiques. Pas d’effacement de lien ou dette, déplacement forcé ou retour logiciel seul. Interrompre une préparation avant départ sous code compatible, ou terminer le trajet et interrompre l’attelage à quai ; sinon restauration cohérente approuvée. Aucune sauvegarde/restauration externe exécutée. Suite : interception/largage/interruption à 0 Coque et neutralisation MOD-05, puis ouverture versionnée cohérente et interface. Même branche/PR #2 brouillon ; aucune fusion main ni publication/déploiement Firebase.


## MOD-05 — finalisation personnelle de l’attelage à quai — 4 novembre 2026

Base vérifiée : `be9ce08ce262a1909980942d0d7f0f63b582ef0c`, [CI 41853950901](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41853950901) completed/success : build, 866 applicatifs, 687 Firestore, quinze HTTP et huit jobs requis. Aucun audit historique repris. Sources : règles V0.7 chapitre 22 et composant de mandats/travail existant.

Finalisation sous `towingAttachmentVersion=1`, dépendant de towingWorkVersion et des capacités modules/vol/navigation déjà requises. Aucun de ces deux marqueurs n’est émis par publication ou naissance ; ne pas les activer manuellement en partie. MOD-05 reste preparationOnly : publication/achat/montage/vol toujours fermés. Aucun écran nouveau, aucun trajet ouvert. Personnages/vaisseaux natifs mais marqueurs, MOD-05 monté et dégâts synthétiques en tests ; pas de preuve d’achat/montage MOD-05 jouable.

Après cinq minutes de jeu, seul le même Mécano actif/local MEC-02 N2 peut confirmer présence et travail réellement effectué. Revalidation des deux propriétaires et accords, versions/droits, verrous, révisions, état physique, gabarit, port et même lot MOD-05 installé non neutralisé. Le validateur initial est réutilisé en normalisant uniquement les réservations prouvées de ce travail. Aperçu sans écriture, confirmation liée à l’état courant ; concurrence et réessai ne consomment pas deux fois le PA.

La confirmation consomme le PA réservé et libère l’activité du Mécano. Dossier TOWING_ATTACHED avec marqueur et date de jeu ; liens réciproques versionnés towingAttachment sur les deux vaisseaux (dossier, autre exemplaire, rôle, lot). Les deux maintenanceId sont conservés : aucun départ, modification concurrente ni clôture pendant cette préparation attachée. Propriété, Coque/Bouclier, module, fret, carburant, argent et position inchangés. Délai expiré ne finalise rien ; pause/STOP ferment la confirmation.

Interruption administrative du composant uniquement à quai : MJ, motif et attestation performed requis, mêmes liens réciproques/verrous prouvés, même port, aucun trajet/combat/opération/convoi. Retire seulement les liens et verrous de ce dossier, sans rendre le PA déjà consommé ni modifier le personnage. Annulation de travail ordinaire ne peut pas rembourser un attelage confirmé. Possible après révocation du Mécano et en pause, jamais sous STOP. Cette opération technique de régie ne constitue pas le largage en combat ni une règle de détachement joueur ; ces parcours restent à raccorder avec le trajet.

Capacité TOWING_ATTACHMENT distincte, bornée aux dossiers, vaisseaux, personnage/PA, historiques/audit/reçus ; pas de comptes/ledger, stock, contrats ou voyages. Lecture des dossiers attachés refusée sans marqueur compatible. Conserver les mêmes données, liens réciproques, identités/droits, horloges, réserves, consommations et reçus. Annulation compatible avant confirmation ou interruption administrative attestée après confirmation avant retour approuvé ; sinon restauration cohérente, aucun effacement de marqueur/lien/verrou/PA ni retour logiciel seul. Aucune sauvegarde/restauration externe exécutée.

Validation locale : build et **876/876 applicatifs ciblés**, 67 fichiers. Neuf nouveaux cas partagés mémoire/Firestore, un sélecteur, capacité renforcée et un HTTP/Auth supplémentaire. Le test de rollback du démarrage a aussi été corrigé pour interrompre après les écritures plutôt que pendant l’aperçu. Sérialisation SDK Firestore validée sans commit : 213 documents après attelage, 216 après interruption administrative. Profil targeted-towing-attachment : 38 suites Firestore, seize HTTP, navigateur global/régression intégrale désactivés ; 87 chemins contrôlés depuis 70afa57. Émulateurs en CI Java 21 seulement. Consigner la CI du commit exact dans PR #2 avant la suite. Aucune recette humaine/navigateur revendiquée.

Suite : trajet remorqué, carburant ×2, Manœuvrabilité –1 minimum 0, largage/interception, interruption à 0 Coque et neutralisation MOD-05, puis ouverture versionnée cohérente et interface. Aucune prime, propriété, prestation PNJ, revendication ou casse implicite. Même branche work/space-pilot-handover, PR #2 brouillon ; aucune fusion main ni publication/déploiement Firebase.


## MOD-05 — mandats et démarrage du travail d’attelage — 4 novembre 2026

Base vérifiée : `ce3cc6f47b6e4b34c75bbf4d37845d4a6474b82f`, [CI 41848791517](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41848791517) completed/success : build, 850 applicatifs, 673 Firestore, quatorze HTTP, huit jobs requis. Aucun audit historique repris. Sources : règles V0.7 chapitres 17/22 et parcours natifs de mandats, PA, entretien et épisodes.

Composant serveur fermé `towingWorkVersion=1`, dépendant de moduleFlight/removal/installation/work/mandates/purchases/navigation/logistics/combat/convoy. Ce marqueur n’est émis ni à la publication ni à la naissance ; ne pas l’activer manuellement en partie. MOD-05 reste preparationOnly : publication, commerce, montage et vol toujours fermés. Aucun écran ni lien public ajouté. Les fixtures publient/provisionnent les personnages et vaisseaux par les parcours natifs, mais injectent le marqueur, le MOD-05 monté et les dégâts : elles ne prouvent pas un achat/montage MOD-05 jouable.

Périmètre initial : remorqueur cargo/transport opérationnel à quai et épave à 0 Coque, au même port, gabarit du remorqueur au moins égal. Propriétaires personnels connus et actifs seulement, pas de groupe, propriétaire inconnu, capture ni prestataire PNJ. Une épave par dossier ; une demande ouverte par vaisseau. Même lot MOD-05 ordinaire monté, identité/propriété/emplacement/calibration/état et neutralisation contrôlés ; cargaison ouverte et autres occupations refusées.

MJ propose un mandat attesté, sans ressource. Chaque propriétaire donne personnellement son accord (un seul accord s’il possède les deux bâtiments) ; MJ ou technicien ne le remplace pas. Mécano personnel actif, local et MEC-02 N2. Le démarrage revalide accord, versions/droits courants, deux vaisseaux et lot, réserve 1 PA, pose maintenanceId sur les deux vaisseaux et activeMaintenanceId sur le Mécano, puis fixe cinq minutes de temps de jeu. Réponses périmées, double clic et courses ne doublent pas les réserves. Aucun changement de propriété, Coque, Bouclier, module, fret, carburant ou crédit.

Fin de délai : aucune résolution automatique, aucun attelage final, aucun PA consommé. `canFinish=false` ; aucune commande de finalisation ajoutée. Pause/STOP figent le délai ; nouvelle action en pause et interruption sous STOP refusées. Annulation motivée par un participant autorisé ou MJ, y compris après révocation du Mécano, libère les deux verrous et le PA dans le plafond sans écraser un verrou étranger. Droits et marqueur vérifiés avant reçu ; propriété courante et niveau du Mécano avant ancien reçu de démarrage. Les dossiers sont exclus de l’entretien générique. Clôture bloquée par les verrous vaisseaux/personnage ; aucune nouvelle collection.

Capacité TOWING_WORK limitée à shipMaintenance, ships, characters/PA, logisticsHistory et audit/reçus natifs ; aucun accès inventory, comptes, ledger, contrats ou voyages. Validation locale : build et **866/866 applicatifs ciblés** dans 67 fichiers. Quatorze nouveaux cas partagés mémoire/Firestore, un cas de capacité, un sélecteur et un HTTP/Auth borné. Profil targeted-towing-work : 38 suites Firestore, quinze HTTP, navigateur global et régression intégrale désactivés ; 87 chemins depuis l’ancêtre global 70afa57. Émulateurs uniquement en CI Java 21. Consigner le résultat du commit exact dans PR #2 avant la suite ; aucune recette humaine/navigateur revendiquée.

Suite : finalisation personnelle attestée de l’attelage, réserves/détachement et intégration cohérente trajet/carburant ×2/Manœuvrabilité –1, largage/interception et neutralisation, puis ouverture versionnée MOD-05. Pas de propriété, prime, paiement PNJ, revendication ou casse implicite.

Compatibilité : conserver ensemble manifeste/marqueurs, dossiers/bindings/accords/révisions, identités/droits, deux mêmes vaisseaux, même lot monté, horloge/échéance, PA/verrous et reçus/historiques. Ancien binaire ne gère pas ces dossiers : annulation compatible ou restauration cohérente approuvée, aucun retour logiciel seul ni effacement de verrou/réserve. Aucune sauvegarde/restauration externe exécutée. Même branche work/space-pilot-handover et PR #2 brouillon, aucune fusion main ni publication/déploiement Firebase.


## MOD-05 — catalogue préparatoire — 4 novembre 2026

Base vérifiée : `e6b67d1e072668892f2167c9c56a71457871b883`, [CI 41842333259](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41842333259) completed/success : build, 843 applicatifs, 669 Firestore, quatorze HTTP et huit jobs requis. Aucun audit historique repris. Sources métier : règles V0.7 chapitres 17 et 22, `docs/source/SO_Regles_V07.txt`.

MOD-05 Remorquage peut être défini dans le brouillon M1 : objet individuel non consommable, calibration stricte code/gabarit. Chasseur refusé ; cargo 1 000 Cr et transport 2 000 Cr (10 % de la référence). Profils préparatoires : installation MEC-03 N2, dix minutes, 1 PA ; retrait MEC-03 N2, cinq minutes, 1 PA. Interface affichant explicitement préparation uniquement et absence de remorquage créé. Aucun tarif ou effet réglable dans le formulaire.

`preparationOnly=true` : publication bloquée par SO_SHIP_MODULE_EFFECT_NOT_OPEN, même avec offre canonique ; offre diagnostiquée comme fermée, sans faux conseil de corriger le prix. Lecture d’une version contenant MOD-05 refusée même si ses empreintes sont cohérentes. Commerce, mandat et profil installé/vol refusent ce module. Aucun marqueur towingVersion émis, activation manuelle, stock, monnaie, PA, capacité ou vaisseau créé. Archiver modèle et offre permet de publier les autres domaines ; MOD-04 et sa décision B restent compatibles.

Validation locale : build et 850/850 tests applicatifs ciblés dans 66 fichiers. Preuves nouvelles : quatre cas partagés mémoire/Firestore (définition stricte/réessai, publication/offre puis archivage, injection commerce/mandat/vol sans mutation, manifeste avec empreintes recalculées), un test de devis/profil, un UI et un sélecteur. HTTP M1 existant renforcé avec MOD-05 privé et diagnostic d’effet fermé. Profil targeted-towing-catalog : 66 fichiers applicatifs, 37 suites Firestore, quatorze HTTP ; navigateur global et régression intégrale désactivés. Java 21 et émulateurs en CI seulement. Vérifier le commit exact et consigner la CI dans PR #2 avant la suite. Aucune nouvelle recette DOM ni humaine sur téléphone revendiquée.

Suite : attelage MEC-02 N2/cinq minutes/1 PA, droits et épave compatible unique, trajet à carburant doublé et Manœuvrabilité –1 (minimum 0), largage/interception et interruption, puis ouverture versionnée cohérente. PNJ, primes, revendication et casse sont des parcours distincts à raccorder selon le chapitre 22 ; ne pas attribuer de propriété ou récompense au clic. Garder achat/montage/vol MOD-05 fermés tant que les effets ne sont pas raccordés.

Sauvegarder ensemble code compatible, définitions/calibrations, brouillon/révisions/historiques/délégations et offres. Aucun changement de donnée active, collection ou migration. Ancien binaire refuse ces définitions : archivage sous code compatible ou restauration cohérente approuvée, pas d’effacement partiel. Aucune sauvegarde/restauration externe exécutée. Même branche work/space-pilot-handover et PR #2 brouillon ; aucune fusion main ni publication/déploiement Firebase.


## Fret/douane — contrôle DOM borné — 4 novembre 2026

Base 2e1c1ef : [CI 41836026173](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41836026173) réussie, 840 applicatifs, 669 Firestore, quatorze HTTP et build.

| Contrôle | Preuve automatisée locale | Limite |
| --- | --- | --- |
| Propriétaire et rangement | Aperçu sans mutation, présence requise, même lot rangé | Workflow natif en mémoire, pas de connexion réelle |
| Agent et découverte | Délai/PA, attestations requises, résultat persistant | DOM de composants, pas l’app entière |
| Régie après révocation | Fin joueur absente, annulation motivée et restitution PA | Identités fictives établies dans le fixture |
| Panne B | Ancien contenu protégé et nouveau rangement absent | Règles métier inchangées |
| Ergonomie | Pas de débordement 360/1280 px, attestations ≥44 px, interruption secondaire séparée | Émulation Chromium, aucun appareil Android/iOS réel |
| Réponse obsolète | Contrôleur partagé app/test, aperçu/reçu ignorés après navigation | Test unitaire de routeVersion distinct du DOM |

Local : 843/843 ciblés et build ; 8/8 DOM (quatre scénarios × deux viewports). Chromium 156.0.8078.4. hidden-visual : 66 fichiers, 37 suites Firestore, quatorze HTTP ; navigateur global désactivé. CI exacte dans PR #2. Recette humaine et authentification UI complète restent distinctes. Aucune fusion ou publication.

## MOD-04 — ouverture versionnée et décision B — 4 novembre 2026

Base 6ebf2f2, [CI 41831727543](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41831727543) réussie : 829 applicatifs, 660 Firestore, treize HTTP et build. Décision utilisateur B du 4 novembre consignée dans les règles V0.7 chapitre 24.

| Exigence | État du code proposé | Preuve |
| --- | --- | --- |
| Nouveaux manifestes uniquement | hiddenCargoVersion=1, dépendances/digests/naissance contrôlés | Ancien non enrichi, MOD-04 sans marqueur/inconnu/dépendance refusé |
| Achat/montage MOD-04 | Offre canonique, provision réelle, paiement/réception puis mandat/atelier | Cargo/transport achetés, reçus et montés réellement |
| Vol équipé et panne 15 min | Profil et lot natifs, aucune capacité totale ajoutée | Solo/convoi, un événement commun et appareil choisi |
| B : protection conservée | Ancien contenu caché, nouveau rangement bloqué | Contrôle ordinaire sans révélation pendant panne |
| Approfondie pendant panne | Règles usuelles, découverte durable | D6+N, PA/délai, sortie/rangement puis retrait réel vidé |
| Expiration/PAUSE/STOP | Nouveau rangement à échéance, pas de déplacement automatique | Échéance exacte, pause/STOP, stock/module inchangés |
| Persistance | Même module, fret caché, échéance et marqueur | Documents de l’épisode restauré contrôlés |
| Production et recette humaine | Non effectuées | Aucune fusion/déploiement, rendu mobile à vérifier |

Local : 840/840 ciblés dans 66 fichiers et build. hidden-flight : 37 suites Firestore, quatorze HTTP bornés, aucun navigateur ou suite complète. CI exacte dans PR #2. Les mentions historiques « MOD-04 préparatoire/fermé » ne s’appliquent plus aux nouveaux manifestes compatibles.

## Interface fret/douane sous garde — 4 novembre 2026

Base 678dffc, [CI 41827691829](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41827691829) réussie : build, 813 applicatifs, 657 Firestore, treize HTTP.

| Exigence | État du composant | Preuve |
| --- | --- | --- |
| Propriétaire : volume inclus, lot entier, découverte | Rangement/sortie avec aperçu et présence, manutention existante | UI et protocole exécuté au serveur |
| Agent habilité : deux contrôles distincts | Choix, coûts, seuil, délai, fin personnelle et annulation | Projections/protocole mémoire-Firestore et HTTP |
| Régie : habilitation et PNJ | Niveau/poste/motif/révision, nouvelle tentative, suivi | UI et capacités de suivi serveur |
| Pas de finalisation MJ pour joueur | Uniquement suivi/annulation côté régie | UI et HTTP, service strict inchangé |
| Pas de fuite ou conclusion abusive | Lots du résultat seulement, échec distinct d’absence de fraude | Textes échappés, droits propriétaire/pilote/agent |
| Pause, STOP, panne | Boutons indisponibles selon état serveur ; délai manuel | UI et cas partagés |
| Compatibilité | Pas de lien ni activation sans marqueur | Gardes et anciens manifestes conservés |
| Rendu mobile/visuel | Non validé dans ce lot, Chromium local absent | Recette humaine encore distincte |

Local : 829/829 ciblés dans 66 fichiers et build ; hidden-ui : 37 suites Firestore, treize HTTP, aucun navigateur ou suite complète. MOD-04 montage/commerce/vol/publication toujours fermés, aucune migration ou publication. [Détail](SO-FRET-CACHE.md).

## MOD-04 — retrait vidé, composant fermé — 4 novembre 2026

Base ecd29a8 : [CI 41823800629](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41823800629) réussie, 799 applicatifs, 645 Firestore, treize HTTP et build. Source : V0.7 chapitre 17.

| Exigence | État courant | Preuve |
| --- | --- | --- |
| Pas de démontage avec contenu | Contrôle des lots encore dissimulés à proposition/accord/démarrage/finalisation | Lots connus/inconnus/autres propriétaires ; injection entre aperçu et confirmation |
| Transfert préalable explicite | Sortie du compartiment vers soute ordinaire ou déchargement natif vers sac | Biens et découverte inchangés ; aucun champ de consignation déclaratif |
| MEC-03 N2, cinq minutes, 1 PA | Mandat personnel et travaux natifs | Délai, PAUSE/STOP, présence/atelier, réserves et panne |
| Même module rendu | Restitution au propriétaire, fret/autre module/dommages conservés | Cargo/transport, concurrence, réessai, rollback, reprise |
| Annulation après révocation | Régie peut restituer les réserves en gardant le module monté | Cas partagé sans finalisation à la place du Mécano |
| Ouverture MOD-04 en partie | Toujours fermée, marqueur et équipement synthétiques | Montage/commerce/vol/publication inchangés, anciens manifestes non enrichis |
| Panne, profil/vol et interface | Restent avant ouverture versionnée | Aucun comportement de visibilité en panne supposé |

Local : 813/813 ciblés dans 64 fichiers et build. hidden-removal : 37 suites Firestore, treize HTTP bornés, aucun Chromium ni suite complète. CI exacte consignée dans PR #2. [Détail](SO-FRET-CACHE.md).

## MOD-04 — composant de fret caché fermé — 4 novembre 2026

Base b4b21f5, [CI 41818695160](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41818695160) réussie : 748 applicatifs, 595 Firestore, douze HTTP et build. Source : V0.7 chapitre 24.

| Exigence | État dans ce lot | Preuve |
| --- | --- | --- |
| 5/20 ou 10/50 unités, propriété réelle | Composant serveur, lots entiers, aucun volume créé | Cas partagés cargo/transport, droits et capacité |
| Découverte durable | Métadonnée du même lot, fractionnement/transfert/reprise conservés | Cas partagés et abordage ordinaire refusé avant découverte |
| Ordinaire 2 min / 0 PA | Attestation documentaire sans nouvelle révélation | Cas partagé ; aucune validation fiscale/licence/manifeste |
| Approfondie 2 min / 1 PA joueur | Habilitation organisation N1–N5, D6+N≥7 | Seuils, PNJ 0 PA, délai, pause/STOP |
| Une tentative par vaisseau/escale | Commune aux agents ; autorisation MJ motivée | Concurrence, réessai, nouvel agent, nouvelle escale |
| Persistance et restitution | Verrous, PA, annulation après révocation, reprise | Rollback et instantané natif |
| Achat/montage/vol MOD-04 | Toujours fermés, module et marqueur synthétiques en tests | Garde de publication/catalogue maintenue |
| Retrait vidé/consigné, panne et interface | À raccorder avant ouverture | Contrôles en panne refusés, aucun nouvel écran |

Local : build et 799/799 ciblés dans 64 fichiers. hidden-inspection : 37 suites Firestore, treize HTTP, aucun navigateur ni suite complète. CI exacte dans PR #2. [Détail](SO-FRET-CACHE.md).

## MOD-04 préparatoire — 4 novembre 2026

Base : 880da94, [CI 41816277785](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41816277785) réussie : 742 applicatifs, 592 Firestore, douze HTTP et build.

| Exigence | État | Preuve |
| --- | --- | --- |
| MOD-04, cargo/transport, 10 % du gabarit | Définition M1 : 1 000/2 000 Cr ; chasseur refusé | Cas partagé et pur |
| 5/20 ou 10/50 unités, aucun volume ajouté | Description canonique préparatoire ; aucun fret caché créé | UI et absence de ressources en session |
| Aucun équipement incomplet en partie | Publication bloquée malgré offre exacte ; commerce/mandat/profil installé refusés | Archivage puis publication sans MOD-04 ; injection synthétique refusée |
| Fret caché, inspections et découvertes persistantes | À développer avant ouverture du montage | Limite explicite ; aucun nouveau marqueur actif |

Local : 748/748 ciblés dans 61 fichiers et build. hidden-catalog : 34 suites Firestore, douze HTTP bornés. CI exacte dans PR #2 ; aucun verdict humain ou déploiement.


## Vols équipés et panne temporaire — 4 novembre 2026

Base : 49e2b86, [CI 41813287248](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41813287248) réussie : 675 applicatifs, 535 Firestore, onze HTTP et build.

| Exigence V0.7 | État de cette tranche | Preuve |
| --- | --- | --- |
| Vols équipés MOD-01/02/03/06 | Nouveau moduleFlightVersion=1 ; mêmes lots montés revalidés jusqu’au départ | Quatre parcours achat/montage/départ réels, HTTP/Auth |
| Quinze minutes de neutralisation, sans casse | Horloge de jeu, PAUSE/STOP, même module, expiration sans soin | Cas partagés mémoire/Firestore |
| Maximums, manœuvrabilité et canon lourd courants | Profil recalculé, points plafonnés, bonus restauré sans points | Entretien et combat avant/après expiration ; combat synthétique |
| Événement commun de convoi | Un appareil admissible, un module ; retard commun sans module | Convoi équipé réel et repli natif conservé |
| Droits, réessai, concurrence et rollback | Aucun double débit, effet ou exemplaire ; marqueur avant reçu | Lots incohérents, courses, révocation, interruption |
| Épisodes et versions historiques | Échéances/événement conservés ; ancien manifeste non enrichi | Snapshot/reprise et garde historique |

Local : 742/742 tests ciblés dans 61 fichiers et build ; profil module-flight, 34 suites Firestore/douze HTTP. CI exacte dans PR #2 ; aucune recette terrain ni publication. Les limites des sections historiques ci-dessous sont remplacées par cet état pour les seuls nouveaux manifestes compatibles.


## Raccordement préparatoire du canon lourd — 4 novembre 2026

Base vérifiée : `a80a80551c35446edb127375149757cbeb4bebaa`, [CI ciblée 41810124019](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41810124019) completed/success : build, 516 applicatifs, 417 Firestore (132 + 89 + 111 + 85), huit HTTP. Verdict exact consigné dans PR #2 avant cette tranche.

| Exigence V0.7 chapitre 17 / combat | État | Preuve |
| --- | --- | --- |
| MOD-06 : une attaque, 5+, deux dégâts | Profil natif transmis au résolveur duel et flotte | Cas partagés encounters/convoi ; HTTP duel renforcé |
| Défense, cumul et dégâts persistants | Résolveurs natifs conservés ; aucune réparation ni casse de module ajoutée | Seuils, défense, dégâts, concurrence/réessai ; équipement synthétique après départ |
| Vol équipé, neutralisation 15 min et événement commun de convoi | Toujours à développer ; départ équipé bloqué | Tests de garde précédents conservés |

Local : 675/675 tests ciblés dans 56 fichiers et build. Profil module-combat : 31 suites Firestore, onze HTTP ; CI exacte dans PR #2. Aucun nouveau manifeste, migration, recette humaine ou déploiement.


## Complément atelier — 4 novembre 2026

| Exigence V0.7 chapitre 17 | État courant | Preuve |
| --- | --- | --- |
| Retrait MOD-01/02/03/06, MEC-03 N2, cinq minutes, 1 PA | Raccordé au mandat propriétaire et travail Mécano natifs | space-module-removal-suite, mémoire/Firestore ; HTTP/Auth ciblé |
| Même identité, état opérationnel et gabarit ; réduction des maximums sans points rendus | Même lot au sac, profil recalculé, points plafonnés ; interruption conserve l’équipement | Quinze nouveaux cas partagés, deux UI |
| Vols équipés/combats et neutralisation en voyage | À développer ; départ équipé toujours bloqué | Vol nu après retrait du dernier module testé |

Local : 516/516 ciblés dans 39 fichiers et build. Profil module-removal, 24 suites Firestore/huit HTTP ; CI exacte à consigner dans PR #2. moduleRemovalVersion=1 sur nouveaux manifestes seulement. Aucun verdict de recette humaine ou publication.


## Finalisation du montage à quai — 2 novembre 2026

Base réelle : `065329a438d69afd9f579b712ebfbfd4ce44fc61`, [CI ciblée 41515892870](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/41515892870) réussie, huit jobs requis : build, 455 applicatifs, 373 Firestore (95 + 82 + 54 + 142), six HTTP. Pas de reprise d’audit historique. Source métier : [règles V0.7, chapitre 17](source/SO_Regles_V07.txt), montage et maximums sans effacer les dégâts.

Le Mécano désigné ouvre un aperçu après le délai puis confirme présence, atelier et montage réellement effectué. Ni propriétaire ni MJ ne finalisent à sa place. Mandat personnel, droits/versions d’identité, propriétaire vivant, qualification MEC-03, port, atelier, même lot ordinaire, calibration, emplacement/doublon et réservations sont recontrôlés. Validation partagée du mandat, avec retrait des seuls verrous de ce dossier pour le contrôle ; révisions du lot et du vaisseau strictement liées au démarrage. PAUSE/STOP bloquent la finalisation. Pas de montage à l’échéance sans confirmation.

Une seule transaction consomme le PA réservé, libère les verrous, ferme le dossier MODULE_INSTALLED et attache le même exemplaire : inventaire INSTALLED, emplacement SHIP_MODULE, quantité/propriété/code/gabarit inchangés ; aucune monnaie ni nouvelle collection. Le profil natif soProfile est recalculé depuis la base canonique et les modules montés : MOD-01 +1 maximum Bouclier, MOD-02 +1 maximum Coque, MOD-03 +1 Manœuvrabilité (plafond permanent 3), MOD-06 canon lourd préparé. Points actuels Coque/Bouclier conservés, aucune réparation implicite. Les réparations natives voient les nouveaux maximums. MODULE_WORK conserve sa capacité existante, sans accès aux comptes/ledger/contrats/connaissances. Réessai, concurrence avec confirmation/annulation et rollback ne doublent ni PA ni exemplaire.

Périmètre explicitement **limité à quai** : retrait, effets en combat et neutralisation en voyage restent à développer. Les départs solo et en convoi avec module monté sont bloqués au serveur (aperçu, démarrage et ultime confirmation, y compris partenaire du convoi), et l’interface masque le formulaire de départ équipé. Le plein reste possible. Ne pas ouvrir les vols équipés tant que canon lourd, dommages/maximums, neutralisation temporaire de quinze minutes et convoi commun ne sont pas raccordés ensemble. Le module monté est affiché séparément du sac, de la soute et des biens à récupérer au comptoir ; référence du même lot et accès privé au vaisseau conservés. Aucun transfert/rachat/pillage ajouté.

Nouveaux manifestes uniquement : moduleInstallationVersion=1 dépend de moduleWorkVersion=1 ; transmis à la naissance, conservé entre épisodes. Ancien manifeste/session reste aux travaux avec interruption, sans finalisation ajoutée implicitement. Données montées conservées par le snapshot/reprise natif, sans nouvelle attribution ; PA renouvelés selon le cycle natif. Sauvegarder ensemble manifeste/pages et marqueurs, dossiers/mandats/versions, identités/droits, vaisseaux/profils/modules, mêmes lots/emplacements/historiques, réservations PA/horloges et operations/logisticsHistory. **Ancien binaire non équivalent** : il ignore INSTALLED/SHIP_MODULE et la garde de départ. Aucun retour de binaire seul, suppression d’un marqueur, libération forcée ou effacement partiel ; restauration seulement d’un ensemble cohérent selon procédure approuvée. Aucune migration ou remise à zéro implicite.

Validation locale : **498/498 tests ciblés dans 38 fichiers**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. Treize nouveaux cas partagés mémoire/Firestore, un cas pur du profil, trois UI et un HTTP/Auth ; ciblage explicite et dépendances voyages/convois inclus. Profil `[ci targeted:module-installation]` : 23 suites Firestore, sept parcours HTTP bornés, aucun Chromium ni suite complète. Émulateurs non exécutés localement (Java 17, CI Java 21). Build réussi ; preuves du commit exact dans PR #2 avant le lot suivant. Résultat ciblé distinct d’une régression intégrale et d’une recette humaine.

Même branche `work/space-pilot-handover`, PR #2 brouillon. Aucune fusion main, publication ou modification d’environnement Firebase. Suite : retrait chronométré du même module puis raccordement complet des voyages équipés/combats/neutralisation avant de retirer le verrou de départ.


## État courant — démarrage et interruption des travaux modules, tests ciblés, 2 novembre 2026

L’état évolutif autoritaire et les preuves actuelles sont dans [SO-VALIDATION](SO-VALIDATION.md). Les sections C2 ci-dessous sont historiques. CI adaptée le 27 octobre à la demande utilisateur : tous les tests applicatifs, intégration ciblée sur PR brouillon avec repli complet, Firestore réparti en lots indépendants et HTTP/Auth complet lorsque requis. Avant fusion/publication, suite complète sur le candidat. Aucun acquis fonctionnel supplémentaire ni recette terrain revendiqués par cette optimisation.

| Exigence | Couverture ajoutée | Limite |
| --- | --- | --- |
| V0.7 chapitre 17, démarrage Mécano et réserves | Accord revalidé → démarrage personnel → module/1 PA réservés, vaisseau/Mécano verrouillés → temps de jeu 10/15 min → interruption avec restitution atomique. Douze cas partagés, capacité sans finances, deux UI et un HTTP ; local 455/455 ciblés et build ; CI exacte dans PR #2 | moduleWorkVersion nouveau seulement. Aucun montage ou débit automatique à échéance ; finalisation/équipement/retrait et effets en voyage restent à livrer. Un travail actif bloque la clôture jusqu’à interruption |
| V0.7 chapitre 17, accord du propriétaire pour le montage | Proposition MJ liée au vaisseau/module reçu/Mécano/port → aperçu privé → accord ou refus personnel → annulation. Droits et état courant, concurrence/réessais/rollback, séparation de l’entretien et continuité testés. Local 413/413 ciblés et build ; CI exacte dans PR #2 | Accord préparatoire sans réservation, PA, paiement ou effet spatial. moduleMandatesVersion nouveau seulement, collection shipMaintenance discriminée. Démarrage Mécano, montage/retrait et effets en voyage restent à livrer |
| V0.7 chapitre 17, achat de modules standards | M1 calibré → offre au tarif canonique → stock réel MJ → paiement ordinaire → propriété → remise/réception du même lot non monté. Douze cas partagés, un UI, un HTTP ; local 299/299 ciblés et build. CI exacte dans PR #2 | modulePurchasesVersion nouveau seulement, aucune dotation initiale, crédit protégé ou installation. Un exemplaire par stock d’offre. Mandat/MEC-03, effets et neutralisation en voyage restent à livrer ; aucune publication |
| V0.7 chapitre 17, catalogue des modules standards | MOD-01/02/03/06 : code/gabarit M1 stricts, douze tarifs fixes, profils MEC-03, métadonnées figées dans le contrat des lots. Sept cas partagés, deux purs, un UI, un HTTP ; local 205/205 ciblés et build. Profil module-catalog : neuf suites Firestore et trois HTTP ; CI exacte dans PR #2 | Préparation seulement, publication bloquée tant que l’atelier et les effets de voyage ne sont pas raccordés. Excel même brouillon conserve, transfert de calibration vers un autre Master non pris en charge. Aucun montage, achat ou marqueur de session actif |
| Demande organisateur du 2 novembre : tests ciblés uniquement | Profils explicites ci/diagnostic sur PR brouillon, fichiers applicatifs/suites Firestore/HTTP bornés ; sélection invalide/hors périmètre refusée. Succès ciblé exclu des références ancestrales, complet prioritaire avant fusion. Local 145/145 ciblés et build ; CI exacte dans PR #2 | Résultat partiel, aucune nouvelle couverture métier globale ou recette humaine. Profil diagnostic : quinze fichiers, sept suites Firestore et un parcours HTTP, pas de Chromium |
| V0.7 chapitre 11, MEC-01 | Cible/panne préparée M6 → QR privé → aperçu → 60 s/1 PA → informations garanties selon niveau → carnet natif. Récupération dix minutes et une tentative par personnage/version, état conservé entre épisodes. Douze cas partagés, deux UI, un HTTP ; local 2300/2300 et build | technicalAnalysisVersion nouveau seulement ; pas de défaut à test, réparation, accès caché ou lecture technique native automatique. CI exacte dans PR #2, aucune publication |
| V0.7 chapitres 17/21, même exemplaire et identité permanente distincte | Propriétaire vivant présent à quai → aperçu → confirmation du nom d’usage → anciens noms et transpondeur conservés dans ships et historique natif. Aucun effet sur biens/fonds/PA/contrats/pilote/propriété. Dix cas partagés, deux UI, HTTP enrichi ; local 2286/2286 et build | shipNamingVersion nouveau seulement, pas de migration ; cent changements maximum, borne technique. Aucun faux papier, transpondeur modifié ou titre. CI exacte dans PR #2, aucune publication |
| V0.7 chapitre 21, refus sans débit | Demande minimale → refus personnel → sponsor supprimé, ancien paiement interdit, accusé privé et décision MJ. Autre paiement embarqué/libération indépendants ; nouvelle demande explicite avec confirmation neuve. Huit cas partagés, deux UI, HTTP à quatre enrichi | Marqueurs existants, aucune migration. STOP, révocation, état périmé, concurrence, rollback et continuité ; CI exacte dans PR #2, aucune publication |
| V0.7 chapitre 21, rançon libre, refus sans débit et libération distincte | MJ propose sans montant à un membre d’origine d’un autre appareil de la rencontre → demande minimale privée → libre montant/confirmation personnelle → même TRANSFER et reçu lié. Aucun droit de scène, stock ou voyage modifié ; un seul paiement concurrent. Douze cas partagés, deux UI, HTTP à quatre enrichi ; local 2264/2264 et build | boardingRansomSponsorVersion/sponsorVersion nouveaux seulement. Un soutien actif, pas de tiers extérieur/caisses/versements multiples ; autres alliés sans dossier. CI exacte dans PR #2 ; aucune publication |
| V0.7 chapitre 21, garde et propriété distinctes, retour PNJ natif | Fret sous garde → receveur au port d’origine → retour MJ au comptoir propriétaire en trois minutes/tranche → réserves et remise en stock traitées séparément par mission native. Possible sans transporteur décédé/révoqué, sans héritage ; quantités/références conservées. Dix cas partagés, deux UI, un HTTP ; local 2250/2250 et build | boardingShopReturnVersion/shopReturnVersion nouveaux seulement. Aucun autre port/comptoir, salaire/livraison/fusion commerciale ou succession automatique. CI exacte dans PR #2 ; aucune publication |
| V0.7 chapitre 21, fret sous garde sans livraison/propriété implicite | Fret PNJ contractuel identifié → transbordement supervisé → garde/voyage du receveur → restitution à la soute du transporteur d’origine au même port → livraison et règlement natifs seulement. Contrat, propriétaire, références et réserves conservés ; régie/bilan adaptés. Dix cas partagés, deux UI, un HTTP ; local 2238/2238 et build | boardingFreightVersion/freightVersion nouveaux seulement. Aucun sac/tiers/groupe hors contrat, accès caché, salaire/usage/vente ou titre automatique. CI exacte dans PR #2 ; aucune publication |
| V0.7 chapitre 21, garde/propriété distinctes et continuité | Même projection en lecture seule dans régie du fret et bilan : lots reçus encore détenus, volume réel, propriétaire/gardien, alertes et liens natifs ; restitution partielle/annulation, libération et épisode suivant. Dix cas partagés, deux UI, HTTP enrichi ; local 2226/2226 et build | Propriétaire/MJ courant seulement ; aucune écriture, succession, autorisation ou réserve nouvelle. Anciens marqueurs non enrichis, règles de clôture inchangées. CI exacte dans PR #2 ; aucune publication |
| V0.7 chapitre 21, transbordement cinq unités/trois minutes, REC-SO-18 partiel | Lot personnel ordinaire identifié MJ → réservation native → délai complet → réception sous garde, propriétaire conservé → restitution supervisée au propriétaire vivant présent au port. Capacité, interruption, concurrence/rollback, STOP/pause et continuité. Quinze cas partagés, deux UI, HTTP enrichi ; local 2214/2214 et build réussis | boardingCargoVersion/cargoVersion nouveaux seulement. Aucun accès caché/coffre, fret confié, usage/vente ni titre définitif ; terminer/annuler les tranches ouvertes avant libération/clôture. CI exacte dans PR #2 ; recette humaine distincte, aucune publication |
| V0.7 chapitre 21, rançon libre et libération distincte, REC-SO-18 partiel | Contrôle de passerelle → montant libre saisi par un équipier visé → aperçu → confirmation personnelle → même registre TRANSFER et reçu lié au dossier ; aucun débit au refus, réserves/protection et verrous conservés. 13 cas partagés, deux UI, HTTP enrichi | Nouveau boardingRansomVersion/ransomVersion ; anciens dossiers fermés. Un paiement personnel par dossier, pas de versements multiples/caisses/tiers ni libération automatique. CI exacte dans PR #2 ; aucune publication |
| V0.7 chapitre 21, V3.5 §6.5/A.7, REC-SO-18 partiel | Rencontre fermée à trois/quatre → paire de camps opposés → arrimage et scène MJ natifs → contrôle/libération de deux seulement ; redditions/Coques zéro antérieures conservées, fuyards exclus, dossiers privés à leurs équipages, continuité. 15 cas partagés, un UI, HTTP à quatre enrichi | Nouveau fleetBoardingVersion ; anciens manifestes/rencontres non enrichis, duel historique conservé. Une scène active par rencontre ; fret/propriété/rançon/remorquage et recette humaine distincts. CI exacte dans PR #2, aucune publication |
| V0.7 chapitre 21, V3.5 §6.5/A.7 | Duel fermé → Coque zéro ou reddition acceptée précise → arrimage deux minutes → scène jouée/ordres MJ annoncés → résultat sans contrôle ou contrôle temporaire puis libération ; équipages/trajets d’origine, verrous et continuité. 19 cas partagés, trois UI, un HTTP/Auth | Nouveau boardingVersion, anciennes publications/rencontres non enrichies. Deux vaisseaux seulement ; fret/propriété/rançon/remorquage distincts. CI exacte dans PR #2 ; aucune publication |
| V0.7 chapitres 19/20, déclaration préalable et sorties individuelles | Un indépendant contre deux alliés consentants, même camp normalisé, rencontre native à trois, poursuite/défenses désignées, remboursements et continuité ; 15 cas partagés, trois UI et un HTTP/Auth | Nouveau allianceDefenseVersion et portée defenseVersion explicite ; anciens accords non élargis. Groupes plus grands et abordage distincts. CI exacte dans PR #2, aucune publication |
| V0.7 chapitres 19/20, déclarations préalables et choix individuels | Deux accords de camp, même aperçu quel que soit le membre visé, quatre positions traitées atomiquement sans faux convoi, décrochage/sorties individuels, concurrence croisée et continuité ; 15 cas partagés, trois UI et un HTTP/Auth | Nouveau allianceDuelVersion et portée défensive explicite. Ancien parcours cargo/escorte conservé ; pirate indépendant contre alliance et groupes plus grands distincts. CI exacte dans PR #2, aucune publication |
| V0.7 chapitres 19/20, PIL-03 et ESC-01 | Deux pirates déclarés contre cargo/escorte : équipes correctes, jets stables à quatre, tirs simultanés et défense désignée, poursuite sans remplacement, N4 et sorties/paix individuelles, continuité ; 15 cas partagés, trois UI et un HTTP/Auth | Nouveau allianceConvoyVersion ; rôle initial du meneur explicite à l’accord. Anciennes rencontres à trois conservées ; entre alliances, groupes plus grands et abordage distincts. CI exacte dans PR #2, aucune publication |
| V0.7 chapitres 19/20, déclaration préalable et combat par camps | Invitation puis accord personnel sur deux positions réelles, une position principale au tirage, participation commune à trois, poursuite coordonnée, paix/reddition/fuite individuelles et continuité ; 15 cas partagés, trois UI et un HTTP/Auth | Nouveau pirateAllianceVersion ; modèle borné meneur/second face à un vaisseau seul. Convoi escorté, quatre vaisseaux, rencontres entre alliances et coalitions plus grandes restent fermés ; CI exacte dans PR #2, aucune publication |
| V0.7 chapitre 19, positions ciblées et priorité | Reçu personnel M6 acquis → position native sur liaison réelle → priorité au voyage admissible, tirage journalisé et rencontre unique ; cible cargo/escorte et décrochage, anciens documents sans suivi/alerte, continuité ; 15 cas partagés, trois UI et un HTTP/Auth | Nouveau targetedAmbushVersion, anciens manifestes fermés au ciblage. Sources PNJ personnelles, un pirate/convoi natif ; transmission de capacité et coalitions distinctes. CI exacte dans PR #2, aucune publication |
| V0.7 chapitre 19, renseignements préparés et non traceurs | Proposition MJ d’un M6 privé, trois prix fixes 50/150/300 Cr, paiement ordinaire atomique vers caisse PNJ, carnet figé, refus/annulation, concurrence/réessai et continuité ; 16 cas partagés, quatre UI et un HTTP/Auth | Nouveau intelligenceVersion ; service local existant, contenu préparé sans garantie. Voyage lié privé, aucune embuscade ciblée ni actualisation/alerte automatique. Anciens manifestes fermés ; CI exacte dans PR #2, aucune publication |
| V3.5 §6.4/A.8, V0.7 chapitres 17/23 | Sélection ordonnée de plusieurs lots du même objet, aperçu du payeur lié à toutes les sources, réservation/consommation atomiques et reliquat conservé ; un PA Mécano ou une prestation PNJ par intervention. Neuf cas partagés, deux UI et un HTTP/Auth ; 2034 applicatifs/build locaux réussis | Nouveau maintenanceLotsVersion ; 20 sources maximum technique, même objet à 50 Cr. Fractions/mélanges de références distincts ; CI exacte dans PR #2, aucune publication |
| V3.5 §6.4/A.8, V0.7 chapitre 17 | Prestataire PNJ sur pièces personnelles : seule prestation de 0,5 % réservée/payée une fois au premier point, annulation avant/après effet, caisse native et pièces non refacturées ; neuf cas partagés, un UI et un HTTP/Auth ; 2023 applicatifs/build locaux réussis | Nouveau maintenancePnjVersion ; lots entiers 50 Cr, désormais combinables selon la ligne précédente ; service présent attesté MJ. Fractions/mélanges et rémunération privée distincts ; CI exacte dans PR #2, aucune publication |
| V3.5 §6.4/A.8, V0.7 chapitres 17/23 | Pièces personnelles existantes, devis MJ et accords payeur/Mécano, réservation/consommation par point sans second paiement, PA au premier effet, interruption et continuité ; neuf cas partagés, un UI et un HTTP/Auth | Nouveau maintenanceSuppliesVersion ; Mécano joueur, lots entiers de 50 Cr référencés M5. PNJ complété par la ligne précédente ; fractions et mélanges distincts ; CI exacte dans PR #2, aucune publication |
| V3.5 §6.1–6.2/A.8, V0.7 chapitres 12/21 | Régie : relève du pilote à quai, aperçu et attestation du mandat/accord/présence ; contrôle PIL-02, accès/localisation/disponibilité, propriété et ressources conservées, reçu/historique atomiques. Cinq cas partagés, un UI et HTTP/Auth enrichi ; 2003 applicatifs/build locaux réussis | Sans opérations, convoi, fret sous garde ou obligations contractuelles ouvertes ; délégation autonome, service PNJ et remplacement en vol distincts. CI exacte dans la nouvelle PR, aucune publication de cette tranche |
| Autorisation utilisateur du 28 octobre, conservation des acquis | Publication de recette sur le projet existant `gn-engine` ; garde du workflow exigeant la CI complète du SHA main exact, trois tests de garde | Publication 0.37.0 réussie sur main d83226f (CI 40649361336, déploiement 40649361423 tentative 2) ; aucune migration/IAM/seed, aucune recette humaine ni CDC complet certifiés |
| Consignes de recette finale, V3.5 §7.2/§8, SEC-SO partiels | Paquet local Firebase de recette : Auth réelle ciblée, serveur et médias dédiés, règles/index/Storage et plan sans exécution ; sept tests préparatoires | Cible réelle, IAM/OAuth, provisionnement, publication et recette humaine non exécutés ; aucune couverture métier nouvelle. [Guide](SO-RECETTE-FIREBASE.md) |
| V3.5 §9.2, SEC-SO-01 et LOCAL-05 partiels | Régie MJ : suspension, liens invalidés, invitation de réouverture native ; confirmation ancienne refusée, autre compte/authentification ancienne refusés, reprise du même personnage et des mêmes biens | Sept parcours Chromium au total ; anciens contrats toujours bloqués après réouverture, réserves conservées ; pas d’effacement distant des données déjà vues, pas de nouvelle dotation, Google réel et recette humaine non exécutés |
| V3.5 §3.9 et §9.2, SEC-SO-02 partiel, boutique native et STOP | Dialogue de confirmation incertaine ; deux parcours Chromium ajoutés : STOP/devis périmé sans débit, réponse perdue après achat puis reçu tronqué/réessai avec un paiement et une réception uniques | Six parcours au jalon cb72d9d ; page conservée ouverte, remise déclarée fictive. Ni concurrence entre appareils, ni rechargement complet, ni récompense de mission après délai, ni verdict humain certifiés |
| Préparation de recette, V3.5 §7.2/§8, chapitre 25/A38 | Lanceur local isolé, six identités Auth Emulator, scénario natif financé et sept cas manuels avec relevé ; neuf tests applicatifs et un HTTP/Auth dédié | Aucun verdict humain : 55 recettes + dix SEC-SO, appareils, charge et restauration restent à exécuter. Java 21 requis, boucle locale seulement |
| Consignes de recette finale, V3.5 §7.2/§8, V0.7 chapitre 25 ; SEC-SO-01 et REC-SO-21 partiels | Quatre parcours Chromium sur le kit isolé : export non exécuté, six identités/droits, filtres, STOP/reprise, preuve après coupure avant envoi, validation sans paiement et pause ; résultats exacts dans la PR | Automatique uniquement. Viewport étroit ≠ téléphone ; aucun paiement à échéance, médiation, retrait physique, coupure après écriture serveur ou verdict humain certifié |
| V3.5 §7.2/§8.1–8.2, V0.7 chapitre 25/A38 | Régie MJ filtrable et bilan commun : salaires libres/litigieux, objets et retraits, fret, provision carburant et recours ; contrats payés encore à suivre, continuité native ; onze cas partagés, quatre UI, cinq HTTP/Auth enrichis | Lecture seule : aucune permission de paiement/transfert déduite ; créances séparées des réserves. Anciens bilans lisibles, capacités historiques respectées, recette terrain non effectuée |
| V3.5 §4.1–4.2/§7.2/§8/A.8, V0.7 chapitres 3/25/A38 | QR du port → contrats privés du transporteur → déchargement natif chronométré → réception physique et suivi MJ ; dix cas partagés, quatre UI, HTTP/Auth et détour enrichis | Fret PNJ individuel accepté ; scan sans preuve de présence ni paiement. Livraison complète exigée pour le salaire, pas de règlement partiel nouveau |
| V3.5 §4.1–4.2/§7.1–7.2/A.8, V0.7 chapitres 3/25/A38 | QR comptoir → récompenses privées du titulaire → présentation MJ et réception personnelle, même lot/contrat sans second paiement ; 12 cas partagés, quatre UI, parcours HTTP/Auth étendu | Récompenses matérielles déjà attribuées ; aucun scan valant présence, ni réception automatique du fret ou validation de mission |
| V3.5 §7.1–7.2/A.8, V0.7 chapitre 25/A38, REC-SO-21 | Prime PNJ : cagnotte réelle, preuves privées et consenties, attribution unique vers contrat contestable, clôture sans libérer les réserves contractuelles et reprise complète ; 20 cas partagés, quatre UI, un HTTP/Auth | Monétaire/individuelle avec preuve narrative MJ ; groupes, objets et événements QR/voyage restent distincts |
| V3.5 A.8, V0.7 chapitre 25, REC-SO-21 | Recours financier : décision motivée sans débit, créance, restitution consentie ou complément PNJ, paiements partiels sur fonds disponibles et continuité ; 19 cas partagés, quatre UI, un HTTP/Auth | Salaire du contrat PNJ individuel uniquement ; pas de dommages supplémentaires, récupération automatique de biens ou transmission au successeur |
| PIL-01, chapitres 3/18, REC-SO-16 | Analyse graduée du dossier M6 préparé lié à M3, code connu au port, durées/PA/aide, informations garanties et supplément, tentative unique et continuité ; 18 cas partagés, trois UI, un HTTP/Auth | Port configuré par la navigation native ; renseignement ciblé et recette terrain ouverts |
| PIL-01, chapitre 18, REC-SO-16 | Détour solo/convoi : un jet, PA et carburant réels, événement conservé, temps acquis, exposition à la nouvelle liaison, fret et retour au port contractuel ; 20 cas partagés, deux UI, un HTTP/Auth | Analyse PIL-01 raccordée ; renseignement ciblé, routes composites et recette terrain restent ouverts |
| A35–A36, REC-SO-21 | Contrat d’escorte PNJ distinct du fret, salaire et provision aller-retour, plein natif au réel, issue MJ 100/50/0 %, délais/recours et reliquat financier ; 18 cas partagés, deux UI, un HTTP/Auth | Avenants à quai, ESC-01 et détour PIL-01 raccordés ; clients joueurs/groupes et escales approvisionnées ouverts |
| A20–A23, REC-SO-14/16/17 | Convoi cargo/escorte consenti, deux préparations, départ/événement communs, panne/reprise, interception unique, combat natif à trois et fuite individuelle ; 16 cas partagés, six de résolution et deux UI | ESC-01 et détour PIL-01 raccordés ; alliances pirates et plusieurs cargos ouverts |
| A35–A36, REC-SO-21 | Contrat M7 de fret PNJ, salaire/stock réservés, chargement/voyage/livraison, réception MJ, retour physique et médiation ; dix cas partagés et deux UI | QR de réception raccordé ci-dessus ; assurance, clients joueurs/groupes, règlement de livraison partielle et barèmes exceptionnels complets restent ouverts |
| A08, REC-SO-01 | Acquisition/augmentation, cinq secondaires, 34 entrées, exclusivités, coûts, rares et reconversion consentie ; 18 cas métier partagés et deux UI | Les effets des compétences encore non raccordées et la recette humaine ne sont pas certifiés |
| A09, REC-SO-02 | Solde débité sans modifier XP gagnés/hérités, plafond du participant conservé après relève, acquisitions conservées dans l’épisode suivant | Parcours acquis distinct de la validation complète de tous les 55 cas |
| SEC-SO, persistance A38 | Droits avant reçus, interruption/concurrence, aperçu périmé, HTTP/Auth, ancien manifeste fermé | CI du candidat à consulter dans la PR ; aucune migration ni production |


## C2q — Excel des lieux et informations M6

[C2q — contrat, tests et limites](SO-06-C2Q-EXCEL-LIEUX.md). Schéma M6 2, Informations/Lieux dans un lot atomique ; anciens contrats M6 1 conservés. Profils/récompenses natifs, homonymes typés, droits, localisation et captures. REC-SO-MST-02/03/05/06/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Aucun stock, action, QR ou laboratoire activé ; conformité canonique, publication, I3 complet et I4/I5 restent à livrer.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1477/1477 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 18 nouveaux cas partagés mémoire/Firestore, trois UI et un HTTP/Auth. Firebase non exécuté localement (Java 17.0.20) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2p archivées](PR-1-HISTORIQUE-AVANT-C2Q.md) : 1456 applicatifs/1179 Firebase/HTTP chacun.

## C2p — lieux, fouilles et installations préparés dans M6

[C2p — lieux, fouilles et installations M6](SO-02-C2P-LIEUX-CENTRAUX.md) ajoute les définitions natives `fieldTarget`, les profils et récompenses proposés, et raccorde les références M3/M4/M5 sous lecture M6. Références internes M6/M1 contrôlées, import M6 homonyme préservé, captures compatibles ; aucune instance, réserve, action, QR ou habilitation de laboratoire créée. REC-SO-MST-03/05/06/08 et REC-SO-REC-01/05 : preuves préparatoires partielles ; les 55 verdicts complets et SO-GAP-12/13/14 restent ouverts. Conformité canonique, sources réelles des récompenses, activation/publication, I3 complet et I4/I5 restent à livrer.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1456/1456 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 25 nouveaux cas partagés mémoire/Firestore, cinq UI et un HTTP/Auth. Firebase non exécuté localement (Java 17.0.20) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2o archivées](PR-1-HISTORIQUE-AVANT-C2P.md) : 1426 applicatifs/1153 Firebase/HTTP chacun.

## C2o — groupes et factions préparés dans M2

[C2o — groupes et factions M2](SO-02-C2O-GROUPES-CENTRAUX.md) ajoute les définitions natives de groupes, textes privés et appartenances/permissions proposées dans le brouillon commun. Références M2 vérifiées, audit, archives et réessais ; aucune instance, caisse, stock, notification ou droit de session créé. L’import M2 conserve les groupes ; I3c accepte leur présence sans les confondre avec des admissions. Publication, activation, naissance, I3/INS-06 complet et I4/I5 restent ouverts ; les 55 verdicts complets et SO-GAP-12/13/14 ne sont pas clos.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1426 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth. Firebase non exécuté localement (Java 17) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2n archivées](PR-1-HISTORIQUE-AVANT-C2O.md) : 1399 applicatifs/1129 Firebase chacun.

## C2n — instantanés privés du brouillon central

[C2n — instantanés centraux](SO-02-C2N-INSTANTANES-CENTRAUX.md) : capture propriétaire des sept ateliers et du rapport, pages privées immuables, relecture sous droits C2b et téléchargement vérifié. Le brouillon reste modifiable, les références à corriger restent signalées. Étape additive du cycle de préparation C2 ; publication, version activable et naissance restent indisponibles. C2 complet, I3/INS-06 complet, I4/I5, SO-GAP-12/13/14 et les 55 verdicts complets restent ouverts.

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

## C2c — plans de création M2

[C2c — plans initiaux joueurs M2](SO-02-C2C-PROFILS-INITIAUX.md) : classe, espèce partagée et initiation hors classe, trois principales dérivées à N2 ou fixes, références différées/nature contrôlées, plan privé sans profil actif ni ressources. **1022 tests applicatifs locaux et build réussis** ; 15 nouveaux cas métier partagés Firestore, un cas exhaustif des 56 combinaisons, quatre UI et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. REC-SO-01 et INS-06 : preuves préparatoires partielles uniquement ; SO-GAP-12/13/14 restent ouverts, 55 verdicts complets inchangés. Publication globale, I3/I4/I5, effets, dotations et recette humaine restent à compléter.

## C2b — autorité explicite du contrôle

[C2b — délégation explicite du contrôle](SO-02-C2B-DELEGATION-CONTROLE.md) : droit de campagne distinct, sept lectures explicites, révocation courante, choix compatible avec les anciens clients, audit et empreinte liée à la révision des droits. **1002 tests applicatifs locaux et build réussis** ; 15 nouveaux cas métier partagés Firestore, quatre UI et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. C2a reste partiel et `publicationAvailable=false`. SO-GAP-12/13 restent ouverts ; les habilitations centrales reçoivent des preuves partielles supplémentaires ; aucun des 55 verdicts complets ne devient un succès. Publication, I3/I4/I5, recette mobile et restauration globale restent à compléter.

## C2a — diagnostics centraux de préparation

[C2a — contrôle de préparation commun](SO-02-C2A-CONTROLE-CENTRAL.md) : rapport propriétaire M1/M2/M4, ajouts/exclusions, références et diagnostics localisés, formes natives et provenance vérifiées, empreinte liée au contexte et à la révision. **983 tests applicatifs locaux et build réussis** ; 19 nouveaux cas partagés Firestore, quatre bornes/empreinte, trois UI et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. Contrôle en lecture seule ; couverture partielle explicite, aucune version ni publication. Les 55 recettes complètes restent non certifiées.

## C1e — fiches narratives et relations M2

[C1e — fiches narratives M2](SO-01-C1E-PERSONNAGES.md) : identité/nature, textes privés, objectifs avec étapes et relations orientées dans le brouillon commun, avec références différées, délégation M2 et archive/restauration auditée. **957 tests applicatifs locaux et build réussis** ; 20 nouveaux cas métier partagés avec Firestore, quatre UI et un HTTP/Auth. CI du SHA exact à consigner dans la PR après terminaison. Aucune candidature convertie, instance, dotation ou publication créée. Profils canoniques, XLSX M2, contrôle global C2, I3/I4/I5 et recette humaine restent incomplets ; les 55 verdicts complets sont inchangés.

## C1d — Excel central M1/M4

[C1d — Excel central M1/M4](SO-01-C1D-EXCEL-CENTRAL.md) : export ciblé ou gabarit lié à la campagne, aperçu sans écriture, confirmation atomique dans le brouillon commun, révisions et lots idempotents, provenance fichier/feuille/ligne. **933 tests applicatifs locaux et build réussis** ; 21 nouveaux cas métier partagés avec Firestore, trois rendus UI, un cas de sécurité XLSX et un HTTP/Auth. Résultats CI du SHA exact dans la PR après terminaison. Les quatre Masters historiques sont inchangés. Publication globale, autres ateliers, fabrication, M2 personnage/naissance/relève et recette sur appareils restent à compléter ; les 55 verdicts complets restent inchangés.

## C1c — M4 et références différées

[C1c — recettes dans le brouillon central](SO-01-C1C-RECETTES.md) : édition/archivage/restauration M4, références M1 différées, diagnostics privés et délégations M4 distinctes. **908 tests applicatifs locaux et build réussis** ; 14 nouveaux cas métier partagés avec Firestore, quatre rendus UI et un HTTP/Auth. CI du commit exact à consigner dans la PR après terminaison. Aucun import central ni publication/fabrication ; M5, personnages M2, naissance/relève et recette mobile restent à développer. Les 55 verdicts complets restent inchangés.

## C1b — brouillon initial et délégations de campagne

[Matrice ciblée](SO-01-C1B-BROUILLON.md) : sept entrées dans six domaines, schéma natif de biens M1 sans stock, source M2 narrative conservée, droits centraux séparés de la session, révisions/concurrence/audit. **890 tests locaux et build réussis** ; CI exacte dans la PR. SO-GAP-12/13 partiels, aucun écart clos ; M3–M7 centraux, contrôle/publication globale, import/export central et adoption historique non livrés. I3/I4/I5 restent nécessaires.

## I2b — groupes et mandats de session

[Matrice ciblée et compatibilité](SO-01-I2B-GROUPES.md) : politique optionnelle sur les groupes existants, transfert et retrait atomiques, capacités, responsable, révocation/autorisation séparées, audit/contre-opération. **869 tests locaux et build réussis** ; CI exacte dans la PR. SO-GAP-16 partiellement traité ; garde historique/Masters préservée, décès/succession et intégration centrale restent ouverts. Aucun autre écart clos par cette tranche.

## I2 — décisions et quotas sur branche

[Matrice ciblée et limites](SO-01-I2-DECISIONS.md) : file, approbation OWNER/MJ, unicité fictive par session, compteurs confirmés globaux/par classe, attente/retrait/correction/refus, transfert de classe et exception motivée. 846 tests locaux et build réussis ; CI exacte dans la PR. SO-GAP-14 partiellement couvert, passage M2 encore absent ; I2b/SO-GAP-16 puis C1/C2/I3 restent nécessaires. Les sections I1/C1a ci-dessous décrivent leurs périmètres historiques.


## I1 — admission et proposition sur branche

[Parcours I1 et matrice ciblée](SO-01-I1-ADMISSIONS.md) : liens sécurisés, choix V0.7, espèces narratives du brouillon M2, dossiers privés et réessais sans dotation. 825 tests locaux/build réussis ; CI exacte dans la PR. **SO-GAP-14 partiel** : confirmation des quotas, approbation, identité fictive unique et passage personnage M2 restent I2/I3. Aucun autre écart clos, aucun historique migré.

## C1a — contexte disponible sur branche

[Préparation sans dotation](SO-01-C1A-PREPARATION.md) : création/édition privée, authentification et délégation de session, garde transactionnelle et réessais. **808 tests locaux et build réussis** ; Firestore/HTTP sur CI à relever sur le commit exact. Pré-requis de SO-GAP-14 partiellement livré, aucun autre écart clos. À cette étape historique, ces fonctions restaient absentes ; I1 ajoute depuis les candidatures, les quotas confirmés/publication/dotations/relève restent à développer. Aucun fichier historique migré.

## Complément V3.5

[Matrice différentielle détaillée, dépendances et ordre minimal](SO-00-V35-INSCRIPTIONS.md). [Registre des 55 recettes ciblées](SO-RECETTES-V35.md), plus 10 SEC transversaux. Aucun INS complet validé : deux tests nouveaux couvrent seulement révocation de droit de caisse/paiement concurrents. Les verdicts historiques ci-dessous conservent leur périmètre d’origine ; ils ne valent pas validation des nouveaux parcours centraux.

| Nouvel écart | À créer/adapter | Priorité |
|---|---|---|
| SO-GAP-14 | Admission sécurisée distincte du lien privé, proposition, identité/espèce, classes/initiation canoniques, quotas et approbation MJ, passage M2 | SO-01 I1/I2/I3 |
| SO-GAP-15 | Naissance/reçu, QR à activation, réserve jamais jouée, progression participant, crédits/kit protégés et relève sans republish | SO-01/02 I4/I5 |
| SO-GAP-16 | Capacité/type/responsable de groupe, transfert atomique entre groupes et contre-opération, révocation lors de décès/relève | SO-01/SO-06 I2b/I5 |

SO-GAP-01…13 restent ouverts. Aucune migration ni réinitialisation d’une session.

## Actualisation V3.4 — 23 octobre 2026

La matrice différentielle courante, le graphe des sept ateliers, les migrations proposées et les dix REC-SO-MST figurent dans [SO-00 V3.4](SO-00-V34-PLAN-CENTRAL.md). Les dix MST sont **NON EXÉCUTÉS** ; les tests historiques constituent des preuves partielles seulement. Les tableaux ci-dessous restent le registre métier V0.7 issu des tranches V3.0–V3.2, sans requalification de leurs succès en validation V3.4.

Remappage §10 V3.4 : SO-00 conception centrale ; SO-01 M1/M2 ; SO-02 QR/TOXI/FOR ; SO-03 droïdes ; SO-04 M3 ; SO-05 M4/M5 et autorités ; SO-06 M6/M7, continuité et recette. Les anciens noms de tranches SO-06a et SO-06b sont conservés dans l’historique ; ils ne changent pas le statut des nouveaux lots.

Écarts ajoutés : **SO-GAP-12** brouillon central/pointeur de version/publication globale/rollback non implémentés ; **SO-GAP-13** habilitations de campagne et sept contrats de préparation non implémentés. Aucun changement d’état joué ni de règles canoniques effectué.


23 octobre 2026 — complément à [SO-00](SO-00-REPRISE.md). `Existant` désigne un service observé, pas une conformité V0.7. `Adapté` décrit SO-06a, SO-01a et SO-06b. Les tests cités sont des suites réellement présentes ; leurs résultats globaux figurent dans [SO-VALIDATION](SO-VALIDATION.md). Une couverture historique partielle ne valide jamais automatiquement une recette REC-SO.

## Exigences, code, tests et migrations

| Exigence V3 / arbitrages | Existant à réutiliser | Adapté dans SO-06a / SO-01a | Manquant / adaptation requise | Tests / preuve à obtenir | Migration et lot |
|---|---|---|---|---|---|
| Priorité SPACE OUTLAWS, pas de créateur universel | Socle GN Engine, L1a–m | Consignes, documentation et titres des six vues | Profil versionné V0.7 opérationnel | Audit sources/branche ; recette produit | Pas de conversion automatique ; SO-00/01 |
| Master unique, six vues | `masters`, `master-workspace`, éditeurs/projections L1 | Export cohérent de tous les catalogues exportables, réimport existant | Référentiel complet, dotations et schéma SO | `master-global-export-suite`, UI et suites Masters historiques | Format 1 inchangé maintenant ; extension explicite ultérieure SO-06 |
| Version publiée, définition ≠ instance | Versions scénario, campagnes, archives | Aucun changement | Profil fermé et contrôle de compatibilité de règles | Versions historiques et import répété | Jamais réécrire une instance jouée ; SO-01/06 |
| Huit classes joueurs, deux natures, 34 compétences joueurs ; A08 | `abilities`, Classes/Competences/Attributions | Nature explicite conservée, projection privée, imports/exports | Classes canoniques, exclusivités, initiation hors classe et 5 places secondaires | REC-SO-01, tests profils existants partiels | Ajouter référence de profil sans changer les anciens ; SO-01 |
| XP, progression, niveau utilisateur, succession ; A08–A09 | Compte authentifié, niveau de personnage et réservations PA | — | 3 XP/utilisateur/session, quatre sessions puis 8 PA, coûts, rareté, reconversion, 25 % plafonné 9, nouvelle incarnation | REC-SO-02, double décès et clôture concurrente | Historique utilisateur et incarnation distincts ; SO-01 |
| 200 Cr protégés et huit kits ; A10 | Comptes, journal, lots, dotations idempotentes | Exclusion des dotations à l'export global | Solde protégé dans compte réel, restrictions d'achat/don/revente, provenance des kits, déprotection et disparition au décès | REC-SO-03, paiements/stock en concurrence | Ne pas protéger rétroactivement un solde acquis ; SO-01/05 |
| PV/protection et sécurité ; A01–A07 | `health`, PV, horloge, `person-actions` | — | 3/4 PV, protection unique, fenêtre 2 s, immunités, mort 5 min, stabilisation 60 s, STOP critique | REC-SO-04 ; homologation physique distincte | Ajouter états explicites, ne pas déduire un décès d'un ancien 0 PV ; SO-01 |
| Soins MED/MEC et atelier ; A05–A07 | FIELD_CARE, CLINIC_SAFE/FAST, réservations, complément d'échec | Filtre patient serveur sur soins temporisés/instantanés, contrôle avant réserve et à résolution | Stabilisation intermédiaire, durées fixes, modules/protection indépendants, PNJ financé | REC-SO-05, interruption 59/60 s, pause et ressource unique | Anciennes actions gardent leur devis/profil ; SO-01/03 |
| Compétences à durée ; A11 | Profils terrain et soins | — | Tables canoniques COM/PIL/INF/Entretien/ROG, effets réels et exceptions de consommation | Limites temporelles, rôle, idempotence | Nouveaux types via routeur existant ; SO-01/02 |
| ROG-02 ; A12 | QR public, inventaire, transfert et remise physique du pillage | — | Poste orga, nom/prénom sans suggestion, choix par niveau, quotas victime globaux, coût au transfert, notification +10 min | REC-SO-06/07, deux voleurs et panne réseau | Champs d'éligibilité des biens, tentatives/notifications persistantes ; SO-02 |
| ROG-03 ; A13 | Captivité 20 min, cibles QR | — | Issue scénarisée, garde, interruption, récupération conditionnelle, interdiction à 0 PV | REC-SO-08 et sortie physique sûre | Aucun droit sur une serrure réelle ; SO-02 |
| Modules droïdes ; A14 | Biens individuels, propriétaires, consommables | — | Six références, 2 emplacements, prix/installation, quatre états, contenu et retrait même ID | REC-SO-12, slots et transfert concurrents | Même lot/objet équipé, pas de copie ; SO-03 |
| Sabotage ; A15 | Pannes d'installation, D6, verrou et réparation | — | Cibles droïde/navire, mandat admissible, 15 min max, protection après restauration, neutralisation ≠ dommage durable | REC-SO-09 | Distinguer temporaire/durable, anciens états conservés ; SO-02/03/04 |
| Dissimulation ; A16 | Lots, pillage et fouille | — | Une unité, 30 min, découverte TRA-02 à égalité, expiration sur transaction | REC-SO-10, transaction pendant cache | Métadonnée temporaire du lot ; SO-02 |
| FIL-01 / EFF-01 ; A17–A18 | Audit, événements, connaissances | — | Journal fictif séparé, traces ≤15 min, opposition/égalité, fausse piste unique, aucune géolocalisation | REC-SO-10, secrets et journal technique intact | Ne jamais modifier le journal transactionnel ; SO-02/04 |
| Toxicologie ; A19 | Items consommables et QR d'action | — | Dose unique, recette/labo, consentement QR, malaise 15 min sans PV, immunité droïde, antidote | REC-SO-11 | Dose = lot réel avec cycle suivi ; SO-02 |
| Modèles, achats/ventes, passagers ; A20–A24 | Ships, propriétaires, comptes, navigation | — | Trois modèles fermés, fret 0 accepté, places/embarquement, transactions de navire, 10 modules et compatibilités | REC-SO-13/16, manifeste et double vente | Étendre ship sans remplacer ses ID/stock ; SO-04/05 |
| Combat spatial ; A20–A23 | PA, D6 serveur et transactions | — | Rounds 90 s, ordres verrouillés, simultanéité, défense ciblée, poursuite unique, reddition, fin après 2 rounds non hostiles | REC-SO-13 ; SEC-SO-06 | Nouvelles opérations liées aux ships existants ; SO-04 |
| PIL-03 / ESC-01 | Profils de compétences et réservation PA | — | Seuils, bonus non cumulés, usage voyage/rencontre, remboursement sans effet, escorte N4 sans second décrochage | REC-SO-14 | Usages persistants et liés à une exécution ; SO-04 |
| Révision/réparation conditionnelle ; A22–A29 | Consommables, comptes, états de navire | — | Tir réellement exécuté déclenche 1 %, Coque/Bouclier/module séparés, réparation partielle par point | REC-SO-15 ; tir esquivé vs aucune attaque | Pas de réparation automatique à la clôture ; SO-04 |
| Trajet/carburant/détour ; A24–A29 | `voyages`, débit au départ, pause, devis de route | — | Facteurs taille, ravitaillement 2 min, panne/surcharge, détour/convoi, reprise sans débit/tirage supplémentaire | REC-SO-16 | Voyages existants gardent conditions initiales ; SO-04/06 |
| Événement/embuscade | Événements économiques et routes | — | D6 par trajet/convoi, table V0.7, priorité ciblée, une interception/tronçon, PNJ préparé et financé | REC-SO-17, concurrence | Tirages enregistrés une seule fois ; SO-04 |
| Abordage et fret | `cargo`, réservations, capacité, propriété distincte | — | Arrimage 2 min puis tranches 5 unités/3 min, source unique, interruption sans transfert inachevé | REC-SO-18 | Réutiliser les lots réels et droits ; SO-04 |
| Remorquage/épaves/casse ; A29–A32 | Vaisseaux et inventaire | — | Gabarit/attelage, fuel ×2, publicité S+1, caution, récupération financée, rendement unique 10 %, démantèlement irréversible | REC-SO-19 | Aucun transfert de fret déduit de la propriété du navire ; SO-04 |
| Prix et magasins ; A24, A31–A32 | `market`, `prices`, `sales`, `payments`, stocks | — | 12 prix et marchés canoniques, caisses/stock PNJ, arrondi total de ligne, exceptions négociation/modules/pièces | Paiements, arrondis multi-unités, fonds insuffisants | Ancien devis figé ; pas de conversion des transactions ; SO-05 |
| Douanes/identités ; A33–A34 | Tarifs de fret et bénéficiaire réel | — | Mandat N1–5, une inspection/escale, licences, retenue 15 min, faux/transpondeur distincts ID permanent | REC-SO-20 | Conserver identité durable et journal MJ ; SO-05 |
| Contrat/escorte/litige ; A35–A36 | Contrats financés et réservations | — | Réserves réelles obligatoires, 10/20 min, 100/50/0 %, avenants, carburant distinct, recours S+1 | REC-SO-21, budgets et preuves | Pas de `GM_EXTERNAL` SO ; garder contrats historiques ; SO-05 |
| Assurance ; A37 | Accounts/Ledger et lots identifiés | — | 2/4/6 %, couverture unique, réserve maximale, 80 % cap 5000, récupération/restitution proportionnelle | REC-SO-22, doublons/sous-financement | Référence lot/voyage/police ; ne pas effacer le butin pirate ; SO-05 |
| Clôture/reprise ; A38 | `campaigns`, source scellée, copies/version | — | Conserver voyages/contrats/réserves, expirer effets provisoires, interdire guérison automatique, résoudre urgences | REC-SO-23 | Migration de copie des opérations ouvertes, test interruption/reprise obligatoire ; SO-06 |
| Imports répétés et sessions historiques | Master v1, opérations/digests, snapshots | Catalogue global et réimport idempotent | Import du profil canonique complet et migration publiée explicite | REC-SO-24 encore non testé ; suites Masters conservées | Les quatre XLSX restent identiques ; SO-01/06 |
| Permissions, QR, secrets et médias | `workflow`, projections, `staff`, médias privés | Export global propriétaire seulement | Vérifier chaque nouveau service SO, aucun secret envoyé pour masquage client | SEC-SO-01/05, suites existantes partielles | Aucun nouveau privilège Firebase ; transversal |
| Concurrence, réessais, réseau | Transactions Firestore, requestId/digest, réservations | Révision commune et refus de réimport obsolète | Vols, combat, assurance et clôture concurrente ; reprise d'état incertain | SEC-SO-02/04, émulateurs et recette réseau | Pas de fonctionnement transactionnel hors ligne annoncé |
| Mobile, ~60 participants, sécurité terrain | UI responsive et scanner/code de secours | Navigation six vues maintenue | Mesures Android/iOS, multicomptes, réseau, homologation et évacuation | SEC-SO-08/09, recette humaine non exécutée | Projet de recette isolé à identifier |
| Livraison et sauvegarde | PR, `check.yml`, archives scénario | Rapport/procédure, tests nouveaux reliés aux émulateurs | Sauvegarde complète et restauration isolée prouvées avant migration | SEC-SO-10 ; journaux CI | Aucune production autorisée |

## Registre des recettes

Les critères ci-dessous sont repris littéralement du V3. Toutes les recettes métier complètes sont **NON TESTÉES** à ce stade. Un test d'une primitive historique ou de SO-06a ne remplace pas la recette du parcours V0.7. Pour chaque exécution future, consigner commit, environnement, date, rôle/compte fictif, appareil, étapes, attendu, constat, preuve, anomalie et nouveau verdict. Les scénarios physiques exigent en plus l'observation terrain.

## 24 parcours métier

| ID | Situation | Attendu V3 | État observé |
|---|---|---|---|
| REC-SO-01 | Créer 8 classes, 8 initiations et 2 natures humanoïde/droïde | Trois compétences initiales N2 ou fixes, initiation N1 admissible occupant une place secondaire, cinq places max, Vétéran réservé au Combattant | NON TESTÉ |
| REC-SO-02 | Jouer quatre sessions, mourir deux fois dans une session | Passage utilisateur à 8 PA après quatre sessions, 3 XP max/session, XP successeur plancher(25 % carrière) plafonné à 9, réserve PA complète à chaque nouvelle incarnation | NON TESTÉ |
| REC-SO-03 | Dépenser et tenter de transférer les 200 Cr protégés | Services PNJ autorisés oui ; don, module, achat-revente, transmission à successeur non ; déprotection au début de l’épisode suivant | NON TESTÉ |
| REC-SO-04 | Frapper, absorber protection et déclencher secours à 0 PV | 3 ou 4 PV, une seule protection, fenêtre de 2 s, compte de survie réel 5 min, stabilisation seulement après 60 s continues ; STOP SÉCURITÉ suspend la conséquence mortelle | NON TESTÉ |
| REC-SO-05 | Soins MED-02/MEC-02 et atelier de droïde | Timing N2/N3/N4/N5, 1 PV puis 10 min récupération ; réparation complète du droïde ne restaure ni module endommagé ni protection épuisée | NON TESTÉ |
| REC-SO-06 | ROG-02 au poste organisation : nom faux, cible vide, un objet, plusieurs objets | Faux nom = 10 min de récupération sans PA ni quota cible ; vide = quota et récupération, pas PA ; N3/N4 deux types ; un seul objet transféré | NON TESTÉ |
| REC-SO-07 | ROG-02 avec deux voleurs concurrents et notification | Max 2 tentatives/1 réussite par victime/session ; pas de double transfert ; notification sans auteur à +10 min ; remise physique en attente | NON TESTÉ |
| REC-SO-08 | ROG-03 au QR serrure prison avec gardien | Surveillance directe empêche la sortie ; interruption zéro temps restant ; repéré = 10 min récupération sans PA ; sortie physique sûre ; max 20 min de captivité | NON TESTÉ |
| REC-SO-09 | Sabotage sur installation, module droïde et vaisseau à quai | Niveaux d’accès respectés, 1 PA et kit au test, neutralisation max 15 min ; pas d’avarie durable créée implicitement | NON TESTÉ |
| REC-SO-10 | Dissimulation vs TRA-02, Pistage vs EFF-01 | Une unité/30 min, égalité favorable à la découverte ; traces de jeu ≤ 15 min, comparaison directe des niveaux, journal technique intact | NON TESTÉ |
| REC-SO-11 | Toxicologie QR et droïde | Dose consignée, activation volontaire par la cible ; Malaise 15 min humanoïde, 0 perte PV et non cumul ; droïde immunisé | NON TESTÉ |
| REC-SO-12 | Installer, neutraliser, endommager, retirer module droïde | 2 emplacements, 6 références et prix ; états indépendants, coûts et ressources distincts, pas de copie au retrait | NON TESTÉ |
| REC-SO-13 | Combat : tirs simultanés, deux défenseurs et deux fuyards | D6 et seuils, hits simultanés même à 0 Coque, bouclier puis Coque, un poursuivant principal, égalité poursuivant, deux rounds sans hostilité terminent | NON TESTÉ |
| REC-SO-14 | PIL-03 N1, N3, N4, N5 ; ESC-01 N4 et N5 | Décrochage ≥ 6, Feinte seuil de défense min 6, non-cumul des bonus de fuite, escorte +1 au résultat même au-delà +3, réservations PA remboursées si aucune exécution | NON TESTÉ |
| REC-SO-15 | Rencontre avec interception sans tirs puis tirs entièrement esquivés | Première : aucune révision ; seconde : révision 1 % obligatoire ; Coque/Bouclier/modules traités indépendamment | NON TESTÉ |
| REC-SO-16 | Départ, panne sèche, ravitaillement, détour de convoi, reprise intersession | 5/10/15 min, carburant 1/2/3 × taille à 25 Cr, un débit départ, surcharge/détour payé par appareil, pas de second tirage | NON TESTÉ |
| REC-SO-17 | Événement routier, escorte et embuscades concurrentes | Un tirage par convoi/trajet, deuxième D6 si incident, ciblée prioritaire, une seule interception par tronçon, pas de double menace PNJ | NON TESTÉ |
| REC-SO-18 | Arrimer et transférer 12 unités puis interrompre la dernière tranche | Après 2+3+3 min (dont arrimage), 10 unités transférées, les 2 dernières restent ; aucune prise sans soute receveuse compatible | NON TESTÉ |
| REC-SO-19 | Revendiquer, remorquer et mettre une épave à la casse | Gabarit/attelage, carburant ×2, publicité S+1, caution 5 %, droit sur bâtiment ≠ droit sur fret ; 10 % de lots de pièces, sans doublon | NON TESTÉ |
| REC-SO-20 | Contrôle douanier N1–N5 et falsification INF-03 | 1D6 + contrôle ≥ 7, une inspection par escale, retenue max 15 min ; faux N3/N4/N5 passent sur 4+/3+/2+, pas de saisie automatique | NON TESTÉ |
| REC-SO-21 | Contrat/escorte, litige et annulation | Réserves réelles, 10 min contestation, 20 min médiation, salaire 100/50/0 %, avenants +25 %, provisions carburant distinctes, recours S+1 | NON TESTÉ |
| REC-SO-22 | Assurer mêmes lots deux fois, perdre puis retrouver du fret | Double souscription refusée, prime 2/4/6 %, indemnité 80 % plafonnée à 5 000 Cr, réserve assurantielle financée, récupération déclenche restitution proportionnelle | NON TESTÉ |
| REC-SO-23 | Fermer session avec 0 PV stabilisé, modules défectueux et voyages | PV/Coque/fonds/fret/trajets conservés, effets provisoires expirés, PA au maximum, aucun soin/fuel/reroll automatique ; clôture des délais critiques vérifiée | NON TESTÉ |
| REC-SO-24 | Importer même profil SPACE OUTLAWS V0.7 plusieurs fois | Aucune dotation/compétence/stock/argent supplémentaire ; anciennes sessions intactes ; changement du référentiel uniquement sur version publiée | NON TESTÉ |

## 10 essais transversaux

| ID | Situation | Attendu V3 | État observé |
|---|---|---|---|
| SEC-SO-01 | Badge QR public, QR privé et faux rôle MJ | Aucun accès privé ou changement de privilège par simple scan | NON TESTÉ |
| SEC-SO-02 | Double clic, deux joueurs concurrents et réseau coupé pendant débit | Aucun paiement, butin, PA, stock ou lot dupliqué | NON TESTÉ |
| SEC-SO-03 | Import réitéré, changement de session et session fermée | Données des épisodes anciens intactes, aucun nouveau kit | NON TESTÉ |
| SEC-SO-04 | Deux Rogues visent simultanément la même victime | Quota global, transfert unique, aucune information secrète révélée | NON TESTÉ |
| SEC-SO-05 | Joueurs avec groupes, caisse commune et propriétés de vaisseaux | Être membre ne donne pas pouvoir de dépense ou de transfert | NON TESTÉ |
| SEC-SO-06 | Attaque après deux rounds passifs, après reddition et en poursuite | Fin/repli/consommation corrects, non-révision sans tirs | NON TESTÉ |
| SEC-SO-07 | Caisse PNJ et assureur insuffisamment financés | Refus explicite, pas de soldes négatifs ni monnaie créée | NON TESTÉ |
| SEC-SO-08 | Arrêt sécurité pendant minuteur médical/captivité | Pas de décès indu ; limites réelles et sorties sûres respectées | NON TESTÉ |
| SEC-SO-09 | Plusieurs téléphones Android/iOS et ~60 utilisateurs en test | Droits, QR, ergonomie, temps de réponse mesurés et consignés | NON TESTÉ |
| SEC-SO-10 | Déclenchement de workflows GitHub | Exécution des tests sans job de déploiement ni changement Firebase production | CI de référence exécutée ; nouveau commit à contrôler, résultats dans PR #1 |

## Extension V3.1/V0.7 et sous-lot SO-01a

Références intégrales, différences documentaires et limites dans [SO-01a](SO-01A-NATURES-SOINS.md). Les sources V3.0/V0.6 restent archivées. La classe PNJ Force est distincte des huit classes joueurs ; aucun attribut de nature ne lui accorde de droit.

| Exigence | Existant réutilisable / adaptation | Manquant | Tests / migration |
|---|---|---|---|
| PNJ Force caché, orientation Jedi/Sith, LAS indépendante | Permissions OWNER/MJ, profils et projections | Statut réservé, attribution MJ, confidentialité et exclusion XP/initiation/import joueur | REC-SO-FOR-01, aucun ajout automatique à un ancien Master |
| FOR-01 N1–N5 | Actions, réservations PA, horloges, D6 et audit | Pouvoirs, limites, résistance, activation unique, récupération commune, médiation de scène et STOP | REC-SO-FOR-02 à 06 ; nouveau profil publié requis |
| Breach Port | Libellé narratif du référentiel actuel | Contenu de chaque Master à préparer | Aucun renommage d’ID, QR ou archive historique |
| Natures / soins | SO-01a : dix tests métier mémoire/Firestore + trois UI, données réelles existantes | Profil fermé imposant toutes les règles MED/MEC | Couverture partielle REC-SO-01/05/23/24 ; aucune migration de session |

| Recette supplémentaire | Fonction à valider | État de recette complète |
|---|---|---|
| REC-SO-FOR-01 | Refus joueur, classe PNJ secrète, orientations et LAS indépendante | NON TESTÉ ; non implémenté |
| REC-SO-FOR-02 | Influence, droïde immunisé, suggestions interdites, égalité | NON TESTÉ ; non implémenté |
| REC-SO-FOR-03 | Soin 60/90 s, survie, interruptions et quota cible/session | NON TESTÉ ; non implémenté |
| REC-SO-FOR-04 | Projection, Protection Jedi, Étouffement Sith et sécurité | NON TESTÉ ; non implémenté |
| REC-SO-FOR-05 | Double cible, jets séparés, un PA, récupération et confrontation | NON TESTÉ ; non implémenté |
| REC-SO-FOR-06 | Usurpation, réessai, réseau, arbitre, STOP et secrets | NON TESTÉ ; non implémenté |

Les statuts NON TESTÉ des 24 REC-SO complets restent inchangés. Les succès unitaires, transactionnels et de rendu ne valent pas recette terrain.

## Extension V3.2 — Recettes & Potions

[Audit, mapping du tableur et résultats SO-06b](SO-06B-RECETTES-BROUILLONS.md). La préparation de brouillons constitue une tranche achevée d’édition ; elle n’autorise pas la publication du module complet.

| Exigence | Existant | Adapté SO-06b | Manquant | Test / migration |
|---|---|---|---|---|
| Référentiel unique, six vues | Master, items/inventory, versions | Feuille Recettes de Boutiques, 20 composants max, références communes | Métadonnées structurées d’autorisation/rareté et profil fermé | Import identique, objets historiques et sessions inchangés ; collection optionnelle `recipes` |
| Import/export autonome et édition sans code | Éditeurs L1, XLSX strict, diff/version | CRUD brouillon, sous-Master recettes + objets référencés, exemple source adapté | Publication versionnée jouable et compatibilité des doses | Onze cas métier partagés Memory/Firestore + quatre UI ; aucun lot créé |
| Laboratoires et déblocages | fieldTargets, QR, knowledge, droits et missions | Références préparatoires vérifiées seulement | Labo actif, habilitations personnage/groupe/faction, droits issus de découverte | REC-02, refus non propriétaire ; aucune attribution implicite |
| TOXI-01 : 1 PA, 300 s, 600 s, une dose | Actions, horloge, réservations PA et fournitures | Aucun moteur parallèle | Réservation multi-lots, achèvement/annulation, dose et provenance | REC-03 ; tests de fabrication non exécutés |
| Effets, activation volontaire et antidote compatible | Natures SO-01a, soins et QR | Publication entièrement bloquée au serveur | Registre implémenté, Malaise, états compatibles, dose placée/consommée/retirée | REC-04/05 ; pas d’effet à partir d’un texte libre |
| Propositions de prix/formule | Cours/commerce réels | Prix indicatif privé, exemples DRAFT, aucune formule Excel exécutée | Vente des vraies doses avec même état et règles | Pas de cours, stock ni compte créés par cette tranche |
| Versions/campagne/archives | Copies et reçus existants | Définitions conservées, import absent rétrocompatible | Snapshots de doses jouées, A38 toujours ouvert | Archives nouvelles et anciennes, copie d’épisode ; retour ancien code à encadrer |

| Cas V3.2 | Attendu | Preuve actuelle / état |
|---|---|---|
| REC-SO-REC-01 | Ajouter recette et ingrédient, importer deux fois, diff correct, pas de stock/crédit, autres rubriques et anciennes sessions intactes | **Scénario automatisé exécuté localement** dans `master-recipes-suite`, aussi raccordé à Firestore ; résultat CI exact dans la PR après exécution. Recette humaine non exécutée |
| REC-SO-REC-02 | Recette secrète apprise en mission, formule réservée au joueur qualifié et habilité, pas de fuite navigateur | **NON EXÉCUTÉ**, parcours mission/déblocage non implémenté ; seuls refus d’accès aux brouillons testés |
| REC-SO-REC-03 | Fabrication multi-ingrédients, clic simultané, interruption/réseau, un PA/une consommation/une dose à l’achèvement | **NON EXÉCUTÉ**, fabrication non implémentée ; tests de double clic/interruption portent uniquement sur l’import |
| REC-SO-REC-04 | Activation volontaire humanoïde, 15 min sans perte PV, non-cumul, immunité droïde, scan tiers sans effet | **NON EXÉCUTÉ**, effets/dose non implémentés |
| REC-SO-REC-05 | Rejeter effet absent, antidote universel, N5 sans droit et ingrédient supprimé | **COUVERTURE PARTIELLE AUTOMATISÉE** : toute publication est refusée, références absentes/archivage bloqués. Pas encore de publication valide servant de témoin ni de droits N5 réels |

Les 24 cas initiaux, six FOR et dix SEC complets gardent leurs statuts ci-dessus. Aucune recette humaine, téléphone réel, sécurité terrain, charge ou restauration de production n’est ajoutée aux preuves automatiques.
