# C1d — Excel dans le brouillon central M1/M4

24 octobre 2026. Candidat 0.37.0, branche de livraison `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Développement additif pour les nouvelles préparations C1a, sans base publiée ; aucun déploiement ni migration.

## Base vérifiée et sources

Main : `03eaace155b052d1b7d1960347746e9ee60ed514`. Branche distante et PR ouverte en brouillon : `b7217acf843b66619637dbbe3063a1a8f4aaeb4a`, arbre `5279be8129772bf4f559091a941927398f451807`, identique au checkout C1c `fae2f784c6aff0936f8d806144bf104efdb80009`. CI C1c réussie : push [40074594801](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40074594801), job 120815147589 ; PR [40074597559](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40074597559), job 120815156759. Chaque exécution : 908 tests applicatifs, 711 Firebase et build réussis, aucun échec/annulation/ignoré/todo. [Description précédente conservée](PR-1-HISTORIQUE-AVANT-C1D.md).

Références : [CDC V3.5 §§3.4–3.8](source/SO_CDC_V35.md), [règles V0.7](source/SO_Regles_V07.txt), [vade-mecum](source/SO_Vademecum_V01.txt), [audit des sept gabarits](SO-00-V34-GABARITS.md), [plan central](SO-00-V34-PLAN-CENTRAL.md), [C1b](SO-01-C1B-BROUILLON.md) et [C1c](SO-01-C1C-RECETTES.md). Aucune nouvelle composition, règle, prix ou correspondance canonique n'est inventé.

## Parcours livré

1. Ouvrir M1 ou M4 d'une préparation. Le lecteur de l'atelier peut exporter une sélection de définitions ; sans sélection, le fichier est un gabarit vide lié à la campagne et à la révision actuelle.
2. Modifier ce fichier dans un tableur. Une ligne porte un ID durable, une opération explicite et la révision attendue de la définition. Les notes privées font partie de l'export ; l'interface le signale.
3. Avec le droit d'édition de l'atelier, choisir le fichier et afficher l'aperçu. Aucun changement du brouillon n'est écrit à cette étape. L'aperçu montre les champs avant/après, les lignes inchangées, erreurs localisées et diagnostics de références.
4. Vérifier les différences, renseigner un motif et cocher la confirmation. Le serveur revalide les droits, le cycle, la révision globale, les révisions des définitions et l'empreinte de l'aperçu. Le lot est intégralement accepté ou refusé.
5. Les changements utilisent `items`/`recipes` natifs dans le même `masterDrafts/initial` que l'éditeur web et le catalogue narratif I1 M2. Chaque définition modifiée reçoit une révision ; le lot partage une seule nouvelle révision globale. Un aller-retour identique ne crée aucune nouvelle révision métier.

L'aperçu et le fichier en attente sont abandonnés à la fermeture, navigation, déconnexion ou sortie de page. Les réponses tardives de lecture ne réouvrent pas un dialogue fermé. Le requestId de confirmation reste stable pendant le réessai du formulaire ; il ne passe pas dans le cache général de commandes. La recette sur navigateurs réels reste à exécuter.

## Contrat central v1, distinct des Masters historiques

`Meta` contient une seule ligne :

| Champ | Valeur / sens |
|---|---|
| format | `gn-engine-central-draft` |
| version / schema_version | `1` / `1` |
| type | `CENTRAL_DRAFT` |
| campaign_id | Campagne C1a exacte |
| scenario_id / central_base_version | Vides : aucun scénario historique ni base publiée adoptés |
| rule_profile | `SPACE_OUTLAWS_V07`, marqueur de préparation, pas certification du profil complet |
| draft_id / draft_revision | `initial` / révision commune attendue |
| module_type | `M1` ou `M4` |
| import_batch_id | Nouvel ID généré à chaque export, stable pendant la préparation et les réessais de ce fichier |

Un fichier contient `Meta` et uniquement `Objets` (M1) ou `Recettes` (M4). Les colonnes sont définies dans `src/shared/central-import-schema.mjs` : reprise des colonnes natives, remplacement de `version` par `revision`, exclusion de `publication` et des médias non pris en charge. Tout champ/onglet étranger, même vide, est refusé. Les sept fichiers documentaires V0.1 et les contrats historiques CAMPAGNE/SESSION ne sont pas convertis implicitement. Les deux noms `version` et `schema_version` sont vérifiés : version du format et version du schéma métier, toutes deux initiales ici.

| Intention | Syntaxe |
|---|---|
| Nouvelle définition | `CREER`, ID libre valide et `revision=0` |
| Modification | `MODIFIER`, définition active existante, révision exacte |
| Archivage | `ARCHIVER`, seulement id/operation/revision, définition conservée |
| Restauration | `RESTAURER`, définition archivée existante ; champs facultatifs modifiables |
| Ne pas toucher une valeur | Cellule vide ; ligne absente ne supprime rien |
| Vider un champ facultatif | `!EFFACER` ; interdit pour un champ obligatoire |
| Texte commençant par ! | Doubler le premier ! ; l'export le fait automatiquement, y compris pour le texte littéral `!EFFACER` |
| Booléens | `OUI` / `NON` |
| Composants M4 | `identifiant:quantité;autre:quantité`, mêmes limites natives et unicité |
| Types M1 / légalité | `STACKABLE`, `INDIVIDUAL` / `UNSPECIFIED`, `LEGAL`, `ILLEGAL` |
| Types M4 | `ANTIDOTE`, `MALAISE`, `SCENARIO` |

Une définition archivée s'exporte avec ARCHIVER et sans champs métier : la réimporter ne la restaure pas. Les contenus commençant par =, +, - ou @ restent des chaînes littérales Excel. Formules exécutables, macros, liens externes, entités XML et archives hors limites restent refusés par le lecteur partagé.

Limites : 100 lignes métier par lot, 1 Mio de contenu, 8 Mio de fichier compressé et 16 Mio décompressés ; 250 définitions par atelier, archives comprises. Aucune troncature silencieuse : sélectionner moins de définitions si l'export dépasse les limites. Ce fichier ciblé ne constitue pas une sauvegarde globale.

## Transaction, confidentialité et reprise

- `exportCentralDraft` exige la lecture de l'atelier. `prepareCentralImport` et `applyCentralImport` exigent également son édition. Le rôle MJ/Accueil de session ne donne aucun droit implicite.
- Le garde C1a/C1b et les droits actuels précèdent toute restitution de reçu. Une confirmation est liée à l'auteur, au contenu normalisé, au nom de fichier, aux droits/révision de délégation, à la campagne/session et au brouillon. Une modification M1, M2 ou M4 impose de réexporter ou de reconstituer explicitement un aperçu valide.
- `operations` conserve le reçu par auteur/requestId. `masterDrafts/initial/imports/{sha256(import_batch_id)}` conserve schéma, empreinte du contenu normalisé, résultat, auteur, requestId, date, nom et motif. Même lot/contenu avec un nouveau requestId ou un nom différent : résultat initial, sans réapplication après des éditions ultérieures. Même ID de lot avec contenu divergent : refus.
- Les changements et historiques gardent l'avant/après, `source=XLSX`, auteur, date, requestId, version de schéma et provenance fichier/feuille/ligne/lot. Les dernières modifications visibles affichent cette provenance. Un lot inchangé enregistre seulement son reçu, sans révision artificielle du brouillon.
- Toutes les lectures précèdent les écritures Firestore. Un lot de 100 modifications produit au maximum 204 écritures ; aucun stock, crédit, dose, PA, XP, instance, QR actif, seed historique ou version publiée n'est créé.
- M4 conserve les références valides syntaxiquement mais encore manquantes. Sans lecture M1, aucune requête vers ses changements et aucun renseignement d'existence/nom/état ; `REFERENCE_NOT_CHECKED`. Avec lecture M1, contrôles natifs de consommable, archive, recharge et quantité. Les diagnostics des lignes importées indiquent fichier, feuille, ligne et colonne lorsqu'identifiables. Ce contrôle local n'est pas le contrôle global C2.

## Vérifications réellement exécutées

Local : Node 24.22.1, npm 11.9.0. `npm test` : **933 tests réussis**, aucun échec/annulation/ignoré/todo. `npm run build` : réussi. `git diff --check` et empreintes des quatre Masters : conformes. Logs dans `docs/verification/c1d-npm-test.log` et `c1d-build.log`.

Nouveaux tests : 21 cas métier exécutés en mémoire et inscrits à la suite Firestore ; trois rendus UI et un cas de sécurité XLSX ; un parcours HTTP/Auth ajouté pour l'import >128 Ko, confirmation, réessai et révocation. Cas métier : XLSX réel, 100 lignes atomiques, aucune ressource créée, no-op, lot répété après édition, droits et cycle avant reçu, concurrence avec édition/M2, défaillance transactionnelle, métadonnées, doublons, limites, références privées, archives/restauration, effacement et chaînes littérales.

Les tests Firebase ne sont pas déclarés exécutés localement : Java 17 ici, workflow Node 22/Java 21. Les résultats CI définitifs doivent être constatés sur le SHA exact et consignés dans la PR après terminaison (push et PR, décomptes, jobs et versions). Aucun nouveau commit ne doit hériter des résultats d'un ancien SHA. Aucun navigateur réel, Android/iOS, charge ou exercice complet de sauvegarde/restauration exécuté pour ce lot.

## Compatibilité et suites

Les quatre fichiers historiques sont inchangés (SHA-256) :

- Exemple Campagne : `4153682948869ab96568acc463d8c3fd28cba46adcd838065d6debe0865d8a67`
- Exemple Session : `823fc93ec6cbbf86fbca368452aff587286d2a90031a362aa883b6941328dc96`
- Master Campagne : `09fc513f054444170d08a4c8ed4a21244b12ac442ebfce51479090e4b23d394a`
- Master Session : `d1ba99664a227a54faf6522e10f4943f9144b5cffd0b2ab9b1b97b11a3bb856b`

Le lecteur/écrivain ZIP/XML est paramétré par schéma sans modification des anciens contrats. Les suites historiques d'import/export restent exécutées. Les gabarits V0.1 complets, autres ateliers, médias, version publiée/rebasage, contrôle global/publication C2, fabrication, personnages M2/I3, naissance/I4, relève/I5 et recette humaine restent incomplets. Aucun des 55 cas complets n'est requalifié en succès.

Sauvegarder ensemble campagne, brouillon/changements/historiques/reçus d'import, délégations et opérations, préparation et admissions. Un export ciblé de définitions ne contient ni historique, ni délégations, ni reçus ; le réimport n'est pas une restauration complète. Aucun rollback vers un lecteur ignorant ce cycle, aucune conversion/migration et aucune modification de `.github/deploy-request.json`. Conserver la branche/PR après validation automatique ; la mise en service exige toujours une autorisation explicite distincte.
