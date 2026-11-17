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
