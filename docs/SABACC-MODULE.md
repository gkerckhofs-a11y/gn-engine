# Sabacc autonome — candidat V1

Source : [SABACC_Cahier_des_charges_V1_0](https://docs.google.com/document/d/1qUq2mc-tvRlLCjW939ITGZnck4Gmqc-QiOPHvq3Ckt4/edit), consulté le 13 novembre 2026. Copie de travail : `docs/source/SABACC_V1_0.txt`.
Base publiée : `abae2811c2aeb27cba1ff47c5e004d3b7c11bbc5`. Développement isolé dans `work/sabacc-module`. Publication autorisée par Guillaume le 13 novembre 2026, dès que les vérifications sont réussies.

## Utilisation

Ouvrir `/sabacc/`, se connecter avec Google. Le propriétaire dispose de l’onglet Régie MJ : activer le module, désigner les comptes MJ, créer une table, régler ses montants puis l’ouvrir. Le QR imprimable contient uniquement l’identifiant de table et son jeton d’entrée renouvelable. Il ne donne aucun droit de mise.

Le joueur crée une identité fictive locale, rejoint un siège et le MJ lui attribue des crédits fictifs avec un motif audité. Le mode GN remplace cette identité et ce portefeuille par le personnage publié du compte dans la session sélectionnée. Aucun scénario n’est nécessaire au mode local. Les tables peuvent coexister avec des niveaux et des modes différents.

Les quatre onglets sont Table, Ma main, Règles et Historique. Les règles sont consultables sans connexion après mise en cache du module. Les API, les cartes, les portefeuilles et les jetons d’authentification ne sont jamais mis dans le cache du service worker. Les cartes restent en mémoire d’affichage tant que l’identité n’est pas déconnectée ; aucune action hors connexion.

## Profil de jeu figé

Décision explicite de Guillaume pendant le développement : classement **Sabacc For Charity** plutôt que Holodex, dont la position de Khyron diffère. Source : https://www.sabaccforcharity.com/fr/guides (consultée le 13/11/2026).

Ordre : Pur, Full, Flotte, Yee-Haa, Rhylet, Escadron, Gee Whiz, Khyron, Banthas Wild, Règle des Deux, Paire, zéro non classé, Nulrhek. Les exemples, les noms et les départages sont issus du même module pur que le moteur (`src/sabacc/rules.mjs`). Les contraintes exactes de ce profil sont visibles dans les règles, notamment deux cartes pour le Pur, cinq pour Full/Flotte, motifs comparés en valeur absolue, égalités parfaites partagées et reliquats distribués après le donneur. Trois rounds, 62 cartes, doubles y compris au troisième round, pas de side pots ni all-in incomplet.

Précision opérationnelle par rapport au §5 : tous les joueurs déjà assis doivent être prêts (minimum deux) avant le départ automatique. Cela permet réellement de réunir huit consentements aux antes au lieu de démarrer systématiquement avec les deux premiers. Le MJ peut retirer les absents. Modifier les paramètres réinitialise les consentements ; une main commencée garde ses montants.

Le montant d’une mise/relance est le débit supplémentaire immédiat. Les limites de table s’appliquent par action. Le donneur avance au prochain participant. Le dernier joueur actif après les abandons gagne seulement le pot principal, sans révélation.

## Architecture et sûreté

- `src/sabacc/engine.mjs` : machine à états pure, règlement et compensation ; `random.mjs` : graine crypto par commande et flux reproductible pour les retries Firestore, jamais exposés au client.
- `service.mjs` : commandes authentifiées, révisions de table, reçus idempotents, accès MJ, présence exclusive et projection publique/privée. Toutes les lectures précèdent les écritures effectives dans une transaction.
- `adapters.mjs` : identité locale ou GN, soldes serveur, règlement atomique. Les crédits GN protégés et réservés sont exclus des fonds disponibles. Un compte `ownerType: SABACC` conserve les pots et les écritures du grand livre totalisent zéro. Aucun changement des règles Firestore : les clients n’accèdent pas directement aux documents.
- Collection `sabaccTables` : configuration publique, état/deck réservés au serveur, mains privées séparées, résultats révélés et mouvements de portefeuille. `sabaccPlayers`, `sabaccWallets`, `sabaccPresence`, `sabaccCommands`, `sabaccAudit`, `sabacc/settings` sont autonomes.
- Chaque débit/crédit est rattaché à la table, à la commande et à la main lorsque applicable. Les dotations locales entre mains ont un motif et créent explicitement de la monnaie fictive. Les annulations remboursent les engagements réels ; le remboursement du jackpot restitue chaque contribution à son portefeuille d’origine. Aucun solde n’est accepté du client.
- Les campagnes/sessions GN ne peuvent pas être clôturées/archivées avec un pot non réglé. Un remboursement MJ reste possible après révocation d’un joueur, vers le portefeuille historiquement débité.
- Les droits et le QR sont revérifiés même lors d’un retry. Le navigateur garde la commande exacte non acquittée en sessionStorage pour vérifier son reçu après perte de réponse ; il n’y conserve ni cartes ni token.

## Synchronisation et limites connues

Synchronisation HTTP authentifiée toutes les 2,5 secondes lorsque l’onglet est visible, pas de listener Firestore direct. Les délais sont vérifiés côté serveur ; l’action automatique est déclenchée lors de la synchronisation d’un membre. Si tous les appareils sont hors ligne ou masqués, le serveur ne déroule pas seul les tours : il reprend à la prochaine synchronisation. Pas de tâche planifiée Cloud dans cette V1. La pause Sabacc et la désactivation du module suspendent son horloge. Les arrêts de sécurité / pauses de session GN bloquent les actions GN ; utiliser aussi la pause de table pour suspendre son délai.

Les profils locaux utilisent le même Firebase Authentication Google que GN Engine, sans obligation de personnage. Le module est séparé dans le code, les collections et la route ; ce n’est pas une deuxième installation Firebase indépendante. Réutilisation du client JS/esbuild existant, aucune migration Next.js nécessaire.

La cible 10×8 est testée sur des identités et tables de recette avec commandes serveur, pas sur 80 téléphones réels. La fréquence de synchronisation implique des lectures Firestore : coût et latence en réseau terrain restent à mesurer. La recette Android/iOS, la lisibilité autour d’une table et le Wi-Fi du lieu restent **NON EXÉCUTÉS**. Aucune certification humaine ni mise en production n’est déduite des tests automatisés.

## Validation reproductible

- `node --test test/sabacc-engine.test.mjs test/sabacc.test.mjs` : 15 tests réussis lors du développement (deck, classement, huit joueurs, doubles, tours, fonds, concurrence, confidentialité, pause, reconnexion, nouvelle main, multi-table, portefeuille GN).
- `GN_FIRESTORE_SUITES='["sabacc","sabacc-gn"]' npx --no-install firebase emulators:exec --project demo-gn-engine --only firestore,auth,storage 'node --test test/integration/firestore.test.mjs'` : 8 tests réussis, dont 10 tables × 8 identités. 265 commandes mesurées, p95 231 ms ; seuil déclaré dans le test 1500 ms. Données fictives, émulateur local ; ce seuil ne qualifie pas la production.
- `npm run build` : réussi.
- `npm run test:recette:browser -- --grep Sabacc` : parcours Chromium à exécuter avec les émulateurs ; aucun accès production. Test ajouté : activation/régie, QR, deux identités, cartes privées, action, règles sans perte de sélection, écran 390 px, pause et remboursement. Les résultats CI exacts sont consignés dans la PR.

La CI complète est requise car l’intégration touche le dispatcher et les protections des campagnes. La publication autorisée reste conditionnée à la réussite des vérifications du candidat exact.
