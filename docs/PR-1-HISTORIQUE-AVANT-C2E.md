# PR #1 — état C2d avant le lot C2e

Archive du 24 octobre 2026 avant remplacement du titre et de la description. PR ouverte en brouillon, non fusionnée. Titre : SPACE OUTLAWS — import/export Excel des personnages M2 (C2d)

M2 permet désormais d’**exporter et réimporter les fiches narratives et leurs plans initiaux C2c** avec le circuit Excel central existant. L’organisateur sélectionne ses fiches, modifie le fichier, relit un aperçu avant/après et confirme un lot atomique avec motif.

Les identifiants, objectifs/étapes, relations, notes privées et choix de classe sont conservés. Les références différées sont signalées par feuille/ligne/colonne et résolues dans le même brouillon. Les révisions natives, conflits web/import/catalogue, archives et réessais sont protégés. Le catalogue partagé d’espèces et les dossiers d’admission ne sont pas exportés.

Aucune incarnation, ressource ou publication créée ; `publicationAvailable=false`. Les tableaux narratifs utilisent des cellules JSON (remplacement complet, IDs conservés), bornées à 32 000 caractères sans troncature. L’éditeur web reste nécessaire pour les collections plus longues. Un export ciblé n’est pas une sauvegarde globale.

### Références et suivi

- Organisateur, [CDC V3.5](https://github.com/gkerckhofs-a11y/gn-engine/blob/bad924e7389a53b67f44eba67bf7bec18e03f828/docs/source/SO_CDC_V35.md), §§3.2–3.6, 4.7–4.9, 8.3 ; [plan central, §5](https://github.com/gkerckhofs-a11y/gn-engine/blob/bad924e7389a53b67f44eba67bf7bec18e03f828/docs/SO-00-V34-PLAN-CENTRAL.md).
- [Contrat C2d, compatibilité et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/bad924e7389a53b67f44eba67bf7bec18e03f828/docs/SO-02-C2D-EXCEL-PERSONNAGES.md).
- [Description et preuves C2c archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/bad924e7389a53b67f44eba67bf7bec18e03f828/docs/PR-1-HISTORIQUE-AVANT-C2D.md).
- Consignes, matrice, 55 recettes, suivi V3.5, rapport de validation et reprise mis à jour. MST-01/02/07 et INS-06 : preuves préparatoires partielles ; SO-GAP-12/13/14 restent ouverts, aucun verdict complet requalifié.

### Validation locale — 24 octobre 2026

- Node **24.22.1** / npm **11.9.0** : **1043 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo ; build réussi.
- **17 nouveaux cas métier partagés Firestore**, quatre UI/XLSX et un parcours HTTP/Auth ajouté : aller-retour réel, confidentialité, références du même lot, réessai, concurrence, révocation, limites, rollback transactionnel, absence d’effets de jeu.
- Syntaxe HTTP/Firestore, diff et empreintes des quatre Masters vérifiés.
- Émulateurs non exécutés localement (Java 17). Aucun test humain Android/iOS, charge pilote ou restauration globale exécuté.

### CI du candidat

Commit distant **`bad924e7389a53b67f44eba67bf7bec18e03f828`** ; local `57448af0878c61a61b29b15068d28afb6279d043`, arbre identique `699bed56871b67dc49954f4fc3149392e56ba311`.

**Deux CI terminées avec succès le 24 octobre 2026, première tentative.** Journaux, SHA de checkout et état final des runs vérifiés ; zéro échec, annulé, ignoré ou todo dans chaque suite.

| Déclencheur | Exécution et job | Compilation | Tests applicatifs | Tests Firebase |
|---|---|---|---:|---:|
| Push | [40094898251](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40094898251) · [job 120874978534](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40094898251/job/120874978534) | Réussie | 1043/1043 | 824/824 |
| PR | [40094901527](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40094901527) · [job 120874988212](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40094901527/job/120874988212) | Réussie | 1043/1043 | 824/824 |

Les **17 nouveaux cas C2d partagés Firestore** et le **parcours HTTP/Auth Excel M2** sont présents et réussis dans les deux journaux. Runtimes constatés : Node **22.23.3**, npm **10.9.9**, Temurin **21.0.12+1**.

Checkout push : `bad924e7389a53b67f44eba67bf7bec18e03f828`. Checkout PR : fusion de vérification `65ec0b48f8c6d848efeab78e787fabba02a35270`, parents main `03eaace155b052d1b7d1960347746e9ee60ed514` et candidat `bad924e7389a53b67f44eba67bf7bec18e03f828`. Arbre commun vérifié : `699bed56871b67dc49954f4fc3149392e56ba311`. La PR demeure non fusionnée.

Avertissements préexistants observés : neuf paquets Firebase demandent Node ≥24.12.0 tandis que le workflow utilise Node 22 ; actions v4 ciblant Node 20 forcées sur Node 24, setup-java v4 déprécié. Aucun changement de dépendance ou de workflow dans ce lot.

### Compatibilité et suite

M1/M4, contrats historiques et quatre Masters conservés. Aucun changement de dépendance, workflow, règle/index Firebase ou marqueur de déploiement. Les anciens personnages sans plan ne reçoivent aucun plan implicite. Les tableaux JSON remplacent leur collection entière ; une ligne absente conserve la fiche.

Préserver changements, historiques, imports, reçus et catalogue dans une sauvegarde cohérente. C2c ne sait pas importer M2 et son contrôle refuse la nouvelle provenance XLSX M2 ; aucun rollback fonctionnel équivalent ni restauration globale revendiqué.

Suite : dotations M1, profils/effets exécutables et autres ateliers, validations complètes, publication immuable atomique, I3/I4/I5. PR en brouillon ; aucun merge, déploiement ou migration.

Main et tête de PR revérifiés le 24 octobre 2026 à 15:07, heure de Bruxelles. Main inchangé : `03eaace155b052d1b7d1960347746e9ee60ed514`. Dossier local propre ; sources distantes et locales identiques.
