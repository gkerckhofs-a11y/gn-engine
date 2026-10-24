# C2g — Boutiques et offres M5 dans le brouillon central

24 octobre 2026. Développement additif dans la PR #1, après C2f. Aucun merge, déploiement, adoption de campagne ou migration de données.

## Problème et parcours livré

Les objets M1 et recettes M4 pouvaient être préparés ensemble, mais M5 ne permettait pas de définir la boutique qui proposerait le même objet. C2g ouvre l’édition privée des boutiques et offres dans le brouillon initial commun.

Parcours : créer une offre → saisir les identifiants de sa future boutique et du modèle M1 → créer la boutique avec sa référence de vendeur M2 → préparer les définitions manquantes dans leurs ateliers → consulter les diagnostics recalculés → contrôler la préparation commune. Une recette M4 et une offre M5 utilisent le même modèle M1, sans le dupliquer. Archiver une cible signale les liens entrants ; la restaurer les résout sans réécrire les offres.

Sources : [CDC V3.5](source/SO_CDC_V35.md), §§3.3–3.6, 7.1 et 7.5, tranche SO-05 et REC-SO-MST-03/06/08 ; [règles V0.7](source/SO_Regles_V07.txt), contraintes économiques et création ; [vade-mecum](source/SO_Vademecum_V01.txt), séparation préparation/contrôle/publication. Le [gabarit documentaire M5 V0.1](SO-00-V34-GABARITS.md) reste une source préparatoire : son import n’est pas certifié par cette tranche. Aucun prix ni catalogue d’exemple n’est élevé au rang de barème canonique.

## Définitions et commandes

Les changements résident dans `campaigns/{id}/masterDrafts/initial/changes`, avec les autres ateliers. Aucun catalogue de boutique ou vendeur n’est copié dans la session.

| Type / identifiant de changement | Champs éditables | Commandes |
|---|---|---|
| `shop_{id}` | nom, description, `sellerCharacterId` M2, `locationTargetId`, notes MJ | `saveCentralShop`, `archiveCentralShop` |
| `offer_{id}` | libellé, `shopId` M5, `itemId` M1, `unitPrice`, `buybackPrice`, conditions, notes MJ | `saveCentralOffer`, `archiveCentralOffer` |

Chaque définition possède `schemaVersion:1`, `publicationState:DRAFT`, `masterArchived` et sa révision de contenu. Une commande exige la révision commune, la révision du contenu, un motif et un identifiant de requête. Source WEB, auteur, date, avant/après et reçu utilisent les mécanismes existants C1b. Une restauration est une nouvelle sauvegarde auditée ; aucune cascade ni suppression des liens entrants.

Les noms sont obligatoires (150 caractères), descriptions limitées à 6 000, conditions à 2 000 et notes à 10 000. Les références peuvent rester nulles dans un brouillon incomplet ; elles sont alors signalées. Les prix renseignés sont des crédits entiers strictement positifs, validés par `amountInput`. Un prix de vente absent reste à préparer ; un rachat absent signifie qu’aucun rachat n’est proposé. Pas de tarif par défaut, calcul de cours, pourcentage de revente ou certification des tarifs de jeu. Les nombres des fixtures sont exclusivement synthétiques.

Les champs de stock, compte, permission, publication, UID de vendeur ou QR ne sont pas acceptés. Les limites techniques sont de 50 boutiques et 250 offres, archives comprises. Elles ne sont pas des règles de jeu. Le budget du contrôle passe de 609 à **909 changements** ; les budgets de 16 Mio en entrée et 4 Mio de rapport restent identiques, sans troncature.

## Droits et références

L’édition M5 est une délégation explicite du propriétaire, accompagnée de la lecture M5. Ni le rôle MJ de session ni la désignation d’un vendeur ne donnent de droits supplémentaires. Les contrôles d’autorité et de cycle précèdent la restitution des reçus.

| Référence | Contrôle local M5 |
|---|---|
| Offre → boutique | Même brouillon M5 ; absence/archive signalée |
| Offre → objet | Lecture M1 requise ; sinon aucune requête de catalogue M1 ni révélation d’existence ou d’état |
| Boutique → vendeur | Lecture M2 requise ; sinon aucune requête de catalogue M2 ni révélation d’existence ou d’état |
| Boutique → lieu | Référence conservée mais contrôle central de lieu non raccordé |

