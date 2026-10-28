# C2p — lieux, fouilles et installations dans le brouillon M6

## Parcours livré

M6 prépare désormais les lieux natifs `fieldTarget` : une fouille avec son profil SEARCH et ses récompenses proposées, ou une installation avec ses profils SABOTAGE et REPAIR. L’auteur renseigne les paramètres, textes privés, références, quantités et plafonds ; il enregistre, consulte, modifie, archive ou restaure la définition avec un motif. Le formulaire réutilise les libellés et bornes de l’éditeur terrain existant ; le serveur réutilise `fieldTargetInput` et `fieldProfile`.

Il n’existe aucun nouveau catalogue parallèle de lieux. Ces définitions sont des changements M6 du même brouillon, sous `masterDrafts/initial/changes/fieldTarget_{id}` ; les instances historiques restent dans leurs collections natives. Le type et l’ID restent distincts d’une information homonyme. Une définition ne crée aucun `fieldState`, réserve, découverte, objet, crédit, PA, QR, action ou autorisation de laboratoire.

| Commande | Entrées |
|---|---|
| `saveCentralFieldTarget` | `campaignId`, `fieldTargetId`, `draftRevision`, `fieldTargetRevision`, `fieldTarget`, `reason`, `requestId` |
| `archiveCentralFieldTarget` | mêmes identifiants et révisions, motif et reçu ; aucun contenu de remplacement |

La définition n’accepte que `kind`, `title`, `description`, `gmNotes`, `profiles`, `rewards`, `dependencyId`, `offlineSeconds`, `failureLockSeconds` et `repairProtectionSeconds`. Les profils, bonus et consommables ont des listes de champs autorisés strictes. Une récompense conserve son identifiant, sa nature, les quantités proposées et la référence correspondante ; une référence d’une autre nature non vide est refusée. Publication, révision injectée, état courant, compte, code public et habilitation de laboratoire ne font pas partie de cette entrée.

Lecture/édition M6 et cycle initial sont contrôlés par le service central existant. Révision commune et révision native du lieu empêchent les écrasements ; définition, audit avant/après et reçu sont atomiques. Autorité et cycle courants sont revérifiés avant restitution d’un reçu historique. Un réessai n’annule pas une retouche ou une archive. L’archive conserve le contenu et exclut ses liens sortants ; les consommateurs restent inchangés et signalent la cible archivée. La restauration est une nouvelle édition motivée.

## Liens et confidentialité

Les références peuvent précéder leur cible dans le brouillon. Le contrôle local et global distingue cible absente, archivée et invalide. Une dépendance de fouille exige une installation native, et non un autre type de lieu ; l’autoréférence est refusée. Les objets consommables et quantités individuelles suivent les contraintes natives. Les profils de compétence et leur conformité V0.7 restent non raccordés.

M6 contrôle ses références locales vers informations et installations. Il consulte M1 pour les bonus, consommables et récompenses seulement si lecture M1 accordée ; sans ce droit, aucune requête M1 ni révélation de nom, existence ou archive. Les autres lectures M6 vers M2 conservent leur garde indépendante. Aucune admission n’est consultée pour ces liens.

Les ports M3, recettes M4 et boutiques M5 référencent ce même lieu M6. Lecture M6 indépendante obligatoire avant requête ; sinon `REFERENCE_NOT_CHECKED`, catalogue vide et saisie de l’identifiant convenu. Les suggestions autorisées exposent uniquement ID, titre, nature, archive, révision et source. Elles ne renvoient ni description, notes MJ, profils, textes de réussite ou récompenses privés. Retirer la lecture M6 retire immédiatement les suggestions.

Résoudre `laboratoryTargetId` signifie uniquement que le lieu existe. `LABORATORY_AUTHORIZATION_PENDING` reste affiché : habilitation du laboratoire et QR de fabrication sont encore à développer. Tous les lieux actifs conservent `FIELD_RULES_PENDING` ; les fouilles conservent `FIELD_REWARD_SOURCE_PENDING`. Les paramètres numériques et stocks proposés ne sont ni des barèmes V0.7 certifiés, ni des réserves financées, ni des effets exécutables. Aucun laboratoire, sabotage, réparation ou fouille de session n’est activé par ce lot.

Le contrôle global inclut les arêtes typées, archives et corruptions. Son résumé affiche les titres, identifiants, noms des champs et références, jamais les textes privés des profils. Empreinte interne portée de **13 à 14** ; relancer les contrôles après mise à jour. Le rapport reste partiel avec `publicationAvailable=false`.

## Imports et captures

Excel M6 reste limité aux **informations**. La table d’import ne contient que les types du contrat importé ; un lieu et une information homonymes ne se masquent pas. Un import ou archivage d’information conserve les lieux, recalcule leurs références sur l’état proposé et garde leur origine WEB, sans leur attribuer la ligne Excel de l’information. Les imports M3/M4/M5 contrôlent aussi les liens vers M6 et localisent les diagnostics dans les colonnes existantes. Aucune feuille Lieux/ActionsTerrain/Recompenses centrale n’est encore certifiée ; les contrats CAMPAGNE/SESSION restent inchangés.

