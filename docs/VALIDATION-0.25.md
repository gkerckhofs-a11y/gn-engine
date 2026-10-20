# Validation 0.25 — soins, aide et pillage

20 octobre 2026. Version 0.25.0 préparée ; publication non encore confirmée dans ce commit.

Base GitHub : `ae47d57758499462d3b492ed7e2219db95325d58`, version 0.24. Périmètre et source des règles : [guide soins, aide et pillage](SOINS-AIDE-PILLAGE.md).

## Contrôles locaux

Compilation réussie ; **498 tests applicatifs réussis**, zéro échec, zéro ignoré. Dix-neuf tests d’interaction partagés avec Firestore émulé couvrent : coût unique de la clinique accélérée, complément, interruption avant/après consommation, limites du soin de terrain, patient réservé, pause, convalescence, soin sur soi, aide, récupération, retrait, confidentialité du résultat pour l’aide, choix du bien, quota commun, remise unique, concurrence, révocation avant réessai, PA désactivés, clôture, copie en campagne, rollback médical et anciens fichiers d’archive.

Trois tests HTML nouveaux couvrent les rôles acteur/cible, la résolution du complément, la remise, les contenus échappés, les contrôles en pause, l’aide réservée aux tests et la régie scellée. Ils ne constituent pas une recette visuelle ou mobile des formulaires privés.

Le parcours HTTP/Auth existant de soin est étendu aux commandes d’interaction, aux refus anonymes, aux droits MJ, à la préparation et résolution d’un soin temporisé, à l’interdiction de résoudre à la place du soignant et à l’absence de double coût. Le contrôle après publication inclut toutes les nouvelles commandes privées et les quatre masters XLSX.

## Validation distante et publication

À compléter avec les commits, la chaîne GitHub, les résultats Firebase et le contrôle de version réellement obtenus. Le pipeline de publication impose build, tests applicatifs et intégrations sur le projet **émulé** `demo-gn-engine` avant tout déploiement. Le délai maximal de validation passe de 15 à 25 minutes pour absorber la suite étendue.

## Limites

Aucune donnée de jeu de production modifiée par les tests. Pas de recette authentifiée multi-comptes dans un navigateur ni de charge à 60 connexions. Le système complet de capture, DIRECT/DISCRET, les effets non médicaux et l’import XLSX des profils ne sont pas annoncés comme terminés. Les résultats de présence, remise et liberté s’appuient sur les déclarations des participants, avec arbitrage MJ.
