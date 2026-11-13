# Dashboard organisateur — audit et refonte du 13 novembre 2026

## Base et portée

Demande utilisateur : pièce jointe « Refonte ergonomique du dashboard organisateur », ajout de Sabacc. Base `dffcba417cdd6670d6057d72c9fd7b02c86a0e6b`, arbre `bdc79d02b1eb3c555281d777e2ea4403a9f31be1`. CI main exacte [43401617843](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/43401617843) relue, terminée avec succès. PR #2 fusionnée. PR #10, brouillon `work/player-qr-health` (`ecef0d8…` lors de l’audit), modifie en parallèle l’interface joueur et le Sabacc ; elle n’est ni incorporée ni écrasée. PR #3 conserve un audit Firebase indépendant. Branche dédiée `work/organizer-dashboard`.

Sources : instruction utilisateur, `AGENTS.md` / `SO-AGENT-OPERATIONS.md`, CDC V3.5 §3.2 et §4.11, V3.6 Fouilles/Médias, matrice et journal de validation, audit du 6 novembre (historique), règles V0.7 (aucun changement de règles). Code inspecté : routeur `web/app.mjs`, entrée et préparation SO, Master central, projections `workflow.mjs`, droits `staff.mjs`, voyages/cockpits, recours douaniers, survie, service Sabacc.

## Audit initial

Implémenté avant refonte : sept ateliers centraux, candidatures, attribution/accès, groupes, régies missions/primes, espaceport et cockpits, combats/dépannage, stocks PNJ, interactions, santé/sécurité, captivité, douanes/recours, renseignements, apprentissage, succession, journal session, clôture d’épisode, Sabacc autonome. Le dashboard global est une liste campagnes/sessions/scénarios. L’entrée SO juxtapose publication, rythme, liens métier et accès joueurs. Les pages métier perdent le contexte de navigation. Le Sabacc n’a pas d’entrée organisateur générale.

Partiel/absent : pas de présence en ligne mesurée dans la projection session, pas d’horloge globale disponible dans cette projection, pas de journal unique exhaustif intermodules, pas de centre de notifications poussé. Plusieurs fonctions dépendent des versions publiées. Un outil déployé n’est pas nécessairement ouvert dans chaque session. Les fonctionnalités non raccordées restent signalées dans leurs écrans existants.

Droits : propriétaire = contenu/rythme/accueil/délégations ; MJ = contenu/rythme/accueil ; réception = inscriptions/affectations et projection publique des personnages. L’administration Sabacc exige son propre droit (propriétaire global ou délégation Sabacc), pas simplement le rôle MJ. Le Master possède aussi des délégations par atelier ; les liens directs aux sept ateliers sont proposés au propriétaire, les autres délégations restent accessibles depuis l’accueil central existant.

## Correspondance des fonctions

| Ancien accès | Nouvel accès | Conservation |
|---|---|---|
| Session / entrée SO | Préparer · version, candidatures, attributions | Contrôle/publication et affectations natifs, motifs et confirmations inchangés |
| Dashboard · Master central | Préparer · sept ateliers nommés, M1–M7 en sous-titre | Import/export, dépendances, versions et validation conservés |
| Groupes | Préparer · Groupes et factions | Membres, permissions et messagerie existants |
| Médias | Préparer · Images et médias | Version requise et périmètre session |
| Entrée SO · rythme | Animer · commandes de session | Pause/reprise et fin confirmées, fin isolée |
| Recherche manuelle de fiche | Animer · recherche par nom/métier | Aperçu autorisé par le serveur, aucun droit de modification ajouté |
| Annonces / contrats / primes | Animer · cartes métier et accès rapide | Preuves/arbitrages dans leurs régies |
| Spatioport | Animer · Décollages et cockpits | Demandes, postes, liens pilotes et vols simultanés |
| Combat / dépannage / entretien / fret | Animer · cartes selon version | Sous-régies et routes inchangées |
| Boutiques et caisses | Animer · Boutiques et caisses | Stocks et comptes réels, aucune création de fonds |
| Terrain / soins / renseignements | Animer · cartes selon version | QR et interactions natifs |
| Douanes / captivité / relève | Animer · cartes selon version | Accès directs, décisions natives |
| Sabacc séparé | Accueil orga et Animer · Régie Sabacc | Lien direct vers l’onglet MJ, vérification de ses droits propres |
| Journaux session et bilan de campagne | Superviser | 50 opérations renvoyées par session, détail dans les régies |
| Demandes de cockpit / recours / urgences | Animer et Superviser · À traiter | Lectures existantes, dédoublonnage par identifiant, aucun faux zéro en cas d’échec |

