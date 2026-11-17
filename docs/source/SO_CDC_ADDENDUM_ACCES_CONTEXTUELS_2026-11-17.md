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
