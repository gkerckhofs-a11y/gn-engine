# SPACE OUTLAWS — sauvegarde, reprise et déploiement À FAIRE VALIDER

## C2o — groupes et factions préparés dans M2

[C2o — groupes et factions M2](SO-02-C2O-GROUPES-CENTRAUX.md) ajoute des changements natifs `group` dans M2, avec historiques et reçus existants ; les instantanés C2n conservent ces définitions. Préserver groupes, personnages, droits, imports, captures/pages et états privés cohérents. Excel M2 reste ciblé sur les personnages ; aucune restauration globale. Retour C2n non équivalent : lecteur, contrôle I3c et import M2 ignorent le nouveau type. Quatre Masters, règles/index/IAM et marqueur de production inchangés ; aucune migration, fusion ou mise en production.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1426 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth. Firebase non exécuté localement (Java 17) ; preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves C2n archivées](PR-1-HISTORIQUE-AVANT-C2O.md) : 1399 applicatifs/1129 Firebase chacun.

## C2n — instantanés privés du brouillon central

[C2n — instantanés centraux](SO-02-C2N-INSTANTANES-CENTRAUX.md) ajoute `masterDrafts/initial/checks/{id}` et ses pages, audit de campagne et reçus. Les conserver ensemble avec le brouillon, droits et données privées d’admission. Le JSON privé contient définitions et rapport, pas une sauvegarde complète ni un format de restauration. Retour I3c sans conversion des définitions, mais sans lecteur des captures ; conserver les sous-collections. Empreinte centrale 12, quatre Masters et contrats historiques inchangés. Aucun déploiement, migration, règles/index/IAM ou marqueur de production modifié.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1399/1399 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 21 nouveaux cas partagés mémoire/Firestore, quatre UI et un HTTP/Auth ; Firebase non exécuté localement (Java 17). Preuves finales des deux CI exactes dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. [Preuves I3c archivées](PR-1-HISTORIQUE-AVANT-C2N.md) : 1374 applicatifs/1107 Firebase chacun.

## I3c — contrôle privé de l’ensemble des dossiers M2

[I3c — contrôle des dossiers M2](SO-01-I3C-CONTROLE-DOSSIERS-M2.md) ajoute une lecture transactionnelle de la régie : concordance identité/plan, premières fiches manquantes, retraits encore liés, archives, orphelins, confirmations, compteurs et verrous d’identité. Les biographies MJ peuvent différer ; les exceptions I2 motivées restent admises. MJ de session + lecture M2 requis, sans édition obligatoire ni accès implicite aux autres ateliers.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1374/1374 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés Firestore, quatre UI et un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves finales du candidat exact dans la PR après les deux CI. Base I3b `8dcd82bf423e1d913d338b2a8c969b3799dddf4f` : deux CI vertes, 1347 applicatifs/1083 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3C.md).

Rapport de préparation, pas un consentement : publication et naissance indisponibles, revalidation nécessaire lors de leurs futurs actes. Aucun état persistant nouveau, aucun export civil ou récit dans le rapport, aucune ressource ni correction automatique. Budgets de lecture 1000 dossiers/1000 verrous actifs/100 fiches M2/16 Mio sources/4 Mio rapport, refus intégral sans troncature ; ce ne sont pas des quotas de participation. Empreinte centrale 12, budgets centraux et quatre Masters historiques inchangés. Retour I3b sans conversion, avec perte du nouveau contrôle ; sauvegarde cohérente et restauration complète restent distinctes. C2, I3/INS-06 complet, I4/I5, 55 verdicts complets et SO-GAP-12/13/14 restent ouverts ; aucune recette mobile, charge, restauration globale ou production revendiquée.

## I3b — rapprochement courant du dossier et de M2

[I3b — comparaison et rapprochement](SO-01-I3B-RAPPROCHEMENT-M2.md) ajoute un aperçu privé, une confirmation motivée et l’alignement de l’identité/du plan M2 sur le dossier actuellement approuvé. Biographie conservée par défaut, remplacement explicite ; autres textes, secrets, objectifs et relations conservés. Relecture sans changement = aucune révision centrale supplémentaire. Double autorité MJ/M2, garde de cycle, conflits, réessais et audit préservés.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1347/1347 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 23 nouveaux cas partagés Firestore, cinq UI et un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après les deux CI. Base I3a `e97102c92aaef221c57003109112955368b869a9` : deux CI vertes, 1319 applicatifs/1059 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3B.md). Plafond CI porté de 40 à 50 minutes après un push I3a de plus de 38 minutes, commandes de test inchangées.

