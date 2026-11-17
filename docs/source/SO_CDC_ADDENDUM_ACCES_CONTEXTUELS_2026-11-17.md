# GN Engine — Space Outlaws
## Addendum au cahier des charges : accès contextuels et remise des achats au comptoir

**Date :** 17 novembre 2026  
**Statut :** spécification fonctionnelle à intégrer ; décisions explicites de l'organisateur distinguées des modalités proposées.  
**Références :** `SO_CDC_V35.md`, `SO_CDC_V36_Fouilles_Medias.md`, `SO_Regles_V07.txt`, `docs/SO-PERSONAL-COMMERCE-CIRCUITS.md`, `docs/SO-05-C2G-BOUTIQUES-BROUILLON.md`, `docs/SO-PLAYER-QR-HEALTH.md`, `docs/SO-TERMINAL-PERSONNEL.md`.  
**Portée :** nouvelle exigence fonctionnelle, sans changement rétroactif des documents historiques, Masters publiés, données de session ou règles canoniques de compétences.

### 1. Décisions d'organisation [VALIDÉ]

1. Les joueurs doivent **se rendre physiquement** dans le bâtiment pour utiliser un terminal d'action local. Le scan d'un QR code lance un **accès temporaire**. Cette présence repose sur le fair-play et les règles de jeu ; ni géolocalisation ni dispositif anti-photographie n'est exigé.
2. Le terminal personnel reste utilisable en tout lieu pour les informations et commandes **personnelles** (fiche, inventaire, messagerie, groupe, Holopedia, journal et suivi). Les opérations locales ont une condition de terminal d'action.
3. Les **licences nominatives** restent attachées à leur titulaire. Les **codes secrets partageables** peuvent être communiqués et réutilisés par plusieurs personnages. Les **clés numériques uniques** sont des actifs possédant un seul détenteur à la fois, transférables ou volables selon les règles de transfert applicables.
4. Les compétences sont exigées **selon l'opération**, pas automatiquement pour entrer dans un lieu ou utiliser un code. Une clé ouvre un accès ; elle ne confère pas une compétence professionnelle.
5. Le MJ doit pouvoir **télécharger les QR codes** individuellement et par lot afin de les imprimer et les intégrer à sa propre mise en forme.
6. Le **comptoir** permet d'acheter du **petit matériel transportable par les personnages**, en plus des activités commerciales des courtiers.
7. **Nouvelle décision du 17/11 :** pour chaque objet vendable, le MJ choisit **livraison numérique immédiate** ou **retrait physique au comptoir**. Ce choix ne dépend pas automatiquement de la classe du personnage.

### 2. Terminaux et sessions locales [CIBLE]

- Un lieu possède un identifiant stable et un ou plusieurs terminaux. Chaque terminal possède son QR, son état actif/inactif, ses opérations publiées et des règles de permissions explicites.
- Le QR contient un **lien/identifiant public de terminal** ; il ne contient aucun code secret, jeton d'administration ou clé de déverrouillage. Réutiliser le scanner caméra et la saisie manuelle de secours déjà présents.
- Après scan authentifié : création ou renouvellement d'une session locale ciblant le terminal et le personnage courant. **Durée proposée : 10 minutes, modifiable par le MJ** ; la valeur doit être confirmée en recette.
- Convention de conception proposée : un **contexte de lieu actif à la fois** par personnage ; un nouveau scan remplace le précédent. Expiration : aucune nouvelle opération locale, mais une opération déjà acceptée termine son cycle métier sans nouvel effet double.
- Le serveur valide la session locale et les droits de l'opération **à l'exécution**, même si le client a déjà affiché un bouton. Une révocation bloque les nouvelles opérations.
- Les fouilles de lieux V3.6 restent **universelles** et distinctes des opérations spécialisées ; aucune licence professionnelle ne doit leur être ajoutée par défaut.
- La règle de présence et l'interdiction d'utiliser une photo ou un lien à distance figurent dans les consignes RP.

### 3. Politique d'autorisation [CIBLE]

Évaluer, pour chaque commande et ressource ciblée : (a) session et contexte de terminal requis, (b) droits d'action publics ou nominatifs, (c) compétence/niveau canonique si pertinent, (d) licence nominative, code partageable ou clé unique selon des conditions **ET / OU** explicites, (e) mandat sur le personnage, groupe, vaisseau, cargaison ou stockage, puis (f) préconditions du moteur métier.

Un niveau local d'habilitation peut aider à organiser un bâtiment, mais **ne donne jamais accès automatiquement aux ressources d'un autre lieu ou propriétaire**. Les clés uniques ont un identifiant et un propriétaire courant ; un transfert atomique leur retire leur ancienne possession. L'usage d'un code partagé peut être journalisé sans avertissement automatique du propriétaire, suivant le paramétrage MJ.

Réutiliser les autorisations métier et mandats existants plutôt que créer des droits parallèles. Le MJ peut accorder ou révoquer un droit, attribuer une clé, désactiver un terminal et simuler les accès d'un personnage.

### 4. Répartition fonctionnelle initiale [CIBLE]

| Lieu | Opérations publiques (après scan) | Opérations conditionnelles |
|---|---|---|
| Comptoir | consulter catalogue, acheter petit matériel accessible à tous | commerce professionnel et destinations achetées avec licence de courtier ou autorisation dédiée |
| Spatioport | informations de service | pilotage, gestion d'un vaisseau autorisé, demande de décollage ; conserver validation MJ et cockpit |
| Atelier | prestations et devis publics | diagnostic, réparation, maintenance et interventions si compétence/mandat requis |
| Docks | services de manutention | chargement, fret, stockage selon propriétaire, groupe, vaisseau, code ou clé |
| Hospice | demande de soins | actes médicaux selon compétence et règles canoniques |
| Cantina | annonces/rumeurs publiques | contacts et offres scénaristiques via code/autorisation |
| Bureau impérial | formalités publiques | licences, contrôles et dossiers réservés aux titulaires habilités |