La navigation persistante accompagne les routes organisateur de session, y compris les sous-régies. Préparer/Animer/Superviser renvoient au bon contexte ; la recherche d’outil traverse les trois catégories sans exposer les fonctions désactivées. Les pages de Master/scénario/campagne ouvertes depuis la session conservent la navigation au moyen d’un contexte explicite dans le lien, vérifié contre la session ; leurs contrôles ne sont pas dupliqués. Les accès autonomes sans session gardent leur propre contexte d’édition. Les anciennes routes restent valables. Les sessions historiques gardent leurs formulaires existants, répartis entre les trois vues.

## Priorité PC — précision utilisateur du 13 novembre

Le poste organisateur est un PC. La console utilise une largeur de travail allant jusqu’à 1840 px, une barre de contexte persistante, une navigation latérale déployée, quatre raccourcis fréquents, les commandes de rythme et de sécurité côte à côte et trois ou quatre colonnes de cartes selon la largeur. La recherche et les contrôles restent accessibles au clavier. La recette principale couvre 1440 × 1080 et 1920 × 1080, avec vérification du bandeau pendant le défilement. Le petit écran reste un contrôle de compatibilité secondaire.

## Choix et limites explicites

- Frontend uniquement : aucun schéma, règle métier, endpoint, droit serveur ou ressource modifié.
- Lectures additionnelles bornées aux régies permises. Pas de polling : état daté au chargement, bouton Actualiser. Les urgences restent à surveiller dans la régie santé ; les délais serveur ne sont pas changés.
- Compteurs : places acceptées, accès privés activés, personnages attribués, vaisseaux en voyage si la lecture réussit. « Accès activés » n’est pas « joueurs connectés ».
- Recours : projection existante limitée aux 80 derniers dossiers ; journal session limité à 50 opérations. Ce n’est pas un bilan exhaustif ni un nouveau système d’alertes.
- Vérification avant lancement : le contrôle de publication existant reste l’autorité. Aucun seuil, obligation de carburant ou nouveau blocage ajouté à la publication.
- Les journaux métiers, les stocks et l’économie détaillés restent dans leurs outils existants. Pas de total financier agrégé inventé.
- Navigation autonome hors session (Master/scénario/campagne) inchangée. Les actions avancées des écrans historiques restent dans leurs formulaires existants.
- Pas de validation sur appareils physiques Android/iOS ; la recette navigateur automatisée ne vaut pas recette GN réelle.
- Aucun déploiement Firebase ni fusion autorisés pour cette refonte.

## Vérification

Tests ciblés de navigation : rôles, isolation joueur/cockpit, fonctionnalités absentes, droits Sabacc, échecs partiels, dédoublonnage des demandes de plusieurs vaisseaux, échappement HTML. Régression entrée/préparation, missions, épisodes, primes. Compilation de production. Deux parcours Chromium ajoutés : navigation des trois vues, recherche et fiche, rôles propriétaire/MJ/accueil, Sabacc direct, mobile 390 px, rythme pause/reprise, missions/spatioport et retour aux sessions. Les tests métier existants conservent les contrôles de publication, attribution, cockpit et décisions douanières.

Lancement local de Chromium tenté : le processus se ferme avant l’ouverture d’une page dans cet environnement. Les captures et la vérification interactive doivent provenir de la CI isolée ; ne pas présenter ce lancement comme une recette réussie. Résultats exacts de CI à consigner dans la PR.

Validation locale complémentaire : 70 tests ciblés réussis (workflow, préparation, Master/personnages centraux, entrée, actions, épisodes, missions, primes et nouvelle navigation), compilation réussie. Première recette CI : 11/13 parcours réussis ; adaptation nécessaire du parcours de suspension à l’onglet Préparer et comparaison du bandeau en texte rendu. Les captures ont permis de corriger la hauteur héritée du bandeau sur mobile et de remonter les commandes de sécurité. Ces corrections doivent être validées par la nouvelle CI, pas par le résultat initial.
