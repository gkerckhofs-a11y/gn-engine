# Fret caché et inspections — composant préparatoire

État du 4 novembre 2026. Sources : règles V0.7 chapitres 17/24 et décision explicite utilisateur **B** du 4 novembre 2026, consignée dans [les règles du projet](source/SO_Regles_V07.txt).

MOD-04 est raccordé dans le code proposé pour les nouveaux manifestes hiddenCargoVersion=1 seulement : définition/offre canonique, provision MJ, achat/réception, mandat personnel, montage, fret caché/inspections, vol équipé/panne et retrait vidé. Ce marqueur et ses dépendances sont inclus dans confirmation/digests et transmis à la naissance. Anciens manifestes/sessions sans marqueur non enrichis ; valeur inconnue, dépendance manquante ou définition MOD-04 sans marqueur refusées. Aucun déploiement ou fusion main.

Des tests de composants utilisent encore des modules synthétiques isolés. Neuf nouveaux cas et un HTTP/Auth couvrent les parcours natifs réellement publiés, achetés, reçus, montés et lancés : ils constituent la preuve du raccordement de l’équipement.

## Stock et droits

Le propriétaire personnel du vaisseau peut dissimuler ses lots disponibles déjà dans la soute, à quai à la même escale, sans contrat de transport ni garde d’abordage. Le compartiment doit correspondre à un lot individuel MOD-04 réellement référencé, INSTALLED, quantité 1, propriété/calibration/emplacement/réserves cohérents. Volume caché 5 sur cargo, 10 sur transport ; capacité totale inchangée 20/50. Pas d’argent, PA ou marchandise créés.

L’API traite un lot entier. Pour une partie, utiliser d’abord le fractionnement du transfert natif. hiddenCargo conserve le vaisseau, la dissimulation et la découverte. Retirer/replacer ne supprime pas discovered/discoveredAt. Une réception de transfert retire concealed, une annulation le conserve ; les lots fractionnés conservent découverte, propriété et provenance. La manutention d’abordage ordinaire refuse un lot dissimulé inconnu même avec attestation MJ.

## Agents et contrôles

La régie attribue/révoque une habilitation N0–N5 avec motif et révision (0 = retirée). N1–N5 n’est ni une classe ni une compétence/XP. Le joueur agit personnellement ; un PNJ sans joueur assigné agit sous régie, au port de son poste. Dossier dans shipMaintenance, exclus des réparations ordinaires ; verrous natifs du vaisseau et de l’agent.

| Contrôle | Temps de jeu | PA | Résultat |
| --- | --- | --- | --- |
| ORDINARY | 120 secondes | 0 | Attestation documentaire, aucune nouvelle révélation ; lots déjà découverts visibles |
| DEEP joueur | 120 secondes | 1 réservé puis consommé | D6 serveur + niveau ≥ 7 ; découverte persistante des lots dissimulés |
| DEEP PNJ | 120 secondes | 0 | Même seuil, habilitation et durée |

Le contrôle ordinaire de ce composant ne valide ni contenu du manifeste, ni licence, ni authenticité, ni taxe. La découverte ne donne pas un code de coffre et ne révèle aucun autre secret. Aucun débit, saisie, amende ou changement de propriété automatique.

Une tentative approfondie par vaisseau et escale, agents confondus. Changer d’agent ne relance pas le dé. Une nouvelle autorisation MJ exige un motif (indice nouveau/décision), puis la prochaine tentative la consomme. L’identifiant d’escale est le voyage natif arrivé ; pour l’escale initiale, il est lié au vaisseau. Une annulation avant résolution ne consomme pas la tentative.

Présence et réalisation explicites, délai non automatique, réserve PA et verrous libérés atomiquement. Annulation rend le PA dans le plafond, même après renouvellement ; le MJ peut restituer après révocation, sans finaliser pour un joueur. PAUSE/STOP figent les délais. Droits/habilitation/marqueur sont vérifiés avant les anciens reçus. D6 calculé une fois pour la résolution, stable pendant les reprises transactionnelles ; réessai n’en produit pas un nouveau résultat.

## Neutralisation — décision B

