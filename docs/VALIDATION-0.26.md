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

Le 20 octobre 2026, la chaîne GitHub Actions **39444879476** a terminé avec succès.

| Élément | Preuve |
| --- | --- |
| Commit fonctionnel | `880870d2409aa633418fb29c24ab5cd905728a0c` |
| Commit de publication validé | `26904e2ccdff62e102bb77940a640b9753e22cd8` |
| Job verify | `118704021867`, succès |
| Tests applicatifs | 508 réussis à 15:04:13 UTC ; 0 échec, 0 ignoré |
| Tests Firebase | 420 réussis à 15:17:19 UTC ; 0 échec, 0 ignoré |
| Total | **928 tests réussis** |
| Job deploy | `118711547340`, succès |
| Publication Firebase | Terminée à 15:19:33 UTC |
| Quatre fichiers XLSX | Téléchargés et comparés octet par octet aux fichiers validés à 15:19:35 UTC |
| Site et accès privés | Version 0.26.0 accessible ; commandes privées anonymes refusées à 15:20:04 UTC |
| Navigateur | Accueil rechargé, pied de page GN Engine 0.26.0 confirmé |

Application : https://gn-engine.web.app/#/ . Aucun import n’a été effectué dans une partie réelle pendant la validation. Les parcours authentifiés de ce lot sont vérifiés par les tests HTTP et Firebase ; l’observation du navigateur porte sur l’accueil public.

## Limites

Les tests utilisent des données synthétiques et des émulateurs, sans modification des parties réelles. La recette avec plusieurs téléphones et comptes réels reste ouverte. Les classeurs n’ont pas été testés dans les applications natives Excel et Google Sheets.

Imports réservés à PREPARATION avant lancement. Pas d’annonces, entrepôts, vaisseaux, progression XP ni notifications DIRECT/DISCRET dans ce format. Une récompense existante en session ne se modifie pas : utiliser le réapprovisionnement MJ pour un apport ou créer un nouveau lieu. Le caractère pillable d’un modèle n’altère pas les lots déjà détenus. Les exemples sont fictifs et ne configurent pas automatiquement le canon de Port-Brèche.
