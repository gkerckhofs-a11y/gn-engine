# L1d — Masters Vaisseaux, Cours et Événements économiques

Tranche du candidat **0.37.0**, sur `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Aucun déploiement. Le socle `main` vérifié à la reprise reste `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0). L1c, parent distant `2c86ea8e36c76db9f77e34ca46b9430518e9955e`, a passé sa [CI](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39762325938) avant cette tranche : 681 tests applicatifs et 542 tests Firebase.

## Périmètre et parcours

L1d ajoute trois feuilles à l’espace Master existant : **Vaisseaux** dans Spatioport, **Cours** et **EvenementsEco** dans Économie / Stockage. Avec les tranches précédentes, treize feuilles ont un éditeur en ligne, dont Tarifs dans son entrée dédiée. L1 reste ouvert.

Le propriétaire choisit une feuille, recherche ou filtre, consulte, crée ou modifie une fiche, renseigne un motif, puis vérifie l’aperçu avant confirmation. L’archivage reste réversible par modification ; aucune suppression durable n’est introduite. L’export contient **Meta + la feuille affichée**, dans le périmètre du filtre, pour une destination et une révision précises.

| Feuille | Édition | Protection particulière |
| --- | --- | --- |
| Vaisseaux | Propriétaire personnage/groupe, capacité de soute, ouverture, carburant, réservoir, valeurs initiales | Cargaison, carburant et position acquis conservés ; trajet en cours bloquant ; duplication fermée sans stock |
| Cours | Objet du catalogue, prix unitaire explicite et activation | L’identifiant est celui de l’objet : création limitée aux objets publiés non cotés, identité immuable, aucune duplication |
| EvenementsEco | Effets sur marchandise ou route ; déclenchement manuel ou installation hors service | Champs conditionnels, retrait explicite des anciens effets lors d’un changement de cible, duplication désactivée |

Le formulaire de vaisseau adapte la liste des propriétaires au type choisi et vide l’ancienne sélection si ce type change. Le carburant référence les objets consommables empilables existants, hors recharges laser. Un vaisseau peut rester une simple soute sans navigation. Une navigation déjà configurée ne peut pas être supprimée ; le serveur conserve cette règle.

En scénario, les valeurs initiales restent éditables. Pour un vaisseau de session déjà navigable, ni l’état à quai, ni le carburant initial, ni le port initial ne figurent dans le formulaire ou l’export. Une première activation de navigation sur une soute existante exige ses valeurs initiales, puis les modifications suivantes ne redistribuent pas de carburant. Dupliquer un vaisseau demande de ressaisir carburant et port initiaux et n’embarque aucun lot existant.

Pour les cours, un objet ayant un cours archivé reste exclu de la création : il faut réactiver sa fiche. Pour les événements, les variations sont saisies explicitement, y compris zéro. Les bornes techniques existantes (-100 à 1000 %) sont conservées ; aucun barème Outcasts n’est fixé. Les effets masqués devenus incompatibles sont remis à zéro ou retirés dans le même import. Le passage à un déclenchement manuel retire la référence d’installation.

## Architecture et compatibilité

- Collections réutilisées : `ships`, `commodityPrices`, `priceEvents`. Les listes de choix lisent `characters`, `groups`, `items`, `routes` et `fieldTargets`, sans copie métier ni collection nouvelle.
- Le formulaire produit les colonnes du format Master 1 et passe par `prepareMasterImport` / `applyMasterImport`. Validation des références, aperçu, confirmation, transaction, versions, audit et réessais restent ceux des imports.
- Le serveur fournit les identifiants des nouveaux vaisseaux/événements et les prochaines versions. Un cours utilise obligatoirement l’identité existante de l’objet. Deux modifications concurrentes ne peuvent pas écraser silencieusement la même définition.
- Les validations existantes refusent un réservoir trop petit pour le carburant restant, une soute trop petite pour sa cargaison, un changement de propriétaire de soute chargée et toute modification en trajet.
- L’écriture par Master de session reste limitée à la préparation initiale. Après lancement, lecture/export et outils de régie conservent leurs contrôles respectifs.
- Aucune modification des comptes, transactions, stocks, profils acquis, accès privés ou QR. Les quatre XLSX Campagne/Session, modèles et exemples, conservent leurs empreintes SHA-256 de L0.
- Aucun changement de schéma, migration, règle, index ou droit Firebase. Workflows et `.github/deploy-request.json` inchangés. Retour au code L1c possible sans migration ; il n’annulerait pas les définitions modifiées ultérieurement par l’organisateur.

