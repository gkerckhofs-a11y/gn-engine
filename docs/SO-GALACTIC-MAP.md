# Carte galactique — tranche 3, 14 novembre 2026

Auteur : Codex. Sources : [cahier unifié fourni par Guillaume](source/SO_Galactic_Economy_V1.md), [règles V0.7, chapitre 18 et compétences PIL-01/PIL-02](source/SO_Regles_V07.txt). Le livre des règles reste inchangé.

## Base et autorisation

Base exacte : PR [#39](https://github.com/gkerckhofs-a11y/gn-engine/pull/39), `272cbdee90324dfb5dd49528735417655e4a479f`, arbre `09fc48d91cb229ac7c970863a2adc8b69d291190`. Sa [CI 43603073486](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43603073486) est réussie, six shards Firestore inclus. `main` reste `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`. PR #2/#15 fusionnées ; #35–#39 ouvertes et cumulées ; #3 reste l’audit Firebase distinct. Cette tranche part sur `work/galactic-map`, avec #39 comme base de PR. La validation de la nouvelle PR doit porter sur son propre SHA.

Guillaume a explicitement autorisé la publication Firebase **une fois tout finalisé**. Cette autorisation conditionnelle remplace l’interdiction antérieure après réalisation de cette condition. Elle n’est pas encore remplie : contrats libres, logistique commerciale intégrée et recette finale restent ouverts. Aucun déploiement, migration, fusion ou réactivation du pipeline de production dans cette tranche. Les anciens rapports conservent leurs constats historiques.

## Parcours livré

- Entrée « Carte galactique » dans le Terminal, les outils organisateur et la navigation du vaisseau.
- Routes `#/galactic-map/SESSION` et `#/galactic-map-admin/SESSION`, paramètres facultatifs `ship` et `destination`. Les anciennes routes restent disponibles. Aucun code de navigation ni accès privé dans ces liens.
- Carte SVG sombre, étoiles, destinations sélectionnables et flèches orientées ; placement schématique explicitement annoncé, sans invention de coordonnées ni de distances géographiques. Alternative textuelle avec les mêmes liens, conditions et tableaux, clavier et mode mouvement réduit.
- Comparaison des chemins connus selon la durée puis le carburant, ou le carburant puis la durée ; rejet des tronçons excédant le réservoir, cumul des durées natives, escales intermédiaires et minimum de carburant supplémentaire à prévoir. Aucune disponibilité de ravitaillement garantie. Aucun retour obligatoire à Breach Port.
- Passage au formulaire natif de vol avec le code explicitement saisi déjà connu ; aucune soumission automatique. Un itinéraire connu par une analyse sans code conservé demande encore le code dans ce formulaire.

## Matrice de réutilisation et droits

| Sujet | Contrôleur ou donnée réutilisé | Contrôle et résultat |
|---|---|---|
| Inscription | `inventoryPlayer` | Authentification, accès actif et personnage de la session à chaque lecture |
| Régie | `checkSession`, droit de contenu existant | Joueur ordinaire refusé ; la régie consulte les définitions sans recevoir les codes, secrets ni manifestes |
| Vaisseaux | `shipCrewAccess`, `nativeShipReader`, `flightShip` | Propriété, mandat natif, appartenance, expiration, retrait et continuation ; identifiant d’un vaisseau extérieur refusé |
| Ports publics | Ports de la version et marchés publiés | Tout personnage inscrit peut consulter son port et les ports commerciaux configurés ; aucun graphe secret communiqué |
| Codes | Codes effectivement saisis et PIL-01 | Vingt codes maximum, vérification serveur à chaque lecture, ambiguïté traitée comme le résolveur natif ; un code de destination n’expose pas les origines entrantes inconnues |
| Analyses | Actions PIL-01 terminées du personnage | Version et révision de la route contrôlées ; dangers affichés uniquement après analyse obtenue au niveau 3 et avec le niveau actuel suffisant ; aucun dossier M6 brut retourné |
| Consommation | `soRoute`, `towingRoute`, `routeFuelRequired` | Distance, gabarit, remorquage et minimum de départ collectif natifs ; aucun nouveau barème |
| Départ | Formulaire `prepareVoyage` existant | PIL-02, pilote désigné, autorisations, PA, carburant, manifeste, fret et cockpit vérifiés par les commandes natives |
| Conservation | Lecture transactionnelle sans écriture | Aucun PA, crédit, carburant, stock, version, personnage, voyage ou historique créé ou modifié par la carte |

Les codes saisis restent dans `sessionStorage`, séparés par UID Google, session et personnage. Ils ne sont pas transférés à un autre profil de démonstration. Ce stockage local ne confère aucun droit ; le serveur recontrôle identité, niveau et accès. Aucun nouveau document, compte, stock, moteur métier, capacité d’écriture ou règle Firestore.

## Consommation et minimum de départ

Le contrôle natif du vaisseau collectif exige une unité supplémentaire disponible avant le départ. Le départ effectivement exécuté consomme le coût de route natif, hors événements, sans débiter automatiquement cette unité supplémentaire. La carte distingue donc `fuelCost` (consommation) et `minimumDepartureFuel` (minimum exigé au départ) et les affiche séparément lorsque ces valeurs diffèrent. La simulation des ravitaillements conserve ce minimum au lieu de le consommer à chaque tronçon. Le moteur, son aperçu `prepareVoyage`, les confirmations et les coûts réels sont inchangés. Les tests comparent la carte à l’aperçu puis au carburant réellement débité par un départ collectif complet.

## Fichiers

- `src/core/galactic-map.mjs` : lecture filtrée, réseau connu et estimation native.
- `src/core/galactic-map-planning.mjs` : comparaison en lecture seule des chemins disponibles, sans mouvement ni réserve.
- `src/core/workflow.mjs` : raccord de deux lectures ; `space-outlaws-voyages.mjs` : export du minimum natif de carburant au départ.
- `web/galactic-map.mjs`, `web/app.mjs`, `web/style.css` : rendu, interactions, codes locaux et préremplissage sans départ ; composants Terminal, espaces joueur, régie et vaisseau : liens.
- `scripts/recette/galactic.mjs`, `scenario.mjs` : uniquement le scénario synthétique des émulateurs, Courtier et Pilote distincts, cargo sans carburant gratuit, catalogue publié par commandes natives.
- Tests dédiés serveur/rendu, registre Firestore, API HTTP/Auth, Terminal, kit et recette Chromium ; documentation de suivi.

## Vérifications et limites

Les commandes et résultats finaux locaux sont consignés dans la PR avec le SHA candidat. Sélection : carte et rendu, vols, analyses PIL-01, vaisseau, pilote collectif et remorquage ; compléments Terminal, organisateur, marchés et kit de recette. Compilation, syntaxe et `git diff --check` exigés. Huit cas carte Firestore et un cas HTTP/Auth sont exécutés sur `demo-gn-engine`. Le kit synthétique passe aussi en mémoire via ses commandes natives.

La recette Chromium ajoute ports publics sans outil de navigation, code explicite du Pilote, sélection clavier sur SVG, estimation, préremplissage du vol, conservation dans l’onglet, absence de consommation, régie et captures 390/1440 pixels. Son résultat CI et ses captures doivent encore être constatés sur le nouveau SHA ; aucun résultat Android/iOS ou terrain n’est affirmé.

Pas de diffusion automatique de codes entre joueurs, pas de découverte de route gratuite, pas de stock de carburant présumé aux escales, pas de bénéfice garanti. Les accords de transport payés entre Courtiers et navigateurs et leurs lots sous contrat sont la tranche suivante ; ils ne sont pas simulés par la carte. Les véritables préparatifs, incidents, rencontres, taxes et variations d’état peuvent modifier un trajet avant son exécution.
