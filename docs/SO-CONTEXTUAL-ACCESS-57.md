# Mission #57 — accès contextuels

Date : 17 novembre 2026. Base inspectée : `0590a1e518b86e1d00e9032b809763a73dc611de`.
Sources : issue #57 ; addendum de la PR #56 sur `docs/acces-contextuels-comptoir-2026-11-17`, commit `327098b591965621705e34f7ebd6f3d8fddbcd37` ; consignes AGENTS et SO-AGENT-OPERATIONS ; canon V0.7, CDC V3.5/V3.6, économie galactique et documentations natives de stockage/commerce/INF-01.

## AC-01 — première tranche jouable

- Régie **Lieux & Terminaux** : création/modification, durée explicite de 30 à 3600 secondes de jeu (borne technique, aucune durée par défaut canonisée), fermeture et révocation de présence.
- Joueur : lien dans le terminal personnel, scan caméra natif ou saisie, attestation de présence, renouvellement explicite et ouverture du comptoir natif.
- Contrôle transactionnel pour `shop`, `prepareShopPurchase` et `buyShopOffer`, par comptoir et opération. Le scan n'accorde aucun mandat métier. Identité, version d'accès, révision du terminal, état du jeu, expiration et politique sont contrôlés avant les reçus natifs.
- Configuration serveur dans `localAccess/{sessionId}` : terminaux, bindings, présence par personnage, journal privé borné à 100 entrées à l'écran. Aucun secret dans le QR `#/local/{sessionId}/{terminalId}`. Collections interdites aux SDK clients par les règles Firestore existantes.
- Extension de session explicitement configurée ; aucun Master publié modifié, aucune migration ni activation rétroactive. Sans binding, les ressources et offres historiques suivent exactement leurs services antérieurs. Ces configurations ne sont pas encore transportées à l'épisode suivant ; nouvelle préparation MJ nécessaire.
- Convention technique : un contexte actif par personnage, temps de jeu suspendu par l'horloge native. Reconfiguration du terminal invalide les présences existantes. Les fouilles restent dans leur parcours universel distinct.

Validation locale : build ; 40 tests ciblés contexte/circuits/espaces/terminal et 2 tests UI ; 4 cas partagés sur Firestore ; un parcours HTTP/Auth du véritable adaptateur serveur, incluant refus anonyme/joueur-régie/sans scan et révocation avant réessai. Node 24.22.1, Java 21 ; Node 22 requis et utilisé par la CI. Aucun essai humain, QR imprimé ou smartphone réel.

## Suite de la mission

AC-02 : licences/codes/clés, simulateur et exports complets à développer. AC-03 : modes de remise explicites, sans changement des offres historiques. AC-04 : cellules portuaires avec réemploi logistique. AC-05 : garder les mécanismes de vol non arbitrés fermés ; changement de titre et règle de résolution ne sont pas déduits d'INF-01 ou de ROG-02. AC-06 : couverture intégrée et écarts factuels, sans certification terrain implicite.

Aucune fusion, migration, suppression ou publication Firebase autorisée par ce rapport.

## Correction révélée par la première CI

CI `44073317027`, candidat `bdf646d660cc8cafe7158f35fad8f5b774b88781` : application réussie ; 115/115 HTTP/Auth réussis ; 25/26 parcours navigateur réussis. Le parcours Sabacc après rotation du QR reste sur « QR remplacé ». Le relevé navigateur et le code montrent un retour fondé sur le dernier accueil en cache et une actualisation perdue si un polling est déjà actif. Correction limitée : relire l'accueil avant de retrouver sa place et mettre en attente une actualisation demandée pendant un polling. Aucun droit ou résultat de jeu changé. Build et 22 tests ciblés Sabacc/contexte/UI réussis localement ; recette navigateur locale bloquée (socket Chromium refusé, téléchargement du shell invalide). La CI du correctif doit prouver le parcours navigateur ; l'échec initial n'est pas présenté comme un succès.

## Sélection CI ciblée explicite pour les tranches

Le plan historique ne cherchait un succès global que sur la même branche ; une branche dédiée neuve ne pouvait donc jamais utiliser un profil ciblé. Pour un commit explicitement `[ci targeted:contextual-access]`, le plan peut désormais chercher aussi sur la base de cette PR du même dépôt. Il exige toujours un run global terminé avec succès, une identité de dépôt exacte, un SHA valide et un ancêtre prouvé du checkout. Le diff comprend tous les changements depuis ce succès, y compris la base de PR ; aucun échec/annulation/succès partiel n'est utilisé. Sans preuve, le ciblage est refusé ; les PR prêtes, `[ci full]`, push main, lancement manuel et les profils ordinaires gardent le complet. Aucune modification de workflow ni diminution de ces gardes.

Profil contextuel : tests des services natifs commerce/inventaire/comptes, contexte et interfaces ; douze suites Firestore incluant les règles et Sabacc ; HTTP/Auth contextuel et régressions commerciales ; **recette navigateur existante obligatoire**, afin de vérifier le correctif Sabacc. Les fichiers serveur/adaptateur/règles/package et le fret restent hors profil. 58 tests de sélection CI réussis localement ; première exécution du profil applicatif : 264 tests réussis (avant ajout du dernier test de périmètre). Les validations ciblées ne certifient pas une régression globale ; le jalon AC-06 conserve sa CI complète.