Les biens déjà rangés restent cachés pendant les quinze minutes de panne ; seul le rangement de nouveaux lots est bloqué. Aucun transfert, découverte ou dommage automatique. Contrôle documentaire sans nouvelle révélation ; inspection approfondie habituelle maintenue avec son habilitation, D6, délai, PA et tentative par escale. Une découverte reste durable après expiration ou rangement ultérieur.

Le profil de vol reste canonique, sans capacité totale ajoutée ni soin. Convoi : un événement commun, un seul appareil choisi. PAUSE/STOP figent le délai. Expiration rétablit uniquement le nouveau rangement. L’interface distingue capacité installée, volume déjà caché et disponibilité courante, avec une explication de la panne B.

## Validation et limites

Local : build et 840/840 ciblés dans 66 fichiers ; hidden-flight : 37 suites Firestore et quatorze HTTP, aucun navigateur ou suite complète. CI exacte dans PR #2. Les nouveaux cas natifs couvrent cargo/transport, panne/inspections/échéance/convoi, ancien manifeste et reprise dans le nouvel épisode. La recette visuelle/humaine Android/iOS reste à faire. Aucune publication en production ni migration implicite.

Les sections suivantes décrivent l’historique du composant avant son ouverture versionnée ; les restrictions préparatoires y mentionnées sont remplacées pour les nouveaux manifestes compatibles.

## Retrait après vidage — 4 novembre 2026

Le devis MOD-04 n’est utilisable que pour REMOVE avec le marqueur de composant courant ; INSTALL reste refusé. Dossier et binding portent hiddenCargoVersion=1, jamais ajouté aux manifestes. Contrôle de chaque lot encore concealed dans le HOLD correspondant, même connu ou appartenant à quelqu’un d’autre. Les propositions, accords, démarrages et ultimes confirmations réutilisent le même validateur.

Vider par un transfert natif vers le sac, ou par la sortie explicite du compartiment vers la soute ordinaire via setCargoConcealment(false), sous droits et présence existants. Aucun stock créé ou détruit, découverte conservée. Une cargaison ordinaire peut rester dans la soute ; elle ne remplit plus le compartiment. Aucun champ « contenu consigné », aucune nouvelle procédure de consignation. Les opérations de cargaison ouvertes bloquent le retrait.

Nouveau consentement personnel propriétaire/Mécano, port et atelier, MEC-03 N2. Cinq minutes de jeu et 1 PA, module/PA réservés, verrous natifs. PAUSE/STOP figent le temps, aucune fin automatique. Le Mécano confirme l’opération réellement effectuée ; le propriétaire ou la régie ne le remplace pas. Même exemplaire rendu au propriétaire, profil restant recalculé sans rendre de points, fret/autres modules/découvertes conservés. Annulation garde le module monté et rend le PA dans son plafond ; régie possible après révocation. Réserves étrangères et panne active refusées. Modification du contenu pendant le travail ferme la finalisation, même sans révision du vaisseau modifiée.

Douze cas partagés supplémentaires, un UI et un sélecteur ; HTTP/Auth étendu au refus compartiment plein puis vidage et retrait complet/reçu unique. Le module/lot monté est synthétique en tests. Le vol nu après retrait et la conservation d’un autre module passent par les consommateurs natifs. Local : build et 813/813 ciblés, aucune régression intégrale ou recette humaine.

## Interface du composant fermé — 4 novembre 2026

Propriétaire : depuis sa soute, gestion privée du compartiment, volume inclus dans la capacité totale, lots entiers, dissimulation et découverte persistante affichées séparément. Aperçu puis confirmation du déplacement réel. Liens vers manutention native et accords de retrait ; aucun réglage de quantité cachée arbitraire.

Agent habilité : lien Poste de douane depuis Soutes et fret, vaisseaux locaux disponibles, choix documentaire/approfondi, aperçu avec coût/durée/niveau, présence puis démarrage. Dossier avec délai manuel, confirmation du contrôle réellement effectué et interruption motivée. Le résultat documentaire ne valide aucune licence/authenticité/taxe ; un échec approfondi ne prouve jamais l’absence de fraude. Aucun nouveau stock lisible hors résultats autorisés.

