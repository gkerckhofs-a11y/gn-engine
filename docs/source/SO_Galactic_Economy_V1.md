# GN ENGINE / SPACE OUTLAWS
## Cahier des charges unifié — Économie galactique, navigation commerciale et module Vaisseau

**Version :** 1.0 — 14 novembre 2026  
**Dépôt :** `gkerckhofs-a11y/gn-engine`  
**Références :** Livre des règles Space Outlaws V0.7, chapitres 3, 12, 13 et 16 à 25 ; cahiers des charges techniques et décisions complémentaires validées par l'organisateur.

**Objectif :** transformer le commerce interplanétaire en moteur économique et narratif du jeu, en reliant les Courtiers, Navigateurs/Pilotes, capitaines, équipages, vaisseaux, marchandises, marchés planétaires et événements scénaristiques.

---

# 1. Vision générale

Le commerce doit créer des interactions entre les personnages.

Un Courtier identifie une occasion commerciale sur une planète, achète des marchandises, négocie leur transport avec un Pilote ou un capitaine, puis attend leur livraison pour les revendre sur une autre planète.

Le transporteur doit disposer d'un véritable vaisseau, d'un équipage autorisé, d'une capacité de fret suffisante et du carburant nécessaire.

Les marchandises sont localisées et conservent leur propriétaire. Elles peuvent être entreposées, chargées, transportées et revendues uniquement après les opérations correspondantes.

Les cours fluctuent selon les planètes et les événements décidés par l'organisation. Les actualités galactiques fournissent aux joueurs des informations susceptibles d'influencer leurs stratégies.

Le système doit permettre de jouer :

- La spéculation commerciale.
- Le transport de marchandises.
- Les négociations de contrats.
- La navigation et les escales.
- Le ravitaillement et la maintenance.
- Les escortes et la piraterie.
- Les contrôles douaniers et la contrebande.
- Le stockage et la revente différée.

**Principe fondamental : aucune marchandise ne se téléporte et aucune transaction ne crée artificiellement des stocks ou des crédits.**

# 2. Audit technique préalable

Avant modification :

1. Inspecter la branche `main`, les PR ouvertes et les développements en cours.
2. Identifier les fonctionnalités déjà opérationnelles.
3. Vérifier les permissions et contrats existants.
4. Comparer les comportements implémentés au livre V0.7.
5. Identifier les éventuels conflits avec les chantiers récents Boutique/Sac, compétences et Module Vaisseau.
6. Établir une matrice des fonctionnalités réutilisables, partielles ou absentes.

Examiner notamment :

- `src/core/market.mjs`
- `src/core/market-negotiations.mjs`
- `src/core/prices.mjs`
- `src/core/price-state.mjs`
- `src/core/cargo.mjs`
- `src/core/space-outlaws-voyages.mjs`
- Les services de contrats, missions et transport.
- Les services de stockage, douanes et assurances.
- Les services de groupes et mandats.
- Le moteur de cockpit.
- Le système d'annonces et de News.
- Les interfaces organisateur.
- Les interfaces Action, Terminal et Vaisseau.

**Interdiction de recréer un second moteur de commerce, de navigation, de contrats ou d'inventaire.**

Les changements doivent compléter les services existants.

# 3. Architecture économique galactique

## 3.1 Marchés planétaires

Chaque planète commerciale accessible possède un marché local.

Ce marché définit, pour les marchandises autorisées :

- Cours actuel.
- Prix de référence.
- Disponibilité à l'achat.
- Stock vendeur.
- Demande locale.
- Budget disponible au rachat.
- Restrictions commerciales.
- Historique des variations.
- Événements économiques actifs.

Le catalogue de base reprend les douze marchandises du livre V0.7.

Chaque marché est indépendant des autres.

Une pénurie sur une planète ne provoque pas automatiquement une pénurie sur toutes les planètes.

## 3.2 Variation des prix

Conserver les prix de référence V0.7 et les quatre états de marché :

