# SO-06b — reprise V3.2 et préparation des recettes

23 octobre 2026 — candidat 0.37.0, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). **Tranche d’édition des brouillons ; module Recettes & Potions complet non livré.** Aucune publication en production, aucune migration implicite et aucune recette humaine revendiquée.

## Audit de reprise

| Élément vérifié avant modification | Constat |
|---|---|
| `main` | `03eaace155b052d1b7d1960347746e9ee60ed514`, version 0.36.0 |
| Branche courante | `c5b18d72713f1273dd7456607e44bc7d19a8531a`, version 0.37.0 ; arbre `0a35b4e52b968fbc7eecf8aa173bf6a0d50b0cd2` identique au checkout local propre |
| PR #1 | Ouverte, brouillon ; L1a–m, SO-06a et SO-01a conservés |
| Autres branches | `codex/mission-participation-0.18` à `7072cda44252d2fded85bfe9661240140eed0a61` ; `codex/open-bounties-0.17` à `787ffbdc3d17b768a0bb44aab6a4d1bb015a871a` ; aucune modifiée |
| CI du parent | [Push 39947200211](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39947200211), [PR 39947205368](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39947205368) : succès, 778 applicatifs et 600 émulateurs. Ce sont les preuves du parent, pas du nouveau commit |
| Dernier déploiement observé dans Actions | [39731774273](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39731774273), succès le 22 octobre à 06:24:29 UTC, SHA `d5334d8dfcb493421c9bd4efaf83c50eb56e373f`. Aucune lecture de données ni contrôle privé de production effectué |
| Séparation des workflows | `check.yml` : push/PR, build, tests et émulateurs `demo-gn-engine`. Déploiement : lancement manuel ou changement du marqueur sur main. Aucun workflow, marqueur, droit ou paramètre Firebase modifié |

Lecture du CDC Markdown intégral, des sept feuilles du tableur (valeurs, formules, validations et états), des passages TOXI du livre et du rapport de cohérence historique. Le DOCX V0.7 joint est identique octet pour octet au livre intégralement lu en SO-01a : la lecture précédente reste applicable. Les pièces ne constituent pas des preuves d’exécution de l’application.

| Source | Copie / provenance | SHA-256 |
|---|---|---|
| `SO_CDC_V32.md` | [Copie exacte](source/SO_CDC_V32.md) | `4cbbef8e2a06851f416635ef725fc40b0b9bdc176e2c65535876f6065d043fa0` |
| `SO_CDC_V32(1).docx` | Pièce jointe complémentaire ; en-tête V3.1 résiduel, cadrage Markdown V3.2 retenu | `9279df89229b7c5f551da91c5075709182387f3d9bf5af4bee86e23856fcc141` |
| `SO_Regles_V07(1).docx` | Même source que [SO-01a](SO-01A-NATURES-SOINS.md), [texte intégral existant](source/SO_Regles_V07.txt) conservé | `7f9cb723e5395d643dffa636a626498fe01d1b1f3a8c421a88a60c2725b1fd73` |
| `SO_Recettes(1).xlsx` | [Extraction complète en lecture seule](source/SO_Recettes_V3_2.json), sans réécriture du classeur fourni | `40ec4c2027223d3901d2a94b452c723ee82c5758a8da9a0b7822423e2c5793bf` |
| Rapport de cohérence V0.6 | [Historique](source/SPACE_OUTLAWS_V0_6_Rapport_de_coherence.txt), relu | Source historique ; ne prévaut pas sur V0.7 |

Le cahier conserve quelques mentions éditoriales V0.6 et une référence à un rapport V0.7 non fourni ; elles ne remplacent pas les sources demandées. `SO_Boutique.xlsx`, cité comme origine des propositions, n’a pas été fourni ni prétendu lu. A01–A38 et FOR-01 restent clos. Breach Port est le libellé narratif retenu ; aucun identifiant historique n’est renommé.

## Raccordement aux lots

| Lot V3.2 | Travail préservé / réutilisable | État après cette tranche |
|---|---|---|
| SO-00 | Audit L0, SO-00, inventaire GitHub et sources | Mise à jour V3.2, matrice et contrat proposé audités |
| SO-01 | Fiches, classes, compétences, PA, soins ; SO-01a natures | Profil canonique, XP, dotations protégées, mort et statut PNJ Force restent ouverts |
| SO-02 | QR, `field-actions`, `person-actions`, horloge, réservations, `knowledge` | Laboratoire, déblocages et action TOXI à intégrer ; aucun pouvoir FOR livré |
| SO-03 | Items individuels, propriété, réparation terrain | Modules droïdes et états séparés restent ouverts |
| SO-04 | Ships, routes, voyages, fret et comptes | Chaîne spatiale V0.7 reste ouverte ; pas de remplacement des navires existants |
| SO-05 | Inventaire commun, marchés, ventes, prix, contrats et caisses | Les ingrédients/produits préparés sont des `items` ordinaires en brouillon ; aucune offre, monnaie ou dose créée |
| SO-06 | Masters L1, export global SO-06a, versions, archives et campagnes | SO-06b ajoute édition/export/import des recettes en brouillon ; A38 et validation globale restent ouverts |

