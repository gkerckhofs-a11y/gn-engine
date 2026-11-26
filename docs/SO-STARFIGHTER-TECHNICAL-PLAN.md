# STARFIGHTER · audit du 22 novembre 2026

Base main 7fe82c6648fc8bd4e22b8390f583d37fb8ad8b56. PR historique #2 fusionnée. Aucune branche STARFIGHTER trouvée avant la mission. La vérification de PR utilise check.yml. Les workflows de déploiement Firebase et Holopédia sont distincts.

| Parcours | Service actuel | Extension prévue et limite |
|---|---|---|
| Entraînement | web/cockpit/state.mjs et prototype | Route autonome sur données synthétiques, aucune identité ni requête GN. Choix de destination, escales, préparation et commande distincte à chaque étape. |
| Carte | galacticMap, knownMapNetwork, mapItineraries | Requérir PIL-01 et choisir le vaisseau affecté. Afficher coût et minimum de départ distincts. Aucune liste globale de codes. |
| Préparation | prepareVoyage, departShip, requestSoLaunch | La demande précède l'affectation MJ. Le poste actuel ne peut donc pas préparer un nouveau vol à quai avant cette affectation. Conserver le terminal natif comme point d'entrée ; une affectation anticipée demanderait un contrat distinct. |
| Départ et arrivée | cockpitStation, cockpitCommand, finishSoPreparation, arriveShip | Pilote authentifié, mandat courant, présence, réservations et confirmation natives. Jamais de départ automatique à une escale. |
| Combat | spaceCombat et commandes autorisées dans cockpit-command.mjs | Ordre et résolution natifs. Visée et salves locales sans coût ni dégât. Clé de présentation par rencontre et round résolu. |
| Régie | spaceportAdmin, assignSoCockpit, revokeSoCockpit | Options de présentation indépendantes voyage/combat, désactivées par défaut. Ne pas modifier le mandat, le coût ou la durée des rounds. |

Le prototype représente déjà huit phases et déduplique ses événements visuels. Le poste connecté consulte son affectation toutes les trois secondes. Les contrôles d'affectation et les mutations utilisent la même transaction. La reprise doit effacer les informations de l'ancien pilote, resynchroniser le vol et conserver le même identifiant lors d'un nouvel essai. Pause, STOP et perte de liaison doivent immobiliser aussi la couche visuelle.

Les destinations du réseau sont celles de la projection personnelle. Les ports publics seuls ne donnent aucune liaison. En présence d'un remorquage, conserver la cotation native. Le mode contrôlé existant restreint certaines préparations de convoi ; la présentation ne peut les rendre disponibles. La participation des postes se limite aux combats admis par le moteur.

## Validation et reprise

Référence locale ciblée : cockpit, cockpit-launch, galactic-map, space-outlaws-voyages, space-combat-state. Étendre à space-convoy-combat, space-towing-flight, space-group-stock, knowledge et navigateur. Tester deux identités et rejouer les réservations sur émulateur isolé. Consigner séparément les résultats mémoire, émulateur, navigateur et matériel. CI sur le SHA de chaque lot selon AGENTS.md.

La démonstration a son propre point d'entrée. Les options connectées absentes signifient cockpit historique. Aucun rétro-remplissage des documents ni migration nécessaire. Le retour au cockpit historique doit préserver voyages, réservations, reçus et ordres en cours. M2 et consoles spécialisées restent hors périmètre.

## Décisions du 22 novembre, après l’audit

Guillaume demande un départ automatique et confirme l’interception automatique avec négociation avant combat. La régie choisit une fois le nombre de postes disponibles. Le serveur réserve un poste libre dans la transaction de préparation. Le pilote confirme sa présence et le décollage dès que le délai natif est atteint. À l’escale, il peut examiner et préparer le prochain trajet depuis le poste encore attribué. Les conditions de présence requises par le mode QR restent applicables. L’affectation manuelle reste utilisable dans les sessions historiques ou après révocation.

Pour les interceptions automatiques, la cible doit être admissible à une embuscade native. Le prototype retient 90 secondes de temps de jeu pour la négociation. Les accords unanimes et les manœuvres précombat natives gardent la priorité. Les décisions ultérieures doivent distinguer la durée de négociation de la durée canonique du round.
