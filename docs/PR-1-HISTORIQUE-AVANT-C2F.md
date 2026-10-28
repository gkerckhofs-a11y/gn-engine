# Description de PR avant C2f

Conservée le 24 octobre 2026. Cette validation concerne C2e, pas le futur commit C2f.

M1 permet désormais de **préparer les kits initiaux des huit classes V0.7** en reliant leurs éléments aux modèles d’objets du même brouillon. Éléments et quantités sont fixés par le référentiel ; seuls les identifiants de modèles et les notes privées sont modifiables.

Les diagnostics distinguent références non renseignées, absentes, archivées et consommables requis. Révisions, droits M1, réessais, archives/restaurations et historique sont ceux du Master central. Modèles et kits de même ID restent distincts ; les imports M1 conservent les kits et recalculent leurs références.

**Aucune dotation effective** : aucun lot, compte, crédit, personnage ou QR créé. Les 200 Cr protégés et restrictions du kit sont rappelés en préparation ; leur application à la naissance reste I4. Les attributs ordinaires des objets achetés ensuite sont conservés. `publicationAvailable=false`.

### Références et limites

- Organisateur : [CDC V3.5](https://github.com/gkerckhofs-a11y/gn-engine/blob/0fa4d4af7855492fbffdc6e92c7a504816f959d0/docs/source/SO_CDC_V35.md), §§3.3, 3.6, 4.7–4.9 et annexe A.2 ; [règles V0.7](https://github.com/gkerckhofs-a11y/gn-engine/blob/0fa4d4af7855492fbffdc6e92c7a504816f959d0/docs/source/SO_Regles_V07.txt), chapitre 3 « Dotation par classe ».
- [Contrat C2e et couverture détaillée](https://github.com/gkerckhofs-a11y/gn-engine/blob/0fa4d4af7855492fbffdc6e92c7a504816f959d0/docs/SO-02-C2E-KITS-INITIAUX.md).
- [Description et preuves C2d archivées](https://github.com/gkerckhofs-a11y/gn-engine/blob/0fa4d4af7855492fbffdc6e92c7a504816f959d0/docs/PR-1-HISTORIQUE-AVANT-C2E.md).
- 8 kits maximum, archives comprises ; plafond de contrôle global **609 définitions**, budgets 16 Mio/4 Mio inchangés.
- Fournitures/outils pluriels référencés comme un ensemble : conditionnement technique, sans inventer le contenu. Arme homologuée si applicable à la naissance ; noms de modèles insuffisants pour certifier leurs effets ou homologation.
- Codes commerciaux publics, contacts initiaux, QR, protections économiques et attribution restent à raccorder. Le contrôle vérifie les kits préparés, pas encore leur présence pour toutes les classes utilisées dans M2.
- Export Excel M1 limité aux modèles d’objets ; kits dans l’éditeur web. Le fichier ciblé ne sauvegarde pas ces nouvelles définitions ni historiques/droits/reçus.
- Consignes, matrice, 55 recettes, suivi V3.5, rapport de validation et reprise mis à jour. REC-SO-01/24, MST-03/06/08 et INS-06 : preuves préparatoires partielles ; SO-GAP-12/13/14 et verdicts complets inchangés.

### Validation locale — 24 octobre 2026

- Node **24.22.1** / npm **11.9.0** : **1067 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo ; compilation réussie.
- **19 nouveaux cas métier partagés Firestore**, un test pur des huit compositions, quatre UI et un parcours HTTP/Auth ajouté.
- Références, consommables, attributs d’objets préservés, réessais, droits/révocation, concurrence kit/objet/espèces, collisions intertypes, corruption, imports, isolement des dossiers et interruption transactionnelle couverts.
- Syntaxe application/HTTP/Firestore, diff et empreintes des quatre Masters vérifiés.
- Émulateurs non exécutés localement (Java 17). Aucune recette humaine Android/iOS, charge pilote, restauration globale ou naissance protégée exécutée.

### CI du candidat

Commit distant **`0fa4d4af7855492fbffdc6e92c7a504816f959d0`** ; local `ef36b9521286d4c57cce9d8cf0d9fafe10e1c0aa`, arbre identique `2c9b194d25bd1b533e04b509f6db9ae98ce58dd1`.

**Deux CI terminées avec succès le 24 octobre 2026, première tentative.** Journaux, SHA de checkout et états finaux vérifiés ; zéro échec, annulé, ignoré ou todo dans chaque suite.

| Déclencheur | Exécution et job | Compilation | Tests applicatifs | Tests Firebase |
|---|---|---|---:|---:|
| Push | [40098537397](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40098537397) · [job 120885753266](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40098537397/job/120885753266) | Réussie | 1067/1067 | 844/844 |
| PR | [40098542191](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40098542191) · [job 120885767897](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40098542191/job/120885767897) | Réussie | 1067/1067 | 844/844 |

Les **19 nouveaux cas C2e partagés Firestore** et le **parcours HTTP/Auth des kits M1** sont présents et réussis dans les deux journaux. Runtimes constatés : Node **22.23.3**, npm **10.9.9**, Temurin **21.0.12+1**.

Checkout push : `0fa4d4af7855492fbffdc6e92c7a504816f959d0`. Checkout PR : fusion de vérification `5918693d12c8d777eebce9da3f8508718dc5a65b`, parents main `03eaace155b052d1b7d1960347746e9ee60ed514` et candidat `0fa4d4af7855492fbffdc6e92c7a504816f959d0`. Arbre commun vérifié : `2c9b194d25bd1b533e04b509f6db9ae98ce58dd1`. La PR demeure non fusionnée.

Avertissements préexistants observés : neuf paquets Firebase demandent Node ≥24.12.0 tandis que le workflow utilise Node 22 ; actions v4 ciblant Node 20 forcées sur Node 24, setup-java v4 déprécié. Aucun changement de dépendance ou de workflow dans ce lot.

### Compatibilité et suite

Quatre Masters historiques, dépendances, workflows et règles/index Firebase inchangés. Aucune donnée réelle migrée, aucun marqueur de déploiement modifié. Les kits sont des changements M1 supplémentaires avec historique/reçus ; préserver l’ensemble cohérent du brouillon. C2d ne connaît pas ce type et n’est pas un rollback fonctionnel équivalent.

Suite : raccordement sémantique profils/effets/kits, validations complètes, version immuable/activation atomique, I3 admissions vers M2, I4 naissance protégée et I5 relève. PR en brouillon ; aucun merge, déploiement ou migration.

Main et tête de PR revérifiés le 24 octobre 2026 à 16:00, heure de Bruxelles. Main inchangé : `03eaace155b052d1b7d1960347746e9ee60ed514`. Dossier local propre ; sources distantes et locales identiques.
