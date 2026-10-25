# C2q — Excel des informations et lieux M6

## Parcours et choix du contrat

C2q étend le service d’import central existant, ses commandes `exportCentralDraft`, `prepareCentralImport` et `applyCentralImport`. L’auteur exporte une sélection de définitions M6 ou un gabarit vide, prépare le fichier, lit les différences et diagnostics, puis confirme avec un motif. Informations et lieux d’un même lot sont enregistrés dans une transaction et une révision communes. Aucun catalogue, importeur de session ou service terrain parallèle n’est créé.

Le format reste `gn-engine-central-draft`, `version=1`. **Le schéma M6 2 est un choix technique explicite** : profils et récompenses restent des structures JSON natives complètes, comme les tableaux des autres imports centraux. Cela permet de conserver IDs, ordre et paramètres sans inventer de règles de fusion entre sous-lignes. L’éditeur web C2p permet de préparer ces structures avant export. Les feuilles documentaires V0.1 ou historiques ActionsTerrain/Recompenses ne sont pas automatiquement converties ni certifiées.

| Contrat | Feuilles obligatoires | Sélection API d’export |
|---|---|---|
| M6 `schema_version=1` | Meta, Informations | ID métier nu ; un ID commençant par `fieldTarget_` reste un ID d’information |
| M6 `schema_version=2` | Meta, Informations, Lieux, même vides | `knowledge_{id}` et `fieldTarget_{id}` ; IDs nus dans les cellules |
| Autres ateliers | Schéma 1 et feuilles existantes | Inchangé |

L’API d’export sans `schemaVersion` continue à produire le schéma 1. L’interface demande explicitement 2 pour M6 et 1 ailleurs. L’aperçu choisit le contrat depuis `Meta.schema_version`, rejette les versions/feuilles/colonnes étrangères et conserve la provenance exacte. Aucun ancien ID n’est réinterprété ; une information et un lieu homonymes restent distincts. Un lot M6 schéma 1 conserve les lieux et recalcule leurs liens, y compris leur provenance XLSX 2.

## Feuille Lieux

| Colonnes | Contenu |
|---|---|
| `id`, `operation`, `revision` | Identité native, CREER/MODIFIER/ARCHIVER/RESTAURER, révision attendue |
| `nature`, `titre` | SEARCH ou INSTALLATION, titre obligatoire |
| `description`, `notes_mj` | Textes privés ; effaçables explicitement |
| `profils_json` | Objet natif complet : SEARCH, ou SABOTAGE et REPAIR |
| `recompenses_json` | Tableau complet avec IDs stables ; 1–20 propositions pour une fouille, [] pour une installation |
| `dependance_installation_id` | Référence facultative d’une fouille vers une installation ; jamais elle-même |
| `indisponibilite_secondes`, `verrou_echec_secondes`, `protection_reparation_secondes` | Entiers explicites à la création, limites natives conservées |

Les profils et récompenses réutilisent `centralFieldTargetInput`, `fieldTargetInput` et `fieldProfile`. Les listes de champs imbriqués sont strictes : aucun compte, état courant, privilège, stock joué, publication ou code QR injecté. Les paramètres restent proposés ; aucune nouvelle valeur canonique n’est déduite du classeur.

Cellule vide = conserver ; `!EFFACER` retire un champ facultatif ; `!!` permet un `!` littéral. JSON renseigné = remplacement complet de la structure, sans fusion implicite. Une installation doit avoir une liste vide ; vider les récompenses d’une fouille reste invalide. Changer de nature exige des structures compatibles. Pour archiver, seuls id/operation/revision sont autorisés. La restauration est explicite et conserve les identifiants imbriqués ; une ligne absente ne supprime rien. Un aller-retour inchangé ne modifie pas la révision ni la provenance de la définition.

## Droits, cohérence et diagnostics

Lecture M6 pour exporter ; lecture et édition M6 pour aperçu/confirmation. Autorité et cycle courants sont vérifiés avant reçus de commande et de lot. Réessais identiques après retouche restituent le résultat historique sans écraser la retouche ; réutilisation d’un ID avec un contenu différent refusée. Confirmation liée au compte, aux droits, à la campagne/session, à la révision commune, au fichier, aux différences et diagnostics.

Les références sont calculées sur l’état proposé des deux feuilles : une fouille peut référencer une information ou installation créée dans le même lot. M1/M2 ne sont consultés qu’avec leurs lectures indépendantes ; sinon, aucune requête ni révélation d’existence/archive. Les diagnostics de lieux sont localisés dans `profils_json`, `recompenses_json` ou la colonne concernée. Les définitions non importées gardent leur provenance ; aucun numéro de ligne n’est inventé pour une définition WEB.

