# Logistique commerciale — 15 novembre 2026

Auteur : Codex. Sources : cahier unifié de Guillaume §§4.2–4.3, 8–9 et 11–12 (`source/SO_Galactic_Economy_V1.md`), livre V0.7 chapitres 18, 24 et 25 ; [arrondi explicitement choisi par Guillaume](source/SO_Economic_Decisions_2026-11-15.md). Le livre historique reste inchangé.

## Audit et base

Base de la branche `work/commercial-logistics` : PR #41, SHA `c4243d4b7bdeac5490ece8ad2201065708db0dae`, arbre `105683b71863af208ca22d66a200f7100e798249`. Sa CI complète [43646144944](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43646144944) est réussie, six lots Firestore inclus : 3 238 applicatifs, 111 HTTP et 23 parcours Chromium. Ces preuves concernent la base, jamais implicitement le nouveau commit. PR #2 et #15 déjà fusionnées ; #35–#41 encore en brouillon. `main` observé à la reprise : `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`. Pas de modification concurrente locale.

## Parcours raccordé

1. Un Courtier peut confier soit un lot retiré, soit une commande **payée mais encore au comptoir**. Une commande non retirée est confiée entière ; les lots déjà retirés gardent leurs quantités partielles.
2. L'accord puis la signature utilisent le contrat existant. Le salaire reste réservé sur les crédits ordinaires. Une commande confiée reste la propriété de l'acheteur ; son retrait personnel est suspendu pendant la garde contractuelle.
3. Le transporteur peut signer avant d'être au port d'origine. Il doit effectuer un vrai voyage pour y rejoindre le comptoir. Aucun trajet de collecte n'est créé, payé, estimé ou effectué implicitement.
4. Le MJ présente la commande avec **l'action native de remise du comptoir**. Seul le transporteur qualifié, au bon port et avec ses mandats actuels, peut charger les caisses. Les lots sont réservés et déplacés par le cargo natif, au plus cinq unités de volume et trois minutes par tranche.
5. La commande n'est marquée retirée qu'après la dernière tranche effectivement reçue en soute. Une annulation avant départ, après retour physique des caisses si nécessaire, libère le salaire et restitue la commande payée. Elle exige ensuite une nouvelle présentation du comptoir.
6. Voyage, escales et déchargement conservent les moteurs actuels. La garde PORT constitue la preuve réelle de livraison.
7. Le propriétaire peut vérifier puis confirmer l'entrée dans son stock commercial local. Son identité, sa présence au port, l'état du lot, le voyage achevé, les éventuelles saisies et la politique publiée sont vérifiés. Pour le parcours ordinaire libre : **5 % de la valeur réelle de référence**, arrondis au crédit le plus proche, demi-crédit vers le haut, conformément à la décision explicite du 15 novembre.
8. La taxe passe par `prepareCargoFees` / `settleCargoFees`, le compte et le journal natifs. Le propriétaire confirme le montant et paie sur ses crédits ordinaires ; le salaire réservé n'est pas utilisé. Ni le transporteur ni une URL ne peut déclencher cette dépense à sa place.
9. La même quantité devient un stock COMMERCIAL au même port, sans copie de biens ni changement de propriétaire. L'événement de réception conserve une quittance et une preuve contractuelle immuables. Le lot peut alors être revendu au marché local selon demande, stock, caisse et prix effectifs.
10. La preuve contractuelle reste valable après réception, division ou revente du fret. La validation MJ, la contestation et le salaire restent indépendants et suivent le moteur existant.

## Réutilisation et droits

