## Informations M6 dans la préparation commune

Les recettes M4 pouvaient référencer une connaissance de déblocage, mais M6 n’offrait pas de catalogue central éditable. C2h ajoute création, modification, archivage et restauration des connaissances, indices et documents dans le même brouillon. Leurs destinataires proposés utilisent les définitions M2 ; les références M4 se résolvent à partir de M6 sans duplication ni attribution aux joueurs.

- Format natif, révisions communes et de contenu, motif, historique, reçu de commande idempotent et autorité courante avant réessai. Concurrence interateliers et restauration sans cascade.
- Édition M6 explicitement déléguée. Lecture M2 requise pour consulter les destinataires ; lecture M6 requise pour contrôler les connaissances depuis M4. Sans droit croisé, aucune requête ni révélation d’existence/état. Les suggestions M4 excluent textes, vérités MJ, notes et destinataires.
- Contrôle central des formats, archives, corruptions et liens typés ; provenance Excel M4 conservée jusqu’à `connaissance_id`. Une modification M6 invalide l’aperçu M4. Les imports M2 conservent M6.
- Limites techniques : 250 informations, 100 destinataires par liste, 96 Kio par définition, 1159 changements globaux ; budgets 16 Mio/4 Mio inchangés, empreinte interne 5.
- M6 reste partiel : aucun reçu de connaissance joueur, partage, déblocage de recette, QR actif ou publication. Excel M6, cibles terrain, catalogue complet des compétences et découverte conditionnelle restent à raccorder.
- Quatre Masters historiques, sources, contrats CAMPAGNE/SESSION, workflows, dépendances et règles/index Firebase préservés. Aucun merge, déploiement ni migration.

## Périmètre cumulé et documentation

La PR conserve les travaux antérieurs L1 et SPACE OUTLAWS jusqu’à C2g. La description et les preuves précédentes sont [archivées dans le dépôt](https://github.com/gkerckhofs-a11y/gn-engine/blob/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2/docs/PR-1-HISTORIQUE-AVANT-C2H.md).

- [Contrat et limites C2h](https://github.com/gkerckhofs-a11y/gn-engine/blob/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2/docs/SO-06-C2H-INFORMATIONS-BROUILLON.md)
- [Rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2/docs/SO-VALIDATION.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2/docs/MATRICE-SPACE-OUTLAWS-V3.md), [55 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2/docs/SO-RECETTES-V35.md)
- [Sauvegarde/reprise à préparer](https://github.com/gkerckhofs-a11y/gn-engine/blob/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2/docs/SO-SAUVEGARDE-DEPLOIEMENT.md) : conserver types et grants M6 avec le brouillon complet ; C2g n’est pas un retour fonctionnel équivalent, les exports ciblés ne sauvegardent pas M6.

Preuves préparatoires seulement : aucun des 55 verdicts complets ni SO-GAP-12/13/14 n’est déclaré résolu. Publication globale, I3/I4/I5, recette Android/iOS, charge pilote et restauration complète restent à livrer.

## Validation du candidat C2h

Candidat distant : [`b080ed9dae51c5959cf809fc4d4008aa7caa8fd2`](https://github.com/gkerckhofs-a11y/gn-engine/commit/b080ed9dae51c5959cf809fc4d4008aa7caa8fd2). Base C2g : `fad9bc4ed8be49087b19ef3a7a5de066b0161537`. Parent direct : `27d250ba1a389269419156b679f41c10a01eafd6`. Commit local `37e26bfd80ddf049c88fabc17deabe774b84b29e`, arbre identique `11cee6b127caff23482359a0db8dbab086746ec9`.

Local le 24 octobre 2026 : `npm run build` réussi ; **1147/1147 tests applicatifs**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 26 nouveaux cas métier partagés Firestore, six UI et un HTTP/Auth ; syntaxe des intégrations vérifiée. Empreintes des quatre XLSX historiques inchangées. Firebase non exécuté localement (Java 17). Les tests UI portent sur HTML/logique, sans recette visuelle navigateur.

**CI push et PR terminées avec succès ; journaux complets vérifiés le 24 octobre 2026.**

| Exécution | Job | Checkout testé | Applicatifs | Firebase Auth/Firestore/Storage | Verdict |
|---|---|---|---:|---:|---|
| [Push 40120426233](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40120426233) | [120950567186](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40120426233/job/120950567186) | `b080ed9dae51c5959cf809fc4d4008aa7caa8fd2` | 1147 / 1147 | 911 / 911 | Succès |
| [PR 40120431349](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40120431349) | [120950583678](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40120431349/job/120950583678) | Fusion de test `c04cfb5cd7d5e2668016094d854b558307f0e17c` | 1147 / 1147 | 911 / 911 | Succès |

Chaque exécution compile l’interface et termine avec zéro échec, annulation, test ignoré ou todo. Les logs confirment les 26 nouveaux cas métier M6 sur Firestore, les six UI, le parcours HTTP/Auth M6 et l’ancien parcours HTTP M4 corrigé. Outils CI : Node 22.23.3, npm 10.9.9, Java Temurin 21.0.12+1. Sortie des émulateurs : code 0.

La fusion de test a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` (main) et le candidat `b080ed9dae51c5959cf809fc4d4008aa7caa8fd2`. Son arbre est identique à celui du commit poussé et du checkout local : `11cee6b127caff23482359a0db8dbab086746ec9`. Après les deux succès, main reste inchangé et la branche porte toujours ce candidat. PR ouverte en brouillon, non fusionnée ; aucun déploiement exécuté.

Première passe C2h sur `27d250ba1a389269419156b679f41c10a01eafd6` : [push](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40118253254) et [PR](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40118257933) en échec, 1147/1147 applicatifs et 910/911 intégrations chacun. Un ancien test HTTP M4 attendait deux références non contrôlées, en omettant le nouveau lien M6. Le correctif vérifie les trois champs précis, puis le maintien de la restriction M6 après délégation M1. Aucun contrôle applicatif supprimé ou assoupli. Les 26 nouveaux cas Firestore et le parcours HTTP M6 avaient réussi. Les résultats de cette première passe ne valident pas le correctif.
