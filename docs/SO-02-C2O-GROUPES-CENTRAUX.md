# C2o — groupes et factions préparés dans M2

## Parcours

L’atelier M2 permet de préparer un groupe ou une faction : nom, présentation, briefing réservé, notes MJ, visibilité prévue et appartenances proposées. Chaque membre référence une fiche M2 par identifiant durable, avec rôle, activation/révélation prévues, visibilité dans la liste et affiliation publique proposée. Les permissions natives sont choisies séparément ; elles sont toutes désactivées à l’ajout, sauf choix explicite de l’auteur.

L’enregistrement reste dans le brouillon commun. Les références à une fiche encore absente sont autorisées pendant la rédaction et signalées immédiatement. La création, l’archive ou la restauration d’une fiche recalcule ces diagnostics à la prochaine lecture. Une appartenance inactive conserve une référence à vérifier. Archiver le groupe l’exclut du graphe actif en conservant son contenu ; restaurer exige une édition motivée et les révisions courantes.

La lecture M2 montre les textes et appartenances privés. L’édition M2 permet les commandes de groupe ; un rôle MJ de session seul ou une candidature ne donne aucun droit central. À l’inverse, les permissions préparées dans le groupe ne créent aucun droit de compte, d’administration, d’admission ou de session.

Ce lot ne livre pas une activation de groupe : aucune caisse, aucun stock, mandat, message, invitation, badge, compte ou personnage incarné n’est créé. Les affectations en partie restent du ressort de la régie I2b ; `groups.members` y reste la seule autorité courante. Responsable, capacité, équipe principale et succession sont des politiques de session distinctes, non déduites des propositions de ce lot. La publication globale et la naissance restent indisponibles.

## Réutilisation et contrat

Les définitions réutilisent **`groupInput` et les douze permissions natives**. Aucun catalogue de factions concurrent n’est créé. Elles sont stockées sous `masterDrafts/initial/changes/group_{id}`, atelier M2, avec données natives, `publicationState=DRAFT`, marque d’archive, provenance WEB et révision. Les groupes et personnages homonymes restent distincts grâce à leur clé typée.

| Commande | Paramètres |
|---|---|
| `saveCentralGroup` | `campaignId`, `groupId`, `draftRevision`, `groupRevision`, `group`, `reason`, `requestId` |
| `archiveCentralGroup` | mêmes identifiants/révisions, `reason`, `requestId` ; aucun contenu de remplacement |

`group` contient uniquement `name`, `description`, `briefing`, `gmNotes`, `visibility`, `members`. Les champs membres sont limités à `characterId`, `role`, `active`, `revealed`, `visibleToMembers`, `publicAffiliation`, `permissions`. Les drapeaux et permissions fournis doivent être des booléens ; les permissions inconnues sont refusées. Le statut publié, les politiques `roster`/`walletConfig`, les UID et champs d’instance ne sont jamais acceptés. Une affiliation publique exige un groupe prévu public et une révélation explicite, comme dans le validateur historique.

Révision centrale commune et révision native du groupe sont comparées dans la transaction existante. Définition, historique avant/après et reçu sont atomiques. Les réessais retrouvent le résultat historique sans écraser une retouche ; réutiliser un ID de requête avec un contenu différent est refusé. Autorité et cycle courants sont vérifiés avant tout reçu. Concurrence avec groupe, M1 ou catalogue d’espèces : une seule révision gagne, l’autre opération reçoit un conflit explicite.

L’interface réutilise le formulaire natif des membres et sa lecture des permissions, avec des libellés de préparation. Le parcours historique garde ses libellés et commandes. Le passage à une visibilité secrète retire la case d’affiliation publique ; le serveur valide indépendamment cette contrainte. Les formulaires proposent des fiches existantes et permettent une référence à préparer, sans créer implicitement de personnage.

## Contrôles et échanges

Le contrôle global valide la forme native et la provenance des groupes, leurs références M2, les cibles absentes/archivées/incohérentes et les identités typées. Il montre les arêtes `group → character` et les champs privés sans recopier briefings, rôles ou permissions détaillées dans le rapport. Les lectures M2 ne consultent ni les admissions ni les groupes de session ni les autres ateliers.

L’import/export Excel M2 continue de porter **uniquement sur les personnages**. Il exclut les groupes de sa table de modifications : une fiche et un groupe portant le même ID restent distincts dans cette projection. Importer ou archiver une fiche conserve les groupes et recalcule leurs liens sur le résultat proposé. Un diagnostic de groupe conserve son origine WEB ; aucune ligne Excel de personnage ne lui est attribuée artificiellement. Aucun onglet central Groupes/Membres n’est certifié dans cette tranche ; les contrats historiques sont inchangés.

Le contrôle privé I3c accepte les groupes natifs du même atelier sans les confondre avec des dossiers, des fiches orphelines ou des appartenances de session. Il valide leur forme puis les exclut du rapprochement des admissions. Les propositions de membres ne confirment aucune place et n’affectent aucun participant. Le rapport ne renvoie pas leurs récits, permissions ou rôles. Son empreinte interne passe à **2** ; le contrôle central passe à **13**. Relancer les contrôles après mise à jour ; ces empreintes ne sont jamais des consentements de publication.

