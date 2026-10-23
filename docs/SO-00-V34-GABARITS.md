# SO-00 V3.4 — rapprochement des sept gabarits V0.1

23 octobre 2026. **Contrat proposé uniquement ; aucun importeur ni gabarit certifié ajouté.** [Plan central](SO-00-V34-PLAN-CENTRAL.md).

Les sept fichiers sont des ZIP/XLSX lisibles, sans ligne métier, formule ou commentaire. Chacun comporte `LIRE_AVANT` et `PARAMETRES`. Le lecteur réel `web/master-xlsx.mjs` refuse chacun avec « Onglet non pris en charge par GN Engine ». Le contrôle ne s’arrête pas à renommer les feuilles : les identités, colonnes, droits et effets diffèrent. Résultats complets dans [la sonde](verification/so34-audit-probes.json).

`PARAMETRES` contient champ/valeur/commentaire : atelier_id, atelier_nom, scenario_id, profil_regles, version_centrale_base, brouillon_central_id, version_schema_preparation=0.1-PREPARATION, statut_fichier=BROUILLON, responsable, date_preparation. Le contrat courant exige `Meta` (format/version/type/destination_id/campaign_id/base_revision/module), `Parametres` (cle/valeur) et `id/operation/version` sur les lignes.

| Préparation V0.1 | Adaptation centrale proposée | État actuel |
|---|---|---|
| atelier_id | module_type=M1…M7 | Meta.module accepte six IDs historiques, pas M1…M7 |
| scenario_id | scenario_id + campagne de destination explicite | destination_id a une sémantique scénario ou session, pas brouillon |
| profil_regles | rule_profile | Aucun profil canonique fermé livré |
| version_centrale_base | central_base_version + révision du pointeur | base_revision désigne aujourd’hui la révision de destination |
| brouillon_central_id | draft_id + draft_revision | Pas de brouillon identifié par campagne |
| version_schema_preparation | schema_version + format/version certifiés | 0.1-PREPARATION n’est pas masterVersion=1 |
| responsable/date_preparation | Provenance documentaire facultative | Auteur/date réels calculés serveur, jamais autorisés depuis Excel |
| statut | Intention brouillon/contrôle/archivage explicite | Ni publication ni permission ; règles v1 CREER/MODIFIER/ARCHIVER préservées |
| absent | import_batch_id, campaign_id, IDs de commandes | À ajouter ; répétition identique sans effet, réutilisation divergente refusée |

Chaque ligne ci-dessous nomme le réceptacle réel lorsqu’il existe, et distingue les extensions manquantes. **Aucun champ non supporté ne sera abandonné silencieusement.** Les en-têtes complets sont transcrits pour permettre le rapprochement colonne par colonne ; les noms de modèles nouveaux restent des propositions.

## M1 — SO_M1_Economie.xlsx

SHA-256 : `c9ae7a678d2a9f599d0e21fbeb8f2134320e7197c0a55bfca327b56dfe2c22b6`.

### Objets

- En-têtes V0.1 : `objet_id`, `nom`, `famille`, `categorie`, `description`, `effet_id`, `niveau_min`, `vendable`, `volable_tire`, `pillable`, `volume_unitaire`, `prix_reference_cr`, `image_ref`, `statut`.
- Réceptacle : **Objets → items**.
- Rapprochement : objet_id→id ; nom/description/categorie/pillable/volume_unitaire conservables ; image_ref→image_media_id après validation média. Ajouter operation/version, unite/type/consommable/legalite explicites. famille, effet_id, niveau_min, vendable et volable_tire ne sont pas des champs v1 acceptés ; restrictions/effets fermés SO à développer. prix_reference_cr relève du Cours, pas d’un solde. statut BROUILLON ne se traduit pas en activation.

### Ingredients

- En-têtes V0.1 : `ingredient_id`, `objet_id`, `rarete`, `origine_fiction`, `restriction_vente`, `description`, `image_ref`, `statut`.
- Réceptacle : **Extension de items, pas une collection ingrédients**.
- Rapprochement : objet_id est la référence autoritative. ingredient_id ne doit pas créer un second objet : alias de préparation seulement, rapprochement explicite. rarete/origine_fiction/restriction_vente restent des propositions à typer ; description/image_ref redirigées vers la définition M1, collisions à signaler.

