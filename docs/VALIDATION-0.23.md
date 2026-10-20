# Validation 0.23 — masters complémentaires

20 octobre 2026. Développement, validation distante et publication terminés. Contrôles en ligne réussis à 12:53:45 UTC.

Base GitHub : `a9be939ac2530b9d5e683ec4085463fd362d084d`, GN Engine 0.22. Périmètre : masters CAMPAGNE et SESSION, imports complémentaires, création de nouveaux personnages et préservation des acquis.

## Vérifications locales

- **456 tests locaux réussis**, sans échec ni test ignoré, compilation 0.23.0 et vérification des différences réussies.
- Tests métier partagés par le store mémoire et Firestore émulé : scénario complet, aperçu sans mutation, création et dotations, import identique, réessai de commande, versions conflictuelles, ajout en épisode, solde réellement dépensé conservé, reprise dans l’épisode suivant, champs vides et effacement, références, droits, phase, concurrence et archivage.
- Un master synthétique de 60 personnages et 60 dotations est importé, figé puis utilisé pour créer une campagne. La réimportation dans l’épisode ne redistribue aucun crédit. Ce contrôle de données ne simule pas 60 connexions.
- Contrôles de connaissances : instantané reçu conservé après modification du catalogue, archivage bloqué avec un reçu actif.
- Contrôles de médias : référence étrangère refusée avant application.
- Les quatre fichiers XLSX livrés sont lus par le même lecteur que le navigateur. Les deux exemples sont importés successivement dans un scénario puis une session de campagne.
- Le lecteur refuse les formules, déclarations XML externes, feuilles/colonnes inconnues et fichiers excessifs. Les tests d’interface couvrent l’échappement des différences, l’absence de confirmation en cas d’erreur et le masquage des commandes selon le rôle et la phase.
- Un test HTTP avec Auth et Firestore émulés utilise le véritable gestionnaire exporté : droits, aperçu, import, réessai, erreur de version et journal.
- Les classeurs ont été générés avec Artifact Tool. Les aperçus des 60 feuilles ont été inspectés. Ils n’utilisent aucune formule de calcul. La vérification native dans Excel et Google Sheets n’est pas revendiquée.

## Validation distante

Compilation et **831 tests réussis**, sans échec ni test ignoré, sous Node 22 / Java 21 : **456 tests applicatifs** et **375 intégrations Firestore/Auth**. Ces résultats sont présents dans les trois exécutions complètes suivantes :

- CI du commit fonctionnel : exécution [39423555186](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39423555186), tâche `118630285618`, fin des intégrations à 12:46:56 UTC.
- CI de la demande de publication : exécution [39423592099](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39423592099), tâche `118630412787`, fin des intégrations à 12:47:07 UTC.
- Porte de validation de la publication : exécution [39423592016](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39423592016), tâche `118630411575`, fin des intégrations à 12:47:21 UTC.

Ces répétitions portent sur le même ensemble de 831 tests ; elles ne représentent pas 2 493 tests distincts. Les nouveaux tests partagés des masters, notamment les 60 personnages, s’exécutent aussi sur Firestore émulé.

## Propagation du site et contrôle de publication

La première tâche de déploiement `118635276002` a publié la fonction, les règles, les index et le site avec succès à 12:49:50 UTC. Son contrôle final a échoué immédiatement sur le pied de page, qui ne correspondait pas encore à la version attendue. Le navigateur a ensuite confirmé l’accueil `0.23.0`. Seule la tâche de déploiement a été relancée ; les tests applicatifs et Firebase déjà réussis n’ont pas été contournés.

Le vérificateur a été corrigé séparément pour attendre aussi la propagation du HTML, avec requêtes sans cache et douze tentatives bornées. Il exige toujours la version exacte et refuse immédiatement une réponse non autorisée ou une page étrangère. Les **six tests ciblés du contrôle de publication** passent localement, dont trois nouveaux cas pour la page HTML. Cette correction concerne les outils de publication, pas le code applicatif servi aux joueurs.

## Limites de validation

Pas de recette authentifiée sur appareils mobiles ni de test de charge à 60 connexions simultanées. Les tests HTML ne prouvent pas l’affichage visuel des nouveaux écrans privés. Aucun scénario ou compte joueur de production n’a été modifié pour ces contrôles de publication.

## Publication

Commit fonctionnel `418bcfe3605651b10f7c81f8f6220036038b026e`, demande de publication `54ef6eb422bdf3e08e9bdd5ea03449b4ff6415ba`. Les 29 fichiers fonctionnels, dont les quatre XLSX, ont été comparés par empreinte Git lors de leur envoi et correspondent à la copie testée. Chaîne de publication : [39423592016](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39423592016), deuxième tentative réussie, tâche de déploiement `118636935893`.

- Site publié à 12:53:19 UTC ; version et manifeste `0.23.0` conformes.
- Les quatre XLSX téléchargés depuis Hosting correspondent exactement, octet pour octet, aux fichiers validés : preuve dans le journal à 12:53:20 UTC.
- Toutes les commandes privées vérifiées, dont les trois commandes de masters, refusent les accès anonymes avec `401 / LOGIN_REQUIRED` : fin du contrôle à 12:53:45 UTC.
- Accueil ouvert dans le navigateur, pied de page `GN Engine · 0.23.0` observé. Aucun accès privé ni inscription de production créé pour la recette.

Application : https://gn-engine.web.app/. Parcours, fichiers et restrictions dans [MASTERS.md](MASTERS.md).
