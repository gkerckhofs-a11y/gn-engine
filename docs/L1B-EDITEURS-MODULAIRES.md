# L1b — Premiers éditeurs dans les six modules

22 octobre 2026. Candidat 0.37.0, branche `work/l1-modular-workshop`, PR #1. Cette tranche prolonge L1a sans déploiement ni migration de production. Elle ne clôture pas L1.

## Périmètre et critères d’acceptation

| Module | Contenu édité et exporté dans L1b | Hors de cet export |
| --- | --- | --- |
| Personnages | Identité publique, textes privés, publication, références de portraits ; valeurs initiales dans le scénario ou à la création en session | Classes, compétences attribuées, membres, relations, objectifs, dotations et acquis |
| Communication | Objectifs rattachés à leur personnage, texte, publication et notes MJ | Étapes détaillées, annonces, contrats, rendez-vous |
| Magasins | Catalogue commun des objets : conditionnement, volume, légalité, recharge, publication, image | Lots réels, ventes, boutiques autonomes |
| Spatioport | Routes : ports, durée, carburant, ouverture | Vaisseaux, paramètres du port local, voyages en cours et fonctions spatiales futures |
| Économie / Stockage | Entrepôts : capacité, loyer, période, caisse bénéficiaire, ouverture | Locataires, baux, stocks, comptes, cours et événements ; Tarifs conserve son éditeur L1a |
| Informations / Fouilles | Connaissances, indices, documents textuels, règles de découverte et confidentialité | Reçus acquis, lieux, profils de fouille et réserves de récompenses |

Chaque carte propose un bouton **Master** portant le nom précis du contenu disponible. Le parcours est : consulter/rechercher/filtrer → créer, modifier, dupliquer ou archiver → motif → aperçu → confirmation. Un aperçu erroné permet de revenir à la fiche en conservant champs et motif. Les contrôles du serveur restent obligatoires à la confirmation.

**Exporter les fiches affichées** exporte seulement la sélection obtenue par recherche et filtre, dans Meta et la feuille indiquée. Aucun export n’est présenté comme un Master complet du module. Les quatre Masters globaux Campagne/Session restent disponibles et inchangés. Le format du contrat reste 1.

## Comportement et protections

- Les lectures et exports sont réservés au propriétaire du scénario ou de la session ; les outils MJ existants gardent leurs droits.
- Les formulaires utilisent `prepareMasterImport` puis `applyMasterImport`. Références, publication, médias, audit, transactions et idempotence sont ceux des imports existants.
- Les nouveaux identifiants et les prochaines versions de ligne proviennent du serveur. L’identité du personnage d’un objectif existant ne se modifie pas depuis le formulaire.
- Un export est lié à sa destination, sa campagne, son module et sa révision. Une modification concurrente oblige à refaire l’aperçu ou l’export. Un même import déjà appliqué ne redistribue rien.
- Les valeurs chiffrées de création restent à renseigner. Aucun barème Outcasts n’est ajouté. Les duplications sont en brouillon ou fermées ; un QR de connaissance dupliqué est désactivé et ses destinataires initiaux vidés.
- Dupliquer un personnage copie les champs de fiche exposés, sans attribution de joueur, dotation, compétence, objectif ni relation. Dupliquer un objectif ne copie pas ses étapes détaillées : l’interface le précise. Modifier un objectif existant conserve ces étapes.
- En session, les exports et formulaires des personnages existants omettent niveau et PV initiaux ; ceux des connaissances omettent les destinataires initiaux. Les corrections d’acquis passent par leurs outils dédiés.
- Les comptes, stocks, reçus, carburant, voyages, baux et historiques ne figurent pas dans les fichiers exportés. Les définitions conservent leurs liens vers les services communs ; aucune collection métier nouvelle.
- L’archivage ferme ou dépublie, avec les protections de dépendances existantes. Un objectif utilise le comportement existant « Dépublier », sans prétendre disposer d’un état d’archive distinct.
- Si des objectifs anciens partagent un identifiant entre personnages, le Master les signale et bloque édition/export ambigus. Aucun identifiant n’est renommé automatiquement ; utiliser les fiches pour les corriger.
- Après le premier lancement de session, l’atelier reste consultable/exportable selon les droits, mais l’import structurel est fermé. La régie demeure distincte.

