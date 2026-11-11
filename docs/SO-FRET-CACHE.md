# Fret caché et inspections — composant préparatoire

État du 4 novembre 2026. Sources : règles V0.7 chapitres 17/24 et décision explicite utilisateur **B** du 4 novembre 2026, consignée dans [les règles du projet](source/SO_Regles_V07.txt).

MOD-04 est raccordé dans le code proposé pour les nouveaux manifestes hiddenCargoVersion=1 seulement : définition/offre canonique, provision MJ, achat/réception, mandat personnel, montage, fret caché/inspections, vol équipé/panne et retrait vidé. Ce marqueur et ses dépendances sont inclus dans confirmation/digests et transmis à la naissance. Anciens manifestes/sessions sans marqueur non enrichis ; valeur inconnue, dépendance manquante ou définition MOD-04 sans marqueur refusées. Aucun déploiement ou fusion main.

Des tests de composants utilisent encore des modules synthétiques isolés. Neuf nouveaux cas et un HTTP/Auth couvrent les parcours natifs réellement publiés, achetés, reçus, montés et lancés : ils constituent la preuve du raccordement de l’équipement.

## Stock et droits

Le propriétaire personnel du vaisseau peut dissimuler ses lots disponibles déjà dans la soute, à quai à la même escale, sans contrat de transport ni garde d’abordage. Le compartiment doit correspondre à un lot individuel MOD-04 réellement référencé, INSTALLED, quantité 1, propriété/calibration/emplacement/réserves cohérents. Volume caché 5 sur cargo, 10 sur transport ; capacité totale inchangée 20/50. Pas d’argent, PA ou marchandise créés.

L’API traite un lot entier. Pour une partie, utiliser d’abord le fractionnement du transfert natif. hiddenCargo conserve le vaisseau, la dissimulation et la découverte. Retirer/replacer ne supprime pas discovered/discoveredAt. Une réception de transfert retire concealed, une annulation le conserve ; les lots fractionnés conservent découverte, propriété et provenance. La manutention d’abordage ordinaire refuse un lot dissimulé inconnu même avec attestation MJ.

## Agents et contrôles

La régie attribue/révoque une habilitation N0–N5 avec motif et révision (0 = retirée). N1–N5 n’est ni une classe ni une compétence/XP. Le joueur agit personnellement ; un PNJ sans joueur assigné agit sous régie, au port de son poste. Dossier dans shipMaintenance, exclus des réparations ordinaires ; verrous natifs du vaisseau et de l’agent.

| Contrôle | Temps de jeu | PA | Résultat |
| --- | --- | --- | --- |
| ORDINARY | 120 secondes | 0 | Attestation documentaire, aucune nouvelle révélation ; lots déjà découverts visibles |
| DEEP joueur | 120 secondes | 1 réservé puis consommé | D6 serveur + niveau ≥ 7 ; découverte persistante des lots dissimulés |
| DEEP PNJ | 120 secondes | 0 | Même seuil, habilitation et durée |

Le contrôle ordinaire de ce composant ne valide ni contenu du manifeste, ni licence, ni authenticité, ni taxe. La découverte ne donne pas un code de coffre et ne révèle aucun autre secret. Aucun débit, saisie, amende ou changement de propriété automatique.

Une tentative approfondie par vaisseau et escale, agents confondus. Changer d’agent ne relance pas le dé. Une nouvelle autorisation MJ exige un motif (indice nouveau/décision), puis la prochaine tentative la consomme. L’identifiant d’escale est le voyage natif arrivé ; pour l’escale initiale, il est lié au vaisseau. Une annulation avant résolution ne consomme pas la tentative.

Présence et réalisation explicites, délai non automatique, réserve PA et verrous libérés atomiquement. Annulation rend le PA dans le plafond, même après renouvellement ; le MJ peut restituer après révocation, sans finaliser pour un joueur. PAUSE/STOP figent les délais. Droits/habilitation/marqueur sont vérifiés avant les anciens reçus. D6 calculé une fois pour la résolution, stable pendant les reprises transactionnelles ; réessai n’en produit pas un nouveau résultat.

## Neutralisation — décision B

