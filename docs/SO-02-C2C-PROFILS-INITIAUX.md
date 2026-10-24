# C2c — Plans de création joueurs dans M2

24 octobre 2026. Candidat 0.37.0, branche de livraison `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Préparer un socle initial privé dans le brouillon central ; aucune incarnation, publication ou migration.

## Sources et base

Sources fournies par l'organisateur : [CDC V3.5 du 23 octobre 2026](source/SO_CDC_V35.md), §§3.6, 4.7–4.9 et annexe A ; [livre canonique V0.7](source/SO_Regles_V07.txt), chapitre 3 et fiches des huit classes ; [vade-mecum V0.1](source/SO_Vademecum_V01.txt), préparation M2 et distinction définitions/instances ; [plan central §5](SO-00-V34-PLAN-CENTRAL.md), validation structurelle puis globale ; [gabarits rapprochés](SO-00-V34-GABARITS.md), toujours non certifiés. Aucun arbitrage A01–A38/FOR-01 rouvert.

CDC : SHA-256 `531ed5dba4c3c3970c5500db25cfc07df8dc434408a62b82783c0b2512be92d4`, copie vérifiée identique au dernier fichier V3.5 retrouvé lors de C2b. Transcription V0.7 relue pour ce périmètre : `5ea1598760b98416db500642bb13d0a634a72787f034ddc55defd1ee4029abf6`. Vade-mecum : `dbf31157b44a962ed98879b1084c03c71b043bc8cff1443accbe2e77e16c48f3`.

Base C2b distante `dcf9bebb31db2d76d4d70c342f21341cd5538b7e`, locale `fe4140a699484f71a5ec52a2bbc254d80e5d6570`, arbre identique `0ec4a725489a6714192063fececce41e87db5f41`. Main `03eaace155b052d1b7d1960347746e9ee60ed514`, PR ouverte en brouillon. Les deux CI de cette base sont réussies : [push 40087456503](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40087456503), job 120853198706 ; [PR 40087460591](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40087460591), job 120853210104 ; chacune build + 1002 tests applicatifs + 790 Firebase, aucun échec/annulé/ignoré/todo. [Description C2b archivée](PR-1-HISTORIQUE-AVANT-C2C.md).

## Parcours livré

Dans une fiche M2, un éditeur habilité choisit « Préparer un profil joueur initial », une des huit classes, un ID d'espèce narrative et une initiation d'une autre classe. L'aperçu montre les trois compétences principales et la seule initiation ; niveaux et acquisitions fixes sont dérivés des règles, jamais saisis librement. Changer de classe retire une initiation devenue incompatible, sans en choisir une autre automatiquement. Le mode « Fiche narrative seule » retire explicitement le plan à l'enregistrement, avec motif et historique ; les textes de fiction restent conservés.

| Classe | Compétences principales prévues | Initiation proposée aux autres classes |
|---|---|---|
| Combattant | COM-01 et COM-02 fixes ; COM-03 N2 | COM-03 N1 |
| Rogue | ROG-01 fixe ; ROG-02 et ROG-03 N2 | ROG-03 N1 |
| Traqueur | TRA-01/02/03 N2 | TRA-01 N1 |
| Médecin | MED-01/02/03 N2 | MED-02 N1 |
| Mécano | MEC-01/02/03 N2 | MEC-02 N1 |
| Pilote | PIL-01/02/03 N2 | PIL-01 N1 |
| Courtier | COU-01/02/03 N2 | COU-01 N1 |
| Infiltrateur | INF-01/02/03 N2 | INF-02 N1 |

Sources : V0.7 chapitre 3 et fiches COM/ROG pour les traits fixes. 8 classes × 7 initiations hors classe = **56 combinaisons** ; les deux natures restent possibles. L'initiation occupe une des cinq places secondaires, sans attribuer les autres compétences de sa classe. Ce lot ne fournit ni effets exécutables, ni achats XP, ni niveaux libres, ni compétences rares, ni profil Force/PNJ. Un trait fixe apparaît comme acquis prévu, avec niveau null ; ce n'est pas un niveau de compétence historique.

## Contrat et contrôle

`saveCentralCharacter` accepte le champ optionnel `character.creationPlan` : null pour retirer, sinon `{classId, speciesId, secondaryId}`. Le serveur conserve uniquement ces choix et ajoute `schemaVersion:1`, `ruleProfile:'SPACE_OUTLAWS_V07'`, marqueur interne déjà utilisé par C1a/I1. Les classes et initiations réutilisent la liste `admissionClasses` ; les 24 codes et leurs niveaux initiaux sont une référence canonique en code, sans deuxième catalogue Firestore. Aucun code V0.7 n'est supposé correspondre à un ID de classe/compétence historique.

Le champ est porté par le même changement `character_{id}`, sa `contentRevision`, la révision du brouillon, la provenance WEB et l'audit C1e. Les anciennes fiches sans plan gardent leur forme ; l'omission du champ par un ancien client conserve le plan existant. Une suppression exige null et les révisions attendues. Archive/restauration préserve le plan et n'active rien ; un ancien reçu ne restaure pas une définition archivée.

Les classes inconnues, Force, initiation de la classe principale, compétences non proposées et champs étrangers (niveaux, XP, ressources, schéma client) sont rejetés sans écriture. Un ID d'espèce structurellement valide peut être préparé avant sa cible, conformément au brouillon central : diagnostic `REFERENCE_MISSING` localisé et arête M2 `species` manquante. Dès que le catalogue partagé est complété, le diagnostic disparaît sans réécrire la fiche. Une nature incompatible produit `SPECIES_NATURE_MISMATCH` ; une cible présente ne suffit donc pas à certifier sa cohérence.

Le flag d'espèce `available` reste le choix proposé aux **nouvelles candidatures**, pas un archivage de définition M2. Une espèce configurée mais non proposée reste référencée, signalée comme telle dans le sélecteur. Aucune espèce n'est copiée, créée par son nom, ni dotée de bonus. Les quotas d'admission ne sont ni lus ni modifiés : préparer une fiche ne confirme pas une place. I3/I4 doivent relier les dossiers approuvés et revalider les quotas avant l'affectation.

Le contrôle commun C2a/C2b vérifie la forme stockée et ses marqueurs, ajoute les références d'espèce, distingue un catalogue incohérent d'une cible absente et inclut le plan dans l'empreinte et la liste des champs privés. Le résumé ne recopie pas le plan complet ni les textes narratifs privés. Les choix valides ne certifient pas les effets de compétences. Une fiche narrative sans plan reste possible (y compris pour la fiction PNJ) et ne devient pas automatiquement un joueur conforme.

## Autorité, compatibilité et reprise

Les droits M2 et la révocation avant reçu restent ceux de C1e ; aucun rôle de session, accès aux candidatures, compte ou droit de publication ajouté. La lecture et le contrôle utilisent uniquement le brouillon de la campagne courante ; un catalogue d'une autre campagne ou une instance historique ne résout pas un lien. Le plan ne crée aucun `abilityProfile` actif, PV, PA, XP, stock, crédit, QR ou notification. Le moteur de compétences historique et les quatre Masters restent inchangés.

Préserver `creationPlan` avec changements, révisions, historiques et reçus C1b/C1e. Les exports centraux M1/M4 et les quatre Masters historiques ne sauvegardent pas cette extension M2. Un lecteur C2b ne sait pas afficher ni valider ces plans et les signale comme définitions inconnues au contrôle commun ; ne pas l'utiliser comme retour fonctionnel équivalent. Aucune restauration complète, adoption de campagne ou migration exécutée.

## Vérifications et reste à faire

Local : Node 24.22.1, npm 11.9.0, **1022 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo ; build, syntaxe HTTP/Firestore/application, diff et empreintes des quatre Masters vérifiés. Nouveaux tests : 15 cas métier partagés avec Firestore, un cas exhaustif des 56 combinaisons, quatre UI, un parcours HTTP/Auth ajouté. Concurrence d'édition et de catalogue, audit, ancien client, révocation, réessai, corruption, références différées et absence d'effets sont couverts. Aucun essai manuel sur appareils.

CI exacte du nouveau commit à constater puis documenter dans la PR après fin des deux runs ; les résultats C2b ci-dessus restent ceux de la base. Émulateurs non exécutés localement (Java 17 ; workflow Java 21). Les avertissements Node des dépendances Firebase et actions v4, déjà documentés en C2b, ne sont pas modifiés par ce lot.

REC-SO-01 et INS-06 reçoivent seulement des preuves partielles de préparation initiale. SO-GAP-12/13/14 restent ouverts. Aucun des 55 scénarios complets n'est certifié. À poursuivre : profils et effets exécutables, dotations M1, autres ateliers, validations complètes et publication immuable atomique, raccordement I3 des admissions, naissance protégée I4 et relève I5. `publicationAvailable=false` demeure ; aucun merge ni déploiement.
