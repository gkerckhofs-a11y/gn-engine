# GN Engine — consignes de développement

## Priorité de reprise — 27 octobre 2026

Extension autoritaire : [V3.6 Fouilles et médias](docs/source/SO_CDC_V36_Fouilles_Medias.md). Les nouveaux manifestes `searchVersion=1` ouvrent les fouilles universelles de lieux au D12 via les services de terrain natifs ; `mediaVersion=1` autorise les images principales dans la médiathèque existante. Ne pas modifier les D6 ni TRA-02. Objets affectés depuis du stock PNJ réel, crédits réservés sur caisse réelle ; publication sans dotation. Une prise atomique conserve sa génération et ses reçus entre épisodes. Réinitialisation explicite par le propriétaire en préparation du nouvel épisode, jamais à la republication ; les anciens manifestes restent fermés. Les nouveaux manifestes `successionVersion=1` ouvrent la relève MJ (réserve publiée ou proposition privée du joueur) avec dotation native unique, XP hérités plafonnés, XP en attente distincts et retrait des mandats dès le décès. Quotas, niveau du participant et échéance PA conservés ; aucun patrimoine ni secret transféré. Réutiliser les fonctions de naissance communes. Les anciens manifestes restent fermés. Les nouveaux manifestes `learningVersion=1` ouvrent l’apprentissage au briefing d’un épisode repris : une seule acquisition/augmentation/reconversion par participant, coûts V0.7, cinq secondaires, rares débloquées par MJ et reconversion précise consentie. Garder les profils natifs synchronisés, les XP de carrière et ressources intacts, le plafond sur l’inscription après succession. Les formations privées restent à l’incarnation ; les anciens manifestes restent fermés. Les nouveaux manifestes `transportVersion=1` ouvrent le fret PNJ confié via M7 : salaire et stock réel réservés ensemble, garde sans transfert de propriété, tranches natives de cinq unités/trois minutes, voyage et réception MJ, restitution physique avant règlement d’un dossier interrompu. Garder le manifeste de fret privé et le retard calculé à la livraison réelle. Anciens manifestes fermés ; assurance, clients joueurs/groupes, livraison partielle et barèmes exceptionnels complets restent distincts. Les nouveaux manifestes `convoyVersion=1` ouvrent un cargo/transport et une escorte consentis : préparations et PA individuels, départ/événement communs, coût réel de chaque appareil, rencontre native à trois et fuites individuelles. Ne pas exposer les soutes ou ordres privés ; conserver le reçu d’interception du tronçon après séparation. Réutiliser ships/voyages/spaceCombats, sans flotte parallèle. Les nouveaux manifestes `escortVersion=1` ouvrent les contrats PNJ liés au fret, salaire et budget carburant aller-retour réservés séparément, plein réel natif, décision 100/50/0 %, contestation et reliquat financier distinct. Ne pas retirer le carburant déjà transféré lors de sa restitution ; une fin simple ne peut abandonner une provision ouverte. Les nouveaux manifestes `escortAmendmentVersion=1` ouvrent les détours client avant départ ou à une escale sûre : liaisons publiées continues jusqu’au port de livraison initial, accords distincts des deux pilotes, +25 % du salaire initial par tronçon supplémentaire, maximum +50 % sans accord MJ explicite. Réserver le complément salarial et le carburant séparément au second accord ; chaque lot confié suit les voyages réels. Refus de l’escorte après départ : séparation sûre, référence 50 % du salaire initial puis preuve/décision/contestation natives. Une modification d’appareil, d’incarnation ou de provision invalide les accords en attente. Ne pas confondre ce parcours avec PIL-01 en vol ; aucun service PNJ distant inventé. Les nouveaux manifestes `escortManeuverVersion=1` ouvrent ESC-01 N1–N5 dans les rencontres natives : interposition au lieu de l’action principale, PA réservé puis consommé seulement au test, un usage par rencontre/vaisseau distinct de PIL-03 par voyage. Réutiliser le jet du poursuivant, égalité défavorable à l’escorte ; N3 donne +1 à la fuite seulement après interposition échouée, sans cumul avec PIL-03 N4 ; N5 ajoute +1 même au-delà de la manœuvrabilité permanente +3. N2 révèle seulement catégorie/manœuvrabilité de l’adversaire identifié. N4 intervient avant combat après décrochage raté du cargo ; succès libère le cargo et laisse l’escorte engagée sans second décrochage initial. Les ordres et quotas survivent aux épisodes ; aucun tir de remplacement ni ressource fictive. Périmètre actuel : un cargo/transport, un escorteur, un pirate. Prochaine tranche : PIL-01, puis régie des missions restantes ; recette terrain à effectuer.

Instruction utilisateur actuelle : C2a–C2q constitue un socle suffisant. Poursuivre par parcours joueur → personnage → validation MJ → interface → QR/actions → compétences/PA → inventaire/économie → boutique → vaisseau → voyage/combat → missions/régie. Ne plus perfectionner les XLSX ou la généricité sans dépendance directe du jeu. Pas de réaudit historique si HEAD et CI attendus sont confirmés.

Un seul état évolutif : [SO-VALIDATION.md](docs/SO-VALIDATION.md). Les sections historiques ci-dessous ne prescrivent plus de nouveaux micro-lots documentaires. Tests ciblés pendant le travail ; tous les tests applicatifs et build à chaque jalon. À la demande utilisateur du 27 octobre, la CI des PR brouillon cible Firebase depuis le dernier ancêtre validé : profil spatial et dépendances explicites, HTTP/Auth/Storage complet, repli complet si fondations/fichier inconnu ou référence indisponible. Suite complète avant fusion, PR prête ou commit `[ci full]`. Voir le cycle ci-dessous. Réutiliser les services existants. Branche `work/l1-modular-workshop`, PR #1 ; aucune fusion main ni production sans accord explicite.

