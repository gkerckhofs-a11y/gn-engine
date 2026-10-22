# L0 — Audit de reprise GN Engine V2

Audit du 22 octobre 2026. **Le moteur existant est conservé.** Le lot suivant est une tranche de L1, candidate **0.37.0**, sur `work/l1-modular-workshop`. La production reste en **0.36.0**. Aucune fusion, demande de déploiement, donnée de production ou modification des droits Firebase n’est autorisée ni effectuée dans cette reprise.

## Référentiel et preuves

Le [cadrage V2 intégral](source/GN_Engine_Cahier_des_charges_Work_Astra_V2_0.md) est reproduit sans modification depuis la pièce jointe. SHA-256 : `e86478ceffb76d3261725e6a69f20481a4feb587c28c0f3edd7b7725805e96ce`. Ses 476 lignes ont été lues. `[V]` reste une décision validée, `[P]` une proposition, `[A]` un arbitrage de scénario ; les sections mixtes restent mixtes. Les instructions de reprise rendent explicites les six modules, les frontières d’accès privé, le réemploi des services et la réparation après tout combat. Aucun chiffre définitif d’Outcasts n’est ajouté.

| Contrôle L0 | Résultat observé |
| --- | --- |
| HEAD distant de `main` | [`03eaace155b052d1b7d1960347746e9ee60ed514`](https://github.com/gkerckhofs-a11y/gn-engine/commit/03eaace155b052d1b7d1960347746e9ee60ed514) |
| Arbre source | `3777bed0ef6b571b268b33b454c6a7c4ca76ccc4` |
| Copie locale initiale | Historique local différent (`462471d`), **arbre identique** ; aucun écart source initial. La branche distante est créée depuis le HEAD réel de main. |
| Version déclarée initiale | `package.json` : **0.36.0** |
| Compilation relancée sur le socle | `npm run build` : réussie |
| Tests relancés sur le socle | `npm test` : **648 réussis**, 0 échec, 0 ignoré, 0 annulé ; Node local **24.19.0** |
| Dernière vérification de main | [GitHub Actions 39733876521](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39733876521), succès, mise à jour 22/10 à 06:42:18 UTC |
| Dernier déploiement observé dans GitHub | [39731774273](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39731774273), succès à 06:24:29 UTC ; commit de publication `d5334d8dfcb493421c9bd4efaf83c50eb56e373f` |
| État publié relu au navigateur | `https://gn-engine.web.app/#/` : accueil public, connexion requise pour l’espace personnel, pied de page **0.36.0**. Lecture seule ; aucun scénario privé visité ou modifié. |
| Firebase historique du socle | Le [rapport 0.36](VALIDATION-0.36.md) consigne **522 tests** réussis. Ce n’est pas une nouvelle exécution locale dans L0. |
| Recette humaine | L’accueil public a été observé ; **aucune recette privée multi-comptes, Android/iOS ou charge réelle à 60 participants n’est déclarée faite**. |

Le pipeline de vérification de branche/PR exécute compilation, tests applicatifs et émulateurs avec **Node 22 / Java 21**, sans accès Firebase de production. La machine locale possède Java 17 : la preuve des émulateurs est attendue du pipeline, pas déduite de l’exécution locale.

## Quatre Masters préservés

Ces quatre fichiers sont conservés byte pour byte dans L1a. Le contrat reste version 1 ; `Meta.module` est une extension facultative du lecteur et du serveur. Les téléchargements globaux existants restent accessibles séparément pour Campagne et Session.

| Fichier dans `assets/masters/` | SHA-256 initial |
| --- | --- |
| `GN_Engine_Master_Campagne.xlsx` | `09fc513f054444170d08a4c8ed4a21244b12ac442ebfce51479090e4b23d394a` |
| `GN_Engine_Master_Session.xlsx` | `d1ba99664a227a54faf6522e10f4943f9144b5cffd0b2ab9b1b97b11a3bb856b` |
| `GN_Engine_Exemple_Campagne.xlsx` | `4153682948869ab96568acc463d8c3fd28cba46adcd838065d6debe0865d8a67` |
| `GN_Engine_Exemple_Session.xlsx` | `823fc93ec6cbbf86fbca368452aff587286d2a90031a362aa883b6941328dc96` |

## Architecture à réutiliser

| Frontière | Source existante | Décision de reprise |
| --- | --- | --- |
| Commandes authentifiées | `src/server/index.mjs`, `src/core/workflow.mjs`, `staff.mjs` | Conserver l’API de commandes et les rôles. L1a ne donne aucun nouveau droit au MJ/Accueil/joueur. |
| Modèle, version figée, session | `scenario-package.mjs`, `scenario-archives.mjs`, `session-seed.mjs` | Les catalogues restent dans `scenarios/...` ; les versions et copies de session gardent leur autonomie. Pas de collection « module » dupliquant les données. |
| Campagne persistante | `campaigns.mjs`, garde transactionnelle de scellement | Préparation paginée, contrôle des opérations ouvertes, conservation des acquis et attribution réelle contrôlée au nouvel épisode. |
| Imports | `masters.mjs`, `master-*.mjs`, `shared/master-schema.mjs` | Réutiliser plan, validation des références, confirmation, empreintes, audit et transaction. Ajouter une frontière de module au même pipeline. |
| Inventaires et comptes | `inventory-state.mjs`, `inventory-transfers.mjs`, `economy-state.mjs`, `collective-accounts.mjs` | Un seul lot et un seul compte métier. Les futurs magasins et butins s’y brancheront. |
| Stockage et fret | `logistics.mjs`, `storage-state.mjs`, `cargo.mjs`, `customs.mjs` | Propriété et emplacement distincts ; capacités, remise/réception et droits existants. |
| Navigation et économie | `voyages.mjs`, `navigation-state.mjs`, `prices.mjs`, `price-state.mjs` | Carburant consommé une fois, trajet figé et temps de jeu ; les événements n’altèrent pas les opérations déjà engagées. |
| Compétences et actions | `abilities.mjs`, `person-actions.mjs`, `field-actions.mjs`, `action-points.mjs`, `clock.mjs` | Réemployer coûts, durées, aide, stocks finis, règles de soin et tirages. Le hacking ludique générique reste à créer. |
| Accès et médias | `projections.mjs`, `knowledge.mjs`, `media.mjs`, `media-state.mjs` | Projections serveur et références d’image existantes ; jamais de secret envoyé puis masqué. Le badge public n’est pas une invitation privée. |
| Communication | `announcements.mjs`, `contracts.mjs`, `bounties.mjs`, `mission-parties.mjs` | Reprendre audiences, candidatures personnelles/collectives, preuves et règlement. Rendez-vous et déclencheurs génériques absents. |
| Interface | `web/app.mjs` et modules UI métier | Réorganiser les outils existants ; garder les quatre espaces joueur. Le grand fichier app reste une dette de découpage, pas un motif de réécriture du moteur. |

La hiérarchie **Univers → Scénario → Version → Session/Campagne → Épisode** est une cible V2. Le socle possède scénario, versions, sessions et campagnes ; **il n’a pas d’entité Univers autonome**. L1a n’en simule pas une. Les bibliothèques transversales doivent référencer les catalogues et médias existants, pas les recopier dans chaque module.

## Écarts documentaires

README, Architecture, Espaces joueur, Actions de terrain, Médiathèque, Campagnes, Archives de scénario, Logistique, Masters et Validation 0.36 ont été examinés avec le code. Plusieurs sections historiques « restant » sont périmées : le fret, les soins/pillages enrichis, la navigation, les événements et l’import de tarifs ont été livrés après leur rédaction. Le guide Masters est cumulatif jusqu’à 0.36. La matrice s’appuie sur le code actuel et les suites associées ; elle ne reprend pas ces anciennes listes comme état courant.

L’archive de scénario n’est **pas** une sauvegarde complète de session : elle ne transporte pas inscriptions, accès réels, transactions et états joués. Le futur bilan et la restauration intégrale restent à construire.

## Risques et garde-fous

| Risque | Conséquence | Traitement / dépendance |
| --- | --- | --- |
| Réimport de dotations ou remise à zéro des acquis | Crédits ou biens dupliqués entre épisodes | Garder stamps, création unique et copie des états. Tests historiques + nouveaux tests de conservation. |
| Mauvais module/destination | Modification involontaire d’un autre domaine | Contrôle serveur du module déclaré/choisi, des onglets, paramètres, contexte et références. Un Master global reste un parcours explicitement distinct. |
| Éditeur en ligne parallèle | Règles et historiques divergents | Le premier éditeur Tarifs produit des lignes du même contrat puis passe par le plan/apply existant. |
| Export périmé / deux organisateurs | Écrasement d’une modification récente | Révision de destination, version de ligne et confirmation liée à l’état ; réexport demandé. Un exact réimport sans effet peut être reconnu inchangé. |
| Ancien client sur extension facultative | Affichage ou écriture incompatible | Aucun schéma de donnée métier requis par L1a ; quatre Masters inchangés. Ne pas remettre en ligne un ancien client pour appliquer un fichier modulaire. |
| Nouvelle entité magasin/vaisseau | Deux stocks, deux soldes ou butin copié | L3/L5 dépendent des comptes, lots, réservations, permissions et projections existants. Ajouter des instances et références, pas une économie parallèle. |
| Accès privé confondu avec hacking | Fuite ou usurpation de personnage | Frontière absolue : QR d’interaction autorisé seulement ; aucune mutation d’authentification/invitation/rôle. |
| Transactions/volumes Firestore | Dépassement de limites ou conflits | Conserver plafonds d’import (250 lignes, 1 Mio de contenu, 420 écritures), limites catalogue/archives et lecture avant écriture. Mesurer la charge réelle séparément. |
| Migration des nouveaux états spatiaux | Épisode incohérent, vaisseau redémarrable après combat | Concevoir avant L5 snapshot, fermeture des opérations ouvertes, héritage des avaries et réparation obligatoire des deux camps. |
| Sauvegarde insuffisante | Retour arrière de données joué impossible | Pas de migration majeure dans L1a. Avant une future migration, procédure de sauvegarde/restauration testée exigée. |

## Ordre des dépendances et retour arrière

L1 stabilise navigation, contrat et édition modulaire. L2 unifie résolution QR et actions de jeu. L3 branche les boutiques sur comptes/lots. L4 complète communication/rendez-vous/déclencheurs. L5 ajoute modèles/achats de vaisseaux, passagers, renseignement, protection, interception, combat, butin réel et réparation. L6 exécute recette intégrale et mesures de charge avec seuils préalables.

L1a n’introduit aucune collection métier, migration de données, modification de règles ou index Firebase. Revenir au code 0.36 n’efface pas les définitions déjà modifiées ; leur restauration demanderait une correction/import avec motif, **pas** une suppression de journaux. Le retour de code et la restauration de données restent deux opérations distinctes. Avant toute publication future : revue de PR, recettes choisies, vérification de compatibilité et autorisation explicite de déploiement.

La [matrice complète](MATRICE-V2.md) couvre **119 exigences numérotées et 27 recettes**, sans déclarer les fonctions futures réalisées. Le [périmètre L1](L1-ATELIER-MODULAIRE.md) définit le lot complet et sa première tranche.