Le reçu privé n’autorise aucune activation et un réessai restitue un résultat historique. Retrait/consentement/choix invalide/archive bloquent une nouvelle application. Provenance RECONCILED_SNAPSHOT et empreinte globale 12 ; budgets 1659/16 Mio/4 Mio et Masters historiques inchangés. Conserver marqueurs privés, brouillon, droits, compteurs/verrous, historiques et reçus ensemble ; I3a n’est pas un retour fonctionnel équivalent. Validation courante dans les futures publication/naissance, C2 complet, I4/I5, restauration globale et recette humaine restent ouverts. INS-06/I3 complets, 55 verdicts complets et SO-GAP-12/13/14 non certifiés par cette tranche.

## I3a — candidature approuvée vers une fiche M2 privée

[I3a — préparation M2](SO-01-I3A-ADMISSION-VERS-M2.md) ajoute aperçu et confirmation explicites depuis une admission approuvée, avec droits MJ et lecture/édition M2 indépendants. Une copie native de la fiction et un lien privé stable, une transaction/révision commune, réessais sans doublon. Aucune incarnation, dotation, publication ou donnée civile copiée automatiquement dans M2.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1319/1319 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 22 nouveaux cas partagés Firestore, cinq UI et un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après les deux CI. Base C2m `6052b7ab38c3bd56b61beb803144080951ea0434` : deux CI vertes, 1292 applicatifs/1036 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3A.md).

Retrait/changement de classe conserve la fiche et signale le rapprochement requis ; les éditions/archives M2 ne sont jamais écrasées par réessai. Lien courant et publication restent à valider avant naissance : I3 complet/INS-06 ne sont pas livrés. 100 fiches archives comprises, empreinte interne 11, budgets 1659/16 Mio/4 Mio inchangés. Conserver lien privé, brouillon, droits, compteurs/verrous, historiques et reçus ensemble ; C2m n’est pas un retour fonctionnel équivalent. Quatre Masters historiques, 55 verdicts complets et SO-GAP-12/13/14 inchangés. C2 complet, I4/I5, restauration globale et recette humaine restent ouverts.

## C2m — Excel des modèles, ports et routes M3

[C2m — import/export M3](SO-04-C2M-EXCEL-SPATIOPORT.md) réunit Modeles/Ports/Routes dans un lot atomique avec aperçu, confirmation et révision commune. Sélection typée, homonymes, liens finaux, codes privés et validations natives ; caractéristiques V0.7 dérivées, aucun profil/code/barème libre par défaut. Aucune instance, voyage, ressource ou publication activée.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1292/1292 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI/XLSX, un HTTP/Auth ; syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après les deux CI. Base C2l `944f0569b1f7815eb98ab193ed966dcc2b446b75` : deux CI vertes, 1263 applicatifs/1011 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2M.md).

Trois feuilles requises même vides, 100 lignes cumulées/1 Mio ; 100 modèles/100 ports/200 routes archives comprises. Empreinte interne 10, bornes globales 1659/16 Mio/4 Mio inchangées. Les sept ateliers ont un import/export pour leurs types raccordés ; les gabarits documentaires complets ne sont pas certifiés. Quatre Masters historiques inchangés. Conserver provenances M3, brouillon, droits, historiques et reçus ensemble : C2l n’est pas un retour fonctionnel équivalent. MST-02/03/07/08/09 : preuves partielles ; 55 verdicts complets, navigation jouée et SO-GAP-12/13/14 inchangés. Publication, I3/I4/I5, restauration globale et recette humaine restent ouverts.

## C2l — Excel des boutiques et offres M5

[C2l — import/export M5](SO-05-C2L-EXCEL-BOUTIQUES-OFFRES.md) ajoute un fichier à deux feuilles Boutiques/Offres, sélection privée typée, aperçu, confirmation et transaction unique. Homonymes distincts, liens calculés sur les deux feuilles finales, validation native des prix et références, lectures M1/M2 indépendantes. Aucun stock, compte, QR, droit de vente ou achat activé.

**Local, 25 octobre 2026 (Europe/Brussels) : compilation et 1263/1263 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI/XLSX, un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; résultats du candidat exact dans la PR après les deux CI. Base C2k `78699b2a483191fdd3243d5dc90ec69b02ae96ea` : deux CI vertes, 1234 applicatifs/986 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2L.md).

100 lignes au total sur les deux feuilles, 1 Mio ; 50 boutiques/250 offres archives comprises. Bornes globales 1659/16 Mio/4 Mio inchangées, empreinte interne 9. Excel M1/M2/M4/M5/M6/M7 disponible ; M3 reste à livrer. Quatre Masters historiques inchangés. Préserver nouvelles provenances, droits, historiques et reçus avec le brouillon complet : C2k n’est pas un retour fonctionnel équivalent. MST-02/03/06/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Sept ateliers partiels, publication, I3/I4/I5, restauration globale et recette humaine encore ouverts.

