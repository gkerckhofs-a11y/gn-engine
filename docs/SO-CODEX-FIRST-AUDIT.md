# Space Outlaws — mission pilote Codex, audit en lecture seule

## Objectif
Vérifier le **HEAD actuel** de `gkerckhofs-a11y/gn-engine`,
branche `work/space-pilot-handover`, PR #2, et proposer **un seul** lot vertical
prioritaire pour réduire un écart réel à la jouabilité, sans écrire quoi que ce soit.

## Interdictions pour cette mission
Aucun commit, push, commentaire PR, déclenchement/rejeu CI, modification de fichier
suivi, fusion, migration, déploiement ou appel à Firebase de production.
Lire les preuves existantes; ne lancer aucun test ou commande qui écrit hors
d'un environnement local isolé. Si un accès nécessaire manque, le signaler.

## Étapes
1. Confirmer repo, HEAD et base de PR, état draft, changements concurrents et
   derniers workflows liés au commit exact. Une exécution en cours n'est pas verte.
2. Lire `AGENTS.md`, `docs/SO-AGENT-OPERATIONS.md`, les règles V0.7,
   les CDC V3.5 et V3.6 D12, les éventuels compléments applicables,
   `docs/MATRICE-SPACE-OUTLAWS-V3.md`,
   `docs/SO-VALIDATION.md` et l'audit fonctionnel du 6 novembre.
3. Établir un tableau limité aux écarts encore ouverts, avec preuve actuelle
   (chemin, ligne/test ou section) et classification :
   développé / partiel / absent / recette réelle non faite.
4. Examiner les dépendances de la CI existante et les suites liées au prochain
   changement ; signaler si un profil ciblé est inadapté.
5. Comparer comme candidats, sans les présumer prioritaires :
   adoption Master sur les autres ateliers, rattachement des nouvelles sessions,
   migration des sessions ouvertes (à traiter avec prudence), compétences de terrain,
   droïdes, Force PNJ, assurances/épaves et préparation recette terrain.
6. Recommander un seul lot **non destructif**, avec bénéfice jouable,
   contrats/fichiers touchés, risques, critères d'acceptation de succès et de refus,
   tests Node + Firestore/HTTP/Chromium utiles, et points nécessitant l'avis de
   l'organisateur. Aucun développement pendant cette mission.

## Format du rapport attendu
- Identité : dépôt / PR / SHA HEAD / date de la vérification.
- Documents autoritaires utilisés et éventuelles contradictions.
- CI actuelle : run et conclusion du **SHA exact**, sans confusion avec ancienne CI.
- Trois priorités candidates, dont une recommandée et deux différées avec justification.
- Lot recommandé : résultats fonctionnels attendus, limites, fichiers à examiner,
  cas de test et commandes précises.
- Risques, décisions à arbitrer et portée de recette physique.
- **Actions effectuées : lecture uniquement**, toute impossibilité explicitement dite.

## Prompt de lancement dans Codex
« Réalise la mission de `docs/SO-CODEX-FIRST-AUDIT.md` sur la PR #2 de
Space Outlaws. Lis les consignes racine et les références citées.
Ne modifie rien et ne déclenche ni CI ni déploiement. Fournis le rapport
factuel avant tout début de codage. »
