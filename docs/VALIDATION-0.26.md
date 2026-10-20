# Validation GN Engine 0.26 — masters de terrain

Date : 20 octobre 2026. Extension du contrat XLSX de format 1 ; les anciens masters restent compatibles.

## Vérifications locales

- Compilation de l’interface réussie.
- 508 tests applicatifs réussis, sans échec ni test ignoré.
- Neuf cas métier supplémentaires, partagés entre mémoire et Firestore : import complet, états uniques, ajouts en session, protection des récompenses, références, identités, archivage, confirmation périmée, interruption transactionnelle et continuité de campagne.
- Parcours HTTP existant étendu à une cache importée, créée en session et fouillée avec récompense unique ; contrôle d’import HTTP étendu aux cinq profils d’interaction.
- Quatre XLSX générés avec Artifact Tool. Lecture par le lecteur de l’application, import des deux exemples dans une campagne de test et comparaison des contenus inchangés.
- Rendu des vues modifiées, contrôle des colonnes et des listes de validation. Aucun calcul ni formule dans les masters.

## Publication

Validation Firebase et publication en attente. Les identifiants des commits et résultats définitifs seront ajoutés après contrôle.

## Limites

Les tests utilisent des données synthétiques et des émulateurs, sans modification des parties réelles. La recette avec plusieurs téléphones et comptes réels reste ouverte. Les classeurs n’ont pas été testés dans les applications natives Excel et Google Sheets.

Imports réservés à PREPARATION avant lancement. Pas d’annonces, entrepôts, vaisseaux, progression XP ni notifications DIRECT/DISCRET dans ce format. Une récompense existante en session ne se modifie pas : utiliser le réapprovisionnement MJ pour un apport ou créer un nouveau lieu. Le caractère pillable d’un modèle n’altère pas les lots déjà détenus. Les exemples sont fictifs et ne configurent pas automatiquement le canon de Port-Brèche.