| État | Coefficient |
|---|---:|
| Surabondance | 0,85 |
| Normal | 1,00 |
| Tension | 1,15 |
| Pénurie | 1,30 |

Prix local = prix de référence × coefficient, selon les règles d'arrondi applicables.

Le système existant d'événements économiques peut être réutilisé.

Toute évolution supplémentaire doit respecter les règles validées ou faire l'objet d'un arbitrage explicite.

Les prix ne doivent pas évoluer automatiquement après chaque transaction.

## 3.3 Stocks et demande

Pour chaque planète et marchandise, prévoir :

- Stock disponible à la vente.
- Quantité recherchée par les acheteurs locaux.
- Budget de rachat.
- Éventuelles limitations d'achat ou de vente.
- Dernier événement économique applicable.

Le MJ peut ajuster ces données selon les besoins du scénario.

Les stocks et budgets ne sont pas infinis.

Aucune opération ne peut vendre une quantité supérieure au stock disponible ou payer davantage que le budget réellement disponible.

## 3.4 Historique des cours

Conserver un historique daté des changements de prix.

Le Courtier doit pouvoir consulter :

- Le cours actuel.
- Le cours précédent.
- La variation.
- L'évolution historique.
- Les événements publics associés lorsqu'ils sont connus.

L'historique ne doit pas révéler les événements secrets ou futurs préparés par le MJ.

Prévoir un graphique lisible sur smartphone et PC.

## 3.5 Actualisation en temps réel

Lorsqu'un cours est modifié et publié :

- Le nouveau cours devient applicable aux nouvelles transactions.
- Les joueurs autorisés voient son évolution sans devoir actualiser manuellement.
- Les offres indexées utilisent le cours applicable au moment du paiement.
- Les transactions déjà confirmées conservent leur prix contractuel.

Réutiliser les mécanismes de synchronisation disponibles.

Prévoir une reprise sûre après perte de connexion.

Ne jamais garantir un cours après la période de validité d'un devis.

# 4. Centrale commerciale du Courtier

Créer ou compléter dans le Terminal une rubrique :

**Bourse galactique**

Elle doit être distincte des boutiques d'objets personnels.

## 4.1 Tableau des marchés

Le Courtier peut :

- Sélectionner une planète.
- Consulter les marchandises.
- Comparer les cours entre planètes accessibles.
- Voir les quantités disponibles.
- Voir les demandes et possibilités de revente.
- Consulter l'historique des cours.
- Identifier une opportunité commerciale.
- Préparer un achat ou une vente.

Conserver les restrictions de visibilité et les informations spécialisées liées aux compétences COU-01, COU-02 et COU-03.

## 4.2 Achat de marchandises

Le Courtier sélectionne :

1. Une planète.
2. Une marchandise.
3. Une quantité.
4. Une caisse autorisée pour le paiement.

Le serveur vérifie :

- Le cours valide.
- Le stock disponible.
- Les crédits.
- Les licences et restrictions.
- Les permissions.
- L'état de la session.

Après confirmation :

- Les crédits sont débités.
- Le stock vendeur diminue.
- La propriété du lot est attribuée à l'acheteur.
- La marchandise reste localisée au comptoir de la planète.
- Une opération « À retirer » est créée.

**L'achat ne place jamais automatiquement le fret dans un vaisseau.**

## 4.3 Vente

Un Courtier peut revendre une marchandise si elle se trouve réellement au port ou dans un emplacement autorisé pour cette vente.

La vente vérifie :

- Le propriétaire du lot.
- La quantité.
- La localisation.
- Le cours local.
- La demande disponible.
- Le budget de rachat.
- Les restrictions douanières et commerciales.

Le rachat standard des marchandises ordinaires suit le barème V0.7, sauf offre spécifique autorisée.

Le paiement et la sortie du stock sont atomiques.

## 4.4 Compétences du Courtier

**COU-01 — Expertise marchande**

Permet d'obtenir des analyses commerciales selon le niveau, à partir des données préparées et accessibles.

