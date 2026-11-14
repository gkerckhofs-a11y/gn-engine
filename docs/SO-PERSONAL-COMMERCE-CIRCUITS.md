# Boutiques, sac, commerce et vouchers carburant

Mission du 14 novembre 2026. Référence fonctionnelle : demande « Boutiques, sac personnel, commerce et vouchers carburant », version 1.0 du 13 novembre 2026. Référence canonique : `docs/source/SO_Regles_V07.txt`, chapitre navigation, notamment la valeur de **25 Cr par unité de carburant** et la distinction entre réservoir et fret.

## État du dépôt inspecté

- `main` : `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`, publication Firebase suspendue.
- PR #15 déjà fusionnée ; les travaux sac/fret antérieurs et leurs restrictions sont conservés.
- PR #35 : `216246008b592b9278c842ccf0222b6c6cabf1b6`, arbre `c0e79cf1d8287a41c7dbce0d6e79b8d11172fb30`. CI globale [43576705078](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43576705078) terminée avec succès. PR non fusionnée.
- Cette tranche repose sur la PR #35 et ne la fusionne pas. L'autre PR ouverte, #3, concerne un audit de récupération Firebase distinct.
- Aucune session réelle, aucun compte réel, aucun Master publié modifié. Aucun déploiement ni migration.

## Audit préalable et réemploi

| Circuit | État avant ce lot | Travail effectué | Preuve ciblée |
|---|---|---|---|
| Achat et paiement | Existant : `shops`, `settleLotSale`, comptes et journal | Équipement personnel explicite et fournisseurs commerciaux raccordés | Équipement empilable et individuel ; fonds ordinaires/protégés ; suites boutiques existantes |
| Retrait | Existant : remise MJ puis réception joueur | Destination selon le circuit ; stock commercial fixé au port | Aucun lot utilisable avant réception ; reçus idempotents |
| Don gratuit | Existant : proposition/acceptation/refus/annulation | Restrictions modèle en plus des restrictions du lot | Partage de lot, provenance, refus/annulation et course au dernier exemplaire |
| Vente privée SO | Partiel : moteur générique présent, mutation SO fermée et bouton masqué | Raccordement versionné pour les objets personnels admissibles | Paiement ordinaire, propriété, garde, retrait, double clic, course et révocation HTTP |
| Centrale du Courtier | Partiel : contrôles de classe et marché existants, mutations SO fermées | Réemploi du marché, des offres fournisseurs, cours et négociations ; stock distinct | Achat réservé à la classe principale, annonce, vente et retrait commercial |
| Classification | Absente | Champs explicites M1 et contrôle M5 ; export/import central | Aucune déduction du nom, de la catégorie ou du volume |
| Fret | Existant : soutes, propriété, garde contractuelle, réservation et délai | Admission du seul stock commercial explicite, maintien des gardes natives | Chargement puis déchargement natifs ; refus du carburant personnel |
| Ravitaillement | Existant : `fuelItemId`, réservation, délai, annulation et consommation partielle | Voucher explicite, tarif contrôlé, bouton du sac fondé sur les aperçus serveur | Achat, don, revente, autre propriétaire habilité, plein partiel, reliquat, pause, reprise et conservation |
| Historique joueur | Partiel : ventes/dons visibles, historique détaillé réservé au MJ | Lecture limitée du lot possédé ou détenu ; date/type/quantités seulement | Refus tiers, anonyme et révoqué ; aucune note MJ ni identité technique |

Les commandes métier, collections d'inventaire, comptes et journaux existants restent uniques. Aucun moteur d'effets, inventaire parallèle, portefeuille de carburant ou avantage COU supplémentaire n'est créé.

## Classification des modèles et des lots

| `usage` explicite | Destination après réception | Don / vente privée | Centrale et fret |
|---|---|---|---|
| `PERSONAL` | Sac `CHARACTER` | Selon droits, état, modèle et lot | Pas de chargement en soute |
| `FUEL` | Sac `CHARACTER` | Mêmes restrictions que les objets personnels | Pas de fret ; consommation par `fuelItemId` compatible |
| `COMMERCIAL` | Stock `COMMERCIAL`, personnage et port identifiés | Pas de remise gratuite du sac ni de vente privée personnelle | Courtier principal ; marché et soutes autorisées par les moteurs existants |
| Champ absent | Emplacement historique conservé | Aucun nouveau circuit activé sur cette seule absence | Contrôle MJ signalé ; aucun reclassement automatique |

`transferable=false` et `resellable=false` dans le modèle complètent les restrictions du lot. Un modèle permissif ne lève jamais une interdiction du lot. Les kits de naissance, crédits protégés, réservations et gardes restent protégés. Les fractionnements natifs copient l'instantané et conservent la provenance.

M1 expose les champs dans l'éditeur et l'échange Excel **central** (`circuit`, `transferable`, `revendable`). Les anciens fichiers dont ces colonnes sont absentes restent lisibles. Les formats historiques CAMPAGNE/SESSION et les Masters publiés ne sont pas modifiés. L'omission d'une colonne ne reclassifie pas une définition existante.

