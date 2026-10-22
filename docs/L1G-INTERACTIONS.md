# L1g — Master des interactions entre personnages

Tranche du candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 22 octobre 2026 : `main` reste `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent de travail `a6ad693915f65519b3caa67265c961a53b6b6504`. Sa [CI L1f](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39788791616) a réussi : 713 tests applicatifs et 562 tests Firebase. Aucun déploiement.

## Parcours et règles réutilisées

Le module **Personnages** ajoute la feuille **Interactions** : recherche, consultation, création, modification, duplication en brouillon, archivage/réactivation et export filtré. Dix-sept parcours couvrent maintenant dix-neuf feuilles, Tarifs compris. L1 reste ouvert.

| Type existant | Réglages propres au formulaire |
| --- | --- |
| FIELD_CARE — soin de terrain | Expertise, niveau, PV rendus, niveau de réanimation, convalescence et récupération du patient |
| CLINIC_SAFE — clinique sûre | Expertise et durée ; résolution sans jet |
| CLINIC_FAST — clinique accélérée | Expertise, durée, seuil D6 et durée complémentaire après échec |
| LOOT_COMMON — fouille ordinaire | Pas de compétence principale ni de consommable ; durée et récupération de fouille |
| LOOT_METHODICAL — fouille méthodique | Expertise et niveau, durée et récupération de fouille ; aucun consommable |

Les instructions, prérequis supplémentaires, durées par niveau, PA, bonus d’objets et textes de résultat utilisent le contrat existant. Les prérequis supplémentaires sont sélectionnés par cases avec un niveau explicite. Les consommables supplémentaires et les durées par niveau utilisent les cellules textuelles du Master, avec leur format indiqué. Les bonus d’équipement n’interviennent dans le moteur que pour une résolution D6.

Les champs numériques actifs obligatoires sont laissés à renseigner, y compris zéro lorsque permis. Le moteur conserve ses règles : cliniques au maximum des PV, soin de terrain selon la quantité configurée, récupération personnelle nulle pour les soins. PA et récupération de fouille laissés vides utilisent les règles de session existantes. Ce lot ne fixe aucun barème définitif d’Outcasts ; les valeurs inactives conservées par le schéma historique ne constituent pas de nouveaux arbitrages `[A]`.

Changer un soin en fouille retire explicitement ses consommables ; choisir la fouille ordinaire efface la compétence principale. Revenir à un soin impose une récupération personnelle nulle. L’aperçu expose les changements avant toute confirmation. Le retour au formulaire conserve le motif et les valeurs saisies. Une duplication reçoit un nouvel identifiant et reste en brouillon. L’archivage dépublie le profil sans supprimer les actions passées.

## Compatibilité et limites

Les profils restent dans `personProfiles`. Le formulaire utilise `prepareMasterImport` / `applyMasterImport`, `personProfileInput` et les contrôles de références existants. Aucun effet de soin/pillage, service de compétences, compte, transaction, QR ou accès privé n’est recréé. Les acquisitions des personnages et leurs historiques ne sont pas exportés ni remplacés.

Les identifiants internes sont conservés et les versions suivantes viennent des reçus Master, y compris le socle hérité de campagne. Les modifications de session restent limitées à la préparation initiale ; après son lancement, le parcours devient en lecture/export seulement. Le passage à l’épisode suivant conserve les profils modifiés et leurs identités.

L’export contient **Meta + Interactions** des fiches affichées. Les compétences et objets référencés doivent déjà exister dans la destination ; ce n’est pas l’export complet du module Personnages. Les validateurs existants conservent leurs plafonds, leurs exigences de publication et le refus des doublons de consommables ou de prérequis. Seuls les cinq types actuels sont proposés : les effets futurs restent dans leurs lots métier.

Les quatre XLSX historiques sont inchangés. Aucun changement de schéma, règle, index, droit Firebase, workflow ou `.github/deploy-request.json`. Revenir au code L1f ne nécessite aucune migration, sans annuler les modifications de contenu réalisées ensuite par l’organisateur. Les décisions `[V]` et propositions `[P]` du cadrage restent inchangées.

## Validation exécutée

Contrôles locaux du **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **720 tests réussis**, aucun échec, annulation ou test ignoré.
- `npm run build` : réussi.
- Quatre nouveaux scénarios partagés mémoire/Firestore : cycle de vie et export des cinq types, conversions entre types, refus atomiques/concurrence/réessai, protection des acquis et continuité d’épisode.
- Deux nouveaux tests de rendu/sérialisation et un test de contrôleur : champs conditionnels, nombres explicites, prérequis, duplication, retour depuis l’aperçu et confirmation.
- Empreintes des quatre Masters inchangées et contrôle des espaces du diff.

Sources : [suite métier](../test/support/master-interaction-editors-suite.mjs), [formulaires](../test/master-editors-ui.test.mjs), [contrôleur](../test/master-upload-ui.test.mjs), [contrat de formulaire](../src/shared/master-interaction-editor.mjs), [validateur existant](../src/core/person-state.mjs).

La conclusion de la CI Node 22 / Java 21 avec les émulateurs sera inscrite dans la PR après lecture des journaux : commit testé, liens exécution/job, décomptes réels et date. Les résultats L1f ne sont pas attribués à L1g.

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Créer chacun des cinq types, corriger après aperçu puis confirmer | Champs adaptés, chiffres choisis explicitement et une seule écriture | Non exécuté |
| Passer d’un soin à une fouille puis revenir | Consommables et récupération cohérents dans l’aperçu | Non exécuté |
| Dupliquer, archiver et réactiver | Identités stables, copie non publiée, historique conservé | Non exécuté |
| Exporter dans Excel/LibreOffice, modifier et réimporter | Même destination, identifiants et références, contrôle préalable | Non exécuté |
| Essayer avec plusieurs comptes et sur Android/iOS | Propriétaire autorisé, autres rôles refusés, formulaire lisible | Non exécuté |
| Jouer une interaction sur données fictives puis préparer l’épisode suivant | Acquis conservés et nouveaux réglages repris | Non exécuté |

Les tests automatisés ne remplacent pas cette recette. Aucun essai humain, test de charge ou déploiement n’est revendiqué.

## Suite de L1

Attributions et Dotations demandent un parcours de création de personnage groupé : une dotation est immuable et exige un personnage créé dans le même import ; en session, une attribution importée exige également un nouveau personnage. Leurs éditeurs ne doivent pas devenir un moyen de redistribuer les acquis. Paramètres, exports complets, comparateur et historiques consolidés restent aussi à compléter. Voir [L1](L1-ATELIER-MODULAIRE.md), [matrice V2](MATRICE-V2.md) et [stratégie](../AGENTS.md). Recette finale isolée, rapport global et procédure de déploiement restent prévus en fin de développement, avant toute autorisation de production.
