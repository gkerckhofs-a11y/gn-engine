# Carte galactique — codes automatiques et accès par compétence

Décision : [instruction organisateur et correction du 16 novembre](source/SO_Pilot_Map_Decisions_2026-11-16.md).
Base : `98a3342d6f9c789f2edcc2c75faf1776296d7171` (main, 0.39.0).
Branche : `codex/pilot-default-navigation-20261116`. PR #2 vérifiée fusionnée ; PR #45 laissée intacte.

## Comportement livré

Le Terminal, le raccourci du vaisseau et le service galacticMap exigent Navigation PIL-01 N1 minimum, quelle que soit la classe principale. La régie garde son accès administratif. Tous les ports et liaisons de la version publiée de la session, avec leurs codes, sont disponibles automatiquement. Le formulaire de saisie des codes est supprimé. Les anciens paramètres de codes sont tolérés pour compatibilité mais ne filtrent plus le réseau.

L'analyse spécialisée reste nécessaire pour les dangers. Le comparateur réutilise les coûts natifs, les contrôles d'autonomie et les escales calculées. Posséder des codes ne donne aucun mandat de pilotage ni permission sur les ressources ; aucune migration ni écriture de personnage n'est nécessaire. Une liste d'escales imposées manuellement reste hors de cette tranche.

## Vérification locale

- Node 22 : 41 tests ciblés réussis (`galactic-map`, `galactic-map-ui`, `player-terminal`, `ship-workspace`, `ship-crew`).
- Compilation `npm run build` réussie.
- Firestore/Auth sous Node 22 et Java 21 : 15 tests Firestore et 1 test HTTP/Auth réussis sur la version finale.
- Scénario Playwright mis à jour mais non validé localement : téléchargement du Chromium fourni échoué (archive tronquée) ; Chromium système ne démarre pas, socket interdite (`Operation not permitted`). Ce blocage intervient avant l'exécution des assertions navigateur. Aucune recette mobile réelle effectuée.

Commande d'intégration : `GN_FIRESTORE_SUITES='["galactic-map","ship-workspace"]'` avec `firebase emulators:exec --project demo-gn-engine --only firestore,auth,storage`, puis `node --test test/integration/firestore.test.mjs` et `node --test --test-name-pattern="carte galactique" test/integration/http.test.mjs`.

La matrice de tests vérifie toutes les classes avec et sans PIL-01, le refus de l'accès direct sans compétence, la version de session, plus de vingt codes, les informations de dangers, la révocation et la consultation sans mutation.

## État de livraison

Branche séparée, sans fusion ni déploiement. CI du nouveau commit à constater dans la PR ; les résultats locaux ciblés ne constituent pas une certification globale. Une recette navigateur réussie reste à obtenir avant publication.

## Simplification du Terminal — 16 novembre 2026

Instruction de Guillaume : retirer « Choisissez un vaisseau ou un service accessible. Pour une opération en cours, ouvrez son suivi avant d’en commencer une autre. » et le STOP sécurité pour les joueurs. Le conseil du Terminal et le bouton d'arrêt dans l'enveloppe joueur sont supprimés. L'avis d'arrêt actif et les commandes MJ restent visibles. Modification d'interface uniquement ; le moteur de sécurité n'est pas modifié.

La demande initiale d'ajouter un PV au Combattant a été explicitement annulée (« Oublie le bonus de PV combatant il existait déjà désolé »). Aucun changement de PV, de règle de classe, de personnage ou de donnée.

Validation du complément : 18 tests existants `player-spaces`, `hrp-guidance`, `space-outlaws-health-ui` réussis sous Node 22 ; compilation réussie. Contrôle direct du rendu : conseil et bouton absents, avis d'arrêt MJ conservé. Aucun nouvel essai navigateur (limite d'environnement décrite ci-dessus). Parent distant f535fddb3c97d1609b02c14fbb861bf1b4f23156 : CI 43843781590 en cours lors de la reprise ; ce résultat ne valide pas le complément.