**COU-02 — Négociation**

Permet d'utiliser les mécanismes de remise sur les offres PNJ expressément négociables, conformément à V0.7.

**COU-03 — Réseau de contacts**

Permet de rechercher fournisseurs, acheteurs, transporteurs, contrats et renseignements commerciaux selon les contenus et quotas disponibles.

Les compétences ne créent pas automatiquement des stocks, informations ou contrats non préparés.

# 5. Carte galactique

## 5.1 Objectif

Créer une véritable **carte galactique interactive**, belle, immersive et fonctionnelle.

Cette carte doit devenir un outil de travail important des Navigateurs et Pilotes.

Elle est accessible depuis le Terminal et depuis le module Vaisseau.

## 5.2 Direction artistique

Rechercher une esthétique de carte spatiale rétrofuturiste :

- Fond galactique sombre.
- Étoiles et nébuleuses discrètes.
- Planètes ou systèmes clairement identifiés.
- Routes spatiales représentées graphiquement.
- Effets lumineux mesurés.
- Informations lisibles.
- Animation légère des déplacements ou sélections.
- Compatibilité smartphone et PC.

Ne pas sacrifier la lisibilité au spectaculaire.

Prévoir une alternative textuelle accessible.

## 5.3 Fonctionnalités

La carte doit permettre de :

- Visualiser les destinations connues.
- Sélectionner une planète.
- Voir les liaisons disponibles.
- Consulter les distances et durées prévues.
- Identifier les escales possibles.
- Connaître les besoins en carburant selon le vaisseau.
- Voir les restrictions et dangers connus.
- Afficher un itinéraire envisagé.
- Comparer plusieurs trajets autorisés.

Les routes secrètes et informations spécialisées ne sont visibles que si le personnage possède les connaissances ou droits correspondants.

Ne jamais révéler automatiquement une route cachée par simple exploration de la carte.

## 5.4 Calcul du trajet

Le calculateur réutilise les données de routes existantes.

Il doit tenir compte :

- Du point de départ.
- De la destination.
- Des liaisons connues.
- Du type de vaisseau.
- Du carburant disponible.
- Des consommations V0.7.
- Des escales nécessaires.
- Des restrictions de route.
- Des conditions de voyage.
- Des informations connues du personnage.

Le calculateur peut proposer plusieurs itinéraires, par exemple :

- Le plus court.
- Le moins consommateur de carburant.
- Celui présentant le risque connu le plus faible.

Ces propositions doivent être calculées à partir des données réellement disponibles.

Ne pas inventer de routes ni de niveaux de risque.

## 5.5 Rôle du Navigateur

Dans ce cahier des charges, « Navigateur » désigne le personnage qui exerce effectivement les fonctions de navigation et possède les compétences ou mandats nécessaires.

Il ne s'agit pas d'une nouvelle neuvième classe.

Le Navigateur/Pilote peut utiliser la carte pour préparer un trajet et proposer ses services.

Le Courtier peut disposer d'une consultation commerciale simplifiée, mais les analyses de navigation spécialisées restent conditionnées par PIL-01.

# 6. Breach Port et les escales

Breach Port constitue le principal hub de la campagne.

Il propose notamment :

- Ravitaillement.
- Réparations.
- Entrepôts.
- Services commerciaux.
- Douanes.
- Contrats.
- Rencontres entre équipages.

**Ne pas imposer un retour systématique à Breach Port après chaque voyage.**

Les escales dépendent :

- Du réseau de routes.
- Du carburant.
- Des destinations.
- Des besoins de l'équipage.
- Des restrictions configurées.

Un voyage direct entre deux planètes est possible lorsque la route existe et que le vaisseau remplit les conditions.

Certaines destinations peuvent nécessiter une escale si le réseau ou l'autonomie du vaisseau l'exige.

Ne pas introduire de ravitaillement obligatoire artificiel.

# 7. Contrats de transport entre Courtier et Pilote

## 7.1 Demande de transport

Depuis la Bourse galactique, permettre au Courtier de créer une demande de transport.

