# Space Outlaws — souhaits privés de groupe dans la régie

6 novembre 2026. Auteur : Codex. Base `b8625fac61405db8c213a007e1e83821129444c6`, [CI 42226337186](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42226337186) completed/success : huit jobs, 1 068 applicatifs, 846 Firestore et 24 HTTP. Même branche/PR nº 2.

## Parcours et confidentialité

Source : [CDC V3.5 §§4.8 et 4.11, REC-SO-INS-05](source/SO_CDC_V35.md), champ natif admission.proposal.friends et [régie existante](SO-GROUPES-SESSION.md). Le texte libre du dossier courant est présenté aux seuls propriétaire/MJ dans Groupes et mandats. Aucune déduction de personnes, de consentement, d’équipe ou de permission à partir de ce texte. Deux souhaits semblables ne créent aucun lien ni groupe.

L’extension est une lecture privée sous groupsVersion=1 existant. Aucune collection, migration, marqueur de jeu, mutation ou copie parallèle du souhait n’est ajouté. La transaction vérifie l’autorité de session avant la lecture bornée des inscriptions (maximum technique existant de 1 000). Les dossiers non approuvés, retirés, d’un autre type ou sans souhait courant sont exclus. Les données illisibles sont refusées.

La projection contient uniquement nom fictif, souhait, personnage courant vérifié, état et droit courant d’ouvrir le formulaire. Elle ne transporte ni UID, courriel, contexte d’admission, background, compteur ou confirmation. Le texte libre lui-même peut contenir des coordonnées fournies par son auteur : il reste privé, n’est ni interprété ni transmis aux joueurs. Un rattachement incohérent ne donne pas un lien vers un autre personnage. Avant naissance, après décès, pendant STOP ou après clôture, aucun bouton d’affectation n’est proposé. Accueil, joueurs, tiers et MJ révoqué sont exclus.

La recherche native est étendue aux noms fictifs et aux souhaits, avec les mêmes états de la liste. Les textes sont échappés. Gérer l’appartenance ouvre le formulaire natif sans groupe, rôle, droit ou autorisation prédéduit. Aperçu puis confirmation restent nécessaires ; capacités, exclusivité TEAM, révocations, reçus et transactions existants sont conservés. Le souhait n’est jamais copié dans le groupe, les secrets, les badges, M2 ou le motif d’historique par ce parcours. Les caisses/biens ne sont pas redistribués.

Seul le dossier courant fait foi. Le parcours natif de relève peut remplacer ou vider le souhait (notamment une réserve avec texte vide) ; aucun souhait ancien n’est reconstitué depuis l’historique ou associé automatiquement au successeur. Les épisodes conservent le dossier courant par leur sauvegarde native, sans affectation nouvelle. Les anciennes sessions sans groupes restent fermées ; les sessions compatibles reçoivent uniquement cette nouvelle vue privée.

## Contrôles ciblés

Local : build réussi et **127/127 tests** dans huit fichiers ciblés : souhaits, régie, UI, groupes SO, groupes M2, succession, épisodes et sélection CI. Zéro échec/annulé/ignoré/todo, Node 24.22.1. Douze cas nouveaux partagés mémoire/Firestore : lecture sans effet, confidentialité M2/joueur, commande native sans copie, MJ/Accueil/révocation, avant naissance, retrait/texte vide, décès/relève, rattachement incohérent, STOP/clôture, épisode, corruption et autre session/ancienne version. Les souhaits de test sont produits par le parcours natif d’inscription ; les tests de corruption/état dégradé emploient des données contrôlées isolées.

Huit parcours Chromium 153.0.8010.0 (1280×900 / 360×800 tactile simulé), composants réels et workflow MemoryStore : parcours de groupes existants, propositions M2 et recherche/affectation depuis le souhait. Aucune requête distante ni erreur JS, débordement horizontal contrôlé et captures inspectées. Le texte de test contenant une balise reste du texte ; le groupe et les droits ne sont pas préchoisis. Pas d’appareil réel, authentification Firebase navigateur ou recette humaine complète.

Profil CI targeted-friend-requests : 86 fichiers applicatifs et 51 suites Firestore cumulant les dépendances non fusionnées, 25 HTTP sélectionnés. Le profil reste borné ; aucune régression intégrale ni npm test. Le résultat exact du commit candidat est consigné dans PR nº 2 après exécution Node 22/Java 21. Nouveau HTTP/Auth : propriétaire seul habilité parmi les comptes de test, souhaits absents des lectures joueur/public, aperçu sans accès, affectation native, portefeuille inchangé et révocation. Le MJ délégué/Accueil sont contrôlés dans la suite partagée.

## Restant et reprise

Ce parcours intègre les souhaits textuels existants, pas un réseau d’invitations entre participants, une preuve de consentement des amis ou une affectation automatique. §4.11/INS-05 restent partiels sur la recette humaine et les autres exigences. La recherche de toutes les réserves/remplacés, les permissions collectives et le cycle Master Vn+1 restent ouverts.

Conserver les contrôles de rôle, le dossier courant privé et sa projection explicite, les droits/versions de session, les commandes/reçus/historiques de régie, les transitions de relève et les épisodes cohérents. Ne pas copier le souhait vers une faction, un personnage ou un nouveau stockage, ni le réintroduire après une relève. Aucun merge main, déploiement Firebase, migration ou restauration externe.