Les biens déjà rangés restent cachés pendant les quinze minutes de panne ; seul le rangement de nouveaux lots est bloqué. Aucun transfert, découverte ou dommage automatique. Contrôle documentaire sans nouvelle révélation ; inspection approfondie habituelle maintenue avec son habilitation, D6, délai, PA et tentative par escale. Une découverte reste durable après expiration ou rangement ultérieur.

Le profil de vol reste canonique, sans capacité totale ajoutée ni soin. Convoi : un événement commun, un seul appareil choisi. PAUSE/STOP figent le délai. Expiration rétablit uniquement le nouveau rangement. L’interface distingue capacité installée, volume déjà caché et disponibilité courante, avec une explication de la panne B.

## Validation et limites

Local : build et 840/840 ciblés dans 66 fichiers ; hidden-flight : 37 suites Firestore et quatorze HTTP, aucun navigateur ou suite complète. CI exacte dans PR #2. Les nouveaux cas natifs couvrent cargo/transport, panne/inspections/échéance/convoi, ancien manifeste et reprise dans le nouvel épisode. La recette visuelle/humaine Android/iOS reste à faire. Aucune publication en production ni migration implicite.

Les sections suivantes décrivent l’historique du composant avant son ouverture versionnée ; les restrictions préparatoires y mentionnées sont remplacées pour les nouveaux manifestes compatibles.

## Retrait après vidage — 4 novembre 2026

Le devis MOD-04 n’est utilisable que pour REMOVE avec le marqueur de composant courant ; INSTALL reste refusé. Dossier et binding portent hiddenCargoVersion=1, jamais ajouté aux manifestes. Contrôle de chaque lot encore concealed dans le HOLD correspondant, même connu ou appartenant à quelqu’un d’autre. Les propositions, accords, démarrages et ultimes confirmations réutilisent le même validateur.

Vider par un transfert natif vers le sac, ou par la sortie explicite du compartiment vers la soute ordinaire via setCargoConcealment(false), sous droits et présence existants. Aucun stock créé ou détruit, découverte conservée. Une cargaison ordinaire peut rester dans la soute ; elle ne remplit plus le compartiment. Aucun champ « contenu consigné », aucune nouvelle procédure de consignation. Les opérations de cargaison ouvertes bloquent le retrait.

Nouveau consentement personnel propriétaire/Mécano, port et atelier, MEC-03 N2. Cinq minutes de jeu et 1 PA, module/PA réservés, verrous natifs. PAUSE/STOP figent le temps, aucune fin automatique. Le Mécano confirme l’opération réellement effectuée ; le propriétaire ou la régie ne le remplace pas. Même exemplaire rendu au propriétaire, profil restant recalculé sans rendre de points, fret/autres modules/découvertes conservés. Annulation garde le module monté et rend le PA dans son plafond ; régie possible après révocation. Réserves étrangères et panne active refusées. Modification du contenu pendant le travail ferme la finalisation, même sans révision du vaisseau modifiée.

Douze cas partagés supplémentaires, un UI et un sélecteur ; HTTP/Auth étendu au refus compartiment plein puis vidage et retrait complet/reçu unique. Le module/lot monté est synthétique en tests. Le vol nu après retrait et la conservation d’un autre module passent par les consommateurs natifs. Local : build et 813/813 ciblés, aucune régression intégrale ou recette humaine.

## Interface du composant fermé — 4 novembre 2026

Propriétaire : depuis sa soute, gestion privée du compartiment, volume inclus dans la capacité totale, lots entiers, dissimulation et découverte persistante affichées séparément. Aperçu puis confirmation du déplacement réel. Liens vers manutention native et accords de retrait ; aucun réglage de quantité cachée arbitraire.

Agent habilité : lien Poste de douane depuis Soutes et fret, vaisseaux locaux disponibles, choix documentaire/approfondi, aperçu avec coût/durée/niveau, présence puis démarrage. Dossier avec délai manuel, confirmation du contrôle réellement effectué et interruption motivée. Le résultat documentaire ne valide aucune licence/authenticité/taxe ; un échec approfondi ne prouve jamais l’absence de fraude. Aucun nouveau stock lisible hors résultats autorisés.

