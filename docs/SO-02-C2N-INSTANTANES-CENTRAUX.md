# C2n — instantanés privés du brouillon central

## Parcours et portée

Le propriétaire peut **Conserver un instantané** depuis les ateliers, examiner le nombre de définitions et diagnostics, puis confirmer avec un motif. La capture conserve les définitions natives des sept ateliers, archives et catalogue narratif M2 compris, avec le rapport central recalculé dans la même transaction. Le brouillon reste modifiable. Une retouche ultérieure ne change pas la copie conservée.

**Instantanés conservés** affiche les vingt captures les plus récentes ; le lien d’une capture antérieure reste utilisable. La relecture affiche la révision historique, le motif, la date et le rapport. Les liens d’atelier ouvrent le brouillon courant. **Télécharger la copie privée** relit et contrôle la capture sur le serveur avant de produire un JSON contenant les définitions et le rapport historiques, y compris les récits et secrets des ateliers.

Il s’agit d’une brique additive de préparation C2, pas d’une publication. Les références non résolues restent dans le rapport conservé ; une forme native ou provenance invalide bloque la capture. `publicationAvailable=false`, aucune version de jeu `READY`/`BUILDING`, aucun pointeur actif, aucune incarnation, ressource, admission ou droit de session n’est créé ou modifié. Le rapport ne vaut jamais consentement pour une future publication, qui devra revalider sources courantes, autorités, admissions et règles complètes.

## Droits et confidentialité

L’aperçu et la capture sont réservés au propriétaire habilité. La lecture, la liste et le téléchargement exigent les droits courants du contrôle central C2b : propriétaire, ou délégation active `checkCentral=true` avec lecture des sept ateliers. Ce droit délégué reste en lecture seule ; lecture d’atelier, rôle MJ ou candidature ne donnent aucun accès implicite. Autorité et cycle de préparation initiale sont vérifiés avant les reçus et toute lecture du contenu conservé.

La capture lit seulement les changements centraux et le contexte nécessaire au rapport. Elle ne copie ni dossiers civils, consentements, invitations, souhaits d’amis, politiques/quotas d’admission, liens privés I3 ni historiques opérationnels. Elle contient les identifiants techniques de campagne, session, propriétaire et auteur, les métadonnées de provenance déjà présentes dans les définitions et les textes privés des ateliers. Le téléchargement exige donc les mêmes droits que le contrôle global. Une copie déjà téléchargée ne peut pas être rappelée lors d’une révocation.

## Contrat et atomicité

| Action | Paramètres propres | Effet |
|---|---|---|
| `previewCentralSnapshot` | `campaignId`, `draftRevision` | Rapport, résumé, confirmation ; aucune écriture |
| `captureCentralSnapshot` | mêmes identifiants, `confirmation`, `reason`, `requestId` | Capture atomique, audit et reçu |
| `listCentralSnapshots` | `campaignId` | Vingt résumés récents et indicateur `hasMore` |
| `centralSnapshot` | `campaignId`, `snapshotId` | Contenu complet vérifié et révision courante du brouillon |

Le manifeste `CENTRAL_DRAFT_SNAPSHOT`, format 1, état `SEALED`, est écrit dans `campaigns/{cid}/masterDrafts/initial/checks/{snapshotId}` avec ses `pages/{index}`. Le helper de pagination des campagnes existantes est réutilisé sans changer son comportement historique. Pages, manifeste, événement dans l’historique de campagne et reçu de commande sont écrits dans une seule transaction. Aucun verrou de construction ni processus de reprise partielle n’est nécessaire à cette échelle.

La confirmation SHA-256 lie l’auteur, son autorité, les droits, les révisions campagne/session/brouillon, les définitions et le rapport. Le temps de lecture est exclu du consentement : attendre seul ne l’invalide pas. Le rapport conservé porte l’heure de capture ; les autres sources doivent toujours correspondre à l’aperçu. Une modification intervenue avant une nouvelle capture provoque un conflit de révision ou `CENTRAL_SNAPSHOT_STALE`. En concurrence, la capture complète précède l’édition ou est refusée ; aucun mélange de révisions n’est accepté.

Un même ID de commande retrouve son résultat historique ; un contenu différent sous cet ID est refusé. Une nouvelle requête avec la même confirmation retrouve la capture existante, même après une retouche, sans remplacer ses pages, son motif ou son audit. Il faut un nouvel aperçu de la révision actuelle pour conserver une nouvelle capture. La restitution d’un reçu ne certifie pas l’intégrité actuelle des pages ; celle-ci est revérifiée lors de la relecture et du téléchargement.

Le manifeste référence le nombre, la taille et l’empreinte de chaque page, l’empreinte de toutes les entrées et celle du rapport. La relecture vérifie aussi les identités, les formes natives et la cohérence du rapport avec le manifeste. Une page manquante, altérée ou rattachée ailleurs et un manifeste altéré sont refusés, sans reconstruction depuis le brouillon courant. Ces empreintes détectent les incohérences ; ce ne sont pas des signatures contre un administrateur capable de réécrire données et empreintes. Aucune commande exposée ne modifie une capture existante.