Le parcours de première naissance utilise une version initiale figée et les collections natives. `spaceOutlaws.entryVersion=1` ouvre le briefing ; `actionsVersion=1` raccorde COM-03/TRA-01/TRA-03, informations, aides et rythme de jeu. `healthVersion=1`, scellé dans le manifeste, raccorde blessures déclarées, secours communs et MED-02/MEC-02 avec fournitures M1, horloge vitale distincte et STOP SÉCURITÉ. Ne pas enrichir un ancien manifeste. Conserver les capacités transactionnelles explicites et le blocage des autres éditeurs/actions historiques. Les fonds protégés restent distincts du solde ordinaire et non transférables. Une version scellée n’est jamais enrichie implicitement. Ne pas déployer un ancien binaire ignorant ces marqueurs sur ces données. Les nouveaux manifestes `shopsVersion=1` raccordent les consommables PNJ M5 : approvisionnement MJ explicite, stock et caisse natifs, achat atomique puis retrait, crédits protégés seulement sur lots non transmissibles/non revendables. Paiements personnels limités au solde ordinaire ; marché, rachat et transferts restent bloqués. Les nouveaux manifestes `navigationVersion=1` raccordent M3 aux collections natives : attribution MJ explicite sans carburant, pilote distinct du propriétaire, plein réel de deux minutes, manifeste, préparation PIL-02 avec PA réservé, voyage canonique et événements conservés. Préserver les verrous de présence, les opérations ouvertes et les suspensions ; aucun dépannage fictif ni combat automatique. Les nouveaux manifestes `combatVersion=1` ouvrent le dépannage PNJ sur stock et solde ordinaire réels, les embuscades opportunistes et duels à deux vaisseaux/PIL-03. Préserver les ordres privés, les 90 secondes de jeu, les tirs simultanés et la consommation des réserves seulement sur effet exécuté. Une ancienne version n’est pas enrichie. Les nouveaux manifestes `logisticsVersion=1` ouvrent révision/Coque/Bouclier sur devis MJ, stock réel et paiement ordinaire, consentement du Mécano et PA au premier point. Conserver les points achevés après interruption et les verrous d’activité. Le service natif de fret ouvre uniquement les transferts personnels à quai, cinq unités de volume maximum en trois minutes par tranche, sans perte de propriété. Les nouveaux manifestes `missionsVersion=1` raccordent M7 aux annonces, candidatures et contrats natifs individuels, financés uniquement sur caisse PNJ existante. Fonds réservés à acceptation, briefing/étapes privés, preuve et décision MJ, dix minutes de contestation puis versement de la part libre ; vingt minutes de médiation initiale pour la part litigieuse. Recours conservé sans débit forcé ni créance automatique. Ne jamais réintroduire le financement GM_EXTERNAL dans ce parcours SO. Les nouveaux manifestes `missionExecutionVersion=1` ouvrent preuves par analyses réussies/voyages arrivés après signature et récompenses M7 sur stock réel M5 du comptoir payeur. Réserver la quantité exacte à acceptation, conserver le reste en vente, les litiges par quantité et la double remise physique. Le manifeste d’identité du voyage reste privé ; aucun événement antérieur ou d’un tiers ne valide une étape. Réutiliser les lots et les gardes de retrait PNJ ; aucun faux achat ni stock créé au règlement. Les contrats narratifs antérieurs ne reçoivent pas ces extensions. Les nouveaux manifestes `episodesVersion=1` raccordent la clôture/reprise native : source scellée, pages reprenables, mêmes identités/droits, fonds/lots/preuves/voyages/combats et horloge de jeu conservés. Participants explicitement déclarés, 3 XP uniques et niveau global joueur dès la cinquième session ; PA renouvelés en gardant les réserves PIL-03, conversion traçable du solde protégé sans dotation. Ne pas clore une urgence vitale ou action continue ; ne pas restaurer PV, stock, carburant ni événements. Aucun ancien manifeste enrichi ; pas de migration implicite. Admissions supplémentaires et révisions Master restent à raccorder. Détours PIL-01 en vol, clients joueurs/groupes, fournitures personnelles d’entretien, fret tiers hors contrat PNJ, modules, renseignement ciblé et coalitions spatiales élargies restent à raccorder ; le convoi à deux appareils est décrit ci-dessus. Les anciens éditeurs de vaisseau et d’entrepôt restent fermés pour SO. Étendre cette frontière avec les tests métier du prochain parcours.

Source : instructions explicites de l’organisateur du 22 octobre 2026, « Nouvelle stratégie de développement GN Engine pour la suite ». Mise à jour par le cadrage SPACE OUTLAWS V3.5 du 23 octobre 2026 : SPACE OUTLAWS est prioritaire, le créateur universel est hors périmètre. Ces consignes remplacent les anciens parcours de livraison qui prévoyaient une publication à chaque version.

## Décision V3.4 et validation préalable

- Un Master central, sept ateliers M1 Économie, M2 Personnages, M3 Spatioport, M4 Recettes, M5 Boutiques, M6 Informations, M7 Missions, dans les six domaines de navigation. L’ordre M1→M7 est une aide de préparation, pas une chaîne de publications.
- Édition web/import = brouillon ; seule une publication globale contrôlée et versionnée par une autorité serveur habilitée entre en vigueur pour les futurs épisodes. Références entre éléments d’un même brouillon autorisées ; aucun stock, crédit, XP, PA ou dose créé par import/publication.
- Préserver les contrats historiques CAMPAGNE/SESSION et les tranches L1. Les sept gabarits V0.1 sont préparatoires, pas des imports certifiés.
- **Instruction utilisateur de reprise V3.4 : « Attendre validation de ce plan avant opérations de migration. »** Le [plan SO-00 V3.4](docs/SO-00-V34-PLAN-CENTRAL.md) est soumis à validation. Ne pas effectuer d’adoption/conversion de campagne ni de migration de données tant que cet accord n’est pas présent dans la conversation. Audit, documentation et vérifications sur données synthétiques restent autorisés.
- Cette validation de conception ne vaudra jamais autorisation de déploiement ni de migration d’une session active.

## Priorité V3.5 — inscriptions, naissance et groupes

- Référence : [diagnostic et ordre minimal V3.5](docs/SO-00-V35-INSCRIPTIONS.md), [source intégrale](docs/source/SO_CDC_V35.md), [55 recettes](docs/SO-RECETTES-V35.md). Les décisions V3.4 de publication centrale restent applicables.
- Inscription privée, proposition, définition M2 et incarnation sont distinctes. Lien d’admission expirant/révocable + compte authentifié ; aucune classe Force ni initiation interdite dans le parcours joueur.
- Quotas de participants confirmés par classe contrôlés atomiquement à l’approbation et à l’affectation. Souhait d’amis sans droit implicite. Publication globale avant session ; naissance à chaud sous règles publiées et gestion des groupes par commandes de session, sans republication de campagne.
- Dotation de kit/200 Cr protégés une seule fois à la naissance ; un actif par participant ; réserve jamais incarnée ; succession/XP/PA selon A08–A10, sans patrimoine ni mandat de groupe hérité automatiquement.
- Réutiliser groupes/comptes/lots/ledger : retirer les anciens droits et accorder séparément les nouveaux mandats, avec audit et sans déplacer la propriété des caisses/biens. Ne pas assimiler `assign` historique à la succession canonique.
- Les migrations de campagnes restent soumises à la validation préalable ci-dessus. Les développements additifs sur branche et les vérifications synthétiques sont autorisés ; la nouvelle spécification n’autorise ni production ni migration implicite.

## Tranche C1a et garde de préparation

- [C1a](docs/SO-01-C1A-PREPARATION.md) ajoute le contexte privé de campagne/session neuve, sans scénario/version ni ressource initialisée. `preparationKind=SPACE_OUTLAWS_V07` est un marqueur de préparation, pas une certification des règles implémentées.
- Les anciennes API de session/import/jeu sont refusées dans ce contexte. Pour I1 et les suites, étendre explicitement cette frontière transactionnelle pour les écritures autorisées ; ne pas désactiver globalement la garde ni appeler les seeds historiques.
- Les droits MJ de session ne donnent pas de droit de publication du Master central. Conserver les tests de concurrence, réessai et révocation ; un ancien binaire ignorant le marqueur ne constitue pas un rollback sûr si des préparations existent.

## Tranche I1 — candidatures

- [I1](docs/SO-01-I1-ADMISSIONS.md) ajoute une proposition privée dans les registrations existantes et des invitations `purpose=ADMISSION`. Un lien ne confirme pas de place ni n’active un personnage. Les limites d’usage de lien ne sont pas les quotas confirmés I2.
- Les espèces narratives sont un changement unique du brouillon central M2 initial ; ne pas recopier un catalogue d’admission. Les codes V0.7 du dossier ne sont pas supposés correspondre aux IDs des catalogues historiques. Raccordement explicite avant I3/I4.
- Les droits MJ de préparation autorisent uniquement ces choix narratifs ; aucun grant de publication/arbitraire du Master. Le service reste bloqué si le cycle du brouillon/pointeur change, jusqu’à adaptation C1/C2. Conserver la protection Accueil, les reçus d’usage/commande et les révisions de consentement.

