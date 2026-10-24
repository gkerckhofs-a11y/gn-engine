# C2e — Préparer les kits initiaux des huit classes dans M1

24 octobre 2026. Les organisateurs disposant de l'édition M1 peuvent préparer les références des kits de classe dans le brouillon central. Les éléments et quantités sont dérivés du référentiel V0.7 ; ils ne sont pas des quantités libres. Le kit préparé ne crée aucun lot, compte, crédit, personnage, QR ou effet actif.

## Sources et base vérifiée

Organisateur : [CDC V3.5](source/SO_CDC_V35.md), §§3.3, 3.6, 4.7–4.9 et annexe A.2 ; [règles V0.7](source/SO_Regles_V07.txt), chapitre 3, « Dotation par classe » ; [plan central](SO-00-V34-PLAN-CENTRAL.md), §5, distinction définitions/instances. Les huit compositions et restrictions sont closes : aucun nouveau prix, pouvoir, quantité de consommable ou crédit libre.

Empreintes revérifiées : CDC `531ed5dba4c3c3970c5500db25cfc07df8dc434408a62b82783c0b2512be92d4`, règles `5ea1598760b98416db500642bb13d0a634a72787f034ddc55defd1ee4029abf6`, vade-mecum `dbf31157b44a962ed98879b1084c03c71b043bc8cff1443accbe2e77e16c48f3`.

Base C2d distante `bad924e7389a53b67f44eba67bf7bec18e03f828`, locale `57448af0878c61a61b29b15068d28afb6279d043`, arbre identique `699bed56871b67dc49954f4fc3149392e56ba311`. Main inchangé `03eaace155b052d1b7d1960347746e9ee60ed514` ; PR #1 ouverte en brouillon. Les deux CI C2d sont revérifiées réussies : [push 40094898251](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40094898251), [PR 40094901527](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40094901527), chacune 1043 applicatifs + 824 Firebase et compilation. [Description et preuves C2d archivées](PR-1-HISTORIQUE-AVANT-C2E.md).

## Composition fermée et périmètre

Le socle commun prépare les références d'un communicateur et d'une arme ordinaire homologuée **si applicable à la naissance**. L'affichage rappelle les 200 Cr protégés et le QR individuel ; aucune référence de compte/QR ni allocation ne peut être enregistrée dans ce formulaire.

| Classe | Éléments spécialisés préparés |
|---|---|
| COM — Combattant | Armure légère (1 protection), ensemble de fournitures de terrain |
| ROG — Rogue | Pochette de discrétion ; aucune cache Dissimulation gratuite |
| TRA — Traqueur | Scanner d'enquête ; aucun bonus automatique au dé |
| MED — Médecin | Outil médical, **2** trousses médicales consommables |
| MEC — Mécano | Ensemble d'outils mécaniques, **2** kits de réparation consommables, **1** lot de pièces (50 Cr d'usage) |
| PIL — Pilote | Terminal de navigation ; codes commerciaux publics signalés comme restant à préparer séparément |
| COU — Courtier | Terminal commercial ; contacts initiaux signalés comme restant à préparer séparément |
| INF — Infiltrateur | Interface fictive de piratage, **2** formulaires vierges |

Les fournitures et outils au pluriel sont représentés par **un ensemble** référencé : choix de conditionnement technique, pas définition du contenu interne ni nouveau barème canonique. Les 50 Cr d'usage du lot de pièces restent une indication du référentiel, pas un versement ni un tarif de vente. L'arme est un modèle préparé pour les cas applicables ; aucune homologation individuelle n'est inférée de son identifiant.

Les quantités et restrictions sont calculées depuis `initialClassKit`, pas écrites par le client. Le seul critère de contenu contrôlé ici au-delà de l'existence et de l'archive est le caractère consommable des trousses médicales et kits de réparation. Nom/catégorie d'un modèle ne certifient ni son effet, ni sa nature d'arme/armure, ni son homologation. Codes commerciaux, contacts, QR, mise en œuvre des protections, effets de matériel et décision d'attribution restent à raccorder.

## Commandes et modèle

`saveCentralClassKit` / `archiveCentralClassKit` réutilisent la transaction du Master central et ses changements/historiques/reçus. Le type propriétaire M1 est `classKit`, l'ID stable est le code de classe parmi les huit choix I1 ; un seul kit préparé par classe dans cette campagne. Aucune collection de catalogue parallèle ni duplication des modèles M1.

L'entrée de sauvegarde contient uniquement `bindings` (liste de `{slotId,itemId}`) et les notes privées `gmNotes` (4000 caractères). Références partielles et modèles futurs structurellement valides sont enregistrables ; `bindings` remplace explicitement la liste, un slot omis reste à préparer. Les slots inconnus, doublons, classes libres/Force, quantités injectées, crédits, protection, effets et flags de publication sont refusés. Les liaisons sont ordonnées canoniquement côté serveur.