## C2k — Excel des informations M6 et missions M7

[C2k — import/export M6/M7](SO-06-C2K-EXCEL-INFORMATIONS-MISSIONS.md) ajoute les feuilles `Informations` et `Missions` au contrat central v1 : sélection privée, aperçu, confirmation motivée et lot atomique. Textes et IDs conservés, listes JSON complètes, effacement explicite, diagnostics localisés et lectures croisées indépendantes. Aucun savoir, QR, mission jouée, récompense ou ressource activé.

**Local, 24 octobre 2026 : compilation et 1234/1234 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI/XLSX, un HTTP/Auth ; intégrations vérifiées syntaxiquement. Firebase non exécuté localement (Java 17) ; preuves du candidat exact dans la PR après terminaison des deux CI. Base C2j `1fb8a7a47e4a185f3f50bde784fb58dd4995853c` : deux CI vertes, 1205 applicatifs/961 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2K.md).

100 lignes/1 Mio par fichier, 32 000 caractères par cellule sans troncature ; bornes natives et budgets globaux 1659/16 Mio/4 Mio inchangés. Empreinte interne 8. Excel central disponible pour M1/M2/M4/M6/M7 ; M3/M5 restent à livrer. Quatre Masters historiques inchangés. Conserver les nouvelles provenances avec brouillon, historiques, grants et reçus : C2j n’est pas un retour fonctionnel équivalent. MST-02/05/07/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Sept ateliers partiels, publication, I3/I4/I5, restauration globale et recette humaine encore ouverts.

## C2j — modèles, ports et routes M3

[C2j — préparation du spatioport](SO-04-C2J-SPATIOPORT-BROUILLON.md) ouvre les modèles des trois familles V0.7, les ports codés et les routes à distance/risque explicites. Valeurs canoniques fixes, ports différés et archives contrôlés, délégation M3, révisions communes, audit et réessais. Aucun vaisseau joué, carburant, voyage, événement, QR ou paiement créé.

**Local, 24 octobre 2026 : compilation et 1205/1205 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI, un HTTP/Auth. Firebase non exécuté localement (Java 17) ; résultats du candidat exact dans la PR après terminaison des deux CI. Base C2i `1a30c227ea85ebf149442015dc056a99984a08b3` revérifiée : deux CI vertes, 1176 applicatifs/936 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2J.md).

M3 reste partiel ; les sept ateliers ont désormais une édition préparatoire partielle, sans publication. Limites techniques : 100 modèles de vaisseaux, 100 ports, 200 routes, archives comprises ; 1659 changements globaux, 16 Mio/4 Mio inchangés, empreinte interne 7. Instances, carburant/modules M1, pilotes M2, lieux/QR, événements, rencontres financées, navigation jouée et Excel M3 restent à raccorder. Quatre Masters historiques inchangés. Préserver nouveaux types et grants M3 avec le brouillon complet : C2i n’est pas un retour fonctionnel équivalent. REC-SO-13 à 19 et MST-09 non certifiés ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication, I3/I4/I5 et recette humaine restent ouverts.

## C2i — missions M7 dans le brouillon commun

[C2i — préparation des missions](SO-06-C2I-MISSIONS-BROUILLON.md) ajoute missions narratives, étapes ordonnées avec identifiants stables, donneur M2, prérequis M6 et récompenses proposées M1. Lectures croisées explicites et suggestions sans secrets étrangers ; aucune attribution, progression, annonce, réservation, récompense ou paiement de session.

**Local, 24 octobre 2026 : compilation et 1176/1176 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI, un HTTP/Auth. Firebase non exécuté localement (Java 17) ; résultats du commit exact dans la PR après terminaison des deux CI. Base C2h `b080ed9dae51c5959cf809fc4d4008aa7caa8fd2` revérifiée : deux CI vertes, 1147 applicatifs/911 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2I.md).

M7 partiel, publication indisponible. Limites techniques : 100 missions, 40 étapes, 100 entrées par liste de prérequis/récompenses, 96 Kio par définition ; 1259 changements globaux, 16 Mio/4 Mio inchangés, empreinte interne 6. Sources réelles des récompenses, réussite, groupes, annonces, rendez-vous, événements et Excel M7 restent à livrer. Quatre Masters historiques inchangés. Préserver missions et grants M7 avec le brouillon complet : C2h n’est pas un retour fonctionnel équivalent. REC-SO-MST-05/08 : preuves préparatoires partielles ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication, I3/I4/I5 et recette humaine restent ouverts.

## C2h — informations M6 et références M4