## Tranche I2 — décisions et confirmations

- [I2](docs/SO-01-I2-DECISIONS.md) confirme une place sans créer M2/kit/crédits/QR. Conserver le total `session.accepted`, ses sous-compteurs de classe et l’index d’identité dans la même transaction ; ne pas recalculer ou migrer silencieusement un état incohérent.
- Les décisions vérifient les droits courants avant les reçus. Retrait/correction libèrent la place ; réessai ne la recrée pas. Une exception exige un choix et un motif explicites. Le joueur peut retirer son dossier après expiration du lien.
- Les futurs I3/I4 doivent adapter explicitement les gardes et revalider les quotas à la naissance. Ne pas lancer I1/C1a sur des dossiers confirmés I2 ; un rollback doit conserver le lecteur et la garde compatibles.

## Tranche I2b — régie des groupes

- [I2b](docs/SO-01-I2B-GROUPES.md) conserve `groups.members` comme seule autorité ; `group.roster` est une politique optionnelle explicitement configurée. Aucun groupe historique converti automatiquement.
- Les membres d’un groupe géré se modifient par préparation/commande atomique de session ; préserver la garde des anciens éditeurs/imports et les contrôles des consommateurs. Responsable ne signifie pas permission. Archive/restauration ne recrée aucun mandat.
- Conserver caisses, biens et contrats ; une contre-opération doit revalider droits/capacité et journaliser, sans restaurer un ledger. Ne pas revenir à un binaire qui ignore la politique sur des données I2b. Le XLSX historique seul n’exporte pas cette politique.
- I3/I4 raccordent les préparations C1a ; I5 doit révoquer les mandats au décès/à la relève. Ne pas assimiler hors combat à mort, ni personnage non affecté à réserve jamais incarnée.

## Tranche C1b — brouillon et délégations centrales

- [C1b](docs/SO-01-C1B-BROUILLON.md) étend seulement les nouvelles préparations C1a sans base publiée. M1 et le catalogue narratif I1 M2 partagent le même `masterDrafts/initial` et sa révision ; ne créer aucune copie de catalogue d’admission ni aucune instance.
- Les droits `campaignStaff` sont distincts des rôles de session. Lecture par atelier, édition M1 seulement ; aucune publication implicite. Autorité courante avant restitution d’un reçu. Les droits MJ de session restent limités aux choix narratifs du parcours I1, pas à l’édition arbitraire du central.
- Les biens restent au format natif `itemInput` dans les changements centraux, sans stock et avec contenu DRAFT. Archive/restauration est une contre-opération auditée. Les imports/export et médias centraux restent à adapter ; ne pas réutiliser les seeds ni perdre l’indexation des médias.
- C1/C2 devront adapter explicitement les gardes de cycle initial et le lecteur I1. Aucun lecteur de version BUILDING ni adoption de campagne historique implicite. Conserver les tests M1/M2 concurrents, séparation des rôles et révocation avant reçu.
- Les Masters historiques seuls ne sauvegardent pas ce brouillon/délégations/reçus ; rollback vers un binaire ignorant ces états non sûr. Aucune restauration complète ni recette mobile n’est revendiquée.

## Tranche C1c — recettes centrales et références différées

- [C1c](docs/SO-01-C1C-RECETTES.md) ajoute M4 dans le brouillon initial commun. Réutiliser `recipeInput` ; les changements gardent leurs IDs, versions et provenance. Aucun effet libre, aucune fabrication, aucun import central ni publication disponible.
- Les références M1 peuvent précéder les modèles. Les diagnostics sont recalculés depuis la même transaction de lecture ; ce rapport local n'est jamais un contrôle global ni une autorisation de publication C2.
- La délégation M4 ne donne aucun accès implicite à M1, M2 ou aux admissions. Sans lecture M1, ne lire ni révéler l'existence, les noms ou les états des modèles ; renvoyer REFERENCE_NOT_CHECKED. Aucun catalogue d'ingrédients dupliqué.
- Préserver les gardes C1a/C1b et les tests historiques. Les liens compétences/effets/lieux/connaissances restent explicitement non contrôlés et inactifs. C2 devra les résoudre et respecter les archives avant toute publication.

## Tranche C1d — import/export central M1/M4

- [C1d](docs/SO-01-C1D-EXCEL-CENTRAL.md) ajoute un contrat XLSX central v1 distinct, lié à campagne/profil/base/brouillon/révision/atelier/lot. Préserver les contrats CAMPAGNE/SESSION et les gabarits documentaires V0.1 ; aucune conversion implicite.
- Export ciblé (100 lignes/1 Mio), aperçu, confirmation et lot atomique dans le brouillon commun. Réutiliser les validations natives ; aucun seed, stock, crédit, publication ou instance. Blanc conserve, !EFFACER explicite, préfixe ! doublé pour le texte littéral ; absence de ligne ne supprime rien.
- Vérifier l'autorité courante et le cycle avant les reçus de commande ET de lot. Ne pas rejouer un lot identique après une édition ultérieure ; refuser sa réutilisation avec un autre contenu. Garder les tests de concurrence, révocation, limites et rollback transactionnel.
- Provenance XLSX et schéma, ID de commande, motif et avant/après sont conservés. M4 sans lecture M1 ne lit ni ne révèle ses modèles. Le rapport local reste distinct du contrôle global C2.
- Les exports ciblés ne sauvegardent pas les droits/historiques/reçus. Préserver `masterDrafts/initial/imports` avec l'ensemble cohérent du brouillon. Autres ateliers, médias, base publiée et restauration globale restent à développer/tester.

## Tranche C1e — fiches narratives M2

- [C1e](docs/SO-01-C1E-PERSONNAGES.md) ajoute les définitions natives `character` dans le brouillon initial commun, avec `contentRevision`, objectifs/étapes/relations, source et historique. Réutiliser `characterInput` extrait sans changer les anciens éditeurs.
- Édition M2 exige lecture M2 ; aucun droit sur les admissions ou sessions implicite. Le catalogue narratif I1 reste la même source, éditable seulement par son parcours. Ne jamais renvoyer les historiques de politique/quotas aux lecteurs centraux.
- Textes de fiction privés et éléments narratifs non publiés ; références M2 différées autorisées dans le même brouillon. Aucun compte, instance, QR, compétence, ressource ou notification créé ; une relation n'ajoute pas de relation inverse.
- Préserver les IDs des fiches et éléments imbriqués, les bornes (100 fiches, 96 Kio par fiche), les tests de concurrence M1/espèces M2, droits et révocation avant reçu. Les XLSX M2 restent non pris en charge.
- C2/I3 devront adapter explicitement profil, visibilité, nature/espèce et liens approuvés avant activation ; ne pas convertir des codes I1 en profils historiques par supposition. Aucun personnage jouable ni cycle de naissance livré par C1e.

## Tranche C2a — contrôle de préparation commun

