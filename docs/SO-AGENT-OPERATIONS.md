# Space Outlaws — protocole de travail de l'agent Codex

Statut : directives proposées et intégrées comme règles de travail dans `AGENTS.md`.
Elles ne constituent ni une autorisation de déploiement ni un accès autonome à Firebase.

## 1. Mission
Faire aboutir GN Engine / Space Outlaws à un parcours GN jouable, conforme aux règles validées,
sans réécriture du produit ni création de mécanismes parallèles.
Éviter la surproduction de fonctionnalités isolées au détriment de parcours complets.

## 2. Reconnaissance impérative
- Vérifier `git status`, branche, SHA HEAD, PR active et contrôles CI; identifier les
  changements concurrents. Ne jamais affirmer qu'un résultat historique valide le HEAD.
- Lire le `AGENTS.md` racine et les sections pertinentes du cahier des charges, du livre
  V0.7, de la matrice de conformité et des rapports de validation.
- Faire une synthèse des exigences, de leur statut démontré par le code, des risques et des
  dépendances, avant toute modification.
- Distinguer **implémenté**, **partiel**, **absent**, **testé automatiquement**, **recette humaine
  manquante**. Ne pas conclure « prêt pour GN réel » sur la seule base des tests.

## 3. Autorité documentaire
Par priorité dans leur portée et sous réserve des dates :
1. Dernières décisions explicites et documentées de l'organisateur.
2. `docs/source/SO_Regles_V07.txt`, avec arbitrages A01–A38 clôturés.
3. `docs/source/SO_CDC_V35.md` et `docs/source/SO_CDC_V36_Fouilles_Medias.md`,
   complétés des décisions et suppléments ultérieurs applicables.
4. `docs/MATRICE-SPACE-OUTLAWS-V3.md`, `docs/SO-VALIDATION.md`,
   `docs/AUDIT-GLOBAL-2026-11-06.md` comme preuves d'avancement, jamais sources
   de règles supérieures aux arbitrages validés.
5. Contrats de code, tests, README et anciens rapports : preuves techniques et historique.
Citer les fichiers, sections et dates pour chaque conflit matériel; demander l'arbitrage
plutôt que déduire une règle.

## 4. Invariants de données et de jeu
- Versions publiées de Master immuables, brouillons séparés, sessions et épisodes figés
  sur leur version propre ; pas de migration implicite.
- Permissions et projections revérifiées côté serveur, y compris refus, réessais et
  révocations. Pas de divulgation d'identités privées, secrets ou données de clients.
- Préserver intégrité des PA, crédits, inventaires, vaisseaux, réservations, annulations,
  reçus idempotents, mutations atomiques et contrôles en concurrence.
- Les tests de régression couvrent au minimum un succès, un refus d'autorisation et
  un refus de données ou version périmées quand le lot l'exige.
- Aucun changement des barèmes, règles A01–A38 ou décisions narratives sans accord.

## 5. Développement incrémental
Pour chaque lot approuvé : (a) une cible jouable et testable ; (b) portée exacte et
critères de fin ; (c) service et UI si nécessaire ; (d) tests et cas de refus ;
(e) documentation de la matrice et du rapport ; (f) état du commit et de la CI.
Privilégier les chemins et services existants. Ne pas masquer les écarts restants.

## 6. Tests et exécution
- Node.js 22, Java 21 pour émulateurs, `npm ci --no-audit --no-fund`.
- En cas de modification applicative : `npm run build` + tests Node ciblés
  `node --test test/<suite>.test.mjs` (choix documenté).
- Pour règles/services Firestore : émulateurs isolés avec `demo-gn-engine`,
  et commandes du `package.json`; jamais un projet de production.
- Ne pas remplacer la sélection officielle de la CI : `.github/workflows/check.yml`,
  `scripts/ci-plan.mjs`, `scripts/ci-scope.mjs`, `scripts/ci-targeted.mjs`,
  `scripts/ci-run-tests.mjs`.
- Les profils `[ci targeted:...]` sont opt-in et cumulatifs selon leur périmètre ;
  un profil insuffisant, une base de confiance absente, un socle transverse ou une
  fusion envisagée imposent un périmètre élargi / complet.
- La preuve CI comporte l'URL, SHA testé, statut final et jobs pertinents.
  Les tests navigateur automatisés ne remplacent pas Android/iOS réels, charge,
  restauration, validation sécurité ou test humain GN.

## 7. Limites d'autorisation
- Audit : lecture seulement, pas d'écriture GitHub, commentaire, relance CI ni
  commande affectant un état externe.
- Développement approuvé : modifications seulement sur la branche autorisée.
  Commit/push uniquement si la mission le permet ; jamais de force-push.
- Toujours demander autorisation distincte avant fusion, modification de `main`,
  déploiement Firebase, migrations, effacements, secrets ou permissions étendues.
- Ne pas écrire de secrets ou données personnelles dans la branche ou les rapports.

## 8. Rapport obligatoire
Dépôt/branche/SHAs; sources; objectif et livrable; fichiers; tests exécutés et
résultats réels; CI (URL, commit, conclusion); limites; risques; points à trancher;
prochaine tranche priorisée.

**Note :** le contenu historique de `AGENTS.md` reste conservé intégralement sous
son titre original. Les jalons datés sont des références, non une instruction de
réappliquer leurs comportements dépassés.