[C2h — préparation M6](SO-06-C2H-INFORMATIONS-BROUILLON.md) ajoute connaissances, indices et documents privés, destinataires proposés M2, archive/restauration et contrôle des références M4 vers M6. Lectures croisées explicites ; suggestions M4 sans texte, vérité MJ, notes ou destinataires. Aucun reçu de connaissance joueur, partage, déblocage de recette ou QR actif.

**Local, 24 octobre 2026 : compilation et 1147/1147 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 26 cas métier partagés Firestore, six UI, un HTTP/Auth ajoutés. Firebase non exécuté localement (Java 17) ; preuves du commit exact dans la PR après terminaison des deux CI. Base C2g `fad9bc4ed8be49087b19ef3a7a5de066b0161537` revérifiée : deux CI vertes, 1115 applicatifs/884 Firebase chacune, [preuves archivées](PR-1-HISTORIQUE-AVANT-C2H.md).

M6 reste partiel, publication indisponible. Limites techniques : 250 informations, 100 destinataires par liste, 96 Kio par définition, 1159 changements globaux, budgets 16 Mio/4 Mio inchangés ; empreinte interne 5. Excel M6, cibles terrain, découverte et attribution restent à livrer. Quatre Masters historiques inchangés. Préserver nouveaux types et grants M6 avec le brouillon complet : C2g n’est pas un retour fonctionnel équivalent ; exports ciblés insuffisants pour une sauvegarde globale. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés ; publication, I3/I4/I5 et recette humaine ouvertes.

## C2g — boutiques et offres dans le brouillon M5

[C2g — préparation M5](SO-05-C2G-BOUTIQUES-BROUILLON.md) ouvre création, modification, archive/restauration des boutiques et offres, références au même objet M1 que M4 et au vendeur M2, diagnostics typés et contrôle commun. Lecture M1/M2 explicitement requise pour les suggestions ; aucun nom/état étranger révélé avec M5 seul. Prix proposés sans tarif par défaut ; aucun stock, compte, crédit, QR ou droit de vente créé.

**Local, 24 octobre 2026 : compilation et 1 115/1 115 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. 24 nouveaux cas partagés Firestore, cinq UI, un HTTP/Auth. Firebase non exécuté localement (Java 17) ; résultats du commit exact à consigner dans la PR après terminaison. Base C2f `4ed82c3f56b3c9969f6ea176edcab19ed00758cc` : deux CI vertes revérifiées, 1 086 applicatifs/859 Firebase chacune, preuves [archivées](PR-1-HISTORIQUE-AVANT-C2G.md).

M5 reste partiel et non publiable. Limites techniques : 50 boutiques, 250 offres, 909 changements globaux, budgets 16 Mio/4 Mio inchangés ; empreinte interne 4. Excel M5, lieux, habilitations, caisse/stock, tarifs de jeu et transactions restent à livrer. Quatre Masters historiques inchangés. MST-03/06/08 : preuves préparatoires partielles seulement ; les 55 verdicts complets et SO-GAP-12/13/14 ne changent pas. Publication, I3/I4/I5 et recette humaine restent ouverts. Préserver types et grants M5 lors d’une reprise : C2f n’est pas un retour fonctionnel équivalent.

## C2f — cohérence des plans M2 et kits M1

[C2f — dépendances de dotation](SO-02-C2F-COHERENCE-INITIALE.md) : chaque plan initial actif référence le kit de sa classe principale ; absence, archive, corruption et références/consommables incomplets sont signalés sur les fiches concernées. Tableau des huit classes, nombres de définitions distincts des participants, provenance Excel jusqu’à `classe_id`, lecture transactionnelle sous droits C2b. Aucun accès supplémentaire en M2 isolé et aucune ressource créée.

**Validation locale du 24 octobre 2026 : 1086/1086 tests applicatifs réussis, zéro échec/annulé/ignoré/todo ; compilation réussie.** Node 24.22.1 / npm 11.9.0. 14 nouveaux cas métier partagés avec Firestore, deux cas purs, trois UI et un parcours HTTP/Auth. Firebase non exécuté localement (Java 17) ; CI du commit exact à consigner dans la PR après terminaison. Base C2e distante `0fa4d4af7855492fbffdc6e92c7a504816f959d0` : deux CI vertes revérifiées avant ce lot, preuves [archivées](PR-1-HISTORIQUE-AVANT-C2F.md).

`REFERENCES_CHECKED` ne certifie ni effets ni naissance ; `publicationAvailable=false`. Bornes 609 définitions/16 Mio/4 Mio conservées. Aucun état persistant ou migration C2f ; empreinte interne de contrôle portée à 3. Contrats et quatre Masters historiques inchangés. REC-SO-01/24, MST-03/06/08 et INS-06 : preuves préparatoires partielles seulement ; 55 verdicts complets et SO-GAP-12/13/14 inchangés. Publication, effets, I3/I4/I5, recette mobile et restauration complète restent à livrer.

