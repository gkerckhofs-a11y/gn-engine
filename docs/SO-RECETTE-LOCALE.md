# SPACE OUTLAWS — préparation locale de la recette

27 octobre 2026. Ce kit prépare des essais dans le navigateur du poste qui lance les émulateurs. Il ne publie aucun site et ne constitue pas une recette terrain validée.

Références : [consignes de recette](../AGENTS.md#recette-finale-avant-publication), [V3.5 §7.2 et §8](source/SO_CDC_V35.md), [règles V0.7, chapitre 25 et A38](source/SO_Regles_V07.txt), [55 recettes ciblées](SO-RECETTES-V35.md), [matrice et dix essais SEC-SO](MATRICE-SPACE-OUTLAWS-V3.md), [état courant](SO-VALIDATION.md). Les sept cas locaux sont des rapprochements partiels avec ces références, pas une réduction du périmètre de validation final.

## Lancer sur un poste de test

Prérequis : Node 22 (version utilisée en CI ; le lanceur accepte les versions supérieures), Java 21 ou supérieur, dépendances du dépôt installées. Le CLI Firebase peut télécharger ses émulateurs au premier lancement. Aucun compte Google réel ou identifiant de service n’est requis pour le scénario fictif.

Depuis la branche candidate :

```sh
npm ci
npm run recette:check
npm run recette
```

Le contrôle préalable ne lance pas les émulateurs. Le lancement compile dans `dist/so-recette/`, puis démarre Auth, Firestore et Storage avec le projet fictif **`demo-gn-engine`** et `firebase.recette.json`. Attendre le message **« Recette locale prête »**, puis ouvrir **http://127.0.0.1:4173/recette.html** sur ce même poste. Cette adresse n’est disponible que pendant ce lancement ; aucun environnement permanent n’est annoncé.

| Service | Adresse locale |
| --- | --- |
| Application et API native | `127.0.0.1:4173` |
| Auth Emulator | `127.0.0.1:9099` |
| Firestore Emulator | `127.0.0.1:8080` |
| Storage Emulator | `127.0.0.1:9199` |

Si un port est occupé, arrêter l’autre processus de test ou choisir un autre poste ; ne pas rediriger un service vers la production. Arrêter avec Ctrl+C. Aucun import/export automatique des émulateurs : leurs données sont temporaires. Exporter le relevé manuel avant de fermer ou actualiser sa page. Une nouvelle préparation crée de nouvelles sessions ; elle ne réinitialise pas les dossiers existants dans un émulateur encore actif.

Java 17 entraîne un refus explicite avant le lancement. Il faut installer ou sélectionner Java 21 sur le poste de recette ; le kit ne l’installe pas. Sur l’environnement de développement du 27 octobre, ce refus a été observé : aucune disponibilité du serveur avec les émulateurs n’y est revendiquée.

## Isolation et identités

- Le lanceur refuse un projet, bucket, propriétaire ou hôte d’émulateur incompatibles, ainsi qu’un fichier de credentials de service dans `GOOGLE_APPLICATION_CREDENTIALS`. Il accepte les valeurs `FIREBASE_CONFIG` fictives produites par le CLI et les normalise avant le serveur.
- Le serveur vérifie les trois hôtes locaux avant d’importer l’API réelle. Il écoute uniquement sur la boucle locale ; les requêtes avec Host/Origin étrangers sont refusées. La CSP de recette limite les connexions et cadres aux services locaux nécessaires.
- La compilation de recette remplace seulement le module d’initialisation Firebase du navigateur. Le build normal conserve sa configuration et ne contient ni le sélecteur fictif ni les assertions de recette. La sortie locale ne va pas dans `public/`.
- Le sélecteur utilise six assertions Google synthétiques comprises par Auth Emulator. L’API vérifie ensuite les jetons et applique ses permissions ordinaires. Aucun faux rôle dans le corps d’une requête, aucun endpoint de connexion spéciale dans l’API publiée.

| Identité fictive | Usage |
| --- | --- |
| `owner@recette.example.invalid` | Propriétaire de la préparation et du Master |
| `mj@recette.example.invalid` | MJ de la première session, sans délégation centrale implicite |
| `accueil@recette.example.invalid` | Accueil, sans accès à la régie des contrats |
| `ari@recette.example.invalid` | Titulaire de la mission |
| `bela@recette.example.invalid` | Autre joueur incarné, sans accès au contrat d’Ari |
| `tiers@recette.example.invalid` | Tiers non inscrit |

Utiliser des profils de navigateur distincts pour les rôles simultanés. Le bouton « Connexion fictive » reste propre à la compilation locale. Ne pas saisir un véritable compte Google dans cet environnement.

## Données préparées par les commandes natives

Le scénario passe par admission consentie, approbation, préparation M2, Master, publication locale, naissance, approvisionnement explicite, achat et retrait physiques, candidature et acceptation du contrat. Il n’écrit pas directement dans Firestore, ne modifie pas l’horloge et n’injecte ni confirmation ni crédit gratuit dans un portefeuille existant.

- Deux personnages Médecins humanoïdes, initiation COM-03 et kits natifs ; contexte et secrets entièrement fictifs.
- Un lieu d’analyse, un comptoir PNJ et dix fournitures approvisionnées explicitement. Prix de fixture : 30 Cr l’unité, sans prétendre fixer un barème général.
- Ari achète et reçoit cinq fournitures avec ses crédits protégés : `200 − 5 × 30 = 50 Cr` protégés restants. Bela conserve ses 200 Cr protégés.
- La caisse reçoit les 150 Cr de l’achat, puis réserve 100 Cr pour le contrat accepté. Les trois objets promis sont réservés sur le stock : `10 − 5 − 3 = 2` fournitures encore en vente.
- Le contrat demande deux étapes et une preuve MJ. Il reste actif, en session **PAUSE**, pour éviter de consommer le délai avant les essais.
- Une seconde préparation sans participant permet de tester l’isolation ; le MJ de la première session n’y reçoit aucun droit.

Les identifiants de session, le SHA, l’arbre Git de HEAD, l’état modifié/propre au build et la date de compilation figurent dans `/recette.json`. Si les sources sont modifiées, le relevé le signale et ne prétend pas certifier le SHA seul. Les jetons de connexion et le lien d’invitation ne sont pas exposés dans ce manifeste ou les journaux du lanceur.

## Parcours et relevé

La page locale décrit les actions et résultats attendus de **LOCAL-01 à LOCAL-07** : séparation des rôles, preuve/délai, remise au comptoir, litige/médiation, STOP/révocation, clôture/reprise, réponse perdue/double clic. Les scénarios de litige et de révocation exigent une session neuve ; ils ne doivent pas être joués après le paiement du même dossier.

Chaque cas commence **NOT_EXECUTED**. L’opérateur peut déclarer PASS, FAIL ou BLOCKED avec rôle, appareil/système, navigateur/version, réseau, constat et référence de preuve ou motif de blocage. L’export exige son nom et une date ISO avec fuseau pour un résultat renseigné. Le fichier JSON inclut le contexte candidat, les étapes et attendus. Il reste une déclaration de l’opérateur ; aucune preuve humaine n’est déduite des tests automatiques. Aucune sauvegarde automatique du formulaire.

Ces sept cas ne couvrent pas intégralement les 55 recettes ni les dix SEC-SO. Ils ne certifient pas non plus l’ergonomie sur Android/iOS, le scan physique, les 60 utilisateurs simultanés, les sauvegardes/restaurations, ni les fonctions SO encore absentes. Les valeurs PASS du relevé ne constituent pas une autorisation de déployer.

## Contrôles navigateur automatisés

Après `npm ci`, sur un poste Node 22/Java 21 équipé pour Chromium :

```sh
npx --no-install playwright install --only-shell chromium
npm run test:recette:browser
```

Le test démarre et arrête lui-même le kit et ses émulateurs. Fermer une autre instance du kit avant lancement. La CI installe seulement Chromium Headless Shell dans le job HTTP existant, avec les bibliothèques déjà présentes sur le runner ; elle ne déploie aucun service. Sur un autre poste Linux, les dépendances système peuvent être nécessaires (`npx --no-install playwright install-deps chromium`).

Quatre parcours couvrent l’export initial non exécuté et ses champs obligatoires, les six identités/droits et filtres, STOP/reprise, puis une préparation de preuve interrompue avant envoi et reprise en ligne, la validation MJ sans paiement et le gel du délai en pause. Le scénario est modifié seulement par l’interface native. Aucun saut d’horloge ; les paiements après échéance, litiges et remises physiques restent à jouer. Le bandeau replie le SHA long et reflète l’identité réellement connectée après rechargement. Le contrôle à 390 pixels mesure le débordement horizontal dans Chromium, pas le comportement d’un téléphone réel.

Les rapports JSON/HTML, captures et `context.json` sont dans `dist/recette-browser/` (artefact CI `recette-browser`, sept jours). Le contexte relève version Chromium, viewport, commit/arbre et état modifié du build. Les captures contiennent uniquement les données fictives. Pas de traces réseau ou de vidéo ; aucun jeton de connexion exporté. Les connexions de l’application sont limitées aux trois origines locales attendues ; tout appel distant ou erreur JavaScript fait échouer le parcours concerné.

Ces résultats portent le périmètre **AUTOMATED_CHROMIUM**. Ils ne remplissent pas de PASS humain ; l’export manuel conserve **NOT_CERTIFIED** et n’autorise pas de publication.

## Validation et prochaine étape

Neuf tests applicatifs couvrent les gardes d’environnement, les versions d’outils, les identités/origines, les fonds et stocks natifs, les droits, la création de sessions distinctes, le relevé, l’échappement HTML, la séparation des compilations et le serveur local. Le contrôle de disponibilité vérifie aussi le refus temporaire avant la fin de préparation. Un scénario HTTP/Auth utilise le même créateur d’identités et le même préparateur métier avec l’API réelle et les émulateurs. Résultats du candidat exact dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1).

Prochaine étape : lancer le kit sur un poste équipé de Java 21, jouer et documenter ces parcours, corriger les écarts constatés, puis préparer les essais sur appareils et le reste du registre. L’accès depuis des téléphones nécessitera un environnement adapté : la boucle locale actuelle ne prétend pas fournir une URL de recette terrain. Aucun projet externe, accès réel ou déploiement n’est créé par cette préparation.
