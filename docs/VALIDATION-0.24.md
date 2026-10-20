# Validation 0.24 — actions de terrain

20 octobre 2026. Développement et vérifications locales terminés ; validation distante et publication à compléter.

Base GitHub : `0dc032e04268f3bf0046ec8f4979e64a4ca25ef3`, GN Engine 0.23. Périmètre : exécution chronométrée des fouilles, sabotage et réparation, D6 serveur, matériel, réservations, stocks et continuité de campagne. [Parcours et limites](ACTIONS-TERRAIN.md).

## Vérifications locales

- Compilation 0.24.0 réussie. **476 tests applicatifs réussis**, zéro échec, zéro ignoré.
- Quinze tests de terrain partagés par le store mémoire et Firestore émulé : aperçu, autorisations, réessais, concurrence, durée, pause, renouvellement avec réservation, consommables à l’échec, bonus, compétence, récupération commune, panne, réparation, protection, expiration, révocation, reprise de campagne, clôture sans PA, réapprovisionnement et rollback transactionnel.
- Le dé de test est injecté dans le workflow, jamais fourni par le JSON joueur. Un test essaie une valeur de dé dans la requête et vérifie que le serveur utilise son propre résultat.
- Les résultats privés et réserves sont absents de la projection de lieu et de l’aperçu. Les textes affichés sont échappés ; tests d’interface sur les contrôles bloqués pendant la pause, le choix du matériel et le résultat conservé.
- Compatibilité des anciennes archives, validation des références et copie des lieux depuis une version figée couvertes par les suites existantes et nouvelles.
- Nouveau parcours HTTP utilisant le véritable gestionnaire exporté avec Auth/Firestore émulés : modèle importé, lieu, attribution, QR, action automatique, récompense unique et révocation avant réessai.

## Limites

Les tests HTML ne prouvent pas l’affichage visuel ni l’usage des formulaires privés sur téléphone. Pas de recette authentifiée multi-comptes dans un navigateur, ni de charge à 60 connexions. Aucun compte joueur ou scénario de production ne sera utilisé pour les contrôles de publication.

Les soins complexes, aide, pillage, DIRECT/DISCRET, progression XP et import XLSX des lieux restent hors de ce lot. Les dépendances d’installation couvrent seulement les fouilles déclarées dépendantes.

## Publication

À compléter après la chaîne de validation Firebase, publication du site et contrôle de version, fichiers XLSX et refus des commandes privées anonymes.