### Marchandises

- En-têtes V0.1 : `marchandise_id`, `objet_id`, `regime_douanier`, `prix_base_cr`, `volume_unitaire`, `condition_vente`, `statut`.
- Réceptacle : **items + Cours → commodityPrices**.
- Rapprochement : objet_id identifie l’objet et le cours ; marchandise_id ne crée pas un deuxième modèle. prix_base_cr→Cours.prix_base ; regime_douanier→legalite seulement après table explicite compatible. volume_unitaire appartient à items ; condition_vente SO reste à implémenter.

### Equipements

- En-têtes V0.1 : `equipement_id`, `objet_id`, `type_equipement`, `competence_requise`, `bonus_jeu`, `consommable`, `nombre_utilisations`, `restriction`, `statut`.
- Réceptacle : **items ; profil SO d’équipement manquant**.
- Rapprochement : equipement_id est une ligne descriptive référant objet_id. consommable correspond au booléen d’objet. type_equipement, competence_requise, bonus_jeu, nombre_utilisations, restriction ne sont pas un langage d’effets accepté ; intégrer uniquement des mécanismes canoniques existants, sinon bloquer.

### Modules_Droides

- En-têtes V0.1 : `module_id`, `objet_id`, `niveau_mec03`, `prix_cr`, `effet_id`, `emplacements`, `restriction`, `statut`.
- Réceptacle : **items ; configuration DR-01…06 nouvelle**.
- Rapprochement : module_id/objet_id à rapprocher explicitement ; niveau_mec03/prix_cr/effet_id/emplacements/restriction doivent être vérifiés sur V0.7. Pas de création d’instance équipée ni d’emplacement par import.

### Modules_Vaisseaux

- En-têtes V0.1 : `module_id`, `objet_id`, `gabarit`, `pourcentage_valeur`, `effet_id`, `niveau_mec03`, `rarete`, `statut`.
- Réceptacle : **items ; configuration modules de navire nouvelle**.
- Rapprochement : gabarit/pourcentage_valeur/effet_id/niveau_mec03/rarete exigent les profils canoniques fermés. Définition M1 référencée par M3 ; pas d’installation ni de paiement à l’import.

## M2 — SO_M2_Persos.xlsx

SHA-256 : `8d8679b1c9a3fe4f5da5e831fa8434bbf06515e4aaa890c0bd52af4f8ad2f92e`.

### Personnages

- En-têtes V0.1 : `personnage_id`, `prenom`, `nom`, `nature_humanoide_droide`, `classe`, `faction_id`, `statut_pnj_joueur`, `orientation_force_pnj`, `portrait_ref`, `bio_publique`, `bio_privee`, `statut`.
- Réceptacle : **Personnages → characters ; Attributions/Membres séparés**.
- Rapprochement : personnage_id→id ; bio_publique→description_publique ; bio_privee vers histoire/secrets selon choix explicite ; portrait_ref→portrait_media_id ; nature_humanoide_droide→nature avec valeurs HUMANOID/DROID. prenom/nom : conserver nom d’affichage historique, ajout du prénom distinct pour ROG à développer sans découpage implicite. classe/faction_id→références Attributions/Membres. statut_pnj_joueur/orientation_force_pnj manquants ; aucune attribution Force ni rôle serveur par cellule.

### Factions

- En-têtes V0.1 : `faction_id`, `nom`, `description`, `chef_personnage_id`, `visibilite`, `statut`.
- Réceptacle : **Groupes → groups ; Membres**.
- Rapprochement : faction_id→id ; nom/description/visibilite à normaliser. chef_personnage_id doit référencer un membre, ne donne pas automatiquement des permissions. Aucun compte collectif créé par cette définition.

### Competences