Régie : lien depuis régie du fret, niveau N0–N5/poste/motif/révision, contrôle PNJ, liste des dossiers et nouvelle tentative motivée pour l’escale courante. Contrôle d’un joueur consultable et annulable après révocation, jamais finalisé à sa place. Interfaces respectant pause/STOP et neutralisation, coût/dé/résultat non éditables par agent. Les validations serveur et reçus existants restent autoritaires.

Routes joueur dans le Terminal, routes régie distinctes. Protocole de formulaire borné et réponses obsolètes ignorées après navigation. Liens absents sans le marqueur de composant, toujours non émis par la publication/naissance. Aucune ouverture en partie, montage/commerce/vol/publication MOD-04 fermés ; panne/profil/vol et ouverture cohérente encore à traiter.

Local : build et 829/829 ciblés dans 66 fichiers. Huit nouveaux UI, un lien cargo, trois cas partagés serveur, un sélecteur ; HTTP existant renforcé. 37 suites Firestore et treize HTTP en CI ciblée ; aucun navigateur ou suite complète. Chromium local absent : validation visuelle et recette humaine mobile non réalisées.

## Vérification navigateur ciblée et ergonomie — 4 novembre 2026

Les composants, styles et shell du projet sont rendus avec le contrôleur de production et le workflow natif MemoryStore. Quatre parcours × deux viewports (1280×900 et 360×800 tactile émulé), soit huit : propriétaire/rangement, agent/délai/attestations/résultat, régie/annulation après révocation, panne B. Vérification de l’absence de débordement horizontal et des zones d’attestation visibles ≥44 px, avec captures. Bouton d’interruption secondaire et section séparée de la confirmation finale.

Configuration bornée : test/browser/hidden-cargo.config.mjs, commande node node_modules/playwright/cli.js test --config=test/browser/hidden-cargo.config.mjs. GN_BROWSER_EXECUTABLE est facultatif pour un Chromium existant ; Playwright utilise sinon son navigateur installé. Rapports et captures reproductibles dans dist/hidden-cargo-browser. Métadonnées commit/arbre/dirty/navigateur/viewport ; humanAcceptance=NOT_EXECUTED et firebaseAuth=NOT_EXECUTED.

Local : build, 843/843 tests ciblés et 8/8 DOM sur Chromium 156.0.8078.4. Aucun réseau autorisé, données et identités fictives. Ce n’est pas une recette du parcours complet app.js/connexion ni un essai humain sur téléphone réel. La CI ciblée conserve séparément ses 37 suites Firestore et quatorze HTTP/Auth ; navigateur global non lancé. Aucune modification des règles B, marqueurs ou données, aucune publication/fusion main.

## Réinspection : conserver la première découverte — 10 novembre 2026

Lorsqu'une nouvelle inspection approfondie a été **expressément autorisée par le MJ** pour la même escale, un résultat positif distingue les lots dissimulés **nouvellement découverts** des lots dissimulés **déjà connus**. Les seconds restent consultables comme tels, mais leur date initiale `hiddenCargo.discoveredAt`, leur révision de lot et leur historique de première découverte ne sont pas réécrits. Les objets jamais révélés restent cachés si le nouveau D6 échoue ; un succès n'autorise toujours ni saisie ni paiement automatiques.

Correction ciblée de la résolution existante `finishCustomsInspection` et de son écran de résultat, sans changer le seuil `1D6 + niveau ≥ 7`, la consommation des PA, les permissions, la durée ou la tentative par escale. Régression : premier succès, seconde tentative autorisée, aucune fausse nouvelle découverte, même horodatage et un seul événement de découverte par lot ; contrôle d'échappement HTML. CI du SHA exact à vérifier avant toute fusion ; recette mobile terrain toujours nécessaire.

### Vérification CI de cette correction

Le profil ciblé `hidden-ui` a été rejeté par le planificateur de CI : le cumul non encore validé par une référence globale fiable comprend notamment `src/core/campaigns.mjs`, hors périmètre de ce profil. Il ne s'agit pas d'un échec des assertions de la correction. Un contrôle intégral est donc demandé sur le candidat suivant (`[ci full]`) plutôt que d'élargir artificiellement la liste blanche d'un profil ciblé. Sa réussite devra être vérifiée sur le SHA exact ; aucun résultat n'est présumé à ce stade.

La vérification doit inclure le cas de non-réécriture du champ `discoveredAt` et du journal de lot après une seconde inspection approfondie autorisée. Le commentaire de PR doit citer la conclusion du run complet et non un ancien run ciblé.

