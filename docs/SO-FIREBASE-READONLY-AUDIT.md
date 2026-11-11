# GN Engine / Space Outlaws — audit Firebase de reprise (lecture seule)

Date de préparation : 11 novembre 2026. **Aucune sauvegarde, restauration, migration ni publication exécutée.**

## Candidat de référence

Le candidat de jeu est figé sur `release/space-outlaws-0.38.0-rc.1`, SHA `48ee0c99df634700021793422c3236c81937faf3`. Sa [CI complète #43049856769](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43049856769) est réussie : 2 853 tests applicatifs, 2 183 Firestore, 106 HTTP et sept Chromium. Cette branche d'audit est un **travail séparé**, qui devra être vérifié sur son propre SHA si elle est proposée à l'intégration.

## Commandes de consultation uniquement

Le script `scripts/audit-firebase-recovery.mjs` invoque `gcloud` avec une liste fermée d'arguments et le projet explicite `gn-engine`. Il vérifie la base `(default)`, la liste des sauvegardes Firestore prêtes, leurs calendriers et l'état de protection du bucket média `gn-engine-media-936415509528`. Il ne lit ni documents Firestore ni contenu de fichiers média, et n'exécute aucune commande d'écriture.

En local, depuis une session Google Cloud **déjà autorisée** :

```sh
node scripts/audit-firebase-recovery.mjs
```

Le workflow manuel `.github/workflows/firebase-recovery-audit.yml` prévoit de réutiliser l'identité WIF déjà employée par la publication GitHub. **Il ne sera utilisable qu'après intégration du workflow sur la branche GitHub par défaut**, sous contrôle explicite. La présence de cette identité ne prouve pas qu'elle possède les permissions de lecture des sauvegardes. Un refus d'accès est un constat bloquant, pas une invitation à élargir implicitement IAM.

## Ce que le rapport prouve, et ce qu'il ne prouve pas

Le rapport se limite à des métadonnées : existence de la base, localisation déclarée, nombre de sauvegardes `READY`, horodatage de la plus récente, nombre de calendriers, nom du bucket et durée éventuelle de conservation `soft delete`. Il contient toujours `publicationAuthorized: false` et `restoreTest: NOT_EXECUTED`.

**Une sauvegarde Firestore prête n'est pas une restauration vérifiée.** Les sauvegardes Firestore planifiées ne contiennent pas les règles Firebase Security Rules, ni les politiques TTL. Les médias Storage, les comptes Auth et l'infrastructure de déploiement sont des périmètres distincts. Une politique `soft delete` n'est pas un export indépendant des médias.

Une restauration d'essai doit être effectuée vers **une base neuve et isolée** avant de considérer le plan de reprise comme validé. Ne pas supprimer ni écraser la base `(default)` utilisée par l'application. L'import d'un export Firestore n'est pas garanti instantané si les écritures ont continué pendant son exécution.

## Suite avant la publication du pilote

1. Obtenir les résultats authentifiés du rapport, puis vérifier les sauvegardes et les protections média auprès du responsable Google Cloud ; demander explicitement l'accord avant tout coût ou modification IAM.
2. Prouver une restauration sur environnement isolé et documenter les documents, sous-collections, versions, comptes, crédits, reçus et l'intégrité du stockage média.
3. Préparer la restauration séparée de l'application, des Rules, index et de la configuration Auth sans perte de données.
4. Présenter l'état complet à l'organisateur et valider le plan concret avant de promouvoir la version dans `main` et de la publier par le circuit GitHub/WIF.
5. Une fois en ligne, créer un **nouveau Master de recette**, et jamais un seed fictif dans une campagne existante ; exécuter alors la recette avec vrais QR et téléphones.

Sources Google : [backups Firestore](https://docs.cloud.google.com/firestore/native/docs/backups), [export/import](https://firebase.google.com/docs/firestore/manage-data/export-import), [récupération Cloud Storage](https://docs.cloud.google.com/storage/docs/soft-delete), [retour Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources), [limites CLI Firebase](https://firebase.google.com/docs/cli).
