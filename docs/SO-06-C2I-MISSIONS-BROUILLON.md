# C2i — Missions M7 dans le brouillon central

24 octobre 2026. Suite additive de C2h sur la PR #1. Aucun merge, déploiement ou migration de données.

## Parcours et sources

M6 permet de préparer les informations ; M7 ne proposait pas encore de définition de mission dans le brouillon commun. C2i ajoute une mission narrative, ses étapes ordonnées, son donneur M2 facultatif, ses informations M6 requises et ses objets M1 proposés en récompense.

Parcours : créer une mission avec un prérequis M6 encore absent → préparer l’information dans M6 → contrôler la résolution du lien sans réécrire la mission → archiver puis restaurer la cible et retrouver le diagnostic correspondant. Le même objet M1 peut être utilisé par une recette M4, une offre M5 et une récompense proposée M7, sans second catalogue.

Sources : [CDC V3.5](source/SO_CDC_V35.md), §§3.1–3.6, 7.2 et 10, REC-SO-MST-05/08 ; [règles V0.7](source/SO_Regles_V07.txt), progression/XP et chapitre 25 « Contrats, escortes, assurances et recours » ; [vade-mecum](source/SO_Vademecum_V01.txt), notamment l’exemple d’objet M1 proposé en récompense M7 ; [rapprochement des gabarits](SO-00-V34-GABARITS.md), M7. Le modèle de définition manquant est ajouté au brouillon existant ; aucune nouvelle mécanique de jeu ni registre de paiement.

## Données et commandes

Stockage : `campaigns/{id}/masterDrafts/initial/changes/mission_{id}`. Commandes `saveCentralMission` et `archiveCentralMission`, identifiant stable, révision commune, révision de contenu, motif, reçu de commande et historique C1b. Restauration par nouvelle sauvegarde auditée, sans suppression en cascade.

| Champ | Contrat de préparation |
|---|---|
| `title`, `description`, `gmNotes` | Validateur narratif existant : 200, 10 000 et 4 000 caractères maximum ; titre obligatoire |
| `steps` | Jusqu’à 40 étapes ordonnées ; identifiant stable, titre 200, description 4 000 ; publication forcée à false |
| `giverCharacterId` | Référence M2 facultative, sans attribution de rôle ni permission |
| `requiredKnowledgeIds` | Jusqu’à 100 identifiants M6 uniques, prérequis proposés |
| `rewardItems` | Jusqu’à 100 objets M1 distincts, avec quantité entière positive proposée |
| `conditions`, `proofExpected` | Textes narratifs de préparation, 4 000 et 2 000 caractères ; aucune expression exécutée |

Le validateur `narrativeInput` est réutilisé sans modifier les objectifs historiques ni créer un objectif dans M2. La définition possède `schemaVersion:1`, `publicationState:DRAFT`, `masterArchived` et `revision`, tous imposés côté serveur. Les identifiants des étapes restent stables lors du réordonnancement ; aucun état d’accomplissement n’est conservé dans ce modèle.

Champs de publication, contrat, compte, attribution, XP, crédits, stock ou progression refusés. Un brouillon peut n’avoir ni donneur, ni étape, ni prérequis, ni récompense : aucune valeur de jeu n’est inventée pour le compléter.

Bornes techniques, sans portée de règle de jeu : **100 missions archives comprises**, **96 Kio par définition**, 40 étapes, 100 entrées par liste de prérequis/récompenses. Le budget global passe de 1159 à **1259 changements** ; 16 Mio en entrée et 4 Mio de rapport conservés. Refus explicite plutôt que troncature.

## Autorité, confidentialité et contrôle

Lecture et édition M7 sont des délégations centrales explicites. Aucun rôle MJ de session ni désignation comme donneur ne les accorde. Autorité et cycle restent vérifiés avant tout reçu de commande, y compris après révocation.

