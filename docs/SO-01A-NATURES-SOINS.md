# SO-01a — Natures et compatibilité des soins

23 octobre 2026. Candidat 0.37.0, branche `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Développement partiel de SO-01 sous V3.1/V0.7 ; aucune mise en production et aucune recette terrain revendiquée.

## Reprise vérifiée et référentiel

Au départ : `main` = `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0), branche = `133ea159e5574fdac9d05f759c8ae3e14700038f` (0.37.0), arbre = `98ec3eaf46e3f197843295f8c7c761c900d4f056`. La PR #1 reste ouverte en brouillon. Les runs de TEST de cette base, [push 39940395737](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940395737) et [PR 39940402074](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940402074), ont été relus : succès. Le travail L1a–m et SO-06a est conservé. L’inventaire de branches et le dernier déploiement connu restent tracés dans [SO-00](SO-00-REPRISE.md) ; aucune vérification privée de production supplémentaire n’est revendiquée.

Lecture intégrale des nouveaux fichiers fournis, récupérés par leur identité connue :

| Source | Contenu conservé dans le dépôt | SHA-256 |
|---|---|---|
| `SO_CDC_V31.md` | [Copie exacte](source/SO_CDC_V31.md), 638 lignes | `e4892766515e1713d6812ff81d0463a5bad60531de89fd4651b2aa6d390a1da8` |
| `SO_Regles_V07.docx` | [Extraction intégrale du corps](source/SO_Regles_V07.txt), 2 305 paragraphes, tableaux inclus dans l’ordre XML | DOCX `7f9cb723e5395d643dffa636a626498fe01d1b1f3a8c421a88a60c2725b1fd73` ; texte `5ea1598760b98416db500642bb13d0a634a72787f034ddc55defd1ee4029abf6` |
| `SO_Prompt_Astra_V31.txt` | [Copie exacte](source/SO_Prompt_Astra_V31.txt) | `84f7264c606e7e8d71c4b3d82ab915ba142f29edb555f5c020436421ef9a7167` |

Les copies V3.0/V0.6 et le rapport de cohérence V0.6 précédemment lus restent historiques. L’extraction DOCX conserve le texte, pas la mise en page ni les en-têtes/pieds de page. Aucun rapport de cohérence V0.7 non fourni n’est supposé lu.

V3.1/V0.7 maintient A01–A38, ajoute FOR-01 exclusivement PNJ et six recettes FOR, et retient **Breach Port** comme nom narratif. Les identifiants historiques ne sont pas renommés. Les chaînes `version 0.6` restantes dans l’annexe A.1 du cahier et le dernier paragraphe du livre sont des reliquats éditoriaux : le titre, le prompt et l’extension indiquent explicitement V0.7. La classification détaillée du livre et A16/A17 conserve Dissimulation et FIL-01 ordinaires, malgré le regroupement ambigu de la section 5.1 du cahier. Aucune décision de gameplay n’est rouverte et aucun profil incomplet n’est publié sous l’identifiant canonique V0.7.

## Parcours développé

1. Dans le scénario, renseigner la nature d’une fiche : `HUMANOID` ou `DROID`, via son éditeur ou le Master Personnages. Les personnages historiques sans nature restent sans nature ; aucun choix n’est déduit d’un nom, d’une classe ou d’une profession.
2. Configurer les patients admissibles d’un protocole existant : humanoïdes pour le soin biologique, droïdes pour la réparation de PV. Les écrans Interactions et Compétences, leurs Masters et leurs imports utilisent les mêmes validateurs.
3. Publier le scénario et créer la session par le circuit existant. La nature est copiée, puis conservée : ni une édition narrative MJ ni un import de préparation ne change la nature d’un personnage déjà créé en session. Un changement sur un épisode existant nécessite un futur parcours de migration explicite.
4. Le praticien authentifié prépare une action vers un patient : la compatibilité est vérifiée côté serveur avant toute réservation et de nouveau à la résolution temporisée. Un droïde peut soigner un humanoïde s’il possède la compétence ; seul le patient est comparé au protocole.
5. Les PA, lots, PV, verrous, délais, reçus et historiques restent gérés par `health` et `person-actions`. Deux envois ne produisent pas deux effets ; une incompatibilité ne consomme rien. Les actions en cours conservent leur instantané de protocole si le catalogue change.
6. La nature apparaît dans la fiche privée publiée et son historique. Le badge public reste sur sa liste blanche existante. La reprise de campagne, les archives de définition et les exports XLSX conservent les nouveaux champs.

## Contrat et migration

| Donnée existante étendue | Champ / colonne | Traitement historique |
|---|---|---|
| `characters` | `nature` / `Personnages.nature` | Champ facultatif, jamais ajouté automatiquement ; vide conserve, `!EFFACER` seulement dans le scénario |
| `personProfiles` | `patientNature` / `Interactions.nature_patient` | Facultatif ; absent/null garde le fonctionnement antérieur sans restriction de nature ; interdit sur une fouille |
| `skills.healing`, profils attribués | `patientNature` / `Competences.nature_patient` | Même filtre pour les soins instantanés ; une nouvelle version du catalogue ne remplace pas les profils attribués |

