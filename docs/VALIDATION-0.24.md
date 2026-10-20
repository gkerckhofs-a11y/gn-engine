# Validation 0.24 — actions de terrain

20 octobre 2026. Version 0.24.0 publiée et contrôlée.

Base GitHub : `0dc032e04268f3bf0046ec8f4979e64a4ca25ef3`, GN Engine 0.23. Périmètre : exécution chronométrée des fouilles, sabotage et réparation, D6 serveur, matériel, réservations, stocks et continuité de campagne. [Parcours et limites](ACTIONS-TERRAIN.md).

## Vérifications locales

- Compilation 0.24.0 réussie. **476 tests applicatifs réussis**, zéro échec, zéro ignoré.
- Quinze tests de terrain partagés par le store mémoire et Firestore émulé : aperçu, autorisations, réessais, concurrence, durée, pause, renouvellement avec réservation, consommables à l’échec, bonus, compétence, récupération commune, panne, réparation, protection, expiration, révocation, reprise de campagne, clôture sans PA, réapprovisionnement et rollback transactionnel.
- Le dé de test est injecté dans le workflow, jamais fourni par le JSON joueur. Un test essaie une valeur de dé dans la requête et vérifie que le serveur utilise son propre résultat.
- Les résultats privés et réserves sont absents de la projection de lieu et de l’aperçu. Les textes affichés sont échappés ; tests d’interface sur les contrôles bloqués pendant la pause, le choix du matériel et le résultat conservé.
- Compatibilité des anciennes archives, validation des références et copie des lieux depuis une version figée couvertes par les suites existantes et nouvelles.
- Nouveau parcours HTTP utilisant le véritable gestionnaire exporté avec Auth/Firestore émulés : modèle importé, lieu, attribution, QR, action automatique, récompense unique et révocation avant réessai.

## Validation distante

Code source : `8896ce1f3065144cb9940abe203881e1d4a33d6d`. Demande de publication : `bc1098877f1d133e53970bf7ac172f393169cf62`.

La [chaîne de publication 39429395517](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39429395517), tâche `verify` 118650162907, a réussi sous Node 22 / Java 21 : compilation, **476 tests applicatifs et 391 tests d’intégration Firebase, soit 867 tests**, zéro échec et zéro ignoré. Les journaux terminent les tests applicatifs à 13:20:11 UTC et les tests d’intégration à 13:31:58 UTC. La [vérification indépendante 39429395510](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39429395510), tâche `core` 118650162399, a également réussi.

Les tests Firebase utilisent exclusivement le projet émulé `demo-gn-engine`, avec Auth, Firestore et Storage. Ils ne constituent pas une recette de charge à 60 joueurs ni un test des formulaires privés dans les navigateurs mobiles.

## Limites

Les tests HTML ne prouvent pas l’affichage visuel ni l’usage des formulaires privés sur téléphone. Pas de recette authentifiée multi-comptes dans un navigateur, ni de charge à 60 connexions. Aucun compte joueur ou scénario de production n’a été utilisé pour les contrôles de publication.

Les soins complexes, aide, pillage, DIRECT/DISCRET, progression XP et import XLSX des lieux restent hors de ce lot. Les dépendances d’installation couvrent seulement les fouilles déclarées dépendantes.

## Publication

La tâche `deploy` 118656444471 de la chaîne 39429395517 a réussi : fonction en Belgique, règles et index Firestore, puis Hosting. Le vérificateur a confirmé les quatre masters XLSX publiés, identiques octet par octet aux fichiers du dépôt, à 13:33:51 UTC. À **13:34:23 UTC**, il a confirmé la version **0.24.0** et le refus des accès anonymes aux commandes privées, y compris les dix nouvelles commandes de terrain.

L’accueil **https://gn-engine.web.app/** a ensuite été rechargé dans le navigateur et affiche `GN Engine · 0.24.0`. Ce contrôle porte sur l’accueil public, pas sur les formulaires privés. Aucun scénario ni personnage de production n’a été modifié pour cette validation.
