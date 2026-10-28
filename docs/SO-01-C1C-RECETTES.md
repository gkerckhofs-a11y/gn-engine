# C1c — Recettes dans le brouillon central

24 octobre 2026. Tranche additive de C1, candidat 0.37.0, branche de livraison `work/l1-modular-workshop`, PR #1. Concerne seulement les nouvelles préparations C1a sans version publiée. Aucune adoption de campagne historique.

## Reprise et sources

- Main distant `03eaace155b052d1b7d1960347746e9ee60ed514` ; branche/PR #1 en brouillon, tête `6c0027e5c34eaa688aae453f98b3285a3d7c4a6c`. CI de cette base : runs 40043661037 et 40043665062 terminés avec succès, workflow `check.yml`. Les preuves détaillées de C1b sont conservées dans [l'historique de PR](PR-1-HISTORIQUE-AVANT-C1C.md).
- Checkout C1b `2fae4a3`, arbre `0f444b9e3e1f4d8168bd70bf7bfc842f1bd49ef6`, identique à la tête distante. Worktree isolé pour éviter toute modification du checkout précédent ; le nouveau commit distant conserve C1b comme parent.
- Références : [CDC V3.5 §§3.4–3.7](source/SO_CDC_V35.md), [règles V0.7, TOXI-01](source/SO_Regles_V07.txt), [vade-mecum](source/SO_Vademecum_V01.txt), [rapprochement des sept gabarits](SO-00-V34-GABARITS.md), [plan central](SO-00-V34-PLAN-CENTRAL.md) et [C1b](SO-01-C1B-BROUILLON.md).
- L'import historique SO-06b, `recipeInput` et `validateRecipeItem` sont réutilisés, pas remplacés. Les gabarits V0.1 restent non certifiés ; aucune nouvelle recette, composition, prix ou règle canonique n'est inventé.

## Parcours disponible

1. Ouvrir le Master central d'une préparation puis M4 Recettes & Potions.
2. Créer une formule à ID stable : nom, description, type, niveau, produit M1, composition, références préparatoires et notes privées.
3. Avec lecture M1, les suggestions utilisent les modèles du même brouillon et montrent leur ID, nom, statut, révision et provenance. Les notes M1 ne sont pas copiées dans M4. Sans ce droit, seuls les IDs saisis dans la recette sont visibles.
4. Une référence valide syntaxiquement peut être enregistrée avant sa définition M1. Le rapport indique le champ, la recette, l'identifiant manquant et la correction possible. Créer/corriger/restaurer M1 actualise ce diagnostic sans réécrire M4.
5. Modifier, archiver et restaurer créent une révision auditée. Un double clic ou une réponse perdue retrouve le reçu ; deux changements concurrents requièrent un rechargement explicite.

Les formules restent privées et DRAFT. Aucun lot, dose, stock, crédit, PA, XP, QR actif ou connaissance n'est produit. La saisie d'un effet reste une référence préparatoire, jamais du code ni une règle active.

## Contrat, droits et limites

| Besoin | Implémentation | Limite explicite |
|---|---|---|
| Brouillon commun M1/M2/M4 | `masterDrafts/initial`, révision et historique existants | Base vide seulement ; cycle publié/rebasé refusé |
| Modèle natif de recette | `changes/recipe_{id}`, atelier M4, `recipeInput` | 250 formules, archives comprises ; 20 composants distincts |
| Références sans duplication | Projection transactionnelle des changements M1 | Aucun catalogue d'ingrédients ni seed parallèle |
| Validation structurelle | Champs autorisés, IDs, quantités, niveau, composants | Pas de publication ni import central |
| Diagnostics M1 | Absent, archivé, consommable, recharge laser, quantité individuelle | Rapport local seulement ; jamais une certification C2 |
| Références non raccordées | Compétence, effet, lieu, connaissance conservés avec alerte | Aucun rapprochement automatique avec un code V0.7 |
| Autorité de campagne | Édition M4 exige lecture M4 ; lecture M1 distincte | MJ/Accueil de session sans droit central implicite |
| Confidentialité | Sans lecture M1, aucune consultation de ses changements ; `REFERENCE_NOT_CHECKED` identique pour lien existant ou absent | Aucune révélation d'existence, nom ou état M1 |
| Audit/reprise | Auteur, date, motif, avant/après, source WEB et révisions | Pas d'effacement ni restauration de ledger |

