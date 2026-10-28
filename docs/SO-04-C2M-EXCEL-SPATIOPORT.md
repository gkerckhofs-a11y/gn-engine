# C2m — Excel des modèles, ports et routes M3

## Parcours livré

L’atelier Spatioport exporte une sélection privée, ou un gabarit vide, dans les trois feuilles `Modeles`, `Ports` et `Routes`. L’auteur les modifie puis vérifie l’aperçu et confirme avec un motif. Les changements entrent dans le brouillon initial commun en **une transaction, un lot et une révision**, avec historique avant/après et provenance. Une erreur dans la troisième feuille empêche aussi les écritures des deux premières.

Le contrat `gn-engine-central-draft` version 1 reste lié à campagne, profil, base vide, brouillon initial, révision et lot. Les trois feuilles sont requises, même vides ; leur ordre est libre. Maximum **100 lignes métier cumulées et 1 Mio de contenu**. Les limites natives de **100 modèles, 100 ports et 200 routes**, archives comprises, sont inchangées. Ce sont des limites techniques, pas des quotas de scénario.

Les sept ateliers disposent maintenant d’un import/export préparatoire pour les types déjà raccordés. Cela ne certifie pas les sept gabarits documentaires complets : kits M1, catalogue narratif d’admission, stocks, instances, événements, rencontres et autres contenus non raccordés ne sont pas exportés par ces fichiers.

## Contrat des feuilles

Chaque feuille commence par `id`, `operation`, `revision`. Les IDs sont les identifiants métier **sans préfixe ajouté** ; la feuille porte le type. L’API de sélection et les cases de l’interface utilisent `shipModel_{id}`, `port_{id}`, `route_{id}` pour distinguer les homonymes. Un ID métier de 128 caractères reste accepté. Exporter une route ne sélectionne pas implicitement ses ports. Les sélections M5 et celles des ateliers à une feuille sont inchangées.

| Feuille / type | Colonnes éditables | Contraintes |
|---|---|---|
| `Modeles` / `shipModel` | `nom`, `description`, `profil_id`, `notes_mj` | Profil requis : `FIGHTER`, `CARGO`, `TRANSPORT` |
| `Ports` / `port` | `nom`, `description`, `code_navigation`, `lieu_id`, `notes_mj` | Code requis et privé ; lieu facultatif, raccordement différé |
| `Routes` / `route` | `nom`, `description`, `origine_port_id`, `destination_port_id`, `distance_id`, `risque_id`, `code_navigation`, `notes_mj` | Ports distincts ; distance `SHORT`/`MEDIUM`/`LONG` ; risque `SECURED`/`DANGEROUS`/`HOSTILE` ; code requis |

Noms requis, 150 caractères ; descriptions et notes, 4000 caractères chacune ; codes, 80 caractères. Réutilisation de `centralSpaceInput` et des validations de route natives. Le serveur dérive les caractéristiques fixes des trois familles, y compris le fret nul du chasseur, et les durées/facteurs/risques. Les champs dérivés, coût fixe historique de carburant, stock, propriétaire, pilote et pouvoirs serveur sont refusés, pas ignorés.

Les durées restent 5/10/15 minutes, facteurs de distance 1/2/3, risque indépendant 1/2/3 faces du D6. Les prix et statistiques des familles sont ceux de [C2j](SO-04-C2J-SPATIOPORT-BROUILLON.md) et du livre V0.7. Aucun profil, distance, risque ou code de campagne n’est attribué par défaut à une ligne incomplète. La validation cellule par cellule utilise des valeurs internes de contrôle qui ne sont jamais enregistrées dans la définition.

Une cellule vide conserve la valeur existante ; `!EFFACER` vide seulement les champs facultatifs (`description`, `notes_mj`, `lieu_id`). Doubler le premier `!` préserve un texte littéral. Les autres textes, notamment ceux commençant par `=` ou `@`, restent des textes XLSX. Absence de ligne = aucune suppression. `ARCHIVER` exige uniquement ID/opération/révision ; `RESTAURER` explicite conserve les données omises, sans cascade sur les routes. L’export d’une archive contient seulement ces trois valeurs. Un aller-retour inchangé n’incrémente ni la révision ni l’historique du brouillon.

## Liens, confidentialité et transaction

Les liens et doublons de codes sont calculés sur **l’état final des trois feuilles**. Une route peut référencer un port créé dans le même lot, quel que soit l’ordre des feuilles. Un port manquant peut être préparé ensuite ; son ajout, archive ou restauration recalcule les liens entrants sans réécrire la route. Un modèle ou une route homonyme ne résout pas une référence de port. Les lieux restent explicitement `REFERENCE_NOT_CHECKED` ; aucun catalogue ou QR parallèle n’est créé.