Le pilote conserve les capacités de navigation prévues par ses compétences ; les **coordonnées de destination** acquises au comptoir sont une information distincte des codes techniques de pilotage et des autorisations d'atterrissage éventuelles. Aucun prix, barème de compétence ou destination fictive n'est canonisé par cet addendum.

### 5. Comptoir : catalogue d'objets transportables [VALIDÉ / CIBLE]

L'atelier MJ réutilise les **modèles M1**, les **offres/boutiques M5**, la **médiathèque**, le **sac/inventaire**, les **comptes/crédits**, les **stocks et reçus transactionnels** existants.

Pour chaque objet ou offre, la régie doit permettre : référence M1, nom/illustration, prix, stock vendeur, limites éventuelles, droits d'achat, **mode de livraison explicite**, actif/inactif. Les marchandises personnelles restent du circuit `PERSONAL` ; `FUEL` et `COMMERCIAL` conservent leurs règles propres. Le **mode de remise est indépendant** du circuit et ne permet jamais de transformer du fret en équipement personnel, ni de contourner les mandats.

#### 5.1 Livraison numérique [VALIDÉ]

- À la confirmation de l'achat réussi, vérifier compte, droits, stock, quantité, capacité et règles métier ; débiter le prix et réserver/décrémenter le stock dans la même transaction logique.
- Attribuer le lot à l'inventaire personnel et le rendre utilisable **sans étape de remise physique**, uniquement après succès confirmé côté serveur.
- Un reçu unique relie achat, paiement, lot et livraison ; réessai, double clic, réseau interrompu ou reprise du terminal ne créent ni second débit ni second lot.

#### 5.2 Retrait physique [VALIDÉ]

- À l'achat, confirmer le paiement et créer un **lot acheté en attente de retrait** ; son propriétaire est établi par la vente mais sa garde demeure au comptoir. L'objet n'est **pas utilisable dans le sac** avant remise.
- Réutiliser le circuit **remise MJ / réception joueur** existant : le responsable habilité remet l'accessoire, valide la remise et le joueur confirme sa réception ; l'état passe à `REMIS`, puis l'objet devient disponible dans l'inventaire.
- Afficher au joueur « À retirer au comptoir » avec reçu/identifiant de retrait ; afficher au MJ/tenancier les retraits en attente. Ne pas exposer de secret ou d'identifiant interne inutile.
- Si le mode de livraison est modifié sur le catalogue **après l'achat**, le mode fixé dans le reçu d'achat continue de s'appliquer à cette commande. Annulation/remboursement et non-retrait doivent reprendre les règles économiques existantes et ne pas être inventés silencieusement.
- Une confirmation de remise répétée, sur un autre personnage ou après révocation, ne livre pas une seconde fois. Séparer les droits de vendre, d'attester la remise et de corriger une livraison.

#### 5.3 Compatibilité et périmètre

- Ne pas imposer rétroactivement une livraison numérique aux articles, vouchers carburant, ventes entre joueurs, fret ou sessions anciennes déjà soumis au retrait natif.
- Pour une définition historique **sans mode explicite**, conserver strictement le comportement antérieur ; exiger un choix explicite lors de la configuration d'une **nouvelle offre** dans le nouveau système.
- Ne pas ajouter automatiquement un accessoire physique pour chaque objet numérique : c'est le MJ qui choisit le circuit.
- Une éventuelle troisième option « représentation numérique + accessoire physique » reste **hors périmètre validé** et nécessitera une décision distincte.

### 6. Dashboard MJ — « Lieux & Terminaux » [CIBLE]

Interface PC avec : liste/recherche des lieux ; détail et statut des terminaux ; operations et permissions par action ; association des ressources ; durée de session ; codes partageables/clés uniques/licences nominatives ; journal des scans et actions ; simulateur « personnage × terminal × action » ; révocation.

Dans l'éditeur du comptoir : catalogue transportable et configuration du **mode de remise par objet/offre**, stock, prix, visibilité, retrait en attente et remise confirmée. Prévoir les droits du tenancier/MJ séparés de ceux des clients.

**Exports QR obligatoires :** PNG haute résolution, SVG vectoriel, PDF A4 avec libellé et ZIP de l'ensemble ; téléchargement individuel ou lot ; QR stable et identifié ; aperçu/test du lien et désactivation/réédition possible. L'utilisateur doit pouvoir récupérer un QR **nu** pour l'intégrer à une affiche conçue dans un logiciel externe.

Les ajouts à M1/M5/M6 ou au Master central sont à réaliser par extension **compatible et versionnée** ; le contrôle de cohérence des références doit précéder publication. Pas de migration automatique des Masters publiés.

### 7. Scénarios de recette ciblée [À EXÉCUTER À L'IMPLÉMENTATION]

