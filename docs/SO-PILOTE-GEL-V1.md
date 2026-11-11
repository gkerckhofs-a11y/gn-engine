# GN Engine / Space Outlaws — gel fonctionnel du pilote

Date : 11 novembre 2026 · PR #2, branche `work/space-pilot-handover`.

## Décision

**Objectif : valider un premier épisode jouable, pas compléter l'intégralité de la V0.7.**
Développer seulement ce qui empêche les parcours retenus. Chaque défaut doit avoir une reproduction, un cas PIL et un test de non-régression. Plus de tranches fonctionnelles LIC-02, droïdes, Force PNJ, recettes, assurances ou autres systèmes avant le verdict du pilote, sauf blocage avéré.

## Périmètre choisi et données fictives

| Source | Parcours de preuve | Limite |
|---|---|---|
| M1 + M2 | Deux personnages, kits, PNJ, stocks | Personnages de test, pas les seize fiches finales |
| M3 | Cargo léger, deux ports et deux routes sécurisées | Manifeste/compétences de pilotage réellement contrôlés |
| M4 | Hors pilote | Formules en brouillon, aucune potion jouable inventée |
| M5 | Comptoir, trousses, carburant et caisse réelle | Pas de stocks fabriqués par des lectures |
| M6 | Balise `pilot-cache`, D12, les quatre catégories de trouvailles | Objet et 20 Cr prélevés sur le stock et la caisse |
| M7 | Annonce, candidature, mission et récompense financée | Pas de paiement avant les validations |
| Campagne | Naissance, rôles, STOP, clôture et épisode suivant | Conservation et compatibilité à vérifier par essais |

La variante est lancée uniquement en **émulateurs locaux** via `npm run recette:pilote`, et laisse le kit précédent (`npm run recette`) inchangé. La session commence en PAUSE ; le guide propose 7 cas LOCAL et 3 cas PILOT. Tout relevé commence **NOT_EXECUTED**. Une exécution CI n'est jamais une certification humaine.


## Bilan automatisé du 11 novembre 2026

Le candidat `447d8078c72a9b73af9303cb4158bbb00537f3ef` a passé les huit jobs de la [CI ciblée 43047410513](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43047410513) : 1 023 tests applicatifs, 785 Firestore, HTTP et contrôleur final. Le parcours `space-pilot-journey` a réussi avec le même scénario sur mémoire puis sur l'adaptateur Firestore Emulator. Aucun résultat humain n'en découle. Les commits ultérieurs exigent une nouvelle CI sur leur SHA propre.

La version préparée pour les essais à venir est `0.38.0-rc.1`, **non déployée**. Le prochain passage exige une CI complète avant examen d'une publication ; le protocole de contrôle des données, sauvegardes et Masters est dans [le préflight](SO-PILOTE-PREFLIGHT-FIREBASE.md).

## Registre fermé

| Blocage | Condition de sortie | État actuel |
|---|---|---|
| PIL-01 | Master fictif, session née, stock et comptes financés, fixture et tests verts | **Réussi automatiquement** sur mémoire et Firestore Emulator, CI 43047410513 ; recette humaine non exécutée |
| PIL-02 | Deux joueurs et rôles d'équipe parcourent D12, objets/crédits, achat, plein, voyage, mission et clôture | **Traversée intégrée réussie automatiquement** sur mémoire et Firestore Emulator ; QR physiques et utilisateurs humains non testés |
| PIL-03 | Anomalies PIL-01/02 corrigées avec preuves et tests | Corrections des harnais/tests documentées ; aucun défaut moteur bloquant observé sur la traversée automatisée |
| PIL-04 | Vrais QR sur Android et iOS, connexion, réseau et ergonomie terrain | **Non exécuté** |
| PIL-05 | Régression complète, sécurité multicomptes, charge pilote et restauration vérifiée | **CI complète à exécuter** ; charge, sécurité terrain et restauration non attestées |
| PIL-06 | Candidat, cible Firebase, sauvegarde, plan de retour et Masters de test approuvés | **Publication non effectuée**, préflight dans [SO-PILOTE-PREFLIGHT-FIREBASE.md](SO-PILOTE-PREFLIGHT-FIREBASE.md) |

## Sécurité des données et décision Firebase

La demande de publication Firebase et de Masters de test est **envisagée après PIL-01**, mais publier le code, créer/activer les Masters et lancer une session sont des opérations différentes. Vérifier d'abord le projet cible, ses données et droits, les éventuels marqueurs/versionnements, l'URL, la sauvegarde/retour arrière et la CI globale. **Aucune fusion dans main, aucun déploiement ni migration sans autorisation distincte de la cible et de la procédure.** Les Masters fictifs ne réinitialisent jamais une session historique.

Références : `docs/source/SO_CDC_V35.md`, `docs/source/SO_CDC_V36_Fouilles_Medias.md`, `docs/source/SO_Regles_V07.txt`, `docs/SO-RECETTE-LOCALE.md`, `docs/AUDIT-GLOBAL-2026-11-06.md`.