- En-têtes V0.1 : `attribution_id`, `personnage_id`, `competence_id`, `niveau`, `mode_acquisition`, `validation_mj`, `statut`.
- Réceptacle : **Attributions / abilityProfile, PAS feuille Competences v1**.
- Rapprochement : Ici chaque ligne est une attribution, alors que Competences v1 définit le catalogue. attribution_id + personnage_id + competence_id/niveau doivent être regroupés en choix de profil (identité historique conservée). mode_acquisition relève de progression SO encore absente. validation_mj ne donne aucun droit. Le catalogue canonique et les prérequis sont contrôlés serveur.

### Dotations

- En-têtes V0.1 : `dotation_id`, `personnage_id`, `objet_id`, `quantite`, `origine_kit`, `non_pillable`, `non_revendable`, `statut`.
- Réceptacle : **Propositions ; Dotations v1 seulement via conversion explicite**.
- Rapprochement : dotation_id→id ; personnage_id/objet_id/quantite ; type OBJET à préciser. origine_kit/non_pillable/non_revendable exigent provenance/protection SO. Dans le chemin central, aucune distribution. L’ancien import SESSION initialise effectivement les nouveaux personnages et ne peut être appelé directement.

### Relations

- En-têtes V0.1 : `relation_id`, `source_personnage_id`, `cible_personnage_id`, `type_relation`, `contenu_prive`, `statut`.
- Réceptacle : **Relations intégrées à characters**.
- Rapprochement : relation_id→id ; source_personnage_id→personnage_id ; cible_personnage_id→cible_id ; type_relation→titre seulement après choix ; contenu_prive→description en contrôlant visibilité. Le v1 publie ces relations individuellement ; statut ne donne pas accès au texte.

### Habilitations

- En-têtes V0.1 : `habilitation_id`, `personnage_id`, `type`, `niveau`, `lieu_id`, `debut_session`, `fin_session`, `statut`.
- Réceptacle : **Autorisations de JEU SO, distinctes de staff**.
- Rapprochement : habilitation_id/personnage_id/type/niveau/lieu_id/debut_session/fin_session : mandats douaniers et PNJ à implémenter. Ne jamais transformer ces colonnes en grants d’administration ni en IAM.

## M3 — SO_M3_Spatial.xlsx

SHA-256 : `6b47b4a771fbf3885b0151035ca445774332fab799c539b546e970a1f3ea9f27`.

### Modeles

- En-têtes V0.1 : `modele_id`, `nom`, `gabarit`, `prix_ref_cr`, `coque_max`, `boucliers_max`, `manoeuvrabilite`, `capacite_fret`, `passagers_max`, `carburant_max`, `slots_modules`, `statut`.
- Réceptacle : **Nouveau modèle de navire ; ships conservé**.
- Rapprochement : modele_id/nom/gabarit/prix_ref_cr/coque_max/boucliers_max/manoeuvrabilite/capacite_fret/passagers_max/carburant_max/slots_modules : presque tout manque au contrat actuel. Ne pas convertir un modèle en instance Vaisseaux. Adapter capacité fret 0, actuellement refusée par capacité de soute positive.

### Vaisseaux

- En-têtes V0.1 : `vaisseau_id`, `modele_id`, `nom`, `identite_publique`, `proprietaire_id`, `pilote_personnage_id`, `port_actuel_id`, `statut`.
- Réceptacle : **Vaisseaux → ships, proposition d’instance à séparer**.
- Rapprochement : vaisseau_id→id ; nom ; proprietaire_id nécessite proprietaire_type ; modele_id/identite_publique/pilote_personnage_id/port_actuel_id ne sont pas les mêmes champs que le v1. Configuration future et commande de création/achat distinctes ; aucun changement de propriétaire ni position d’un navire joué depuis Excel.

### Ports

- En-têtes V0.1 : `port_id`, `nom`, `code_navigation`, `niveau_risque`, `description`, `statut`.
- Réceptacle : **Références communes de navigation à typer**.
- Rapprochement : port_id correspond aux IDs départ/arrivée/homePort existants, actuellement chaînes sans catalogue de ports. nom/code_navigation/niveau_risque/description exigent définition minimale compatible, sans renommer les anciens IDs. Raccorder aux lieux communs, pas recréer des QR.

### Routes

