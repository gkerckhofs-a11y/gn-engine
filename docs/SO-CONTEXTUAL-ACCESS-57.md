# Mission #57 — accès contextuels

Date : 17 novembre 2026. Base inspectée : `0590a1e518b86e1d00e9032b809763a73dc611de`.
Sources : issue #57 ; addendum de la PR #56 sur `docs/acces-contextuels-comptoir-2026-11-17`, commit `327098b591965621705e34f7ebd6f3d8fddbcd37` ; consignes AGENTS et SO-AGENT-OPERATIONS ; canon V0.7, CDC V3.5/V3.6, économie galactique et documentations natives de stockage/commerce/INF-01.

## AC-01 — première tranche jouable

- Régie **Lieux & Terminaux** : création/modification, durée explicite de 30 à 3600 secondes de jeu (borne technique, aucune durée par défaut canonisée), fermeture et révocation de présence.
- Joueur : lien dans le terminal personnel, scan caméra natif ou saisie, attestation de présence, renouvellement explicite et ouverture du comptoir natif.
- Contrôle transactionnel pour `shop`, `prepareShopPurchase` et `buyShopOffer`, par comptoir et opération. Le scan n'accorde aucun mandat métier. Identité, version d'accès, révision du terminal, état du jeu, expiration et politique sont contrôlés avant les reçus natifs.
- Configuration serveur dans `localAccess/{sessionId}` : terminaux, bindings, présence par personnage, journal privé borné à 100 entrées à l'écran. Aucun secret dans le QR `#/local/{sessionId}/{terminalId}`. Collections interdites aux SDK clients par les règles Firestore existantes.
- Extension de session explicitement configurée ; aucun Master publié modifié, aucune migration ni activation rétroactive. Sans binding, les ressources et offres historiques suivent exactement leurs services antérieurs. Ces configurations ne sont pas encore transportées à l'épisode suivant ; nouvelle préparation MJ nécessaire.
- Convention technique : un contexte actif par personnage, temps de jeu suspendu par l'horloge native. Reconfiguration du terminal invalide les présences existantes. Les fouilles restent dans leur parcours universel distinct.

Validation locale : build ; 40 tests ciblés contexte/circuits/espaces/terminal et 2 tests UI ; 4 cas partagés sur Firestore ; un parcours HTTP/Auth du véritable adaptateur serveur, incluant refus anonyme/joueur-régie/sans scan et révocation avant réessai. Node 24.22.1, Java 21 ; Node 22 requis et utilisé par la CI. Aucun essai humain, QR imprimé ou smartphone réel.

## Suite de la mission

AC-02 : licences/codes/clés, simulateur et exports complets à développer. AC-03 : modes de remise explicites, sans changement des offres historiques. AC-04 : cellules portuaires avec réemploi logistique. AC-05 : garder les mécanismes de vol non arbitrés fermés ; changement de titre et règle de résolution ne sont pas déduits d'INF-01 ou de ROG-02. AC-06 : couverture intégrée et écarts factuels, sans certification terrain implicite.

Aucune fusion, migration, suppression ou publication Firebase autorisée par ce rapport.

## Correction révélée par la première CI

CI `44073317027`, candidat `bdf646d660cc8cafe7158f35fad8f5b774b88781` : application réussie ; 115/115 HTTP/Auth réussis ; 25/26 parcours navigateur réussis. Le parcours Sabacc après rotation du QR reste sur « QR remplacé ». Le relevé navigateur et le code montrent un retour fondé sur le dernier accueil en cache et une actualisation perdue si un polling est déjà actif. Correction limitée : relire l'accueil avant de retrouver sa place et mettre en attente une actualisation demandée pendant un polling. Aucun droit ou résultat de jeu changé. Build et 22 tests ciblés Sabacc/contexte/UI réussis localement ; recette navigateur locale bloquée (socket Chromium refusé, téléchargement du shell invalide). La CI du correctif doit prouver le parcours navigateur ; l'échec initial n'est pas présenté comme un succès.

## Sélection CI ciblée explicite pour les tranches

