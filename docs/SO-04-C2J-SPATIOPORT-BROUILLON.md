# C2j — modèles, ports et routes dans le brouillon M3

## Parcours livré

L’atelier Spatioport permet de créer, modifier, archiver et restaurer des définitions `shipModel`, `port` et `route` dans le même `masterDrafts/initial/changes` que M1/M2/M4/M5/M6/M7. Il n’existe aucune nouvelle base de navigation, aucun seed et aucun catalogue de ports de session créé par cette tranche.

Un auteur prépare une route avec deux identifiants de ports distincts, même si les ports sont encore absents. La lecture M3 et le contrôle global signalent chaque référence manquante. Préparer les ports résout ces liens sans recopier leur contenu ni réécrire la route. Archiver un port signale ses liens entrants ; le restaurer recalcule le diagnostic. Les codes de navigation sont saisis par l’auteur, jamais préremplis avec les exemples du livre.

Les sept ateliers disposent désormais d’une édition partielle. Aucun n’est déclaré complet ou publiable. Le contrôle reste préparatoire, avec `publicationAvailable=false`.

## Contrat et barèmes

Tous les types partagent `id`, `name` (150 caractères, requis), `description` et `gmNotes` (4000 caractères chacun), `schemaVersion=1`, `publicationState=DRAFT`, `masterArchived` et `revision`. Les champs serveur et les états de jeu sont refusés dans la saisie. Les bornes ci-dessous sont des limites techniques, pas des règles de scénario.

| Type | Champs éditables propres | Valeurs ou contrôles serveur | Limite, archives comprises |
|---|---|---|---:|
| `shipModel` | `profileId` | Trois familles V0.7, caractéristiques fixes dérivées | 100 |
| `port` | `navigationCode`, `locationTargetId` facultatif | Code requis, lieu différé explicitement non contrôlé | 100 |
| `route` | `fromPort`, `toPort`, `navigationCode`, `distanceId`, `riskId` | Ports distincts, durée/facteur/risque dérivés | 200 |

Les codes sont des textes privés de 80 caractères maximum, élagués aux extrémités et comparés exactement, casse conservée. Deux codes identiques parmi les définitions actives d’un même type produisent `NAVIGATION_CODE_DUPLICATE`. Une archive libère le code pour le contrôle ; elle ne renomme aucune donnée. Ce choix technique devra rester explicite lors du raccordement au parcours pilote. Un code n’est ni un QR ni une autorisation d’accès privé.

| Famille (`profileId`) | Prix Cr | Coque max | Bouclier max | Manœuvrabilité | Fret | Places dont pilote | Modules | Réservoir max | Gabarit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Chasseur léger (`FIGHTER`) | 5000 | 3 | 1 | 2 | 0 | 1 | 1 | 8 | 1 |
| Cargo léger (`CARGO`) | 10000 | 4 | 2 | 1 | 20 | 6 | 2 | 16 | 2 |
| Transport renforcé (`TRANSPORT`) | 20000 | 6 | 3 | 0 | 50 | 15 | 3 | 24 | 3 |

| Distance | Durée | Facteur distance | Carburant chasseur / cargo / transport |
|---|---:|---:|---|
| `SHORT` | 5 min | 1 | 1 / 2 / 3 |
| `MEDIUM` | 10 min | 2 | 2 / 4 / 6 |
| `LONG` | 15 min | 3 | 3 / 6 / 9 |

Le risque est indépendant de la distance : `SECURED` = 1 face du D6, `DANGEROUS` = 2, `HOSTILE` = 3. Les tables de référence sont communes au serveur et à l’interface dans `src/shared/space-outlaws-navigation.mjs`. Elles décrivent la préparation ; aucun D6, événement, consommation, prix payé ou voyage n’est exécuté. Une modification future des barèmes exigera le raccordement explicite de la version de règles, pas une réécriture silencieuse.

Le validateur `routeInput` existant contrôle les identifiants, les extrémités distinctes, les textes et la durée. Son coût fixe historique et son drapeau `enabled` ne sont pas persistés dans la définition centrale. Le coût canonique dépend du gabarit et de la distance. `shipInput` historique définit une instance avec propriétaire et capacité positive : il n’est pas utilisé pour créer un modèle, notamment le chasseur à fret nul. Ses contrats et ses instances restent inchangés.

## Autorité, concurrence et confidentialité

Six commandes `saveCentralShipModel/Port/Route` et `archiveCentralShipModel/Port/Route` réutilisent le service central. Lecture M3 et édition M3 explicitement déléguées, révision commune et de contenu, motif, historique avant/après, reçu idempotent et autorité courante avant restitution du reçu. Une délégation de session ne donne aucun droit central. Les anciennes délégations sans édition M3 ne gagnent aucun droit.