Régie : lien depuis régie du fret, niveau N0–N5/poste/motif/révision, contrôle PNJ, liste des dossiers et nouvelle tentative motivée pour l’escale courante. Contrôle d’un joueur consultable et annulable après révocation, jamais finalisé à sa place. Interfaces respectant pause/STOP et neutralisation, coût/dé/résultat non éditables par agent. Les validations serveur et reçus existants restent autoritaires.

Routes joueur dans le Terminal, routes régie distinctes. Protocole de formulaire borné et réponses obsolètes ignorées après navigation. Liens absents sans le marqueur de composant, toujours non émis par la publication/naissance. Aucune ouverture en partie, montage/commerce/vol/publication MOD-04 fermés ; panne/profil/vol et ouverture cohérente encore à traiter.

Local : build et 829/829 ciblés dans 66 fichiers. Huit nouveaux UI, un lien cargo, trois cas partagés serveur, un sélecteur ; HTTP existant renforcé. 37 suites Firestore et treize HTTP en CI ciblée ; aucun navigateur ou suite complète. Chromium local absent : validation visuelle et recette humaine mobile non réalisées.

## Vérification navigateur ciblée et ergonomie — 4 novembre 2026

Les composants, styles et shell du projet sont rendus avec le contrôleur de production et le workflow natif MemoryStore. Quatre parcours × deux viewports (1280×900 et 360×800 tactile émulé), soit huit : propriétaire/rangement, agent/délai/attestations/résultat, régie/annulation après révocation, panne B. Vérification de l’absence de débordement horizontal et des zones d’attestation visibles ≥44 px, avec captures. Bouton d’interruption secondaire et section séparée de la confirmation finale.

Configuration bornée : test/browser/hidden-cargo.config.mjs, commande node node_modules/playwright/cli.js test --config=test/browser/hidden-cargo.config.mjs. GN_BROWSER_EXECUTABLE est facultatif pour un Chromium existant ; Playwright utilise sinon son navigateur installé. Rapports et captures reproductibles dans dist/hidden-cargo-browser. Métadonnées commit/arbre/dirty/navigateur/viewport ; humanAcceptance=NOT_EXECUTED et firebaseAuth=NOT_EXECUTED.

Local : build, 843/843 tests ciblés et 8/8 DOM sur Chromium 156.0.8078.4. Aucun réseau autorisé, données et identités fictives. Ce n’est pas une recette du parcours complet app.js/connexion ni un essai humain sur téléphone réel. La CI ciblée conserve séparément ses 37 suites Firestore et quatorze HTTP/Auth ; navigateur global non lancé. Aucune modification des règles B, marqueurs ou données, aucune publication/fusion main.

## Réinspection : conserver la première découverte — 10 novembre 2026

Lorsqu'une nouvelle inspection approfondie a été **expressément autorisée par le MJ** pour la même escale, un résultat positif distingue les lots dissimulés **nouvellement découverts** des lots dissimulés **déjà connus**. Les seconds restent consultables comme tels, mais leur date initiale `hiddenCargo.discoveredAt`, leur révision de lot et leur historique de première découverte ne sont pas réécrits. Les objets jamais révélés restent cachés si le nouveau D6 échoue ; un succès n'autorise toujours ni saisie ni paiement automatiques.

Correction ciblée de la résolution existante `finishCustomsInspection` et de son écran de résultat, sans changer le seuil `1D6 + niveau ≥ 7`, la consommation des PA, les permissions, la durée ou la tentative par escale. Régression : premier succès, seconde tentative autorisée, aucune fausse nouvelle découverte, même horodatage et un seul événement de découverte par lot ; contrôle d'échappement HTML. CI du SHA exact à vérifier avant toute fusion ; recette mobile terrain toujours nécessaire.

### Vérification CI de cette correction

Le profil ciblé `hidden-ui` a été rejeté par le planificateur de CI : le cumul non encore validé par une référence globale fiable comprend notamment `src/core/campaigns.mjs`, hors périmètre de ce profil. Il ne s'agit pas d'un échec des assertions de la correction. Un contrôle intégral est donc demandé sur le candidat suivant (`[ci full]`) plutôt que d'élargir artificiellement la liste blanche d'un profil ciblé. Sa réussite devra être vérifiée sur le SHA exact ; aucun résultat n'est présumé à ce stade.
