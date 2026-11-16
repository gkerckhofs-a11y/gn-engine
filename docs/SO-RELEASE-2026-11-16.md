# Publication 0.39.1 — 16 novembre 2026

Guillaume autorise explicitement la publication : « tu peux publier ». Candidat PR #46, base main 98a3342d6f9c789f2edcc2c75faf1776296d7171.

Périmètre : carte accessible avec PIL-01 N1 quelle que soit la classe, raccourcis cohérents, conseil Terminal retiré, bouton STOP joueur retiré de l'interface avec avis d'arrêt MJ conservé. Aucun changement de PV. L'ouverture de tous les codes a été annulée. Le Carnet galactique, les 30 destinations configurées et les échanges consentis restent hors livraison.

La CI du parent bf223b097333a5ec778073a6b82a6df2247a46c0 (43848110309) a validé HTTP/Chromium mais identifié une attente obsolète dans test/recette.test.mjs : le Courtier sans PIL-01 était encore supposé lire la carte. Le test vérifie désormais le refus serveur attendu. Les contrôles de navigation du Pilote et du commerce restent inchangés. Correctif local : 23 tests recette/garde CI/contrôle de publication réussis, compilation réussie.

Version package et verrou : 0.39.1. Le manifeste .github/deploy-request.json déclenche le workflow existant après fusion dans main. Les dix jobs complets sur le SHA main exact restent exigés ; aucun contrôle ni droit n'est contourné. Projet Firebase gn-engine, déploiement code/API/Hosting/règles existantes, aucun changement de données ou migration.

Le résultat CI et la publication doivent être constatés sur les nouveaux SHAs ; l'autorisation n'est pas une preuve de déploiement. Contrôle final : version.json 0.39.1, pied de page, masters identiques, commandes privées anonymes refusées, et artefacts web du Terminal mis à jour. Un échec bloque la publication sans réinitialisation de données.