Les trois types ont des identifiants typés distincts ; `port_x` et `shipModel_x` ne peuvent pas résoudre la même référence par homonymie. La lecture M3 ne consulte pas les catalogues étrangers ni les admissions. Les suggestions de ports contiennent seulement ID, nom, archive, révision et provenance. Les codes, descriptions et notes ne sont pas copiés dans ces suggestions ni dans le résumé global ; ils restent visibles à l’auteur habilité dans sa fiche privée.

Le contrôle global valide aussi les valeurs dérivées persistées : un prix, fret, réservoir, durée ou risque altéré rend la définition invalide. Une cible invalide produit un lien `INVALID`, jamais une résolution par une instance de session ou une définition d’une autre campagne. Les liens optionnels vers `fieldTarget` restent `NOT_CHECKED` ; aucun catalogue de lieux parallèle n’est inventé.

Limite globale : **1659 changements** (1259 précédents + 400 M3), budgets **16 Mio de contenu / 4 Mio de rapport** inchangés ; refus explicite au dépassement. Empreinte interne du contrôle portée à **7** : relancer le contrôle après mise à jour. Le résultat n’est toujours pas un consentement de publication.

## Compatibilité et suites

Les Masters CAMPAGNE/SESSION, leurs exemples et gabarits documentaires V0.1 ne sont pas modifiés. L’import/export central M3 reste refusé ; une provenance XLSX M3 injectée est invalide au contrôle. Un import M1 conserve intégralement les définitions M3. Les anciennes routes, devis, propriétés, positions, réserves et voyages restent gérés par leurs services historiques.

Restent à livrer : propositions et création autorisée d’instances, propriétaires/pilotes M2, carburant/modules M1 et stocks réels, raccordement aux lieux/QR communs, conditions et visibilité de navigation, rencontres financées, table d’événements et résolution unique, départs, interceptions et combat V0.7, publication immuable et impacts de version. Les champs de risque d’un port du gabarit documentaire, sans consommateur défini ici, ne sont pas supposés définir le risque d’une route. Les propositions d’installation ne sont pas des installations de modules.

Pour sauvegarder/reprendre, conserver les trois nouveaux types, les grants M3, le brouillon et ses révisions, l’historique et les reçus dans un ensemble cohérent. Les exports ciblés ne constituent pas cette sauvegarde. C2i ne sait ni éditer ni contrôler M3 : ce n’est pas un retour fonctionnel équivalent, et supprimer les données pour le permettre est exclu. Aucune migration ou adoption de campagne historique n’est exécutée.

## Validation réellement effectuée

Le 24 octobre 2026 : `npm run build` réussi et **1205/1205 tests applicatifs**, zéro échec/annulé/ignoré/todo ; Node 24.22.1, npm 11.9.0. 24 cas M3 partagés mémoire/Firestore et cinq tests UI ajoutés ; un parcours HTTP/Auth ajouté, syntaxe des intégrations vérifiée. Quatre XLSX historiques identiques à la base. Firebase n’a pas été exécuté localement (Java 17) ; la CI utilise Java 21.

Les tests couvrent les trois familles et les neuf couples distance/risque, droits, réessais après révocation, concurrence M3/M1/M2/M4/M5/M6/M7, archives, interruption transactionnelle, limites, corruption, confidentialité, isolation et absence d’écritures dans les états joués. Les tests UI vérifient le HTML échappé, les formulaires et les charges utiles ; aucune recette visuelle navigateur, Android/iOS ou terrain n’est revendiquée.

Les deux CI du candidat exact seront consignées dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après leur terminaison, avec commit, exécution, job, outils et décomptes. Base C2i `1a30c227ea85ebf149442015dc056a99984a08b3` revérifiée : push et PR réussis, 1176 applicatifs/936 Firebase chacune, [preuve archivée](PR-1-HISTORIQUE-AVANT-C2J.md).

REC-SO-13 à 19 et REC-SO-MST-09 restent non certifiés : préparer des définitions ne vérifie ni un trajet joué ni une publication de version complète. Des preuves préparatoires sur droits, références et archives sont ajoutées, sans modifier les 55 verdicts complets ni SO-GAP-12/13/14. Publication, I3/I4/I5, restauration globale, charge pilote et recette humaine restent ouverts. Aucun déploiement, merge ou changement Firebase de production.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.1–3.10, lot SO-04, A.5–A.6, recettes SO-13 à 19 et MST-09.
- [Livre V0.7](source/SO_Regles_V07.txt), §§17–18 : trois familles, valeurs définitives, destinations codées, durées, carburant et risques indépendants.
- [Gabarits M3 V0.1 et rapprochement](SO-00-V34-GABARITS.md), onglets Modèles, Ports, Routes ; autres onglets non certifiés par C2j.
- [Vade-mecum](source/SO_Vademecum_V01.txt), définition/instance, référence unique, brouillon et publication globale distincts.