- [C2a](docs/SO-02-C2A-CONTROLE-CENTRAL.md) ajoute `checkCentralDraft`, lecture propriétaire transactionnelle du seul brouillon initial sans base publiée. Les droits d'atelier même cumulés ne donnent aucun droit de contrôle global/publication.
- Réutiliser les formes natives et projections M1/M2/M4 ; tout nouveau type/champ doit adapter explicitement ce contrôleur. Ne pas ignorer un changement inconnu, une provenance incohérente ou un dépassement de budget.
- Le rapport expose couverture partielle, diagnostics localisés, ajouts/exclusions, liens et empreinte. Aucun texte d'admission ni texte narratif privé dans le résumé ; aucun état persistant ou ressource créé.
- `NO_DETECTED_ERROR` ne signifie pas publiable ; `publicationAvailable=false`. L'empreinte est une identité de rapport, pas un consentement de publication. Ne pas la réutiliser pour une future publication sans les validations/autorités/bases requises.
- Bornes explicites : 1659 changements depuis C2j (601 initiaux, 8 kits, 300 boutiques/offres, 250 informations, 100 missions et 400 définitions spatiales), 16 Mio de contenu, 4 Mio de rapport ; refus sans résultat tronqué. Conserver tests de cohérence concurrente, confidentialité et absence d'écritures. Publication, pages immuables, version READY/pointeur, restauration et recette humaine restent à développer.

## Tranche C2b — délégation du contrôle préparatoire

- [C2b](docs/SO-02-C2B-DELEGATION-CONTROLE.md) étend explicitement la lecture propriétaire C2a : `campaignStaff.checkCentral=true`, délégation active et lecture des sept ateliers obligatoires. Le cumul des droits d'atelier ou un rôle de session ne suffit toujours pas. Seul le propriétaire attribue/retire ce droit, avec révision et motif.
- Conserver les anciens grants sans champ comme non habilités ; une modification active d'un grant déjà habilité exige un choix explicite. Désactiver efface le droit ; réactiver ou rejouer un ancien reçu ne le restaure pas. Conserver tests partagés de concurrence/révocation et isolation des admissions.
- L'empreinte inclut l'autorité courante et la révision des droits ; elle ne devient pas une autorisation de publication. `publicationAvailable=false`, limites et couverture partielle C2a conservées. Aucun gel, version/pointeur ni ressource ajouté. Les validations complètes et la publication restent une suite à développer.

## Tranche C2c — plans initiaux joueurs M2

- [C2c](docs/SO-02-C2C-PROFILS-INITIAUX.md) ajoute `creationPlan` optionnel dans la définition C1e : huit classes, espèce narrative référencée et une initiation N1 hors classe. Trois principales dérivées à N2 ou fixes (COM-01/02 et ROG-01), sans `abilityProfile` actif ni dotation. Réutiliser les choix I1, ne pas assimiler les codes V0.7 aux IDs historiques.
- Omission par ancien client = conservation ; null explicite = retrait audité. Conserver révisions communes, archive/restauration et tests concurrence/révocation/réessai. Le flag d'espèce `available` ferme un choix aux candidatures, pas une définition M2.
- Le contrôle commun valide les plans et références d'espèce ; il ne certifie pas les effets de compétences ni les fiches narratives sans plan. I3/I4 doivent encore relier les admissions, quotas et naissance. PNJ Force, progression, kits, publication et restauration complète restent distincts ; ne jamais activer le plan par les seeds historiques.

## Tranche C2d — Excel des personnages M2

- [C2d](docs/SO-02-C2D-EXCEL-PERSONNAGES.md) étend le contrat XLSX central v1 à M2, sans convertir les Masters historiques ni les gabarits V0.1. Réutiliser les commandes C1d et `centralCharacterInput`, avec `contentRevision` ; ne pas ajouter de révision native concurrente.
- Exporter uniquement les fiches sélectionnées, jamais le catalogue partagé, les admissions ou politiques. Tableaux narratifs JSON complets avec IDs et plan initial C2c ; blanc conserve, retrait explicite, aucune publication imbriquée autorisée. 100 fiches archives comprises, 96 Kio par fiche, 32 000 caractères par cellule M2 sans troncature.
- Préserver la provenance XLSX M2 dans le contrôle commun, les références différées, la révision centrale commune, les droits avant reçu et les tests de concurrence/révocation/interruption. L'import ne crée aucune incarnation ni ressource.
- Le fichier ciblé ne sauvegarde pas catalogue, historique, droits ou reçus ; C2c refuse la nouvelle provenance au contrôle global. Publication, restauration complète, I3/I4/I5 et médias restent à raccorder.

## Tranche C2e — kits initiaux M1

- [C2e](docs/SO-02-C2E-KITS-INITIAUX.md) prépare huit kits `classKit` dans les changements M1 existants. Les slots/quantités viennent de V0.7, les seules données éditables sont leurs références M1 et notes privées. Pas de classes libres, quantités, crédits ou effets injectés.
- Un kit par classe, 8 archives comprises, révisions/droits/reçus/historique du brouillon commun. Préserver les tests intertypes (`item_MED` / `classKit_MED`), concurrence/révocation/interruption. Le contrôle global inclut les liens typés ; limite 609 définitions, budgets octets inchangés.
- Le modèle d'objet garde ses attributs ordinaires ; protection non pillable/non revendable, 200 Cr, arme si applicable, QR, codes publics et contacts restent à appliquer/raccorder lors de la future naissance. Un nom de modèle ne certifie ni effet ni homologation. Aucun lot ni compte créé.
- Les XLSX M1 exportent les objets uniquement ; imports conservent les kits et recalculent les diagnostics. Sauvegarder le brouillon complet avec kits/historiques/reçus ; C2d n'est pas un retour fonctionnel équivalent. Publication, I3/I4/I5 et recettes complètes restent non livrées.

## Tranche C2f — cohérence des plans M2 et kits M1

- [C2f](docs/SO-02-C2F-COHERENCE-INITIALE.md) ajoute au contrôle global la dépendance de chaque plan initial M2 actif vers le kit de sa classe principale. Kit absent, archivé, incohérent ou incomplet : diagnostic localisé sur la fiche M2, détails des objets dans M1. L’initiation ne requiert jamais un second kit.
- Le résumé `initialPreparation` compte des définitions, pas des admissions, quotas ou incarnations. Les fiches archivées et sans plan n’exigent aucun kit ; ne pas déduire de statut joueur/PNJ de l’absence de plan. Les définitions invalides restent exclues du résumé et signalées par le contrôle existant.
- La projection lit exclusivement les changements validés du même instantané transactionnel, sous les droits C2b. Ne pas l’ajouter aux lectures M2 isolées : aucun droit M1 implicite. Préserver concurrence, révocation, isolation, provenance XLSX et absence d’écritures.
- `REFERENCES_CHECKED` vérifie références et consommables, pas les effets, armes homologuées, contacts/codes, protections économiques ou naissance. `publicationAvailable=false`. Empreinte interne portée à 3 ; relancer le contrôle après mise à jour. Aucune migration ni nouvel état persistant ; C2e omet ces diagnostics et ne constitue pas un contrôle fonctionnel équivalent.

## Tranche C2g — boutiques et offres M5

- [C2g](docs/SO-05-C2G-BOUTIQUES-BROUILLON.md) ajoute `shop` et `offer`, schéma 1, au même brouillon initial. Réutiliser révision commune, autorité avant reçu, audit, archives et validation de montants ; aucun service de marché ou seed pour créer une définition.
- Édition M5 exige lecture M5. Les références objets et vendeurs exigent respectivement lecture M1/M2 pour être consultées : sans droit, aucune requête de catalogue ni révélation d’existence/nom/état, seulement `REFERENCE_NOT_CHECKED`. Suggestions minimales ; aucune admission, note étrangère ou permission implicite du vendeur.
- Références différées autorisées ; contrôler les types et archives dans le rapport commun. Lieux, statut PNJ, habilitations, caisses, stocks, tarifs de jeu, QR et transactions restent à raccorder. Prix saisis sans valeur par défaut ; absence de rachat = aucune proposition. Aucun import/export M5 ni publication disponible.
- Limites 50 boutiques/250 offres archives comprises, 909 changements globaux, budgets octets inchangés. Empreinte interne de contrôle 4, couverture M5 partielle. Préserver concurrence interateliers, homonymes typés, réessais/révocation, imports M1/M2 conservant M5 et interruption atomique.
- Sauvegarder les nouveaux types et grants M5 avec l’ensemble cohérent du brouillon. C2f n’est pas un retour fonctionnel équivalent ; ne supprimer aucune donnée pour le rendre compatible. Aucun stock, crédit, compte, instance, migration ou déploiement ajouté par cette tranche.

