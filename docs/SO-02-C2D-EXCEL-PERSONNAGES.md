# C2d — Import/export Excel des personnages M2

24 octobre 2026. Extension du parcours central C1d aux fiches narratives C1e et plans initiaux C2c. Une sélection M2 peut être exportée, modifiée, prévisualisée et réimportée atomiquement dans le même brouillon. Le catalogue d'espèces demeure séparé et partagé avec les inscriptions ; aucune admission, incarnation, ressource ou publication n'est créée.

## Sources et base vérifiée

Organisateur : [CDC V3.5](source/SO_CDC_V35.md), §§3.2–3.6, 4.7–4.9, 8.3 et REC-SO-MST-01/02/07 ; [plan central](SO-00-V34-PLAN-CENTRAL.md), §5 ; [gabarits documentaires V0.1](SO-00-V34-GABARITS.md). La préparation peut contenir des références différées. L'import doit conserver IDs, provenance, confidentialité et absence d'effets de jeu.

Sources inchangées, empreintes revérifiées : CDC `531ed5dba4c3c3970c5500db25cfc07df8dc434408a62b82783c0b2512be92d4`, transcription V0.7 `5ea1598760b98416db500642bb13d0a634a72787f034ddc55defd1ee4029abf6`, vade-mecum `dbf31157b44a962ed98879b1084c03c71b043bc8cff1443accbe2e77e16c48f3`. Les classes/initiations restent celles de C2c ; aucun nouveau barème.

Base distante C2c `1e21f5f90ccdd3f85e93fc81bb03d68e836f5d95`, locale `ff9c036142af796f430b8eeff12713e1df7bd68b`, arbre identique `69adc2edcc18e0767e1393f9ccad1b6a5e42e733`. Main `03eaace155b052d1b7d1960347746e9ee60ed514` ; PR #1 ouverte, en brouillon, non fusionnée. Reprise : deux CI C2c revérifiées terminées avec succès, [push 40090745083](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40090745083) et [PR 40090747073](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40090747073), chacune 1022 applicatifs + 806 Firebase et build. [Description et preuves archivées](PR-1-HISTORIQUE-AVANT-C2D.md).

## Contrat et parcours

Réutilisation de `exportCentralDraft`, `prepareCentralImport`, `applyCentralImport`, des lecteurs/écrivains XLSX stricts et de la transaction C1d. Format `gn-engine-central-draft`, version/schema 1, nouveau module explicite M2 ; seuls `Meta` et `Personnages` sont admis dans ce fichier. Métadonnées liées à la campagne, au profil, à la base initiale, au brouillon, à sa révision et à un lot stable. Les contrats M1/M4, CAMPAGNE/SESSION et les gabarits V0.1 ne sont pas convertis.

Le bouton M2 propose une sélection de personnages, y compris archivés ; sans sélection, il produit un gabarit vide récent. Aucun export de paramètres d'admission, quotas, invitations, comptes ou catalogue d'espèces. L'ID fictif `player` reste possible : `character_player` et `speciesCatalogue_player` ne se confondent pas.

| Colonnes | Sémantique |
|---|---|
| `id`, `operation`, `revision` | Identifiant stable, CREER/MODIFIER/ARCHIVER/RESTAURER, révision native `contentRevision` ; CREER attend 0 |
| `nom`, `profession`, `description`, `nature` | Identité fictive et nature HUMANOID/DROID ; nature absente conservée ou null à la création, avec diagnostic |
| `biographie`, `interpretation`, `secrets_joueur`, `notes_mj` | Textes privés, limites natives C1e ; aucune visibilité joueur créée |
| `objectifs_json`, `relations_json` | Tableaux JSON complets avec IDs, étapes/relations et notes ; aucun champ `published`, privilège ou champ inconnu accepté |
| `profil_initial` | JOUEUR remplace le plan avec les trois choix obligatoires ; SANS ou !EFFACER retire le plan ; vide conserve si les trois choix sont également vides |
| `classe_id`, `espece_id`, `initiation_id` | Choix C2c validés côté serveur ; espèce référencée dans le catalogue partagé ; Force, initiation de sa propre classe et choix interdits refusés |

Cellule vide = conserver ; `!EFFACER` vide un champ facultatif. Pour les tableaux, `[]` vide également ; un tableau non vide remplace tout le tableau et n'effectue pas de fusion implicite. Un texte commençant par `!` double son premier caractère. L'export n'inclut pas les flags de publication internes ; le retour les maintient à false. Pour modifier aisément les objectifs/étapes/relations, l'éditeur web reste disponible et conserve les mêmes IDs. Aucune conversion de texte libre en JSON n'est présumée.