## Contrat proposé adapté au dépôt

Le format Master reste **1**. Ajout d’une feuille `Recettes` dans la vue Boutiques ; les quatre fichiers historiques ne sont pas régénérés. Les imports historiques sans cette feuille restent valides et ne créent aucune recette. La collection `recipes` contient uniquement des définitions de formules ; ingrédients et produits restent dans `items`, et les biens réellement possédés dans `inventory`.

| Proposition du XLSX | Contrat de cette tranche | Limite explicite |
|---|---|---|
| Ingrédients | `Objets.id`, nom, description, consommable, unité, publication et notes MJ | Rareté, provenance, vente et prix proposés conservés comme notes de brouillon ; pas de cours ni autorisation commerciale structurée |
| Recettes | `Recettes`, identité/version/opération du Master, type, niveau 1–5, produit, effet proposé, références terrain/connaissance, prix indicatif et notes | `DRAFT` uniquement ; recette incomplète possible pour préparer le contenu |
| Compositions, une ligne par ingrédient | Cellule `composants` au format `objet_id:quantité;autre_id:quantité`, contrôles et sélection guidée | 20 modèles distincts maximum ; IDs COMP du modèle conservés dans les notes de provenance de l’exemple, pas comme deuxième table métier |
| Effets autorisés | `effet_id` préparatoire, sans code exécutable | Registre fermé et exécution non livrés. Même `STAT-MALAISE-01` ne permet pas la publication |
| Laboratoires QR | `laboratoire_lieu_id` référence facultative à `fieldTargets` existant | Un lieu pressenti ne devient pas un laboratoire actif. LAB-BP-01 inactif/QR absent du modèle n’est pas créé comme installation arbitraire |
| Déblocages | `connaissance_id` référence préparatoire au catalogue `knowledge` | Aucun reçu, droit individuel/groupe/faction ou déblocage par mission créé. La feuille fournie ne contient aucun droit attribué |
| Formules de coût | Conservées dans l’extraction source, exclues de l’exemple adapté | L’import Master continue à refuser les formules. Aucun `VLOOKUP`/`IFERROR` n’est évalué ni utilisé pour masquer une référence absente |
| Meta / diff / version | Métadonnées de la destination, versions par ligne, aperçu et confirmation existants | Le XLSX original n’est pas importable directement. Utiliser l’exemple adapté téléchargeable ou l’export de cette version du moteur |

L’exemple adapté reprend les 10 ingrédients, 5 produits et 5 recettes, soit 20 créations de définitions, toutes en brouillon. Les 17 composants restent inchangés. Les prix 75/110/135 et les prix d’ingrédients sont des propositions ; N4/N5 restent sans prix ni effet. Aucun identifiant existant n’est remplacé automatiquement : une collision de création est refusée et doit être rapprochée explicitement avant import. Aucun nouvel identifiant de compétence TOXI n’est inventé.

## Parcours organisateur livré sur branche

1. Ouvrir **Boutiques → Rubriques du Master → Recettes & Potions — brouillons**. Créer les ingrédients et produits nécessaires dans le catalogue commun des objets, consommables sans recharge laser.
2. Créer la recette, choisir le produit et les composants/quantités. Les références facultatives à compétence, lieu et connaissance servent à préparer le raccordement ultérieur ; elles ne donnent aucun droit de jeu.
3. Vérifier le diff, saisir le motif puis confirmer. Le serveur valide types, références, version et révision de destination. Une interruption avant commit ne laisse pas un demi-import ; un réessai du même requestId retrouve son résultat.
4. Modifier, dupliquer en brouillon, archiver ou réactiver par le même circuit. Un ingrédient encore utilisé par une recette non archivée ne peut pas être archivé ou rendu incompatible depuis l’éditeur d’objets historique. Une quantité nulle, fractionnaire, négative ou un doublon d’ingrédient est refusé.
5. Exporter les recettes affichées seules, ou préparer l’export groupé puis choisir **Recettes et leurs objets**. Ce sous-Master comprend toutes les recettes et leurs produits/composants référencés ; les objets sans usage dans ces formules sont exclus. L’export Boutiques complet conserve tous les objets, y compris les ingrédients inutilisés. L’export global conserve les six vues.
6. Pour essayer le modèle de départ, télécharger **l’exemple SO_Recettes adapté — brouillon**, relire les IDs et l’importer avec aperçu. Le téléchargement n’écrit rien. Le sous-Master de l’exemple déjà importé comporte 14 objets, car ING-03 n’entre dans aucune composition ; le modèle initial et l’export Boutiques en contiennent 15.

