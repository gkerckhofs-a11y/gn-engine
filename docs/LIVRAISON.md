# Suivi de réalisation

19 octobre 2026. Aucun lot complet n’est encore validé. Version 0.10 publiée : remises gratuites proposées puis acceptées, fractionnement atomique et suivi dans le sac. 312 tests réussis ; manifeste 0.10.0 et refus des accès anonymes vérifiés. Preuves dans `VALIDATION-0.10.md` ; rapports 0.2 à 0.9 conservés. La recette complète avec comptes joueurs distincts et mobile reste à faire. Le découpage ne réduit pas le périmètre du cahier.

| Lot | Parcours à livrer | Passage de lot |
|---|---|---|
| A — Fondations | Connexion, scénario versionné, session, formulaire public, liste d'attente, attribution et révocation, groupes et permissions, éditeur | REC-01 ; accès croisés et dernière place testés |
| B — Terrain | Navigation mobile, connaissances et relations, compétences, QR, PV, états et inventaire localisé | REC-04/05/07 ; coûts et résultats uniques |
| C — Économie | Caisses, paiements, marché/offres, annonces MJ, candidatures privées, contrats, entrepôts, douanes, cours | REC-02/03/10 pour la partie économique ; concurrence et réservations testées |
| D — Vaisseaux | Départs, routes, carburant, fret, entretien, interception et conséquences | REC-02/06 complets ; aucune duplication de lot |
| E — Exploitation | Import/export, packs, diagnostics, sauvegarde/restauration, secours et documentation | REC-08/09, tous les REC-01 à 10 et charge 60/120 |

Les contrôles d'accès et la traçabilité sont requis dès A. Les imports et outils de secours arrivent progressivement. Votes, casino, billetterie réelle et progression restent facultatifs. Les petites annonces ne le sont pas.

## Extension 0.3

Rôles MJ/Accueil par session, révocation vérifiée avant tout réessai, relations orientées, objectifs narratifs, historique des publications, suivi de lecture par révision et recherche de participants. 37 tests métier et 24 intégrations réussis localement et sur GitHub ; version publiée et recette navigateur authentifiée à poursuivre. Aucun lot complet déclaré terminé.

## Extension 0.4

Groupes versionnés publics/secrets, appartenances multiples, révélation et visibilité distinctes, quatre droits de lecture/publication, affiliations publiques contrôlées, fil de groupe adressé aux personnages autorisés et historique MJ. 54 tests métier/interface et 39 intégrations réussis localement et sur GitHub ; version publiée. La recette complète du lot A et des cercles de REC-04 reste ouverte : voir `VALIDATION-0.4.md`.

## Extension 0.5

Connaissances textuelles et indices versionnés, reçus propres aux personnages, découverte QR conditionnelle, partage explicite par badge, lecture personnelle, aperçu MJ neutre et interventions tracées. Les documents uniques, pièces jointes, compétences et notes privées restent à intégrer. 125 tests réussis sur GitHub ; version publiée avec manifeste 0.5.0 et refus anonyme vérifiés. Résultats et limites dans `VALIDATION-0.5.md`.

## Extension 0.6

Carnet privé par compte/session, notes classables, protection contre la réattribution et copies explicites vers un badge public. La confirmation indique le texte, les identités, le droit de retransmission et l'accès MJ à la copie partagée. 156 tests réussis localement et sur GitHub ; version publiée avec manifeste 0.6.0 et refus anonyme vérifiés. Preuves et limites dans `VALIDATION-0.6.md`.

## Extension 0.7

Classes de compétences passives, duplication des modèles, profils attribués après comparaison avant/après et exceptions individuelles. Les découvertes QR peuvent exiger une expertise avec un niveau minimum, sans effacer les documents déjà acquis. 186 tests réussis localement et sur GitHub ; version publiée avec manifeste 0.7.0 et refus anonymes vérifiés. Preuves et limites dans `VALIDATION-0.7.md`. Compétences actives et valeurs initiales PV/crédits/objets encore à développer.

## Extension 0.8

Suivi facultatif des PV, dégâts confirmés, hors combat et retour configurables, soins instantanés sur soi/cible, quota par session et délai suspendu pendant les pauses. État, consommation et résultat écrits ensemble ; corrections MJ et historique privé. Les PV initiaux sont actuellement définis par scénario/session, pas par classe. Inventaire médical, autres états, modificateurs et effets différés restent à intégrer. Voir `VALIDATION-0.8.md`.

## Extension 0.9

Catalogue versionné, copies confirmées du matériel de départ, lots indépendants par session, dons MJ confirmés, corrections tracées et sac avec filtres. Un soin peut consommer une quantité dans un lot compatible choisi ; stock, PV et usage sont appliqués ensemble une seule fois. 275 tests réussis localement et dans les journaux GitHub ; version publiée et accès privés contrôlés en ligne. Aucun transfert, fusion/fractionnement, capacité, équipement, image ou marché à ce stade. Le matériel initial est préparé individuellement, pas par classe. Voir `VALIDATION-0.9.md`.

## Extension 0.10

Remise gratuite d’un lot entier ou d’une quantité entière : proposition après comparaison, acceptation par le destinataire, refus/annulation et historique. Propriété, détention et emplacement changent ensemble. Le fractionnement conserve les quantités et la filiation des lots. Aucune réservation à la proposition ; toute modification du lot invalide les propositions en attente. Ventes, prêts, détention pour autrui, capacité, stockage externe, fusion, QR physique et validation de présence restent à intégrer. Voir `VALIDATION-0.10.md`.

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
3. Compléter le lot A : valeurs initiales PV/crédits/objets des classes, permissions de caisse/stock/transport et éditeur étendu. Les groupes avec droits narratifs sont développés en 0.4. Les rôles fixes MJ/Accueil et les fiches narratives sont développés en 0.3 ; voir `VALIDATION-0.3.md`.
4. Étendre les commandes et l'éditeur jusqu'au lot E, avec une preuve de recette par exigence.
5. Compléter la recette d'exploitation et de restauration. La publication GitHub et les contrôles HTTP automatisés sont en place.

## Données Port-Brèche à finaliser

La répartition de référence est de 60 places : HAB 12, IMP 6, LOC 8, PYK 5, EQ1/EQ2/EQ3 6 chacun, MER 5, VIS 6. Habitants et visiteurs sont des ensembles de casting, pas nécessairement des groupes de jeu solidaires. Le Comptoir n'ajoute pas de joueur. Les quatre renégats et l'infiltré occupent des places existantes.

Le canon laisse ouverts : durée, noms et affectations finales, couverture de l'infiltré, fragments et preuves, droits de la concession, crédits/stocks/prix, contrats, conditions de sabotage et de remise en service, règles de capture/détention et caractéristiques/formule des vaisseaux. Ces choix n'empêchent pas de développer le moteur paramétrable ; ils empêchent de certifier une configuration Port-Brèche prête à jouer.

## Critères de mise en service

Ne pas présenter le noyau ou la V0.1 comme une réalisation complète. Exiger une recette sur des comptes de rôles distincts, des demandes concurrentes, les fichiers privés et le fonctionnement après incident. Mesurer 60 puis 120 utilisateurs et documenter le réseau : les objectifs de 2 s pour 95 % des confirmations et 5 s de propagation restent à démontrer. Vérifier le pack papier et une restauration isolée avant l'événement réel.