- En-têtes V0.1 : `route_id`, `origine_port_id`, `destination_port_id`, `categorie_duree`, `niveau_risque`, `unites_carburant_base`, `code_route`, `statut`.
- Réceptacle : **Routes → routes**.
- Rapprochement : route_id→id ; origine_port_id→depart_port ; destination_port_id→arrivee_port. categorie_duree doit pointer la table V0.7, non un délai libre implicite. niveau_risque/code_route nouveaux ; unites_carburant_base n’est pas le coût fixe actuel sans facteur de gabarit. Départs existants gardent leur devis.

### Evenements

- En-têtes V0.1 : `evenement_id`, `nom`, `niveau_risque`, `type_effet_canonique`, `cible_autorisee`, `texte_joueur`, `statut`.
- Réceptacle : **Nouveau événement spatial ; EvenementsEco réutilisable pour certains effets**.
- Rapprochement : evenement_id/nom/niveau_risque/type_effet_canonique/cible_autorisee/texte_joueur : pas de correspondance automatique avec événement économique. Tables D6/résolution uniques V0.7 à implémenter ; aucun effet exécuté au simple import.

### Rencontres

- En-têtes V0.1 : `rencontre_id`, `route_id`, `pnj_faction_id`, `type_interception`, `condition_declenchement`, `statut`.
- Réceptacle : **Définition de rencontre à créer**.
- Rapprochement : rencontre_id/route_id/pnj_faction_id/type_interception/condition_declenchement : liens vers routes/groups et mécanisme spatial à compléter. Aucune création d’ennemi, budget ou interception en jeu par publication.

### Modules_Installes

- En-têtes V0.1 : `installation_id`, `vaisseau_id`, `module_id`, `statut_installation`, `condition_usage`.
- Réceptacle : **Proposition d’installation ; opération de jeu séparée**.
- Rapprochement : installation_id/vaisseau_id/module_id/statut_installation/condition_usage décrivent une instance/état, non un catalogue. Référencer le lot M1 réellement acquis et les capacités/MEC ; installation idempotente autorisée hors import, pas une copie du module.

## M4 — SO_M4_Recettes.xlsx

SHA-256 : `e3ad3fde137bb67f809c96965a9d0c8e1c5e93a7b6203dd51aad250a8c616221`.

### Recettes

- En-têtes V0.1 : `recette_id`, `nom`, `objet_produit_id`, `effet_id`, `niveau_toxi01_min`, `dose_produite`, `temps_min`, `cout_pa`, `recuperation_min`, `laboratoire_id`, `mode_decouverte`, `visibilite`, `statut`.
- Réceptacle : **Recettes → recipes SO-06b**.
- Rapprochement : recette_id→id ; objet_produit_id→produit_id ; niveau_toxi01_min→niveau_minimum ; effet_id conservable sans exécution actuelle ; nom. Ajouter operation/version/type et competence_id explicitement. dose_produite/temps_min/cout_pa/recuperation_min sont des contraintes 1/5/1/10 V0.7, pas des règles libres. laboratoire_id doit résoudre un fieldTarget/labo valide, pas être copié en qr_id ; mode_decouverte/visibilite à développer. Publication reste DRAFT tant que le moteur TOXI manque.

### Compositions

- En-têtes V0.1 : `compo_id`, `recette_id`, `ingredient_objet_id`, `quantite_positive`, `unite`, `substitution_autorisee`, `statut`.
- Réceptacle : **recipes.components, pas de collection de lots**.
- Rapprochement : recette_id rattache la ligne ; ingredient_objet_id + quantite_positive→composants objet_id:quantité. compo_id conservé en provenance, pas nouvelle identité d’ingrédient. unite doit correspondre à items.unit ; substitution_autorisee exige choix typé validé, aucune substitution libre implémentée.

### Effets

- En-têtes V0.1 : `effet_id`, `type_effet_v07_autorise`, `cible`, `duree_seconde`, `anti_cumul`, `antidote_compatible_id`, `statut`.
- Réceptacle : **Registre fermé d’effets SO à développer**.
- Rapprochement : effet_id référence une règle existante ; type_effet_v07_autorise/cible/duree_seconde/anti_cumul/antidote_compatible_id doivent correspondre au profil. Une ligne Excel ne crée pas une mécanique. Effet inconnu : diagnostic bloquant/inactif, aucun code exécuté.