Le schéma des anciennes délégations M1 reste valide. Les lecteurs M1, M2 et M4 n'obtiennent que leurs changements/historiques autorisés. Le propriétaire gère les délégations ; aucun droit de publication n'est ajouté. L'autorité et le cycle sont revérifiés avant restitution d'un reçu.

Le rapport conserve `workshop`, `entityId`, `field`, `reference`, `source`, `draftRevision`, code et correction. Les liens vers les ateliers non raccordés restent explicitement en attente. Une formule archivée n'émet plus de diagnostics actifs ; sa restauration relance leur calcul. L'archivage d'un modèle M1 encore référencé est visible comme anomalie dans le brouillon ; C2 devra refuser toute publication incohérente. Aucun impact sur un inventaire joué n'est possible dans cette tranche.

## Vérification réellement exécutée

En local : Node **24.22.1**, npm **11.9.0**.

- **908 tests applicatifs réussis**, zéro échec, annulation, ignoré ou TODO : [journal](verification/so-c1c-npm-test.log).
- **Build réussi** : [journal](verification/so-c1c-build.log).
- **14 nouveaux cas métier**, partagés avec la suite Firestore : M4 avant M1, M1/M2 avant M4, résolution sans copie, incompatibilités/archives, cloisonnement, révocation avant reçu, concurrence M1/M4 et entre éditeurs, réessai, interruption avant commit, restauration, injections, cycle et limites.
- **Quatre rendus UI** : droits, échappement, révisions, sélecteur/provenance, boutons d'ajout/retrait sans soumission, composants incomplets conservés pour rejet serveur, prix nul distinct de zéro.
- **Un nouveau HTTP/Auth** raccordé aux émulateurs : route M4 réelle, authentification, droits distincts, références différées, réessai, révocation, absence de ressources. Syntaxe vérifiée localement ; exécution effective à confirmer par CI.
- `git diff --check` et empreintes des quatre Masters vérifiés. Aucun workflow, règle/index Firebase, marqueur de déploiement, dépendance ou Master historique modifié.

Firebase local **non exécuté**, Java 17 disponible ; CI du dépôt utilise Java 21. Résultats définitifs du commit exact à consigner dans la PR après terminaison. Ne pas substituer la CI C1b aux tests C1c. Aucune recette navigateur/mobile : le runtime Playwright local est présent mais son exécutable Chromium est absent. Les tests de rendu ne valent pas un essai interactif Android/iOS.

## Compatibilité et suite

Sauvegarder les changements recettes avec le header, le brouillon commun, l'historique, les délégations et reçus, ainsi que les admissions/préparations associées. Le XLSX historique seul ne sauvegarde pas cet état. Un rollback vers C1b ignore M4 et ses délégations : conserver un lecteur compatible ; aucune restauration d'infrastructure n'a été exécutée.

SO-GAP-12/13 restent partiels. Aucun des 55 scénarios complets n'est certifié. La démonstration M1/M4/M5 activée exige encore M5, le moteur TOXI et C2. Prochaines dépendances : autres types et adaptateurs du brouillon/import central → contrôle global/publication C2 → approbation vers personnage M2 I3 → naissance I4 → décès/relève I5. Les lectures I1 devront être adaptées explicitement au cycle publié.

Aucun merge, déploiement, workflow de déploiement, migration ni accès aux données de production. La [procédure de mise en service](SO-SAUVEGARDE-DEPLOIEMENT.md) reste à faire valider.