## C2e — préparation des kits initiaux M1

[C2e — huit kits de classe](SO-02-C2E-KITS-INITIAUX.md) : éléments/quantités V0.7 fermés, références aux modèles M1, diagnostics différés et contrôle commun, révisions/archives/réessais sans dotation. **1067 tests applicatifs locaux et build réussis** ; 19 nouveaux cas partagés Firestore, un cas canonique, quatre UI et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. Limite centrale 609 définitions ; fichiers Excel M1 limités aux objets. Preuves préparatoires partielles uniquement, SO-GAP-12/13/14 et 55 verdicts complets inchangés. Effets/protections actifs, publication, I3/I4/I5 et recette humaine à compléter.

## C2d — Excel des personnages M2

[C2d — import/export M2](SO-02-C2D-EXCEL-PERSONNAGES.md) : sélection privée, aperçu, fiches narratives et plans C2c, références différées/localisées, lot atomique avec révisions natives et catalogue partagé intact. **1043 tests applicatifs locaux et build réussis** ; 17 nouveaux cas partagés Firestore, quatre UI/XLSX et un HTTP/Auth. CI exacte à consigner dans la PR après terminaison. MST-01/02/07 et INS-06 : preuves préparatoires partielles ; SO-GAP-12/13/14 et les 55 verdicts complets restent inchangés. Publication, effets/dotations, I3/I4/I5 et recette humaine à compléter. Export ciblé, pas une sauvegarde globale.

## Complément C2c — plans initiaux M2

[C2c](SO-02-C2C-PROFILS-INITIAUX.md) ajoute le champ privé `creationPlan` aux définitions M2 C1e. Sauvegarder avec les changements, histoires, révisions et reçus ; les exports M1/M4 ou Masters historiques ne le couvrent pas. Omission par un ancien client conserve, null explicite retire ; un ancien lecteur C2b ne sait pas valider ces plans et ne constitue pas un retour fonctionnel équivalent. Aucun profil actif ni ressource créé, aucune migration ou restauration complète exécutée.

## Complément C2b — droit de contrôle et révisions

[C2b](SO-02-C2B-DELEGATION-CONTROLE.md) ajoute `campaignStaff.checkCentral` et lie le rapport aux droits courants. Préserver ce champ avec les révisions, historiques et reçus C1b ; les exports ciblés ne les sauvegardent pas. Désactiver efface le droit, réactiver ou rejouer un ancien reçu ne le restaure pas. Un ancien binaire C2a ferme le contrôle aux délégués et son éditeur peut effacer le champ : retrait de capacité, pas retour fonctionnel équivalent. Revalider explicitement les délégations après reprise. Aucun rapport persistant, migration, restauration complète ou production exécuté.

## Complément C2a — contrôle en lecture seule

[C2a](SO-02-C2A-CONTROLE-CENTRAL.md) ne crée ni rapport persistant, version, pointeur, reçu ni donnée économique. Son empreinte n'est pas une sauvegarde ni une autorisation de publication. Un retour logiciel conserve les contrats et états des lots antérieurs ; aucune restauration de données C2a à exécuter. Les limites agrégées du contrôleur ne sont pas une certification de charge. Publication/reprise et restauration globale restent à éprouver sur données fictives.

## Complément C1e — définitions narratives M2

[C1e](SO-01-C1E-PERSONNAGES.md) ajoute les changements `character_{id}` et délégations M2 au même ensemble cohérent du brouillon. Préserver leurs IDs, `contentRevision`, histoires et reçus avec campagne/droits/opérations. Les Masters historiques et exports ciblés M1/M4 ne les sauvegardent pas. Aucun rollback fonctionnel vers un lecteur refusant les grants M2, aucune restauration complète ni production exécutée.

## Complément C1d — reçus de lots Excel centraux

[C1d](SO-01-C1D-EXCEL-CENTRAL.md) ajoute les reçus `masterDrafts/initial/imports` à préserver avec changements/historiques et `operations`. Un export ciblé M1/M4 contient les définitions sélectionnées et le contexte, pas les droits, reçus ou historiques : il ne permet pas une restauration complète. Aucun exercice de restauration ni déploiement exécuté.

## Complément C1b — brouillon, délégations et reçus cohérents

[Contrat C1b et reprise](SO-01-C1B-BROUILLON.md) : sauvegarder ensemble le header de campagne, `masterDrafts/initial` et changements/historiques, `campaignStaff`, audit et `operations`, avec la préparation et ses admissions I1/I2. XLSX historique et archive de scénario insuffisants. Ne pas revenir à un lecteur ignorant ces droits/changements. Interruption transactionnelle, réponse perdue et restauration d’une définition archivée testées automatiquement ; **sauvegarde/restauration complète et rollback opérationnel non exécutés**. Aucun déploiement autorisé.