| ID | Cas | Résultat attendu |
|---|---|---|
| ACT-01 | Scan au comptoir puis consultation | Session locale du bon terminal ; catalogue public visible |
| ACT-02 | Expiration/révocation de session | Nouvelle mutation refusée côté serveur, sans effacer un reçu déjà validé |
| ACT-03 | Personnage non courtier au comptoir | Achat personnel autorisé ; commande professionnelle refusée |
| ACT-04 | Code partageable communiqué à deux personnages | Deux usages possibles uniquement sur la portée autorisée |
| ACT-05 | Clé unique transférée | Ancien porteur sans accès, nouveau porteur autorisé |
| ACT-06 | Personnage muni d'un code mais sans compétence requise | Accès au terminal possible, commande spécialisée refusée |
| ACT-07 | Achat numérique | Une seule sortie de caisse et de stock, lot utilisable immédiatement |
| ACT-08 | Achat physique | Paiement accepté ; état en attente ; lot inutilisable avant réception |
| ACT-09 | Remise physique puis réception | Lot activé une fois, reçu signé et journalisé |
| ACT-10 | Double clic, remise répétée et coupure réseau | Aucun deuxième paiement, lot, stock ou reçu contradictoire |
| ACT-11 | Changement du mode d'une offre après achat | Commande passée conserve le mode de son reçu |
| ACT-12 | Ancien article sans champ de remise | Comportement historique inchangé |
| ACT-13 | QR téléchargé SVG/PNG/PDF/ZIP | Codes lisibles, destinations stables, pas de secret dans le QR |
| ACT-14 | Scan d'une fouille V3.6 | Fouille publique toujours accessible sans licence spécialisée |
| ACT-15 | Tentative d'achat sans stock/crédits/droit | Refus sans débit ni attribution |
| ACT-16 | Deux acheteurs sur le dernier exemplaire | Un seul achat accepté ; stock non négatif |
| ACT-17 | Accès direct à la commande sans scanner | Refus serveur pour opération exigeant présence |
| ACT-18 | Mandat de vaisseau/stock absent | Refus de la mutation même si le lieu et le QR sont valides |

Tests applicatifs ciblés, refus HTTP/Auth, concurrence transactionnelle et vérification d'affichage mobile/PC. Compléter par une recette de terrain avec vrais QR imprimés. Aucun de ces tests n'a été réalisé par la rédaction de cet addendum.

### 8. Réalisation recommandée, sans redéveloppement [PROPOSÉ]

1. **AC-01 — Infrastructure** : lieux/terminaux, sessions temporaires, contrôles serveur et journal.
2. **AC-02 — Régie** : permissions, codes, licences, clés, simulateur d'accès, export QR.
3. **AC-03 — Comptoir pilote** : achat personnel numérique/physique, modes de remise, reçu/retrait ; réutiliser entièrement M1/M5/inventaires/vente.
4. **AC-04 — Déploiement progressif** : spatioport, atelier, docks, hospice, cantina et bureau impérial, après tests de non-régression.
5. **AC-05 — Recette terrain** : panneaux QR imprimés, scans iPhone/Android, parcours réels, test MJ de révocation, absence de blocages RP.

**Interdits de cette phase documentaire :** aucune modification de moteur, aucun changement des barèmes V0.7, aucun déploiement Firebase, aucune fusion dans `main`, aucune migration de données.

### 9. Points de réglage encore proposés, non tranchés

- Durée par défaut de session locale : **10 minutes** proposée, réglable.
- Un seul lieu actif à la fois : règle d'ergonomie **proposée**.
- Habilitation de la personne qui effectue la remise : MJ ou délégué explicitement habilité, à aligner sur le circuit de remise existant.
- Annulation/remboursement d'un achat physique non retiré : ne pas créer de remboursement automatique sans règle métier validée.

Ces paramètres n'empêchent pas de figer la **décision validée** : le MJ choisit le mode numérique ou physique **pour chaque objet**.
---

## 10. Extension « Docks, cellules, inspections et intrusions » — décision du 17/11/2026

**Décision explicite validée :** les docks rassemblent des cellules de stockage de matières premières et autres lots commerciaux, des mouvements entre soutes de vaisseaux et stockages portuaires, des contrôles impériaux portant sur les marchandises et les taxes, et des tentatives d'espionnage via QR. **Une intrusion donnant des informations et un vol éventuel sont deux opérations séparées, distinctes et conditionnelles.** Aucune réussite de piratage ne donne par elle-même le droit de retirer ou de transférer un lot.

**Statut des détails ci-dessous :** `[VALIDÉ]` désigne uniquement le principe explicitement décidé ; `[CIBLE PROPOSÉE]` décrit l'architecture conseillée avant recette et arbitrages de scénario. Ne pas confondre les intentions avec une fonctionnalité actuellement déployée.

### 10.1 Cellules de stockage [VALIDÉ / CIBLE PROPOSÉE]

- [VALIDÉ] Un joueur peut **acheter ou posséder** une cellule au dock pour y entreposer des matières premières ; les marchandises peuvent passer d'une soute à une cellule et inversement. La capacité est limitée, à l'instar d'une soute.
- [CIBLE PROPOSÉE] Conserver les **locations d'entrepôts existantes** et ajouter **l'achat définitif** comme mode d'acquisition alternatif, dont le prix, l'offre et la disponibilité sont définis par le MJ. Ne jamais assimiler un paiement par un groupe à une propriété automatique du groupe.
- [CIBLE PROPOSÉE] Une cellule = `storageId` stable, port/planète, zone/terminal de dock, capacité et volume occupé, état, mode `RENT/OWN`, titulaire (personnage ou groupe), opérateurs habilités, liste de lots **protégée**, QR public, registre d'opérations. L'identité du propriétaire de **la cellule** et celle de chaque **lot** restent indépendantes ; un dépôt n'entraîne pas transfert de propriété du lot.
- [CIBLE PROPOSÉE] Distinguer les espaces **personnels/de groupe** des **entrepôts commerciaux** du circuit `COMMERCIAL`. Un lot ne change pas de circuit (`PERSONAL`, `FUEL`, `COMMERCIAL`) du seul fait d'être stocké ; conserver les règles d'admission et d'emplacement des services natifs. Les matières premières commerciales appartiennent au stock commercial du port, et non au sac du personnage.
- [CIBLE PROPOSÉE] Un changement de propriétaire de cellule (vente, cession, prise de contrôle) exige une action explicite avec ses propres droits et consentements. Une propriété de cellule n'autorise pas la lecture des biens de tiers confiés à cette cellule sans mandat correspondant. Préciser le traitement du contenu et des contrats avant de permettre une revente de cellule occupée.

