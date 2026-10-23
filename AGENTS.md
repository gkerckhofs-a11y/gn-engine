# GN Engine — consignes de développement

Source : instructions explicites de l’organisateur du 22 octobre 2026, « Nouvelle stratégie de développement GN Engine pour la suite ». Mise à jour par le cadrage SPACE OUTLAWS V3.1 du 23 octobre 2026 : SPACE OUTLAWS est prioritaire, le créateur universel est hors périmètre. Ces consignes remplacent les anciens parcours de livraison qui prévoyaient une publication à chaque version.

## Dépôt et branche

- Travailler exclusivement dans le dépôt `gkerckhofs-a11y/gn-engine`, sur une branche dédiée et une PR. Le checkout local sert au développement et aux vérifications du même dépôt ; ne pas créer de seconde application ou de dépôt parallèle.
- À chaque reprise, vérifier le HEAD distant de `main`, la branche de travail, la PR et leurs contrôles. Ne jamais écraser des modifications concurrentes.
- Branche en cours lors de cette décision : `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Toute nouvelle branche doit préserver les dépendances non encore fusionnées.
- Pas de fusion sur `main` dans ce parcours de développement sans instruction explicite. La réussite des tests ou l’accord sur un lot n’autorise pas une publication.

## Production interdite pendant le développement

- Ne déployer aucune modification sur Firebase en production.
- Ne déclencher aucun workflow de déploiement, manuellement ou indirectement.
- Ne pas modifier `.github/deploy-request.json`.
- Ne pas exécuter les scripts de déploiement ni changer des droits Firebase/IAM, règles, index ou données en production.
- Ne pas tester avec des comptes, secrets, stocks ou crédits de production ; ne pas copier de données personnelles réelles dans les fixtures.
- Une autorisation explicite ultérieure de l’organisateur est obligatoire avant toute mise en production. Préparer une procédure ne vaut jamais autorisation de l’exécuter.

## Cycle de chaque ensemble fonctionnel

1. Lire le cadrage V3.1 et le livre SPACE OUTLAWS V0.7 ; conserver le rapport de cohérence V0.6 comme historique (sources référencées dans SO-01a et SO-00). Délimiter un parcours complet, ses critères, dépendances et recettes. A01–A38 et l’extension PNJ FOR-01 sont clos : ne pas réinventer leurs barèmes. Distinguer les propositions techniques et les paramètres de session à préparer. Les décisions V3.1/V0.7 prévalent sur le cadrage V2 historique.
2. Réutiliser les services et collections existants. Protéger les acquis de campagne, les anciennes sessions, les identifiants et les quatre Masters Campagne/Session, modèles et exemples.
3. Implémenter sur la branche, avec tests métier, tests d’interface pertinents et tests Firebase émulés pour transactions, permissions, réessais et concurrence.
4. Exécuter les contrôles locaux applicables, au minimum `npm test` et `npm run build`. Corriger les échecs avant de constituer le commit fonctionnel.
5. Faire un commit après chaque ensemble fonctionnel validé localement ; le pousser sur la branche dédiée. Le workflow de vérification du dépôt exécute ensuite compilation, tests applicatifs et `npm run test:emulator` dans GitHub Actions.
6. Vérifier la CI sur le commit exact. Un contrôle en cours, annulé ou ignoré n’est pas un succès. Corriger toute régression sur cette branche, committer le correctif et vérifier sa CI **avant le lot suivant**.
7. Documenter les changements, compatibilités, limites et résultats réellement exécutés. Conserver les liens commit/PR, exécution et job, versions des outils, décomptes et date. Séparer tests locaux, CI, recette humaine et publication.
8. Mettre à jour la matrice SPACE OUTLAWS V3 et le suivi du lot, puis passer au lot suivant uniquement lorsque la validation automatisée requise est réussie.

Le workflow de vérification actuel (`.github/workflows/check.yml`) se déclenche sur push/PR et utilise Node 22, Java 21 et les émulateurs du projet `demo-gn-engine`. Il ne déploie pas. Vérifier cette séparation si les workflows évoluent. Les résultats définitifs de CI peuvent être consignés dans la description de PR en citant le commit testé ; ne pas attribuer à un nouveau commit un résultat obtenu sur un ancien.

## Recette finale avant publication

Prévoir un environnement de test isolé de la production et identifier précisément sa configuration, son URL éventuelle et le commit candidat. Les émulateurs servent aux tests automatiques ; ils ne constituent pas à eux seuls une recette humaine sur appareils. Aucune URL ni disponibilité d’environnement de recette n’est présumée.

Avant de provisionner un projet externe ou de créer des accès, préciser les moyens nécessaires et les autorisations disponibles. Préparer des données fictives et des comptes distincts pour propriétaire, MJ, accueil et joueurs ; vérifier l’absence de connexion du candidat à la production.

La recette finale doit couvrir :

- les 24 parcours REC-SO-01 à REC-SO-24, les six REC-SO-FOR-01 à 06 et les 10 essais SEC-SO, en signalant chaque cas exécuté, échoué, bloqué ou non exécuté ; les anciennes recettes V2 restent pertinentes pour les fonctions conservées ;
- le Master SPACE OUTLAWS unique et ses six vues, les imports/exports et les quatre Masters historiques ;
- l’isolation des sessions, les secrets, la révocation et la frontière absolue entre QR public d’interaction et accès privé jamais piratable ;
- les transactions, réessais, concurrence, pause, reprise et réseau dégradé ;
- la continuité de campagne et la préparation d’un épisode sans redistribution des acquis ;
- la chaîne spatioport lorsqu’elle est développée : achat, chargement, départ, interception, vrai butin, révision conditionnelle aux tirs effectivement exécutés ou dommages spéciaux prévus, réparations distinctes et nouveau départ ;
- les parcours sur Android/iOS et plusieurs comptes ; la charge pilote d’environ 60 participants avec seuils définis avant mesure ;
- les sauvegardes et la restauration nécessaires aux migrations prévues.

Consigner l’appareil, le rôle, le contexte, les étapes, le résultat attendu, le résultat constaté et la preuve. Corriger les régressions et rejouer les cas affectés avant de proposer la mise en service.

## Livrables de fin de développement

Préparer dans le dépôt :

1. Un **rapport de validation global** : version et commit candidat, couverture de chaque exigence, résultats CI, recette finale, anomalies, limites, compatibilité des données/Masters et décision de préparation à la mise en service.
2. Une **procédure de déploiement à faire approuver** : cible exacte, prérequis, sauvegarde vérifiée, migrations et retour arrière, ordre des actions, contrôles après publication, conditions d’arrêt et responsabilités.
3. Une demande d’autorisation fondée sur ces éléments concrets. Sans accord explicite, conserver le candidat sur branche/PR et ne rien publier.

Ces livrables et la recette finale sont à produire à l’issue du développement ; ce document n’en affirme pas l’exécution.

## Références de reprise

- [Référentiel V3.1/V0.7 et tranche SO-01a](docs/SO-01A-NATURES-SOINS.md)

- [Audit SO-00, sources intégrales et tranche Master](docs/SO-00-REPRISE.md)
- [Matrice SPACE OUTLAWS V3](docs/MATRICE-SPACE-OUTLAWS-V3.md)
- [Rapport courant](docs/SO-VALIDATION.md)
- [Sauvegarde/reprise et déploiement à faire valider](docs/SO-SAUVEGARDE-DEPLOIEMENT.md)

Historique conservé, remplacé par V3 en cas de contradiction :

- [Cadrage V2](docs/source/GN_Engine_Cahier_des_charges_Work_Astra_V2_0.md)
- [Audit L0](docs/AUDIT-V2-L0.md)
- [Matrice exigences et recettes](docs/MATRICE-V2.md)
- [Périmètre L1 et première tranche](docs/L1-ATELIER-MODULAIRE.md)
- [Rapport L1a et limites](docs/VALIDATION-0.37.md)