Une ligne absente ne supprime rien. Archiver n'accepte que les trois colonnes de commande ; restaurer est explicite et conserve les contenus non renseignés. Le réimport inchangé ne crée pas de révision de contenu ni d'historique supplémentaire. Un lot déjà appliqué ne réécrit jamais une édition web ultérieure.

## Contrôles et intégrité

Lecture M2 requise pour exporter ; édition M2 en plus pour préparer/appliquer. Droits courants et cycle C1a/C1b sont vérifiés avant tout reçu. Le droit de session MJ, le contrôle commun et la publication ne sont pas accordés par l'import.

La validation native `centralCharacterInput` protège les fiches et les structures imbriquées ; le plan réutilise les choix canoniques C2c. Les erreurs de JSON et les profils invalides sont localisés dans la feuille/ligne/colonne. Aucun enregistrement partiel du lot en cas d'erreur structurelle. Les IDs et `contentRevision` sont préservés ; aucun champ `revision` concurrent n'est ajouté à la donnée personnage.

Les relations réciproques du même lot peuvent être préparées ensemble. Le diagnostic utilise toutes les fiches projetées et le catalogue d'espèces du même brouillon, sans lire les candidatures, politiques ou instances. Une espèce/fiche manquante ou archivée reste un diagnostic ; les corrections web résolvent la référence sans réécrire la source. Le contrôle commun C2a/C2b accepte la provenance XLSX M2, conserve feuille/ligne/fichier/lot et indique `relations_json` ou `espece_id` pour les références concernées. `publicationAvailable=false` reste obligatoire.

Bornes : 100 lignes par fichier, 100 fiches M2 au total **archives comprises**, 96 Kio par fiche, 1 Mio de contenu de fichier. Le catalogue n'est pas compté comme un personnage. Nouvelle borne du contrat M2 : 32 000 caractères par cellule ; refus explicite d'export/import si dépassée, jamais de troncature. Une très longue collection narrative reste éditable sur le web mais n'est pas exportable dans ce format. Ces choix techniques ne modifient aucune règle de jeu.

Une révision centrale pour tout le lot, comparaison de chaque révision native, confirmation liée au contenu et aux droits, provenance et historique avant/après. Les éditeurs web, les espèces, M1/M4 et l'import ne contournent pas les conflits. Les reçus d'usage/commande et imports existants sont réutilisés, sans nouvelle collection.

## Compatibilité et sauvegarde

Les anciens personnages sans plan restent sans plan implicite ; ceux avec plan omis dans un fichier partiel le conservent. Les quatre Masters historiques ont leurs empreintes inchangées, ainsi que dépendances, workflows et règles/index Firebase.

Un export ciblé M2 n'est pas une sauvegarde complète : il ne contient ni catalogue d'espèces, ni droits, historiques, reçus, lots, admissions ou état de session. L'export d'une archive ne contient que sa commande, pas ses textes conservés côté serveur. Préserver le brouillon cohérent, ses changements/historiques/imports et les reçus ; aucun exercice global de restauration effectué.

Un binaire C2c ne sait pas importer M2 et son contrôleur refuse la nouvelle provenance XLSX M2. Il ne constitue pas un rollback fonctionnel équivalent. Aucun ancien dossier migré, aucune campagne adoptée, aucun merge/déploiement.

## Vérification du lot

Local : Node 24.22.1 / npm 11.9.0, **1043 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo ; `npm run build` réussi. Syntaxe HTTP/Firestore et diff vérifiés. 17 nouveaux cas métier partagés mémoire/Firestore, quatre UI/XLSX et un parcours HTTP/Auth ajouté. Les tests existants M1/M4 et les quatre Masters restent conservés. Émulateurs non exécutés localement (Java 17) ; résultats des deux CI exactes à consigner dans la PR après terminaison.

Les nouveaux cas couvrent XLSX réel, retour sans perte, profils et structures privées, références réciproques/différées, collisions d'IDs intertypes, archives, réessais, concurrence, délégations/révocation, isolation des admissions, bornes, interruption transactionnelle et absence d'effets de jeu. Aucun essai humain Android/iOS, charge pilote, restauration globale ou publication n'est revendiqué.

MST-01/02/07 et INS-06 reçoivent des preuves préparatoires partielles, sans certification de leurs parcours complets. SO-GAP-12/13/14 restent ouverts ; aucun des 55 verdicts complets ne devient un succès. Suite : dotations M1, profils/effets exécutables et autres ateliers, validations complètes, version immuable/activation atomique, raccordement I3 des admissions, naissance protégée I4 et relève I5.