## Prévisualisation des licences canoniques — 10 novembre 2026

**Première tranche, lecture seule dans Régie des douanes** : le MJ peut demander un devis de référence LIC-01, LIC-02 ou LIC-03 sans enregistrer de titre et sans débiter un compte. L'action `customsLicenseQuote` reprend les contrôles de rôle MJ et l'activation `hiddenCargoVersion=1` du parcours douanier existant. La même interface ne donne aucun droit douanier supplémentaire aux agents joueurs.

- **LIC-01** : 100 Cr ; activité marchande régulière ; permanente sauf révocation.
- **LIC-02** : maximum entre 2 % de la **valeur de référence réelle** et 50 Cr ; pour la cargaison et le voyage autorisés. La valeur de référence est saisie par le MJ lors de ce devis : elle n'est **pas encore recoupée automatiquement avec les lots**. La formule calcule les centièmes de crédit exacts et **n'invente aucun arrondi** de paiement.
- **LIC-03** : mission, biens et durée spécifiés ; tarif à fixer par le MJ, aucun montant automatique.

Ni délivrance, ni validation de documents INF-03, ni quittance, ni compte, ni permission, ni mouvement d'inventaire, ni taxe de fret n'est modifié. Un devis ne constitue pas une licence valide. Le futur parcours d'émission devra exiger titulaire, émetteur, validité et périmètre, preuve du financement réel, contrôle d'unicité/transaction, révocation, continuité des épisodes et contrôle documentaire effectif. Cette tranche prépare le barème sans confondre estimation et paiement.

Régression prévue : droits MJ, ancien Master non activé, entrée strictement validée, borne de calcul, centimes non arrondis et absence d'écriture de fonds/registre. Exécuter `[ci full]` si le cumul non fusionné interdit un profil ciblé. Aucune recette terrain n'est certifiée.

## Liste préparatoire des justificatifs de licence — 10 novembre 2026

Le devis MJ affiche maintenant une liste **non validée** de justificatifs nécessaires avant émission : titulaire et émetteur pour les trois licences ; activité commerciale et révocation pour LIC-01 ; cargaison réelle, voyage, valeur des lots et paiement pour LIC-02 ; mission, biens, durée et décision tarifaire MJ pour LIC-03. Cette liste est une aide de régie, non une preuve ou un titre. Aucun dossier de licence n'est encore créé et aucun contrôle documentaire ne la considère comme autorisation réelle.

Une valeur de référence saisie pour LIC-01 ou LIC-03 est refusée au lieu d'être ignorée silencieusement ; seule LIC-02 utilise une base numérique. Tests de projection, d'échappement HTML et de rejet des champs superflus. Aucun changement de fonds, stock, droits, paiements ou habilitations.

## Consultation du fret réel dans un devis LIC-02 — 10 novembre 2026

La régie MJ peut sélectionner, **facultativement et pour LIC-02 seulement**, un vaisseau de la session en demandant le devis canonique. Le service relit alors la soute physique `HOLD` : lots réellement présents (y compris dissimulés ou sous garde), quantités, détenteurs/propriétaires, statuts, port et identifiant de voyage engagé lorsqu'il existe. La projection n'expose ni passagers ni manifeste privé. Le devis sans vaisseau conserve son comportement historique.

**Limite explicite :** le catalogue M1 actuel ne comporte pas encore de valeur de référence canonique par marchandise ni de statut « réglementée » fiable ; le montant saisi par le MJ reste indicatif et **n'est pas validé par le stock réel**. La présence d'un voyage n'atteste pas qu'il soit autorisé pour la licence. L'UI affiche ces écarts ; aucun permis, compte, taxe, quittance, changement d'inventaire ou droit joueur n'est ajouté.

Régressions partagées mémoire/Firestore : vaisseau réel, lot/quantité/propriétaire, voyage projeté sans manifeste, absence d'écriture, refus vaisseau inconnu et acteur joueur, valeurs non confirmées. Régression UI : sélection, transmission stricte et échappement du contenu arbitraire. CI ciblée `hidden-ui` à contrôler sur le SHA du candidat ; une validation automatisée ne remplace pas le test terrain.