## Architecture et compatibilité

`src/shared/master-editors.mjs` décrit les formulaires des feuilles existantes ; ce fichier ne contient aucune donnée métier. `src/core/master-editor-projection.mjs` projette explicitement leurs définitions. La lecture existante `masterWorkspace` accepte désormais un module ; son appel sans module et l’éditeur Tarifs sont conservés. `web/master-editor.mjs` rend les formulaires et les sélections ; `web/masters.mjs` réutilise son contrôleur et ses confirmations.

Aucun changement de collections, de contrat des quatre XLSX, de dépendance npm, de droits Firebase, de règle, d’index ou de workflow. Aucun changement de `.github/deploy-request.json`. Retour de code possible vers L1a ; cela ne restaure pas automatiquement des définitions qu’un organisateur aurait ensuite modifiées. Aucun essai dans les données réelles.

## Validation du lot

Contrôles locaux du 22 octobre 2026, Node 24.19.0 :

- `npm run build` : réussi.
- `npm test` : **672 tests réussis**, aucun échec, ignoré ou annulé.
- Sept nouveaux scénarios métier partagés entre mémoire et Firestore : droits/projections ; création/modification/archivage et XLSX dans les six modules ; duplication ; préservation des acquis en session ; création en session et références ; conflit/réessai ; identifiants d’objectifs ambigus.
- Quatre nouveaux tests d’interface : formulaires et valeurs non imposées ; filtres/export ; champs protégés ; contrôleur avec correction de saisie puis confirmation. Les tests existants de navigation sont adaptés à l’ouverture en lecture seule.
- Les quatre Masters sont inchangés ; leur lecture et application restent couvertes par la suite.

La CI Node 22 / Java 21 avec émulateurs sera exécutée sur le commit de cette tranche. Le résultat et ses liens sont consignés dans la PR sur ce commit exact ; aucun résultat distant n’est revendiqué avant sa fin.

### Recette humaine à réaliser en environnement de test

| Parcours | Résultat attendu | État |
| --- | --- | --- |
| Ouvrir chaque Master sur ordinateur et téléphone | Formulaires lisibles, boutons utilisables, contexte exact | Non exécuté |
| Créer/modifier une fiche de chaque type | Aperçu correct, correction sans perte, écriture après confirmation seulement | Non exécuté |
| Filtrer, exporter, ouvrir dans Excel/LibreOffice puis réimporter | Contenu sélectionné, colonnes lisibles, champs modifiés appliqués au bon module | Non exécuté |
| Dupliquer personnage, objectif et connaissance | Nouvel identifiant, publication sûre, aucun acquis copié | Non exécuté |
| Éditer depuis deux fenêtres et réessayer après coupure réseau | Refus du conflit ; une seule opération appliquée | Non exécuté |
| Préparer puis lancer un épisode | Acquis conservés ; Master ensuite en lecture seule | Non exécuté |

Les tests de rendu/contrôleur ne constituent pas une recette visuelle sur appareils. Aucune charge simultanée ni ouverture humaine Excel/LibreOffice n’a été exécutée pour cette tranche.

## Suite de L1

Compléter les autres feuilles et leurs paramètres, les références multiples guidées, les dépendances visibles, le comparateur de versions et les historiques consolidés. Les magasins PNJ, rendez-vous et nouveaux systèmes spatiaux restent dans leurs lots métier. La stratégie d’[AGENTS.md](../AGENTS.md) impose une recette finale isolée, un rapport global et une procédure de déploiement avant toute autorisation de publication.
