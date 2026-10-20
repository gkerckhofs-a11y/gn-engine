# Validation 0.20 — export/import des scénarios avec images

20 octobre 2026. **Version 0.20.0 publiée et vérifiée, avec 750 tests réussis.** L’activation effective du stockage privé et la recette sur comptes réels restent à confirmer.

## Réalisation

Export de l’état courant ou d’une version figée dans un fichier `.gnscenario.zip`, comprenant les fiches, permissions de fiction, dotations et sources normalisées des images. Aperçu avant import, nouveau scénario indépendant, sources binaires conservées exactement, variantes régénérées, références d’images réécrites et compteur d’utilisation maintenu dans la transaction de création.

Le format, le mode opératoire, les limites de taille, la reprise et les exclusions sont décrits dans [SCENARIO-ARCHIVES.md](SCENARIO-ARCHIVES.md). Les nouveaux boutons sont **Exporter le scénario** dans l’atelier et **Importer un scénario** dans le tableau de bord propriétaire.

## Vérifications

- Aller-retour des textes privés, objectifs, relations, groupes secrets et permissions ; destinataires d’indices et interdiction de copie conservés.
- Profils et matériel déjà copiés conservés malgré un changement ultérieur du catalogue ; source d’image strictement identique après import, y compris au-delà de 5 Mio pour une source déjà normalisée.
- Version figée exportée indépendamment des modifications suivantes du brouillon.
- Images réutilisées incluses une seule fois dans l’archive ; références de personnages, objets et snapshots remappées ensemble.
- Fichiers altérés, références absentes, doublons, chemins ZIP inattendus, compression hors format, métadonnées privées et dépassements de limites refusés.
- Consentement lié au contenu et au titre ; propriétaire vérifié avant lecture, validation ou réessai. Identité d’un autre compte, rôle client forgé et accès anonyme refusés.
- Panne en cours d’import, reprise sans doublon, commit répété ou concurrent unique ; aucun scénario partiellement créé.
- Fichier manquant et concurrence entre suppression et import contrôlés ; images déjà utilisées protégées.
- Données de connexion et d’exécution exclues ; scénario sans images réimportable sans adaptateur Storage.
- Réponses asynchrones privées invalidées à la fermeture ou déconnexion ; aucun lien de téléchargement tardif.
- Texte Unicode volumineux réparti dans les documents privés temporaires, puis réassemblé.
- Suite métier partagée avec Firestore émulé et parcours HTTP réel avec Auth et Storage émulés.

Résultat local métier/interface : **411 tests réussis**, sans échec ni test ignoré. La compilation passe. Une exécution complète des intégrations locales a réussi ses **338 tests** Auth/Firestore/Storage, dont le parcours HTTP d’export/import. Le cas Unicode volumineux a été ajouté pendant cette exécution et passe dans la suite métier.

La révision finale `501cde01c1da2bd0f827edc4a03a72730aaa98b6` a ensuite réussi **750 tests sur GitHub : 411 métier/interface et 339 intégrations**, avec compilation réussie, aucun échec ni test ignoré. Les deux exécutions [de vérification 39394915797](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39394915797) et [de déploiement 39394915846](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39394915846) ont passé ces contrôles. Dans la chaîne de déploiement, les tests métier se sont terminés à 08:39:27 UTC, le cas Unicode sur Firestore a réussi à 08:45:52 UTC et les 339 intégrations se sont terminées à 08:46:17 UTC le 20 octobre 2026.

Commit applicatif : `6ac17244b9192a8c03dc1602eb61bdee3a53d629`. Demande de déploiement : `501cde01c1da2bd0f827edc4a03a72730aaa98b6`. Les 26 fichiers publiés, demande de déploiement comprise, ont été comparés aux objets du dépôt GitHub sans différence avant l’ajout de ces preuves documentaires.

Publication Firebase réussie dans l’exécution [39394915846](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39394915846) : fonction ACTIVE à **08:48:18 UTC**, Hosting publié à **08:48:27 UTC**, manifeste **0.20.0** et refus anonyme des **132 commandes privées** vérifiés à **08:48:56 UTC** (10:48:56 à Bruxelles). L’écran d’accueil a été rechargé dans le navigateur et affiche également 0.20.0. Ce contrôle public ne constitue pas une recette authentifiée ni une confirmation de l’activation du bucket privé.

## Limites

L’archive représente un état choisi du scénario, pas l’ensemble des historiques ni une sauvegarde des sessions. Les petites annonces et contrats de session, inscriptions, comptes réels et notes personnelles ne sont pas transférés. Les exports de session, sauvegardes générales et bilans de partie restent ouverts.

L’exécution du script d’activation du bucket par le propriétaire n’a pas été confirmée pendant cette livraison. Aucune image ni donnée de recette n’est créée en production. La recette authentifiée et visuelle sur comptes réels et mobiles, ainsi que les mesures de performance sur des lots réels, restent à faire.