Une nouvelle version publiée contenant une classification explicite active (hors définitions archivées) porte `itemCircuitsVersion=1`. Toutes ses offres doivent alors référencer un article classé ; une offre non classée ou un voucher à un prix différent de 25 Cr bloque la publication. Une ancienne version sans ce marqueur conserve ses circuits antérieurs. Les nouveaux raccordements ne lui sont pas ajoutés implicitement. Dans une session adoptant ces circuits, un ancien lot non classé reste consultable mais n'obtient pas les nouveaux droits d'échange.

Le contrôle MJ passe par M1 et les validations de publication existantes. Modifier un modèle ne réécrit pas les exemplaires déjà achetés ou embarqués. Le reclassement d'anciens lots en session demanderait une opération explicite séparée ; aucune migration de ce type n'est exécutée ici.

## Parcours livrés

1. **Boutique personnelle → sac** : choix de quantité, aperçu du stock et du paiement, confirmation, propriété acquise chez le vendeur, présentation de la remise par le MJ, réception par le joueur. Les équipements non consommables classés sont admissibles ; les lots protégés restent non cessibles.
2. **Don** : bouton du sac, destinataire par QR/code via le sélecteur natif, quantité, aperçu, proposition, acceptation/refus ou annulation. Les deux acteurs et le lot sont revérifiés avant l'effet.
3. **Revente personnelle** : tous les personnages habilités peuvent proposer un objet personnel admissible, sans classe Courtier. Le moteur natif débite les crédits ordinaires et transfère la propriété atomiquement. L'objet reste chez le vendeur jusqu'au retrait confirmé. Une vente ne contourne pas les restrictions d'un don.
4. **Centrale commerciale** : fournisseurs commerciaux distincts, stock au port, prix/cours/restrictions, annonces et négociations natives, accès aux soutes. Les achats professionnels sont réservés au Courtier principal. Le port doit être préparé avant l'achat ; un stock ne suit pas automatiquement le personnage. Le retrait exige le port enregistré et les droits courants. Les biens en soute conservent leur propriétaire et réutilisent les opérations chronométrées existantes.
5. **Voucher → réservoir** : un lot de N unités représente N unités de réservoir, au tarif fournisseur de 25 Cr/unité. L'achat ne remplit rien. Dans le sac, les boutons « Utiliser · ravitailler… » sont issus d'aperçus `prepareRefuel` autorisés, puis ouvrent directement le parcours natif avec le lot choisi. La quantité est réservée pendant 120 secondes de jeu et consommée à la résolution. Une consommation partielle garde le même lot résiduel. Annuler ne consomme rien. Les crédits de création ne rendent pas un lot cessible.

Le sac privilégie les lots disponibles, indique leur usage et leurs restrictions, puis présente les retraits, échanges et historiques. Les illustrations utilisent le service média existant. Le sélecteur de destinataire, le QR et les confirmations natifs sont conservés.

## Validation et limites

Commandes locales exécutées :

- Tests ciblés des moteurs et interfaces : inventaire, dons, ventes, marché, négociations, M1/M5, import central, publication, navigation, fret et terminal. Première sélection : **285 tests réussis**, aucun échec ; **sélection finale : 376 tests réussis**, aucun échec.
- Nouvelle couverture dédiée : `node --test test/item-circuits.test.mjs test/item-circuits-ui.test.mjs` : **22 tests réussis** (15 parcours métier et 7 cas de modèles/interface), aucun échec.
- Émulateurs isolés `demo-gn-engine`, première version de la suite partagée : **12 parcours Firestore réussis**. Les parcours ajoutés ensuite et le candidat final sont soumis à la CI.
- HTTP/Auth/Firestore isolés : `HTTP + Auth : circuits personnels, vente privée, retrait et historique protégé` : **1 test réussi**, incluant refus anonyme/tiers/révoqué et réessai sans double paiement.
- `npm run build` et `git diff --check` réussis.

La suite partagée `item-circuits` est inscrite dans le catalogue Firestore. La recette Chromium existante reçoit un parcours mobile 390×844 : achat de voucher, retrait, utilisation depuis le sac, annulation avant consommation et reliquat conservé. Le navigateur local refuse la création de son socket ; cette recette est vérifiée dans la CI, sans la présenter comme exécutée localement.

Les parcours anciens de vente, boutique, fret, gardes et navigation sont conservés et inclus dans les régressions. Les validations ci-dessus sont automatisées ; elles ne certifient pas une recette humaine sur Android/iPhone ni une remise d'accessoire physique en GN.

La CI initiale a identifié un comptoir sans offre masqué malgré ses récompenses de mission. Son affichage est conservé ; les récompenses restent dans le circuit personnel. La relecture conserve également la classification personnelle des nouveaux documents natifs INF-03, sans droit de revente, et réutilise la règle de coupure des références longues du sac sur mobile. Les tests de mission et de faux sont inclus dans la correction.

Les fournisseurs ne rachètent pas automatiquement les articles : les offres avec `buybackPrice` restent fermées, comme avant. La revente entre joueurs est raccordée au moteur existant. Les stocks sous garde contractuelle continuent par leurs parcours de fret propres ; le nouveau stock commercial ne leur attribue aucun droit supplémentaire.
