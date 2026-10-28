# C2l — import/export Excel des boutiques et offres M5

## Parcours livré

L’atelier Boutiques permet désormais d’exporter une sélection privée ou un gabarit, de préparer deux feuilles `Boutiques` et `Offres`, puis de vérifier et confirmer leur import dans une seule transaction du brouillon central. Les liens sont calculés sur l’état proposé des deux feuilles : une boutique et ses offres peuvent être créées ensemble sans dépendre de l’ordre des feuilles dans le fichier.

Un ID métier identique dans les deux feuilles représente deux définitions distinctes, `shop` et `offer`. Il n’est jamais déduit qu’une offre est une boutique. Un doublon au sein d’une même feuille est refusé. Le formulaire d’export présente séparément les deux types ; les IDs métier et les références dans les cellules restent sans préfixe ajouté.

L’import réutilise `exportCentralDraft`, `prepareCentralImport`, `applyCentralImport`, les validateurs `centralShopInput`/`centralOfferInput` et la projection M5. Aucun service de marché, stock, compte, QR, mandat de vendeur ou publication n’est activé.

## Contrat des fichiers

Format `gn-engine-central-draft`, version et schéma 1, métadonnées campagne/profil/base/brouillon/révision/module/lot conservées. Un fichier M5 contient `Meta`, `Boutiques` et `Offres` ; les deux feuilles métier restent requises même vides. Les onglets des autres ateliers, stocks, vendeurs et restrictions du gabarit documentaire V0.1 ne sont pas acceptés.

| Feuille | Colonnes | Sens |
|---|---|---|
| Les deux | `id`, `operation`, `revision` | Identifiant métier, CREER/MODIFIER/ARCHIVER/RESTAURER, révision native ; création à 0 |
| `Boutiques` | `nom`, `description`, `vendeur_personnage_id`, `lieu_id`, `notes_mj` | Définition privée ; vendeur M2 proposé et lieu différé |
| `Offres` | `nom`, `boutique_id`, `objet_id`, `prix_vente_cr`, `prix_rachat_cr`, `conditions`, `notes_mj` | Références à une boutique M5 et au modèle M1 existant ; prix et conditions proposés |

Prix renseignés : crédits entiers strictement positifs, selon le validateur natif. Aucun prix par défaut ni calcul automatique de revente. Prix de vente absent = à préparer ; prix de rachat absent = aucun rachat proposé. Les barèmes de jeu V0.7 restent une étape distincte du raccordement aux transactions réelles.

Cellule vide : conserver la valeur existante. `!EFFACER` : retirer explicitement une valeur facultative, y compris un prix proposé. Doubler le premier `!` pour conserver un texte littéral commençant par ce caractère. Les textes ressemblant à des formules restent textuels dans le XLSX. Absence de ligne ou feuille métier vide : aucune suppression.

Archiver exige seulement `id`, `operation`, `revision`. L’export d’une archive est neutre, sans textes privés inutilement recopiés. Restaurer est une opération explicite, auditée, qui conserve les champs et liens précédents. Aucune cascade ne modifie les offres quand une boutique est archivée.

La sélection API M5 utilise les clés typées `shop_{id}` / `offer_{id}` pour distinguer les homonymes ; les cellules exportées conservent l’ID nu, jusqu’à 128 caractères. Les autres ateliers gardent leurs sélections par ID nu, leurs feuilles et leurs reçus existants. Les en-têtes et le contenu des quatre Masters CAMPAGNE/SESSION historiques restent inchangés.

## Transaction et droits

Les deux feuilles constituent un seul lot, une confirmation et une révision centrale. Une offre invalide refuse aussi les boutiques du fichier. Les historiques de chaque changement, le reçu de lot et le reçu de commande sont écrits dans la même transaction. Une interruption ne laisse aucun demi-lot ; deux confirmations concurrentes du même fichier ne dupliquent rien. Une édition web concurrente provoque un conflit de révision explicite.

La lecture M5 permet l’export ; lecture et édition M5 sont exigées pour préparer/confirmer. Les droits courants et le cycle initial sont contrôlés avant les deux types de reçu. Révocation : accès refusé, y compris au résultat d’un ancien import. Le contenu, l’auteur, le fichier, les droits et les révisions lient la confirmation ; les aperçus périmés ne sont pas réutilisés.

M5 consulte M1 uniquement avec lecture M1 explicite, M2 uniquement avec lecture M2 explicite. Sans ce droit, aucune requête du catalogue étranger, aucun nom, secret, état d’archive ou existence révélé ; `REFERENCE_NOT_CHECKED` est associé à l’ID fourni par l’auteur. Les admissions restent hors de ce parcours. Une référence de vendeur n’accorde aucun mandat de vente ou d’accès à une caisse.

## Diagnostics et contrôle commun