### 10.2 QR des docks et transferts [VALIDÉ / CIBLE PROPOSÉE]

- [VALIDÉ] Un QR de dock ouvre un terminal d'action **local temporaire** et les opérations permises selon les licences, codes, clés, compétences et mandats. La présence réelle relève des règles de fair-play.
- [CIBLE PROPOSÉE] Prévoir un QR **de terminal de quai** et des QR **de cellule**, **de soute** et **de lot** différents. Les trois derniers identifient les ressources : scanner une étiquette ne confère **aucune permission** ; le contrôle d'action locale se fait à partir de la session du terminal concerné. Exports individuels et en lot au format PNG/SVG/PDF/ZIP, comme décidé en §6.
- [CIBLE PROPOSÉE] Transfert : `choisir lot + quantité → destination → aperçu capacités/droits/frais → réservation atomique → déplacement physique conventionnel → réception confirmée → état d'emplacement modifié`. Mouvements dans les deux sens ; vaisseau à quai dans le **même port** ; aucun déplacement à distance ou téléportation entre planètes. La destination peut être sélectionnée par QR d'une cellule/soute.
- [CIBLE PROPOSÉE] Réemployer `logistics.mjs`, `commercial-storage.mjs`, `cargo.mjs`, leurs réservations, gardes, reçus, scissions de lots et protections anti-doublon. Garder propriétaire, filiation, quantité et localisation ; un transfert complet conserve l'identifiant du lot ; un fractionnement suit le mécanisme natif.
- [CIBLE PROPOSÉE] Pour les groupes, conserver les mandats `readStock`, `depositStock`, `withdrawStock` et `manageStorage` avec leurs limites existantes ; le QR du lieu n'élargit aucun mandat.

### 10.3 État douanier des lots et contrôles impériaux [VALIDÉ / CIBLE PROPOSÉE]

- [VALIDÉ] Soutes et cellules peuvent être soumises à un contrôle impérial destiné à vérifier la nature des biens et le paiement des taxes dues.
- [CIBLE PROPOSÉE] Séparer **statut légal** de la marchandise (libre, réglementée, interdite, inconnu/non classé), **régime du mouvement** (transit, importation locale, stockage, transfert interne) et **preuves de régularisation** (quittance, licence valide, déclaration, cas de retenue, périmètre port/lot/visite/opération).
- [CIBLE PROPOSÉE] Conserver les règles économiques validées : transit sans importation locale **0 %**, importation de marchandises libres **5 %**, importation réglementée avec licence **10 %**, marchandise interdite **sans dédouanement ordinaire** ; arrondi global du montant dû au crédit le plus proche avec demi-crédit vers le haut. **Ne pas créer une nouvelle taxe** lors d'un simple déplacement interne après régularisation de la même importation. Les éventuels frais de passage locaux déjà configurés ont un motif distinct et suivent les mécanismes existants ; éviter tout double prélèvement du même droit.
- [CIBLE PROPOSÉE] Contrôle documentaire : habilitation de l'agent impérial + session locale + lot/vaisseau/cellule ciblé → consultation des **preuves pertinentes**. Le contrôle ordinaire du composant de fret caché ne prouve actuellement ni la taxe ni la licence : prévoir un raccord spécifique, **sans déclarer que ce contrôle existe déjà**.
- [CIBLE PROPOSÉE] Inspection approfondie : utiliser, lorsque la cible est une soute, le moteur d'inspection existant, ses habilitations, durées, PA et seuils, sans inventer un autre barème ; pour les cellules, créer un raccord dédié et définir précisément son périmètre avant codage. Un agent n'obtient pas de gestion générale du stock par le seul scan.
- [CIBLE PROPOSÉE] Révéler seulement ce que la procédure autorise : manifeste déclaré ; preuve de paiement ; puis, sur inspection physique légitime, contenu réellement inspecté. Une fraude potentielle exige constat, décision MJ et procédure appropriée. **Contrôler, retenir, saisir, confisquer et restituer sont des actions distinctes**. Les procédures natives de saisie ne couvrent pas encore de manière équivalente les soutes et entrepôts : extension et recette obligatoires.
- [CIBLE PROPOSÉE] Stockage *sous douane* (marchandises non importées mais retenues en transit) : **règle séparée non encore arbitrée**, aucun dédouanement automatique du seul fait du dépôt, aucun droit de vente implicite.

### 10.4 Intrusion, espionnage et vol [VALIDÉ / CIBLE PROPOSÉE]

