# Économie galactique — audit, matrice et premier parcours

Auteur : Codex, 14 novembre 2026. Source : [cahier unifié fourni par Guillaume](source/SO_Galactic_Economy_V1.md), règles [V0.7, chapitres 23–25](source/SO_Regles_V07.txt). Aucun déploiement Firebase ni fusion autorisé.

## Base vérifiée

`main` : `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`. PR #2 et #15 déjà fusionnées. Dépendances ouvertes : #35 navigation organisateur, #36 circuits personnels/commerciaux, #37 Vaisseau/équipages, #38 textes HRP. PR #3 : audit Firebase distinct, non repris. Base de cette tranche : `5666582a65d6ab7ca4601bf1357552e61644681a`, après #38 ; sa CI complète [43595558910](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43595558910) est réussie. La CI de la nouvelle tranche doit être vérifiée sur son propre SHA, dans sa PR.

## Matrice de réutilisation et suivi

| Fonction | État initial vérifié | Travail de cette tranche | Contrôles | Suite et limites |
|---|---|---|---|---|
| Prix | `prices.mjs`, `price-state.mjs` : cours communs, événements, arrondis, devis indexés | Douze références V0.7 et états 0,85 / 1 / 1,15 / 1,30 ; calcul via `commodityQuote` existant | Références, arrondi, deux marchés, changement avant paiement | Les anciens cours et événements globaux sont conservés ; pas de conversion automatique |
| Stocks | `shops.mjs`, `sales.mjs` et inventaire natif : stock fini, paiement et propriété, retrait distinct | Chaque marché relie explicitement une offre commerciale à un port ; aucun nouveau stock parallèle | Achat distant, quantité finie, concurrence, conservation | Provision via la régie des boutiques, source et motif obligatoires |
| Demande et budget | Caisse PNJ et réservations financières déjà présentes ; pas de rachat ordinaire local | Demande finie ; reprise locale à 85 % du cours, caisse réellement disponible, stock et argent atomiques | Fonds/demande insuffisants, absence de double débit | Caisse partagée entre les offres du même comptoir, annoncée dans l’interface. Pas de dotation monétaire nouvelle par ce réglage |
| Bourse | Marché entre Courtiers, fournisseurs dans les boutiques | Route `#/galactic/SESSION`, comparaison et filtre, graphique et tableau daté accessibles ; lien Terminal | Tests de rendu et recette Chromium ajoutée | Les échanges entre joueurs et commandes restent sur les routes existantes |
| Régie | Cours globaux, comptoirs et actualités séparés | `#/galactic-admin/SESSION`, cours locaux et demande, publication/suspension, récapitulatif, motif privé et audit | Joueur refusé, version et révision contrôlées | Ajustement financier des caisses et association automatique aux News restent à raccorder |
| Synchronisation | Actualisation manuelle des cours | Vérification serveur toutes les 10 secondes, conservation du filtre, erreurs réseau visibles ; aucun remplacement d’un formulaire ouvert | Recette navigateur : changement de cours sans rechargement | Synchronisation périodique, pas de garantie instantanée ; le paiement recontrôle toujours le prix |
| Navigation | `space-outlaws-voyages.mjs` : `soRoute`, autonomie, durées, manifestes, cockpit, voyage et escales natifs | Réutilisation prévue ; aucune modification du moteur | Régression des acquis inchangée | Carte interactive et accès depuis le vaisseau : prochaine tranche |
| Contrats | `contracts.mjs`, `announcements.mjs`, `space-transport.mjs` : candidatures, négociation, provision et preuve native | Aucun moteur parallèle | Contrats et comptes existants préservés | Le raccord actuel est un transport PNJ depuis Breach Port. Demande libre d’un Courtier propriétaire et cargaison tierce : extension à développer |
| Fret / escales | `cargo.mjs` : lots, réservations, capacité, garde, réception ; contrôle local et mandats | Lot acheté conservé au comptoir, retrait strictement sur son port | Mauvais port et lot en soute refusés au rachat | Transporteur mandaté sur un achat du client et livraison locale : raccords de la tranche logistique |
| Entrepôts | Moteur générique présent ; `cargo.mjs` refuse encore WAREHOUSE dans ce parcours SO | Aucun tarif inventé ni ouverture implicite | Absence de nouvelle permission d’entrepôt | Stockage spéculatif SO et stockage sous douane restent distincts ; frais à arbitrer si souhaités |
| Douanes | Politique par port, contrôle, consentements, saisies, recours | Validation de la politique publiée réutilisée ; parcours ordinaire limité à FREE et aux références ordinaires légales | Politique inconnue ou restrictive : refus | Licences, marchandises réglementées/interdites et tarifs spéciaux ne sont pas traités comme du commerce libre |
| Équipage / ravitaillement | PR #37 : propriétaire, capitaine, consentement, mandats, retrait différé, remise volontaire du carburant puis plein natif | Réutilisation intégrale | CI du parent réussie ; pas de réécriture | Coordination avec les futurs contrats commerciaux à raccorder |
| News / événements | Annonces BULLETIN, effets MANUAL et INSTALLATION_OFFLINE présents | Les suspensions commerciales existantes restent vérifiées au paiement | Conditions existantes conservées | Pas de nouvelle planification horaire simulée ni prévision de profit garanti |
| Continuité | Instantanés et reprise SO existants | `planetMarkets` et `planetPriceHistory` inclus dans l’instantané natif | Présence dans l’export, régression épisodes | Aucune campagne réinitialisée, aucun ancien lot ou compte reclassé |