## Bornes techniques

Les bornes du contrôle central restent 1 659 changements, 16 Mio de sources et 4 Mio de rapport. La capture impose en plus **6 Mio d’entrées sérialisées au total, rapport compris, et 100 pages**. Refus intégral au-delà, sans troncature. La pagination existante utilise trente entrées ou 250 000 octets par page, avec entrée individuelle inférieure à 800 000 octets ; un gros élément peut dépasser la cible de page. Le rapport est fractionné en morceaux de 100 000 unités UTF-16 au plus sans couper une paire de substitution Unicode.

Ces budgets sont techniques, pas des quotas de participants ou règles de jeu. Un brouillon valable pour le contrôle peut dépasser le budget de conservation. L’extension au-delà exigera une construction paginée avec cycle et droits explicites, avant toute activation de version. `sourceIsCurrentRevision` compare uniquement la révision du brouillon ; il ne certifie pas les autres conditions courantes.

## Compatibilité, sauvegarde et suite

L’empreinte centrale reste 12 et la couverture des sept ateliers reste partielle. Les contrats XLSX CAMPAGNE/SESSION, les gabarits V0.1, les imports centraux et les quatre Masters historiques restent inchangés. Le JSON `gn-engine-central-snapshot` n’est pas un paquet de scénario historique ; aucun import ou restauration n’est exposé.

Pour une sauvegarde cohérente, conserver manifestes, toutes leurs pages, audits et reçus, avec le brouillon courant, les droits et l’ensemble privé I1/I2/I3. Le JSON seul ne sauvegarde pas les dossiers, droits, médias, compteurs/verrous, historiques ni données de jeu. Aucune restauration globale n’est certifiée. Revenir à I3c laisse les captures présentes mais sans lecteur ; les éditions natives demeurent compatibles, sans conversion. Ne pas supprimer les sous-collections lors d’une reprise.

Suite : terminer les dépendances/règles non contrôlées et raccorder l’autorité de publication, les contrôles privés I3c, la version immuable activable et son pointeur, puis la naissance I4. C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts. Aucune migration/adoption de campagne, production, fusion main ou modification Firebase/IAM/règles/index n’est exécutée.

## Validation

Le 25 octobre 2026 (Europe/Brussels), compilation et **1 399/1 399 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. Ajouts : **21 cas métier partagés mémoire/Firestore, quatre UI et un HTTP/Auth**. Les deux premiers jeux de données de volume ont été corrigés pour franchir réellement une page et respecter les limites natives des textes ; aucune limite métier n’a été assouplie.

Couverture : sept ateliers, absence d’effets, copies après retouche/archive, réessais, captures concurrentes, édition concurrente, autorités/cycle/révocation, confidentialité I3, source invalide, intégrité des pages/manifeste, interruption transactionnelle, Unicode, budget global et liste bornée. UI : HTML/formulaires, contenus échappés, droits d’entrée, payloads et protection contre réponses tardives. HTTP : handler réel, Auth/Firestore émulés, capture propriétaire, refus délégué, copie historique et révocation de lecture.

Firebase non exécuté localement (Java 17.0.20) ; les fichiers d’intégration sont vérifiés syntaxiquement. Preuves définitives des deux CI, SHA exacts, logs, décomptes et versions dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison, sans commit de preuve supplémentaire. Workflow Node 22/Java 21, émulation `demo-gn-engine`, plafond 50 minutes, aucun déploiement. Aucune recette visuelle navigateur, mobile, charge, terrain ou restauration globale revendiquée.

Base I3c `c4a5d105077c0dde53848aeb1e55effa87e38a5c` : push `40174122510` et PR `40174126009` réussis, 1 374 applicatifs + 1 107 Firebase/HTTP chacun ; [description finale archivée](PR-1-HISTORIQUE-AVANT-C2N.md).

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §3.6 : contrôle global, version conservée avant activation et absence d’instances lors de la préparation.
- [Plan central V3.4](SO-00-V34-PLAN-CENTRAL.md), §§5–7 : pages immuables, réutilisation de la pagination de campagne et séparation des autorités ; migration toujours soumise à validation.
- [Livre V0.7](source/SO_Regles_V07.txt), [gabarits V0.1](SO-00-V34-GABARITS.md), [vade-mecum](source/SO_Vademecum_V01.txt) : sept ateliers préparatoires et publication globale ; aucun barème ajouté.
- [C2a](SO-02-C2A-CONTROLE-CENTRAL.md), [C2b](SO-02-C2B-DELEGATION-CONTROLE.md), [I3c](SO-01-I3C-CONTROLE-DOSSIERS-M2.md) : rapport partiel, délégation de lecture et confidentialité des dossiers distinctes.
