# Recherche de personnages et réserves — 6 novembre 2026

La régie « Groupes et mandats » présente un seul catalogue pour la session : actifs, premières naissances à préparer, réserves non incarnées, décès sans successeur, remplacés et fiches incohérentes à vérifier. Les filtres historiques affecté/non affecté/hors combat restent disponibles. Un nom de prédécesseur ou successeur réciproque permet de retrouver la fiche liée ; le souhait privé courant reste recherchable.

## Sources et règles de projection

- `src/core/space-outlaws-roster.mjs` : projection des instances de session, inscriptions courantes et définitions de sa version publiée, sans écriture. Une définition non incarnée et non allouée à un dossier est une réserve. Un dossier même retiré ne libère pas automatiquement sa définition.
- `src/core/space-outlaws-succession.mjs` : référence native pour l’éligibilité des réserves. Le catalogue ne remplace pas les contrôles d’activation.
- `src/core/group-management.mjs` : propriétaire/MJ autorisés avant lecture privée, version de session figée même si le pointeur Master change ; marqueur groupsVersion=1 existant. Projections et droits génériques préservés.
- `web/group-management.mjs` : filtres, texte échappé, liens nominaux réciproques et aucun formulaire de mandat pour une fiche indisponible, même par accès direct à son identifiant.

Un personnage actif doit être publié, né sous la version de session et lié à son inscription acceptée/identité affectée courante. Hors combat ne signifie pas mort. Un successeur n’est relié que si les deux instances se référencent réciproquement. Les réserves ne deviennent jamais des instances par consultation ; pas de dotation, groupe, consentement ou permission déduit.

## Validation reproductible et limites

Commande locale : `node --test test/space-roster.test.mjs test/group-management.test.mjs test/group-management-ui.test.mjs test/space-groups.test.mjs test/space-group-definitions.test.mjs test/space-group-requests.test.mjs test/space-succession.test.mjs test/space-episodes.test.mjs test/ci-targeted.test.mjs` : **136/136** ; `npm run build` réussi.

`GN_BROWSER_EXECUTABLE=/tmp/chromium npx playwright test --config test/browser/space-groups.config.mjs` : **10/10**, bureau et petit écran simulé. Réserves sans action, recherche d’un successeur par ancien nom, parcours de groupes/M2/souhaits maintenus ; aucune requête distante ni débordement horizontal ; capture petit écran inspectée. Pas de téléphone réel certifié.

Sept nouveaux cas partagés MemoryStore/Firestore couvrent absence de mutation et de doublon, naissance réelle, décès/relève, fausse affectation et faux lien, STOP/clôture/épisode, dossier retiré, version figée. Un cas UI et un contrôle du profil CI sont ajoutés. Le cas HTTP/Auth vérifie la lecture privée, le refus aux joueurs et l’absence d’incarnation de réserve. Les résultats émulateurs sont ceux du commit exact de [PR #2](https://github.com/gkerckhofs-a11y/gn-engine/pull/2), à consigner après terminaison.

Profil CI `targeted-roster-search` : 87 fichiers applicatifs, 52 suites Firestore et 26 HTTP sélectionnés. Il conserve les dépendances cumulées de cette branche ; aucune régression intégrale lancée. Ceci ne termine pas tous les mandats collectifs du §4.11 ni Master Vn+1 ; recette humaine/mobile/charge/restauration encore requise. Aucune publication Firebase ni modification de production.
