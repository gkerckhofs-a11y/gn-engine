# SPACE OUTLAWS — prépublication contrôlée du pilote

Date de préparation : 11 novembre 2026. Statut : **candidate seulement — aucune publication ni Master distant créé par ce document**.

## État vérifié

- Branche : `work/space-pilot-handover`, PR #2 ; `main` reste à la publication 0.37.0 historique.
- CI ciblée de la branche : commit `447d8078c72a9b73af9303cb4158bbb00537f3ef`, [exécution 43047410513](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43047410513) terminée avec succès : application 1023/1023, Firestore 233 + 189 + 167 + 196 = **785/785**, HTTP et contrôle final. Le scénario `space-pilot-journey` a passé sur Firestore Emulator dans le premier lot.
- La recette humaine, les QR physiques, les appareils Android/iOS, les conditions réseau et la restauration ne sont **pas** validés par cette CI.
- Version candidate distincte de la publication courante : `0.38.0-rc.1` dans `package.json` et `package-lock.json`. Cette étiquette est **un candidat**, pas une version déployée. Vérifier à nouveau sur le SHA final.

## Cible et limites

La cible **envisagée** est le projet Firebase **existant** `gn-engine` et le site `https://gn-engine.web.app/`. Ce n'est pas un bac à sable indépendant : le site, Firestore, l'authentification et le bucket privé sont partagés avec les éventuelles données existantes. Ne jamais importer automatiquement le Master fictif local ou recopier ses comptes `@recette.example.invalid` vers ce projet. Les quatre fichiers `assets/masters/*.xlsx` historiques sont des artefacts de distribution ; ils ne valent pas Master pilote installé.

Le kit `npm run recette:pilote` ne fonctionne qu'avec le projet `demo-gn-engine` sur Auth/Firestore/Storage Emulator, et génère des données temporaires par les commandes métier. Préparer les futurs Masters de test **dans une nouvelle campagne**, avec des joueurs et rôles de test dûment habilités, après vérification de la cible. Il n'existe aucune autorisation d'effacer/réinitialiser les anciennes sessions.

## Critères de prépublication (tous obligatoires)

| Porte | Preuve attendue | État à cette préparation |
| --- | --- | --- |
| A — candidat figé | SHA final, version `0.38.0-rc.1`, arbre propre, PR diff examinée, aucun commit concurrent | À vérifier après CI complète |
| B — régression | GitHub Actions **complète** sur ce SHA : build, tous les tests applicatifs, lots Firestore complets, HTTP/Auth/Storage et parcours Chromium | À lancer/terminer |
| C — sécurité | accès anonyme privé refusé, permissions propres aux six rôles, tests de révocation, STOP, achats, reçus/PA, secrets et sessions distinctes | Automatisé partiellement ; contrôle terrain à compléter |
| D — données | identité du projet, de la base et du bucket, configuration OAuth, IAM/WIF, inventaire des campagnes/sessions/versions et état des sauvegardes | Non vérifié à distance dans ce jalon |
| E — protection | sauvegarde cohérente **vérifiée**, procédure de restauration testée, export médias requis, plan de retour application/règles/index et fenêtres d'intervention | Non réalisé |
| F — recette appareil | QR imprimés, connexion réelle, équipe MJ et deux joueurs, Android + iOS, temps et réseau dégradé avec relevé daté | Non exécuté |
| G — autorisation | confirmation explicite de la cible `gn-engine` et du plan de publication précis après présentation des portes A–F | Non obtenue pour ce candidat |

Un `success` sur CI ne ferme pas D, E, F ni G. Si la recette mobile a lieu après publication contrôlée, ce sera une **publication de recette non certifiée**, jamais une déclaration « GN opérationnel ».

## Séquence proposée, non exécutée

1. Conserver le SHA candidat et figer les données de test sans toucher aux sessions historiques. Vérifier que `main` n'a pas divergé et que le code/API attendu est compatible avec les anciennes versions immuables.
2. Déclencher la CI **complète** du candidat puis relire les logs de chaque job et l'artefact de recette Chromium, sans prendre une CI ciblée pour le verdict global.
3. Vérifier dans les consoles autorisées les ressources `gn-engine`, le bucket `gn-engine-media-936415509528`, les comptes de service, les règles/index, le fournisseur Google et l'inventaire des données. Ne pas changer IAM, secrets, bucket ou base implicitement.
4. Faire réaliser et **vérifier** la sauvegarde des données avant toute écriture distante. La disponibilité d'une commande d'export n'établit pas sa restaurabilité. Prévoir un emplacement de restauration isolé et la validation du responsable, sans essai destructif sur la production.
5. Préparer un retour à l'ancienne version de Hosting/API/règles tout en distinguant ce retour binaire d'une restauration Firestore/Storage ; arrêter en cas de nouvelle écriture incompatible ou d'incident de permissions.
6. Après accord spécifique, utiliser **uniquement** le circuit GitHub/WIF déjà configuré pour `gn-engine` ; ne pas lancer à l'aveugle les scripts locaux ni le générateur destiné à un autre projet. Le gate sur `main` doit avoir la CI complète **du SHA exact**.
7. Vérifier les réponses `/version.json` et `/app.js`, la version candidate, les quatre XLSX et les refus `401 LOGIN_REQUIRED` de l'API privée. Comparer aussi le bundle publié à celui du candidat ; effectuer une vérification Google Auth avec de véritables comptes de test et les permissions appropriées.
8. Créer alors, **séparément**, un Master/campagne pilote fictif à partir des ateliers M1–M7 via les commandes natives ; M4 reste hors pilote. Aucune copie automatique d'une ancienne session. Jouer les cas de `docs/SO-PILOTE-PIL02-RECETTE-INTEGREE.md`, recueillir les preuves et corriger seulement les blocages observés.

## Arrêt immédiat

Arrêter toute opération externe si cible/projet/bucket incertains, CI finale rouge ou incomplète, sauvegarde non vérifiée, ancien Master modifié sans décision explicite, accès anonyme à des données privées, écritures de test dirigées vers une vraie session, ou procédure de retour arrière indisponible.

Sources internes : `AGENTS.md`, `docs/SO-PILOTE-GEL-V1.md`, `docs/SO-RECETTE-LOCALE.md`, `docs/SO-RECETTE-FIREBASE.md`, `scripts/deploy.sh`, `scripts/deploy-api.sh`, `scripts/verify-deployment.mjs`. Le script de vérification actuel compare la version de `package.json` : il ne prouve ni la disponibilité d'une sauvegarde ni la provenance des données.

Ce document **n'exécute** ni fusion, ni déploiement, ni migration, ni seed, ni opération sur des secrets.