## Validation exécutée

Contrôles locaux du **22 octobre 2026**, Node **24.19.0** :

- `npm test` : **692 tests réussis**, aucun échec, annulation ou test ignoré.
- `npm run build` : réussi.
- Sept nouveaux scénarios métier partagés mémoire/Firestore : contrats et accès ; identité et cycle de vie des cours ; conversion des événements ; duplication des vaisseaux ; conservation des acquis et première navigation ; refus de capacité, propriétaire, trajet et références ; concurrence et réessai.
- Quatre nouveaux tests de rendu/contrôleur : identité des cours, propriétaires et initialisation des vaisseaux, effets conditionnels et bornes, aperçu/correction/confirmation de la bonne feuille.
- Empreintes des quatre Masters historiques inchangées ; contrôle du diff sans erreur d’espaces.

Preuves : [suite métier partagée](../test/support/master-transport-economics-editors-suite.mjs), [formulaires](../test/master-editors-ui.test.mjs), [contrôleur](../test/master-upload-ui.test.mjs). Les tests généraux de campagne, transactions, permissions et imports restent exécutés avec la suite complète.

La CI Node 22 / Java 21 exécutera les tests applicatifs et `test:emulator` sur le commit de ce lot. Sa conclusion, les décomptes réels, le commit exact, l’heure et le lien du job seront consignés dans la PR après lecture des journaux. Les résultats de L1c ne sont pas attribués à L1d.

## Recette humaine prévue en environnement de test

| Cas | Résultat attendu | État |
| --- | --- | --- |
| Choisir chaque feuille depuis les deux modules, sur ordinateur et téléphone | Navigation claire, bonne destination et état de lecture/écriture | Non exécuté |
| Modifier le propriétaire et activer la navigation d’une soute | Choix cohérents, valeurs initiales explicites, aperçu avant confirmation | Non exécuté |
| Modifier puis dupliquer un vaisseau de campagne chargé | Acquis conservés sur l’original ; nouveau vaisseau fermé, sans cargaison | Non exécuté |
| Créer, archiver et réactiver un cours | Un cours par objet ; aucun doublon ni déplacement d’identité | Non exécuté |
| Transformer un événement marchandise en événement route et changer son déclencheur | Effets précédents retirés ; motif et saisie conservés ; activation explicite | Non exécuté |
| Exporter un filtre puis ouvrir dans Excel/LibreOffice et réimporter | Colonnes du contrat, aucune donnée jouée, refus d’une mauvaise destination | Non exécuté |
| Confirmer depuis deux fenêtres et après coupure réseau | Une seule écriture, refus d’une révision périmée, reprise compréhensible | Non exécuté |

Les tests de rendu/contrôleur ne constituent pas une recette visuelle dans un navigateur. Aucune recette Android/iOS, ouverture humaine Excel/LibreOffice ou mesure de charge n’est revendiquée.

## Limites et suite

Cette tranche édite les **vaisseaux possédés déjà gérés par le moteur**. Elle n’ajoute pas de catalogue de modèles, achats/ventes de vaisseaux, passagers, protection, interceptions, combats, transfert de butin ou réparation obligatoire : ces exigences du spatioport restent dans L5. Les paramètres `astroport_id`, économie/monnaie et les opérations de régie restent accessibles par leurs parcours existants.

Les autres feuilles, paramètres, exports complets, comparateur et historiques consolidés restent dans [L1](L1-ATELIER-MODULAIRE.md). Les exigences `[V]`, propositions `[P]` et arbitrages `[A]` sont conservés dans la [matrice](MATRICE-V2.md) ; aucun arbitrage de jeu définitif n’est introduit. La recette finale isolée, le rapport global et la procédure de déploiement restent à réaliser en fin de développement selon [AGENTS.md](../AGENTS.md), avant toute autorisation de production.