Pour un protocole restreint, un patient sans nature est refusé. Un protocole historique non restreint conserve ses anciennes règles. Ce sous-lot fournit le mécanisme ; la publication future du profil fermé SPACE OUTLAWS devra imposer les natures, les filtres MED/MEC et tous les autres critères canoniques. **Choisir une nature ne rend pas à lui seul une session conforme à V0.7.**

Aucune nouvelle collection, duplication de portefeuille ou copie de stock. Format Master 1 conservé, trois colonnes facultatives. Les colonnes nouvelles laissées vides sont exclues de l’empreinte des reçus, pour qu’un réimport historique ne soit pas interprété comme une modification de même version. Les quatre Masters XLSX binaires sont inchangés (empreintes SO-00 revérifiées après build). Aucun export ne convertit silencieusement les sessions déjà jouées.

## Preuves exécutées

| Contrôle | Résultat local | Preuve |
|---|---|---|
| Tests ciblés du sous-lot | 13 réussis, 0 échec | 10 cas métier partagés avec Firestore + 3 cas UI automatisés |
| `npm test` | **778 réussis**, 0 échec/ignoré/annulé, Node 24.19.0 | [Log complet](verification/so-01a-npm-test.log) |
| `npm run build` | Succès | [Log](verification/so-01a-build.log) |
| Quatre Masters | SHA-256 inchangés | Empreintes de référence dans SO-00 |
| GitHub TEST / Firebase | Résultats définitifs à consigner dans la PR sur le commit exact après publication | Node 22 / Java 21, projet `demo-gn-engine`, jamais la production |
| Tests humains, navigateur réel, Android/iOS, terrain et charge | **NON TESTÉ** | Les tests UI vérifient le rendu et la sérialisation ; ils ne prouvent pas une recette humaine |

Cas automatisés : nature valide/invalide, refus joueur, projection privée et badge public, scénario → version → session, conservation en campagne, import/export XLSX, anciens reçus et clients, archives, retrait explicite d’un filtre, refus du filtre sur fouille, nature inconnue, nature falsifiée dans la requête, PA et fournitures inchangés au refus, médecin droïde, clinique mécanique, concurrence, réessai et changement de catalogue après démarrage. Les valeurs courtes des fixtures ne sont pas présentées comme des durées canoniques.

Les tests Firebase sont exécutés par le workflow existant de TEST. Aucun émulateur local n’est revendiqué (Java local 17, CI 21). Le commit, les deux runs push/PR, leurs jobs, nombres observés et heures seront enregistrés dans la description de PR ; une CI ancienne n’est pas une preuve pour ce candidat.

## Limites et suite

REC-SO-01/05/23/24 disposent de preuves automatiques **partielles** supplémentaires. Aucun de ces parcours complet n’est validé. Les 24 REC-SO et six REC-SO-FOR restent NON TESTÉ de bout en bout.

Restent notamment : profil canonique publié fermé, huit classes et initiation contrôlée, XP participant, relève, crédits protégés, kits, protection personnelle, stabilisation/mortalité/STOP, modules droïdes, classe PNJ secrète et FOR-01. Les soins instantanés historiques ne sont pas rebaptisés soins V0.7. Les règles anciennes de clôture, dont RESTORE et la conservation de convalescence, restent celles du moteur : A38 n’est pas livré par cette tranche.

Suite SO-01 proposée : profil de création canonique versionné avec huit classes/initiations et validation serveur, puis dotations protégées dans les comptes/lots existants. FOR-01 exige d’abord le statut PNJ/MJ secret et les délais critiques ; aucune permission privilégiée ne doit être inférée de la nature, d’un texte de classe ou d’un QR.

## Recette manuelle à conduire dans un environnement isolé

- Créer deux fiches fictives des deux natures, publier, attribuer deux comptes de test ; constater nature dans fiche privée, absence du champ dans badge public.
- Préparer un médecin droïde et un mécanicien humanoïde, protocoles correctement restreints ; jouer les soins compatibles et vérifier refus des incompatibles, PA/lots et historique.
- Exporter/réimporter les Masters avec confirmation, répéter, puis continuer une campagne sans changement de nature ni redistribution.
- Tester téléphone, erreurs réseau et actualisation pendant une action ; comparer aux reçus serveur, sans ressaisir un débit hors ligne.

État actuel de cette recette : NON TESTÉ. [Sauvegarde/reprise et procédure de déploiement à faire valider](SO-SAUVEGARDE-DEPLOIEMENT.md), non exécutée. Pour abandonner le candidat avant publication, conserver main inchangé ; aucune donnée de production n’a été migrée. Un retour d’un futur code déployé nécessiterait une nouvelle analyse et des sauvegardes, il n’est pas simulé ici.
