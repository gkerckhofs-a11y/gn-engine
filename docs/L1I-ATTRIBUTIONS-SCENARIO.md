# L1i — Attributions du scénario

Candidat **0.37.0**, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Reprise du 22 octobre 2026 : `main` reste `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), parent de travail `e75408fa3c17aba30ad235ca454343b7f8046601`. Sa [CI L1h](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39802725928) est réussie : 727 tests applicatifs et 570 tests Firebase.

## Parcours

Personnages propose **Attributions du scénario** : rechercher, consulter, créer un profil pour une fiche sans profil, modifier la classe et les ajustements, dépublier/réactiver, exporter les lignes filtrées. Le personnage reste verrouillé après création. Aucune duplication d’attribution.

Les classes et compétences proposées sont publiées. Les niveaux sont positifs et explicitement renseignés. Les compétences non ajustées de la classe restent conservées ; pour un profil entièrement personnalisé, choisir aucune classe. La publication au joueur est désactivée à la création.

L’aperçu puis la confirmation réutilisent les imports existants. **Confirmer recalcule le profil à partir des catalogues actuels**, comme un import Attributions historique : les différences doivent être relues, notamment si la classe ou les compétences ont changé depuis l’attribution précédente. L’export contient Meta + Attributions et les choix de configuration, pas une sauvegarde autonome des anciens instantanés de compétences.

## Identités et compatibilité

Les reçus Attributions sont rapprochés du personnage avec leur identité historique. Leur identifiant et version sont conservés. Un profil issu d’un ancien outil, sans reçu Master, reçoit une identité déterministe lors de la projection ; aucun enregistrement n’est écrit avant confirmation. Plusieurs reçus pour la même identité, une collision ou un reçu sans identité bloquent ce parcours sans renommage.

L’outil métier d’attribution peut représenter des retraits de compétences avec niveau zéro, que le contrat Master actuel n’accepte pas. Ces profils sont signalés et bloquent l’édition/export Attributions, afin de ne pas perdre les retraits. L’outil dédié reste utilisable. Aucun changement du contrat ni migration dans ce lot.

La feuille est proposée **uniquement en scénario** ; une demande directe de cet espace en session est refusée côté serveur. Les profils acquis des sessions restent dans les outils MJ existants. La création groupée L1h reste disponible pour les nouveaux personnages de session. Les règles historiques d’import continuent à protéger leurs acquis.

Les attributions restent dans `characters.abilityProfile`, les reçus dans `masterRows`. Pas de collection parallèle, de modification de schéma, d’accès privé, de règle/index/droit Firebase, de workflow ou de demande de déploiement. Les quatre Masters XLSX sont inchangés. Aucun barème définitif Outcasts introduit ; décisions [V], propositions [P] et arbitrages [A] inchangés.

Dix-huit parcours couvrent désormais vingt feuilles en édition/export ciblé, Attributions étant réservé aux scénarios. Dotations reste disponible en création groupée. Paramètres, restitution des dotations initiales, exports complets, dépendances, comparateur et historiques consolidés restent ouverts. L1 n’est pas terminé.

## Contrôles exécutés

Le 22 octobre 2026, Node **24.19.0** :

- `npm test` : **732 tests réussis**, aucun échec, annulation ou test ignoré.
- `npm run build` : réussi.
- Quatre nouveaux scénarios partagés mémoire/Firestore : cycle d’édition/export et conservation d’une session existante ; création et refus atomiques ; identité historique et ambiguïtés ; concurrence et réessai.
- Un nouveau test de formulaire : personnage verrouillé, choix guidés, export ciblé et exclusions en session.
- Empreintes des quatre Masters, liens documentaires et espaces du diff contrôlés.

Sources : [projection](../src/core/master-attribution-projection.mjs), [suite partagée](../test/support/master-attribution-editors-suite.mjs), [interface](../test/master-editors-ui.test.mjs), [imports existants](../src/core/masters.mjs). Résultats CI définitifs à consigner dans la PR après lecture des journaux : commit, exécution/job, versions, décomptes et date. Les résultats L1h ne sont pas attribués à L1i.

## Recette humaine prévue, non exécutée

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Créer puis modifier une attribution | Aperçu exact et confirmation avant écriture | Non exécuté |
| Changer un catalogue puis réouvrir l’attribution | Différences du profil recalculé visibles avant confirmation | Non exécuté |
| Dépublier puis réactiver | Identité conservée, visibilité explicite | Non exécuté |
| Exporter/réimporter avec Excel ou LibreOffice | Références et versions vérifiées | Non exécuté |
| Ouvrir une session existante après modification du scénario | Profil acquis conservé | Non exécuté |
| Tester les rôles, téléphones et historique ambigu | Refus appropriés et message exploitable | Non exécuté |

Aucune recette humaine, charge réelle, fusion ou publication exécutée. La recette finale isolée, le rapport global et la procédure de déploiement restent prévus en fin de développement.
