# C2k — import/export des informations M6 et missions M7

## Parcours livré

Les ateliers M6 et M7 utilisent désormais le même parcours XLSX central v1 que M1/M2/M4 : export privé d’une sélection ou d’un gabarit lié au brouillon, modification, aperçu des différences et des références, puis confirmation motivée d’un lot atomique. Un fichier correspond à un seul atelier et une seule révision centrale. L’import prépare des définitions natives `knowledge` ou `mission` dans `masterDrafts/initial/changes` ; aucune autre base de fiction n’est créée.

Une mission peut référencer une information absente : l’aperçu indique `Missions`, la ligne réelle, `prerequis_informations_json` et l’identifiant à préparer. Après import de l’information M6, le contrôle commun résout ce lien sans recopier son texte ni réécrire la mission. Les références archivées sont signalées. Une définition manquante peut rester en brouillon ; ce diagnostic n’autorise aucune publication.

Aucun savoir attribué, reçu de découverte, QR activé, mission affectée, progression, annonce, contrat, stock, récompense, XP ou crédit n’est créé. `publicationAvailable=false` reste imposé.

## Contrat des fichiers

La feuille `Meta` et ses liens campagne/profil/base/brouillon/révision/module/lot restent inchangés. Le format demeure `gn-engine-central-draft`, version et schéma 1. Les Masters CAMPAGNE/SESSION et les sept gabarits documentaires V0.1 ne sont pas convertis. Les nouvelles feuilles ci-dessous correspondent aux champs natifs effectivement éditables, pas à l’intégralité des onglets documentaires.

Chaque feuille métier commence par `id`, `operation`, `revision`. Les opérations sont `CREER` (révision 0), `MODIFIER`, `ARCHIVER`, `RESTAURER`. Archiver exige seulement ces trois cellules ; un export archivé est neutre et sa réimportation ne crée aucune révision. Restaurer conserve les textes et sous-identifiants, avec une nouvelle révision et un historique avant/après.

| Atelier / feuille | Colonnes métier | Contrat |
|---|---|---|
| M6 / `Informations` | `type`, `titre`, `texte`, `origine`, `partage`, `verite_mj`, `notes_mj` | KNOWLEDGE/CLUE/DOCUMENT ; SHOW/COPY ; textes privés natifs |
| M6 / `Informations` | `destinataires_initiaux_json`, `qr_propose`, `audience_qr`, `destinataires_qr_json` | Deux tableaux d’IDs M2 ; OUI/NON ; ALL_PLAYERS/SELECTED |
| M6 / `Informations` | `competence_qr_id`, `niveau_competence_qr` | Condition proposée : identifiant + niveau entier 1 à 5 ; aucun niveau implicite |
| M7 / `Missions` | `titre`, `description`, `notes_mj`, `etapes_json` | Étapes ordonnées : objets `id`, `title`, `description`, IDs stables, aucune propriété `published` importable |
| M7 / `Missions` | `donneur_personnage_id`, `prerequis_informations_json`, `recompenses_objets_json` | Donneur M2 facultatif ; tableau d’IDs M6 ; objets `{itemId, quantity}` avec quantité entière positive |
| M7 / `Missions` | `conditions`, `preuves_attendues` | Texte narratif privé, aucune expression exécutable |

Cellule vide = conserver la valeur existante ; absence de ligne = conserver la définition. `!EFFACER` vide explicitement un champ facultatif. Doubler le premier `!` encode un texte littéral commençant par ce caractère. Les textes ressemblant à des formules restent des cellules textuelles dans le XLSX.

Les tableaux JSON remplacent le tableau entier ; `[]` et `!EFFACER` le vident. Les objets imbriqués inconnus, IDs invalides, doublons, états publiés, stocks, XP et quantités invalides sont refusés. Les validateurs `centralKnowledgeInput` et `centralMissionInput` restent l’autorité native. Une mission sans détail peut avoir zéro étape, donneur, prérequis et récompense ; aucune donnée n’est inventée.

Désactiver le QR ou modifier son audience conserve les deux listes de destinataires. Pour retirer une condition de compétence, effacer explicitement l’identifiant **et** le niveau ; une demi-condition est refusée à la colonne `niveau_competence_qr`. La compétence reste différée et ne devient pas une condition active de jeu.

## Autorité, intégrité et diagnostics

Lecture de l’atelier suffisante pour exporter ; lecture et édition requises pour préparer/confirmer un import. Les droits courants et le cycle initial sont vérifiés avant tout reçu de commande ou de lot. Révoquer une délégation empêche aussi de récupérer un ancien résultat. Les confirmations sont liées à l’auteur, au contenu, au fichier, aux diagnostics, à la révision centrale et à la révision des droits.