## Complément I2b — groupes et permissions cohérents

[Contrat et reprise I2b](SO-01-I2B-GROUPES.md) : sauvegarder ensemble `group.roster`, membres, versions, audit, opérations et autorisations, avec comptes/ledger/stocks/contrats. XLSX seul insuffisant. Ne pas revenir à un binaire pré-I2b ignorant la politique. Interruption avant commit, réessai après réponse perdue et contre-opération liée testés automatiquement ; sauvegarde/restauration complète, retour arrière opérationnel et recette mobile non exécutés. Aucun déploiement autorisé.

## Complément I2 — confirmations cohérentes

[Contrat I2 et reprise](SO-01-I2-DECISIONS.md) : sauvegarder ensemble registrations/historiques, total de session, compteurs par classe, réservations d’identité, invitations/usages, reçus/audit et contexte central. Ne jamais restaurer un seul compteur ou revenir à un binaire I1 qui ignore les confirmations. Annulation avant commit et réessai après réponse perdue sont testés automatiquement ; restauration complète et retour arrière opérationnel restent non exécutés. Aucun déploiement autorisé par ces preuves.


**Procédure préparée, jamais lancée. Aucune mise en production autorisée.** Le candidat actuel n'est pas prêt : voir [rapport de conformité](SO-VALIDATION.md). Aucun nom de projet de recette, URL, compte ni stockage de sauvegarde disponible n'est présumé. Aucun changement de droits Firebase, IAM, DNS ou comptes de production n'est inclus dans les autorisations actuelles.

## 1. Préparer le candidat et la recette isolée

1. Figer le SHA de branche, la version applicative, le référentiel publié et les éventuelles migrations. Relire le diff, l'intégrité des quatre Masters et les dépendances. Identifier la base main réelle et les changements concurrents.
2. Vérifier la CI de ce SHA : build, `npm test`, Firestore/Auth/Storage Emulator avec Node 22 et Java 21. Vérifier l'absence de job ou déclenchement de déploiement. Ne pas modifier `.github/deploy-request.json`.
3. Identifier un environnement de test séparé, sa configuration, son stockage et ses comptes fictifs propriétaire/MJ/accueil/joueurs. Tester les identifiants de projet réellement utilisés avant toute écriture ; refuser les identifiants de production. Les émulateurs `demo-gn-engine` suffisent aux tests automatiques, pas à l'homologation des appareils et du terrain.
4. Préparer la recette REC-SO-01 à 24, REC-SO-FOR-01 à 06, REC-SO-REC-01 à 05 et SEC-SO-01 à 10 ; utiliser les barèmes FINAL, comptes PNJ/assureur réellement provisionnés, stocks et lots fictifs identifiés. Fixer les seuils de performance avant la mesure à environ 60 utilisateurs ; ne pas assimiler une fixture de 60 fiches à une charge de 60 utilisateurs.
5. Jouer les cas sur Android/iOS, plusieurs rôles, coupure/reprise réseau, double clic et concurrence. L'organisation valide séparément armes, protections, sorties sûres et scénographie. Tout blocage de sécurité, perte/duplication ou résultat inconnu suspend la validation.

## 2. Sauvegarde préalable à une future migration

L'export catalogue XLSX et l'archive `.gnscenario.zip` ne couvrent pas une session vivante. Une sauvegarde complète doit être définie et restaurée en test avant toute demande de déploiement avec migration.

| Ensemble à inventorier | Exigence de sauvegarde / vérification |
|---|---|
| Scénarios, versions, campagnes, sessions et sous-collections | Export cohérent des documents, identifiants et relations, comprenant profils, santé, PA, horloges, clôtures et constructions d'épisodes en cours |
| Comptes, ledger, opérations/idempotence, contrats, réservations et stocks | Même point de cohérence ; total par compte, réservé/disponible, nombre/quantité de lots, propriétaires et liens aux opérations |
| Navires, trajets, états terrain et futurs combats/assurances | Temps restant, tirages, ordres, usages, sinistres et réserves associés ; aucun effet rejoué à la restauration |
| Authentification et attributions | Plan distinct de conservation/restauration des UID et des liens, sans exposer de secrets dans Git ; éviter restauration partielle incompatible avec les sessions |
| Storage et médias | Objets et métadonnées, empreintes, références et autorisations associées ; vérifier objets manquants et références privées |
| Configuration et code | SHA, lockfile, versions outils, règles/index/configuration existants, inventaire des secrets et droits sans valeur secrète dans le rapport |