Le plan historique ne cherchait un succès global que sur la même branche ; une branche dédiée neuve ne pouvait donc jamais utiliser un profil ciblé. Pour un commit explicitement `[ci targeted:contextual-access]`, le plan peut désormais chercher aussi sur la base de cette PR du même dépôt. Il exige toujours un run global terminé avec succès, une identité de dépôt exacte, un SHA valide et un ancêtre prouvé du checkout. Le diff comprend tous les changements depuis ce succès, y compris la base de PR ; aucun échec/annulation/succès partiel n'est utilisé. Sans preuve, le ciblage est refusé ; les PR prêtes, `[ci full]`, push main, lancement manuel et les profils ordinaires gardent le complet. Aucune modification de workflow ni diminution de ces gardes.

Profil contextuel : tests des services natifs commerce/inventaire/comptes, contexte et interfaces ; douze suites Firestore incluant les règles et Sabacc ; HTTP/Auth contextuel et régressions commerciales ; **recette navigateur existante obligatoire**, afin de vérifier le correctif Sabacc. Les fichiers serveur/adaptateur/règles/package et le fret restent hors profil. 58 tests de sélection CI réussis localement ; première exécution du profil applicatif : 264 tests réussis (avant ajout du dernier test de périmètre). Les validations ciblées ne certifient pas une régression globale ; le jalon AC-06 conserve sa CI complète.

Le premier plan ciblé `44076848425` a correctement refusé un fichier concurrent de la base de PR : `main` est passé à `a7b56c5` pendant la mission. Inspection du diff : seul `.github/holopedia-request.json` a changé (texte, numéro de demande et portée des affiches Holopédia), aucun code GN ni workflow. Ce fichier de demande statique est explicitement classé dans le profil, avec la suite `release-ci` ; il n'est pas modifié par notre branche. Le workflow de publication reste limité à main et n'est ni modifié ni déclenché par cette mission. Les autres fichiers inconnus, les règles, les adaptateurs et le serveur restent refusés par ce profil. Aucune validation n'est déduite du seul déploiement Holopédia.

## AC-01 — CI vérifiée avant AC-02

Candidat `ed358e611916823e02ab0cf3d47fce497b003452`, checkout fusionné `bb1d90a3cc8a031cbc444c81af6377f578db2097`, [CI 44077241742](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/44077241742) terminée avec succès : 268 tests applicatifs ciblés, 156 Firestore (21 + 48 + 37 + 50), 3 HTTP/Auth et 26 parcours Chromium. Zéro échec ou test ignoré dans ces sélections. Le correctif Sabacc est validé par le parcours qui avait échoué. Référence globale vérifiée par le plan : `0590a1e`, CI `44061147226`. Ce succès ciblé ne vaut pas certification globale ou humaine.

## AC-02 — régie, autorisations et QR

- Conditions distinctes pour consulter, vérifier et confirmer l'achat ; liste nominative et compétence restent des conditions indépendantes des autorisations combinées par ET/OU.
- Licences attachées à un personnage ; codes partageables, preuve liée à la présence et à la révision du code ; clés référencées à un **lot INDIVIDUAL réellement existant**, quantité un, actuellement possédé et reçu dans le sac. Aucun actif créé par l'éditeur. Donner/voler la clé conserve les parcours natifs du lot et révoque l'ancien accès. Aucun code, empreinte ou identité privée ajouté au QR ou à la projection joueur.
- Modification/révocation sous autorité MJ courante, contrôle avant reçus, révisions, bornes et journal privé avant/après sans secret. Révocation de présence idempotente : rejouer une ancienne commande n'efface pas un nouveau scan.
- Simulateur explicite du personnage, terminal et opération ; pour un achat, offre et quantité choisies. Condition locale puis **aperçu du comptoir natif** sur la même lecture transactionnelle, écritures interdites. Option « après scan » hypothétique ne crée aucun contexte. L'identité d'exécution hypothétique est construite seulement après autorité MJ et relecture de l'inscription actuelle, jamais à partir d'une identité fournie par le client.
- Recherche des terminaux, édition des permissions par opération, listes d'aide M5/personnages, gestion et révocation des autorisations, aperçu et lien public des QR.
- QR individuels PNG 1800 px / SVG nu / PDF A4 / ZIP ; lots PDF A4 et ZIP contenant tous les PNG/SVG + la planche PDF. PDF vectoriel avec libellé abrégé et identifiant stable, six QR par page. Aucun secret embarqué.