Elle précise :

- Les lots concernés.
- La quantité et le volume.
- La planète de retrait.
- La destination souhaitée.
- Le délai éventuel.
- Les contraintes particulières.
- La rémunération proposée, facultative.

La demande ne transfère aucune marchandise.

## 7.2 Offre du transporteur

Le Pilote ou capitaine habilité peut consulter la demande.

Il vérifie :

- La disponibilité d'un vaisseau.
- Sa capacité de fret.
- Le trajet et ses escales.
- Le coût estimé en carburant.
- Les contraintes et risques connus.
- Les engagements déjà en cours.

Il peut proposer un tarif de transport.

Le tarif peut tenir compte des services demandés, du carburant, des escales et des conditions du trajet.

Les joueurs négocient librement leurs montants dans les limites des règles de contrats.

## 7.3 Négociation

Créer un parcours simple :

1. Demande du Courtier.
2. Proposition du transporteur.
3. Contre-proposition éventuelle.
4. Acceptation ou refus.
5. Conclusion du contrat.

Conserver l'historique des offres.

Ne pas multiplier inutilement les écrans.

## 7.4 Contrat validé

Le contrat précise :

- Commanditaire.
- Transporteur.
- Vaisseau.
- Cargaison.
- Origine et destination.
- Prix convenu.
- Responsabilité du carburant.
- Frais, assurance et douane.
- Échéance.
- Conditions de livraison.
- Éventuelles clauses de détours et de recours.

Utiliser le moteur de contrats existant et les mécanismes de provision financière V0.7.

Le contrat de transport ne confère pas la propriété du fret.

La rémunération est réglée selon les conditions contractuelles validées et le mécanisme de preuve de livraison existant.

# 8. Module Vaisseau

## 8.1 Principe

Chaque vaisseau possède un module partagé.

Le Terminal affiche simplement la liste des vaisseaux accessibles au personnage, avec un lien vers leur module.

Le module centralise :

- Vue générale.
- Navigation.
- Carburant.
- Soute et fret.
- Maintenance.
- Équipage.
- Journal de bord.
- Contrats de transport liés.

## 8.2 Arrivée sur une planète

Lorsque le voyage est réellement achevé et que le vaisseau est à quai, son module affiche les opérations disponibles dans ce port.

Selon les droits, les personnages peuvent :

- Récupérer des marchandises achetées.
- Charger leur fret.
- Décharger du fret.
- Effectuer une livraison.
- Proposer une cargaison à la vente.
- Acheter de nouvelles marchandises.
- Entreposer des lots.
- Ravitailler.
- Demander des réparations.
- Préparer le prochain voyage.

Les opérations doivent être autorisées par les données de localisation.

Une planète ne doit pas devenir accessible à une opération locale par simple sélection dans un menu.

# 9. Cycle complet d'un transport commercial

Le système doit permettre le parcours suivant :

1. Le Courtier identifie une opportunité.
2. Il achète une cargaison sur une planète.
3. Le stock est réservé ou acheté au comptoir local.
4. Le Courtier négocie un transport.
5. Le transporteur accepte le contrat.
6. Le Pilote prépare un vaisseau.
7. Le vaisseau rejoint la planète d'origine.
8. L'équipage retire la marchandise.
9. Les lots sont chargés dans la soute.
10. Le Pilote prépare le voyage vers la destination.
11. Le vaisseau effectue le trajet et ses escales.
12. L'équipage arrive à destination.
13. Les marchandises sont déchargées.
14. Le Courtier choisit de vendre, stocker ou conserver.
15. La livraison contractuelle est validée.
16. La rémunération du transporteur est réglée selon le contrat.

Chaque étape doit conserver les droits de propriété et la traçabilité.

Aucune étape ne doit être implicitement simulée par une simple modification de destination.

# 10. Gestion des équipages

## 10.1 Capitaine

Conserver le rôle de capitaine distinct du propriétaire et du pilote.

Le capitaine autorisé peut :

