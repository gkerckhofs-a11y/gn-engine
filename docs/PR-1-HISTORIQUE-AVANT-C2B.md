# PR #1 — état C2a avant C2b

Description conservée le 24 octobre 2026 avant la suite C2b. Les résultats ci-dessous concernent uniquement le commit C2a cité.

## Contrôle commun de la préparation centrale SPACE OUTLAWS

Le propriétaire peut contrôler ensemble les définitions M1/M2/M4 du brouillon initial. Le rapport rassemble les ajouts prévus, archives exclues, références et diagnostics avec provenance, au lieu de devoir rapprocher les rapports séparés des ateliers. Une correction suivie d'un nouveau contrôle actualise les références sans réécrire leurs sources.

La couverture demeure explicitement partielle : une absence d'anomalie détectée n'autorise aucune publication. Le contrôle ne crée ni version, pointeur, reçu, instance, compte, ressource ou copie de catalogue.

### Lot C2a

- Lecture transactionnelle `checkCentralDraft`, réservée au propriétaire courant et liée à la révision affichée. Les délégations des sept ateliers ne donnent pas accès au contrôle global ; aucune candidature ni politique d'admission consultée.
- Réutilisation des nettoyeurs natifs M1/M2/M4 et du catalogue narratif I1. Détection des types, propriétaires, révisions, états, champs étrangers et provenances incohérents ; références absentes/archivées/invalides localisées.
- Rapport des sept couvertures, ajouts/exclusions et liens. Les catégories de contenus privés sont indiquées sans recopier les biographies, secrets et notes dans le résumé.
- Empreinte déterministe liée au contexte, à l'auteur, aux révisions, au contenu complet et à la provenance. Une modification, même suivie d'un retour à l'ancien texte, produit une nouvelle identité de contrôle. Cette empreinte n'est pas un consentement de publication.
- Limites explicites : 601 changements, 16 Mio de contenu et 4 Mio de rapport. Dépassement refusé sans rapport tronqué ; aucune certification de charge.
- Aucun nouveau stockage métier, aucune migration ; quatre Masters historiques, dépendances et workflows inchangés.

### Candidat et vérifications locales

- Commit distant : [`a90176f65111487d284db3536b9e167194f158b6`](https://github.com/gkerckhofs-a11y/gn-engine/commit/a90176f65111487d284db3536b9e167194f158b6), parent C1e `3ae52a724ac3dba610d27d1f700ae0e498a70cb9`.
- Checkout local : `b1168dee113e5656c744fcb7f94652d2e4f81b02`. Arbre local/distant identique : `690bc43fdf0584681991f95b451f478ddfb93db7`.
- Le 24 octobre 2026, Node 24.22.1 / npm 11.9.0 : **983 tests applicatifs réussis**, 0 échec/annulation/ignoré/todo ; compilation réussie, diff-check et empreintes des quatre Masters conformes.
- 19 nouveaux cas métier partagés mémoire/Firestore, quatre cas empreinte/budgets, trois tests UI et un parcours HTTP/Auth ajouté.
- **CI du commit exact réussie** sur push et PR : preuves définitives ci-dessous. Émulateurs non exécutés localement (Java 17).

### CI définitive du 24 octobre 2026

Les deux runs sont terminés avec conclusion `success` sur le head `a90176f65111487d284db3536b9e167194f158b6`. Chacun a réussi la compilation, **983 tests applicatifs** et **774 tests Firebase**, avec **0 échec, 0 annulation, 0 test ignoré et 0 todo** dans les deux suites. Les journaux confirment les **19 nouveaux cas « Contrôle central C2a sur Firestore »** et le parcours **HTTP/Auth de contrôle propriétaire, révision et absence de publication**.

| Événement | Run et job | Checkout réellement testé | Résultat |
|---|---|---|---|
| Push | [run 40083888265](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40083888265) · [job 120842775801](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40083888265/job/120842775801) | `a90176f65111487d284db3536b9e167194f158b6` | Build + 983 applicatifs + 774 Firebase réussis |
| PR | [run 40083893166](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40083893166) · [job 120842789729](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40083893166/job/120842789729) | Merge virtuel `ba412b9046e748391e69ef5bcee189825c05f4a0` | Build + 983 applicatifs + 774 Firebase réussis |

Le merge virtuel de la PR a pour parents `03eaace155b052d1b7d1960347746e9ee60ed514` et `a90176f65111487d284db3536b9e167194f158b6` ; son arbre `690bc43fdf0584681991f95b451f478ddfb93db7` est identique au candidat local et distant. Aucun merge effectif n'a été réalisé.

Versions constatées dans les deux journaux : **Node 22.23.3, npm 10.9.9, Temurin 21.0.12+1**. Les avertissements `EBADENGINE` des dépendances Firebase exigeant Node >=24.12.0 et l'avertissement des actions v4 ciblant Node 20 sont encore présents. La réussite des tests ne vaut pas certification de cette compatibilité ; les contrôles locaux ont aussi réussi sous Node 24.22.1.

Ces résultats sont consignés dans la PR sans nouveau commit, afin de conserver l'identité exacte du candidat vérifié.

### Documents et limites restantes

- [Contrat et preuves C2a](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-02-C2A-CONTROLE-CENTRAL.md), [rapport courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-VALIDATION.md), [matrice](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/MATRICE-SPACE-OUTLAWS-V3.md), [recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-RECETTES-V35.md).
- [Description et preuves C1e conservées](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/PR-1-HISTORIQUE-AVANT-C2A.md) : 957 applicatifs + 754 Firebase réussis dans les deux CI C1e, résultats non attribués à C2a.
- Le contrôleur ne couvre que la première préparation sans base publiée ; C2 reste incomplet. Validateurs complets, diff Vn/Vn+1, consentement de publication, pages immuables/reprise, version READY, bascule du pointeur, export et retour de configuration restent à développer. Profils M2, I3/I4/I5 et démonstration M1/M4/M5 activable restent à raccorder.
- Les avertissements de compatibilité Node/Firebase et des actions v4 relevés dans C1e restent à traiter ; ce lot ne change pas la chaîne de dépendances. Aucun navigateur réel, Android/iOS, exercice de charge ou restauration complète validé ; les 55 recettes complètes restent non certifiées.
- PR maintenue en brouillon, main `03eaace155b052d1b7d1960347746e9ee60ed514` inchangé. Aucun merge, déploiement, migration, IAM/DNS/secret ou modification de `.github/deploy-request.json`. La publication en production exige une autorisation explicite distincte.

