# I3b — rapprochement courant du dossier et de M2

## Parcours livré

Depuis un dossier déjà préparé par I3a, **Comparer avec le dossier** ouvre un aperçu privé. Le MJ voit côte à côte l’identité fictive, la nature, la classe, l’espèce, l’initiation et les deux textes de biographie. Il choisit de conserver la biographie M2 ou de la remplacer par le background approuvé, indique un motif et confirme le rapprochement.

L’identité et les choix de création sont alignés sur le **dossier actuellement approuvé**. Le parcours ne modifie pas les choix d’admission pour les adapter à une retouche M2 : un changement de classe/quota doit d’abord passer par la décision I2. Un dossier retiré, refusé, en attente ou à corriger ne peut produire de nouveau rapprochement. Une fiche archivée exige une restauration distincte dans M2.

I3b complète la préparation privée, **pas I3/INS-06 de bout en bout**. Il n’ouvre aucun chemin de publication, affectation ou naissance. Le contrôle global et la future naissance doivent encore revérifier les liens courants, les quotas, les autorisations et la version publiée au moment de leur propre transaction.

## Données comparées et conservées

| Donnée | Traitement confirmé |
|---|---|
| Prénom + nom fictifs | Remplace le nom d’affichage M2, sans troncature ; maximum 150 caractères |
| Nature et plan initial | Aligne nature, classe, espèce et initiation N1 hors classe sur le dossier approuvé |
| Biographie | **Conservée par défaut** ; remplacement seulement sur choix explicite du MJ |
| Profession, description publique, conseils de jeu | Conservés |
| Secrets joueur, notes MJ, objectifs/étapes, relations | Conservés avec leurs identifiants |
| Email, UID candidat, amis souhaités, décision, consentement, invitation | Aucune copie automatique dans M2, son historique ou ses exports |

Les libellés des classes, initiations et espèces sont affichés quand ils sont disponibles. Une espèce référencée par une fiche ancienne mais absente du catalogue conserve son identifiant visible dans la comparaison ; aucune espèce n’est inventée. Une correction approuvée vers une autre espèce/nature peut être rapprochée tant que la définition reste privée et non incarnée.

Le validateur natif `centralCharacterInput` est conservé. `centralCharacterEditable` extrait les champs déjà utilisés par le contrôle global ; `validateCentralChange` applique à la fiche et à sa provenance les mêmes vérifications strictes que ce contrôle. Champs actifs, contenu publié, données/provenance corrompues ou lien incohérent sont refusés, sans réparation implicite.

## Autorité et contrôles courants

Les deux droits I3a restent obligatoires : accès MJ aux admissions de la session **et** lecture/édition M2 de la campagne, ou propriétaire habilité. Un droit M2 seul, un rôle MJ seul, l’accueil, un joueur ou une simple lecture M2 ne suffisent pas. Aucun accès implicite aux autres ateliers.

L’aperçu et chaque nouvelle application relisent le cycle de préparation initiale, le lien I3a, la définition native, l’approbation, le consentement actuel, les choix disponibles, la nature/initiation, le verrou d’identité et la cohérence des confirmations/compteurs. Le rapprochement ne réserve ni ne libère une place. Fermeture des candidatures ou révocation du lien d’invitation n’annulent pas une approbation : les contrôles d’I3a sont réutilisés.

L’aperçu renvoie les différences, ou un blocage sans confirmation utilisable. Il indique les révisions du dossier et de la fiche, ainsi que la dernière relecture et si ces deux révisions ont changé. `MATCHED` signifie seulement que les six champs comparés sont égaux. `revisionsUnchanged` décrit deux numéros de révision, **pas une autorisation durable**, ni un contrôle global des références, kits ou espèces. Une politique peut invalider le consentement sans changer ces deux numéros ; le blocage courant reste prioritaire.

Chaque choix de biographie possède une empreinte distincte liée à l’auteur, à ses droits, au dossier complet, à la fiche complète et aux révisions de campagne/session/politique/brouillon. Toute modification concurrente requiert un nouvel aperçu. Aucun contenu M2 arbitraire, personnage cible, rôle, ressource ou décision d’admission n’est accepté dans la commande.

## Transaction, relecture et réessais

Si M2 change, **une transaction** écrit la même définition avec `contentRevision + 1`, la révision commune du brouillon, l’historique central avant/après, la relecture privée, l’historique d’admission, l’audit et le reçu. La source centrale reste `ADMISSION` avec provenance stricte `{schemaVersion:1, kind:RECONCILED_SNAPSHOT}`. Aucun second personnage, catalogue ou lien civil central n’est créé.

Si le choix confirmé ne change pas la fiche — par exemple, conserver une biographie différente alors que l’identité et le plan correspondent déjà — seuls la relecture privée, l’historique d’admission, l’audit et le reçu sont enregistrés. La fiche, sa provenance, sa révision, l’historique central et la révision du brouillon sont inchangés. Dans les deux cas, la révision d’admission augmente d’un ; compteurs de classe, places et ressources restent identiques.

Le marqueur initial `admission.m2Preparation` reste historique et inchangé. Le dernier rapprochement occupe `admission.m2Reconciliation`, schéma 1 : références/révisions, auteur/date/commande, empreinte, choix de biographie et indication de modification. Les états précédents restent dans l’historique privé. La garde de préparation vérifie cette forme sans autoriser une incarnation. Le `characterId` racine reste nul, `accessActive=false` et `status=RECEIVED`. Le joueur ne reçoit pas ces métadonnées internes.