## Première valeur de référence versionnée dans M1 — 11 novembre 2026

Le modèle M1 peut désormais déclarer une **valeur de référence facultative, strictement positive et entière en Cr par unité de stock** (`referenceUnitValueCr`), distincte du prix commercial négocié et du tarif des modules. Le champ est éditable dans le brouillon web et le classeur M1 (`prix_reference_unitaire_cr`), avec absence = conserver, `!EFFACER` = retirer. Les classeurs sans cette nouvelle colonne restent importables. Les lots nouveaux conservent la valeur de leur copie de modèle publiée, sans migration rétroactive.

Le devis MJ LIC-02 lié à un vaisseau affiche la valeur de référence M1 de chaque lot réel si sa copie en possède une, **sans** déduire une somme douanière réglementée : classification des marchandises par port et périmètre commercial autorisé ne sont pas encore intégrés. `referenceValue` reste une saisie à vérifier et les indicateurs `referenceValueVerified:false`, `regulatedStatusVerified:false`, `issued:false` sont conservés. Aucun paiement, taxe, quittance, mutation de lot, habilitation ni titre ajouté.

Les tests couvrent validation/édition du modèle, conservation après ancienne saisie, Excel export/import/effacement, projection d'un lot, réponse MJ et échappement. Le profil CI ciblé `hidden-ui` sélectionne déjà les suites centrale/inventaire ; sa liste blanche est prolongée uniquement des sources et tests M1 correspondants. Vérifier le SHA exact avant toute conformité ; la recette terrain reste distincte.

## Classification douanière par port M3 — 11 novembre 2026

Une définition privée de port M3 peut désormais associer **chaque identifiant de modèle M1** à un statut local `FREE` (libre), `REGULATED` (réglementée) ou `PROHIBITED` (interdite). Absence de ligne = **non classé**, jamais libre par défaut. Les anciennes définitions de port sans ce champ restent valides. La classification ne modifie pas le champ de légalité général du modèle ni les anciens lots/sessions.

Édition web dans le formulaire M3, Excel M3 `Ports.statuts_douane` en syntaxe `item_id:REGULATED;second_id:PROHIBITED`. Import blanc = conserver, `!EFFACER` = vider. Statuts, IDs, unicité et limite de 100 entrées stricts. Les références M1 absentes ou archivées sont signalées au contrôle global ; sans autorisation de lecture M1, seuls les IDs rédigés dans M3 et `REFERENCE_NOT_CHECKED` sont accessibles à l'éditeur. Le contrôle central de publication et les arêtes M3 → M1 restent sources d'autorité.

Aucune taxe, remise, saisie, licence, montant à prélever, compte, titre ou migration automatique ajoutée. Le raccordement de cette classification à une **session publiée** et au calcul douanier vérifié reste distinct ; une estimation n'est jamais une licence valide.

## Diagnostic douanier MJ d'après le port publié — 11 novembre 2026

La lecture `customsLicenseQuote` pour LIC-02 et un vaisseau rattaché consulte le port **réel de la session**, déjà copié depuis la version publiée du Master M3. Le serveur exige `port.versionId === session.versionId`, le bon identifiant et un vaisseau **à quai sans voyage en cours**. Port absent, ancien, incohérent ou sans classification : statut `UNKNOWN` pour chaque lot, jamais FREE par défaut. Les données de brouillon M3 et les notes privées du port ne sont pas exposées.

Les lots réels de soute sont classés selon le port publié : libre, réglementé, interdit ou inconnu. Chaque lot disposant d'un prix de référence M1 figé lors de sa création a un montant calculé par quantité via `BigInt`, sans arrondi ; le sous-total indicatif ne cumule que les lots réglementés **explicitement connus et valorisés**, avec compte des biens sans valeur, non classés et interdits. L'absence d'un prix de référence ne signifie pas une valeur nulle.

Un devis n'est ni un dédouanement ni une licence. Le tarif LIC-02 reste fondé sur l'entrée du MJ et la sortie demeure `issued:false`, `referenceValueVerified:false`, `regulatedStatusVerified:false` car la cargaison sous permis, le titulaire, le voyage et le paiement n'ont pas été certifiés. Aucune mutation de crédit, stock, licence ou permission. Validation ciblée et recette mobile à distinguer.