- Recruter un membre.
- Lui attribuer un rôle opérationnel.
- Modifier les mandats relevant de son autorité.
- Licencier un membre.
- Proposer ou organiser un remplacement.
- Consulter les missions de transport du vaisseau.

Ces fonctions doivent préserver les droits du propriétaire et du MJ.

## 10.2 Recrutement

Le capitaine invite un personnage.

Celui-ci accepte ou refuse.

L'entrée dans l'équipage ne donne aucune compétence supplémentaire.

## 10.3 Licenciement

Le capitaine peut retirer un membre, sous réserve des droits et opérations en cours.

Le licenciement :

- Révoque les permissions d'équipage concernées.
- Ne confisque pas les objets personnels.
- Ne transfère pas les crédits.
- N'efface pas les contrats.
- Ne modifie pas la propriété du vaisseau.
- Conserve l'historique.

Un membre déjà engagé dans un voyage reste traité selon le manifeste et les règles de sécurité ; son retrait opérationnel intervient à une escale autorisée ou sur décision MJ.

## 10.4 Rôles

Les rôles opérationnels peuvent comprendre :

- Capitaine.
- Pilote.
- Mécano.
- Responsable du fret.
- Membre d'équipage.
- Passager temporaire.

Ces fonctions ne remplacent pas les classes de personnages.

Les compétences continuent de déterminer les interventions spécialisées.

# 11. Fret et entrepôts

## 11.1 Localisation

Chaque lot commercial doit posséder une localisation réelle dans le jeu :

- Comptoir planétaire.
- Entrepôt.
- Soute.
- Autre emplacement autorisé.

La propriété, la détention et la localisation restent distinctes.

## 11.2 Chargement

Le chargement exige :

- Un vaisseau à quai au bon port.
- Une soute compatible.
- Une capacité disponible.
- Un lot disponible à cet endroit.
- Des droits sur le lot.
- Un mandat logistique valide si nécessaire.

Utiliser les mécanismes de transfert de fret existants.

## 11.3 Stockage spéculatif

Permettre de conserver des marchandises en entrepôt pour attendre une évolution de marché.

La capacité de stockage doit être limitée et configurée.

Les frais de stockage éventuels constituent un paramètre à valider ; ne pas inventer de tarif.

Le propriétaire peut ensuite :

- Vendre localement.
- Charger dans un vaisseau.
- Transférer selon un contrat autorisé.

Le stock ne change jamais de planète sans transport.

# 12. Douanes

Conserver les règles V0.7 :

- Transit sans importation locale : 0 %.
- Importation de marchandises libres : 5 %.
- Marchandises réglementées avec licence : 10 %.
- Marchandises interdites : pas de dédouanement ordinaire.

Distinguer :

- Transit déclaré.
- Importation locale.
- Stockage en attente.
- Marchandises dissimulées.
- Marchandises sous licence.
- Saisie et recours.

La question du stockage sous douane devra être formalisée comme extension distincte.

Ne pas taxer automatiquement comme une importation une cargaison qui reste réellement en transit.

# 13. News galactiques et spéculation

## 13.1 Actualités

L'organisateur doit pouvoir publier des News concernant :

- Les crises.
- Les pénuries.
- Les surabondances.
- Les conflits.
- Les incidents industriels.
- Les restrictions commerciales.
- Les changements politiques fictifs.
- Les opportunités économiques.

Ces événements peuvent influencer les cours et la demande, uniquement si le MJ a prévu et validé leurs effets.

## 13.2 Informations spécialisées

Les compétences COU-01 et COU-03 peuvent fournir des renseignements commerciaux préparés.

Une information peut être :

- Exacte.
- Incomplète.
- Incertaine.
- Mensongère dans la fiction.

Ne jamais promettre automatiquement une hausse future.

Les informations privées restent protégées.

## 13.3 Spéculation

Le Courtier doit pouvoir :

- Comparer les cours.
- Acheter à bas prix.
- Conserver une cargaison.
- Attendre un événement.
- Organiser son transport.
- Revendre dans un autre marché.

