## Missions M7 dans la préparation commune

M7 n’offrait pas encore de définition de mission dans le brouillon central. C2i ajoute création, modification, archivage et restauration des missions narratives, avec étapes ordonnées, donneur M2 facultatif, informations M6 requises et objets M1 proposés en récompense. Une cible préparée ou restaurée dans son atelier résout le lien sans recopier son contenu ni réécrire la mission.

- Validateur narratif existant réutilisé ; identifiants d’étapes stables lors du réordonnancement. Révisions communes et de contenu, motif, historique, reçu idempotent et autorité courante avant réessai.
- Édition M7 explicitement déléguée. Lectures M1/M2/M6 indépendantes pour les références : aucun catalogue consulté ni existence/état révélé sans droit. Suggestions minimales, sans textes secrets, plans initiaux ou destinataires M6.
- Contrôle commun des formats, archives, corruptions et liens typés ; quantités proposées contrôlées avec le validateur natif M1. Sources réelles et réserves des récompenses restent signalées comme manquantes.
- Limites techniques : 100 missions, 40 étapes, 100 entrées par liste de prérequis/récompenses, 96 Kio par définition ; 1259 changements globaux, budgets 16 Mio/4 Mio conservés, empreinte interne 6.
- M7 reste partiel : aucune attribution, progression, annonce, réservation, récompense, monnaie, XP ou publication créée. Conditions et preuves sont narratives, sans exécution automatique. Groupes, lieux/QR, événements, rendez-vous, financement, import/export M7 et publication restent à raccorder.
- Quatre Masters historiques, sources canoniques, contrats CAMPAGNE/SESSION, dépendances, workflows et règles/index Firebase préservés. Aucun merge, déploiement ou migration.

## Périmètre cumulé et documentation

La PR conserve les travaux antérieurs L1 et SPACE OUTLAWS jusqu’à C2h. [Description et preuves précédentes archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/1a30c227ea85ebf149442015dc056a99984a08b3/docs/PR-1-HISTORIQUE-AVANT-C2I.md).

- [Contrat C2i et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/1a30c227ea85ebf149442015dc056a99984a08b3/docs/SO-06-C2I-MISSIONS-BROUILLON.md)
- [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/1a30c227ea85ebf149442015dc056a99984a08b3/docs/SO-VALIDATION.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/1a30c227ea85ebf149442015dc056a99984a08b3/docs/MATRICE-SPACE-OUTLAWS-V3.md), [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/1a30c227ea85ebf149442015dc056a99984a08b3/docs/SO-RECETTES-V35.md)
- [Sauvegarde/reprise à préparer](https://github.com/gkerckhofs-a11y/gn-engine/blob/1a30c227ea85ebf149442015dc056a99984a08b3/docs/SO-SAUVEGARDE-DEPLOIEMENT.md) : préserver missions et grants M7 avec l’ensemble cohérent du brouillon ; C2h n’est pas un retour fonctionnel équivalent. Les exports ciblés historiques ne sauvegardent pas M7.

REC-SO-MST-05/08 : preuves préparatoires partielles sur les dépendances et archives ; import M7 et publication non certifiés. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés. Publication globale, I3/I4/I5, recette Android/iOS, charge pilote et restauration complète restent à livrer.

## Validation du candidat C2i

Candidat distant : [`1a30c227ea85ebf149442015dc056a99984a08b3`](https://github.com/gkerckhofs-a11y/gn-engine/commit/1a30c227ea85ebf149442015dc056a99984a08b3). Parent C2h : `b080ed9dae51c5959cf809fc4d4008aa7caa8fd2`. Commit local `f8705582b87048a516e1ac7d2f95457fe7d5df52`, arbre identique `cd461e75f2c4d493206fef544407204bb3faf625`.

Local le 24 octobre 2026 : `npm run build` réussi ; **1176/1176 tests applicatifs**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas métier partagés Firestore, cinq UI et un HTTP/Auth ; syntaxe des intégrations vérifiée. Empreintes des quatre XLSX historiques inchangées. Firebase non exécuté localement (Java 17). Tests UI HTML/logique, sans recette visuelle navigateur.

**CI push et PR terminées avec succès ; journaux complets vérifiés le 24 octobre 2026.**

| Exécution | Job | Checkout testé | Applicatifs | Firebase Auth/Firestore/Storage | Verdict |
|---|---|---|---:|---:|---|
| [Push 40123938042](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40123938042) | [120961219984](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40123938042/job/120961219984) | `1a30c227ea85ebf149442015dc056a99984a08b3` | 1176 / 1176 | 936 / 936 | Succès |
| [PR 40123943424](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40123943424) | [120961236222](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40123943424/job/120961236222) | Fusion de test `ea7f4080bc1f4c8bebd427ba0ac6f6756a46c087` | 1176 / 1176 | 936 / 936 | Succès |

Chaque exécution compile l’interface et termine avec zéro échec, annulation, test ignoré ou todo. Les logs confirment les 24 nouveaux cas métier M7 sur Firestore, les cinq UI et le parcours HTTP/Auth M7. Outils CI : Node 22.23.3, npm 10.9.9, Java Temurin 21.0.12+1. Sortie des émulateurs : code 0.

La fusion de test a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat `1a30c227ea85ebf149442015dc056a99984a08b3`. Son arbre est identique à celui du commit poussé et du checkout local : `cd461e75f2c4d493206fef544407204bb3faf625`. Après les deux succès, main reste inchangé et la branche porte toujours ce candidat. PR ouverte en brouillon, non fusionnée ; aucun déploiement exécuté.