| Référence M7 | Lecture nécessaire | Contrôle |
|---|---|---|
| Donneur → personnage | M2 | Existence et archive de la définition |
| Information requise → connaissance | M6 | Existence et archive, sans lecture du texte dans les suggestions |
| Objet proposé → modèle | M1 | Existence, archive et quantité compatible avec le conditionnement natif |

Sans droit croisé : aucune requête du catalogue concerné, `REFERENCE_NOT_CHECKED`, aucun nom, existence, archive ou conditionnement révélé. Les suggestions autorisées contiennent seulement ID, nom/titre, archive, révision et source ; pas de biographie, secret, vérité MJ, note, plan initial ou destinataire M6. Les admissions et données d’identité réelle ne sont jamais consultées pour ces liens.

La quantité d’un objet individuel suit `itemQuantity` : une unité par proposition. Ce contrôle ne prouve pas qu’un lot existe ou est disponible. Chaque récompense proposée conserve un diagnostic `REWARD_SOURCE_PENDING` : source réelle, réserve et remise restent à développer. Aucun fonds, unité ou bien réservé/créé.

Le contrôle commun transactionnel valide le nouveau format, refuse les champs ou provenances non pris en charge, exclut les données corrompues et expose les liens typés. Les homonymes entre types restent distincts. Aucun texte privé de mission n’est reproduit dans le résumé global. Une archive de cible est signalée ; une restauration résout le lien sans modifier M7. Une instance de session ou une définition d’une autre campagne ne résout jamais une référence.

M7 reste **PARTIAL**, `publicationAvailable=false`, empreinte interne de contrôle **6** : relancer le contrôle après mise à jour. Conditions, possession effective d’une information, accès joueurs, réussite, groupes, lieux/QR, annonces, rendez-vous, événements/déclencheurs, récompenses financées et publication globale restent à raccorder. Les services de contrats/annonces/finance existants ne sont pas appelés lors de la préparation. Aucun import/export Excel M7 ni adoption des gabarits V0.1.

## Validation et compatibilité

24 nouveaux cas métier partagés mémoire/Firestore : droits, non-lecture étrangère, confidentialité, dépendances différées, absence d’état de jeu, archives/restauration, réordonnancement, formats/quantités/bornes, réessais/révocation, concurrence M1/M2/M4/M5/M6/M7, homonymes/corruption, import M1 conservant la mission, isolation et interruption atomique, gardes de cycle. Cinq tests UI portent sur échappement, droits, formulaires/révisions/identifiants, suggestions et charge utile/archives. Un parcours HTTP/Auth vérifie les droits croisés, le lien M6, les archives, la restauration et la révocation.

**Local, 24 octobre 2026 : `npm run build` et 1176/1176 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0. Syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17) ; résultats définitifs du commit exact, Node 22/Java 21, à consigner dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison des deux CI. Tests HTML/logique, sans recette visuelle navigateur/mobile ou terrain.

Base C2h `b080ed9dae51c5959cf809fc4d4008aa7caa8fd2` : deux CI vertes revérifiées avant ce lot, 1147 applicatifs et 911 Firebase chacune ; [preuves précédentes archivées](PR-1-HISTORIQUE-AVANT-C2I.md). Ces résultats historiques ne valident pas C2i.

Quatre Masters historiques CAMPAGNE/SESSION identiques octet par octet ; sources canoniques, contrats historiques, dépendances, workflows, règles/index Firebase et marqueur de déploiement préservés. Les exports ciblés M1/M2/M4 ne sauvegardent pas M7. Conserver campagne/préparation/brouillon/changements/historiques/délégations/reçus comme un ensemble cohérent, incluant les missions et grants M7. C2h ne sait pas les contrôler/éditer : retour logiciel non fonctionnellement équivalent ; ne supprimer aucune donnée pour le permettre. Aucune migration ni restauration complète exécutée.

REC-SO-MST-05/08 reçoivent des preuves préparatoires partielles sur les dépendances de mission, les archives et l’absence de récompense automatique. Import M7 et publication globale ne sont pas certifiés. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés ; I3/I4/I5 et recette humaine restent à livrer.
