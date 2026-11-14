# Navigation organisateur et personnages de test — 14 novembre 2026

Demande de Guillaume : administrer une session de démonstration, incarner directement chacun des huit profils et revenir en régie sans modifier les données. Aucun déploiement Firebase autorisé.

## Base vérifiée

Dépôt gkerckhofs-a11y/gn-engine, branche work/organizer-test-navigation, base main `e4f84024bf7caf85bdbb2a3575357e67c1b2eb5a`. PR #15 fusionnée, tête historique `243c240f12b2f81e04e6c4979248788371ee172f`. Les lots de compétences ont été intégrés par #34, sans clore toutes les compétences. Le déploiement 43574851449 a été annulé après la demande explicite de report : jobs verify et deploy cancelled. Le workflow de publication est suspendu dans main. Ce lot ne réactive ni ne modifie ce workflow.

## Parcours livré sur branche

- Les cartes de session donnent la priorité à « Administrer la session » pour propriétaire/MJ. « Tester comme joueur » apparaît seulement pour un essai solo disponible du propriétaire habilité. L’Accueil conserve son propre accès.
- Création et reprise de l’essai commun aboutissent à son administration ; confirmation visible et accès persistant « Tester la session ».
- La régie affiche « Mes personnages de test » : huit profils, nom courant, classe, compétences, identifiant public, état et PA engagés. Chaque carte ouvre directement son rôle et propose la copie de son lien si la fiche est accessible.
- L’URL compatible `#/play/SESSION?demoRole=MED` explicite la sélection. Les anciennes routes sans paramètre utilisent la sélection conservée par session, avec Pilote par défaut. Le sélecteur existant met à jour ce paramètre ; la sélection est mémorisée après lecture autorisée de la fiche.
- L’espace de démonstration conserve « Retour à l’administration ». Le simple changement de profil ne libère aucune action ou réservation.
- « Préparer » montre cinq étapes : contexte, paramètres/Master, joueurs, contrôle/publication, briefing/jeu. Les états reposent sur la session et spaceOutlawsEntry ; les blocages proviennent de previewSpaceOutlawsRelease. Un contrôle indisponible est signalé comme tel. Les étapes déjà terminées de l’essai ne sont pas proposées comme créations à refaire.
- Les sept ateliers M1–M7 sont regroupés dans « Configuration avancée », repliée dans la préparation et accessible dans la navigation. Aucun contrôle ou bouton de publication natif supprimé.

## Autorisation et données

Aucun nouveau compte, rôle, personnage, session ou moteur serveur. Les lectures et actions utilisent exclusivement soloDemoContext, le demoRole existant et resolveDemoActor. Un lien ne transmet aucun droit : le serveur exige encore le propriétaire habilité de la session et vérifie la fiche native à chaque requête. Le MJ délégué ne reçoit pas le pouvoir d’incarner les identités du propriétaire. Les véritables invitations restent inchangées.

Les huit cartes sont alimentées par mySession sous les identités fictives existantes. Un profil inaccessible conserve un message de refus et ne propose pas de lien actif. Noms et textes sont échappés. Les URL de test ne contiennent aucun jeton d’invitation, UID de compte ou secret de personnage.

## Validation exécutée localement

Compilation `npm run build`, contrôle `git diff --check` et **38 tests ciblés réussis**, zéro échec :

`node --test test/solo-demo-navigation.test.mjs test/solo-demo.test.mjs test/organizer-dashboard.test.mjs test/player-spaces.test.mjs test/preparations.test.mjs test/solo-demo-cleanup.test.mjs test/character-codes.test.mjs`

Les nouveaux cas utilisent le workflow natif et MemoryStore : huit profils, IDs publics, autorisation propriétaire, refus du compte ordinaire et d’un rôle invalide, anciennes routes, sélection conservée, séparation MJ, état archivé, blocages du guide et regroupement des ateliers. Une action ANALYZE est réellement démarrée avec 1 PA réservé ; toutes les données du store sont ensuite comparées avant/après les lectures et changements de profil. Égalité intégrale, y compris Masters, personnages, ressources, réservations, reçus et historiques. Les tests existants couvrent création et reprise après perte de réponse sans duplication.

## Navigateur et limites

Un parcours Chromium 1440×1050 a été ajouté à test/browser/recette.spec.mjs : création/reprise, aller-retour sur les huit profils, copie du lien, persistance, anciennes URL, refus du compte joueur, navigation clavier, largeur PC et captures de la régie/Préparer/joueur.

L’exécution Chromium locale a été tentée mais le système refuse la création du socket du navigateur (`Operation not permitted`, process_singleton_posix). Aucun résultat visuel local, recette Android/iOS ou essai humain n’est revendiqué. Le parcours est prévu dans la CI existante ; son résultat exact doit être constaté dans la PR, avec le SHA du candidat. Les tests ciblés mémoire ne valent pas exécution navigateur ou tests Firestore supplémentaires.

Aucune fusion de ce lot dans main ni publication Firebase n’est demandée. PR de développement à préparer ; CI exacte et captures à consigner dans sa description après observation.