### Laboratoires

- En-têtes V0.1 : `laboratoire_id`, `lieu_id`, `qr_id`, `niveau_acces`, `formules_autorisees`, `statut`.
- Réceptacle : **fieldTargets / profils terrain existants à étendre**.
- Rapprochement : laboratoire_id/lieu_id/qr_id/niveau_acces/formules_autorisees : pas de type LAB actuel. Raccorder lieu/QR déjà existants et profils d’actions, aucune huitième base ; identité QR émise/validée serveur.

### Deblocages

- En-têtes V0.1 : `deblocage_id`, `recette_id`, `type_destinataire`, `destinataire_id`, `source_mission_id`, `statut`.
- Réceptacle : **Références connaissance/personnage/groupe/mission, attribution séparée**.
- Rapprochement : deblocage_id/recette_id/type_destinataire/destinataire_id/source_mission_id : règles de découverte à préparer ; aucun reçu joueur distribué à l’import. knowledge conserve les reçus et secrets, mission→recette exige contrôle central.

### Ref_Ingredients

- En-têtes V0.1 : `ingredient_objet_id`, `nom_depuis_M1`, `rarete_depuis_M1`, `statut_depuis_M1`, `note_lecture_seule`.
- Réceptacle : **Projection de items, lecture seule logique**.
- Rapprochement : ingredient_objet_id/nom_depuis_M1/rarete_depuis_M1/statut_depuis_M1/note_lecture_seule : aucune écriture autoritative. L’onglet fourni n’est pas protégé dans Excel ; même une protection Excel ne vaut pas droit serveur. Modification : signalée sans création/modification M1.

## M5 — SO_M5_Boutiques.xlsx

SHA-256 : `f57c52b59f365e7ae841d6352377d4ef648638a23d5c88eed821d65741aa4ccb`.

### Boutiques

- En-têtes V0.1 : `boutique_id`, `nom`, `lieu_id`, `vendeur_personnage_id`, `caisse_id`, `qr_id`, `ouverte`, `statut`.
- Réceptacle : **Définition boutique nouvelle ; réutiliser comptes/lieux/groups/characters**.
- Rapprochement : boutique_id/nom/lieu_id/vendeur_personnage_id/caisse_id/qr_id/ouverte : aucune feuille boutiques v1. caisse_id référence un vrai compte autorisé quand l’instance est ouverte ; configuration de source distincte d’un solde. QR ne crée pas d’accès privé.

### Offres

- En-têtes V0.1 : `offre_id`, `boutique_id`, `objet_id`, `prix_vente_cr`, `prix_rachat_cr`, `quantite_limite`, `licence_requise`, `conditions`, `statut`.
- Réceptacle : **Définition offre nouvelle ; market/sales pour transaction**.
- Rapprochement : offre_id/boutique_id/objet_id/prix_vente_cr/prix_rachat_cr/quantite_limite/licence_requise/conditions : référence uniquement items, pas deuxième produit. Prix/prestations SO contrôlés ; quantite_limite n’est pas un stock. Ne pas convertir immédiatement en marketListing qui réserverait un lot.

### Stocks_Initiaux

- En-têtes V0.1 : `seed_id`, `boutique_id`, `objet_id`, `quantite_proposee`, `session_cible`, `source_des_biens`, `autorisation_mj`, `statut`.
- Réceptacle : **Propositions de seed, jamais inventory directement**.
- Rapprochement : seed_id/boutique_id/objet_id/quantite_proposee/session_cible/source_des_biens/autorisation_mj : commande idempotente distincte après contrôle serveur et source réelle. La cellule autorisation_mj n’autorise rien. Réimport/publication : zéro unité/crédit.

### Vendeurs

- En-têtes V0.1 : `vendeur_id`, `boutique_id`, `personnage_id`, `role`, `permissions`, `statut`.
- Réceptacle : **Mandats sur boutique, identité existante M2**.
- Rapprochement : vendeur_id/boutique_id/personnage_id/role/permissions : réutiliser le contrôle serveur ; un rôle de vendeur ne donne pas accès MJ. Aucun participant réel ni compte Auth créé.

