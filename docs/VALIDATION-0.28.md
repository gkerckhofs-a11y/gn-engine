# Validation GN Engine 0.28.0 — logistique

20 octobre 2026. Suite du développement demandée après l’habillage galactique. [Périmètre et configuration](LOGISTIQUE.md).

## Vérification locale

Les tests métier de logistique couvrent : location confirmée et paiement unique, caisse bénéficiaire et retrait monétaire, droits de caisse, comptes tiers et accès révoqués, confidentialité du stock et des groupes secrets, capacité et concurrence, mouvements partiels, corrections MJ, expiration et pause, renouvellement, fermeture, restitution, refus de vente/utilisation d’un lot stocké, réception physique avant ouverture de recharge, doubles clics, panne transactionnelle et continuité entre épisodes.

Les tests d’interface couvrent les routes, les formulaires, les confirmations, l’échappement des textes, les états indisponibles et l’absence d’actions dans la prévisualisation MJ. Les quinze tests métier sont également raccordés à la suite Firestore émulée.

Compilation locale réussie ; **542 tests applicatifs réussis**, sans échec ni test ignoré. Le poste de travail dispose de Java 17 ; la suite Firebase a donc été exécutée par la chaîne GitHub sous Java 21 et Node 22.

## Vérification avant publication

Source : `b79f6c3231e0517baec9699265e349945402763f`. Demande de publication : `06e1a332df81f40df03da21f6f59910d9b11a169`.

[Exécution GitHub Actions 39487642729](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39487642729). Job de vérification : `118852128550`, terminé avec succès. Job de déploiement : `118857567911`.

| Vérification | Résultat du 20 octobre 2026, heure UTC |
| --- | --- |
| Tests applicatifs | 542 réussis, 0 échec, 0 ignoré ; terminés à 19:56:21 |
| Intégrations Firebase | 436 réussies, 0 échec, 0 ignorée ; terminées à 20:06:54 |

Total : **978 tests réussis**. Les 22 fichiers ajoutés ou modifiés ont été comparés à leurs empreintes Git avant publication ; les autres fichiers et leurs modes, notamment les quatre masters XLSX, ont été conservés dans l’arbre du dépôt.

## Publication confirmée

Le job de déploiement et l’exécution complète ont terminé avec succès.

- Firebase Hosting : publication terminée à **20:08:47 UTC**.
- Quatre masters XLSX publiés et identiques aux fichiers validés : **20:08:50 UTC**.
- Version HTML, manifeste et refus des commandes privées anonymes en HTTP 401 / LOGIN_REQUIRED, y compris les nouvelles commandes de logistique : **20:09:28 UTC**.
- Accueil **0.28.0** confirmé dans le navigateur ; capture enregistrée à 20:09:13 UTC.

Aucune donnée de session réelle n’a été créée pour les tests. L’accueil public a été vérifié visuellement. La recette des nouveaux écrans privés avec comptes réels, sur téléphones et à environ 60 connexions reste ouverte. Les entrepôts partagés et l’import de leur configuration sont hors de ce lot, comme précisé dans le guide.

![Accueil publié de GN Engine 0.28.0](images/logistics-0.28.0.jpg)
