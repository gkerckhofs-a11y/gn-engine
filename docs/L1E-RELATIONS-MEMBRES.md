# L1e — Relations et membres des groupes

Tranche du candidat **0.37.0**, sur `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Aucun déploiement. Le HEAD de `main` vérifié à la reprise est `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0). Le parent distant L1d `a712e5076e3f322d858772e1bfb2f73c63916bea` a passé sa [CI](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39773686257) : 692 tests applicatifs et 549 tests Firebase. La copie récente du cadrage V2 a été comparée au fichier source du dépôt : octets identiques, SHA-256 `e86478ceffb76d3261725e6a69f20481a4feb587c28c0f3edd7b7725805e96ce`.

## Parcours livré

Le module Personnages propose désormais les feuilles **Relations** et **Membres**, en plus des quatre feuilles déjà éditables. Avec les autres modules et Tarifs, quinze feuilles disposent d’un éditeur en ligne. L1 reste ouvert.

| Feuille | Parcours | Limite de sens |
| --- | --- | --- |
| Relations | Rechercher, créer, modifier, dépublier, dupliquer non publiée, exporter les lignes affichées | La relation appartient à une fiche ; aucune réciprocité automatique |
| Membres | Choisir groupe/personnage, régler rôle, activation, révélation, visibilité et droits ; désactiver/réactiver ; exporter | Une seule appartenance par couple ; aucune duplication de droits vers un autre membre |

Chaque modification demande un motif, passe par l’aperçu commun puis attend une confirmation. L’export produit **Meta + la feuille sélectionnée**, avec destination, module et révision. Il ne constitue pas l’export complet du module.

Les droits sont présentés sous forme de cases, avec les libellés de l’éditeur de groupes existant. À la création, les droits, l’activation et les révélations sont désactivés ; leur attribution est explicite. Décocher toutes les cases retire tous les droits. Un membre ne devient visible que selon les règles existantes de publication, activation et révélation ; payer avec la caisse reste un droit distinct. Une affiliation publique est refusée pour un groupe secret ou un membre non révélé. Les droits de retrait de stock ne suffisent pas sans le droit de lecture.

**Désactiver** passe l’appartenance à inactive, en conservant son rôle et ses réglages. Pour la réactiver, modifier explicitement `actif`. Elle figure dans le filtre des appartenances inactives ; elle n’est pas supprimée. **Dépublier** une relation conserve le texte et les notes MJ. Une relation dupliquée reçoit un nouvel identifiant et reste non publiée.

## Identités historiques et compatibilité

Les relations restent dans `characters[].relations` et les membres dans `groups[].members`. Aucune nouvelle collection ni copie métier n’est créée. Les formulaires utilisent le contrat Master 1 et `prepareMasterImport` / `applyMasterImport`, avec les validateurs, transactions, audits, réessais et permissions existants.

Les appartenances internes n’ont pas d’identifiant de ligne Master dans leur définition. La projection retrouve donc l’identifiant importé par l’empreinte du couple personnage/groupe, déjà conservée dans `masterRows` et `masterRowBaseline`. Les reçus courants remplacent leur version héritée. Le premier export d’une appartenance créée par l’ancien outil, sans reçu, reçoit un identifiant déterministe calculé côté serveur à partir de ce couple. Le premier import enregistre cet identifiant dans l’audit habituel ; aucun renommage préalable des données n’est effectué.

Le personnage propriétaire d’une relation et le couple d’une appartenance sont verrouillés lors d’une modification. Une nouvelle appartenance choisit un couple explicite ; le serveur refuse un doublon, même si un autre identifiant de ligne est fourni. Les anciennes importations globales restent compatibles.

En présence de plusieurs identifiants historiques pour la même appartenance, d’un reçu ancien sans empreinte d’appartenance ou d’une collision, l’éditeur signale le problème et bloque édition/export de cette feuille. Il ne choisit pas silencieusement une identité et ne supprime aucun reçu. Les outils de groupe et imports historiques restent disponibles ; la résolution de l’ambiguïté demande un travail ciblé ultérieur. Les relations portant un identifiant répété dans plusieurs fiches sont également signalées, comme les objectifs avant ce lot.

