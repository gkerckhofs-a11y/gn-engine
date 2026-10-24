# SO-01 I2 — décisions MJ et places confirmées

23 octobre 2026, branche `work/l1-modular-workshop`, package 0.37.0, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Références : [CDC V3.5 §§4.7–4.9](source/SO_CDC_V35.md), [ordre minimal validé pour le développement](SO-00-V35-INSCRIPTIONS.md). Base distante I1 : `5a921aec9afa686d76b98e4f89d8eb4ca2930a53`, arbre `a013fac678bb3418cbaf99764d07ca2adc628371`. Main vérifié `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), sans fusion.

I2 confirme une place dans une préparation neuve C1a. Il ne crée pas une définition de personnage M2 ni une incarnation. Aucun import, activation, dotation, publication globale ou migration historique n’est effectué. I1 et L1/L1b sont conservés.

## Matrice ciblée

| Exigence | Existant réutilisé | Adapté / nouveau I2 | Preuve et limite |
|---|---|---|---|
| File privée, filtres, décisions | Registrations I1, droits OWNER/MJ `content`, page de session | Statut/classe/espèce/nature/nom fictif/souhait d’amis ; aperçu et signalement de collisions | Tests des projections, rôles, échappement et filtres ; pas de navigation humaine sur appareil |
| Confirmation atomique | Compteur global `session.accepted`, transactions et reçus existants | Compteurs par classe, identité réservée, APPROVED ou WAITLISTED quand complet | 18 cas partagés mémoire/Firestore, dont deux MJ et dernière place globale/classe |
| Corrections et retrait | Un dossier par UID/session, historique de propositions | CORRECTION, REFUSED, WITHDRAWN et resoumission ; retrait du candidat même lien expiré/révoqué | Une place libérée une fois, ancien reçu sans reconfirmation ; promotion MJ explicite |
| Exception et changement de classe | Autorité MJ serveur et audit | Deux commandes de décision explicitement exceptionnelles ; transfert atomique entre compteurs | Motif obligatoire ; échec d’un changement complet conserve l’ancienne confirmation |
| Notification de statut | Vue privée du candidat authentifié | Message de décision dans le dossier, acquittement de lecture, historique projeté | Aucun email/push envoyé ; il faut ouvrir/actualiser son dossier |
| Consentement et unicité fictive | Consignes, notice et révisions I1 | Empreinte des informations acceptées, contrôle d’identité par session | Un ancien dossier sans empreinte demande un nouveau consentement, sans migration implicite |
| Préparer M2, publier, incarner | Brouillon initial des espèces I1, moteur historique conservé | Non développé dans I2 | I3 après C1/C2 puis I4 ; INS-06 non livré |

## Commandes et états

- `reviewAdmission` : OWNER/MJ ayant actuellement `content`, UID ciblé, révision du dossier et des paramètres/brouillon, décision et motif visibles au candidat. L’accueil n’a aucun accès à la file ou à l’approbation.
- `APPROVE` depuis SUBMITTED/WAITLISTED : revalide classe, espèce disponible, nature, initiation autorisée et consentement. Contrôle quota par classe et capacité globale. Si complet, passe en WAITLISTED sans réserver de place.
- `OVERRIDE_APPROVE` : exception choisie explicitement par le MJ, avec motif conservé dans confirmation, historique et audit. Peut dépasser un quota **positif** ou la capacité globale ; ne peut ouvrir un quota nul, une classe PNJ, une initiation interdite ou une espèce indisponible.
- `CHANGE_CLASS` / `OVERRIDE_CHANGE_CLASS` sur un dossier confirmé : nouvelle classe et initiation compatibles, ancien compteur décrémenté et nouveau incrémenté atomiquement. La proposition avant changement reste dans l’historique. Sans exception, classe complète = échec sans perte de confirmation. Aucune ressource de jeu ni compétence attribuée.
- `CORRECT`, `WAITLIST`, `REFUSE`, `WITHDRAW` retirent une éventuelle confirmation et sa réservation d’identité dans la même transaction. Un dossier WITHDRAWN doit être resoumis par son candidat avant une nouvelle décision. Aucun ordre de promotion automatique n’est inventé.
- `withdrawAdmission` : propriétaire du dossier, motif et révision courante ; autorisé après fermeture/expiration/révocation du lien. Une nouvelle soumission nécessite à nouveau un lien actif et l’ouverture des candidatures.
- `admissionHistory` : projection de ses propres versions pour le candidat ; détails opérateur seulement pour OWNER/MJ autorisé. `acknowledgeAdmissionDecision` marque uniquement la dernière décision comme lue, sans changer la révision de proposition.

Un dossier APPROVED est verrouillé à l’édition joueur. Le MJ peut changer sa classe ou demander une correction, qui libère la place. Pour corriger lui-même, le candidat peut retirer puis resoumettre. Son souhait d’amis ne produit aucun mandat de groupe.

## Transaction et stockage minimal

`session.accepted` reste l’unique total confirmé. `sessions/{sid}/admission/occupancy` contient seulement les huit sous-compteurs et une révision. Leur somme doit égaler le total ; une incohérence provoque un refus explicite, pas une réparation silencieuse. Toute confirmation/libération/changement de classe écrit ensemble :

1. registration existante (`admission.status`, confirmation, révision, décision) ;
2. total existant de session et révision, sous-compteurs de classe ;
3. réservation `admissionIdentities/{empreinte}` active/inactive ;
4. historique, audit et reçu de commande.

La registration racine reste `RECEIVED`, `characterId=null`, `accessActive=false`. La garde C1a autorise ces seules formes inertes, vérifie le couple session/compteurs et continue à refuser les seeds, imports et anciennes commandes d’affectation. Les lectures Firestore précèdent les écritures par le tampon transactionnel déjà existant.

Une réservation d’identité est un index technique, pas un personnage parallèle. L’empreinte porte sur la paire prénom/nom fictifs : normalisation Unicode, casse/accents, espaces, apostrophes et tirets usuels. Les libellés affichés restent inchangés. Un nom libéré peut être confirmé pour un autre dossier. Les homographes entre alphabets ne sont pas tous détectés : revue humaine du signalement nécessaire. Aucune comparaison avec l’état civil.

Deux approbations concurrentes relisent le même compteur. Le perdant repasse par la transaction et devient WAITLISTED, sans version hybride. Les changements de paramètres concurrents exigent une nouvelle lecture MJ. Une baisse de maximum sous les confirmations existantes est refusée ; un maximum déjà dépassé par exception peut rester inchangé lors d’une autre édition. Les révisions de session augmentent quand les compteurs changent : un formulaire joueur déjà ouvert peut demander une actualisation avant sauvegarde.

L’empreinte de consentement concerne les informations affichées (titre, résumé, date, heure, lieu, pratique, notice et consignes), pas le compteur. Une nouvelle confirmation ne peut pas recycler un consentement absent ou antérieur à une modification de ces informations. Les anciens dossiers I1 synthétiques doivent accepter à nouveau ces informations ; aucune réécriture en masse.

## Vérifications exécutées et prévues

Local : Node **24.19.0**, `npm test` **846 réussis**, zéro échec/annulé/ignoré/todo ; `npm run build` réussi. Journaux [tests](verification/so-i2-npm-test.log) et [build](verification/so-i2-build.log). 18 nouveaux cas métier dans `test/support/admission-reviews-suite.mjs`, exécutés en mémoire ; trois nouveaux cas UI plus adaptation du test MJ existant. Le même jeu de 18 cas est raccordé à Firestore ; un cas HTTP/Auth supplémentaire vérifie le handler exporté avec des comptes synthétiques distincts.

GitHub Actions de TEST sur le commit exact : résultats finaux, SHA, runs et jobs à constater dans [la PR](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison. Ne pas attribuer le succès d’I1 à I2. Le timeout du seul workflow TEST passe de 25 à 40 minutes : le run PR I1 avait duré 24 min 51 s. Aucun workflow de déploiement n’est modifié ni déclenché. Les émulateurs locaux ne sont pas exécutés (Java 17 local ; workflow Java 21). Aucun résultat Firebase I2 n’est présumé dans ce document avant sa CI.

Base I1 vérifiée : push [39974996974](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39974996974), job 120487154764, et PR [39975002847](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39975002847), job 120487173905 : chacun build, **825 applicatifs + 639 Firebase** réussis, zéro échec/annulé/ignoré/todo ; Node 22.23.3, Java 21.0.12+1. Commit push `5a921aec…`, merge de test PR `105f6551240d8633ad969ea647057cfacf96980a`, même arbre `a013fac…`. [Archive fidèle de la description précédente de PR](PR-1-HISTORIQUE-AVANT-I2.md).

REC-SO-INS-03/04 partiellement couverts automatiquement ; aucune recette humaine finale ni certification des 55 recettes. Android/iOS, deux appareils, vraie coupure réseau, charge pilote et restauration complète restent NON EXÉCUTÉS. Les interruptions/réponses perdues sont des simulations transactionnelles. L’application complète reste non conforme V3.5/V0.7.

## Sauvegarde, reprise et suite

Aucun document de production modifié. Les quatre Masters XLSX et contrats historiques sont inchangés. Avant un futur déploiement approuvé, sauvegarder de façon cohérente session, registrations et toutes leurs sous-collections, paramètres/compteurs/identités, invitations/usages, opérations/audit, campagne et brouillon/historique. Une copie du seul dossier ou du seul compteur n’est pas une restauration valide.

Les tests démontrent l’annulation de toutes les écritures avant commit puis la reprise par reçu après réponse perdue. Un retrait/correction est une contre-opération auditée, pas l’effacement de l’approbation passée. Un ancien reçu rejoué après retrait ne recrée pas la place. Ces preuves ne remplacent pas un exercice d’export/restauration complète.

Ne pas revenir à I1/C1a avec des dossiers I2 confirmés : ces anciens binaires ignorent les nouveaux états et compteurs. Repli sûr à concevoir et tester : garder le lecteur/garde I2, fermer les candidatures, révoquer les autorisations opérationnelles selon décision explicite, puis appliquer un correctif compatible. Aucune suppression de données ni remise à zéro implicite.

Prochaine tranche : **I2b régie des groupes**, sur services existants, avec affectation/retrait/transfert et révocation atomiques sans toucher à la propriété des biens/caisses. Puis C1/C2 et I3 (Master central global, référence M2 unique), I4 naissance et I5 relève. Migration/adoption de campagnes historiques toujours soumise à validation préalable ; production toujours soumise à autorisation explicite et à une recette isolée.