L’aperçu situe chaque diagnostic par fichier, feuille, ligne, colonne, type et ID. Une boutique et une offre homonymes gardent leurs localisations distinctes. Les diagnostics d’une définition non présente dans le fichier conservent sa provenance antérieure. Le contrôle global accepte uniquement les provenances `shop`/`Boutiques` et `offer`/`Offres`, jamais leur permutation.

Les liens offre→boutique sont évalués après traitement des deux feuilles, y compris archive/restauration. Les liens vers M1/M2 se résolvent quand ces définitions sont préparées dans le même brouillon, sans copie de catalogue ni réécriture de M5. Une recette M4 et une offre M5 peuvent ainsi référencer le même modèle M1.

Le résumé global ne contient pas les notes privées ou conditions des offres. Empreinte interne du contrôle portée de 8 à **9** : relancer le contrôle après mise à jour. Ce résultat reste préparatoire : sept ateliers `PARTIAL`, `publicationAvailable=false`.

## Bornes et compatibilité

- **100 lignes métier au total**, toutes feuilles M5 réunies, et **1 Mio de contenu** par fichier/export ; refus sans troncature. Ce sont des bornes techniques.
- **50 boutiques / 250 offres**, archives comprises, dans le brouillon. Un fichier de 100 lignes ne peut pas créer 100 boutiques. L’édition d’une définition existante reste possible quand sa limite de catalogue est atteinte.
- Bornes natives inchangées : nom 150 caractères, présentation 6000, conditions 2000, notes 10000, références valides et prix entiers sûrs.
- Aucun nouveau type ni budget global : **1659 changements, 16 Mio de contenu, 4 Mio de rapport**. Formats M1/M2/M4/M6/M7 conservés ; Excel M3 reste à développer.

Les propositions de stock initial, lieux/QR communs, caisses, habilitations, prix de jeu, restrictions de revente, publication/versionnement, I3/I4/I5 restent à raccorder. Les onglets documentaires supplémentaires ne sont pas certifiés par cette tranche. Aucun import ou changement du catalogue ne distribue un bien ni ne réécrit une transaction passée.

Sauvegarder le brouillon complet, les droits, révisions, historiques et reçus, dont `masterDrafts/initial/imports` et les nouvelles provenances XLSX M5. Un export ciblé n’est pas cette sauvegarde. C2k refuse ces nouvelles provenances au contrôle global : il n’est pas un retour fonctionnel équivalent. Aucune suppression pour permettre un retour logiciel, aucune adoption ou migration de campagne historique exécutée.

## Validation réellement effectuée

**25 octobre 2026, Europe/Brussels** : `npm run build` réussi et **1263/1263 tests applicatifs**, zéro échec/annulé/ignoré/todo. Node 24.22.1 / npm 11.9.0. **24 nouveaux cas partagés mémoire/Firestore**, cinq tests UI/XLSX, un parcours HTTP/Auth. Syntaxe des deux fichiers d’intégration vérifiée. Firebase non exécuté localement (Java 17.0.20) ; CI sur Java 21. SHA-256 des quatre Masters historiques inchangés.

Couverture : vrais XLSX à deux feuilles, homonymes et IDs de 128 caractères, sélection partielle, prix et champs privés, erreurs localisées, archive/restauration, limites par type et cumulées, budget octets, lectures croisées, autorité avant reçus, idempotence, confirmation périmée, concurrence et interruption atomique. Tests UI sur HTML, formulaires et format XLSX ; aucune recette visuelle navigateur, Android/iOS, terrain, charge pilote ou restauration globale revendiquée.

Les résultats des deux CI du candidat exact seront consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), après terminaison et lecture des journaux, avec SHA, exécution, job, outils et décomptes. Base C2k `78699b2a483191fdd3243d5dc90ec69b02ae96ea` revérifiée : push 40133779918 et PR 40133783565 réussis, chacun 1234 applicatifs et 986 Firebase ; [preuves archivées](PR-1-HISTORIQUE-AVANT-C2L.md).

MST-02/03/06/07/08 : preuves préparatoires partielles seulement ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication globale, I3/I4/I5 et recette humaine restent ouverts. Aucun merge, déploiement ou changement Firebase de production.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.4–3.10 et recettes MST-02/03/06/07/08 : import dans le brouillon, références uniques, diff et publication globale distincte.
- [Règles V0.7](source/SO_Regles_V07.txt), chapitres 16 et 23 : bien réel distinct du catalogue, stock/compte autorisé, prix accepté conservé et priorités de revente.
- [Gabarit documentaire M5 V0.1](SO-00-V34-GABARITS.md), Boutiques/Offres et onglets supplémentaires non certifiés.
- [M5 natif C2g](SO-05-C2G-BOUTIQUES-BROUILLON.md) et [vade-mecum](source/SO_Vademecum_V01.txt), mêmes définitions et références ; aucun stock créé par import.