Le serveur ajoute `schemaVersion=1`, profil `SPACE_OUTLAWS_V07`, nom canonique, révision native `revision`, état DRAFT et flag d'archive. La limite est de **8 kits, archives comprises**. Modèles et kits de même ID restent distincts (`item_MED` / `classKit_MED`), y compris dans les imports et les diagnostics.

Lecture M1 pour consulter ; édition M1 pour enregistrer/archiver/restaurer. Aucun droit implicite issu de M2, du rôle MJ de session ou d'un droit de contrôle. Révocation et cycle du brouillon avant tout reçu ; révision centrale et révision du kit vérifiées ; motif et avant/après historisés. Réessai d'un ancien enregistrement après une archive ne restaure pas le kit. Une restauration est une nouvelle modification auditée.

## Références et contrôle commun

La projection M1 et le contrôle central signalent les slots non renseignés, modèles absents, modèles archivés et consommables requis. Les modèles du même brouillon résolvent les liens ; aucune recherche dans les instances, admissions, personnages ou autres campagnes. Une correction/archivage de modèle recalcule les diagnostics sans réécrire le kit.

Les objets pouvant être achetés ensuite conservent leurs attributs ordinaires : préparer un kit ne rend pas son modèle globalement non pillable. Les restrictions non pillable/non revendable de la future dotation sont seulement rappelées dans la projection ; leur application aux lots initiaux et à tous les chemins économiques relève de I4.

Le contrôle commun valide strictement la forme, le propriétaire M1, les marqueurs, la provenance WEB et les références typées `classKit → item`. Un kit ou une cible altéré ne devient pas valide par omission. Le graphe, le diff et l'empreinte incluent les kits ; notes privées exclues du résumé global. Le plafond de contrôle passe explicitement de **601 à 609 enregistrements** (250 modèles + 100 personnages + 1 catalogue + 250 recettes + 8 kits), budgets 16 Mio de contenu/4 Mio de rapport inchangés. Lecture bornée à 610 pour détecter le dépassement.

Ce contrôle porte sur les kits effectivement préparés. Il ne certifie pas que toutes les classes utilisées dans M2 possèdent leur kit, ni que les modèles remplissent toutes les exigences sémantiques du référentiel. Couverture partielle et `publicationAvailable=false` sont conservés ; ni publication ni naissance déverrouillée par un rapport sans erreur.

## Interface, Excel et compatibilité

M1 affiche huit cartes, leur statut, éléments fixes, références et diagnostics. Le formulaire propose les modèles M1 ou leurs futurs IDs, notes privées, motif et révisions. Archive/restauration restent distinctes. Aucun formulaire de quantité, de crédit, de protection ou de pouvoir libre.

Les fichiers Excel M1 restent limités aux modèles d'objets ; les kits se préparent dans l'éditeur web. Un import M1 conserve les kits et recalcule leurs diagnostics dans l'aperçu. Exporter un ID partagé avec un kit renvoie le modèle d'objet, jamais le kit. Ni les exports M1/M2/M4 ni les quatre Masters historiques ne sauvegardent ces nouvelles définitions : préserver changements, historiques, révisions, imports et reçus du brouillon cohérent.

Le binaire C2d ne connaît pas les kits ; son contrôle les refuse et ses imports M1 ne gèrent pas cette coexistence. Il ne constitue pas un retour fonctionnel équivalent sur ce nouvel état. Les quatre Masters historiques ont leurs empreintes inchangées. Dépendances, workflows, règles/index Firebase et données réelles non modifiés ; aucune migration, adoption, fusion ou publication exécutée.

## Vérification

Local : Node 24.22.1 / npm 11.9.0 ; **1067 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, compilation réussie. Syntaxe application/HTTP/Firestore, diff et empreintes des quatre Masters vérifiés. **19 nouveaux cas métier partagés Firestore**, un test pur des huit compositions, quatre UI et un parcours HTTP/Auth ajouté. Émulateurs non exécutés localement (Java 17) ; résultats des deux CI exactes à consigner dans la PR une fois terminées.

Tests : préparation sans ressource, classes/quantités fermées, références différées, consommables, attributs d'objets préservés, archives/restaurations, réessais, droits/révocation, concurrence avec kit/objet/espèces, collisions intertypes, catalogue étranger, contenu corrompu, imports, absence de lecture des dossiers, cycle incompatible et interruption transactionnelle. Les tests existants sont conservés ; la borne C2a est adaptée à 609 définitions.

REC-SO-01, REC-SO-24, MST-03/06/08 et INS-06 reçoivent des preuves **préparatoires partielles**. SO-GAP-12/13/14 restent ouverts ; aucun des 55 verdicts complets ne devient un succès. Aucune recette humaine Android/iOS, charge pilote, restauration complète ou naissance protégée exécutée. Suite : raccordement sémantique des profils/effets et kits, validations complètes, version immuable/activation atomique, I3 admissions vers M2, I4 naissance et I5 relève.