Le Master est réservé au propriétaire ; MJ, accueil et joueurs n’obtiennent pas ces brouillons via son API. Aucun catalogue de recettes joueur n’est exposé. En session, l’édition demeure réservée à la préparation avant le premier lancement. Les versions figées, archives scénario et copies d’épisode conservent les définitions sans créer de lots, soldes ou droits. Les lots historiques gardent leurs snapshots.

## Vérifications

Local, Node **24.19.0**, 23 octobre 2026 : **793 tests applicatifs réussis**, 0 échec, 0 ignoré/annulé/todo ; `npm run build` réussi. Logs complets : [tests](verification/so-06b-npm-test.log) et [build](verification/so-06b-build.log). `git diff --check` réussi. Les 778 tests antérieurs sont inclus, pas additionnés aux 793.

Quinze nouveaux tests : onze cas métier partagés par `mastersSuite` mémoire **et** Firestore, trois cas UI/contrat source et un contrôleur. Couverture : CRUD, XLSX, exemple, pas de lot/crédit, rejet des publications, références, double clic, réponse perdue simulée, rollback avant commit, conflit de révision, rôles, isolation, scénario/version/session/campagne/archive et fermeture de l’import après briefing. Les erreurs de fixture rencontrées pendant la rédaction des tests ont été corrigées avant la suite complète ; aucune suite échouée n’est comptée comme preuve positive.

**CI du commit à constater après push** : build, `npm test`, `npm run test:emulator`, Node 22 / Java 21, projet `demo-gn-engine`. Résultats finaux, SHA, runs/jobs et décomptes consignés dans la PR une fois terminés. Java local 17 : aucun succès d’émulateur local revendiqué. Les essais simulés de requête interrompue ne sont pas une preuve de réseau mobile réel.

Les quatre Masters historiques conservent leurs SHA-256, revérifiés après build :

| Fichier | SHA-256 |
|---|---|
| Exemple Campagne | `4153682948869ab96568acc463d8c3fd28cba46adcd838065d6debe0865d8a67` |
| Exemple Session | `823fc93ec6cbbf86fbca368452aff587286d2a90031a362aa883b6941328dc96` |
| Master Campagne | `09fc513f054444170d08a4c8ed4a21244b12ac442ebfce51479090e4b23d394a` |
| Master Session | `d1ba99664a227a54faf6522e10f4943f9144b5cffd0b2ab9b1b97b11a3bb856b` |

## Risques, migration et suite

Aucune conversion ou initialisation des anciennes données. Ajout optionnel de `recipes` aux lectures/copies ; une ancienne archive sans cette collection devient une liste vide. Aucun besoin de règle/index Firebase nouveau pour cette tranche. Les limites Master de 250 lignes/1 Mio et snapshot de 500 définitions restent applicables, recettes incluses. Les nouvelles lectures de recettes lors d’une sauvegarde d’objet ont un coût proportionnel à ce catalogue ; aucun essai de charge réel n’est revendiqué.

Avant tout retour à un ancien code qui ignore `recipes`, sauvegarder les définitions et ne pas figer/exporter/copier de campagne avec ce code : une ancienne version ne saurait recopier cette nouvelle collection. Conserver le candidat ou apporter un correctif compatible ; ne jamais supprimer les collections pour « revenir en arrière ». La procédure [sauvegarde/reprise/déploiement](SO-SAUVEGARDE-DEPLOIEMENT.md) reste à faire valider.

Prochaine tranche cohérente : laboratoire via le routeur QR et le moteur d’actions existants, droits de découverte via `knowledge`, réservations de PA/composants, consommation et dose unique à l’achèvement, interruption et idempotence. Ensuite : activation volontaire, état Malaise, antidotes compatibles et commerce du même lot. Les effets, habilitations et snapshots de version doivent être livrés ensemble avant de lever le blocage serveur de publication. Les recettes complètes REC-SO-REC-02/03/04 ne sont pas exécutables dans SO-06b ; REC-01 et REC-05 n’ont que la couverture automatisée indiquée dans la matrice. Les 24 REC-SO et 6 FOR ne sont pas validés par cette tranche.

## Recette manuelle de la tranche à exécuter

Sur un environnement de test isolé identifié, avec comptes fictifs : créer un ingrédient et une recette, corriger depuis le diff, confirmer puis réimporter le fichier deux fois ; comparer comptes, lots et ancienne session. Exporter le sous-Master et le catalogue global, vérifier les dépendances, modifier une quantité et réimporter. Tenter l’accès comme joueur/MJ/accueil et depuis une autre session. Réessayer après fermeture de fenêtre et coupure réseau autour de la confirmation ; contrôler l’historique avant une nouvelle requête. Refaire sur Android/iOS et consigner SHA, rôle, appareil, date, captures, constat et verdict. **Cette recette n’a pas été exécutée dans cette tranche.**