Le contrôle global reconnaît strictement la provenance schéma 2 uniquement dans M6, avec le couple type/feuille attendu. Empreinte interne **15** ; relancer le contrôle. Les captures C2n conservent données, provenance et rapport ; les captures historiques restent relues sans recalcul. `FIELD_RULES_PENDING`, `FIELD_REWARD_SOURCE_PENDING` et `LABORATORY_AUTHORIZATION_PENDING` restent applicables. Aucun `fieldState`, stock, réserve, compte, crédit, PA, action, QR, attribution ou habilitation n’est créé.

## Bornes et reprise

- **100 lignes métier cumulées**, **1 Mio** de contenu, **32 000 caractères par cellule**, sans troncature ; refus explicite et éditeur web pour les structures plus volumineuses.
- **100 lieux / 250 informations**, archives comprises ; **96 Kio** par définition, bornes natives 20 récompenses/20 bonus/20 durées conservées.
- Contrôle global **1809 changements / 16 Mio sources / 4 Mio rapport**. Captures **6 Mio / 100 pages**, budgets et empreinte I3c inchangés.

Préserver ensemble lieux, informations, références, droits, brouillon, historiques, lots importés, reçus et captures/pages. Le XLSX ciblé et le JSON de capture ne sont pas une restauration complète. Retour C2p non équivalent : il refuse les nouveaux fichiers et provenances 2 ; aucune suppression, rétroconversion ou migration automatique. Les quatre Masters CAMPAGNE/SESSION, gabarits V0.1 et sources canoniques sont conservés.

La conformité canonique des compétences/actions/effets, les sources réelles des récompenses, habilitations/QR, publication/version activable, naissance et relève restent à développer. C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts. Aucun déploiement, fusion main, migration/adoption, règle/index/IAM ou marqueur de production modifié.

## Validation

Le **25 octobre 2026 (Europe/Brussels)** : compilation et **1477/1477 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo. Node **24.22.1**, npm **11.9.0**. **18 nouveaux cas métier partagés mémoire/Firestore, trois UI et un HTTP/Auth**. Intégrations vérifiées syntaxiquement ; Firebase non exécuté localement (Java **17.0.20**). Preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), après lecture de leurs journaux intégraux et avant clôture, sans commit de preuve supplémentaire.

Couverture : vrais XLSX, versions et homonymes, aller-retour natif des deux natures, effacement, changement de nature, archive/restauration, schéma 1 après schéma 2, JSON/champs injectés, paramètres obligatoires, autorité/confidentialité, confirmation liée aux droits, reçus/révocation, concurrence M1/M6, interruption atomique, limites, provenance et captures. UI : sélection, câblage du schéma, aide, échappement et aperçu/confirmation ; HTTP/Auth : comptes séparés, refus anonymes/étrangers, lot atomique, anciens exports, réessais et révocation. Aucune recette visuelle navigateur, mobile, terrain, charge ou restauration globale revendiquée.

La seule attente historique adaptée concerne les diagnostics d’une définition WEB non importée : ligne `null` et fichier vide, sans fausse localisation. Les autres suites historiques passent. [Preuves finales C2p archivées](PR-1-HISTORIQUE-AVANT-C2Q.md) : push 40189590975 et PR 40189594014, **1456 applicatifs et 1179 Firebase/HTTP** chacun, sur `204d4e53c837222df201b5ea9bb97af05ec83b89`.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.3–3.8 : propriété, références, brouillon commun, format versionné, import distinct de publication.
- [Livre V0.7](source/SO_Regles_V07.txt), « Fouilles de lieux et informations » : réserve réelle et attribution unique à raccorder ; aucune création de stock par définition.
- [Gabarits V0.1](SO-00-V34-GABARITS.md), M6 : réutiliser les cibles natives ; les feuilles proposées restent documentaires.
- [Vade-mecum V0.1](source/SO_Vademecum_V01.txt), §§2–7 : une source, IDs stables, préparation et droits séparés du jeu.
- [C2p](SO-02-C2P-LIEUX-CENTRAUX.md), [C2k](SO-06-C2K-EXCEL-INFORMATIONS-MISSIONS.md), [C2n](SO-02-C2N-INSTANTANES-CENTRAUX.md) : définitions natives, import central, conservation des instantanés.