Après autorisation dédiée d'accès à la cible réelle : définir la fenêtre cohérente de sauvegarde et la suspension des mutations, le responsable, la destination protégée, la rétention et les restrictions d'accès. Relever date, projet, volumes, inventaire et empreintes. Vérifier le statut de chaque export. Aucune commande de production n'est exécutée dans le cadre de cette préparation.

## 3. Répéter la reprise en environnement isolé

1. Restaurer une copie autorisée dans une cible isolée ; utiliser des données fictives pour les essais actuels. Toute utilisation de données réelles exige un traitement approprié et ne doit pas être copiée dans les fixtures Git.
2. Vérifier les comptes Auth/UID et relations de médias sans élargir les droits. Contrôler les totaux des comptes, crédits réservés, lots et propriétés avant/après ; aucune création de monnaie ou d'objet.
3. Exécuter une migration versionnée en aperçu, l'appliquer sur la copie, interrompre/reprendre à une frontière prévue, puis répéter. Exiger l'idempotence et une trace de chaque décision ; ne pas réécrire les versions historiques.
4. Tester spécialement la reprise des voyages/contrats/réserves, les horloges et expirations A38, la mort stabilisée et les demandes en attente. Une sauvegarde Firestore sans Auth/Storage cohérents n'est pas déclarée restaurable.
5. Consigner commandes exactes, durées mesurées, volumes, erreurs et preuve de restauration. Les objectifs de perte de données et délai de reprise restent à fixer ; aucune durée n'est promise ici.

SO-06a n'a aucune migration : le retour arrière du code d'export suffit pour cette tranche. Les futures migrations économiques ou de campagne nécessiteront leur propre procédure ; restaurer une sauvegarde après reprise des transactions peut perdre des opérations nouvelles. Prévoir une compensation auditée ou une reprise contrôlée, jamais une restauration aveugle en activité.

## 4. Dossier à soumettre avant publication

- SHA exact et diff final, version du profil, CI complète de ce SHA et registre des 24 recettes + 6 FOR + 5 Recettes & Potions et 10 essais avec preuves ; anomalies résiduelles et acceptation motivée des seules limites non bloquantes.
- Cible exacte, services affectés et migrations, preuve de sauvegarde/restauration, fenêtre, responsable et possibilité de retour arrière.
- Plan de déploiement détaillé adapté aux workflows réels de ce jour, contrôles après publication et conditions d'arrêt. Le présent document ne vaut pas demande d'exécution implicite.
- Autorisation explicite du propriétaire pour la mise en production et pour les éventuelles opérations de configuration distinctes. Sans cet accord, conserver branche/PR et ne déclencher aucun workflow de déploiement.

## 5. Ordre proposé après autorisation future seulement

Reconfirmer les prérequis et le SHA approuvé → sauvegarde cohérente vérifiée → suspension des mutations si nécessaire → migrations approuvées et journalisées → déploiement du seul candidat approuvé selon le mécanisme alors autorisé → contrôles de version, accès privé, QR, transactions, comptes/stock, médias et reprise → décision de réouverture.

Arrêter si cible/SHA inattendu, backup incomplet, test bloquant, dérive de droits, divergence de compte/lot, duplication, rupture d'accès privé ou migration non idempotente. Conserver les preuves, empêcher les nouvelles mutations selon la procédure approuvée et choisir le retour arrière adapté au code **et** aux données. Ne pas improviser de changement IAM/DNS pour débloquer un incident.

**État actuel :** sauvegarde de production non réalisée ; restauration non exécutée ; recette terrain non passée ; procédure de déploiement non validée et non lancée.

## Complément V3.2 / SO-06b

Inclure `recipes`, ses historiques et reçus Master dans toute sauvegarde future, ainsi que les objets, compétences, connaissances et lieux référencés. Les archives scénario de ce candidat incluent ces définitions, mais restent distinctes d’une sauvegarde de session vivante. Aucun stock de potions n’est créé dans SO-06b. Les futures doses devront conserver version de recette, origine des composants et opération idempotente.

Aucune migration des anciens documents n’est requise. Un ancien code ignorant `recipes` ne doit pas servir à exporter ou copier une campagne qui en contient : il omettrait cette collection. Un retour arrière devra préserver les nouvelles données et empêcher ces opérations, ou utiliser un correctif compatible. Ne pas effacer les brouillons pour revenir à un ancien code. Les contrôles automatisés d’archive/campagne de SO-06b ne remplacent pas une restauration complète Auth/Firestore/Storage en environnement isolé.

Avant de rendre les recettes jouables, exécuter les cinq REC-SO-REC avec une publication valide comme témoin, ainsi que refus de droits, double clic, interruption avant/après commit et reprise réseau. Tester l’activation volontaire sur mobile et l’absence totale d’effet depuis un compte tiers. Préparer ces essais ne vaut pas autorisation de provisionner ou publier en production.