- [VALIDÉ] Un Rogue peut tenter d'obtenir des informations de cargaison via QR si les compétences nécessaires lui sont réellement acquises. **Espionnage puis vol éventuel** = deux parcours autonomes et conditionnels. Ce n'est pas un accès général à la logistique d'autrui.
- [CIBLE PROPOSÉE] Conserver la compétence **INF-01** telle que codifiée, accessible aux personnages qui la possèdent effectivement, indépendamment du simple intitulé de classe « Rogue ». Réutiliser sa cible fictive d'intrusion M6, son D6 ou mini-jeu configuré, sa durée, son PA et son cooldown canoniques. La présence locale au terminal concerné ne doit pas modifier ses barèmes.
- [CIBLE PROPOSÉE] L'intrusion liée à une cellule/soute/lot peut révéler, **si explicitement préparé par le MJ** : existence de lots, nature/type, quantité, propriétaire, statut douanier ou identifiants fictifs utiles à une mission. Chaque champ est indépendant et peut rester caché même sur réussite ; ne pas exposer les lots privés avant résolution. Le succès n'émet ni code d'administration, ni mandat de stockage, ni opération de retrait.
- [CIBLE PROPOSÉE] **Vol distinct :** nouvelle commande explicite avec une cible réelle, une quantité et des conditions propres (présence au dock, cible accessible, lot disponible, capacité d'emport ou de réception, éventuelle clé/droit acquis par la fiction, règles de surveillance et validation MJ le cas échéant). Le fait d'avoir espionné peut devenir un prérequis d'un scénario, mais ne suffit **jamais** comme permission de transfert.
- [CIBLE PROPOSÉE] Une réussite de vol effectue **un seul transfert de garde/propriété selon les règles du scénario**, depuis le lot source vers un emplacement autorisé, de manière transactionnelle : décrément de l'un, attribution unique à l'autre, filiation, événement d'audit et réessais idempotents. Une tentative échouée n'accorde ni contenu ni possibilité d'énumérer les lots secrets.
- [CIBLE PROPOSÉE] Si les règles existantes ne prévoient **pas** de vol de biens stockés, ne pas détourner `ROG-02` (vol à la tire d'un **personnage**, cible et lieu explicitement réglementés) ni ouvrir la mutation logistique de tiers. Définir un nouveau parcours fictif limité aux biens stockés. Le **coût, la durée, la limite de volume, la récupération et le quota de réussite** sont désormais **validés au §10.9**. Le prérequis d'entrée est traité au §10.8 ; la nécessité éventuelle d'une compétence ou d'un jet supplémentaire, ainsi que le protocole de remise physique, restent à définir sans détourner ROG-02. En première tranche, cibler les **cellules des docks** ; un vol en soute de vaisseau ne doit pas court-circuiter les règles d'abordage/piraterie.
- [CIBLE PROPOSÉE] Journal MJ systématique ; notifications au propriétaire ou à la douane **paramétrables** en fiction, sans révéler instantanément un espion silencieux. Aucun verrou physique ne doit être réellement ouvert par l'application et aucune confrontation réelle risquée n'est exigée.

### 10.5 Régie MJ — docks [CIBLE PROPOSÉE]

Depuis **Lieux & Terminaux → Docks**, offrir :
1. Configuration des quais, terminaux et cellules, capacités, noms, prix d'achat, durées/loyers de location, disponibilités et QR téléchargeables.
2. Attribution et consultation de la propriété / location ; mandats d'accès séparés pour consulter, déposer, retirer, gérer la cellule, contrôler et autoriser une procédure de vol.
3. Journal des cargaisons par lot : propriétaire, détenteur/garde, port et emplacement, quantité, statut légal par port, réservation, filiation, preuves et quittances fiscalo-douanières, sans diffusion publique des secrets.
4. Paramétrage des cibles INF-01, des informations révélables et de l'opération de vol **distincte** suivant le barème validé du §10.9 ; cette opération reste désactivée dans le moteur tant qu'elle n'a pas été développée et recettée.
5. Habilitations des agents impériaux, types d'inspection permis, registre des contrôles, retenues, saisies, décisions et recours ; simulateur MJ par personnage et cible.
6. Gestion des cas bloqués, annulations motivées, droits révoqués et reprise d'épisode sans perte de lots ni paiement en double.

### 10.6 Recettes complémentaires [À TESTER — NON EXÉCUTÉES]

| ID | Cas | Attendu |
|---|---|---|
| DOCK-01 | Création/location ou achat d'une cellule au port | Titulaire et capacité corrects ; paiement unique ; pas de stock gratuit |
| DOCK-02 | Deux personnages prétendent acquérir la même cellule | Une attribution seulement |
| DOCK-03 | Soute à quai → cellule au même port | Quantité conservée, réception requise, même propriétaire |
| DOCK-04 | Cellule → soute, manque de capacité | Refus sans mouvement ni débit |
| DOCK-05 | Transfert depuis une autre planète | Refus de téléportation |
| DOCK-06 | Scan d'un QR de cellule par un tiers | Pas de lecture du stock ni de retrait |
| DOCK-07 | INF-01 réussie, révélation limitée à « nature » | Seule la nature préparée est divulguée |
| DOCK-08 | INF-01 échouée | Aucun lot, identité, quantité ou secret privé exposé |
| DOCK-09 | Intrusion réussie puis tentative de retrait sans vol autorisé | Refus serveur de mutation |
| DOCK-10 | Vol distinct autorisé et réussi | Débit source/crédit destination atomiques et journal unique |
| DOCK-11 | Vol simultané du même dernier exemplaire | Aucun double vol ; conservation des quantités |
| DOCK-12 | Agent habilité contrôle une quittance pour le bon lot/port | Preuve et statut projetés selon droits |
| DOCK-13 | Simple transfert local de lot déjà dédouané | Aucun deuxième paiement du même droit d'importation |
| DOCK-14 | Transit non importé puis tentative de vente locale | Pas de revente libre sans régime d'importation valide |
| DOCK-15 | Inspection sans pouvoir de saisie | Aucune saisie ou confiscation par simple contrôle |
| DOCK-16 | Ancien Master/session | Aucun nouveau droit/vol/QR local implicite |

Recette fonctionnelle, refus HTTP/Auth, concurrence transactionnelle, confidentialité, intégration des compétences et essais terrain sur QR imprimés. Ces scénarios sont des **critères**, pas des tests exécutés.

### 10.7 Arbitrages encore ouverts [NON VALIDÉS]

- **Acquisition des cellules :** prix de vente, transférabilité/revente du titre, propriété individuelle ou collective et éventuel rôle de propriétaire initial.
- **Vol de stockage :** durée, PA, récupération, volume et quota **tranchés au §10.9** ; restent à arbitrer une éventuelle compétence ou un jet supplémentaires, les conditions de gardiennage et les modalités de remise physique. Les alarmes sont indépendantes du niveau de sécurité et configurables par cellule.
- **Douanes dans les cellules :** qui peut autoriser une inspection approfondie ou une saisie en entrepôt ; distinguer l'entreposage ordinaire du stockage sous douane.
- **Confidentialité de l'accès physique :** informations visibles publiquement sur le numéro de cellule, son occupation et son titulaire.

Aucune décision non tranchée ci-dessus n'autorise un changement de code canonique, de taux, de règles de vol, de sécurité ou un déploiement en production.


### 10.8 Ouverture de lieux verrouillés, niveaux de sécurité et prix — décision du 17/11/2026

**[VALIDÉ] Principe général :** pour pénétrer dans un lieu verrouillé, un joueur doit **soit disposer d'un code ou d'une clé d'accès valide**, **soit forcer l'accès fictif avec la compétence adaptée**. Les lieux possèdent des **niveaux de sécurité différents**. Les cellules de dock les plus sécurisées doivent être **plus difficiles à forcer et plus chères à l'achat**, toutes choses comparables par ailleurs.

**[CIBLE PROPOSÉE]** Une même règle doit servir aux cellules de docks et, lorsque le MJ le paramètre, à d'autres zones/casiers/coffres/locaux fictivement fermés. L'entrée est un droit **local et temporaire** distinct des permissions de lire la totalité des lots, d'effectuer des mouvements logistiques, de prendre une marchandise ou d'agir en tant que douanier.

#### Échelle de sécurité adossée au canon INF-01

Le Livre des règles Space Outlaws V0.7, chapitre 14, définit :
- **INF-01 N1 :** serrures et terminaux simples ;
- **INF-01 N2 :** contrôles d'accès et verrouillages électroniques ordinaires ;
- **INF-01 N3 :** systèmes avancés ;
- **INF-01 N4 :** réseaux et dispositifs complexes ;
- **INF-01 N5 :** systèmes exceptionnels, sans réussite automatique.

**[CIBLE PROPOSÉE]** Exposer sur chaque cellule un champ \`securityTier\` (N1–N5) qui détermine le **niveau minimal d'INF-01** pour une tentative de forçage ; créer des descriptions immersives « simple / renforcé / avancé / complexe / ultra-sécurisé », sans en faire de nouvelles classes ou compétences. Un Rogue ne dispose pas automatiquement d'INF-01 : le Rogue et l'Infiltrateur demeurent distincts ; seul le personnage ayant réellement acquis la compétence peut tenter l'intrusion.

La **difficulté de résolution** (seuil de D6 ordinaire ou mini-jeu préparé) se configure séparément, selon les paramètres et limites **déjà canoniques d'INF-01**, sans barème universel ajouté. Le MJ contrôle la cohérence de difficulté croissante d'une cellule N1 à N5. Un personnage de niveau supérieur ne réussit pas automatiquement.

#### Parcours « code ou forçage »

1. Le joueur se rend physiquement à la cellule ou au terminal de zone et scanne le QR public ; le QR n'expose ni le code ni le contenu privé.
2. **Code partagé / clé unique valide :** le serveur vérifie la portée exacte, l'état, le titulaire éventuel et la révocation ; ouvre alors l'accès fictionnel selon cette autorisation **sans jet ni PA d'INF-01**. Un code de cellule n'est ni une licence professionnelle ni un mandat global de gestion des stocks.
3. **Sans code/clé :** afficher une commande « Forcer l'accès » uniquement si la cible est configurée comme forçable ; soumettre le niveau effectif **INF-01 ≥ niveau minimal de la cellule** et les conditions canoniques de lancement/résolution. La compétence n'est pas conférée par la classe Rogue ni par le scan.
4. Un **forçage réussi** ouvre, pour le personnage qui l'a accompli, un **accès fictionnel temporaire à cette cible précise**. Il n'émet ni mot de passe, ni clé transférable, ni droit permanent ; les conséquences de scénario (journal MJ, alarme, visibilité aux propriétaires) sont paramétrées par le MJ. Un échec ne révèle ni code ni stock et respecte les conséquences/cooldowns natifs INF-01.
5. L'**entrée** ne produit **aucun mouvement de lot**. Un vol de cargaison exige le parcours distinct du §10.4 et une quantité/une cible effectivement accessibles selon ses règles, une nouvelle confirmation et la transaction métier native. L'entrée ne vaut pas automatiquement permission administrative de lire tous les stocks ni autorisation de vendre/transférer les marchandises. Le MJ choisit explicitement ce qu'une entrée réussie peut faire **voir**, puis quels parcours distincts elle rend **tentables**.
6. Une inspection impériale conserve son **habilitation douanière** et son protocole de contrôle (§10.3). L'habilitation à inspecter ne fabrique pas automatiquement un code de la cellule, ni un droit de saisir. Une autorisation officielle de pénétrer peut être représentée par une clé/code habilité ou un mécanisme scénarisé explicitement créé par le MJ, sans accès matériel réel.

**Sécurité physique :** le terme « forcer » désigne une interaction **ludique** sur le QR/terminal, jamais l'ouverture ou la dégradation d'une vraie porte, serrure ou installation. Les zones réellement interdites au public restent fermées, quelle que soit la réussite fictionnelle.

#### Prix et configuration MJ

**[VALIDÉ]** À caractéristiques comparables, un niveau de protection plus élevé implique un **prix d'achat plus élevé** et une difficulté de forçage accrue.

**[CIBLE PROPOSÉE]** Le MJ renseigne, pour chaque type de cellule ou cellule individuelle : port, emplacement, capacité, niveau de sécurité N1–N5, type de verrouillage, prix d'achat, éventuel loyer, mode de disponibilité, autorisations/codes/clés, difficulté INF-01 (seuil D6 ou mini-jeu), contenu visible après entrée, options d'alerte. Les tarifs **ne sont pas chiffrés** ici : aucun prix canonique ne doit être inventé. L'éditeur doit permettre de comparer les prix et avertir si, **à capacité et conditions identiques**, une cellule plus sécurisée n'est pas plus chère. Une petite cellule N5 peut néanmoins être moins chère qu'un immense hangar N2 ; ne pas confondre sécurité et capacité.

Un ajustement des paramètres de prix/sécurité n'altère **jamais rétroactivement** un achat, un titre de propriété, un bail, une tentative en cours ou l'état d'un lot sans commande explicite autorisée.

#### Recettes supplémentaires [À EXÉCUTER]

| ID | Cas | Attendu |
|---|---|---|
| DOCK-17 | Code de cellule valide, utilisateur sans INF-01 | Entrée fictionnelle autorisée sans test |
| DOCK-18 | Code correct mais révoqué ou valable pour une autre cellule | Refus de l'accès local |
| DOCK-19 | N3 avec personnage INF-01 N2 | Tentative de forçage refusée, aucun PA consommé |
| DOCK-20 | N3 avec personnage INF-01 N3 | Tentative admise, résultat selon résolution canonique et difficulté préparée |
| DOCK-21 | INF-01 N5 sur N5, test échoué | Pas d'entrée ; aucune réussite automatique |
| DOCK-22 | Forçage réussi, retrait de stock non autorisé | Retrait interdit sans parcours de vol distinct |
| DOCK-23 | Prix de cellules de même capacité, niveaux de sécurité différents | Prix croissant et avertissement de cohérence dans la régie |
| DOCK-24 | QR partagé ou scanné hors présence réelle | Règle de fair-play rappelée ; aucun mécanisme de géolocalisation ajouté |
| DOCK-25 | Mise à jour d'une sécurité après achat | Aucun recalcul rétroactif ni altération du titre de propriété |
| DOCK-26 | Forçage fictionnel réussi devant une vraie porte fermée | Aucun déverrouillage/accès physique réel |

Les tests devront vérifier en particulier les contrôles serveur d'accès, l'état exact de la cible, la durée de la session, les effets et PA canonisés d'INF-01, ainsi que l'absence de permission implicite sur les lots ou l'administration.

**Arbitrages résiduels [NON VALIDÉS] :** durée précise d'un accès obtenu par forçage (10 min proposées), contenu visible après entrée, réactions des gardiens, transfert/revente des titres, éventuelle compétence ou jet supplémentaires pour le vol et protocole physique de remise. **Le barème de vol et l'indépendance des alarmes sont validés au §10.9** ; ne pas les rouvrir ou inventer des paramètres connexes sans décision.


### 10.9 Vol de stockage équilibré et alarmes par cellule — arbitrage définitif du 17/11/2026 [VALIDÉ]

L'organisateur valide la **variante « vol équilibré »**, et choisit que les **alarmes soient configurées pour chaque cellule indépendamment de son niveau de sécurité**. Cette décision complète, sans remplacer, INF-01 (intrusion) et ROG-02 (vol à la tire sur personnage).

#### 10.9.1 Barème opposable du « Vol de stockage » [VALIDÉ]

| Paramètre | Règle définitive |
|---|---|
| Type d'action | Vol d'un lot **dans une cellule de dock**, séparé de l'ouverture/piratage |
| Temps d'action | **3 minutes de jeu** par tentative résolue ; l'horloge de jeu respecte les pauses/STOP |
| Coût en PA | **1 PA uniquement si le vol réussit**, aucun PA consommé sur échec ; réserver/libérer le PA selon les gardes natives |
| Volume maximal | **5 unités de volume logistique** au maximum par opération réussie, pas 5 unités de quantité marchande par défaut |
| Récupération | **10 minutes de jeu après toute tentative résolue**, qu'elle réussisse ou échoue |
| Quota | **1 vol réussi maximum par personnage et par cellule, par session** |
| Surveillance et alarmes | **Choisies indépendamment pour chaque cellule**, sans déduction automatique depuis N1–N5 |

**Précisions d'application du barème [CIBLE D'IMPLÉMENTATION] :**
- Le joueur doit être **présent fictionnellement** au dock, disposer d'un **accès local valable à la cellule** obtenu par code/clé ou par ouverture INF-01 réussie (voir §10.8), puis initier **séparément** un « Vol de stockage » ; une intrusion seule ne déplace rien.
- L'opération vise un **lot réellement disponible**, avec volume connu, et un emplacement de destination admissible. La limite de 5 porte sur la **somme des volumes des unités volées**, contrôlée avec la capacité native ; ne pas modifier arbitrairement les quantités par volume. En cas de vol partiel, employer le fractionnement et la filiation des lots existants.
- Une tentative ne peut devenir réussie si le personnage a déjà réussi **dans cette même cellule pendant la session**. Le quota ne s'étend pas automatiquement à toutes les cellules d'un même propriétaire ; les différents personnages possèdent leurs quotas propres, sous réserve des protections de stock et des éventuelles restrictions de surveillance validées.
- Les préparations, réservations et confirmations doivent être **authentifiées, contrôlées côté serveur, transactionnelles et idempotentes** : aucun double vol sur le dernier exemplaire, aucune création de stock/argent, aucun changement fantôme de propriétaire, aucune consommation répétée du PA. En cas d'abandon **avant résolution**, libérer les réservations selon le moteur natif, sans comptabiliser une tentative réussie.
- Le vol n'efface ni origine, ni historique, ni caractère interdit/réglementé, ni quittances douanières. L'acquisition illégale d'un lot ne le dédouane jamais.
- Un accessoire matériel de jeu n'est transféré physiquement que par un protocole sécurisé préparé par le MJ. Le programme ne force jamais une véritable porte ou serrure.
- **Aucun nouveau jet ou compétence supplémentaire n'est canonisé par ce barème.** La résolution du vol, après ouverture effective, doit être raccordée aux conditions métier et éventuelles circonstances de surveillance ; si le moteur exige une nouvelle règle de réussite/échec, la soumettre à un arbitrage spécifique, sans appliquer ROG-02 hors de son périmètre.

#### 10.9.2 Modes de surveillance et déclenchements [VALIDÉ : CONFIGURABILITÉ ; PROPOSITIONS POUR DÉTAILS]

Le MJ choisit un mode **pour chaque cellule** séparément de \`securityTier\` N1–N5 et peut le faire évoluer explicitement ; aucune alarme n'est imposée automatiquement à un niveau. Trois modes d'éditeur à proposer :

| Mode | Effet de jeu envisagé |
|---|---|
| \`SILENT\` — discret | Journal MJ sans avertissement automatique du propriétaire |
| \`DELAYED\` — différé | Avertissement fictif anonyme après vol réussi ; **10 minutes proposées** par analogie avec ROG-02, délai ajustable par le MJ |
| \`IMMEDIATE\` — renforcé | Alerte fictive immédiate au MJ, à la sécurité ou aux agents habilités, sur les événements d'effraction/vol configurés |

**Les trois modes et le délai de notification sont des modalités proposées** pour réaliser le choix d'alarmes personnalisables. Ils ne sont pas des obligations universelles imposées aux propriétaires. Le MJ doit pouvoir désigner les destinataires et les événements qui déclenchent chaque alarme, selon les capacités disponibles.

L'alerte est une **information de jeu**, pas un droit de saisir le stock ou de découvrir l'identité de l'intrus. Une alarme active n'ouvre pas automatiquement l'inventaire au surveillant ni le droit d'annuler une action terminée. La surveillance humaine directe et ses effets de blocage ou d'interruption nécessitent toujours une définition séparée.

#### 10.9.3 Contrôles MJ et recette ajoutés [À TESTER — NON EXÉCUTÉS]

Le dashboard **Docks → Cellule** expose : niveau de sécurité N1–N5, prix (configurable), mode d'alarme, destinataires/événements, autorisations et historique des tentatives ; la durée de 3 minutes, le coût conditionnel de 1 PA, la récupération de 10 minutes, la limite de 5 de volume et le quota sont **règles de jeu validées**. Si un Master/une session ne dispose pas encore de l'extension, le parcours de vol reste fermé sans modifier l'historique.

| ID | Cas | Résultat attendu |
|---|---|---|
| DOCK-27 | Vol réussi de 3 unités de volume | 3 min de jeu, 1 PA débité, 10 min de récupération, lot déplacé une fois |
| DOCK-28 | Échec après tentative résolue | 0 PA consommé, 10 min de récupération, aucun stock déplacé |
| DOCK-29 | Vol dépassant 5 unités de volume | Refus, pas de mutation ni création de lot |
| DOCK-30 | Nouvelle réussite du même personnage dans la même cellule et session | Refus de seconde réussite, sans attribution de lot |
| DOCK-31 | Deux personnages dans la même cellule | Quotas distincts ; protections de concurrence conservées |
| DOCK-32 | Intrusion réussie sans opération de vol | Aucun déplacement et aucun transfert de propriété |
| DOCK-33 | Cellule N5, alarmes configurées en mode discret | Aucune notification automatique du seul fait de N5 |
| DOCK-34 | Cellule N2, alarmes configurées en mode renforcé | Alerte selon configuration malgré N2 |
| DOCK-35 | Mode différé | Aucune identité d'intrus révélée sans règle spécifique ; notification au délai paramétré |
| DOCK-36 | Coupure/réessai après résolution du vol | Un seul PA, un seul changement de lot, un seul quota consommé |
| DOCK-37 | Pause/STOP pendant les 3 min | Chronomètre de jeu suspendu conformément à la mécanique de session |
| DOCK-38 | Lot volé avec justificatifs douaniers | Statut légal et historique conservés, sans régularisation automatique |

**Statut :** seuls les paramètres approuvés par l'organisateur sont figés. Cette rédaction documentaire ne modifie aucun code applicatif, aucun prix canonique, aucune donnée de session, aucune règle Firebase, aucune branche \`main\`, ni aucun déploiement.
