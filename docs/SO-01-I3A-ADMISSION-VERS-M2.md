# I3a — candidature approuvée vers une fiche M2 privée

## Parcours livré

Depuis les inscriptions, un organisateur habilité ouvre **Préparer dans M2**, relit la fiction proposée, saisit un motif et confirme. Le serveur crée une seule définition narrative dans le brouillon initial commun et conserve son lien dans le dossier privé. L’aperçu ne modifie rien. L’approbation I2 ne déclenche pas automatiquement cette préparation.

I3a livre uniquement cette première copie. **I3 complet et INS-06 ne sont pas terminés** : contrôle global complet, publication immuable, rapprochement courant admission/définition et naissance I4 restent nécessaires. Aucune incarnation, attribution, compétence active, PV, PA, kit, crédit, groupe, QR ou version publiée n’est créé. Aucun seed historique n’est appelé.

## Données et identité

| Proposition approuvée | Définition native M2 |
|---|---|
| Prénom + espace + nom fictifs | `public.displayName`, maximum 150 caractères |
| Nature de l’espèce choisie | `nature`, `HUMANOID` ou `DROID` |
| Histoire proposée | `biography`, privée dans M2 |
| Classe, espèce et initiation hors classe | `creationPlan` C2c, profil V0.7 |
| Coordonnées du compte, amis souhaités, décisions, consentement, invitation | Restent dans l’inscription privée, aucune copie automatique dans M2 |

Profession, description publique, conseils de jeu, secrets et notes MJ commencent vides ; objectifs et relations sont vides. Le validateur natif `centralCharacterInput` est réutilisé. Le plan de création demeure préparatoire, sans `abilityProfile` actif. Les noms dépassant 150 caractères réunis sont refusés sans troncature : correction du dossier et nouvelle approbation nécessaires. L’identité prénom/nom séparée pour les actions jouées n’est pas ajoutée par cette tranche.

L’ID est `admission_` suivi du SHA-256 du tableau JSON `[campaignId, sessionId, registration.id]`. Il est stable pour ce dossier/session, opaque et distinct des autres contextes. Une collision avec une définition sans lien vérifié est bloquée. Aucun rattachement arbitraire à un personnage existant ni création de successeur n’est proposé.

Le lien `admission.m2Preparation`, schéma 1, contient ID M2, révision source, révisions d’admission/brouillon/définition initiales, auteur, date et reçu de commande. Il reste dans `sessions/{sid}/registrations/{hash(uid)}` et son historique privé. Le `characterId` racine reste nul, l’accès inactif et le statut racine `RECEIVED`. La projection joueur et son historique ne reçoivent pas ces métadonnées internes.

La définition porte seulement la provenance centrale `source=ADMISSION`, `{schemaVersion:1, kind:APPROVED_SNAPSHOT}`, l’auteur de préparation, la date et le reçu. Ni UID du candidat, ni email, ni lien d’invitation ne sont ajoutés au catalogue ou à l’export M2. Les champs libres restent du texte : l’organisateur doit relire la fiction avant sa copie. Une note saisie volontairement dans M2 n’est pas un mécanisme de copie des données civiles.

## Droits, réessais et concurrence

Les deux autorisations sont indépendantes : rôle propriétaire/MJ habilité aux admissions de la session **et** lecture/édition M2 de la campagne, ou propriétaire de celle-ci. Un MJ seul, un éditeur M2 seul, l’accueil, un joueur et une simple lecture M2 ne peuvent pas préparer. L’autorité centrale partagée et le cycle initial vide sont contrôlés avant chaque aperçu, nouvelle commande et reçu déjà enregistré.

Avant la première copie, le serveur relit statut approuvé, consentement actuel, choix autorisés, nature/initiation, confirmation I2, verrou d’identité et cohérence des compteurs. Il ne consomme pas une seconde place. Révocation/expiration du lien d’invitation et fermeture des nouvelles candidatures ne révoquent pas une approbation déjà accordée. Le retrait est une action distincte.

L’empreinte de confirmation lie auteur, campagne/session, brouillon, politique, droits courants, dossier complet et copie native. Une modification concurrente exige un nouvel aperçu. Une transaction écrit définition, révision commune, historique central, lien et historique privés, audit et reçu. La révision d’admission et celle du brouillon augmentent chacune d’un ; les compteurs de places restent identiques.