## Prévisualisation de périmètre LIC-02 — 11 novembre 2026

Nouveau parcours **MJ en lecture seule** : depuis un devis avec vaisseau et politique locale `PUBLISHED`, l'écran présente des cases à cocher par **ID de lot** et une liste de liaisons M3 publiées au départ du port. Les cases ne proposent que les lots entiers disponibles, explicitement `REGULATED`, et dont la valeur M1 figée est connue. Un `customsLicenseScopePreview` distinct relit en transaction les IDs natifs (1 à 100, sans doublon), le vaisseau à quai et libre, la classification M3 du port versionné, la route M3 actuelle, son origine et son port de destination de même `versionId`. Toute contradiction bloque l'aperçu sans écriture ; aucune validation n'est déduite de l'interface.

Le sous-ensemble réellement sélectionné reçoit un total Cr exact via `BigInt` et une **simulation de tarif** LIC-02 (2 % de la valeur concernée, minimum 50 Cr), sans arrondi inventé. La lecture signale `issued:false`, `scopeAuthorized:false`, `voyageAuthorizationVerified:false`, `ownerMandatesVerified:false` et `amountPaid:false`. La preuve de propriété et de mandat, le titulaire, l'autorisation effective du voyage et la quittance sont **hors de cette tranche**. Aucune ressource, PA, compte, lot, titre ou version publiée n'est modifié.

Tests ciblés mémoire/Firestore : une ou deux caisses, précision des centièmes et très grands nombres, droit MJ seul, statut réglementé, refus de lots disparus ou réservés, route inverse/absente/périmée, port de destination périmé et non-délivrance ; UI de sélection, échappement des noms et lecture sans commande d'écriture. CI ciblée `customs-port` à vérifier sur le commit exact.

## Titulaire pressenti, propriété observée et borne d'escale — 11 novembre 2026

L'aperçu MJ `customsLicenseScopePreview` accepte facultativement `applicantCharacterId`. Le choix est constitué des identités publiques de personnages publiés et assignés à la session, sans UID ni dossier personnel. Le serveur vérifie le titulaire pressenti par `inventoryParty` (publication, inscription acceptée, accès actif, absence de décès définitif). Un aperçu sans titulaire reste possible pour les anciens clients, mais ses droits sont `NOT_EVALUATED`.

La réponse présente une **matrice de propriété** pour chaque lot sélectionné et pour le vaisseau : même propriétaire individuel (`DIRECT_OWNER`), autre propriétaire (`THIRD_PARTY`), bien détenu par un groupe/commerce (`NON_PERSONAL_OWNER`) ou identité non renseignée. Aucune relation ne devient mandat juridique ou technique : `ownerMandatesVerified:false` et `mandateVerified:false` restent explicites. L'identité d'un personnage n'octroie aucun droit sur les lots de tiers ou sur un vaisseau.

Le périmètre de voyage envisagé est lié à l'identifiant de visite réelle du vaisseau (`portVisitId` ou visite initiale native), à la route publiée, aux ports et au `versionId` de session. Le diagnostic conserve `actualVoyageId:null`, `validityWindowDefined:false` et `departureAuthorized:false` : ni date d'expiration ni voyage autorisé n'est inventé. La délivrance devra plus tard vérifier mandats, titulaire, émetteur et validité. Cette tranche reste **en lecture seule** : aucune licence, taxe, réservation, PA, écriture de fonds ou migration.

## Consentement personnel et révocable pour les lots LIC-02 — 11 novembre 2026

Le Terminal joueur expose `customs-consents/{sessionId}` sous `hiddenCargoVersion=1`. Une lecture `myCustomsConsents` présente **uniquement les lots personnels** présents en soute, disponibles, explicitement `REGULATED` dans le port publié et pourvus d'une valeur de référence M1. Le joueur peut choisir un titulaire pressenti et une liaison publiée. `prepareCustomsLotConsent` relit côté serveur propriétaire, vaisseau à quai, lot, révision, politique, route et bénéficiaire actif, puis affiche une confirmation explicite. `grantCustomsLotConsent` ne peut être signé que par le compte authentifié du propriétaire actif, en jeu et sans STOP sécurité. Il écrit **une seule autorisation personnelle par lot**, dans `sessions/{sid}/customsConsents/{lotId}`, avec statut, version de l'inscription, révisions et identifiants du lot, titulaire, route, port et escale, plus reçu idempotent et audit. Aucun groupe/boutique ne peut utiliser cette autorisation personnelle.

