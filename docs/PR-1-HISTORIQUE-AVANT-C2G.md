# PR #1 — état conservé avant C2g

Source : description GitHub de la PR #1 relue le 24 octobre 2026, tête `4ed82c3f56b3c9969f6ea176edcab19ed00758cc`. Preuves C2f uniquement, sans les attribuer au nouveau lot.

Le contrôle du brouillon central signale désormais les personnages dont la classe principale ne dispose pas d’un kit M1 exploitable en préparation. Une fiche Médecin avec un plan valide mais aucun kit n’obtient plus un rapport sans anomalie. Après correction du kit et de ses modèles, le rapport se recalcule à la nouvelle révision.

- Kit absent, archivé, incohérent ou incomplet : diagnostic sur chaque fiche M2 concernée, avec les erreurs d’objets détaillées dans M1.
- Graphe typé personnage → kit → modèles ; synthèse des huit classes, IDs et nombre des fiches. Les nombres sont des définitions, jamais des quotas ou participants confirmés.
- L’initiation secondaire n’exige aucun deuxième kit ; fiches archivées/sans plan exclues des besoins, sans leur attribuer de statut joueur/PNJ.
- Provenance XLSX jusqu’à la colonne `classe_id` ; correction via import M1 sans réécrire kits ou personnages.
- Réutilisation du contrôle transactionnel C2a/C2b et de ses droits courants. Aucun accès M1 implicite dans M2 isolé ; aucune lecture de candidature ou écriture de ressource.

### Périmètre et limites

`REFERENCES_CHECKED` signifie références et consommables requis contrôlés, pas effets/homologation/protections validés. Codes commerciaux du Pilote et contacts du Courtier restent à raccorder. `publicationAvailable=false`.

Rapport additif `initialPreparation`, empreinte interne portée à 3 ; aucun état persistant ou migration. Bornes 609 définitions / 16 Mio de contenu / 4 Mio de rapport conservées. Quatre Masters historiques, contrats CAMPAGNE/SESSION, dépendances, workflows et règles/index inchangés.

[Contrat C2f](https://github.com/gkerckhofs-a11y/gn-engine/blob/4ed82c3f56b3c9969f6ea176edcab19ed00758cc/docs/SO-02-C2F-COHERENCE-INITIALE.md) · [preuves C2e archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/4ed82c3f56b3c9969f6ea176edcab19ed00758cc/docs/PR-1-HISTORIQUE-AVANT-C2F.md).

Sources organisateur : CDC V3.5 §§3.3–3.6/4.7–4.9 ; règles V0.7 chapitre 3 ; vade-mecum §§3–7, conservés dans `docs/source`. Aucune règle nouvelle ni composition inventée.

### Validation locale — 24 octobre 2026

- Node **24.22.1** / npm **11.9.0** : **1086/1086 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo ; compilation réussie.
- **14 nouveaux cas métier partagés Firestore**, **2 cas purs**, **3 UI**, **1 parcours HTTP/Auth**.
- Références principales/secondaires, huit classes/deux natures, archives, cibles corrompues/homonymes/doublons, imports, retrait de plan, droits/révocation, concurrence, confidentialité et absence d’écriture couverts.
- Cinq attentes historiques C2c/C2d et une HTTP C2c actualisées : espèce correcte ne signifie plus kit disponible.
- Syntaxe des modules et tests d’intégration, diff et conservation des quatre Masters vérifiés.
- Firebase non exécuté localement : Java **17.0.20**, workflow prévu avec Java 21. Contrôle visuel Chromium local non exécuté : binaire absent et téléchargement du runtime échoué. Les trois cas UI sont des tests de rendu HTML. Aucune recette humaine Android/iOS, charge pilote, restauration globale ou naissance protégée exécutée.

### CI du candidat

Commit distant **`4ed82c3f56b3c9969f6ea176edcab19ed00758cc`** ; local **`bf846b5e22fa8d0625cc110269b692fcdb41e8f5`**, arbre identique vérifié **`b22d357a77d916c23ef17022cdf92114769942ec`**.

**Deux CI terminées avec succès le 24 octobre 2026, première tentative.** États finaux, journaux et SHA de checkout vérifiés ; zéro échec, annulé, ignoré ou todo dans chaque suite.

| Déclencheur | Exécution et job | Compilation | Tests applicatifs | Tests Firebase |
|---|---|---|---:|---:|
| Push | [40109779557](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40109779557) · [job 120918881951](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40109779557/job/120918881951) | Réussie | 1086/1086 | 859/859 |
| PR | [40109785061](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40109785061) · [job 120918898302](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40109785061/job/120918898302) | Réussie | 1086/1086 | 859/859 |

Les **14 nouveaux cas C2f partagés Firestore** et le **parcours HTTP/Auth de cohérence M2/M1** sont présents et réussis dans les deux journaux. Runtimes constatés dans les deux exécutions : Node **22.23.3**, npm **10.9.9**, Temurin **21.0.12+1**.

Checkout push : **`4ed82c3f56b3c9969f6ea176edcab19ed00758cc`**. Checkout PR : fusion de vérification **`9d7c9b51f4a68cdb5c50047f15329f6983bd926c`**, parents main **`03eaace155b052d1b7d1960347746e9ee60ed514`** et candidat **`4ed82c3f56b3c9969f6ea176edcab19ed00758cc`**. Arbre commun vérifié : **`b22d357a77d916c23ef17022cdf92114769942ec`**. La PR demeure non fusionnée.

Avertissements préexistants de compatibilité Node/Firebase et de dépréciation des actions v4 observés ; aucun changement de dépendance ou de workflow dans ce lot.

Main et tête de PR revérifiés après les deux succès : main inchangé, tête au candidat ci-dessus. Checkout local propre et arbre identique au distant.

### Suite

Contrôle complet des profils/effets et autres domaines nécessaires, version centrale immuable/activation atomique, I3 admission vers M2, I4 naissance protégée, I5 succession. REC-SO-01/24, MST-03/06/08 et INS-06 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés.

PR en brouillon. Aucun merge, déploiement, marqueur de déploiement modifié, migration ou publication de campagne. Revenir à C2e conserve les données mais retire ces contrôles ; ce n’est pas une validation équivalente.