## Tranche C2h — informations M6 et références M4

- [C2h](docs/SO-06-C2H-INFORMATIONS-BROUILLON.md) ajoute les définitions `knowledge` au même brouillon : connaissances, indices et documents, format natif `knowledgeInput`, toujours `DRAFT`. Réutiliser autorité avant reçu, révisions, audit et archives. Aucun reçu de connaissance joueur, partage, déblocage M4 ou QR actif.
- Édition M6 exige lecture M6. Destinataires proposés M2 contrôlés uniquement avec lecture M2 ; références M4 vers M6 uniquement avec lecture M6. Sans droit croisé, aucune requête de catalogue ni révélation d’existence/état. Suggestions minimales, jamais texte, vérité MJ, notes ou listes de destinataires M6 dans M4.
- Conserver et contrôler les deux listes de destinataires même si une proposition de découverte est désactivée ou son audience change. Pas de compétence/niveau par défaut ; une compétence renseignée exige N1–N5, mais son catalogue et les conditions canoniques restent non raccordés. Aucun import/export M6 ni cible terrain ajouté.
- Limites techniques : 250 informations archives comprises, 100 destinataires par liste, 96 Kio par définition ; 1159 changements globaux, budgets 16 Mio/4 Mio inchangés. Empreinte interne 5, M6 PARTIAL, publication indisponible. Préserver références typées, corruption, isolation, concurrence M2/M4/M5/M6, provenance Excel M4 et révocation avant réessai.
- Sauvegarder `knowledge`, grants M6, révisions, historique et reçus de commande avec le brouillon complet. C2g n’est pas un retour fonctionnel équivalent ; ne supprimer aucune donnée pour permettre ce retour. Les exports ciblés historiques ne sauvegardent pas M6.

## Tranche C2i — missions M7 préparées

- [C2i](docs/SO-06-C2I-MISSIONS-BROUILLON.md) ajoute `mission`, schéma 1, au brouillon commun. Réutiliser le validateur narratif existant pour les étapes, jamais créer une copie d’objectif M2 ni un contrat/annonce de session. Étapes privées, identifiants stables et ordre conservé.
- Édition M7 exige lecture M7. Donneur M2, prérequis M6 et récompenses proposées M1 exigent respectivement lecture M2/M6/M1 pour être contrôlés ; sans droit croisé, aucune requête du catalogue ni révélation de nom/existence/archive/conditionnement. Suggestions minimales, sans secrets étrangers.
- Conditions et preuves sont du texte préparatoire non exécuté. Quantités positives proposées, contrôle natif d’objet individuel si lecture M1 ; source réelle et réserve de récompense encore manquantes, toujours signalées. Aucun XP, crédit, lot, attribution, progression, annonce, déclencheur ou paiement créé. Aucun import/export M7.
- Bornes techniques : 100 missions archives comprises, 40 étapes natives, 100 prérequis et 100 objets proposés par mission, 96 Kio par définition ; contrôle commun 1259 changements/16 Mio/4 Mio, empreinte interne 6. M7 PARTIAL, publication indisponible. Garder concurrence, isolation, corruption, archives, réessais/révocation et imports M1 conservant M7.
- Sauvegarder les missions et grants M7 avec le brouillon, historique et reçus cohérents. C2h n’est pas un retour fonctionnel équivalent ; les exports ciblés historiques ne sauvegardent pas M7. Ne supprimer aucune donnée pour permettre un retour logiciel.

## Tranche C2j — modèles et navigation préparée M3

- [C2j](docs/SO-04-C2J-SPATIOPORT-BROUILLON.md) ajoute `shipModel`, `port`, `route`, schéma 1, au brouillon commun. Réutiliser les services/révisions/reçus centraux et la validation native des routes. Ne pas convertir un modèle en instance ni confondre le coût fixe des anciennes routes avec le facteur canonique distance × gabarit.
- Édition M3 exige lecture M3 ; aucun droit étranger implicite. Trois familles V0.7 et valeurs fixes, fret nul du chasseur, durée 5/10/15 min, risque indépendant 1/6, 2/6 ou 3/6. Codes privés sans valeurs d’exemple automatiques ; doublons actifs du même type signalés. Les codes et notes ne figurent pas dans les suggestions ou le résumé global.
- Ports différés, archives et cibles invalides contrôlés par identifiants typés. Lien facultatif vers lieu commun explicitement non contrôlé ; aucun lieu/QR parallèle. Aucun départ, carburant, stock, compte, vaisseau, événement, pilote, combat ou publication créé. Instances, raccordements M1/M2/lieux, rencontres, événements et import/export M3 restent à livrer.
- Bornes techniques : 100 modèles, 100 ports, 200 routes, archives comprises ; 1659 changements/16 Mio/4 Mio, empreinte interne 7. Les sept ateliers sont PARTIAL, jamais complets. Conserver tests de corruption des valeurs dérivées, concurrence interateliers, révocation avant reçu, isolation et interruption.
- Sauvegarder les trois types et grants M3 avec le brouillon/historique/reçus cohérents. C2i n’est pas un retour fonctionnel équivalent ; exports ciblés insuffisants. Aucun retrait de données pour permettre un retour logiciel, aucune migration implicite.

## Dépôt et branche

