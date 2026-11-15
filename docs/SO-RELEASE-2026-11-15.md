# GN Engine 0.39.0 — intégration du 15 novembre 2026

## Portée et sources

Intégration cumulative des lots #35–#43 et complément économique. Base main examinée : `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`. Parent du complément : #43, `4494db24ac1e69c2a71f9e884dd2478e4d5ba472`. Les commits des lots sont conservés. Les résultats CI du candidat exact et la publication effective sont consignés dans la PR ; ce document ne les anticipe pas.

Sources : demandes de Guillaume (accès organisateur, huit profils de simulation, module Vaisseau, textes HRP), cahier unifié du 14 novembre [économie galactique](source/SO_Galactic_Economy_V1.md), livre V0.7 et [décision explicite d’arrondi](source/SO_Economic_Decisions_2026-11-15.md). L’extension capitaine reste une extension fonctionnelle, sans attribution au livre V0.7.

## Parcours réunis

| Lot | Fonction | Rapport détaillé |
|---|---|---|
| #35 | Administration prioritaire, aller-retour joueur, huit personnages fictifs, préparation guidée | [SO-ORGANIZER-TEST-NAVIGATION.md](SO-ORGANIZER-TEST-NAVIGATION.md) |
| #36 | Séparation objets personnels, fret commercial et vouchers carburant | [SO-PERSONAL-COMMERCE-CIRCUITS.md](SO-PERSONAL-COMMERCE-CIRCUITS.md) |
| #37 | Vaisseau partagé, capitaine, invitations volontaires, révocations et opérations en cours | [SO-SHARED-SHIP-CREW.md](SO-SHARED-SHIP-CREW.md) |
| #38 | Aides HRP, erreurs pédagogiques et distinction RP/HRP | [SO-HRP-EDITORIAL.md](SO-HRP-EDITORIAL.md) |
| #39 | Bourse, douze références, quatre états, stocks et budgets finis | [SO-GALACTIC-ECONOMY.md](SO-GALACTIC-ECONOMY.md) |
| #40 | Carte galactique et itinéraires issus des routes autorisées | [SO-GALACTIC-MAP.md](SO-GALACTIC-MAP.md) |
| #41 | Négociation Courtier/transporteur et contrats natifs | [SO-COMMERCIAL-TRANSPORT.md](SO-COMMERCIAL-TRANSPORT.md) |
| #42 | Retrait délégué, chargement natif, voyages, importation et preuve de livraison | [SO-COMMERCIAL-LOGISTICS.md](SO-COMMERCIAL-LOGISTICS.md) |
| #43 | Entrepôts commerciaux, baux et stocks privés sur la même planète | [SO-COMMERCIAL-STORAGE.md](SO-COMMERCIAL-STORAGE.md) |

Les chemins exacts des rapports historiques sont à consulter dans la matrice courante ; leur état historique ne certifie pas le nouveau candidat.

## Complément économique

- L’achat planétaire propose les comptes réellement accessibles par `myAccounts`. Le moteur natif vérifie le mandat de paiement et le solde disponible. Financer par une caisse de groupe ne change pas le propriétaire : la marchandise appartient au personnage acheteur. Un mandat de paiement seul ne révèle pas le solde. La révocation est recontrôlée avant un réessai d’achat déjà enregistré.
- COU-02 conserve son moteur D6, PA, durée, récupération et remise. Le prix négocié provient désormais du cours planétaire réel. La remise est liée à ce cours et devient inutilisable s’il change. La négociation reste limitée aux offres PNJ expressément préparées comme négociables.
- La régie « Événements et budgets » réutilise `createPriceService`, `readPriceBook`, `commodityQuote` et les validations existantes. Variation manuelle par marchandise, globale ou limitée à une planète ; suspension des nouvelles transactions ; confirmation et historique. Les anciens événements du scénario restent gérés par leurs outils existants. Les cours locaux utilisent les pourcentages additionnés et l’arrondi natif ; aucune fluctuation automatique après transaction.
- Un événement peut être relié à une News existante destinée à tous. La publication reste dans la régie des annonces. Le joueur ne reçoit le lien et le titre qu’après les contrôles natifs de lecture : aucun titre futur, brouillon ou bulletin privé n’est transmis.
- Réaffectation de budgets entre deux caisses PNJ existantes par le transfert natif extrait de `collective-accounts.mjs`. Aucune création de monnaie, aucun prélèvement de compte joueur ou groupe, aucun stock ajouté. Réservations, motifs, écritures comptables, confirmation, concurrence et reçus conservés. L’ouverture d’une caisse par un approvisionnement ne la crédite pas.
- Réception administrative et revente possibles à distance pour le propriétaire autorisé. Le lot doit avoir réellement voyagé, être déchargé au port prévu, être libre de retenues et avoir sa quittance d’importation. Les contrôles de santé et d’opérations engagées du personnage restent actifs. Aucun déplacement du personnage, du vaisseau ou des marchandises n’est simulé par une vente.
- Les modifications d’événements incrémentent la révision des marchés affectés : les formulaires ouverts deviennent périmés et l’ordre de l’historique reste déterministe même pour deux changements à la même date.