| Fonction | Services existants | Extension bornée |
|---|---|---|
| Commande payée et présentation | `shops.mjs`, `shop-custody.mjs`, lots et ventes natifs | Délégation au contrat signé, identité de l'acheteur conservée ; le MJ utilise `offerShopPickup`, sans nouvel outil de distribution |
| Négociation et réservation | `commercial-transport.mjs`, `commercial-transport-state.mjs`, `space-transport.mjs` | Source SHOP exacte en plus de COMMERCIAL ; quantité entière d'une commande, annulation réversible |
| Déplacement et durée | `cargo.mjs`, `cargo-batches.mjs`, voyage natif | Aucun moteur parallèle ; statut de retrait après la dernière tranche réelle |
| Importation ordinaire | Politique de `publishedCustomsCargoAssessment`, comptes et contrôleur de frais natifs | `commercial-logistics.mjs` vérifie garde, voyage et consentement personnel, prépare 5 %, enregistre la quittance |
| Revente | `planet-market-state.mjs`, `planet-markets.mjs` | Validation de la quittance historique, sans considérer un simple champ de localisation comme preuve d'importation |
| Continuité et preuve | Contrats, inventaires, historiques et reprise d'épisode existants | Quittances intégrées au contrat natif et à son historique ; aucune nouvelle collection |
| Interface | Terminal/fret, contrats, remise de boutique et routeur existants | Commandes au comptoir, état du retrait, aperçu des droits et confirmation explicite ; anciennes URL conservées |

Les capacités serveur existantes SHOP, TRANSPORT, SO_CARGO, MISSIONS et PAYMENT sont utilisées uniquement après leurs contrôles ; aucun changement de règle Firestore, rôle Google ou droit d'écriture client. Les mandats et identités sont contrôlés avant les réessais. Les nouvelles commandes de réception sont réservées au propriétaire lié au contrat ; le transporteur, un tiers et un simple détenteur du lien sont refusés. Les autres lots et caisses ne sont jamais inclus dans cette autorisation.

Les droits ne sont pas déduits de la classe : le capitaine a besoin de son autorité logistique, le pilote de son mandat courant, le client de ses droits de propriété. Les opérations spatiales engagées, notamment rencontres, préparations, convois et embuscades, bloquent les nouveaux mouvements incompatibles. Une commande n'est jamais réattribuée à un nouveau personnage par la seule réutilisation de son identifiant.

## Validation

- Dix cas métier dans `test/support/commercial-logistics-suite.mjs`, exécutés en mémoire et enregistrés dans le registre Firestore officiel.
- Achat/collecte distante avec deux vrais voyages natifs, présentation MJ, livraison au client resté au port destinataire ; aucun changement manuel de destination.
- Commande en deux tranches, refus du départ incomplet, remboursement salarial avant retrait sans duplication de fret.
- Importation à 5 %, revente partielle puis complète avec caisse du comptoir alimentée par un achat réel, preuve et règlement conservés.
- Refus d'un autre acteur, du mauvais port, d'un lot sous retenue, d'un devis financier périmé ; concurrence, interruption avant commit et réessai idempotent.
- Reprise d'épisode : quittance, provenance commerciale, stock importé et preuve de livraison conservés.
- Deux cas de rendu et un parcours HTTP/Auth ajouté ; scénario Chromium de contrôle de rendu à 390 px avec valeurs issues du service natif, consentement et absence de débit à l'aperçu.

Résultats locaux à ce stade : 101 tests ciblés réussis ; dix cas Firestore réussis ; un cas HTTP/Auth réussi. Les sélections complémentaires se recouvrent et ne sont pas additionnées. Compilation et syntaxe vérifiées avant envoi ; état du commit final et CI exacte consignés dans la PR. Le cas navigateur alimenté en fret utilise une fixture mémoire : il ne vaut pas recette humaine ou authentifiée complète sur un téléphone physique.

## Limites restant à traiter pour la publication complète

- Le parcours d'importation ouvert ici concerne les marchandises **libres et légales**. Politique absente, marchandise réglementée/interdite ou saisie : refus conservé, sans fausse licence. Les procédures existantes de contrôle et de recours restent indépendantes.
- Les entrepôts commerciaux, caisses collectives pour l'achat, remises COU-02 indexées et événements économiques/News restent les compléments suivants ; ils ne sont pas remplacés par un déplacement arbitraire de stock.
- Les frais d'un entrepôt doivent être explicitement configurés ; aucun tarif de stockage n'est inventé. Le stockage sous douane demeure une extension distincte selon le cahier fourni.
- Aucune publication, fusion, migration, création de stock réel, modification de Master publié ou remise à zéro. L'autorisation de publication Firebase de Guillaume reste conditionnée à la finalisation des chantiers et validations d'ensemble.
