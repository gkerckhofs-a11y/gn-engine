# Validation 0.36 — Tarifs dans les masters

État : version publiée et vérifiée le 22 octobre 2026. Compilation, 648 tests applicatifs et 522 tests Firebase réussis, soit **1 170 tests**, sans échec, annulation ou test ignoré.

Le lot ajoute l’onglet Tarifs aux quatre XLSX, le contrôle serveur et l’héritage des définitions dans les versions, archives et sessions. Les montants des exemples sont fictifs et désactivés. Le format du master reste 1.

Les tests partagés exécutent l’import, le réimport sans effet, les montants invalides et manquants, les bénéficiaires, le plafond de 50 règles, l’archivage, les références actives, les comptes de session, les confirmations périmées, l’héritage et le règlement utilisant un tarif importé. Ils tournent en mémoire et dans la porte de déploiement Firebase.

Les quatre classeurs sont importés et édités avec Artifact Tool, puis recalculés, inspectés et rendus. Les 22 onglets importés préexistants de chaque fichier ont été comparés au XML original : valeurs, styles, validations et volets sont inchangés ; seuls Guide, Dictionnaire et le nouvel onglet Tarifs sont concernés. Les rendus des nouveaux tableaux, du guide et du dictionnaire ont été inspectés. Leurs exemples sont également lus par le lecteur XLSX de l’app et appliqués par le moteur dans les tests.

La recette privée sur téléphone et la charge réelle à 60 joueurs restent ouvertes. Aucun scénario de production, stock ou tarif de jeu n’est ajouté automatiquement.


## Traçabilité du lot

- Source : [9db9043](https://github.com/gkerckhofs-a11y/gn-engine/commit/9db9043f84eed016fe6777308de8afde9cd1da9d).
- Arbre source : `6466e22da2b38461d7714d35e23fc00e4a2a6f15`.
- Demande de publication : `d5334d8dfcb493421c9bd4efaf83c50eb56e373f`.
- Porte de publication : [exécution GitHub 39731774273](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39731774273).

## Scénarios de contrôle ajoutés

1. Import et aperçu sans écriture, bénéficiaire lisible, réimport sans effet, archives nettoyées et ancienne archive compatible.
2. Montants obligatoires, zéro explicite, négatifs, décimaux et débordements refusés ; références et caisses absentes ; 50 tarifs maximum, aucune application partielle.
3. Modification partielle, effacement d’un filtre, changement explicite de type de bénéficiaire, archivage puis réactivation.
4. Dépendances actives protégées, caisse de groupe préconfigurée, alias public dans le devis.
5. Version immuable, session indépendante et campagne ; modification de session sans redistribution, reprise dans l’épisode suivant.
6. Nouveau bénéficiaire créé dans la session, contrôle du compte courant et refus d’un aperçu périmé.
7. Tarif importé utilisé par le moteur de règlement ; devis figé, débit exact, écritures conservées et import fermé après la préparation.

Les tests XLSX existants lisent les quatre fichiers livrés, vérifient l’onglet Tarifs et appliquent les deux exemples avec trois tarifs désactivés à l’arrivée. Les suites précédentes de cargaison et de douane continuent de couvrir la réception réelle, les permissions, la concurrence et les pannes transactionnelles.


## Résultats de publication

Heures ci-dessous : Europe/Brussels (UTC+2), le 22 octobre 2026.

| Contrôle | Résultat | Heure |
| --- | --- | --- |
| Compilation de la porte de publication | Réussie | 08:05:38 |
| Tests applicatifs | 648 réussis, aucun échec ou test ignoré | 08:05:54 |
| Tests Firebase | 522 réussis, aucun échec ou test ignoré | 08:21:31 |
| Fonction en Belgique | Publiée | 08:23:37 |
| Règles, index et hébergement | Publiés | 08:23:46 |
| Quatre masters en ligne | Octets identiques aux XLSX validés | 08:23:47 |
| Version et API privée | 0.36.0 accessible, requêtes anonymes refusées | 08:24:24 |

Jobs de la porte : vérification `119668212581`, publication `119673547586`, tous deux terminés avec succès. L’accueil public a été rechargé dans le navigateur et affiche **GN Engine · 0.36.0**. Cette preuve de version ne constitue pas une recette visuelle des écrans privés.

![Accueil public de GN Engine 0.36.0](images/masters-douanes-0.36.0.jpg)