- Travailler exclusivement dans le dépôt `gkerckhofs-a11y/gn-engine`, sur une branche dédiée et une PR. Le checkout local sert au développement et aux vérifications du même dépôt ; ne pas créer de seconde application ou de dépôt parallèle.
- À chaque reprise, vérifier le HEAD distant de `main`, la branche de travail, la PR et leurs contrôles. Ne jamais écraser des modifications concurrentes.
- Branche en cours lors de cette décision : `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Toute nouvelle branche doit préserver les dépendances non encore fusionnées.
- Pas de fusion sur `main` dans ce parcours de développement sans instruction explicite. La réussite des tests ou l’accord sur un lot n’autorise pas une publication.

## Production interdite pendant le développement

- Ne déployer aucune modification sur Firebase en production.
- Ne déclencher aucun workflow de déploiement, manuellement ou indirectement.
- Ne pas modifier `.github/deploy-request.json`.
- Ne pas exécuter les scripts de déploiement ni changer des droits Firebase/IAM, règles, index ou données en production.
- Ne pas tester avec des comptes, secrets, stocks ou crédits de production ; ne pas copier de données personnelles réelles dans les fixtures.
- Une autorisation explicite ultérieure de l’organisateur est obligatoire avant toute mise en production. Préparer une procédure ne vaut jamais autorisation de l’exécuter.

## Tranche C2k — Excel des informations M6 et missions M7

- [C2k](docs/SO-06-C2K-EXCEL-INFORMATIONS-MISSIONS.md) étend le contrat XLSX central v1 aux feuilles Informations/Missions, via les validateurs natifs M6/M7. Aucun savoir, QR, progression, récompense ou ressource de session activé. M3/M5 Excel restent non pris en charge.
- Préserver tableaux complets, IDs d’étapes, secrets, blanc conserve et effacement explicite. Désactiver QR conserve les deux listes ; retirer une condition de compétence exige de retirer identifiant et niveau. 32 000 caractères par cellule sans troncature, 100 lignes/1 Mio, bornes natives inchangées.
- M6→M2 et M7→M1/M2/M6 exigent les lectures indépendantes avant toute requête étrangère. Conserver tests de confidentialité, localisation XLSX, concurrence, révocation avant les reçus de commande/lot et interruption atomique.
- Contrôle global : nouvelles provenances et colonnes M6/M7, empreinte interne 8 ; 1659 changements, 16 Mio/4 Mio inchangés. Relancer le contrôle, sans publication implicite. Conserver brouillon, grants, historiques et reçus ensemble ; C2j refuse les nouvelles provenances et n’est pas un retour fonctionnel équivalent.

## Tranche C2l — Excel des boutiques et offres M5

- [C2l](docs/SO-05-C2L-EXCEL-BOUTIQUES-OFFRES.md) ajoute deux feuilles Boutiques/Offres au contrat central v1, dans une seule confirmation/transaction/révision. Réutiliser les validateurs M5 ; aucun stock, caisse, QR, mandat, prix de jeu ou transaction activé.
- Préserver les homonymes typés, IDs métier nus dans les cellules et sélection M5 par clés shop_{id}/offer_{id}. Les autres ateliers gardent leurs sélections par ID nu. Deux feuilles requises même vides, 100 lignes cumulées/1 Mio, 50 boutiques/250 offres archives comprises ; aucun onglet documentaire supplémentaire certifié.
- Calculer les liens sur l’état final des deux feuilles ; prix entiers strictement positifs saisis sans défaut. Blanc conserve, effacement explicite, archives/restauration sans cascade. M1/M2 consultés uniquement avec leurs lectures indépendantes ; préserver réessais, révocation avant reçus, concurrence et interruption atomique.
- Provenances M5 et colonnes localisées au contrôle commun ; empreinte interne 9, budgets 1659/16 Mio/4 Mio inchangés. C2k ne contrôle pas ces provenances : conserver brouillon, droits, historiques et reçus ensemble. Excel M3, publication et recette humaine restent ouverts.

## Tranche C2m — Excel des modèles, ports et routes M3

- [C2m](docs/SO-04-C2M-EXCEL-SPATIOPORT.md) ajoute Modeles/Ports/Routes au contrat central v1, avec sélection shipModel_{id}/port_{id}/route_{id}. Trois feuilles requises même vides, 100 lignes cumulées/1 Mio ; bornes natives 100/100/200 archives comprises. IDs métier nus dans les cellules, homonymes distincts.
- Réutiliser les validateurs M3 : profil/distance/risque/codes requis sans défaut, valeurs V0.7 dérivées et champs libres/instances refusés. Liens et doublons de codes calculés sur l’état final des trois feuilles, archives sans cascade. Aucun catalogue étranger consulté ni droit implicite ; aucun vaisseau, voyage, tirage ou ressource créé.
- Conserver autorité/cycle avant reçus, confirmation liée aux droits et révisions, réessais, concurrence et interruption atomique. Provenance type/feuille stricte et colonnes localisées dans le contrôle commun, empreinte interne 10 ; budgets 1659/16 Mio/4 Mio inchangés, sept ateliers PARTIAL et publication indisponible.
- Les sept ateliers ont désormais des imports pour leurs types raccordés, pas pour tous les onglets documentaires. Conserver brouillon, droits, historiques et reçus cohérents ; C2l ne contrôle pas les provenances XLSX M3. Lieux/QR, contrôles complets, publication globale, I3/I4/I5, navigation jouée et recette humaine restent à développer.

## Tranche I3a — admission approuvée vers M2 privé

- [I3a](docs/SO-01-I3A-ADMISSION-VERS-M2.md) crée la première copie explicite de fiction approuvée dans le brouillon M2 natif. Droits MJ de session et lecture/édition M2 indépendants, contrôlés avant aperçu/commande/reçu ; réutiliser `centralAuthority` et `requireCentralPreparation`.
- Identité stable par dossier/session, lien uniquement dans `admission.m2Preparation`. Aucun email, UID candidat, souhait d’ami, consentement, invitation ou décision copié automatiquement dans M2/export. Statut racine RECEIVED, characterId nul, accès inactif ; aucun seed, quota supplémentaire, profil actif ou ressource.
- Une transaction lie révision du brouillon, fiche, historiques, dossier et reçu. Première préparation seule ; nouveaux IDs de commande retrouvent le résultat historique sans écraser les éditions/archives M2. Retrait/changement de classe conserve la fiction et signale le rapprochement requis. Un lien corrompu bloque une nouvelle copie.
- I3 complet/INS-06 restent ouverts : rapprochement courant admission/définition et validation avant publication/naissance à développer. Aucun indicateur préparatoire n’autorise l’activation. Préserver concurrence, révocation, confidentialité, corruption et interruption dans les tests partagés Firestore et HTTP/Auth.
- Provenance ADMISSION stricte, empreinte globale 11 ; 100 personnages archives comprises, budgets 1659/16 Mio/4 Mio et publication indisponible inchangés. Conserver inscriptions/liens privés, brouillon, droits, compteurs/verrous, historiques et reçus ensemble ; C2m n’est pas un retour fonctionnel équivalent. Pas de migration ou suppression pour permettre un retour logiciel.

## Tranche I3b — rapprochement courant admission/M2

- [I3b](docs/SO-01-I3B-RAPPROCHEMENT-M2.md) compare puis rapproche une fiche I3a existante avec le dossier actuellement approuvé. Autorités MJ et M2 indépendantes, gardes de cycle et validation native avant nouvelle application. Aucun rattachement arbitraire, restauration ou modification de quota implicite.
- Aligner nom fictif, nature et plan ; conserver les autres champs narratifs. Biographie conservée par défaut, remplacement explicitement choisi et lié à une empreinte distincte. Ne jamais copier automatiquement coordonnées, souhaits, décisions ou preuve privée dans M2.
- `m2Preparation` reste historique ; dernier rapprochement dans `admission.m2Reconciliation` et historique privé. M2 inchangé = seule relecture privée, aucune révision centrale. M2 modifié = fiche, révision commune, historiques, audit et reçu atomiques. Réessais historiques sans écraser de retouche/archive ni réactiver de place ; autorité/cycle revérifiés avant reçus.
- MATCHED et révisions inchangées ne valent ni autorisation durable ni validation globale. Recontrôler les liens/quotas/référentiels lors des futures publication et naissance. Préserver tests partagés de conflit, révocation, retrait, corruption, confidentialité et interruption.
- Provenance RECONCILED_SNAPSHOT, empreinte globale 12, budgets inchangés et publication indisponible. Sauvegarder marqueurs privés avec brouillon/droits/compteurs/verrous/historiques/reçus. I3a n’est pas un retour fonctionnel équivalent. Plafond du workflow de vérification porté à 50 minutes après une CI I3a de plus de 38 minutes ; tests et frontière production inchangés.

## Tranche I3c — contrôle privé de l’ensemble des dossiers M2

- [I3c](docs/SO-01-I3C-CONTROLE-DOSSIERS-M2.md) ajoute une lecture transactionnelle sous MJ de session + lecture M2, sans édition obligatoire. Ne pas l’exposer aux délégataires de contrôle central dépourvus d’accès aux admissions. Aucun droit sur les autres ateliers implicite.
- Recompter les confirmations et vérifier leurs liens/identités/choix courants ; conserver les exceptions I2 motivées et la possibilité d’une biographie M2 différente. Dossier non approuvé lié à une fiche active = décision à reprendre, pas d’archive automatique. Fiche indépendante ≠ joueur/PNJ/réserve déduit.
- Rapport sans écritures, récits ou données de compte ; empreinte d’instantané jamais utilisée comme consentement. Les futurs publication/naissance doivent réexécuter leurs propres validations/autorités/version. Préserver les tests de concurrence classe/M2/retrait/révocation, corruption, orphelins et limites.
- Bornes de lecture 1000 dossiers/1000 verrous actifs/100 M2/16 Mio sources/4 Mio rapport : refus intégral, pas de troncature ni quota joueur inventé. Cycle initial seul, aucun schéma persistant nouveau ; retour I3b sans conversion mais sans ce diagnostic. Empreinte centrale 12, publication indisponible et exigences de sauvegarde inchangées.

## Tranche C2n — instantanés privés de préparation

- [C2n](docs/SO-02-C2N-INSTANTANES-CENTRAUX.md) conserve définitions natives des sept ateliers et rapport dans `masterDrafts/initial/checks/{id}/pages`. Réutiliser la pagination de campagne ; capture atomique avec manifeste, audit et reçu, sans changer le brouillon ni les pointeurs.
- Capture propriétaire seulement, consultation sous droits C2b courants. Autorité/cycle avant reçus ; même confirmation retrouve la capture historique sans l’écraser. Diagnostics de références conservés, source native invalide refusée. Une capture n’autorise jamais publication ou naissance.
- Vérifier intégrité et identités à la relecture/téléchargement ; aucune reconstruction depuis le brouillon courant. Empreintes non signées, pas une protection contre un administrateur réécrivant tout. Budgets propres 6 Mio/100 pages, contrôle 1659/16 Mio/4 Mio et empreinte 12 conservés.
- JSON privé de consultation seulement ; préserver manifestes/pages/audits/reçus avec la sauvegarde cohérente complète. Aucun import/restauration ou copie des dossiers privés I3. Retour I3c sans conversion mais sans lecteur. Conserver concurrence, révocation, interruption, Unicode et tests Firestore/HTTP ; activation et restauration complète restent à développer.

## Tranche C2o — groupes et factions du brouillon M2

- [C2o](docs/SO-02-C2O-GROUPES-CENTRAUX.md) ajoute `group` dans les changements M2, en réutilisant `groupInput` et ses permissions. Appartenances/visibilité proposées seulement : aucun groupe, mandat, caisse ou stock de session créé. La régie I2b et `groups.members` restent l’autorité en partie.
- Réutiliser les droits M2, révision commune, audit et reçus ; autorité/cycle avant réessai. Champs imbriqués stricts, permissions booléennes explicites, aucun roster/UID/politique de caisse injecté. Contrôler aussi les références des appartenances inactives ; archive du groupe exclut ses liens actifs.
- Excel M2 reste limité aux personnages ; exclure les groupes de sa table de modifications, conserver leurs données et recalculer leurs liens. Les IDs homonymes groupe/personnage ne se masquent pas. I3c accepte les groupes natifs sans les confondre avec des admissions ou mandats.
- Bornes : 50 groupes archives comprises, 100 propositions/96 Kio par groupe ; total central 1709/16 Mio/4 Mio. I3c lit 100 fiches + 50 groupes + catalogue, autres budgets inchangés. Empreintes central 13 / privé I3c 2. Captures C2n relues sans recalcul ; préserver tout leur ensemble cohérent. Retour C2n non équivalent ; publication, activation, restauration complète et recette humaine restent à livrer.

## Tranche C2p — lieux natifs et références communes M6

- [C2p](docs/SO-02-C2P-LIEUX-CENTRAUX.md) ajoute `fieldTarget` dans M6 avec `fieldTargetInput`/`fieldProfile`, profils et récompenses proposés seulement. Aucun catalogue parallèle, `fieldState`, réserve, action, QR ou habilitation de laboratoire créé. Révision commune, audit et reçus ; autorité/cycle avant réessai.
- Champs imbriqués stricts ; dépendance vers installation native, références M1 sous lecture M1, informations M6 locales. M3/M4/M5 lisent M6 uniquement avec sa lecture indépendante ; suggestions minimales sans notes/profils/récompenses. Sans droit, aucune requête ni révélation d’existence/archive. Un lieu résolu n’autorise jamais un laboratoire.
- Excel M6 reste ciblé sur les informations ; filtrer la table d’import par types du contrat, préserver lieux homonymes et recalculer leurs liens sans faux numéro de ligne. Imports M3/M4/M5 localisent les liens M6. Captures historiques relues sans recalcul ; nouveaux lieux capturés avec le brouillon cohérent.
- Bornes : 100 lieux archives comprises, 96 Kio chacun, limites natives 20 récompenses/20 bonus/20 durées par profil ; global 1809/16 Mio/4 Mio, empreinte 14. I3c et captures 6 Mio/100 pages inchangés. Les paramètres proposés ne certifient pas V0.7 ; garder les diagnostics de règles, source réelle de récompense et habilitation/QR manquants avant activation.
- Sauvegarder lieux, références, droits, historique, imports, reçus et captures/pages ensemble. Retour C2o non équivalent ; aucun effacement pour le permettre. Excel terrain central, conformité canonique, publication/version activable, restauration complète et recette humaine restent à livrer.

## Tranche C2q — Excel des lieux M6

- [C2q](docs/SO-06-C2Q-EXCEL-LIEUX.md) ajoute le schéma M6 2 avec Informations/Lieux obligatoires, profils/récompenses JSON natifs complets et sélection typée. Export sans version explicite et import M6 schéma 1 conservent leur contrat et leurs IDs nus ; aucun préfixe ancien réinterprété. Autres ateliers schéma 1, Masters et gabarits historiques inchangés.
- Réutiliser aperçu/confirmation/lot/révision communs, autorité et cycle avant reçus. Liens calculés sur les deux feuilles finales, aucune copie ni effet joué. M1/M2 consultés uniquement sous leurs lectures indépendantes ; colonnes et provenance strictes, aucune fausse ligne pour WEB. Conserver les tests de versions, homonymes, réessais, révocation, concurrence et interruption.
- 100 lignes cumulées/1 Mio/32 000 caractères par cellule, refus sans troncature. Bornes natives et globales 1809/16 Mio/4 Mio inchangées ; empreinte centrale 15, I3c inchangé. Captures historiques relues sans recalcul ; nouvelles provenances 2 conservées dans les captures.
- Sauvegarder définitions, références, droits, révisions, historiques, lots/reçus et captures/pages ensemble. Retour C2p non équivalent, aucune rétroconversion implicite. Conformité canonique, réserves réelles, QR/habilitations, publication/version activable, restauration complète et recette humaine restent à livrer.

## Cycle de chaque ensemble fonctionnel

1. Lire le cadrage V3.5, le livre SPACE OUTLAWS V0.7, les sept gabarits proposés SO_Masters_V01.zip et le vade-mecum ; conserver le rapport de cohérence V0.6 comme historique (sources référencées dans SO-01a et SO-00). Délimiter un parcours complet, ses critères, dépendances et recettes. A01–A38 et l’extension PNJ FOR-01 sont clos : ne pas réinventer leurs barèmes. Distinguer les propositions techniques et les paramètres de session à préparer. Les décisions V3.5/V0.7 prévalent sur les cadrages antérieurs ; les prix/compositions d’exemples V3.2 restent non canoniques.
2. Réutiliser les services et collections existants. Protéger les acquis de campagne, les anciennes sessions, les identifiants et les quatre Masters Campagne/Session, modèles et exemples.
3. Implémenter sur la branche, avec tests métier, tests d’interface pertinents et tests Firebase émulés pour transactions, permissions, réessais et concurrence.
4. Exécuter les contrôles locaux applicables, au minimum `npm test` et `npm run build`. Corriger les échecs avant de constituer le commit fonctionnel.
5. Faire un commit après chaque ensemble fonctionnel validé localement ; le pousser sur la branche dédiée avec sa PR ouverte. Le workflow exécute compilation, tous les tests applicatifs et l’intégration sélectionnée. Le plan publié indique commit candidat/checkout, ancêtre validé, fichiers comparés et suites retenues. Ne jamais limiter au seul dernier push après un échec : comparer depuis le dernier succès ancestral.
6. Vérifier la CI sur le commit exact. Un contrôle en cours, annulé ou ignoré n’est pas un succès. Corriger toute régression sur cette branche, committer le correctif et vérifier sa CI **avant le lot suivant**.
7. Documenter les changements, compatibilités, limites et résultats réellement exécutés. Conserver les liens commit/PR, exécution et job, versions des outils, décomptes et date. Séparer tests locaux, CI, recette humaine et publication.
8. Mettre à jour la matrice SPACE OUTLAWS V3 et le suivi du lot, puis passer au lot suivant uniquement lorsque la validation automatisée requise est réussie.

Le workflow de vérification (`.github/workflows/check.yml`) se déclenche sur PR, push main et lancement manuel, sans doublon push de branche/PR. Node 22, Java 21, émulateurs `demo-gn-engine` ; aucun déploiement. Une PR brouillon utilise `scripts/ci-plan.mjs` et la liste explicite de `ci-scope.mjs`. Fichier non classé/fondations/CI, historique API indisponible ou ancêtre introuvable : suite complète. Les modifications de base de PR sont incluses dans le diff jusqu’au checkout fusionné. Les modifications seulement documentaires/tests applicatifs exécutent build + tous les tests applicatifs ; interface seule : HTTP complet. Firebase est réparti sans doublon : six lots complets ou quatre spatiaux ; chaque lot a ses propres émulateurs. Le job `core` échoue si un contrôle requis échoue/est annulé. Ne pas présenter une suite ciblée comme une régression intégrale. Toute PR non brouillon, passage en revue, commit contenant `[ci full]`, push main ou lancement manuel impose le complet ; `npm run test:emulator` sans variables de sélection conserve le parcours complet local. Vérification complète du candidat avant fusion/publication ; cela n’autorise aucune de ces actions. Les résultats définitifs peuvent être consignés dans la description de PR en citant le commit testé ; ne pas attribuer à un nouveau commit un résultat obtenu sur un ancien.

## Recette finale avant publication

Prévoir un environnement de test isolé de la production et identifier précisément sa configuration, son URL éventuelle et le commit candidat. Les émulateurs servent aux tests automatiques ; ils ne constituent pas à eux seuls une recette humaine sur appareils. Aucune URL ni disponibilité d’environnement de recette n’est présumée.

Avant de provisionner un projet externe ou de créer des accès, préciser les moyens nécessaires et les autorisations disponibles. Préparer des données fictives et des comptes distincts pour propriétaire, MJ, accueil et joueurs ; vérifier l’absence de connexion du candidat à la production.

La recette finale doit couvrir :

- les 24 parcours REC-SO-01 à REC-SO-24, les six REC-SO-FOR-01 à 06, les cinq REC-SO-REC-01 à 05, les dix REC-SO-MST-01 à 10 les dix REC-SO-INS-01 à 10 (55 cas ciblés au total), et les 10 essais SEC-SO, en signalant chaque cas exécuté, échoué, bloqué ou non exécuté ; les anciennes recettes V2 restent pertinentes pour les fonctions conservées ;
- le Master SPACE OUTLAWS central, ses sept ateliers et ses six domaines, les imports/exports et les quatre Masters historiques ;
- l’isolation des sessions, les secrets, la révocation et la frontière absolue entre QR public d’interaction et accès privé jamais piratable ;
- les transactions, réessais, concurrence, pause, reprise et réseau dégradé ;
- la continuité de campagne et la préparation d’un épisode sans redistribution des acquis ;
- la chaîne spatioport lorsqu’elle est développée : achat, chargement, départ, interception, vrai butin, révision conditionnelle aux tirs effectivement exécutés ou dommages spéciaux prévus, réparations distinctes et nouveau départ ;
- les parcours sur Android/iOS et plusieurs comptes ; la charge pilote d’environ 60 participants avec seuils définis avant mesure ;
- les sauvegardes et la restauration nécessaires aux migrations prévues.

Consigner l’appareil, le rôle, le contexte, les étapes, le résultat attendu, le résultat constaté et la preuve. Corriger les régressions et rejouer les cas affectés avant de proposer la mise en service.

## Livrables de fin de développement

Préparer dans le dépôt :

1. Un **rapport de validation global** : version et commit candidat, couverture de chaque exigence, résultats CI, recette finale, anomalies, limites, compatibilité des données/Masters et décision de préparation à la mise en service.
2. Une **procédure de déploiement à faire approuver** : cible exacte, prérequis, sauvegarde vérifiée, migrations et retour arrière, ordre des actions, contrôles après publication, conditions d’arrêt et responsabilités.
3. Une demande d’autorisation fondée sur ces éléments concrets. Sans accord explicite, conserver le candidat sur branche/PR et ne rien publier.

Ces livrables et la recette finale sont à produire à l’issue du développement ; ce document n’en affirme pas l’exécution.

## Références de reprise

- [Audit et plan central V3.4 à valider](docs/SO-00-V34-PLAN-CENTRAL.md) ; [rapprochement des sept gabarits](docs/SO-00-V34-GABARITS.md)

- [Reprise V3.2 et sous-Master Recettes en brouillon, SO-06b](docs/SO-06B-RECETTES-BROUILLONS.md)

- [Référentiel V3.2/V0.7 et tranche SO-01a](docs/SO-01A-NATURES-SOINS.md)

- [Audit SO-00, sources intégrales et tranche Master](docs/SO-00-REPRISE.md)
- [Matrice SPACE OUTLAWS V3](docs/MATRICE-SPACE-OUTLAWS-V3.md)
- [Rapport courant](docs/SO-VALIDATION.md)
- [Sauvegarde/reprise et déploiement à faire valider](docs/SO-SAUVEGARDE-DEPLOIEMENT.md)

Historique conservé, remplacé par V3 en cas de contradiction :

- [Cadrage V2](docs/source/GN_Engine_Cahier_des_charges_Work_Astra_V2_0.md)
- [Audit L0](docs/AUDIT-V2-L0.md)
- [Matrice exigences et recettes](docs/MATRICE-V2.md)
- [Périmètre L1 et première tranche](docs/L1-ATELIER-MODULAIRE.md)
- [Rapport L1a et limites](docs/VALIDATION-0.37.md)