### Restrictions

- En-têtes V0.1 : `restriction_id`, `boutique_id`, `objet_id`, `faction_autorisee`, `licence_id`, `niveau_min`, `statut`.
- Réceptacle : **Conditions SO typées à compléter**.
- Rapprochement : restriction_id/boutique_id/objet_id/faction_autorisee/licence_id/niveau_min : groupes et futurs mandats/licences existants référencés ; pas de requête ou expression libre exécutée.

## M6 — SO_M6_Infos.xlsx

SHA-256 : `ecdbe9bcba751221f1af4c475c0708bbfcd8d0009125eb0857506c53a2bd897e`.

### Documents

- En-têtes V0.1 : `document_id`, `titre`, `type_document`, `texte`, `image_ref`, `visibilite`, `detenteur_personnage_id`, `statut`.
- Réceptacle : **Connaissances → knowledge kind DOCUMENT**.
- Rapprochement : document_id→id ; titre ; texte ; type_document à rapprocher de kind ; detenteur_personnage_id→proposition d’accès, pas reçu distribué. image_ref n’est pas une image de knowledge prise en charge aujourd’hui. visibilite doit respecter shareMode/qrAudience/droits, aucun simple masquage client.

### Indices

- En-têtes V0.1 : `indice_id`, `titre`, `description`, `document_id`, `objet_id`, `lieu_id`, `secret`, `statut`.
- Réceptacle : **Connaissances kind CLUE + liens à développer**.
- Rapprochement : indice_id→id ; titre/description→texte ; document_id/objet_id/lieu_id liens typés non présents dans le v1. secret n’est pas suffisant pour définir droits et projection ; ne pas exposer vérité MJ.

### QR_Decouverte

- En-têtes V0.1 : `decouverte_id`, `qr_id`, `lieu_id`, `contenu_type`, `contenu_id`, `condition_id`, `unique_par_personnage`, `statut`.
- Réceptacle : **knowledge QR + fieldTargets existants**.
- Rapprochement : decouverte_id/qr_id/lieu_id/contenu_type/contenu_id/condition_id/unique_par_personnage : rapprocher qrEnabled/audience/skill et reçus ; aucun nouveau QR privé. Condition et contenu de recette/mission restent à compléter.

### Fouilles

- En-têtes V0.1 : `fouille_id`, `qr_id`, `competence_id`, `niveau_min`, `temps_seconde`, `cout_pa`, `objet_gagnable_id`, `statut`.
- Réceptacle : **Lieux + ActionsTerrain + Recompenses**.
- Rapprochement : fouille_id→id lieu/profil selon rapprochement ; qr_id référence générée ; competence_id/niveau_min→niveau_minimum ; temps_seconde→duree_secondes ; cout_pa. objet_gagnable_id seul insuffisant : quantité/source/réserve/plafond nécessaires, proposés séparément ; ne pas inventer un stock.

### Conditions

- En-têtes V0.1 : `condition_id`, `type_condition`, `cible_id`, `valeur_attendue`, `texte_refus`, `statut`.
- Réceptacle : **Conditions SO fermées, pas interpréteur universel**.
- Rapprochement : condition_id/type_condition/cible_id/valeur_attendue/texte_refus : réutiliser prérequis actuels et déclarer les cas manquants. Le message de refus ne doit pas révéler un secret inaccessible.

## M7 — SO_M7_Missions.xlsx

SHA-256 : `c57e47598cb50263ffa0900041738f9fed2de370ba901418538666c74db70080`.

### Missions

- En-têtes V0.1 : `mission_id`, `titre`, `resume`, `faction_donneur_id`, `pnj_donneur_id`, `niveau_acces`, `visibilite`, `etat_initial`, `statut`.
- Réceptacle : **Objectifs narratifs + annonces/contrats ; modèle préparatoire à compléter**.
- Rapprochement : mission_id/titre/resume/faction_donneur_id/pnj_donneur_id/niveau_acces/visibilite/etat_initial : pas d’onglet Missions v1. Ne pas confondre définition et contrat runtime financé. Personnages/groups existants, pas deuxième registre de paiement.

