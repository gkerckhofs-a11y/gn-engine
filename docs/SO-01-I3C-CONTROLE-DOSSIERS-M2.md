# I3c — contrôle courant de l’ensemble des dossiers M2

## Parcours et portée

Dans la régie des candidatures, **Contrôler les dossiers M2** relit les dossiers, leurs définitions M2 et les places confirmées dans un même instantané transactionnel. Le MJ obtient les écarts localisés, les compteurs constatés et les décisions à reprendre. **Relancer le contrôle** calcule un nouveau rapport ; aucune correction, copie, archive, approbation ou dotation n’est déclenchée.

Cette tranche prépare le raccordement à la publication et à la naissance. Elle ne livre ni la publication globale C2 ni I4. `NO_DETECTED_ERROR` signifie seulement qu’aucune incohérence couverte n’a été détectée ; `publicationAvailable=false` et `birthAvailable=false` restent explicites. Les futurs actes devront réexécuter leurs validations dans leur propre transaction, avec leurs droits et leur version cible. Un rapport antérieur ne sert jamais de confirmation.

## Résultats

| Situation courante | Résultat |
|---|---|
| Dossier approuvé, fiche native active, identité et choix conformes | `MATCHED` |
| Dossier approuvé sans première préparation M2 | Diagnostic de préparation manquante |
| Nom fictif, nature, classe, espèce ou initiation divergent | Liste exacte des champs à rapprocher par I3b |
| Biographie M2 retravaillée | Avertissement non bloquant ; conservation autorisée par I3b |
| Dossier non approuvé avec fiche non archivée | Décision MJ requise, sans retrait automatique de la fiction |
| Dossier non approuvé avec fiche archivée | `EXCLUDED`, archive conservée |
| Dossier non approuvé sans lien M2 | `NOT_REQUIRED` ; attente et brouillons ne réservent aucune place |
| Dossier approuvé avec fiche archivée | Diagnostic, sans restauration automatique |
| Fiche issue d’admission sans lien privé valide | Diagnostic d’orphelin, même si archivée ; aucun nouveau lien deviné |
| Fiche M2 indépendante | Pas de statut joueur/PNJ/réserve déduit ; validation native seulement |

L’approbation, le consentement, les espèces/choix disponibles, la nature, l’initiation et le verrou d’identité sont revérifiés par `approvedAdmissionM2`, utilisé dans I3a/I3b. Fermer les candidatures ou révoquer le lien d’entrée ne retire pas une approbation. Une biographie différente n’exige pas de remplacer la rédaction MJ.

Les confirmations approuvées sont recomptées par classe et comparées aux compteurs I2 et à `session.accepted`. Les verrous actifs supplémentaires, en double ou sans confirmation sont signalés ; les verrous historiques inactifs ne comptent pas. Le verrou correspondant à chaque identité approuvée est aussi relu à sa clé exacte. Les exceptions explicites I2 restent admises avec motif et métadonnées valides ; les confirmations ordinaires ne peuvent expliquer un dépassement de capacité ou quota.

Les formes privées I3a/I3b, révisions, liens déterministes et définitions/provenances natives M2 sont vérifiés. Les lectures ponctuelles confirment l’emplacement attendu des dossiers et des fiches liées. Une incohérence n’entraîne aucun recalcul persistant ou réparation implicite. Si l’en-tête de compteurs est déjà invalide, la garde I2 refuse la lecture avant le rapport.

## Droits et confidentialité

La lecture exige **MJ de session + lecture M2**, ou propriétaire habilité. L’édition M2 n’est pas nécessaire pour lire ce rapport. Préparer ou rapprocher une fiche continue à exiger l’édition M2 indépendamment. MJ seul, lecture M2 seule, accueil, joueur et délégation de contrôle central seule sont insuffisants. Une révocation est relue à chaque appel et nouvelle tentative transactionnelle.

Le rapport reste dans la régie privée ; il n’est pas ajouté au contrôle central C2b accessible à un délégataire sans droit aux admissions. Les autres ateliers ne sont pas interrogés. Les données de compte, UID, email, souhaits d’amis, récits, secrets, motifs de décision, invitations et empreintes de consentement ne sont pas renvoyés. Les noms fictifs, IDs privés de dossiers, IDs M2, codes de diagnostic et révisions suffisent à localiser les vérifications. Le HTML échappe les contenus affichés.

## Contrat et cohérence

`checkAdmissionM2({sessionId})` est une lecture authentifiée, limitée au cycle initial C1a/C1b sans base publiée. Aucun UID cible, changement, ID de commande, empreinte de confirmation ou version fournie par le client n’est accepté. Réutiliser le même appel lit l’état courant, sans reçu mémorisé.

Le rapport porte `schemaVersion:1`, `scope:ADMISSION_M2_PREPARATION`, l’heure serveur, les révisions session/politique/brouillon/compteurs, une empreinte des sources et de l’autorité, les totaux, la ventilation par classe, les lignes et diagnostics. L’empreinte est déterministe à données et autorité identiques, indépendante de l’heure du contrôle. Les données restent dans les collections existantes ; aucune nouvelle collection ni révision persistante n’est créée.

