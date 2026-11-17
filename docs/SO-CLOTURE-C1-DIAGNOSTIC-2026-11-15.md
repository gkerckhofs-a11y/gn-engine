# C1 — Diagnostic technique natif, 15 novembre 2026

Sources : [CDC de clôture V1, section 2](source/SO_CDC_Competences_Cloture_V1.md) et [règles V0.7, MEC-01 et tests ordinaires](source/SO_Regles_V07.txt). Base du code : `4762faad208a9d29350c2fe56c8cb6b21583625e`, branche `work/skills-closure-v1`, [PR #45](https://github.com/gkerckhofs-a11y/gn-engine/pull/45). La CI de chaque commit se vérifie séparément ; le résultat d’un parent ne certifie pas ce complément.

## Parcours

La régie relie un point MEC-01 publié à un droïde, une installation ou un vaisseau de la session. Elle déclare son accessibilité dans la scène et prépare les seuls compléments de fiction autorisés par niveau. La liaison est révisée et auditée, ne change pas d’entité et ne réécrit pas le Master publié. `nativeTechnicalAnalysisVersion=1` est réservé aux nouvelles publications. Les anciens diagnostics préparés continuent à fonctionner.

Une action native réserve 1 PA et dure 60 secondes de jeu. La récupération est de 600 secondes. L’état ordinaire est acquis sans dé : PV, protection, panne durable et neutralisation d’un module droïde ; Coque, Bouclier et révision d’un vaisseau ; état courant de l’installation. Les modifications clandestines sont filtrées par niveau. L’analyse ne répare ni ne déverrouille rien.

Un complément caché préparé de niveau admissible ouvre seul un test ordinaire au D6, seuil 6. Le scanner DR-03 installé et opérationnel peut apporter le seul bonus matériel compatible choisi avant le jet. Une aide MEC-01 doit atteindre le niveau du complément et suit les réservations et la récupération natives, sans PA supplémentaire. Un échec conserve les informations ordinaires.

La tentative approfondie est limitée par personnage et version de panne. L’observation ordinaire N1 ne bloque pas un approfondissement après progression ; commencer puis annuler une réparation ne renouvelle pas la tentative. Les changements réels de panne ou de liaison sont distingués des réservations temporaires. Si l’état change pendant l’analyse, sa résolution est refusée ; l’annulation native restitue le PA réservé. La relecture privée reste gratuite, datée et sans actualisation silencieuse.

Les propositions d’intervention reprennent `droidModuleWork` et `maintenancePlan`. Elles exposent les prérequis sans accorder de compétence ou de mandat. Les liaisons, résultats et limites de tentative suivent l’épisode suivant. Les droits courants restent vérifiés avant le retour d’un reçu.

## Vérifications réalisées

- Huit cas métier distincts réussis en mémoire : niveaux, coûts, état réel, informations cachées, scanner, aide compétente, changement de panne, annulation, confidentialité, réessai et continuité d’épisode.
- Les sept premiers cas réussis sur Firestore émulé ; le huitième, ajouté ensuite pour l’aide compétente, également réussi sur Firestore. Projet isolé `demo-gn-engine`.
- Un parcours HTTP + Auth émulé réussi : 401/403, scan privé, panne pendant analyse, refus de version périmée, annulation, diagnostic daté, reçu idempotent et révocation.
- 70 tests de régression finaux réussis : `space-technical-native`, `space-technical-analysis`, `field-actions`, `person-actions`, `space-droid-work`, `space-droid-storage`, `space-outlaws-episodes`, `html`. Les campagnes intermédiaires se recouvrent et ne sont pas additionnées.
- Compilation `npm run build` et contrôle du diff réussis sous Node 22. Aucune preuve navigateur ou terrain : le navigateur local reste bloqué avant chargement par le runtime.

## Limites et suite

Le diagnostic est raccordé aux trois familles. Son orientation couvre uniquement les réparations déjà exécutables. La réparation durable des modules de vaisseau et des installations, ainsi que la remise en service après sabotage avancé, seront ajoutées au même diagnostic avec C2/C4 ; aucun faux devis ni bouton exécutable n’est inventé pour ces branches encore absentes. Les modules déposés et les prestations PNJ droïdes restent aussi à compléter. Les rares/prototypes C3, intrusions C5 et prestations négociables C6 demeurent ouverts.

Aucune fusion dans main, publication Firebase, migration, modification de permissions ou recette humaine n’a été exécutée. SHA du candidat et CI exacte à consigner dans la PR après publication du commit.
