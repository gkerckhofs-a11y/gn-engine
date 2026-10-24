# C2a — Contrôle de la première préparation centrale

État historique C2a : [C2b](SO-02-C2B-DELEGATION-CONTROLE.md) étend désormais l’autorité à une délégation explicite et versionne son empreinte. Les limites de validation et l’absence de publication décrites ici restent applicables.

24 octobre 2026. Candidat 0.37.0, branche de livraison `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Ce lot ouvre C2 après C1e ; il livre un contrôle commun des contenus actuellement préparables, pas la publication globale complète.

## Base vérifiée et sources

Main : `03eaace155b052d1b7d1960347746e9ee60ed514`. C1e distant : `3ae52a724ac3dba610d27d1f700ae0e498a70cb9`, arbre `27db00570c410d423c8a85c2ff41dadb0b4a4d24`, identique au checkout local `2b2723538e4db73288e218c5ae527ab8891303de`. Les deux CI de C1e sont terminées avec succès : [push 40081440414](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40081440414), job 120835665655 ; [PR 40081443076](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40081443076), job 120835673254. Chacune : compilation, 957 tests applicatifs et 754 tests Firebase réussis, aucun échec/annulation/ignoré/todo. [Description et preuves C1e conservées](PR-1-HISTORIQUE-AVANT-C2A.md).

Références : [CDC V3.5 §§3.6–3.10, 10](source/SO_CDC_V35.md), [plan central §§5–7](SO-00-V34-PLAN-CENTRAL.md), [gabarits rapprochés](SO-00-V34-GABARITS.md), [vade-mecum §3](source/SO_Vademecum_V01.txt), [règles V0.7 et arbitrages clos](source/SO_Regles_V07.txt), [ordre V3.5](SO-00-V35-INSCRIPTIONS.md). Les gabarits restent préparatoires. Aucune règle canonique ni barème n'est ajouté ou supposé implémenté par le contrôleur.

## Parcours livré

Le propriétaire de la campagne ouvre un atelier puis **Contrôler le brouillon commun**. Le serveur vérifie son autorité courante, le contexte C1a, l'absence de base publiée et la révision affichée. Une transaction lit les changements des ateliers dans le même état cohérent. Le rapport permet de revenir dans l'atelier propriétaire pour corriger une référence, puis de relancer le contrôle à la nouvelle révision.

Le rapport rassemble :

- les sept ateliers et leur couverture réelle ; M1/M2/M4 sont partiels, M3/M5/M6/M7 non implémentés dans ce contrôleur ;
- les ajouts prévus et définitions archivées exclues, sans version de base publiée ni prétendue comparaison Vn/Vn+1 ;
- les références orientées, présentes, absentes, archivées, incohérentes ou non contrôlables ;
- les diagnostics avec atelier, ID, champ, référence, correction, source et, pour un import, fichier/feuille/ligne/colonne/lot ;
- les champs présents et les catégories de contenu privé à relire dans les ateliers habilités, sans recopier les biographies, secrets ou notes dans le résumé ;
- une empreinte SHA-256 liée à l'auteur du contrôle, au contexte, à la révision et au contenu complet, y compris les textes privés et la provenance.

Cette empreinte est une identité de rapport, **pas un consentement de publication**. Aucun point d'entrée n'accepte ce rapport comme autorisation d'activer une version. Le rapport est recalculé, sans écritures de contrôle, reçus, version, snapshot, pointeur, ressources ou compte. Il n'est pas conservé dans un cache navigateur ou une nouvelle collection.

## Contrat et limites

`checkCentralDraft({campaignId,draftRevision})` est une lecture propriétaire uniquement. Les délégations d'atelier, même cumulées sur les sept ateliers, les droits MJ/Accueil de session et les candidatures ne donnent pas accès à ce rapport. Aucune nouvelle permission IAM ni règle Firestore client.

Les gardes du service central restent communes aux lectures et écritures. Un brouillon périmé est refusé ; un contexte publié, figé ou historique ne peut être converti par cette route. Une lecture concurrente voit la révision demandée ou reçoit `STALE_REVISION`, jamais un mélange d'avant/après.

Le contrôleur vérifie propriétaire de type/atelier, ID, révisions, opération, source et provenance, puis réutilise les nettoyeurs natifs M1/M2/M4 et le catalogue narratif I1. La comparaison avec la forme native détecte les champs étrangers, ressources ou états de publication injectés. Les doublons incohérents ne peuvent servir de cibles. Les diagnostics existants des personnages et recettes sont réutilisés ; les références M4 disposent ici de la lecture M1 du propriétaire.

Il ne lit pas les registrations, invitations, politiques d'admission, historiques privés, instances de session, comptes ou catalogues d'une autre campagne. Le catalogue narratif I1 est le changement existant `speciesCatalogue_player`, sans copie ni nouvelle source.

| Borne de cette tranche | Comportement |
|---|---|
| 601 changements : 250 objets, 100 personnages, 250 recettes, un catalogue d'espèces | Requête plafonnée à 602 pour détecter le dépassement ; sous-limites et types contrôlés |
| 16 Mio de contenu brut de changements | Refus explicite `CENTRAL_CHECK_LIMIT` avant projection |
| 4 Mio de rapport | Refus explicite, aucun rapport tronqué présenté comme complet |

Ces bornes techniques ne sont ni des règles de jeu ni une mesure de charge. Un brouillon autorisé par les limites de ses ateliers peut dépasser la borne agrégée de ce premier contrôleur ; la construction paginée et les mesures de charge restent à développer.

`NO_DETECTED_ERROR` signifie uniquement qu'aucune anomalie n'a été trouvée dans les vérifications exécutées. `publicationAvailable` reste toujours `false`, et les contrôles manquants sont visibles même sur un brouillon vide. La présence d'une cible n'atteste pas à elle seule sa compatibilité métier : les diagnostics de recette restent affichés séparément.

## Vérifications et preuves

Local, le 24 octobre 2026 : Node 24.22.1, npm 11.9.0. **983 tests applicatifs réussis**, zéro échec/annulation/ignoré/todo ; compilation réussie. Logs : [tests](verification/c2a-npm-test.log), [build](verification/c2a-build.log).

19 nouveaux cas métier partagés mémoire/Firestore couvrent droits actuels, lecture avant toute divulgation, global M1/M2/M4, résolution et archives, types natifs, provenance XLSX réelle, séparation des admissions et campagnes, révisions, empreinte, concurrence, corruptions, bornes et absence totale d'écriture. Quatre cas ciblent ordre canonique, doublons et budgets de contenu/rapport ; trois cas UI couvrent accès, couverture affichée, échappement et confidentialité. Un parcours HTTP/Auth supplémentaire traverse le véritable handler et vérifie propriétaire, refus délégué, révision et absence de publication.

Firebase n'est pas exécuté localement (Java 17). Les deux CI du commit exact doivent terminer ; SHA, runs/jobs, versions, décomptes et nouveaux cas exécutés seront consignés dans la PR après lecture de leurs journaux. Les résultats C1e ci-dessus ne sont pas attribués au nouveau candidat. Les avertissements Node des dépendances Firebase et des actions v4 sont connus depuis C1e ; dépendances et workflows restent inchangés dans C2a.

Aucune recette humaine Android/iOS, mesure de charge, restauration complète ou publication n'est revendiquée. Les 55 recettes complètes restent non certifiées. C2a apporte des preuves partielles aux diagnostics et références MST-03/04/05/08 ; il ne valide pas leurs parcours complets d'activation.

## Compatibilité et prochaine tranche

Les quatre Masters historiques sont inchangés ; anciens éditeurs/imports et services de session conservés. Aucun nouveau document persistant métier dans ce lot : retirer ce lecteur n'exige pas de restauration de données C2a, mais un retour logiciel doit conserver les contrats C1/I1/I2/I2b existants. L'empreinte du rapport n'est pas une sauvegarde.

Restent C2b et suites : validateur complet des domaines/profils, diff avec une base publiée, consentement de publication lié aux droits actuels, construction immuable reprenable, manifeste/version READY, bascule atomique avec contrôle du parent, lecteurs ne voyant jamais BUILDING, puis export et retour de configuration sur données fictives. Les profils M2, I3/I4/I5 et la démonstration M1/M4/M5 activable restent à raccorder. Ne pas transformer automatiquement ce rapport partiel en autorisation de publication.

Aucun merge sur main, déploiement, migration, modification de `.github/deploy-request.json`, IAM/DNS ou secret. La mise en production conserve son autorisation explicite distincte.