`revokeCustomsLotConsent` est une action authentifiée, confirmée et révisionnée ; elle archive le statut en `REVOKED` avec événement d'audit, sans toucher à la propriété ni au stock. Un nouveau consentement impose la révocation de l'ancien. Le serveur recoupe **à chaque aperçu MJ** le consentement enregistré avec les versions actives du propriétaire et du bénéficiaire, la révision et la quantité du lot et l'escale/route ; il n'indique `consentVerified:true` que si tous concordent. Déplacer, modifier ou revendre le lot, changer d'escale, révoquer l'accord ou désactiver un personnage invalide le consentement. Les biens de groupe/commerce sont `NON_PERSONAL_OWNER` et nécessitent un futur parcours d'habilitation collectif distinct.

Important : ce consentement porte **uniquement sur l'inclusion du lot dans la demande préparatoire** ; ce n'est pas un permis. `mandateVerified:false`, `ownerMandatesVerified:false`, `issued:false` et les autres limites douanières restent inchangés. La liste des consentements d'un joueur et les codes de confirmation ne sont pas visibles par d'autres joueurs. La nouvelle permission transactionnelle `CUSTOMS_CONSENT` ne peut écrire que la collection dédiée ; aucune autorisation de débit ou de mutation du stock/vaisseau. Suites mémoire, Firestore et UI ciblées à vérifier sur le SHA final.

## Accord personnel du propriétaire du vaisseau pour LIC-02 — 11 novembre 2026

Le consentement du vaisseau est désormais **distinct** du consentement des marchandises. Dans le Terminal `customs-consents`, un propriétaire **individuel** d'un vaisseau natif à quai peut confirmer explicitement l'utilisation de **son vaisseau** dans un dossier LIC-02 pour un titulaire actif, une liaison M3 publiée et l'escale réelle. Les vaisseaux de groupe ne peuvent pas utiliser cette voie personnelle ; leurs droits seront soumis à un protocole d'habilitation collective séparé. La lecture `myCustomsConsents` expose uniquement les vaisseaux dont le joueur est propriétaire et ses accords (sans UIDs, codes secrets ni pièces de tiers).

`prepareCustomsShipConsent` relit le propriétaire actif, l'état libre du vaisseau, les deux ports de même version que la session, la politique locale publiée, la route et le bénéficiaire actif. `grantCustomsShipConsent` exige une confirmation explicite et une preuve liée au propriétaire, à l'inscription, à la **révision actuelle du vaisseau**, au port/escale, à la révision des ports et de la liaison, au titulaire, et à la version M3. Un seul accord `GRANTED` par vaisseau, un nouvel accord exige révocation préalable. `revokeCustomsShipConsent` exige le compte du propriétaire, une preuve de révision et une confirmation. Écriture limitée à `sessions/{sid}/customsShipConsents/{shipId}` (plus audit et reçu idempotent) par la garde `CUSTOMS_SHIP_CONSENT`. Aucune modification de vaisseau ou stock, PA, compte, prix, taxe ou autorisation de départ.

`customsLicenseScopePreview` fournit `shipOwnershipEvidence.consentVerified` : vrai uniquement si un accord `GRANTED` du propriétaire **encore actif** correspond exactement au vaisseau, au titulaire, au port, à l'escale, au trajet et aux révisions des trois documents port/route/destination. Une révocation, un changement d'escale, de propriétaire ou de révision invalide la preuve. `mandateVerified:false`, `ownerMandatesVerified:false`, `voyageAuthorizationVerified:false` et `issued:false` restent les garde-fous : l'accord du propriétaire ne confère ni compétence de pilote, ni véritable licence, ni autorisation fiscale.

Tests ciblés mémoire/Firestore : signature propriétaire contre tiers/groupe, relecture MJ, consentements lots indépendants, idempotence, révocation, invalidation des versions/escales/ports, refus d'écrire dans inventaire, comptes, licence et vaisseau, UI avec échappement HTML et absence de faux permis. CI sur SHA exact obligatoire, puis recette terrain distincte.