Même ID de commande = résultat historique, après autorité et cycle courants ; contenu différent sous le même ID = refus. Un nouvel ID portant l’empreinte du dernier rapprochement, le même auteur et le même choix retrouve aussi son résultat sans nouvelle édition. Après une retouche, une archive ou un retrait, ce résultat **ne réactive rien et ne certifie pas l’état courant**. Une empreinte plus ancienne, remplacée par une autre relecture, exige un nouvel aperçu si son reçu de commande initial n’est pas utilisé.

Deux confirmations concurrentes ne fusionnent pas leurs choix : une seule s’applique et l’autre devient périmée. Les courses avec édition M2, changement d’admission ou retrait restent atomiques. Une interruption avant commit ne laisse ni fiche, ni marqueur, ni historique partiel. La commande initiale I3a continue à retourner sa première préparation, sans annuler I3b.

## Compatibilité et suites

L’extension est additive sur les dossiers I3a du brouillon initial. Aucun dossier historique adopté, aucun seed appelé, aucune migration exécutée. Les quatre Masters CAMPAGNE/SESSION et leurs exemples sont inchangés. La limite M2 reste 100 fiches, archives comprises, et 96 Kio par fiche ; I3b modifie une définition existante. Le contrôle global reconnaît la nouvelle provenance, porte son empreinte interne à **12** et conserve les bornes **1659 changements / 16 Mio / 4 Mio**, sept ateliers `PARTIAL` et `publicationAvailable=false`.

Sauvegarder ensemble inscriptions et marqueurs privés, brouillon, délégations, confirmations/verrous/compteurs, historiques et reçus. L’export M2 ciblé n’est pas cette sauvegarde. I3a ignore la nouvelle provenance de rapprochement dans son contrôle global : ce n’est pas un retour fonctionnel équivalent. Ne supprimer ni marqueur ni contenu pour permettre un retour logiciel ; restauration complète à vérifier séparément.

Restent à développer : validation des liens admission/définition dans la future publication/naissance, contrôle global complet et publication immuable C2, naissance et protections I4, relève I5, portraits et autres contenus non raccordés. Le rapprochement ne change aucun kit, crédit, XP, PA, PV, QR, objet, mandat, groupe ou instance de session.

## Validation

Le 25 octobre 2026 (Europe/Brussels), `npm run build` et **1347/1347 tests applicatifs** réussis, zéro échec/annulé/ignoré/todo ; Node 24.22.1 / npm 11.9.0. **23 nouveaux cas métier partagés mémoire/Firestore, cinq UI et un HTTP/Auth**. Les nouvelles assertions ont d’abord été corrigées pour distinguer l’audit attendu des données de session inchangées et respecter l’ordre des lectures avant écritures dans une fixture ; la suite complète finale est réussie.

Couverture : prévisualisation sans écriture, relecture sans modification M2, conservation des récits, choix explicite de remplacement, correction approuvée d’identité/nature, conflits, retrait, archive/restauration distincte, révocation avant réessai, corruption et interruption. Export XLSX réel et projections privées vérifiés. UI testée par HTML/formulaires/payloads ; aucune recette visuelle navigateur, mobile, terrain, charge pilote ni restauration globale revendiquée.

Syntaxe des intégrations vérifiée. Firebase non exécuté localement (Java 17.0.20) ; les deux CI utilisent Node 22/Java 21. Le plafond du workflow de vérification passe de **40 à 50 minutes**, car le push I3a a dépassé 38 minutes. Commandes de test, versions des outils, déclencheurs et séparation de la production inchangés ; ce plafond n’est pas une estimation de durée.

Les résultats définitifs du candidat exact seront consignés dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après les deux CI, sans nouveau commit de preuve. Base I3a `e97102c92aaef221c57003109112955368b869a9` revérifiée : push `40166524985` et PR `40166528966` réussis au premier essai, **1319 applicatifs + 1059 Firebase/HTTP chacun**, [preuves archivées](PR-1-HISTORIQUE-AVANT-I3B.md).

INS-06 et MST-01/03/06/08 reçoivent des preuves préparatoires partielles. Les **55 verdicts complets** et SO-GAP-12/13/14 restent inchangés. Aucun merge, déploiement ou changement Firebase/IAM/règles/index de production.

## Sources

- [CDC V3.5](source/SO_CDC_V35.md), §§3.4, 3.6, 4.7–4.10 et 8.4 : séparation des états, contrôles courants, stabilité des identités et publication globale.
- [Livre V0.7](source/SO_Regles_V07.txt), chapitre 3 et A08–A10 : choix canoniques conservés, aucune nouvelle règle d’activation.
- [Gabarits V0.1](SO-00-V34-GABARITS.md), M2, et [vade-mecum](source/SO_Vademecum_V01.txt).
- [I3a](SO-01-I3A-ADMISSION-VERS-M2.md), [I2](SO-01-I2-DECISIONS.md), [C1e](SO-01-C1E-PERSONNAGES.md) et [C2c](SO-02-C2C-PROFILS-INITIAUX.md).