M6 consulte M2 uniquement avec lecture M2 explicite. M7 consulte séparément M1, M2 et M6 selon les lectures accordées. Sans ce droit, aucune requête de catalogue étranger ni révélation de nom, secret, existence ou archive ; seulement `REFERENCE_NOT_CHECKED` sur la référence fournie par l’auteur. Le résumé global reste sans textes narratifs privés. Les aperçus contiennent les différences privées de l’atelier auquel l’auteur est habilité.

Le lot entier partage une révision centrale et une transaction : une ligne invalide ou une interruption ne laisse ni changement, historique ou reçu partiel. Un lot rejoué ou renommé ne redouble pas les changements ; réutiliser son identifiant avec un autre contenu est refusé. Une édition concurrente exige un nouvel export/aperçu. Provenance XLSX, feuille, ligne, fichier, lot, auteur, motif et avant/après restent conservés.

Le contrôle global accepte les provenances `Informations`/`Missions` uniquement pour leur atelier/type correspondant et traduit les champs natifs en colonnes XLSX, notamment les destinataires, prérequis et quantités de récompenses. Empreinte interne portée de 7 à **8** ; relancer le contrôle après mise à jour. Ce n’est pas un consentement de publication.

## Limites et compatibilité

100 lignes par fichier et 1 Mio de contenu, inchangés. Maximum 32 000 caractères par cellule M6/M7, à l’import **et** à l’export, sans troncature ; une mission web dont le tableau d’étapes dépasse cette limite reste éditable sur le web mais son export ciblé est refusé explicitement. Les bornes natives continuent de s’appliquer : 250 informations et 100 missions archives comprises, 96 Kio par définition, 40 étapes par mission et 100 entrées par liste. Ces bornes sont techniques, pas des règles de fiction.

Aucun type ni budget global ajouté : 1659 changements, 16 Mio de contenu, 4 Mio de rapport. Les fichiers M1/M2/M4 et les quatre XLSX historiques restent inchangés. Excel M3/M5 reste non pris en charge. Les médias, lieux/QR communs, sources réelles de récompenses, publication/versionnement, I3/I4/I5 et état joué restent à raccorder.

Un export ciblé ne sauvegarde pas le brouillon complet, ses grants, historiques et reçus. Préserver cet ensemble cohérent, notamment les nouvelles provenances M6/M7 et `masterDrafts/initial/imports`. C2j refuse ces provenances lors de son contrôle global : il n’est pas un retour fonctionnel équivalent. Aucune suppression, migration ou adoption de campagne historique n’est effectuée.

## Validation réellement effectuée

Le 24 octobre 2026 : `npm run build` réussi et **1234/1234 tests applicatifs**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. **24 nouveaux cas partagés mémoire/Firestore**, cinq UI/XLSX et un HTTP/Auth. Syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17) ; les deux CI utilisent Java 21. Les SHA-256 des quatre Masters historiques sont identiques à C2j.

Les tests couvrent les vrais XLSX, références différées et colonnes, conservation des listes/secrets/IDs, retrait explicite, archives, bornes, validation native, droits croisés sans lecture étrangère, révocation avant reçu, confirmations périmées, concurrence et interruption atomique. Les tests UI contrôlent HTML, échappement et formulaires ; aucune recette visuelle navigateur, Android/iOS ou terrain n’est revendiquée.

Les résultats des deux CI du commit exact seront consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après leur terminaison : SHA, exécution, job, outils et totaux. Base C2j `1fb8a7a47e4a185f3f50bde784fb58dd4995853c` revérifiée : push 40127917036 / PR 40127921600 réussis, chacun 1205 applicatifs et 961 Firebase ; [preuve archivée](PR-1-HISTORIQUE-AVANT-C2K.md).

REC-SO-MST-02/05/07/08 reçoivent des preuves préparatoires partielles. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés ; les sept ateliers restent partiels et non publiables. Aucun merge, déploiement, migration ou changement Firebase de production.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.4–3.10, recettes MST-02/05/07/08 : un atelier par fichier, aperçu, références différées, contrôles et publication distincts.
- [Gabarits M6/M7 V0.1](SO-00-V34-GABARITS.md) : rapprochement documentaire, pas un contrat d’import certifié.
- [M6 natif C2h](SO-06-C2H-INFORMATIONS-BROUILLON.md) et [M7 natif C2i](SO-06-C2I-MISSIONS-BROUILLON.md), validateurs et limites réutilisés.
- [Vade-mecum](source/SO_Vademecum_V01.txt) et [règles V0.7](source/SO_Regles_V07.txt) : définition/instance, accès privé, découverte et récompense réelle distincts.