Les tranches 1 et le premier parcours de la tranche 2 sont livrés ici ; une première partie de la régie (tranche 7) est nécessaire pour rendre ce parcours utilisable. Le chantier unifié n’est pas terminé. La carte, les contrats libres entre joueurs, les délégations de retrait, les entrepôts SO et la recette commerciale de bout en bout restent à développer. La tranche 6 réutilise les acquis de #37.

## Modèle et invariants

- `planetMarkets/{hash([portId,itemId])}` : lien explicite port / article / catégorie canonique / offre / état / demande / publication / révision. Un article ne change pas de catégorie selon le port. Une offre ne peut pas être réaffectée à deux planètes.
- Les articles et offres proviennent de la version publiée de la session ; aucun catalogue fictif n’est injecté dans les sessions réelles. Les douze références sont disponibles pour la configuration, sans création automatique de douze lots.
- Le stock reste `inventory/{shopStockId(offerId)}` ; la caisse reste `accounts/{shopAccountId(shopId)}`. Configurer un cours ne crée ni unités ni crédits. Le budget affiché est le disponible après les réservations natives.
- Un achat utilise `prepareShopPurchase` / `buyShopOffer` et `settleLotSale`. Le reçu fixe le port d’origine, le montant payé et le lien au marché. Le propriétaire change ; le lot reste sous garde du comptoir. Un changement de cours ultérieur ne modifie pas ce reçu.
- Un rachat consomme la demande, débite la caisse, crédite le portefeuille personnel et réintègre le stock vendeur dans la même transaction. La provenance du lot source et les historiques sont conservés. Sommes en crédits entiers : cours unitaire selon l’arrondi natif, puis rachat total à 85 %, arrondi au crédit le plus proche, moitié vers le haut. Pas de second coefficient appliqué.
- La configuration ne réaffecte pas le lieu d’une commande déjà payée ; même un marché suspendu conserve les retraits payés. Les anciens comptoirs non associés à un marché gardent leur comportement.
- L’historique joueur contient uniquement les cours effectivement publiés, au plus trente points par marché. Motifs MJ, codes de navigation, ports non publiés et changements préparés privés ne sont pas transmis.
- Le contexte commercial local adapte uniquement le contrôle d’emplacement du parcours concerné. Il ne modifie pas le port d’attache en base et conserve les refus liés à la santé, la captivité, les interventions, préparatifs et voyages actifs. Les autres actions ne sont pas ouvertes sur toutes les planètes.

## Accès et périmètre initial

Les commandes de Bourse exigent une inscription active et la classe principale Courtier. Le rôle de capitaine ou une compétence secondaire ne suffit pas. La régie exige les droits `content` existants. Chaque commande vérifie à nouveau les droits ; une URL ne crée aucune autorisation. Aucun changement de rôle Google, de règles Firestore ou de droits client directs.

Une capacité transactionnelle serveur `PLANET_MARKET`, limitée aux collections de marchés, à leurs historiques et aux mouvements natifs associés, autorise ces seules écritures. Elle ne peut pas être demandée dans les paramètres client. Les achats et les retraits gardent leur capacité `SHOP` native.

Ce premier parcours est volontairement borné : paiement personnel ordinaire, rachat ordinaire libre sur stock disponible au port et détenu par son propriétaire ; pas de vente d’un fret contractuel, caché, saisi, engagé ou appartenant à un tiers. Les caisses collectives au paiement, les remises COU-02 indexées et les tarifs spéciaux exigent des raccords supplémentaires ; aucun droit n’est déduit de la classe seule. Une catégorie réglementée/interdite peut être préparée mais reste sans bouton de commerce ordinaire. Une politique douanière absente n’est jamais interprétée comme libre.

## Validation exécutée

- 83 tests locaux ciblés : marchés, prix, circuits personnels/commerciaux, boutiques, Terminal, épisodes, rendu, kit de recette et sélection CI ; tous réussis.
- 9 cas Firestore du parcours final, projet fictif `demo-gn-engine` ; tous réussis.
- 1 cas HTTP/Auth sur le parcours final : achat distant idempotent, contrôle de garde au mauvais port puis réception locale, rachat, refus non connecté/extérieur/régie et révocation avant reprise ; réussi.
- Une sélection élargie antérieure de 39 cas Firestore (marchés, boutiques et circuits) réussie, sans additionner ses recouvrements au résultat final.
- Compilation et syntaxe des modules modifiés réussies ; `git diff --check` réussi.
- Kit de recette local préparé avec deux marchés, uniquement via les commandes métier. Aucun résultat de recette humaine revendiqué.
- Recette Chromium ajoutée : deux cours différents, modification MJ et actualisation sans rechargement, filtre, graphique/tableau au clavier, mobile 390 px, régie 1440 px, refus financier sans faux succès et refus du joueur ordinaire. Son résultat sur le candidat est à constater dans la PR.

Le premier test de préparation du kit a révélé une information initiale manquante pour le Courtier fictif ; son briefing de recette a été complété, sans contourner la validation de naissance. Les tests sont limités au projet d’émulation ; aucune session réelle n’est modifiée.

Résultats CI et SHA exacts consignés dans la description de PR pour ne pas attribuer un succès à un nouveau commit documentaire. Les résultats locaux ne constituent pas une certification globale, une recette sur Android/iOS ou une autorisation de publication.
