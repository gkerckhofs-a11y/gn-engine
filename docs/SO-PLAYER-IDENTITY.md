# Espace joueur : compétences, voix RP/HRP et identité publique

Demande du 12 novembre 2026. Base : `13e821324526bd0c371447894edd36e7afa2886d`, branche `work/player-identity-rp`. PR #2 vérifiée fusionnée ; FETCH_HEAD identique à la base. Les PV et la protection sont explicitement hors de cette tranche.

## Comportement

- Action : ROG-02, ROG-03 et INF-02 ne sont chargés que si la compétence est acquise. Les alertes reçues restent accessibles. L’aide n’est pas proposée avec une liste vide de compétences. Les contrôles natifs des cibles restent applicables.
- Terminal : vaisseaux et rencontres pour Navigation ou propriétaires ; entretien et attelages pour MEC-02 N2+ ou propriétaires concernés. Un propriétaire suit ses prestations, sans acquérir les compétences du prestataire. Achats, paiements, contrats, renseignements PNJ, fret et accords douaniers conservent leurs accès communs et leurs contrôles serveur.
- Priorité aux compétences publiées effectives, y compris secondaires, plutôt qu’au seul nom de classe. Aucun octroi de compétence et aucun changement des seuils métier.
- Textes d’ambiance en caractères droits, explications de fonctionnement en italique dans l’espace joueur et ses dialogues. Récits, descriptions et secrets restent en caractères droits. Les 24 fiches de compétences affichent une phrase RP, le niveau acquis et les règles V07 en italique. Le texte public des règles vient de `docs/source/SO_Regles_V07.txt`, chapitres des classes ; il ne déclare pas toutes les capacités opérationnelles dans chaque version de session.
- Identité publique : fichier JPEG/PNG/WebP, maximum 5 Mo, orientation normalisée et recadrage central 600 × 800. Aperçu local avant enregistrement. Remplacement et retrait du portrait courant. Les métadonnées sont retirées ; les anciennes références d’historique sont conservées.
- Répertoire : identités publiques des personnages actifs de la session, sans biographie privée, secret, compte, classe ni identité civile. Fermé par défaut. Le MJ choisit les classes admises en régie ; une initiation secondaire n’accorde pas l’accès. Un changement s’applique aux lectures suivantes côté serveur.

## Sécurité et données

`playerPortraitUpload` reprend le stockage, les limites, les quotas et les variantes de la médiathèque. L’accès joueur est vérifié avant décodage, réservation et validation. `setPlayerPortrait` impose la même session, le même compte et le même personnage que l’import, une révision courante et un reçu idempotent. L’attribution emploie l’autorisation MEDIA et l’historique natifs ; elle ne change ni PV, PA, équipement ni compétences. Les portraits sont publics via le badge, comme expliqué avant l’import ; l’énumération du répertoire reste restreinte.

Le réglage est enregistré séparément par session dans `playerDirectorySettings`, sans modifier une version de Master publiée. Firestore et Storage restent fermés aux accès clients directs. Aucune migration, suppression de données, modification de règle Firebase ou de permission cloud.

## Validation

- Compilation : `npm run build` réussie.
- Régressions : `npm test` : 2 861/2 861 réussis (58,3 s).
- Émulateurs : `GN_FIRESTORE_SUITES='["player-identity"]' npm run test:emulator:firestore` : 5/5 réussis. Import, réessai, retrait, refus d’accès, choix MJ, révocation, droits accueil et fonctionnement dans une session SO canonique.
- Interface ciblée : 48/48 tests réussis après adaptation des anciens cas qui supposaient l’affichage universel des fonctions spécialisées. Huit classes, compétences secondaires, absence de droit au répertoire et échappement de contenu vérifiés.
- Navigateur : tentative Chromium bloquée au démarrage par l’environnement (`socket() failed: Operation not permitted`). Aucune validation visuelle mobile ni recette Android/iOS revendiquée.
- Environnement local : Node 24.22.1, Java 21.0.13. La CI du dépôt utilise Node 22 ; son résultat doit être vérifié sur le SHA du candidat.
- Aucune publication Firebase exécutée pour cette tranche. CI distante et recette visuelle restent distinctes des tests locaux.