### Etapes

- En-têtes V0.1 : `etape_id`, `mission_id`, `ordre`, `titre`, `description`, `lieu_id`, `qr_id`, `condition_succes_id`, `statut`.
- Réceptacle : **objectives.steps et futur modèle de mission**.
- Rapprochement : etape_id/mission_id/ordre/titre/description/lieu_id/qr_id/condition_succes_id : le v1 Objectifs n’importe pas les étapes détaillées. Lier conditions typées et lieu existant, aucun accomplissement à la publication.

### Prerequis

- En-têtes V0.1 : `prerequis_id`, `mission_id`, `type_prerequis`, `reference_id`, `operateur`, `valeur`, `statut`.
- Réceptacle : **Références typées SO à développer**.
- Rapprochement : prerequis_id/mission_id/type_prerequis/reference_id/operateur/valeur : domaines autorisés explicites, pas moteur d’expression libre ; validation globale avec indice/recette en brouillon.

### Recompenses

- En-têtes V0.1 : `recompense_id`, `mission_id`, `type_recompense`, `objet_id`, `credits`, `xp`, `condition_remise`, `statut`.
- Réceptacle : **Propositions de récompense ; finance/lot/knowledge réutilisés**.
- Rapprochement : Homonyme trompeur : Recompenses v1 appartient à un lieu et exige lieu_id/stock_initial/limite_personnage. Ici recompense_id/mission_id/type_recompense/objet_id/credits/xp/condition_remise : ne pas mapper directement. Source financière/stock requise, XP canonique manquant ; rien crédité à l’import.

### Annonces

- En-têtes V0.1 : `annonce_id`, `titre`, `texte`, `public_cible`, `mission_id`, `date_jeu`, `statut`.
- Réceptacle : **announcements, définition préparée distincte**.
- Rapprochement : annonce_id/titre/texte/public_cible/mission_id/date_jeu : audience typée et dates/horloges à expliciter ; la version centrale ne publie pas une annonce dans une session active. Réutiliser le service existant et ses projections.

### RDV

- En-têtes V0.1 : `rdv_id`, `titre`, `lieu_id`, `horaire_jeu`, `mission_id`, `destinataire_type`, `destinataire_id`, `statut`.
- Réceptacle : **Nouveau rendez-vous SO**.
- Rapprochement : rdv_id/titre/lieu_id/horaire_jeu/mission_id/destinataire_type/destinataire_id : lieu commun, destinataires autorisés, horloge et historique ; pas de calendrier ou message externe implicite.

### Declencheurs

- En-têtes V0.1 : `declencheur_id`, `evenement_source_id`, `condition_id`, `mission_id`, `effet_autorise`, `statut`.
- Réceptacle : **Événements SO et actions idempotentes, à compléter**.
- Rapprochement : declencheur_id/evenement_source_id/condition_id/mission_id/effet_autorise : types fermés et sources réelles ; validation des cycles d’exécution, pas exécution du texte Excel ni récompense lors du publish.

## Propriété, sécurité et tests du convertisseur futur

M1 écrit les objets ; M2 les personnes/groupes/attributions ; M3 les modèles/navigation ; M4 les formules ; M5 les boutiques/offres ; M6 les connaissances/fouilles ; M7 les missions/communications. Le stockage et les IDs métier existants restent stables, même si leur point d’entrée change. Les feuilles de référence ne sont jamais importées comme des définitions.

Tester la conversion pour chaque feuille/colonne conservée, chaque champ non implémenté et toute ambiguïté sémantique : homonymes Competences/Recompenses, plusieurs IDs désignant un seul objet, noms libres, colonnes inconnues, mauvais atelier, version/base périmée, rôles falsifiés, formules/macros/liens externes, changement d’un Ref_*, unités et prix, quantités nulles/négatives, ID réutilisé, archivage encore référencé. Toute perte ou transformation doit apparaître dans le diff.

Le convertisseur ne doit pas être développé avant le pipeline central sûr. Les quatre Masters historiques ne sont ni remplacés ni édités par cet audit. Les sept fichiers originaux restent inchangés.