Les modifications de session restent limitées à la préparation initiale. Profils acquis, PV, objectifs non concernés, caisses, stocks et messages reçus sont conservés. Les identifiants, versions et réglages sociaux suivent l’épisode suivant. Il n’y a pas de changement d’authentification, d’accès privé ou de QR : les droits édités sont des permissions de jeu, pas des droits organisateurs ou Firebase.

Les quatre fichiers XLSX Campagne/Session, modèles et exemples, conservent leurs empreintes. Aucun changement de schéma, règle, index, workflow ou `.github/deploy-request.json`. Un retour au code L1d est possible sans migration de données ; il n’annulerait pas les modifications effectuées ensuite par l’organisateur.

## Validation exécutée

Contrôles locaux du **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **702 tests réussis**, aucun échec, annulation ou test ignoré.
- `npm run build` : réussi.
- Six nouveaux scénarios partagés mémoire/Firestore : accès et contrat ; cycle de vie des membres ; relations non réciproques ; identités natives et ambiguïtés ; conservation de session et passage à l’épisode suivant ; refus atomiques, concurrence et réessai.
- Quatre nouveaux tests de rendu/contrôleur : cases et retrait des droits ; identités verrouillées et dépublication ; diagnostic bloquant ; aperçu, correction et confirmation.
- Empreintes des quatre Masters historiques inchangées et contrôle des espaces du diff.

Sources : [suite métier](../test/support/master-social-editors-suite.mjs), [formulaires](../test/master-editors-ui.test.mjs), [contrôleur](../test/master-upload-ui.test.mjs). Les tests de sélection de feuilles existants sont adaptés aux deux nouvelles entrées. Le reste de la suite est également exécuté.

La CI Node 22 / Java 21 exécutera les tests applicatifs et les émulateurs sur le commit de cette tranche. Sa conclusion, le commit exact, les décomptes réels, l’heure et le lien du job seront consignés dans la PR après vérification des journaux. Les résultats du parent ne sont pas attribués à ce lot.

## Recette humaine à exécuter en environnement de test

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Naviguer entre les six feuilles Personnages, sur ordinateur et téléphone | Bonne feuille, destination et permissions d’édition | Non exécuté |
| Créer un membre puis régler les révélations et droits avec plusieurs comptes | Aucun accès implicite ; visibilité et actions conformes aux choix confirmés | Non exécuté |
| Désactiver puis réactiver un membre | Appartenance conservée ; accès retiré puis rétabli selon les règles | Non exécuté |
| Créer, dupliquer et dépublier une relation | Relation dans la bonne fiche uniquement, notes MJ privées | Non exécuté |
| Exporter un filtre, ouvrir dans Excel/LibreOffice puis réimporter | Identifiants historiques et contexte conservés, aperçu fidèle | Non exécuté |
| Préparer l’épisode suivant et ouvrir les espaces de groupe | Rôles, droits et relations repris ; acquis conservés | Non exécuté |
| Modifier depuis deux fenêtres et réessayer après coupure réseau | Révision périmée refusée ; absence de seconde écriture | Non exécuté |

Ces tests automatisés de rendu et de contrôleur ne constituent pas une recette visuelle. Aucune ouverture humaine Excel/LibreOffice, recette Android/iOS ou mesure de charge n’est revendiquée.

## Suite de L1

La création de lieux exige leurs actions et récompenses dans **le même import**, car le moteur refuse un lieu incomplet et protège les réserves d’un lieu déjà créé en session. La tranche suivante doit donc proposer un parcours groupé Lieux / ActionsTerrain / Recompenses et conserver les identités des lignes filles, plutôt que trois créations isolées invalides.

Attributions, dotations, interactions, paramètres, exports complets, comparateur et historiques consolidés restent également ouverts. Les exigences `[V]`, propositions `[P]` et arbitrages `[A]` du cadrage sont conservés ; aucun barème de jeu n’est fixé. Voir [L1](L1-ATELIER-MODULAIRE.md), [matrice V2](MATRICE-V2.md) et [stratégie](../AGENTS.md). Recette finale isolée, rapport global et procédure de déploiement restent à produire en fin de développement, avant toute autorisation de production.
