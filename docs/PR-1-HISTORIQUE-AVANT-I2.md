# PR #1 — état avant I2

Archive fidèle de la description de PR après validation I1 (23 octobre 2026). Les affirmations ci-dessous sont datées et ne certifient pas les tranches suivantes. Source : https://github.com/gkerckhofs-a11y/gn-engine/pull/1 ; HEAD 5a921aec9afa686d76b98e4f89d8eb4ca2930a53.

## SO-01 I1 — liens d’admission et propositions privées

Un MJ de préparation peut configurer les choix V0.7 et espèces narratives, créer/révoquer un lien limité, puis consulter des dossiers privés. Le candidat authentifié enregistre un brouillon ou soumet une proposition. **Aucune place confirmée, définition de personnage, dotation ou activation dans I1** : quotas confirmés et approbation restent I2.

Commit [5a921aec](https://github.com/gkerckhofs-a11y/gn-engine/commit/5a921aec9afa686d76b98e4f89d8eb4ca2930a53), parent c771db0b ; main 03eaace inchangé. Arbre local/distant identique `a013fac678bb3418cbaf99764d07ca2adc628371` (local fb072deb).
[Guide, architecture, matrice, sauvegarde et limites I1](https://github.com/gkerckhofs-a11y/gn-engine/blob/5a921aec9afa686d76b98e4f89d8eb4ca2930a53/docs/SO-01-I1-ADMISSIONS.md).

- Espèces : un changement M2 du brouillon central initial, aucun catalogue parallèle. Codes de choix canoniques, sans attribution de compétences.
- Invitations/registrations/operations/audit existants réutilisés ; distinction ADMISSION / PRIVATE_ACCESS. Accueil exclu des dossiers.
- Dernier usage du lien atomique, réessais et exception avant commit, contrôles de révision/consentement, révocation avant rejeu, aucune ressource créée.
- Local : **825 tests réussis et build réussi**, Node 24.19.0 ; journaux dans docs/verification/so-i1-*.log. 14 nouveaux cas métier partagés Firestore, 3 rendus HTML et 1 HTTP/Auth.
- **CI I1 : SUCCÈS FINAL**, 23/10/2026, journaux lus. Chaque exécution : build réussi, **825 applicatifs + 639 Firebase**, zéro échec/annulé/ignoré/todo, Node 22.23.3 / Temurin 21.0.12+1, projet émulateur `demo-gn-engine`.
  - [Push 39974996974](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39974996974), [job 120487154764](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39974996974/job/120487154764), 15:03:44–15:23:54 UTC ; checkout 5a921aec.
  - [PR 39975002847](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39975002847), [job 120487173905](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39975002847/job/120487173905), 15:03:46–15:28:37 UTC ; merge virtuel `105f6551240d8633ad969ea647057cfacf96980a`, arbre identique a013fac, parents main 03eaace + 5a921aec.
  - Les 14 cas Admissions SO sur Firestore (ok 33–46) et HTTP/Auth (ok 618) sont présents et réussis dans les deux journaux. La PR approche le plafond actuel de 25 minutes : prévoir une meilleure marge des tests avant les prochaines extensions ; aucun timeout sur ce candidat.
- Limites : confirmations/quota I2, collision des noms, correction MJ, groupes, publication globale, naissance et relève à poursuivre. Portrait et invitation nominative non livrés. Aucun des 55 cas complets ni Android/iOS/réseau physique/restauration complète certifié.
- Masters historiques inchangés. Aucun merge, migration de données, modification des workflows/droits Firebase ou déploiement.

---

## SO-01 C1a — préparer une campagne SPACE OUTLAWS sans dotation

La création historique d'une session initialise déjà personnages, crédits et stocks. Ce nouveau parcours permet au propriétaire de créer **une campagne et son contexte de préparation privés**, puis de déléguer à un MJ et corriger les informations pratiques, **sans initialiser de ressources de jeu**. Les anciennes sessions conservent leur parcours. Les candidatures, quotas par classe, Master central, naissance et relève restent à développer.

Commit [c771db0b](https://github.com/gkerckhofs-a11y/gn-engine/commit/c771db0b321d056d71a650cb17ee7b69b1902794), parent 322ac4f4 ; main vérifié 03eaace, package 0.37.0. Arbre local/distant identique `7bf5950add8bf9d6cdddf17b5fffecdcb8ac6a97` (commit local 234d52d).

- [Guide, architecture, preuves et limites C1a](https://github.com/gkerckhofs-a11y/gn-engine/blob/c771db0b321d056d71a650cb17ee7b69b1902794/docs/SO-01-C1A-PREPARATION.md).
- Extension du service campagnes et des routes Dashboard/session existants ; grants `sessionStaff`, reçus `operations` et audit réutilisés. Aucun catalogue/compte parallèle.
- Nouvelle préparation explicitement marquée SPACE OUTLAWS V0.7, zéro épisode joué, aucun scénario/version publiée. Le marqueur désigne la règle cible et ne certifie pas son implémentation complète.
- Création stable par UID + clé conservée lors des réessais ; même intention avec plusieurs requestId = une seule campagne/session. Conflit de contenu refusé. Édition avec contrôle de révision ; révocation MJ contrôlée avant restitution d'un reçu.
- Anciennes API d'import, inscription et lancement refusées dans cette préparation ; garde commune transactionnelle interdisant crédits, lots, personnages, retrait du marqueur ou ouverture prématurée.
- **Local : 808/808 tests et build réussis**, Node 24.19.0, 0 échec/annulé/ignoré/todo. 10 nouveaux cas métier partagés avec Firestore et 3 UI ; un cas HTTP + Auth supplémentaire raccordé aux émulateurs. Logs `docs/verification/so-c1a-*`.
- Quatre Masters historiques inchangés, aucune dépendance, workflow, configuration Firebase ni `.github/deploy-request.json` modifié.

**CI exacte C1a : SUCCÈS FINAL des deux contrôles.** Push [39968494689](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39968494689), job 120464578469, fin le 23 octobre 2026 à 14:37 UTC ; PR [39968505268](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39968505268), job 120464614042, fin à 14:38 UTC. Logs récupérés et lus : **build + 808 tests applicatifs + 624 tests Firebase sur chaque run**, zéro échec/annulé/ignoré/todo. Node 22.23.3, Java 21.0.12+1. Les dix cas C1a Firestore et le nouveau parcours HTTP + Auth figurent explicitement parmi les succès. La fusion virtuelle PR `d5abd1a4a1174ea7bb4f3b58321fbbec3a5d293d` a le même arbre `7bf5950add8bf9d6cdddf17b5fffecdcb8ac6a97` que le commit de branche et le checkout local. Main demeure `03eaace`, PR en brouillon et non fusionnée.

**Limites :** aucun INS/MST complet, Android/iOS, test de charge ou sauvegarde/restauration complète déclaré validé. L'interruption testée est une exception injectée avant commit, pas une coupure réseau physique. Pas de migration historique, de fusion ou de production. Un ancien binaire ignorant le marqueur de préparation ne constitue pas un rollback sûr si ces contextes existent : garder une protection compatible et suspendre les écritures avant toute procédure approuvée.

Suite : I1 invitation d'admission et proposition privée, I2 quotas/approbation, C1/C2/I3 Master central et M2, I4 naissance protégée, I2b/I5 régie groupes et relève. La publication de production attend la recette finale isolée et l'autorisation explicite.

---

## SO-00 V3.5 — diagnostic des admissions et tests du socle

L'inscription actuelle accepte un compte selon la capacité totale, puis ouvre une invitation privée après attribution. Le parcours demandé exige d'abord une proposition privée, un quota par classe et une approbation MJ. Cette tranche **documente les adaptations et leurs dépendances** ; elle ajoute deux tests de concurrence révocation/paiement aux services existants. **Elle ne livre pas encore l'inscription V3.5, la naissance, la relève ou le transfert entre groupes.**

Commit [322ac4f4](https://github.com/gkerckhofs-a11y/gn-engine/commit/322ac4f4ddeeb702d7cb4adec8963beb4cefb26f), parent 54c7868c ; main vérifié 03eaace. Arbre local/distant identique `3cf2240091b427d282ab58a8139cd71c72381a1c`, package 0.37.0 inchangé.

- [Matrice existant/adapté/nouveau, architecture et ordre minimal](https://github.com/gkerckhofs-a11y/gn-engine/blob/322ac4f4ddeeb702d7cb4adec8963beb4cefb26f/docs/SO-00-V35-INSCRIPTIONS.md).
- [Registre des 55 recettes ciblées, avec preuves partielles et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/322ac4f4ddeeb702d7cb4adec8963beb4cefb26f/docs/SO-RECETTES-V35.md).
- CDC V3.5 lu intégralement et archivé à l'identique. Livre V0.7, sept gabarits vierges et vade-mecum inchangés ; audit V3.4 conservé.
- Sept sondes MemoryStore reproduisent les écarts actuels (dont dotation avant attribution, badge avant activation, invitation privée distincte de l'admission). Aucune escalade Force démontrée : les champs libres historiques ne créent pas de compétence.
- Deux tests métier supplémentaires dans la suite Caisses partagée MemoryStore/Firestore : retrait payWallet concurrent au paiement, dans les deux ordres de lancement. Les droits finaux sont révoqués, les paiements déjà commis restent acquis, reçus périmés refusés, caisse et versions de scénario préservées. **Couverture partielle d'INS-10 uniquement.**
- Local : **795/795 tests et build réussis** (Node 24.19.0), 0 échec/annulé/ignoré/todo ; logs `docs/verification/so35-*`. Les 22 tests ciblés Caisses sont inclus dans 795.
- Aucun fichier applicatif, dépendance, workflow, configuration Firebase ou marqueur de déploiement modifié. Les quatre Masters historiques restent byte-identiques. Source Markdown conservée avec ses espaces originaux.

**CI du commit 322ac4f4 : succès final.** [Push 39963947327](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39963947327), job 120448778582, terminé le 23 octobre 2026 à 14:09 UTC ; [PR 39963954056](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39963954056), job 120448802785, terminé à 14:06 UTC. Logs récupérés : build et **795 tests applicatifs + 613 tests Firebase chacun**, zéro échec/annulé/ignoré/todo, Node 22.23.3 et Java 21.0.12+1. Fusion virtuelle PR `b81490a15ec04a12421bb010f7ca80c6a0526e03`, arbre `3cf2240091b427d282ab58a8139cd71c72381a1c` identique au commit de branche. Aucun workflow de déploiement exécuté.

Ordre proposé : contexte de préparation sans seed (C1a), invitations/propositions (I1), quotas/approbation (I2), régie groupes (I2b), publication centrale et passage M2 (C1/C2/I3), naissance protégée (I4), mort/relève à chaud (I5). Les deux voies de remplacement ne republient pas la campagne. Tous les sous-parcours ont des limites/test gates explicites ; nouvelles ressources impossibles par import.

**Limites :** aucun INS complet validé, pas de recette Android/iOS ni de charge, pas de sauvegarde complète restaurée. La migration reste soumise à validation du plan ; aucune migration effectuée. PR en brouillon, aucune fusion ni production. Procédure de déploiement préparée, non approuvée/non lancée.

---

## SO-00 V3.4 — audit et plan soumis à validation

Un import partiel doit préparer le Master central sans publier ni initialiser les stocks. Le socle L1/SO existant est conservé ; cette tranche **documentaire** décrit l'adaptation vers sept ateliers et une publication globale. **Aucune migration ni implémentation du pipeline V3.4 dans ce commit.**

Commit : [54c7868c](https://github.com/gkerckhofs-a11y/gn-engine/commit/54c7868c3b2ed9222bdffb99077ef7a96925f968), parent 80c3a9c ; main vérifié 03eaace. Arbre distant/local identique `adef328dc7d9eed5cb7aed0d43a6e0cfcd9ed490`, package 0.37.0 inchangé.

- [Audit, matrice, graphe et plan de publication/rollback](https://github.com/gkerckhofs-a11y/gn-engine/blob/54c7868c3b2ed9222bdffb99077ef7a96925f968/docs/SO-00-V34-PLAN-CENTRAL.md).
- [Rapprochement des sept gabarits : 56 feuilles, 42 métier/références, zéro ligne métier](https://github.com/gkerckhofs-a11y/gn-engine/blob/54c7868c3b2ed9222bdffb99077ef7a96925f968/docs/SO-00-V34-GABARITS.md).
- Sources V3.4/vade-mecum et extraction des XLSX archivées, V0.7 inchangé. Le Markdown source est conservé octet pour octet, espaces de fin de ligne compris.
- Local : **793 tests applicatifs et build réussis**, Node 24.19.0. Sondes MemoryStore : les sept XLSX sont refusés par le lecteur actuel ; référence absente bloque ; objet+recette DRAFT possibles dans un lot historique ; deux requêtes de publication historiques produisent deux snapshots ; archive restaurée en copie sans toucher comptes/stock de la session témoin.
- Quatre Masters historiques identiques. Aucun fichier applicatif, workflow, dépendance, configuration Firebase ou marqueur de déploiement modifié.

**CI du commit 54c7868c : succès confirmé.** [Push 39959884384](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39959884384), job 120434915403, et [PR 39959889744](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39959889744), job 120434934407 : build + **793 applicatifs et 611 Firebase chacun**, zéro échec/annulé/ignoré/todo. Node 22.23.3 / Java 21.0.12+1. Fins de logs 13:38:19 / 13:40:30 UTC, 23 octobre. La PR teste la fusion virtuelle `05019f0050ed4af8359e8eac42d7c8ec83d85183`. Aucun artefact attaché au run push ; logs récupérés. Résultats de V3.4, distincts du nouveau commit V3.5.

Les 10 MST sont NON EXÉCUTÉS. Le test crucial M1/M4/M5 avec recette activée, M3 seul, deux MJ, rollback central et recette mobile restent à développer/exécuter. L'essai d'archive existant n'est pas une restauration complète Auth/Firestore/Storage. Le plan prévoit séparation seeds/imports, habilitations de campagne, validation globale et publication par préparation + bascule du pointeur pour les futurs épisodes.

**Validation du plan requise avant migration**, selon la demande utilisateur V3.4. PR conservée en brouillon. Aucune fusion ni production.

---

SPACE OUTLAWS V3.2 — candidat 0.37.0, sur branche uniquement. Le Master unique conserve ses six vues et tous les travaux L1/SO-06a/SO-01a. Il ajoute maintenant la préparation privée des recettes dans Boutiques, avec les ingrédients et produits du catalogue commun.

## SO-06b — Recettes & Potions en brouillon

- Créer, modifier, dupliquer, archiver et exporter les recettes par le circuit Master existant : aperçu, version, confirmation et historique. Les composants référencent les objets existants ; aucun catalogue d’ingrédients ni stock parallèle.
- Télécharger l’exemple adapté de `SO_Recettes.xlsx` : 10 ingrédients, 5 produits et 5 recettes en brouillon. Les 17 composants sont repris ; prix/formules proposés ne deviennent ni canon, ni cours, ni crédits. Aucune formule Excel exécutée.
- Export autonome des recettes et de leurs objets référencés ; intégration dans l’export global. Les définitions suivent versions, archives et campagnes. Les anciens Masters sans Recettes restent acceptés ; les quatre XLSX historiques sont inchangés.
- Publication **bloquée côté serveur**. Laboratoires actifs, déblocages, fabrication, doses et effets biologiques restent à développer avant d’autoriser une recette jouable. Les références préparatoires n’accordent aucun droit de jeu.

Commit : [80c3a9c](https://github.com/gkerckhofs-a11y/gn-engine/commit/80c3a9cbce56d4dd7661c1b57f2fb01b348a9888), parent `c5b18d7`, arbre `fcabd8683da865759268558821e8f162e11ad5a5` identique au checkout local testé.

[Audit V3.2, sources et guide de tranche](https://github.com/gkerckhofs-a11y/gn-engine/blob/80c3a9cbce56d4dd7661c1b57f2fb01b348a9888/docs/SO-06B-RECETTES-BROUILLONS.md) · [Matrice 24 + 6 + 5 recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/80c3a9cbce56d4dd7661c1b57f2fb01b348a9888/docs/MATRICE-SPACE-OUTLAWS-V3.md) · [Rapport global courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/80c3a9cbce56d4dd7661c1b57f2fb01b348a9888/docs/SO-VALIDATION.md) · [Sauvegarde/reprise et procédure de déploiement à faire valider](https://github.com/gkerckhofs-a11y/gn-engine/blob/80c3a9cbce56d4dd7661c1b57f2fb01b348a9888/docs/SO-SAUVEGARDE-DEPLOIEMENT.md).

### Validation du commit SO-06b

Local, 23 octobre 2026, Node 24.19.0 : **793 tests applicatifs réussis**, 0 échec/ignoré/annulé/todo ; **build réussi** ; `git diff --check` réussi. Logs versionnés dans `docs/verification/so-06b-*.log`. Quinze nouveaux cas : onze métier partagés mémoire/Firestore et quatre UI/contrat/contrôleur. REC-SO-REC-01 exécuté automatiquement ; REC-05 partiel (publication entièrement bloquée), REC-02/03/04 non exécutés. Les coupures/réessais simulés concernent l’import, pas une fabrication ni un réseau mobile réel.

**GitHub Actions de TEST : deux exécutions réussies**, chacune avec build + **793 tests applicatifs / 611 tests Firebase Emulator**, soit **1 404 tests par exécution**, sans échec, annulation, test ignoré ni TODO. Journaux complets vérifiés, Node **22.23.3**, Java **21.0.12+1**, Firestore/Auth/Storage du projet isolé `demo-gn-engine`.

| Exécution | Commit réellement contrôlé | Preuves | Fin des tests Firebase (UTC) |
|---|---|---|---|
| Push | `80c3a9cbce56d4dd7661c1b57f2fb01b348a9888` | [Run 39953481233](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39953481233), [job 120413450741](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39953481233/job/120413450741) | 23 octobre 2026, 12:50:01 |
| PR | `38156a3a8722b71fb77f2a9c02a272187a450e0d`, fusion virtuelle du HEAD `80c3a9c` avec main `03eaace` | [Run 39953486474](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39953486474), [job 120413467622](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39953486474/job/120413467622) | 23 octobre 2026, 12:48:35 |

Les **onze nouveaux cas SO-06b**, dont REC-SO-REC-01, ont réussi sur Firestore dans les deux jobs. Ces résultats complètent les champs CI en attente du guide et du rapport courant, conformément à AGENTS.md. Ils ne valident ni la fabrication, ni les effets, ni les recettes humaines.

Contrôle final : HEAD de PR inchangé, main `03eaace155b052d1b7d1960347746e9ee60ed514`, PR ouverte en brouillon et non fusionnée ; seuls les deux runs de `check.yml` ont été déclenchés pour ce SHA. La CI de main a également été reconfirmée verte ([39746169456](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39746169456)). Aucun déploiement.

### Limites et contrôle de production

Le produit complet reste non conforme à V3.2/V0.7. Profil canonique, XP, crédits protégés, PNJ FOR-01, combat spatial et autres écarts restent ouverts dans la matrice. Aucune des 24 recettes complètes, six FOR, recette humaine/mobile/charge ou restauration réelle n’est annoncée comme réussie. Aucun environnement de recette externe présumé disponible.

Pas de merge, pas de déploiement ni workflow de déploiement ; aucun changement de `.github/deploy-request.json`, configuration Firebase, IAM, DNS ou compte de production. `main` confirmé à `03eaace`. Le dernier déploiement observé dans Actions reste celui du 22 octobre (run 39731774273). Un ancien code ignorant `recipes` ne doit pas recopier/exporter une campagne contenant ces définitions : le retour arrière doit conserver cette collection.

---

## Historique des tranches précédentes

SPACE OUTLAWS V3.1/V0.7 est le référentiel courant. Le socle GN Engine et les travaux L1a–L1m, SO-00 et SO-06a sont conservés. Cette PR ajoute les natures de personnage et les restrictions de patient aux services de soins existants ; le Master à six vues conserve ses imports/exports.

### SO-01a — Natures et soins, candidat 0.37.0
Commit [c5b18d72](https://github.com/gkerckhofs-a11y/gn-engine/commit/c5b18d72713f1273dd7456607e44bc7d19a8531a), parent `133ea159e5574fdac9d05f759c8ae3e14700038f`, main vérifié `03eaace155b052d1b7d1960347746e9ee60ed514`.

- Lecture intégrale du cahier V3.1, du livre V0.7 et du prompt de reprise V3.1 ; sources, empreintes et reliquats éditoriaux documentés. A01–A38 et FOR-01 sont clos. Nom narratif Breach Port, sans renommer les IDs.
- Nature explicite humanoïde/droïde, publiée avec la fiche privée et conservée dans les versions, archives de définition et campagnes. Aucune nature déduite pour les anciens personnages. Pas de changement sur un personnage déjà créé en session.
- Patients admissibles configurés dans les soins temporisés et instantanés. Contrôle serveur avant réservation et à la résolution ; la nature du praticien ne limite pas son métier. Les protocoles historiques sans restriction gardent leurs règles.
- Éditeurs existants et trois colonnes Master facultatives, export/réimport XLSX. Conservation des reçus anciens et des profils déjà attribués ; une action engagée garde sa version.
- Aucune nouvelle collection ou donnée économique dupliquée. Quatre Masters binaires, workflows, demande de déploiement et configuration Firebase inchangés.

### Preuves de cette tranche
- Local Node **24.19.0** : **778 tests réussis**, 0 échec/ignoré/annulé ; build réussi. Logs dans `docs/verification/so-01a-*.log`.
- **13 nouveaux cas** : 10 métier partagés mémoire/Firestore, 3 UI. Droits, types invalides, anciennes données, XLSX/archive/campagne, patients inconnus/incompatibles, requêtes falsifiées, praticien droïde, concurrence, réessai et protocole figé.
- Arbre publié identique au checkout testé : `0a35b4e52b968fbc7eecf8aa173bf6a0d50b0cd2`.
- CI GitHub Actions de **TEST : deux exécutions réussies**, chacune avec build + **778 tests applicatifs / 600 tests Firebase Emulator**, soit **1 378 tests par exécution**, sans échec, annulation, test ignoré ni TODO. Journaux complets vérifiés ; Node **22.23.3**, Java **21.0.12+1**, Firestore/Auth/Storage du projet isolé `demo-gn-engine`.
  - Push : [run 39947200211](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39947200211), [job 120392640053](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39947200211/job/120392640053). Commit exact `c5b18d72713f1273dd7456607e44bc7d19a8531a`. Résultat Firebase : **23 octobre 2026 à 11:57:22 UTC**.
  - PR : [run 39947205368](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39947205368), [job 120392658467](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39947205368/job/120392658467). Commit de contrôle `656eac2111cf9d618678e064543ce616fd84be73`, fusion virtuelle de `c5b18d72713f1273dd7456607e44bc7d19a8531a` avec main `03eaace155b052d1b7d1960347746e9ee60ed514`. Résultat Firebase : **23 octobre 2026 à 11:51:01 UTC**.
- Les dix nouveaux cas métier SO-01a ont aussi réussi sur Firestore. Ces résultats complètent les champs CI en attente du guide SO-01a et du rapport courant, conformément à AGENTS.md ; ils ne valident pas les recettes humaines ou le référentiel complet.
- Contrôle final : main inchangé, PR ouverte en brouillon, aucun merge. Les deux runs observés pour ce SHA exécutent uniquement `.github/workflows/check.yml`. Aucun déploiement.

### Portée et limites
Ce sous-lot n'active pas un profil canonique incomplet. Huit classes/initiations fermées, XP participant, crédits protégés, kits, protection/stabilisation/mort/STOP, PNJ Force et pouvoirs, modules droïdes, chaîne spatiale, autorités/assurances et clôture A38 restent ouverts. Les soins instantanés historiques ne sont pas renommés soins V0.7.

Les **24 REC-SO + 6 REC-SO-FOR restent NON TESTÉES de bout en bout**. Les tests automatiques partiels ne valent pas recette humaine, mobile, terrain ou charge. Le produit n'est pas prêt pour une session réelle.

- [Guide SO-01a, référentiel et compatibilité](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-01A-NATURES-SOINS.md)
- [Matrice V3.1 et recettes](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/MATRICE-SPACE-OUTLAWS-V3.md)
- [Rapport de conformité courant](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-VALIDATION.md)
- [Sauvegarde/reprise et déploiement À FAIRE VALIDER](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-SAUVEGARDE-DEPLOIEMENT.md)

**Branche/PR en brouillon uniquement. Aucun merge ni déploiement ; aucune modification de production.**

<details>
<summary>Historique SO-00 / SO-06a et L0 / L1 — preuves liées à leurs anciens commits</summary>

SPACE OUTLAWS V3 devient le périmètre prioritaire, sur le socle et les travaux L1a–L1m conservés. Le propriétaire peut désormais exporter les catalogues des six vues dans un seul classeur lu à la même révision, puis le réimporter dans la destination existante avec aperçu et confirmation.

### SO-00 et SO-06a — candidat 0.37.0
Commit [133ea159](https://github.com/gkerckhofs-a11y/gn-engine/commit/133ea159e5574fdac9d05f759c8ae3e14700038f), base de tranche `16e1a194ecbd413d13966827e5c0bbc7bcaafb4c`, main vérifié `03eaace155b052d1b7d1960347746e9ee60ed514`.

- Lecture intégrale du V3.0, du livre V0.6 **FINAL** et du rapport de cohérence ; sources et provenance conservées. A01–A38 clos ; le créateur universel sort du périmètre.
- Audit des branches et de la CI, matrice existant/adapté/manquant/tests/migration, rattachement de L1 aux lots SO-00 à SO-06.
- Six vues V3, identifiants et collections inchangés. Export global par une transaction de lecture ; destination/campagne/révision communes. Les imports et exports ciblés historiques restent disponibles.
- Export réservé au propriétaire ; erreurs, incohérences et limites bloquent tout téléchargement. Réimport obsolète refusé, aperçu et confirmation obligatoires, acquis préservés.
- Aucun nouveau stockage métier, aucune migration. Quatre Masters XLSX historiques inchangés. Workflows, marqueur de déploiement et configuration/droits Firebase inchangés.

### Validation de la tranche
- Local Node **24.19.0** : **765 tests réussis**, aucun échec, annulé ou ignoré ; build réussi le 23 octobre 2026. Journaux dans `docs/verification/so-06a-*.log`.
- Huit nouveaux tests, dont quatre scénarios exécutés aussi par la suite Firebase : cohérence et aller-retour XLSX, droits et révision périmée, conservation des comptes/stock/profils/PV/carburant, import fermé après briefing. Contrôleur : téléchargement/réimport avec confirmation et réponses tardives abandonnées.
- CI GitHub Actions de **TEST** : **deux exécutions réussies**, chacune avec build + **765 tests applicatifs / 590 tests Firebase Emulator**, soit **1 355 tests par exécution**, sans échec, annulation ni test ignoré. Journaux vérifiés ; Node **22.23.3**, Java **21.0.12+1**, Firestore/Auth/Storage du projet isolé `demo-gn-engine`.
  - PR : [run 39940402074](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940402074), [job 120370132186](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940402074/job/120370132186). Commit de contrôle `05fd536230b3729a365fa008a7e47e119704d88e`, fusion virtuelle de `133ea159e5574fdac9d05f759c8ae3e14700038f` avec main `03eaace155b052d1b7d1960347746e9ee60ed514`. Résultat Firebase : **23 octobre 2026 à 10:53:45 UTC / 12:53:45 Europe/Brussels**.
  - Push : [run 39940395737](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940395737), [job 120370111434](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940395737/job/120370111434). Commit exact `133ea159e5574fdac9d05f759c8ae3e14700038f`. Résultat Firebase : **23 octobre 2026 à 11:00:11 UTC / 13:00:11 Europe/Brussels**.
- Ce résultat complète le champ CI en attente de `docs/SO-VALIDATION.md`, conformément à AGENTS.md. Il ne valide pas les 24 recettes métier V0.6 ni la recette humaine.
- Arbre Git publié identique à l'arbre local testé : `98ec3eaf46e3f197843295f8c7c761c900d4f056`.

### Limites et préparation à la mise en service
Le catalogue global exclut les dotations et métadonnées générales ; en session, les profils acquis et paramètres santé/monnaie sont exclus. Il ne constitue ni une sauvegarde, ni une copie autonome, ni le Master V0.6 complet. Limite existante de 250 lignes ; les exports ciblés restent disponibles.

Les règles V0.6 ne sont **pas** entièrement implémentées : progression/200 Cr protégés/mort, Rogues, modules droïdes, chaîne spatiale, autorités/assurance et reprise A38 restent ouverts. Les 24 REC-SO sont **NON TESTÉES de bout en bout** ; aucune recette humaine multi-comptes, Android/iOS, terrain ou charge à 60 utilisateurs n'est revendiquée. Le produit n'est pas prêt pour une session réelle.

### Documents de référence actuels
- [Audit SO-00 et tranche Master SO-06a](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-00-REPRISE.md)
- [Matrice V3, 24 recettes et 10 essais transversaux](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/MATRICE-SPACE-OUTLAWS-V3.md)
- [Rapport de conformité et anomalies](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-VALIDATION.md)
- [Sauvegarde/reprise et procédure de déploiement À FAIRE VALIDER](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/SO-SAUVEGARDE-DEPLOIEMENT.md)

**Branche/PR uniquement. Aucun merge ni déploiement. Procédure préparée, non exécutée.**

### Complément d'audit GitHub, après publication de la tranche
Lecture seule des 40 dernières exécutions, toutes branches, le 23 octobre 2026 :
- Dernier workflow de déploiement recensé : [39731774273](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39731774273), commit `d5334d8dfcb493421c9bd4efaf83c50eb56e373f`, succès le 22 octobre à 06:24:29 UTC ; métadonnées des jobs verify/deploy consultées, aucun lancement.
- CI du HEAD main `03eaace155b052d1b7d1960347746e9ee60ed514` : [39733876521](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39733876521), job `119674941780`, build + **648 applicatifs / 522 Firebase réussis**, journaux relus. Résultat Firebase le 22 octobre à 06:42:12 UTC. Ce n'est pas la CI du candidat.
- Inventaire Git des références de tags : liste vide. La réserve documentaire initiale « tags non inventoriés » est donc levée par ce contrôle complémentaire.
- Le nouveau HEAD déclenche deux exécutions `check.yml` uniquement : push [39940395737](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940395737) et PR [39940402074](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39940402074). Les deux exécutions ont réussi ; résultats et journaux détaillés ci-dessus.
- Aucun contrôle du contenu privé ou des comptes du site de production n'a été exécuté. Les constats ci-dessus portent sur les preuves GitHub.

<details>
<summary>Historique L0/L1 et preuves de CI — périmètres V2 remplacés par V3 en cas de conflit</summary>

Le cadrage V2 demande un atelier réutilisable, avec six modules et des Masters compatibles. Cette PR part du HEAD vérifié `03eaace155b052d1b7d1960347746e9ee60ed514` (0.36.0) ; elle ne recrée pas le moteur.

### Audit L0
- Cadrage joint conservé intégralement avec empreinte.
- État du code, des quatre Masters, des tests et du dernier déploiement consigné.
- Matrice de **119 exigences + 27 recettes**, distinguant [V], [P], [A], existant et travaux futurs.
- Architecture réutilisée, risques, dépendances et périmètre complet de L1 documentés.

### Tranche L1a — candidat 0.37.0
- Six cartes/sections : Personnages, Communication, Magasins, Spatioport, Économie/Stockage, Informations/Fouilles.
- Imports limités au module choisi et à ses paramètres, contrôle serveur de Meta.module et des références.
- Master Tarifs : création/modification/archivage en ligne, aperçu/confirmation communs, export XLSX de la destination et réimport.
- Identité du nouveau tarif et prochaine version fournies par le serveur.
- États joués conservés ; aucune nouvelle collection métier.
- **Quatre XLSX historiques inchangés byte pour byte.**

### Contrôles exécutés
- Socle : build et 648 tests locaux réussis.
- Candidat : build et **661 tests locaux réussis**, sans échec/ignoré/annulé, Node 24.19.0.
- Compatibilité des Masters, empreintes source/XLSX, liens documentaires et diff contrôlés.
- CI Node 22 / Java 21 : **compilation réussie, 661 tests applicatifs et 529 tests Firebase réussis**, soit **1 190 tests**, sans échec, annulation ni test ignoré. [Exécution 39750792151](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39750792151), job `119730552170`, résultat Firebase obtenu le 22 octobre 2026 à **11:06:32 (Europe/Brussels)**. Validation du commit source `9b822955478456259e536b07570bdef0e439e1d0` dans la PR.
- Vérification de reprise : build et 661 tests locaux relancés avec succès ; 119 exigences et 27 recettes présentes dans la matrice, liens source valides ; empreintes des quatre XLSX et du cadrage joint inchangées.
- Seul l’accueil public 0.36.0 a été relu dans le navigateur. **Aucune recette privée sur téléphones, ouverture Excel/LibreOffice ou charge réelle à 60 joueurs n’est déclarée exécutée.**

### Limites
L1 reste ouvert : export/édition homogènes des autres feuilles, Univers, comparateur et historique consolidé. Boutiques, rendez-vous, passagers, achats de vaisseaux, interceptions, combats, butin et réparation sont des lots ultérieurs. Aucun barème Outcasts n’est imposé.

### Documents
- [Audit L0](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/AUDIT-V2-L0.md)
- [Matrice V2](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/MATRICE-V2.md)
- [L1 complet et tranche L1a](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1-ATELIER-MODULAIRE.md)
- [Validation et recette manuelle](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/VALIDATION-0.37.md)

Commit source : 9b822955478456259e536b07570bdef0e439e1d0.

**Branche/PR uniquement. Aucune fusion, publication, modification de droits Firebase, règle, index, workflow ou demande de déploiement.**

### Stratégie de développement du 22 octobre 2026

Consignes enregistrées dans [AGENTS.md](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/AGENTS.md), commit [77a9b65](https://github.com/gkerckhofs-a11y/gn-engine/commit/77a9b65d41eb394fc1193a07332810f95d397d9d). Ce commit ne modifie que la documentation : aucun code, Master, workflow ou fichier de demande de déploiement n’est modifié.

Travail sur branche, commit par ensemble fonctionnel validé, CI avec émulateurs et correction des régressions avant le lot suivant. Recette finale isolée, rapport global et procédure de déploiement à préparer avant toute demande de mise en production. Aucune publication autorisée par cette stratégie.

La [CI du commit documentaire 77a9b65](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39753654211) a réussi : build, 661 tests applicatifs et 529 tests Firebase, sans échec ni test ignoré. Journaux du job `119740120705` vérifiés ; résultat Firebase le 22 octobre 2026 à 11:29:09 Europe/Brussels. Cette validation a été vérifiée avant de développer L1b.

### L1b — six premiers éditeurs et exports ciblés

Commit [137aee0](https://github.com/gkerckhofs-a11y/gn-engine/commit/137aee08609b41d0b53b03602eb8541ea4891e8e).

L’organisateur peut désormais gérer un premier contenu dans chacun des six modules : fiches personnages, objectifs, objets, routes, entrepôts et connaissances. Recherche, filtre, consultation, création, modification, duplication en brouillon et export des fiches affichées passent par les collections et les contrôles d’import existants. L’aperçu permet de revenir corriger les champs et le motif avant confirmation.

Les exports sont limités aux feuilles annoncées ; les autres feuilles de L1 restent à compléter. La duplication ne copie ni crédits ni stocks ; les champs acquis et les états joués sont exclus. Les quatre XLSX historiques, workflows et droits Firebase restent inchangés.

- Local : build réussi, **672 tests applicatifs réussis**, aucun échec/ignoré/annulé, Node 24.19.0.
- Sept nouveaux scénarios partagés mémoire/Firestore et quatre nouveaux tests de rendu/contrôleur.
- CI du commit **137aee08609b41d0b53b03602eb8541ea4891e8e** : **compilation, 672 tests applicatifs et 536 tests avec les émulateurs Firebase réussis**, soit **1 208 tests**, sans échec, annulation ni test ignoré. Node 22 / Java 21. [Exécution 39757464136](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39757464136), [job 119752999043](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39757464136/job/119752999043). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 11:58:45 Europe/Brussels (09:58:45 UTC)**.
- Recette humaine, ouverture Excel/LibreOffice, smartphones et charge réelle : non exécutées.

[Guide L1b, périmètre et validation](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1B-EDITEURS-MODULAIRES.md). Aucune fusion ou publication.

### L1c — catalogues Compétences, Classes et Groupes

Commit [2c86ea8](https://github.com/gkerckhofs-a11y/gn-engine/commit/2c86ea8e36c76db9f77e34ca46b9430518e9955e).

Le module Personnages propose maintenant le choix entre ses fiches, compétences, classes et groupes. Les trois nouvelles feuilles réutilisent recherche, filtre, aperçu/confirmation, duplication, archivage et export ciblé. Les classes disposent d’une sélection de compétences avec niveau explicite ; les soins affichent seulement leurs paramètres applicables, en conservant la saisie et le motif lors d’un changement de choix.

Les profils attribués et usages de soins, les membres/droits, les caisses et stocks restent conservés. Un groupe dupliqué est secret, en brouillon, sans membre ni caisse. Les exports portent sur une seule feuille annoncée. Le contrat et les quatre XLSX, les workflows, les droits/règles Firebase et la demande de déploiement sont inchangés.

- Local : compilation et **681 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node 24.19.0.
- Six nouveaux scénarios partagés mémoire/Firestore ; trois nouveaux tests de rendu/contrôleur.
- CI du commit **2c86ea8e36c76db9f77e34ca46b9430518e9955e** : **compilation, 681 tests applicatifs et 542 tests avec les émulateurs Firebase réussis**, soit **1 223 tests**, sans échec, annulation ni test ignoré. Node 22 / Java 21. [Exécution 39762325938](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39762325938), [job 119769271745](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39762325938/job/119769271745). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 12:40:17 Europe/Brussels (10:40:17 UTC)**.
- Recette humaine, Excel/LibreOffice, téléphones et charge réelle : non exécutés.

[Guide L1c et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1C-CATALOGUES-PERSONNAGES.md). L1 reste ouvert : autres feuilles, paramètres, exports complets, comparateur et historiques consolidés. Aucune fusion ni publication.

### L1d — Vaisseaux, Cours et Événements économiques

Commit [a712e50](https://github.com/gkerckhofs-a11y/gn-engine/commit/a712e5076e3f322d858772e1bfb2f73c63916bea).

Trois nouvelles feuilles sont accessibles dans les modules Spatioport et Économie / Stockage. Références guidées, consultation, édition, archivage et export ciblé réutilisent les collections et imports existants. Un cours garde l’identité de son objet et ne peut pas être dupliqué. Les événements adaptent leurs champs à la cible et au déclencheur ; les effets devenus incompatibles sont retirés dans le même import.

Les vaisseaux de session conservent leur cargaison, carburant et position. La première activation de navigation exige des valeurs explicites ; dupliquer un vaisseau demande une nouvelle initialisation et ne copie aucun stock. Les refus de capacité, changement de propriétaire d’une soute chargée et trajet en cours restent ceux du moteur. Aucun nouveau barème Outcasts, modèle de vaisseau commercial ou système de combat.

- Local : compilation et **692 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node 24.19.0.
- Sept nouveaux scénarios partagés mémoire/Firestore ; quatre nouveaux tests de rendu/contrôleur.
- CI du commit **a712e5076e3f322d858772e1bfb2f73c63916bea** : **compilation, 692 tests applicatifs et 549 tests avec les émulateurs Firebase réussis**, soit **1 241 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21**. [Exécution 39773686257](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39773686257), [job 119807206432](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39773686257/job/119807206432). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 14:10:33 Europe/Brussels (12:10:33 UTC)**.
- Les quatre XLSX historiques conservent leurs empreintes. Aucun changement des workflows, de la demande de déploiement ou des droits/règles Firebase.
- Recette humaine, Excel/LibreOffice, téléphones et charge réelle : non exécutés.

[Guide L1d et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1D-VAISSEAUX-ECONOMIE.md). Treize éditeurs en ligne ; L1 reste ouvert pour les autres feuilles, paramètres, exports complets, comparateur et historiques. Aucune fusion ni publication.

### L1e — Relations et membres des groupes

Commit [4646c5a](https://github.com/gkerckhofs-a11y/gn-engine/commit/4646c5abb57380bbdc5831ddbd7ba56206810d0e).

Le module Personnages ajoute les feuilles Relations et Membres. Recherche, édition, dépublication/désactivation et export ciblé passent par l’aperçu et la confirmation des imports existants. Les relations ne deviennent pas réciproques automatiquement ; leur duplication reste non publiée. Les appartenances ne se dupliquent pas : groupe et personnage sont choisis explicitement et restent verrouillés après création.

Les droits de jeu sont présentés par cases, toutes décochées à la création. Les identifiants des membres importés sont retrouvés dans leurs reçus ; une appartenance issue des anciens outils reçoit une identité stable côté serveur. Les historiques ambigus sont signalés sans renommage et bloquent l’éditeur/export concerné. Profils acquis, caisses, stocks et messages sont conservés ; la continuité des identifiants et réglages dans l’épisode suivant est testée.

- Local : compilation et **702 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node 24.19.0.
- Six nouveaux scénarios partagés mémoire/Firestore ; quatre nouveaux tests de rendu/contrôleur.
- CI de la PR pour le commit **4646c5abb57380bbdc5831ddbd7ba56206810d0e** : **compilation, 702 tests applicatifs et 555 tests avec les émulateurs Firebase réussis**, soit **1 257 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39779188266](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39779188266), [job 119825752497](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39779188266/job/119825752497). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 14:51:19 Europe/Brussels (12:51:19 UTC)**. GitHub a testé sa référence de fusion virtuelle `cfb69c8`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Copie récente du cadrage comparée au fichier du dépôt : octets identiques. Quatre XLSX historiques inchangés.
- Aucun changement des workflows, de la demande de déploiement, des droits/règles Firebase ou des accès privés.
- Recette humaine, Excel/LibreOffice, téléphones et charge réelle : non exécutés.

[Guide L1e et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1E-RELATIONS-MEMBRES.md). Quinze feuilles éditables ; L1 reste ouvert. Prochaine tranche prévue : parcours groupé Lieux / ActionsTerrain / Recompenses, dont la création doit rester atomique. Aucune fusion ni publication.


### L1f — Lieux, actions et récompenses groupés

Commit [a6ad693](https://github.com/gkerckhofs-a11y/gn-engine/commit/a6ad693915f65519b3caa67265c961a53b6b6504).

Informations / Fouilles propose un formulaire commun pour Lieux, ActionsTerrain et Recompenses : une fouille avec son action et ses récompenses, ou une installation avec sabotage et réparation. Création, modification, duplication en brouillon, archivage et export filtré utilisent l’aperçu et la confirmation des imports existants. Ajouts et retraits de récompenses restent dans le brouillon jusqu’à confirmation.

Les identifiants historiques des actions sont repris ; les ambiguïtés bloquent le parcours sans renommage. Une duplication copie les définitions initiales avec de nouvelles identités, sans copier les états joués. En session, les récompenses existantes restent en lecture seule et les modifications du formulaire ne reconstituent aucun stock. Les tests couvrent également le passage à l’épisode suivant, la concurrence et le réessai.

- Local : compilation et **713 tests applicatifs réussis**, aucun échec, annulation ou test ignoré, Node **24.19.0**.
- Sept nouveaux scénarios partagés mémoire/Firestore ; trois nouveaux tests de rendu/brouillon et un test de contrôleur.
- CI de la PR pour le commit **a6ad693915f65519b3caa67265c961a53b6b6504** : **compilation, 713 tests applicatifs et 562 tests avec les émulateurs Firebase réussis**, soit **1 275 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39788791616](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39788791616), [job 119858956886](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39788791616/job/119858956886). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 15:58:48 Europe/Brussels (13:58:48 UTC)**. GitHub a testé sa référence de fusion virtuelle `4e45f2ec87ff8f8b6951eff1b50a671b2511e61a`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Les quatre Masters XLSX historiques conservent leurs empreintes. Aucun changement de workflow, de demande de déploiement, de règle/droit Firebase ou d’accès privé.
- Aucun barème Outcasts fixé. Les plafonds existants du moteur restent ceux du contrat.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1f et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1F-TERRAIN-GROUPE.md). Seize parcours couvrent dix-huit feuilles ; L1 reste ouvert. L’export groupé contient seulement les lieux affichés et leurs lignes filles ; leurs catalogues externes doivent déjà exister. Attributions, Dotations, Interactions, paramètres, exports complets et historiques consolidés restent à compléter. Aucune fusion ni publication.


### L1g — Interactions personnages

Commit [5bfc80d](https://github.com/gkerckhofs-a11y/gn-engine/commit/5bfc80ddc0cdad1b391582d6c4079466e64d1c7b).

Le module Personnages permet de gérer les cinq profils existants de soins et de fouille (FIELD_CARE, CLINIC_SAFE, CLINIC_FAST, LOOT_COMMON, LOOT_METHODICAL). Champs conditionnels, prérequis guidés, aperçu/confirmation, duplication en brouillon, archivage et export ciblé réutilisent personProfiles et les imports existants. Les valeurs de jeu actives sont saisies explicitement ; aucun nouveau barème Outcasts.

Les transitions de type retirent les consommables devenus incompatibles. Profils, crédits, inventaires, historiques et continuité entre épisodes sont conservés. Aucun changement d’accès privé, de workflow, de demande de déploiement ou de règle/droit Firebase ; les quatre Masters historiques sont inchangés.

- Local : compilation et **720 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**.
- Quatre nouveaux scénarios partagés mémoire/Firestore et trois tests de rendu/brouillon/contrôleur.
- CI de la PR pour le commit **5bfc80ddc0cdad1b391582d6c4079466e64d1c7b** : **compilation, 720 tests applicatifs et 566 tests avec les émulateurs Firebase réussis**, soit **1 286 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39793367955](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39793367955), [job 119874639014](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39793367955/job/119874639014). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 16:25:34 Europe/Brussels (14:25:34 UTC)**. GitHub a testé sa référence de fusion virtuelle `92b4fff41fc914efd7b15e291cd70a54c835797c`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1g et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1G-INTERACTIONS.md). Dix-sept parcours couvrent dix-neuf feuilles ; L1 reste ouvert. L’export contient Meta et Interactions, avec références externes préexistantes. Attributions et Dotations demandent un parcours groupé de création de personnage pour préserver les contraintes des imports ; elles constituent la prochaine tranche prévue. Paramètres, exports complets et historiques consolidés restent à compléter. Aucune fusion ni publication.


### L1h — Création groupée de personnage

Commit [e75408f](https://github.com/gkerckhofs-a11y/gn-engine/commit/e75408fa3c17aba30ad235ca454343b7f8046601).

Le formulaire de création Personnages propose une classe publiée, des ajustements de compétences et des dotations initiales explicitement choisies. Personnages, Attributions et Dotations passent ensemble dans l’aperçu puis une confirmation unique des imports existants. Les choix et le motif restent présents au retour depuis l’aperçu. Les valeurs de jeu ne sont pas imposées.

Les champs sont réservés à la création. Modifier ou archiver une fiche ne redistribue rien ; dupliquer ne copie automatiquement ni profil ni dotation. Les comptes, stocks, PV et compétences acquis sont conservés dans la session et l’épisode suivant. Aucune nouvelle collection ou modification des règles d’import.

- Local : compilation et **727 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**.
- Quatre nouveaux scénarios partagés mémoire/Firestore ; deux tests de rendu/sérialisation et un test de contrôleur.
- CI de la PR pour le commit **e75408fa3c17aba30ad235ca454343b7f8046601** : **compilation, 727 tests applicatifs et 570 tests avec les émulateurs Firebase réussis**, soit **1 297 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39802725928](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39802725928), [job 119907611443](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39802725928/job/119907611443). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 17:33:05 Europe/Brussels (15:33:05 UTC)**. GitHub a testé sa référence de fusion virtuelle `1ba5238baba21117fdcc76fc15475dfbd139c4f2`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Les quatre Masters historiques gardent leurs empreintes. Aucun changement des workflows, de la demande de déploiement, des règles/indexes/droits Firebase ou des accès privés.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1h et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1H-CREATION-PERSONNAGE.md). Dix-sept parcours couvrent dix-neuf feuilles en édition/export ciblé, avec maintenant la création groupée d’Attributions et Dotations. L’export de la liste reste Meta + Personnages, sans acquis. Édition/export des attributions de scénario, restitution des dotations initiales sans redistribution, paramètres, exports complets, dépendances et historiques restent ouverts. L1 n’est pas déclaré terminé. Aucune fusion ni publication.


### L1i — Attributions du scénario

Commit [b153ec0](https://github.com/gkerckhofs-a11y/gn-engine/commit/b153ec06572cc4169e92d594eaf2e5609c048055).

Personnages propose les attributions de scénario : consultation, création sur une fiche sans profil, édition de classe/compétences, dépublication/réactivation et export filtré Meta + Attributions. Le personnage reste verrouillé ; aucune duplication. Aperçu et confirmation réutilisent les imports existants. Confirmer recalcule le profil à partir des catalogues actuels : les différences sont présentées avant écriture.

Les reçus historiques fournissent identifiants et versions. Un profil sans reçu reçoit une identité déterministe ; ambiguïtés et choix non représentables (notamment les retraits au niveau zéro) bloquent ce parcours sans renommage. Les outils dédiés restent disponibles. Cette feuille est réservée aux scénarios, y compris côté serveur ; les profils acquis des sessions sont conservés.

- Local : compilation et **732 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**.
- Quatre nouveaux scénarios partagés mémoire/Firestore et un test de formulaire ; concurrence, réessai, permissions, conservation d’une session et identités historiques couverts.
- CI de la PR pour le commit **b153ec06572cc4169e92d594eaf2e5609c048055** : **compilation, 732 tests applicatifs et 574 tests avec les émulateurs Firebase réussis**, soit **1 306 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39807496624](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39807496624), [job 119924513970](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39807496624/job/119924513970). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 17:58:36 Europe/Brussels (15:58:36 UTC)**. GitHub a testé sa référence de fusion virtuelle `e4a0af1a7702b0dee0f67af98e60002c85763696`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Quatre Masters historiques inchangés. Aucun changement de workflow, demande de déploiement, règle/index/droit Firebase ou accès privé.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1i et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1I-ATTRIBUTIONS-SCENARIO.md). Dix-huit parcours couvrent vingt feuilles, Attributions en scénario seulement. Dotations reste disponible en création groupée ; sa restitution, les paramètres, exports complets, dépendances et historiques restent ouverts. L1 n’est pas terminé. Aucune fusion ni publication.


### L1j — Paramètres modulaires

Commit [a0d4741](https://github.com/gkerckhofs-a11y/gn-engine/commit/a0d47413498ab53b101c7a52dc770f48cac82657).

Les Masters Personnages, Économie/Stockage et Spatioport proposent leurs paramètres existants : PA, santé de scénario, groupes de session, monnaie de scénario et port local. Consultation, modification, retour depuis aperçu, confirmation et export Meta + Parametres réutilisent les imports existants. Une première configuration exige des valeurs explicites ; aucun barème Outcasts ajouté.

Les restrictions de destination restent celles du moteur. Santé et monnaie de session conservent leurs outils MJ dédiés ; après préparation initiale, lecture/export seulement. Les ressources détenues et les réglages hors contrat Master sont conservés. Les paramètres définissent les règles futures, sans réécrire les stocks, soldes ou positions des vaisseaux.

- Local : compilation et **739 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**.
- Quatre nouveaux scénarios partagés mémoire/Firestore ; deux tests de formulaire et un test de contrôleur.
- CI de la PR pour le commit **a0d47413498ab53b101c7a52dc770f48cac82657** : **compilation, 739 tests applicatifs et 578 tests avec les émulateurs Firebase réussis**, soit **1 317 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39817778154](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39817778154), [job 119960685512](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39817778154/job/119960685512). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 19:11:45 Europe/Brussels (17:11:45 UTC)**. GitHub a testé sa référence de fusion virtuelle `2caeb40ed638a82c07709a24b5cd90faea108df7`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Empreintes des quatre Masters inchangées. Aucun changement des workflows, de la demande de déploiement, des règles/indexes/droits Firebase ou des accès privés.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1j et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1J-PARAMETRES-MODULAIRES.md). Vingt et un parcours couvrent vingt et une feuilles distinctes ; les trois formulaires utilisent la feuille Parametres commune. Dotations initiales à restituer, exports complets, dépendances, comparateur et historiques restent ouverts. Les métadonnées générales et options hors contrat gardent leurs outils existants. L1 n’est pas terminé. Aucune fusion ni publication.


### L1k — Relevé des dotations de départ

Commit [b969765](https://github.com/gkerckhofs-a11y/gn-engine/commit/b96976513a3ae706afd0cb97de80f3a1d65dc2c2).

Personnages propose un relevé en lecture seule des crédits et objets de départ enregistrés, avec recherche, filtre et export XLSX. Les définitions viennent directement des personnages de la destination, sans lire les comptes ou stocks acquis. Absence de réglage, zéro explicite et inventaire vide sont distingués. Consultation possible après lancement et dans les épisodes suivants, sans redistribution.

Les réglages étant agrégés et modifiables par les outils de préparation existants, le relevé ne prétend pas restituer les lignes des imports historiques. Son classeur Notice / Releve / ObjetsDepart est explicitement non réimportable comme Master. Aucun identifiant historique inventé. La création groupée L1h et les outils de préparation existants sont conservés.

- Local : compilation et **745 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**.
- Trois nouveaux scénarios partagés mémoire/Firestore ; deux tests d’interface/export et un test de contrôleur.
- CI de la PR pour le commit **b96976513a3ae706afd0cb97de80f3a1d65dc2c2** : **compilation, 745 tests applicatifs et 581 tests avec les émulateurs Firebase réussis**, soit **1 326 tests**, sans échec, annulation ni test ignoré. Node **22.23.4** / Java **21.0.12+1** (Temurin). [Exécution 39826233380](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39826233380), [job 119990132800](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39826233380/job/119990132800). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 20:10:16 Europe/Brussels (18:10:16 UTC)**. GitHub a testé sa référence de fusion virtuelle `a1a48190486cee84a75824e26d51ee4dd68cfe9e`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Empreintes des quatre Masters inchangées. Aucun changement des workflows, de la demande de déploiement, des règles/indexes/droits Firebase ou des accès privés.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1k et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1K-RELEVE-DOTATIONS.md). Les vingt et un parcours précédents sont complétés par un relevé, sans nouveau parcours d’édition. L’export Master complet des dotations reste ouvert, ainsi que les exports complets des modules, dépendances, comparateur et historiques. L1 n’est pas terminé. Aucune fusion ni publication.


### L1l — Exports groupés par module

Commit [265a387](https://github.com/gkerckhofs-a11y/gn-engine/commit/265a38713a77be7d2d78aa94cee2c4ef8fb67cd5).

Les exports individuels obligeaient à télécharger chaque feuille séparément. Chaque module propose désormais un classeur réunissant ses feuilles exportables, préparées dans une seule transaction de lecture. Un écran présente destination, révision, nombres de lignes et exclusions avant téléchargement. Les archives sont conservées ; les filtres de la liste ne limitent pas cet export groupé.

Dotations séparées, Attributions acquises et paramètres de santé/monnaie de session exclus. Les références externes doivent déjà exister. Ce classeur concerne la destination existante et ne constitue pas une copie autonome du scénario. Les contrôles d’import, aperçu, confirmation et idempotence restent communs ; une ambiguïté bloque le téléchargement entier. Limite de 250 lignes, avec recours aux exports filtrés par feuille.

- Local : compilation et **752 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**.
- Trois nouveaux scénarios partagés mémoire/Firestore ; deux tests d’interface/assemblage et deux tests de contrôleur.
- CI de la PR pour le commit **265a38713a77be7d2d78aa94cee2c4ef8fb67cd5** : **compilation, 752 tests applicatifs et 584 tests avec les émulateurs Firebase réussis**, soit **1 336 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1** (Temurin). [Exécution 39849604751](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39849604751), [job 120071918860](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39849604751/job/120071918860). Journaux vérifiés ; résultat Firebase obtenu le **22 octobre 2026 à 22:51:58 Europe/Brussels (20:51:58 UTC)**. GitHub a testé sa référence de fusion virtuelle `a644bc408259b53b10dd5f726ae6c99c2c48378c`, constituée de ce HEAD et de `main` (`03eaace`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`.
- Empreintes des quatre Masters inchangées. Aucun changement des workflows, de la demande de déploiement, des règles/indexes/droits Firebase ou des accès privés.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1l et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1L-EXPORTS-GROUPES.md). Export Master complet des dotations, dépendances détaillées, comparateur et historiques consolidés restent ouverts. L1 n’est pas terminé. Aucune fusion ni publication.


### L1m — Références des exports modulaires

Commit [16e1a19](https://github.com/gkerckhofs-a11y/gn-engine/commit/16e1a194ecbd413d13966827e5c0bbc7bcaafb4c).

La préparation d’un export groupé affiche désormais ses références de catalogue internes et externes : feuille/ligne/colonne source, cible, module, présence dans la destination et inclusion dans le classeur. L’index est issu des catalogues lus dans la même transaction et ne contient que les identifiants et indicateurs d’archivage.

Ce constat informatif distingue présente, archivée, absente et non vérifiée. Il ne remplace pas l’aperçu d’import ni ses règles métier, et ne bloque pas à lui seul le téléchargement. Médias, codes de ports, paramètres, dépendances indirectes et champs absents des exports restent hors couverture. Aucun changement du XLSX ou des validateurs d’import.

- Local : compilation et **757 tests applicatifs réussis**, sans échec, annulation ni test ignoré, Node **24.19.0**, le 23 octobre 2026.
- Deux nouveaux scénarios partagés mémoire/Firestore ; trois tests d’analyse/interface.
- CI de la PR pour le commit **16e1a194ecbd413d13966827e5c0bbc7bcaafb4c** : **compilation, 757 tests applicatifs et 586 tests avec les émulateurs Firebase réussis**, soit **1 343 tests**, sans échec, annulation ni test ignoré. Node **22.23.3** / Java **21.0.12+1**. [Exécution 39911044989](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39911044989), [job 120273881441](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39911044989/job/120273881441). Journaux vérifiés ; résultat Firebase obtenu le **23 octobre 2026 à 08:42:06 Europe/Brussels (06:42:06 UTC)**. GitHub a testé sa référence de fusion virtuelle `d720692911b66f7c25c9dc5580052d80c15b9d90`, constituée de ce HEAD et de `main` (`03eaace155b052d1b7d1960347746e9ee60ed514`) ; aucune fusion réelle n’a été effectuée. Les émulateurs utilisent le projet isolé `demo-gn-engine`. Recette humaine non exécutée ; aucun déploiement.
- Empreintes des quatre Masters inchangées. Aucun changement des workflows, de la demande de déploiement, des règles/indexes/droits Firebase ou des accès privés.
- Recette humaine, Excel/LibreOffice, Android/iOS et charge réelle : non exécutés.

[Guide L1m et limites](https://github.com/gkerckhofs-a11y/gn-engine/blob/work/l1-modular-workshop/docs/L1M-DEPENDANCES-MASTERS.md). Export Master complet des dotations, dépendances indirectes, comparateur et historiques consolidés restent ouverts. L1 n’est pas terminé. Aucune fusion ni publication.

</details>

</details>