Bornes techniques : **50 groupes, archives comprises ; 100 propositions de membres et 96 Kio par groupe**. Ces limites ne sont pas des capacités de groupes de jeu ni des quotas de participants. Le plafond central passe de 1 659 à **1 709 changements**, soit 50 définitions supplémentaires ; budgets 16 Mio de sources et 4 Mio de rapport inchangés. I3c lit au plus 100 fiches, 50 groupes et le catalogue d’espèces, avec une ligne supplémentaire pour détecter le dépassement ; ses budgets 1 000 dossiers/1 000 verrous/16 Mio sources/4 Mio rapport sont conservés. Aucun rapport tronqué n’est annoncé complet.

## Compatibilité et sauvegarde

Les instantanés C2n incluent les groupes natifs et leurs textes privés ; leurs budgets 6 Mio/100 pages restent inchangés. Les captures antérieures sont relues avec leur rapport stocké, sans recalcul sous les nouveaux contrôles. Une fixture produite par l’arbre C2n exact `23ca7a34ad9a5616e83622dfa3df629714a813c9` (commit distant `fdf0c4e0056e83b365df09e147a9fa1192efff04`) vérifie cette lecture et l’absence de réécriture, sur mémoire et Firestore.

Conserver le brouillon complet avec groupes, historiques, droits, imports, reçus et captures/pages, ainsi que les dossiers et états de session dans la sauvegarde cohérente existante. L’export ciblé M2 ne sauvegarde pas les groupes ; le JSON d’instantané ne sauvegarde toujours pas toute l’application. Aucun import/restauration globale ni copie des groupes en session n’est ajouté.

Un retour à C2n n’est pas fonctionnellement équivalent : ancien contrôleur ignorant le type groupe, ancien import M2 et ancien contrôle I3c non adaptés. Conserver le lecteur compatible ; aucune conversion ou suppression implicite n’est prévue. Les quatre Masters historiques restent identiques. Aucun changement de règles/index/IAM Firebase, migration/adoption de campagne, fusion main, déploiement ou marqueur de production.

Suite : compléter les contenus et dépendances encore absents, dont lieux/laboratoires, compétences/effets, configurations de session et autorité/version activable. C2 complet, I3/INS-06 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts. Cette tranche prépare les groupes ; elle ne certifie pas le parcours de naissance, relève ou réaffectation en partie.

## Validation et preuves

Le 25 octobre 2026 (Europe/Brussels), compilation et **1 426/1 426 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo ; preuves CI définitives dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Ajouts : **23 cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth**. Node local 24.22.1 / npm 11.9.0 ; Firebase non exécuté localement (Java 17.0.20), intégrations vérifiées syntaxiquement.

Couverture : validation native, champs injectés, affiliation publique, absence d’effets, droits/révocation, confidentialité, références différées et typées, éditions concurrentes, réessais, archives/restauration, limites/volume, interruption transactionnelle, imports M2 homonymes, captures et compatibilité C2n, 100 fiches + 50 groupes dans I3c. UI : formulaires, payloads, lecture seule, textes échappés, ajout sans permissions implicites, doublons et visibilité. HTTP : handler réel, comptes Auth distincts, création déléguée, contrôle des références, archive et révocation avant reçu.

Les anciennes assertions numériques de budget sont portées de 1 659/1 660 à 1 709/1 710 pour intégrer les 50 groupes. Une fixture a été corrigée pour utiliser son chemin de campagne réel ; aucune règle métier n’a été assouplie. Aucune recette visuelle navigateur, mobile, charge, terrain ou restauration globale revendiquée.

Base C2n revérifiée : push `40178093482` et PR `40178095107` réussis, 1 399 applicatifs + 1 129 Firebase/HTTP chacun ; [preuves archivées](PR-1-HISTORIQUE-AVANT-C2O.md). Les deux CI du nouveau candidat, leurs SHA de checkout, logs, décomptes et versions seront consignés dans la PR après terminaison, sans commit de preuve supplémentaire. Workflow inchangé : Node 22, Java 21, émulateurs `demo-gn-engine`, aucun déploiement.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.3–3.6 et 4.11 : factions dans M2, dépendances globales, séparation préparation/instances et permissions indépendantes en régie.
- [Livre V0.7](source/SO_Regles_V07.txt), paragraphe « Une classe décrit un métier » et chapitre 16 : allégeance distincte de la classe et mandats de caisse/stock/pilotage distincts de l’appartenance.
- [Gabarits V0.1 — Factions](SO-00-V34-GABARITS.md) et [vade-mecum](source/SO_Vademecum_V01.txt) : réutiliser Groupes/Membres existants ; aucun compte collectif créé par une définition.
- [I2b](SO-01-I2B-GROUPES.md), [I3c](SO-01-I3C-CONTROLE-DOSSIERS-M2.md), [C2n](SO-02-C2N-INSTANTANES-CENTRAUX.md) : frontières de session, confidentialité, reçus et conservation immuable.
