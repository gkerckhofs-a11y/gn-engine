# GN Engine — consignes de développement

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
- Bornes explicites : 601 changements, 16 Mio de contenu, 4 Mio de rapport ; refus sans résultat tronqué. Conserver tests de cohérence concurrente, confidentialité et absence d'écritures. Publication, pages immuables, version READY/pointeur, restauration et recette humaine restent à développer.

## Tranche C2b — délégation du contrôle préparatoire

- [C2b](docs/SO-02-C2B-DELEGATION-CONTROLE.md) étend explicitement la lecture propriétaire C2a : `campaignStaff.checkCentral=true`, délégation active et lecture des sept ateliers obligatoires. Le cumul des droits d'atelier ou un rôle de session ne suffit toujours pas. Seul le propriétaire attribue/retire ce droit, avec révision et motif.
- Conserver les anciens grants sans champ comme non habilités ; une modification active d'un grant déjà habilité exige un choix explicite. Désactiver efface le droit ; réactiver ou rejouer un ancien reçu ne le restaure pas. Conserver tests partagés de concurrence/révocation et isolation des admissions.
- L'empreinte inclut l'autorité courante et la révision des droits ; elle ne devient pas une autorisation de publication. `publicationAvailable=false`, limites et couverture partielle C2a conservées. Aucun gel, version/pointeur ni ressource ajouté. Les validations complètes et la publication restent une suite à développer.

## Tranche C2c — plans initiaux joueurs M2

- [C2c](docs/SO-02-C2C-PROFILS-INITIAUX.md) ajoute `creationPlan` optionnel dans la définition C1e : huit classes, espèce narrative référencée et une initiation N1 hors classe. Trois principales dérivées à N2 ou fixes (COM-01/02 et ROG-01), sans `abilityProfile` actif ni dotation. Réutiliser les choix I1, ne pas assimiler les codes V0.7 aux IDs historiques.
- Omission par ancien client = conservation ; null explicite = retrait audité. Conserver révisions communes, archive/restauration et tests concurrence/révocation/réessai. Le flag d'espèce `available` ferme un choix aux candidatures, pas une définition M2.
- Le contrôle commun valide les plans et références d'espèce ; il ne certifie pas les effets de compétences ni les fiches narratives sans plan. I3/I4 doivent encore relier les admissions, quotas et naissance. PNJ Force, progression, kits, publication et restauration complète restent distincts ; ne jamais activer le plan par les seeds historiques.

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

## Cycle de chaque ensemble fonctionnel

1. Lire le cadrage V3.5, le livre SPACE OUTLAWS V0.7, les sept gabarits proposés SO_Masters_V01.zip et le vade-mecum ; conserver le rapport de cohérence V0.6 comme historique (sources référencées dans SO-01a et SO-00). Délimiter un parcours complet, ses critères, dépendances et recettes. A01–A38 et l’extension PNJ FOR-01 sont clos : ne pas réinventer leurs barèmes. Distinguer les propositions techniques et les paramètres de session à préparer. Les décisions V3.5/V0.7 prévalent sur les cadrages antérieurs ; les prix/compositions d’exemples V3.2 restent non canoniques.
2. Réutiliser les services et collections existants. Protéger les acquis de campagne, les anciennes sessions, les identifiants et les quatre Masters Campagne/Session, modèles et exemples.
3. Implémenter sur la branche, avec tests métier, tests d’interface pertinents et tests Firebase émulés pour transactions, permissions, réessais et concurrence.
4. Exécuter les contrôles locaux applicables, au minimum `npm test` et `npm run build`. Corriger les échecs avant de constituer le commit fonctionnel.
5. Faire un commit après chaque ensemble fonctionnel validé localement ; le pousser sur la branche dédiée. Le workflow de vérification du dépôt exécute ensuite compilation, tests applicatifs et `npm run test:emulator` dans GitHub Actions.
6. Vérifier la CI sur le commit exact. Un contrôle en cours, annulé ou ignoré n’est pas un succès. Corriger toute régression sur cette branche, committer le correctif et vérifier sa CI **avant le lot suivant**.
7. Documenter les changements, compatibilités, limites et résultats réellement exécutés. Conserver les liens commit/PR, exécution et job, versions des outils, décomptes et date. Séparer tests locaux, CI, recette humaine et publication.
8. Mettre à jour la matrice SPACE OUTLAWS V3 et le suivi du lot, puis passer au lot suivant uniquement lorsque la validation automatisée requise est réussie.

Le workflow de vérification actuel (`.github/workflows/check.yml`) se déclenche sur push/PR et utilise Node 22, Java 21 et les émulateurs du projet `demo-gn-engine`. Il ne déploie pas. Vérifier cette séparation si les workflows évoluent. Les résultats définitifs de CI peuvent être consignés dans la description de PR en citant le commit testé ; ne pas attribuer à un nouveau commit un résultat obtenu sur un ancien.

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