Le gain dépend des prix réellement obtenus et des frais effectifs.

Le système ne doit pas créer de profit garanti.

# 14. Dashboard organisateur — Économie galactique

Créer une rubrique dédiée dans la régie PC :

**Économie galactique**

Elle permet au MJ de piloter les marchés sans devoir modifier les Masters en profondeur à chaque événement.

## 14.1 Tableau de bord

Afficher :

- Planètes.
- Marchandises.
- Cours en vigueur.
- États de marché.
- Stocks disponibles.
- Demandes d'achat.
- Budgets de rachat.
- Événements actifs.
- Dernières variations.

## 14.2 Commandes MJ

Permettre de :

- Modifier l'état d'une marchandise sur une planète.
- Faire varier son cours selon les règles applicables.
- Ajouter ou retirer du stock avec une provenance justifiée.
- Modifier une demande locale.
- Ajuster un budget autorisé.
- Suspendre certaines transactions.
- Activer ou désactiver un événement économique.
- Préparer une News correspondante.
- Consulter l'historique des changements.

Toute modification doit être confirmée et journalisée.

Aucune opération ne doit créer silencieusement des marchandises ou des crédits.

## 14.3 Événements scénarisés

Permettre au MJ de préparer une variation économique puis de la déclencher :

- Manuellement.
- À une date ou heure configurée si le moteur de programmation le permet.
- À partir d'une condition de scénario réellement raccordée.

Ne pas simuler un déclenchement automatique lorsque la fonction n'existe pas.

# 15. Ergonomie

## Courtier

Son Terminal doit permettre de :

- Voir la Bourse galactique.
- Comparer les marchés.
- Consulter les cours et graphiques.
- Acheter ou vendre.
- Suivre ses stocks.
- Demander un transport.
- Suivre ses contrats.

## Pilote / Navigateur

Son Terminal doit permettre de :

- Ouvrir la carte galactique.
- Voir les routes connues.
- Calculer un trajet.
- Consulter les demandes de transport accessibles.
- Proposer un tarif.
- Accepter une mission.
- Préparer un voyage dans le module Vaisseau.

## Capitaine

Son module Vaisseau doit permettre de :

- Gérer l'équipage.
- Organiser les opérations.
- Suivre les contrats.
- Gérer les autorisations relevant de son mandat.

## Équipage

Chaque membre voit les informations et actions correspondant à ses droits.

Un Mécano répare, un Pilote prépare le voyage et un responsable du fret organise les opérations logistiques.

Ne pas afficher des commandes inutiles ou non autorisées.

## Textes HRP

Rédiger des explications simples, pédagogiques et sans jargon interne GN Engine.

Chaque action importante doit indiquer :

- Ce que le joueur peut faire.
- Comment procéder.
- Les conditions et conséquences.

# 16. Plan de développement

## Tranche 1 — Audit et architecture

- Vérifier le dépôt actuel.
- Cartographier les fonctionnalités réutilisables.
- Identifier les dépendances.
- Préparer les schémas d'extension.
- Vérifier les arbitrages V0.7.

## Tranche 2 — Marchés planétaires

- Ajouter la notion de marché par planète.
- Raccorder cours, stocks, demande et budgets.
- Préserver les moteurs de prix existants.
- Créer la Bourse galactique du Courtier.

## Tranche 3 — Carte galactique

- Créer la carte visuelle.
- Relier les routes existantes.
- Afficher les informations autorisées.
- Intégrer les estimations de voyage.
- Raccorder la carte au Terminal et au module Vaisseau.

## Tranche 4 — Contrats de transport

- Demandes de transport.
- Négociation entre Courtier et transporteur.
- Contrats.
- Provision financière.
- Suivi et règlement.

## Tranche 5 — Logistique et escales

- Retrait local des marchandises.
- Chargement et déchargement.
- Localisation des lots.
- Livraison et revente.
- Stockage spéculatif.
- Raccordement au module Vaisseau.

