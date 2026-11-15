# C2.2 / C3 — Prestations PNJ sur modules droïdes

15 novembre 2026. Branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45).
Base `31b3605592e26ea1a77eddb0c17ca904888e5f21` : [CI 43732238948](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43732238948) entièrement réussie, dix jobs dont six lots Firestore. La CI du nouveau candidat est suivie séparément dans la PR.

## Sources et portée

- [CDC de clôture V1, C2.2 et C3.1–C3.3](source/SO_CDC_Competences_Cloture_V1.md) : prestations PNJ, modules réels, autorisation du propriétaire, conservation de l’identité et des ressources.
- [Livre V0.7, chapitres 4, 11 et 14](source/SO_Regles_V07.txt), [CDC V3.5, annexe A](source/SO_CDC_V35.md) : tarifs DR-01–06, pièces, crédits protégés et absence de recharge gratuite.
- Réemploi du catalogue `space-droid-modules.mjs`, des `personActions`, des comptes et du journal natifs. La répartition prestataire/client suit le parcours PNJ existant de `space-maintenance.mjs` : les compétences et le PA sont ceux d’un technicien joueur lorsqu’il réalise lui-même l’intervention ; le client d’une prestation PNJ paie les crédits, sans devoir posséder les compétences du technicien ni dépenser un PA. Le temps de l’intervention reste imposé.

## Parcours livré

La régie choisit un protocole de pose, retrait ou réparation, un atelier publié, un comptoir situé dans cet atelier avec sa caisse déjà ouverte, et un nombre fini de prestations disponibles. Elle autorise ou non les crédits protégés pour la main-d’œuvre. Les commandes de configuration restent réservées aux autorités MJ existantes et sont auditées ; un profil ayant une réservation active ne peut pas être remplacé. Aucun comptoir, crédit, stock de modules ou réserve de pièces n’est créé par cette configuration.

Le propriétaire droïde actif consulte la prestation sur sa propre fiche, choisit son module et, pour une réparation, un lot personnel de pièces réellement disponibles. Il confirme le devis avant le démarrage. Un PNJ ne peut intervenir sur le module d’un tiers à la place de celui-ci. L’achat préalable du module et des pièces utilise les circuits existants.

| Intervention | Module N1 | Module N2 | Fournitures |
| --- | --- | --- | --- |
| Pose | 50 Cr, 5 minutes | 100 Cr, 10 minutes | Module déjà possédé, emplacement libre |
| Retrait | 50 Cr, 5 minutes | 50 Cr, 5 minutes | Contenant vidé avant retrait |
| Réparation durable | 50 Cr, 5 minutes | 100 Cr, 10 minutes | Pièces de 25 % du neuf arrondies aux 25 Cr supérieurs |

Les modules installés ou déposés peuvent être réparés. Identité, propriété, contenu et emplacement sont conservés. La pose reste séparée de la réparation d’un module dans le sac. Aucun PV, point de protection, troisième emplacement ni jet n’est créé. Les compétences, PA et récupérations des interventions réalisées par des joueurs sont conservés.

## Réservation, paiement et continuité

Le démarrage réserve le module, les pièces et une prestation. La main-d’œuvre est retirée du disponible du client et placée dans le solde réservé de la caisse PNJ existante ; cette somme est indisponible au comptoir jusqu’à l’achèvement. Le journal conserve séparément les montants ordinaires et protégés. Le coût annoncé, la révision de l’offre, la caisse et le portefeuille font partie de la confirmation.

L’achèvement valide encore le lieu, les droits et l’état du module, consomme les pièces et une prestation, puis libère la recette PNJ dans la même transaction que la modification du module. Une annulation rend les pièces et la capacité réservées et restitue exactement les catégories de crédits initiales. Elle ne convertit pas les crédits protégés en crédits ordinaires. Les trois événements du journal sont `DROID_SERVICE_RESERVE`, `DROID_SERVICE_SETTLE` et `DROID_SERVICE_REFUND` ; le reçu d’intervention finit en `PAID` ou `REFUNDED`.

Deux clients ne peuvent pas réserver la dernière prestation. Une confirmation répétée n’entraîne ni second paiement ni second remboursement. Les sommes réservées du comptoir ne deviennent pas dépensables pendant l’intervention. Un accès joueur révoqué bloque sa résolution et ses anciens reçus ; la régie peut annuler et restituer les ressources. Une panne d’atelier bloque l’achèvement mais pas l’annulation.

La pause et STOP suspendent le parcours selon les règles temporelles existantes. Une intervention ouverte bloque la clôture de l’épisode. Une fois close, les comptes, le module, les reçus et la capacité restante traversent l’épisode suivant sans renouvellement automatique. `droidServicesVersion=1` ne s’active que dans les nouvelles versions publiées ; les versions historiques restent fermées.

## Validation

- **193 tests applicatifs ciblés réussis** : `space-droid-services`, `space-droid-work`, `space-droid-storage`, `person-actions`, `person-ui`, `space-outlaws-health`, `space-outlaws-entry`, `space-episodes`, `economy`, `space-outlaws-shops`, `ci-selection` et `ci-targeted`.
- Huit scénarios métier partagés mémoire/Firestore : tarifs et cycles des six modules ; paiement mixte et remboursement ; dernière capacité disputée ; version périmée, fonds insuffisants et ancien manifeste ; atelier indisponible et révocation ; interface et propriété ; interruption transactionnelle ; pause/STOP et épisode suivant.
- Un parcours HTTP/Auth : 401/403, devis, répétition du démarrage et de l’achèvement, montant protégé, capacité consommée, projection privée et refus après révocation.
- Emulateurs Firestore/Auth/Storage uniquement sur `demo-gn-engine`. Suite `GN_FIRESTORE_SUITES='["space-droid-services"]'`, motif `Prestations PNJ droïdes|HTTP \+ Auth : prestation PNJ droïde` sur `test/integration/firestore.test.mjs` et `test/integration/http.test.mjs`. La suite est enregistrée dans la sélection CI existante ; aucun pipeline parallèle.
- `npm run build` et `git diff --check` réussis. Aucun navigateur local, téléphone ou test GN réel certifié.

## Limites

Ce parcours concerne le module personnel de son propriétaire droïde actif et les pièces qu’il apporte. Il ne crée pas de mandat de réparation sur les biens d’un tiers ou d’un comptoir, ni de reprise automatique. La négociation COU-02 de ces prestations reste au chantier C6 ; le tarif PNJ n’est pas négociable automatiquement. Les rares/prototypes de vaisseaux, leurs effets et raccords C2/C4/C5, l’intrusion des soutes/coffres, les services/fret/contrats C6 et la recette intégrée restent ouverts. Aucun merge, déploiement Firebase, migration ou changement de permissions.