Les captures C2n intègrent les définitions de lieux avec profils et récompenses proposés. Elles ne contiennent aucun état de stock joué créé par C2p. Les captures précédentes restent relues sans recalcul de leur rapport ; la fixture réellement produite sous C2n continue de passer. Les budgets propres aux captures restent 6 Mio/100 pages. Leur JSON ne constitue toujours pas une sauvegarde complète ni un format de restauration.

## Bornes et compatibilité

- **100 lieux**, archives comprises, **96 Kio par définition** ; bornes natives de **20 récompenses**, **20 bonus par profil** et **20 durées par niveau** conservées. Ces plafonds sont techniques, pas des capacités de jeu.
- Contrôle central : **1 809 changements** (1 709 + 100 lieux), **16 Mio** de sources et **4 Mio** de rapport. Refus explicite sans troncature.
- Captures, budgets I3c et empreinte privée I3c inchangés. Les quatre Masters historiques ont les mêmes SHA-256 qu’en C2o.

Préserver les lieux, leurs références M1/M3/M4/M5/M6, droits, révisions, historiques, imports, reçus et captures/pages avec l’ensemble cohérent de campagne/session. Un retour C2o n’est pas fonctionnellement équivalent : son contrôle ignore les lieux centraux et son import M6 ne protège pas leurs homonymes. Conserver un lecteur compatible ; aucune conversion ou suppression de données pour permettre ce retour. Restauration globale encore à développer et éprouver.

Compétences/effets canoniques, autorisations et QR de jeu, sources des récompenses, publication/version activable, naissance et relève restent à livrer. C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts complets et SO-GAP-12/13/14 ne sont pas clos. Aucune adoption/migration, fusion main, règle/index/IAM Firebase, marqueur ou déploiement de production modifié.

## Validation

Le **25 octobre 2026 (Europe/Brussels)** : compilation et **1 456/1 456 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo. **25 nouveaux cas métier partagés mémoire/Firestore, cinq UI et un HTTP/Auth**. Node local 24.22.1, npm 11.9.0 ; intégrations vérifiées syntaxiquement, Firebase non exécuté localement (Java 17.0.20). Les deux CI exactes et leurs journaux complets seront vérifiés avant clôture ; preuves définitives dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), sans commit de preuve supplémentaire.

Couverture : formes natives et champs injectés, références différées/archivées/invalides, droits et confidentialité des requêtes, trois consommateurs, imports homonymes/localisés, réessais/révocation, concurrence M1/M2/M6, interruption transactionnelle, limites Unicode, absence d’effets et conservation des captures. UI : HTML, formulaires, payloads natifs, références différées, échappement, lecture seule et commandes. HTTP/Auth : comptes distincts, refus anonymes, droits M6/M3 séparés, archive et révocation.

Les anciennes assertions « lieu non contrôlé » deviennent des attentes précises absente/résolue/archivée ou lecture M6 refusée ; les comptes et limites intègrent les nouveaux liens et 100 lieux. Une assertion de fixture a été corrigée : un MJ de session explicitement habilité conserve son accès légitime aux admissions. Aucun contrôle métier n’a été assoupli. Aucune recette visuelle navigateur, mobile, charge, terrain ou restauration complète revendiquée.

Base C2o `c599ddacfeb88ec83f285759f6e34e0471ffdb87` revérifiée : push `40182971788` et PR `40182975578` réussis, **1 426 applicatifs + 1 153 Firebase/HTTP** chacun ; [preuves archivées](PR-1-HISTORIQUE-AVANT-C2P.md). Workflow Node 22/Java 21, émulateurs `demo-gn-engine`, plafond 50 minutes, aucun déploiement.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.3–3.6 et 5.5 bis : référentiel existant, propriétaire unique, liens différés, laboratoire et publication globale distincte des opérations jouées.
- [Livre V0.7](source/SO_Regles_V07.txt), section « Toxicologie — préparation et traitement » : laboratoire QR, recette connue, ressources et règles d’une fabrication, non livrée par C2p.
- [Rapprochement des gabarits V0.1](SO-00-V34-GABARITS.md), M6 QR_Decouverte/Fouilles : réutiliser `fieldTargets`, Lieux/ActionsTerrain/Recompenses, sans inventer de réserve.
- [Vade-mecum V0.1](source/SO_Vademecum_V01.txt), §§2–7 : ateliers, identifiants communs, brouillon, références et absence d’effet de jeu par définition.
- [L1f](L1F-TERRAIN-GROUPE.md), [C1c](SO-01-C1C-RECETTES.md), [C2g](SO-05-C2G-BOUTIQUES-BROUILLON.md), [C2j](SO-04-C2J-SPATIOPORT-BROUILLON.md), [C2n](SO-02-C2N-INSTANTANES-CENTRAUX.md) : parcours natifs, frontières et sauvegarde.