Codes dupliqués parmi les définitions actives d’un même type : diagnostic localisé, sans répéter le code privé. Un code de port identique à un code de route ne constitue pas un doublon du même type. L’archive libère le code pour le contrôle, sans effacer l’historique. Les diagnostics préparatoires n’empêchent pas de conserver un brouillon incomplet et ne sont jamais une autorisation de publier.

Lecture M3 pour exporter, lecture et édition M3 pour préparer/appliquer. Aucune lecture d’un catalogue étranger ni des admissions. L’autorité et le cycle courants précèdent les reçus de commande et de lot. Confirmation liée à auteur, fichier, contenu, droits et révisions ; réessais sans doublon, réutilisation d’un lot avec contenu différent refusée, concurrence interatelier arbitrée par la révision commune. Une interruption transactionnelle ne laisse ni contenu ni historique ni reçu partiel.

Le contrôle global accepte les provenances XLSX M3 pour le couple type/feuille exact et localise les références par colonne. Il continue à refuser les valeurs dérivées corrompues. Notes, descriptions et codes ne figurent pas dans son résumé. Empreinte interne **10** : relancer le contrôle après mise à jour. Bornes globales **1659 changements / 16 Mio de contenu / 4 Mio de rapport** inchangées, tous les ateliers `PARTIAL`, `publicationAvailable=false`.

## Compatibilité et suites

Masters CAMPAGNE/SESSION, exemples et gabarits documentaires V0.1 conservés. Les onglets documentaires `Vaisseaux`, `Evenements`, `Rencontres` et `Modules_Installes` restent refusés par ce contrat ; aucune conversion implicite du V0.1. Pas de nouvelle collection métier, seed, adoption ou migration.

Conserver les nouvelles provenances, le brouillon, les délégations, les historiques et les reçus d’import/commande dans un ensemble cohérent. Les exports ciblés ne sauvegardent pas cet ensemble. C2l refuse les provenances XLSX M3 au contrôle : ce n’est pas un retour fonctionnel équivalent ; ne pas supprimer les données pour le rendre compatible.

Restent à développer : lieux/QR communs, contrôles canoniques complets, propositions de stocks et sources réelles des récompenses, publication immuable globale, I3/I4/I5, instances et navigation jouée V0.7, rencontres financées et événements. Aucun vaisseau, carburant, voyage, tirage, stock, compte, mandat, publication ou déploiement créé par C2m.

## Validation

Le 25 octobre 2026 (Europe/Brussels), compilation réussie et **1292/1292 tests applicatifs**, zéro échec/annulé/ignoré/todo ; Node 24.22.1, npm 11.9.0. **24 nouveaux cas métier partagés mémoire/Firestore, cinq UI/XLSX et un parcours HTTP/Auth**. Deux anciennes assertions UI attendaient encore M3 indisponible ; adaptées au nouveau contrat puis suite complète relancée. Syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17.0.20) ; vérification effective sous Java 21 dans les deux CI du candidat.

La couverture ajoutée comprend trois familles et neuf couples distance/risque, liens finaux, homonymes, codes, archives, validation stricte, confidentialité, concurrence, révocation avant reçus, budgets et interruption. Les tests UI portent sur HTML/formulaires/payloads et de vrais allers-retours XLSX ; aucune recette visuelle navigateur, mobile, terrain, charge pilote ou restauration globale revendiquée.

Les résultats définitifs du candidat exact sont consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison des deux CI, sans nouveau commit de preuve. Base C2l `944f0569b1f7815eb98ab193ed966dcc2b446b75` revérifiée : push `40138794040` / PR `40138797976` réussis, **1263 applicatifs + 1011 Firebase/HTTP chacun**, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2M.md).

REC-SO-MST-02/03/07/08/09 reçoivent des preuves préparatoires partielles. Les **55 verdicts complets**, REC-SO-13 à 19 et SO-GAP-12/13/14 restent inchangés : Excel de préparation ne certifie pas la publication ni les trajets joués. Aucun merge ou changement Firebase de production.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.4–3.10, A.5–A.6, MST-02/03/07/08/09.
- [Livre V0.7](source/SO_Regles_V07.txt), chapitres 17–18 : familles fixes, codes préparés, durées et risques indépendants.
- [Gabarits documentaires V0.1](SO-00-V34-GABARITS.md), M3, et [vade-mecum](source/SO_Vademecum_V01.txt).
- [C2j, définitions natives M3](SO-04-C2J-SPATIOPORT-BROUILLON.md) et [C2l, transaction à plusieurs feuilles](SO-05-C2L-EXCEL-BOUTIQUES-OFFRES.md).