Validation locale : build ; 279 tests applicatifs ciblés ; huit nouveaux cas Firestore de permissions et deux HTTP/Auth contextuels réussis ; les quatre cas Firestore AC-01 ont aussi été rejoués au début du lot. Tests QR : PNG et SVG relus par jsQR, structure/xref/streams et matrice du PDF vérifiés, archive et pagination testées. PDF de sept terminaux réellement rendu par PyMuPDF (deux pages, accents vérifiés) et première page inspectée. Aucun vrai QR imprimé ni smartphone humain. Un parcours supplémentaire est ajouté à la recette Chromium pour configuration PC, téléchargement, scan mobile et révocation ; résultat CI du commit à vérifier avant AC-03.

Limites conservées : paramètres de session uniquement, pas de modification des Masters publiés ni d'héritage automatique de ces nouvelles autorisations. Le simulateur actuel est raccordé aux opérations de comptoir publiées ; aucune simulation générique d'un service non connecté n'est annoncée.

## AC-02 — CI vérifiée avant AC-03

Candidat `dc07bfab2ac95aced0204016d2ede3ea2adad88c`, [CI 44080464178](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/44080464178) réussie sur tous les jobs requis : application ciblée, 164 Firestore (52 + 44 + 20 + 48), quatre HTTP/Auth et 27 parcours Chromium, dont le nouveau parcours PC/mobile des terminaux. Aucun essai humain revendiqué.

## AC-03 — choix de livraison par offre

- Extension optionnelle M5 `deliveryMode=DIGITAL|PHYSICAL`, marquée `deliverySchemaVersion=1`, conservée dans préparation, normalisation, publication et naissance. Le nouveau formulaire demande un choix ; l'édition d'une ancienne offre peut conserver explicitement son fonctionnement historique.
- Colonne centrale optionnelle `mode_livraison` ; imports sans colonne préservent les modes existants et les négociations. Les Masters CAMPAGNE/SESSION historiques restent inchangés. Aucun ajout automatique de mode aux anciennes définitions, instances ou commandes.
- Régie du comptoir : choix explicite pour les achats futurs, avec révision, motif, historique et droits MJ. Capacité serveur bornée `SHOP_DELIVERY` aux offres/historiques, sans capacité financière ou de stock supplémentaire. Un changement de mode invalide un devis ouvert et ne modifie jamais les commandes payées.
- Le paiement utilise **la transaction native de vente** : même compte, même stock réel, même filiation et reçu. En numérique, seule la destination/détention de l'attribution et le statut de livraison changent dans cette transaction ; aucun second moteur, stock gratuit ou étape physique fictivement attestée.
- En physique, la propriété est acquise mais le lot reste chez le comptoir, puis remise MJ et confirmation joueur natives. Une présence locale expirée n'empêche pas la fin de cette commande déjà acceptée. Les opérations nouvelles restent soumises au scan et aux droits courants.
- Le circuit est conservé : `PERSONAL`/`FUEL` restent dans leur destination native ; `COMMERCIAL` rejoint le stock commercial du port, jamais le sac. Le choix de mode ne confère ni classe Courtier, ni mandat, ni compétence.
- Catalogue, confirmation, reçu et message de paiement affichent le mode réellement fixé. Le simulateur réutilise ces aperçus sans achat.

Validation locale : compilation et 433 tests applicatifs ciblés (commerce, inventaire, comptes, contexte, M5/import/normalisation/publication et snapshots) ; huit nouveaux parcours Firestore de livraison ; trois HTTP/Auth contextuels, comprenant livraison numérique/réessai puis livraison physique avec mode figé. Concurrence sur dernier stock, devis périmé, rollback après écritures, ancienne offre, nouvelle publication M5 et refus de droits vérifiés. La fixture de portefeuille contextuel lit maintenant le compte effectivement incarné après naissance, pour vérifier ses soldes réels. Recette navigateur supplémentaire : choix du mode en régie et achat depuis un terminal local, disponibilité dans le sac mobile ; résultat CI à vérifier avant AC-04.

Les annulations/remboursements, les taxes, les montages de modules et le ravitaillement conservent leurs règles natives ; aucune nouvelle règle n'est ajoutée par le mode de livraison. L'adoption d'une future version et un retour logiciel doivent préserver les champs/reçus nouveaux ; aucune rétroconversion d'un achat payé n'est permise.

## Reprise du 17 novembre 2026 — AC-04