Les suggestions autorisées contiennent uniquement ID, nom de définition, état d’archive, révision et source. Aucune biographie, secret, plan initial, admission ou note étrangère. Sans droit croisé, `REFERENCE_NOT_CHECKED` remplace toute information d’existence. La révocation prend effet à la requête suivante, y compris un réessai ; elle ne peut effacer une information déjà consultée.

Une définition M2 valide peut être référencée sans être déclarée PNJ : le statut et l’habilitation de vente restent à préparer. Les instances de session et les définitions d’une autre campagne ne résolvent jamais ces références.

## Contrôle commun et limites fonctionnelles

`checkCentralDraft` valide les nouveaux formats et leur provenance, ajoute les liens typés `offer → shop`, `offer → item`, `shop → character` et `shop → fieldTarget`, puis localise les erreurs avec le type de source/cible. Des identifiants identiques entre types ne se confondent pas. Une définition corrompue est exclue et signalée ; elle ne peut servir de cible valide. Une provenance XLSX M5 est refusée tant que son contrat n’est pas livré.

Le rapport reste transactionnel, réservé au propriétaire ou au contrôleur C2b, sans écriture. Empreinte interne portée de 3 à 4 ; relancer le contrôle après mise à jour. M5 est **PARTIAL**, `publicationAvailable=false`. Les notes MJ ne sont pas reproduites dans le résumé global.

Restent à développer : import/export M5, lieux/QR, statut et autorisations du vendeur, propositions de stock, compte/caisse, prix de jeu et restrictions de revente, catalogue publié, devis et transaction de boutique. Aucun stock, lot, crédit, compte, ressource ou accès public n’est créé. Les services historiques de marché et de vente ne sont pas utilisés pour créer ces définitions. Publication centrale, I3/I4/I5 et recette terrain restent distincts.

## Vérifications et compatibilité

24 nouveaux cas métier partagés mémoire/Firestore : droits, confidentialité et non-lecture étrangère, références différées, absence de ressources, formats/prix/bornes, vendeur et lieu, archive/restauration, homonymes/corruption, objet partagé avec M4, réessais/révocation, concurrence avec M1/M2/M4 et M5, limites, imports M1/M2, isolation, interruption transactionnelle et gardes de cycle. Cinq cas UI couvrent échappement, lecture seule, formulaires/révisions, suggestions, prix vides et archives typées. Un parcours HTTP/Auth exerce la création, le changement des droits croisés, l’archive/restauration et la révocation avant reçu.

**Local : `npm run build` et 1 115/1 115 tests applicatifs réussis, zéro échec/annulé/ignoré/todo**, Node 24.22.1 / npm 11.9.0. Les fichiers d’intégration passent le contrôle de syntaxe. Firebase non lancé localement (Java 17) ; les résultats de Node 22/Java 21 sur le commit distant exact doivent être consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), après terminaison des deux exécutions. Tests de formulaires HTML, sans recette visuelle de navigateur, Android/iOS ou charge réelle.

Les quatre Masters CAMPAGNE/SESSION, sources canoniques, contrats historiques, dépendances, workflows, règles/index Firebase et marqueur de déploiement restent inchangés. Les imports M1/M2 conservent les définitions M5 et recalculent les liens ; les exports ciblés ne les sauvegardent pas.

Sauvegarder l’ensemble cohérent campagne/préparation/brouillon/changements/historiques/délégations/reçus, y compris les nouveaux types M5. C2f ne connaît ni ces types au contrôle ni les grants d’édition M5 : un retour à ce binaire n’est pas fonctionnellement équivalent. Aucune migration ni restauration complète exécutée ; ne pas supprimer les définitions pour permettre un retour logiciel.

REC-SO-MST-03/06/08 reçoivent des preuves préparatoires partielles : références stables, absence de ressources et archives sans duplication. La publication, les propositions/dotations de stock et M7 ne sont pas validés. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés. Prochaine dépendance : compléter les contenus et contrôles centraux requis avant la publication globale.