Même reçu = même résultat, après contrôle d’autorité/cycle ; réutiliser son ID avec un autre contenu est refusé. Un autre ID de commande sur un dossier déjà préparé retrouve aussi le résultat historique. Deux organisateurs concurrents convergent vers une seule définition. Les éditions web/XLSX et archives M2 ultérieures ne sont jamais écrasées ou restaurées par ce parcours. Un lien incohérent bloque une nouvelle préparation, sans duplication ni réparation implicite.

## Évolution du dossier et limites

Un retrait, une correction ou un changement de classe après préparation conserve la fiche M2 : elle peut avoir reçu du travail narratif autonome. La régie signale le changement de révision et le statut actuellement non approuvé. La consultation indique également si M2 a été archivée. Aucun réessai ne réattribue de place ni ne remet une ancienne proposition dans M2.

**Le rapprochement courant entre admission et définition reste à développer avant publication/activation.** Les indicateurs sont un avertissement préparatoire, pas une validation de cohérence ; ils ne certifient pas les modifications manuelles M2, les politiques actuelles ni un successeur. Une future naissance doit revérifier les deux côtés, les quotas, la version publiée et l’absence d’incarnation antérieure. Aucun chemin de publication/naissance centrale n’est ouvert ici.

La limite M2 reste 100 fiches, archives comprises. Le contrôle global accepte la provenance ADMISSION stricte et garde `publicationAvailable=false`, sept ateliers `PARTIAL` et budgets 1659 changements / 16 Mio / 4 Mio. Empreinte interne **11** : relancer le contrôle. Le rapport ne lit pas les dossiers d’admission et ne certifie pas leur lien courant.

Les anciens dossiers sans `m2Preparation` et les quatre Masters historiques sont conservés. Pas de migration, nouveau catalogue, adoption ou changement de règles/index Firebase. Sauvegarder ensemble brouillon, inscriptions privées, confirmations/verrous/compteurs, délégations, historiques et reçus ; l’export ciblé M2 ne sauvegarde pas cet ensemble. C2m ne contrôle pas cette provenance et ne doit pas être considéré comme un retour fonctionnel équivalent. Ne pas effacer les liens pour permettre un retour logiciel ; restauration complète à tester séparément.

## Validation et traçabilité

Le 25 octobre 2026 (Europe/Brussels), `npm run build` et **1319/1319 tests applicatifs** réussis, zéro échec/annulé/ignoré/todo ; Node 24.22.1, npm 11.9.0. **22 cas métier partagés mémoire/Firestore, cinq UI et un parcours HTTP/Auth** ajoutés. Les tests couvrent confidentialité et export XLSX réel, révisions, idempotence interorganisateurs, révocation, concurrence retrait/préparation, retrait/changement de classe après copie, archives, corruption, limite, injections et interruption transactionnelle.

UI vérifiée par HTML/formulaires/payloads ; aucune recette visuelle navigateur, mobile, terrain, charge pilote ni restauration globale revendiquée. Syntaxe des deux intégrations vérifiée. Firebase non exécuté localement (Java 17.0.20) ; exécution sous Node 22/Java 21 attendue des deux CI du candidat. Les résultats définitifs, SHA exacts et journaux sont consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison, sans nouveau commit de preuve.

Base C2m `6052b7ab38c3bd56b61beb803144080951ea0434` revérifiée : push `40162676521` et PR `40162679336` réussis, **1292 applicatifs + 1036 Firebase/HTTP chacun**, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3A.md). Les quatre SHA-256 des Masters CAMPAGNE/SESSION ont été comparés et sont inchangés.

INS-06, MST-01/03/06/08 reçoivent des preuves préparatoires partielles ; les **55 verdicts complets** et SO-GAP-12/13/14 restent inchangés. Suite : cohérence admission/M2 et publication globale C2, puis naissance protégée I4 et relève I5. Aucun merge, déploiement ou changement Firebase de production.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.4, 3.6, 4.8–4.9, 8.4 et INS-06.
- [Plan inscriptions](SO-00-V35-INSCRIPTIONS.md), §§4.1–4.3 : séparation candidature/définition/incarnation.
- [Livre V0.7](source/SO_Regles_V07.txt), chapitre 3 et arbitrages A08–A10 ; aucune règle de dotation activée ici.
- [Gabarits V0.1](SO-00-V34-GABARITS.md), M2, et [vade-mecum](source/SO_Vademecum_V01.txt).
- [Décisions I2](SO-01-I2-DECISIONS.md), [définitions M2 C1e](SO-01-C1E-PERSONNAGES.md), [plans C2c](SO-02-C2C-PROFILS-INITIAUX.md).