Les requêtes et validations sont dans une seule transaction Firestore. En concurrence avec une décision, une retouche M2 ou une révocation, le contrôle peut précéder ou suivre l’opération ; il ne doit pas mélanger les états. Un rapport obtenu juste avant un changement demeure un constat passé. La prochaine lecture voit l’état actuel ou refuse l’accès révoqué.

Bornes techniques du rapport : **1 000 dossiers, 1 000 verrous actifs, 100 fiches M2 archives comprises, 16 Mio de sources et 4 Mio de rapport**. Le catalogue partagé M2 est ajouté aux fiches. Requête avec une ligne supplémentaire pour détecter le dépassement ; refus intégral `ADMISSION_M2_CHECK_LIMIT`, jamais un résultat partiel annoncé complet. Ce sont des budgets de lecture de cette tranche, pas de nouvelles règles de participation. Une extension paginée cohérente sera nécessaire au-delà. Les bornes natives M2 et les bornes centrales 1659/16 Mio/4 Mio restent inchangées.

## Compatibilité et suite

Extension de lecture seule, sans schéma persistant nouveau. L’empreinte du contrôle central reste 12 ; les sept ateliers restent `PARTIAL`. Aucun import historique, Master CAMPAGNE/SESSION ou gabarit V0.1 modifié ; quatre SHA-256 historiques vérifiés identiques. Aucune migration/adoption, modification de droits Firebase/IAM/règles/index ou production.

Le retour à I3b retire ce rapport sans convertir les données. Il ne faut pas interpréter ce retour comme une validation globale : les limites précédentes demeurent. Sauvegarder les mêmes dossiers, liens, brouillon, droits, compteurs/verrous, historiques et reçus cohérents ; l’export M2 ciblé reste insuffisant pour une restauration complète.

Suite : intégrer ces contrôles à l’acte de publication avec une autorité explicite respectant la confidentialité ; terminer les références/règles non raccordées et le cycle de version immuable, puis la naissance idempotente et ses protections économiques. Les réserves, incarnations, ressources, groupes, mandats et QR ne sont pas activés par ce rapport. INS-06/I3 complet, C2 complet, I4/I5, les 55 verdicts intégraux et SO-GAP-12/13/14 restent ouverts.

## Validation et preuves

Le 25 octobre 2026 (Europe/Brussels), compilation et **1374/1374 tests applicatifs locaux réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. **23 nouveaux cas métier partagés mémoire/Firestore, quatre UI et un HTTP/Auth**. Une première fixture d’exception a été corrigée pour utiliser une capacité valide avec deux participants et une vraie approbation exceptionnelle ; aucune règle métier n’a été assouplie.

Les tests couvrent lecture sans écriture, confidentialité, permissions indépendantes, révocation, concordance, divergence et retrait, exceptions, corruption et orphelins, limites, ainsi que les courses avec classe, M2, retrait et révocation. UI : HTML, contenu échappé, point d’entrée, payload et retour de navigation. HTTP/Auth : comptes distincts, lecture M2 sans édition, accès refusés, première préparation, retrait, confidentialité et révocation.

Firebase non exécuté localement (Java 17.0.20) ; intégrations vérifiées syntaxiquement. Les résultats définitifs push/PR sur le candidat exact seront consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), après terminaison, sans commit supplémentaire de preuve. Workflow inchangé : Node 22/Java 21, projet d’émulation `demo-gn-engine`, plafond 50 minutes, aucun déploiement.

Base I3b `8dcd82bf423e1d913d338b2a8c969b3799dddf4f` revérifiée : push `40170996987`, PR `40171000352`, tous deux réussis, **1347 applicatifs + 1083 Firebase/HTTP chacun**. [Description finale archivée](PR-1-HISTORIQUE-AVANT-I3C.md). Aucune recette navigateur visuelle, Android/iOS, charge, terrain ou restauration globale revendiquée.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.4, 3.6, 4.7–4.10, 8.4 : séparation des états, contrôles serveur et quotas, publication avant première session.
- [Livre V0.7](source/SO_Regles_V07.txt), chapitre 3 et A08–A10 : choix de création canoniques conservés, aucune nouvelle règle d’incarnation.
- [Sept gabarits V0.1, M2](SO-00-V34-GABARITS.md) et [vade-mecum](source/SO_Vademecum_V01.txt) : préparation, contrôle global puis publication.
- [I2](SO-01-I2-DECISIONS.md), [I3a](SO-01-I3A-ADMISSION-VERS-M2.md), [I3b](SO-01-I3B-RAPPROCHEMENT-M2.md), [C2b](SO-02-C2B-DELEGATION-CONTROLE.md) : autorisations distinctes, exceptions et sémantique historique des reçus.