## Autorisations et données

Nouveaux points d’entrée de régie `galacticEventsAdmin`, `prepareGalacticEvent`, `saveGalacticEvent`, `galacticBudgetsAdmin`, `prepareShopBudgetTransfer`, `transferShopBudget` : contrôle organisateur existant, version et phase de session, refus STOP pour les modifications. La capacité interne `ECONOMIC_EVENT` limite les écritures aux événements et à leur historique ; les marchés et paiements réutilisent leurs capacités natives. Aucun droit issu d’une URL. Aucun changement de règle Firestore ou de secret dans ce complément.

Masters publiés, sessions historiques, historiques et mécanismes métier conservés. Aucun compte fictif Google ajouté, aucune session recréée, aucune migration ni réinitialisation de production. Les événements et entrepôts sont des réglages de session explicites, pas une réécriture des Masters.

## Validation et limites

Compilation et syntaxe des modules modifiés ; 83 cas ciblés locaux réussis sur économie, caisses, prix, COU-02, marchés, logistique, entrepôts et rendu. Dix cas locaux du garde de publication et de contrôle de version réussis. 28 cas partagés réussis sur Firestore émulé (économie intégrée, marchés, logistique) et un parcours HTTP + Auth supplémentaire réussi. Commande : `GN_FIRESTORE_SUITES='["galactic-economy","commercial-logistics","planet-markets"]' firebase emulators:exec --project demo-gn-engine --config firebase.recette.json --only firestore,auth,storage` exécutant les suites Firestore puis le cas HTTP ciblé. La CI complète du candidat exact reste à constater dans la PR.

La suite partagée `galactic-economy` couvre : livraison réelle avec Courtier resté au départ, importation/revente partielle sans déplacement, événement local, devis périmé, prix payé conservé, secret/futur/News privée, refus joueur, STOP, ancien événement protégé, caisse sans lecture de solde, révocation, remise COU-02 au cours courant et transfert PNJ concurrent/idempotent sans création monétaire. Les suites natives marchés et logistique vérifient les refus de lieu des marchandises, la collecte physique et les reçus. Le test HTTP ajouté utilise Auth et Firestore émulés.

Un parcours Chromium supplémentaire utilise les vrais formulaires de régie et la Bourse authentifiée : activation d’un événement sur une planète, prix de l’autre planète conservé, confirmation clavier et refus d’accès joueur. Les autres parcours du kit couvrent organisateur/démonstration, vaisseaux, cockpit, contrats et entrepôts. Les preuves navigateur et leurs captures doivent correspondre à l’arbre du candidat. Une capture issue d’une fixture ne vaut pas parcours authentifié complet.

Les licences réglementées, marchandises interdites, soutes cachées, sauvetages et tarifs spéciaux restent soumis à leurs procédures dédiées. Le parcours commercial ordinaire n’en délivre pas implicitement. Les annonces privées historiques à prix fixe/indexé conservent leurs mécanismes ; un événement local ne devient pas un événement global de ces annonces. Les compétences plus anciennes encore partielles sont recensées dans SO-COMPETENCES-V07-CLOTURE.md : cette publication ne certifie pas l’intégralité des 34 capacités V0.7.

La recette automatisée ne remplace pas les essais humains sur appareils Android/iOS ni une session GN réelle.

## Publication et retour de version

Guillaume a explicitement autorisé la publication Firebase une fois les modifications finalisées, puis demandé de terminer le 15 novembre. Le workflow de publication est réactivé sur `main`, avec son garde existant : les dix jobs de la CI complète doivent être réussis sur le SHA `main` exact. Le projet demeure `gn-engine`, fonction en Belgique et identité temporaire existante. Aucun changement de secret ou d’identité.

Le délai du garde de publication est aligné sur la CI complète : jusqu’à 100 minutes d’attente, job plafonné à 105 minutes, sans modification des dix contrôles ni du refus en cas d’échec. La CI parente #43 a nécessité plus de 30 minutes ; l’ancien plafond de 90 vérifications aurait expiré avant sa fin.

Le manifeste demande 0.39.0 ; l’ancienne consigne de pause est remplacée par cette autorisation conditionnelle. La fusion et le déploiement ne doivent intervenir qu’après les validations. Le contrôle live exige le pied de page et le manifeste de version exacts, les fichiers Master identiques et le refus des commandes privées anonymes, étendu aux nouveaux modules.

En cas d’échec de publication, ne pas réinitialiser les données ni faire de migration pour forcer la réussite. Corriger l’échec ou republier un candidat validé. Un retour de code doit conserver les nouveaux documents de session ; le simple retour de Hosting ne suffit pas si l’API a changé. Le précédent commit main demeure identifiable ci-dessus.
