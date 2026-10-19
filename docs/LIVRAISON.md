# Suivi de réalisation

19 octobre 2026. Aucun lot complet n'est encore validé. Premier parcours A développé et publié sur https://gn-engine.web.app/ : 28 tests métier et 14 intégrations réussis. L'accueil public et les contrôles HTTP sont vérifiés ; la recette complète avec des comptes joueurs distincts reste à faire. Voir `VALIDATION-0.2.md`. Le découpage ne réduit pas le périmètre du cahier.

| Lot | Parcours à livrer | Passage de lot |
|---|---|---|
| A — Fondations | Connexion, scénario versionné, session, formulaire public, liste d'attente, attribution et révocation, groupes et permissions, éditeur | REC-01 ; accès croisés et dernière place testés |
| B — Terrain | Navigation mobile, connaissances et relations, compétences, QR, PV, états et inventaire localisé | REC-04/05/07 ; coûts et résultats uniques |
| C — Économie | Caisses, paiements, marché/offres, annonces MJ, candidatures privées, contrats, entrepôts, douanes, cours | REC-02/03/10 pour la partie économique ; concurrence et réservations testées |
| D — Vaisseaux | Départs, routes, carburant, fret, entretien, interception et conséquences | REC-02/06 complets ; aucune duplication de lot |
| E — Exploitation | Import/export, packs, diagnostics, sauvegarde/restauration, secours et documentation | REC-08/09, tous les REC-01 à 10 et charge 60/120 |

Les contrôles d'accès et la traçabilité sont requis dès A. Les imports et outils de secours arrivent progressivement. Votes, casino, billetterie réelle et progression restent facultatifs. Les petites annonces ne le sont pas.

## Extension 0.3

Rôles MJ/Accueil par session, révocation vérifiée avant tout réessai, relations orientées, objectifs narratifs, historique des publications, suivi de lecture par révision et recherche de participants. 37 tests métier et 24 intégrations réussis localement ; recette navigateur authentifiée à poursuivre. Aucun lot complet déclaré terminé.

## Préparation réalisée

- Cahier V1 conservé, texte consultable, matrice de 132 exigences.
- Canon Port-Brèche retrouvé et lu ; aucune nouvelle valeur d'équilibrage inventée.
- Source V0.1 conservée pour reprise des écrans et règles de terrain.
- Audit des écarts et architecture de migration.
- Noyau initial : horloge de jeu, projections, transfert atomique ; 16 tests locaux.
- Projet Firebase configuré ; fonction `api`, Hosting, règles fermées et index Firestore publiés.
- Déploiement GitHub autorisé par fédération d'identité, sans clé privée ; comptes de déploiement, compilation et exécution distincts.

## Intégration encore à réaliser

1. Intégrer Storage avec le parcours médias ; Functions, Hosting, Google Authentication et Firestore sont en place.
2. Recetter dans des navigateurs avec des comptes réels distincts. Adaptateur, règles, jetons, inscriptions et attributions passent les essais sur émulateurs.
3. Compléter le lot A : groupes, permissions fines par ressource et éditeur étendu. Les rôles fixes MJ/Accueil et les fiches narratives sont développés en 0.3 ; voir `VALIDATION-0.3.md`.
4. Étendre les commandes et l'éditeur jusqu'au lot E, avec une preuve de recette par exigence.
5. Compléter la recette d'exploitation et de restauration. La publication GitHub et les contrôles HTTP automatisés sont en place.

## Données Port-Brèche à finaliser

La répartition de référence est de 60 places : HAB 12, IMP 6, LOC 8, PYK 5, EQ1/EQ2/EQ3 6 chacun, MER 5, VIS 6. Habitants et visiteurs sont des ensembles de casting, pas nécessairement des groupes de jeu solidaires. Le Comptoir n'ajoute pas de joueur. Les quatre renégats et l'infiltré occupent des places existantes.

Le canon laisse ouverts : durée, noms et affectations finales, couverture de l'infiltré, fragments et preuves, droits de la concession, crédits/stocks/prix, contrats, conditions de sabotage et de remise en service, règles de capture/détention et caractéristiques/formule des vaisseaux. Ces choix n'empêchent pas de développer le moteur paramétrable ; ils empêchent de certifier une configuration Port-Brèche prête à jouer.

## Critères de mise en service

Ne pas présenter le noyau ou la V0.1 comme une réalisation complète. Exiger une recette sur des comptes de rôles distincts, des demandes concurrentes, les fichiers privés et le fonctionnement après incident. Mesurer 60 puis 120 utilisateurs et documenter le réseau : les objectifs de 2 s pour 95 % des confirmations et 5 s de propagation restent à démontrer. Vérifier le pack papier et une restauration isolée avant l'événement réel.