## Tranche 6 — Équipages et opérations partagées

- Capitaine.
- Recrutement.
- Mandats.
- Licenciement.
- Contributions au ravitaillement.
- Coordination avec le cockpit.

Ne pas refaire ce qui a déjà été développé dans le chantier Module Vaisseau : vérifier et réutiliser les services récents.

## Tranche 7 — Régie économique et News

- Dashboard des marchés.
- Variations de cours.
- Stocks et budgets.
- Événements scénarisés.
- News galactiques.
- Historique et actualisation.

## Tranche 8 — Recette intégrée

Simuler une véritable opération commerciale complète avec plusieurs personnages.

Vérifier :

- Achat à distance.
- Contrat de transport.
- Navigation.
- Arrivée.
- Retrait.
- Chargement.
- Transit.
- Douane.
- Stockage.
- Revente.
- Paiement du transporteur.
- Modifications de cours en cours de trajet.

# 17. Tests transversaux obligatoires

Tester notamment :

1. Deux planètes affichant des cours différents.
2. Variation de cours décidée par le MJ.
3. Actualisation du prix sans rechargement manuel.
4. Achat d'une quantité finie.
5. Budget de rachat insuffisant.
6. Achat à distance sans livraison automatique.
7. Transport négocié entre deux personnages.
8. Contrat accepté, refusé et renégocié.
9. Pilote non mandaté refusé.
10. Vaisseau sans carburant suffisant.
11. Vaisseau sans capacité de fret.
12. Retrait au mauvais port refusé.
13. Chargement de fret appartenant à un tiers non autorisé refusé.
14. Départ et arrivée.
15. Déchargement à destination.
16. Revente impossible tant que le fret n'est pas livré.
17. Stockage intermédiaire.
18. Variation de cours pendant le transport.
19. Rémunération après livraison et contestation.
20. Soute clandestine et contrôle douanier.
21. Recrutement et licenciement d'équipage.
22. Opérations concurrentes sur le même lot.
23. Reconnexion et reprise sans double dépense.
24. Persistance entre sessions.
25. Accès direct aux données privées refusé.

Compléter ces scénarios par les tests unitaires et d'intégration spécifiques à chaque service modifié.

# 18. Consignes à l'agent développeur

Travailler de manière autonome, tranche après tranche.

Ne pas redévelopper un moteur existant.

Éviter les modifications simultanées non coordonnées sur les mêmes services.

Conserver les règles V0.7 et identifier les extensions.

Documenter tout nouvel arbitrage nécessaire.

Utiliser des tests ciblés pour limiter les temps de CI, puis vérifier les intégrations pertinentes.

Mettre à jour une matrice de suivi indiquant :

- Fonctionnalité.
- État initial.
- Travail réalisé.
- Tests.
- Commit ou PR.
- Limites restantes.

Préserver les sessions existantes, leurs stocks, contrats, propriétaires, crédits et historiques.

Ne jamais réinitialiser une campagne pour introduire les marchés planétaires.

Préparer des PR par tranches cohérentes.

**Aucun déploiement Firebase sans autorisation explicite.**

## Résultat attendu

Un système dans lequel :

- Les Courtiers détectent les opportunités économiques.
- Les marchés planétaires possèdent leurs propres cours, stocks et demandes.
- Les Pilotes utilisent une carte galactique pour organiser les voyages.
- Les transporteurs négocient librement leurs rémunérations.
- Les vaisseaux transportent réellement les marchandises.
- Les équipages collaborent selon leurs rôles.
- Breach Port constitue un hub stratégique de ravitaillement, d'entreposage et de commerce.
- Les News galactiques influencent les stratégies commerciales.
- Le MJ pilote les fluctuations depuis une régie claire.

**Le commerce doit générer des voyages, les voyages des rencontres, les rencontres des conflits et les conflits de nouvelles histoires.**

GN Engine doit soutenir cette dynamique sans rendre le jeu ou son administration inutilement complexes.