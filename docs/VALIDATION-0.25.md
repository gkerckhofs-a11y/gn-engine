# Validation 0.25 — soins, aide et pillage

20 octobre 2026. Version 0.25.0 publiée et contrôlée.

Base GitHub : `ae47d57758499462d3b492ed7e2219db95325d58`, version 0.24. Périmètre et source des règles : [guide soins, aide et pillage](SOINS-AIDE-PILLAGE.md).

## Contrôles locaux

Compilation réussie ; **499 tests applicatifs réussis**, zéro échec, zéro ignoré. Vingt tests d’interaction partagés avec Firestore émulé couvrent : coût unique de la clinique accélérée, complément, interruption avant/après consommation, limites du soin de terrain, patient réservé, pause, convalescence, soin sur soi, aide, récupération, retrait, confidentialité du résultat pour l’aide, choix du bien, quota commun, remise unique, concurrence, révocation avant réessai, PA désactivés, clôture, copie en campagne, rollback médical et anciens fichiers d’archive.

Trois tests HTML nouveaux couvrent les rôles acteur/cible, la résolution du complément, la remise, les contenus échappés, les contrôles en pause, l’aide réservée aux tests et la régie scellée. Ils ne constituent pas une recette visuelle ou mobile des formulaires privés.

Le parcours HTTP/Auth existant de soin est étendu aux commandes d’interaction, aux refus anonymes, aux droits MJ, à la préparation et résolution d’un soin temporisé, à l’interdiction de résoudre à la place du soignant et à l’absence de double coût. Le contrôle après publication inclut toutes les nouvelles commandes privées et les quatre masters XLSX.

## Validation distante et publication

Code applicatif final : `d96fe52066e991fa34d769710fea8ae48139e181`. Demande de publication : `63ad6921311ca82275d382ec97aa489116971887`. La [vérification indépendante 39437737188](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39437737188), tâche `core` 118679124584, a réussi : 499 tests applicatifs et 411 intégrations Firebase, soit 910 tests, sans échec ni test ignoré. La [chaîne de publication finale 39437737260](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39437737260), tâche `verify` 118684279809, a également réussi : 499 tests applicatifs à 14:27:10 UTC puis 411 intégrations à 14:38:41 UTC, zéro échec et zéro ignoré, sous Node 22 / Java 21. Le pipeline de publication impose build, tests applicatifs et intégrations sur le projet **émulé** `demo-gn-engine` avant tout déploiement. Le délai maximal de validation passe de 15 à 25 minutes pour absorber la suite étendue.

## Preuve de publication

La tâche `deploy` 118690890173 a réussi. Publication Firebase terminée à **14:40:31 UTC** ; quatre masters XLSX vérifiés identiques aux fichiers testés à 14:40:32 UTC ; version **0.25.0** et refus de toutes les commandes privées anonymes confirmés à **14:41:05 UTC**, le 20 octobre 2026.

Accueil 0.25.0 confirmé dans le navigateur après cette publication. La route « Soins, aide et pillage » a aussi été ouverte sans authentification : elle présente la connexion et aucun contenu privé. Aucun formulaire de jeu authentifié n’a été utilisé en production pour ces contrôles. Application : https://gn-engine.web.app/#/.

Une première publication 0.25 avait passé 498 tests applicatifs et 410 intégrations. Une correction supplémentaire contrôle l’état de l’aide avant toute réservation, même lorsque la session permet la découverte hors combat. Les preuves finales ci-dessus portent sur la révision corrigée et ses **910 tests**, publiée par le commit `63ad6921311ca82275d382ec97aa489116971887`.

## Limites

Aucune donnée de jeu de production modifiée par les tests. Pas de recette authentifiée multi-comptes dans un navigateur ni de charge à 60 connexions. Le système complet de capture, DIRECT/DISCRET, les effets non médicaux et l’import XLSX des profils ne sont pas annoncés comme terminés. Les résultats de présence, remise et liberté s’appuient sur les déclarations des participants, avec arbitrage MJ.