## Complément V3.4 — conception à valider avant migration

Le [plan central SO-00](SO-00-V34-PLAN-CENTRAL.md) est soumis à validation explicite conformément à la demande utilisateur. Aucune adoption de campagne ni conversion de données n’a été exécutée. Les sept ateliers importent dans un brouillon commun ; la future publication active une version complète par pointeur après contrôle global. Les sessions restent épinglées à leur configuration, et le jeu déjà effectué n’est jamais restauré par un rollback de configuration.

Inclure les futurs en-têtes/pointeurs, révisions, brouillons, changements, imports et provenance, manifestes, graphes de dépendances, publications en cours, pages et reçus idempotents dans le plan de sauvegarde. Les permissions de campagne sont distinctes des droits de session : aucune attribution héritée implicitement lors d’une adoption/restauration.

Tester REC-SO-MST-01 à 10, en plus des 24 SO, six FOR, cinq REC et dix SEC. Le test crucial doit refuser globalement une recette référençant un ingrédient absent, puis activer M1/M4/M5 en une version après correction. Tester M3 seul, deux MJ publiant sur une base obsolète, une coupure entre préparation et bascule et un rollback conservant achats/XP/stock/contrats.

La sonde SO-00 a seulement exécuté l’archive existante sans images vers un nouveau scénario et vérifié les comptes/stock de la session source inchangés. Elle ne démontre pas la restauration complète de Firebase ni un retour de pointeur V3.4, qui n’existe pas encore. Aucune sauvegarde de production effectuée. Une autorisation de ce plan ne permet ni migration d’une session active ni déploiement ; la procédure de production reste à faire approuver séparément.

## Complément V3.5 — admissions, naissances et groupes

[Diagnostic et dépendances](SO-00-V35-INSCRIPTIONS.md). Le registre comporte désormais **55 cas ciblés** (24 SO, 6 FOR, 5 REC, 10 MST, 10 INS) et 10 SEC transversaux. Aucun résultat de recette Android/iOS ou de restauration complète n’est affirmé.

Inclure dans les sauvegardes futures : propositions et historiques privés, invitations par but et reçus de consommation (jamais jetons en clair), quotas et clés d’identité fictive, progression participant/XP, réserves déjà incarnées, naissances et reçus de dotation, mandats et contre-opérations de groupe. Les liens UID restent cohérents avec Auth ; ni données civiles ni préférences d’amis dans les exports publics/M2.

Réessayer une naissance après restauration ne doit créer aucun kit, crédit protégé ou PA supplémentaire ; rejouer une vieille permission ne doit pas restaurer un mandat retiré. Tester réserve et création à chaud, deux décès dans une session, quota concurrent et transfert de groupe pendant une dépense. Les contre-opérations de groupe corrigent l’appartenance sans annuler les transactions passées ou transférer les actifs de la caisse. La restauration d’un Master n’est pas le retour arrière du jeu vécu.

Cette tranche ne change que documentation et tests : aucun retour arrière de données nécessaire, aucun revert exécuté. Une future adoption de campagne reste soumise au plan de migration validé et à la preuve de restauration isolée. Le déploiement reste **À FAIRE VALIDER, NON LANCÉ**.


## C1a — contexte neuf et retour logiciel

[Guide C1a](SO-01-C1A-PREPARATION.md). Les nouvelles préparations conservent une identité campagne/session, une empreinte d’intention, des révisions, reçus d’opérations et grants de session. Inclure ces éléments et leurs journaux dans la sauvegarde cohérente avec Auth. Ne jamais supprimer les reçus puis rejouer une création.

Un ancien binaire ignorant `preparationKind` ne protège pas ces contextes. Dès qu’ils existent, un rollback exige suspension des écritures et conservation d’une garde compatible, ou restauration cohérente explicitement approuvée ; un simple revert n’est pas présenté comme sûr. Les tests simulent seulement une exception avant commit puis un réessai. Sauvegarde/restauration intégrale et rollback logiciel réels : NON EXÉCUTÉS. Aucun environnement de production n’est modifié.

## Complément I1 — aucune opération de production exécutée

Conserver avec C1a le brouillon initial et ses changements/historiques, les paramètres d’admission, registrations/historiques, invitations/usages, grants, audit et reçus operations. Ne jamais restaurer isolément les compteurs de liens ou supprimer les reçus pour rejouer une création. Le test d’exception avant commit démontre l’atomicité, pas une restauration complète. Retour à un ancien binaire ignorant C1a/I1 interdit comme procédure implicite ; geler les écritures puis conserver une garde compatible ou faire valider une restauration cohérente. [Détails et limites I1](SO-01-I1-ADMISSIONS.md).
