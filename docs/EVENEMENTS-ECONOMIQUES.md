# Conséquences économiques des événements — 0.33

Un événement peut modifier les cours, suspendre le commerce d’une marchandise ou perturber une route spatiale. Il se prépare dans le master puis se pilote depuis **Régie → Cours et événements**. Aucun événement ni tarif de production n’est créé par la mise à jour.

## Configurer un effet

Choisir une cible, un nom et une explication visibles des joueurs. Le motif de modification et l’installation qui déclenche l’effet restent réservés au MJ. Relire l’aperçu avant/après puis confirmer. Les droits de régie et la révision sont contrôlés à nouveau à l’enregistrement.

| Cible | Effets disponibles | Application |
| --- | --- | --- |
| Marchandise | Variation du cours, suspension du commerce | Un modèle d’objet, y compris le carburant |
| Route | Variation de carburant et de durée, suspension des départs | Un trajet à sens unique |

Un événement porte une cible. Pour affecter plusieurs ressources ou les deux sens d’une route, créer plusieurs événements. Ils peuvent partager la même installation de déclenchement.

**Manuel** : l’effet s’applique dès que l’événement est activé, jusqu’à sa désactivation.

**Pendant une panne** : l’événement activé s’applique seulement si l’installation publiée est effectivement hors service. Un sabotage réussi peut donc provoquer les conséquences. La réparation ou l’expiration de la panne retire l’effet automatiquement. La pause suspend le temps de panne. Aucune tâche planifiée n’est nécessaire : l’état est recalculé à la lecture et avant chaque action concernée. Actualiser les écrans pour voir le nouvel état.

## Marchandises et disponibilité

La variation du cours conserve les règles de la 0.32 : pourcentages additionnés sur la base, calcul entier exact, arrondi au crédit le plus proche, minimum d’un crédit. Elle exige un cours actif compatible et concerne les annonces indexées. Un prix fixe conserve son montant.

**Suspendre le commerce** bloque les nouvelles propositions privées, les nouvelles annonces et les paiements de cette marchandise, à prix fixe comme indexé. Ce réglage fonctionne même sans cours. Il ne supprime aucun lot et ne transforme pas une quantité en rupture fictive : la disponibilité physique reste celle des stocks réels du moteur.

Les offres existantes restent visibles avec le motif public de suspension. Le vendeur conserve la possibilité de retirer son annonce ou d’annuler sa proposition. Les réservations expirent selon leurs règles habituelles. Une levée de suspension rend l’offre de nouveau achetable si le lot, les droits et l’échéance restent valides.

Les objets déjà payés restent retirables, sans nouveau paiement. Les dons, transferts de crédits, déplacements de stocks, soins et consommations ne sont pas interdits par cette règle commerciale. Un don accompagné d’un virement reste donc possible : cette fonction représente une suspension du marché de l’app, pas une police automatique des échanges joués sur le terrain.

## Routes, carburant et durée

Les variations de carburant et de durée s’additionnent séparément sur les valeurs de base de la route. Chaque pourcentage est un entier de −100 à +1 000. Le résultat est arrondi à l’unité supérieure : minimum de zéro unité de carburant et d’une seconde de jeu. Les calculs utilisent des entiers exacts et bloquent une valeur dépassant la capacité numérique du moteur.

Exemple fictif : une route coûte 3 unités et dure 300 secondes. Un événement de +50 % de carburant et +25 % de durée produit **5 unités et 375 secondes**. Un second effet de −25 % de carburant donne un cumul de +25 %, soit **4 unités**, toujours calculé sur la base de 3.

Le pilote voit la route affectée, les effets publics, le coût courant et le délai avant confirmation. Une suspension des départs rend la route indisponible, même si le réservoir est plein. Le plein reste possible à l’astroport avec du carburant déjà détenu.

Le serveur relit les effets au départ. Une confirmation périmée est refusée sans consommer de carburant. Le départ confirmé prélève une seule fois le coût et fige la durée, le coût de base et les effets utilisés dans le voyage. Un événement ultérieur ne modifie pas ce voyage. Le retour utilise ses propres conditions au moment de son départ.

## Masters, versions et campagnes

Les quatre XLSX comportent deux nouveaux onglets, au format 1 compatible avec les anciens masters :

- **Cours** : `id` du modèle d’objet, `operation`, `version`, `prix_base`, `actif`.
- **EvenementsEco** : identité, textes publics, `cible_type`, `objet_id` ou `route_id`, variations, suspensions, `declenchement`, `installation_id`, `actif`.

Les pourcentages s’écrivent comme des entiers : **25 signifie +25 %**, pas 0,25. Les booléens utilisent OUI et NON. Une cellule vide conserve la valeur existante. Une ligne absente ne supprime rien. ARCHIVER désactive une définition sans effacer son historique.

Pour changer le type de cible d’un événement, effacer l’ancienne référence avec `!EFFACER`, remettre ses anciens effets à 0 ou NON et renseigner la nouvelle cible. Un mélange d’effets marchandise et route est refusé. Une création doit préciser le déclenchement. Sans valeur `actif`, un nouvel événement reste désactivé.

Le master CAMPAGNE prépare le scénario. La publication en fige les définitions ; une session ou campagne créée depuis cette version les reçoit. Les exports/imports de scénario les conservent, sans état de panne ni historique d’exécution. Les anciennes archives sans ces collections restent lisibles.

Le master SESSION modifie les définitions pendant la préparation, avant le premier lancement. Il ne remplace ni les comptes, ni les lots, ni les acquisitions déjà jouées. Pendant le jeu, utiliser la régie. Les épisodes suivants reprennent cours et événements avec les autres données de campagne.

Les exemples sont fictifs. Le cours de démonstration est ouvert, les trois événements proposés sont désactivés. Les modèles vierges ne configurent aucun effet.

## Périmètre restant

La négociation avec contre-offres, les taxes et droits de douane, la corruption, les frais d’entretien, les vendeurs PNJ et les variations automatiques selon les volumes échangés restent à développer. Les événements de ce lot ne créent aucun stock ni crédit et ne changent aucun loyer.

La validation automatique couvre règles, transactions et imports. La recette privée sur téléphones, les QR physiques et un essai simultané avec 60 joueurs restent nécessaires avant la partie.