Les arbitrages de l'organisateur sont consignés dans le commentaire de PR #58
`issuecomment-6953767214` : INF-01 ouvre dix minutes de jeu ; vol automatique après
les trois minutes si toutes les préconditions restent satisfaites ; détention seule,
propriété légale conservée ; remise physique confirmée par le MJ.

Première tranche docks : extension explicite de `saveCommercialStorage`, sans
nouveau moteur de paiement. Mode RENT ou OWN, prix saisi par le MJ, titre personnel
ou collectif indépendant du compte payeur et de la propriété de chaque lot. Un achat
n'expire pas ; aucun renouvellement, restitution, changement de mode, revente ou
cession de titre n'est ouvert. Les anciens entrepôts conservent leur contrat.
La création explicite d'une cellule ouvre `dockStorageVersion=1` dans cette session,
sous une capacité serveur bornée : le mandat `manageStorage` devient configurable,
sans l'accorder à aucun membre existant. Les mandats lecture/dépôt/retrait restent
indépendants ; un dépôt en cellule collective ne cède pas le lot au groupe.

Raccord des cellules au moteur `cargo.mjs` et à ses réservations/réceptions natives,
par lots de cinq unités de volume et trois minutes de manutention déjà canoniques.
Soute à quai et cellule du même port ; marchandise personnelle, détention douanière,
contrat actif, dissimulation et autres réservations refusés pour ce raccord. Aucun
nouveau prélèvement fiscal. Quantité, filiation et propriété du lot conservées.
Les contrôles locaux et les mandats sont revalidés avant les reçus idempotents.

Un terminal existant peut maintenant publier `dockEntry` pour une cellule précise.
Code/clé et présence locale, ou réussite INF-01 native récente sur la cible liée de
même niveau N1–N5 : dix minutes à partir de la réussite, aucune clé/code créé.
Le lancement et la résolution INF-01 vérifient aussi le scan ; les durées, PA,
cooldowns, D6/mini-jeu et conséquences natives restent inchangés. La projection
d'entrée ne révèle que les champs préparés (nature, quantité, statut légal), sans
mandat implicite sur les marchandises. QR de terminal réemployé et exports AC-02.
La régie signale les prix incohérents à capacité/port/mode/période comparables.

Validation locale de la tranche avant commit : build, 143 tests ciblés de premiers
raccords, puis 38 tests docks/groupes après ajout du mandat collectif. Six cas
Firestore et un cas HTTP/Auth ont réussi sur émulateurs ; les tests sont rejoués
sur l'état final avant commit. Les sélections se recouvrent, ne pas additionner.
État final avant commit : build + 175 tests applicatifs ciblés, huit tests
Firestore partagés et un test HTTP/Auth docks réussis, zéro échec/ignoré.
Nouveau parcours Chromium ajouté : configuration PC, achat mobile et refus d'accès
sans scan/code ; non déclaré réussi avant sa CI. Node local 24.22.1, Java 21.

Limites : pas de protocole nouveau de saisie/inspection approfondie en cellule,
ni stockage sous douane ; aucun droit implicite de revente de biens volés. Délégation
à un tiers par mandats de groupe ; pas de nouvelle liste de délégataires personnels.
Les configurations locales sont propres à la session : elles devront être préparées
à nouveau pour un autre épisode. AC-05 et la recette globale AC-06 restent à faire.
Aucune migration, fusion ou publication Firebase.

### Première CI AC-04 et correctif

Candidat `f89270a`, CI `44127602231` : build et 3311 tests applicatifs complets
réussis. HTTP/Auth terminé avec succès ; 28 parcours navigateur réussis, le
nouveau parcours Dock a échoué : le sélecteur du bouton de création trouvait aussi
le formulaire d'édition d'un entrepôt créé par une recette antérieure. Le sélecteur
est limité au formulaire de création dans la section dédiée. Aucun succès global
n'est attribué à cette exécution. Le navigateur local ne peut pas démarrer ici
(binaire Playwright absent, Chromium système arrêté à son lancement) ; la preuve
navigateur reste attendue de la CI.

Le raccord INF-01 revérifie aussi le niveau de sécurité de la cellule et sa
concordance avec la cible publiée à chaque lancement/résolution : une retouche M6
ne peut pas abaisser silencieusement la protection d'une cellule déjà configurée.
