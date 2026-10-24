# C1e — Fiches narratives dans le brouillon central M2

24 octobre 2026. Candidat 0.37.0, branche de livraison `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Tranche additive C1, limitée aux nouvelles préparations C1a sans scénario ni version publiée. Aucun déploiement ou changement de données de production.

## Base et références vérifiées

Main distant : `03eaace155b052d1b7d1960347746e9ee60ed514`. Branche et PR ouverte en brouillon : C1d `6df260644d49dab4ccee47a703fb8e4a5608ffc7`, arbre `2296394bd6bfcd49a743b9cdfd428e23634dec53`, identique au checkout local `bb9afb1e46c8d309d5f6d7788c70065071fdaf56`. Les deux CI C1d sont terminées avec succès : [push 40077778620](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40077778620), job 120824777783 ; [PR 40077782580](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40077782580), job 120824789230. Chacune : build, 933 tests applicatifs et 733 Firebase réussis, aucun échec/annulé/ignoré/todo. [Description et preuves C1d conservées](PR-1-HISTORIQUE-AVANT-C1E.md).

Sources : [CDC V3.5 §§3.4–3.8, 4.7–4.11](source/SO_CDC_V35.md), [règles V0.7](source/SO_Regles_V07.txt), [vade-mecum](source/SO_Vademecum_V01.txt), [rapprochement M2 des gabarits](SO-00-V34-GABARITS.md), [ordre C1/C2 puis I3/I4](SO-00-V35-INSCRIPTIONS.md), [plan central](SO-00-V34-PLAN-CENTRAL.md). Cette tranche complète l'édition web M2 prévue dans C1 ; elle ne transforme pas une candidature approuvée en personnage ni ne met en œuvre la naissance.

## Parcours disponible

1. Le propriétaire ouvre M2, ou délègue explicitement sa lecture/édition à un compte de campagne. Une délégation existante M1/M4 ne reçoit pas M2 automatiquement.
2. Créer une fiche à ID stable : nom d'affichage, profession/couverture descriptive, nature humanoïde/droïde ou à préciser, description publique préparée, biographie, consignes, secrets fictifs et notes organisateurs.
3. Ajouter des objectifs narratifs et leurs étapes, ainsi que des relations orientées. Chaque élément garde un ID stable. Une relation peut utiliser un alias, pointer un autre personnage M2 ou rester un contact libre sans cible technique. Aucun message ni relation inverse n'est créé.
4. La cible peut être préparée ultérieurement dans le même brouillon. Le diagnostic indique la fiche, l'ID de relation, le champ, la référence absente/archivée et la correction. La création ou restauration de la cible actualise le rapport sans réécrire la fiche source. Les cycles narratifs entre deux personnages sont autorisés, sans mécanisme d'exécution.
5. Modifier, archiver ou restaurer conserve l'avant/après, auteur, date, motif, source WEB, ID de commande, révision globale et révision native du contenu. L'archivage conserve la fiche ; les relations actives qui la visent sont signalées. Une réponse perdue retrouve le reçu ; une édition concurrente exige un rechargement.

Les textes restent privés pour les personnes habilitées à consulter M2. Le catalogue narratif des espèces reste visible dans le même atelier, sans copie, mais sa modification conserve les droits distincts du parcours d'admission. Les objectifs sont descriptifs, sans validation ni récompense automatique.

## Réutilisation et frontières

| Élément | Contrat de C1e | Limite explicite |
|---|---|---|
| Fiche native | Extraction sans changement de sémantique de `characterInput` vers `src/core/character-state.mjs`, utilisée aussi par les anciens éditeurs | Aucune réécriture des personnages historiques ni adaptation implicite de leur nature |
| Changement central | `masterDrafts/initial/changes/character_{id}` ; `type=character`, `workshop=M2` | Même brouillon/révision que M1, M4 et le catalogue I1 |
| Révision de fiche | `data.contentRevision` natif ; entrée/sortie API `characterRevision` | Pas de second compteur `data.revision` inventé |
| Nature | `HUMANOID`, `DROID` ou `null` avec diagnostic | Pas de compétence, bonus ou profil canonique attribué |
| Narration | `narrativeInput` existant : objectifs, étapes et relations | Publication des éléments forcée à false ; champs de publication injectés refusés |
| Publication | Fiche et identité publique en DRAFT, `masterArchived` cohérent | Aucun badge ou accès joueur ; intention de visibilité et activation centrale à raccorder |
| Données de session | Aucune écriture dans `sessions/{sid}/characters` ou registrations | Aucun UID joueur, compte, kit, crédit, PA, XP, PV initialisé ou connaissance distribuée |
| Références | Projection transactionnelle des seuls changements M2 du brouillon courant | Aucun recours aux instances, admissions ou autres campagnes pour résoudre un nom/ID |
| Catalogue des espèces | `speciesCatalogue_player` I1 conservé | Pas de modification via l'API de fiche, pas de rattachement implicite de proposition I3 |
| Habilitations | Édition M2 exige lecture M2 ; rôle de session distinct | MJ/Accueil de session sans droit central implicite ; M2 seul n'ouvre pas les admissions |

Les structures civiles, profils/Force/classes, ressources, médias, champs de publication et autres clés étrangères sont refusés. Le texte libre reste du texte échappé : il n'est pas interprété comme règle. Les dossiers et liens d'admission ne sont pas copiés dans M2. Les projections de référence ne contiennent que nom, ID, nature, état, source et révision, jamais biographie ou notes.

Le rapport M2 ne certifie que ses vérifications locales de nature et de relations ; `publicationAvailable=false`. L'archivage d'une définition encore utilisée est une préparation à corriger, pas une suppression de personnage joué. C2 devra refuser une activation incohérente à l'échelle de tous les ateliers.

## Limites techniques et confidentialité

- 100 fiches narratives par préparation, archives comprises ; 96 Kio de contenu JSON par fiche. Ce sont des bornes de cette tranche, pas des règles canoniques ni une mesure de charge.
- Limites natives : 60 objectifs, 60 relations et 40 étapes par objectif ; IDs uniques dans chaque liste. Auto-relation refusée. Le budget global de contenu s'applique aussi aux listes imbriquées ; aucune troncature silencieuse.
- L'autorité actuelle et le cycle initial sont vérifiés avant le reçu d'opération. Deux ateliers partageant la même révision ne peuvent écraser leurs changements.
- L'historique affiché M2 filtre le type métier et projette une liste blanche de champs, même si un ancien événement de politique porte un marqueur M2 ; les historiques de politique d'admission, textes de confidentialité et quotas ne sont pas envoyés. Les tests vérifient aussi l'absence de consultation des registrations/instances pour résoudre les relations.
- L'import/export Excel reste limité à M1/M4 dans C1d. Aucun gabarit M2 V0.1 n'est accepté ni converti par ce lot.

## Vérifications exécutées et à constater

Local, le 24 octobre 2026 : Node 24.22.1, npm 11.9.0. **957 tests applicatifs réussis**, aucun échec/annulation/ignoré/todo ; `npm run build` réussi. `git diff --check` et empreintes des quatre Masters historiques conformes. Logs : `docs/verification/c1e-npm-test.log` et `c1e-build.log`.

20 nouveaux cas métier partagés mémoire/Firestore : définition native sans ressources, révision globale avec M1 et espèces M2, références différées/réciproques/intercampagnes, confidentialité, droits distincts, révocation avant reçu, concurrence, archive/restauration, intégrité des étapes, champs injectés, bornes et rollback transactionnel. Quatre cas UI vérifient l'échappement, la lecture seule, les identifiants/révisions, la conservation des étapes et les boutons sans soumission involontaire. Un parcours HTTP/Auth est ajouté pour délégation M2, liens différés, absence d'accès aux admissions et révocation.

Les anciens tests de délégation qui utilisaient M2 comme atelier non éditable vérifient désormais M3 ; de nouveaux tests vérifient explicitement M2 autorisé avec lecture/édition accordées. Les suites historiques restent exécutées après extraction du nettoyeur natif.

Les émulateurs Firebase ne sont pas exécutés localement (Java 17). La CI du commit exact, en Node 22/Java 21, doit terminer sur les runs push et PR ; résultats, SHA, jobs, versions et décomptes définitifs seront consignés dans la PR. Aucun résultat d'un ancien commit n'est attribué à un nouveau. Aucun navigateur réel, appareil Android/iOS, exercice de charge ou restauration complète n'est revendiqué.

## Compatibilité, reprise et suite

Les quatre Masters historiques sont inchangés :

- Exemple Campagne : `4153682948869ab96568acc463d8c3fd28cba46adcd838065d6debe0865d8a67`
- Exemple Session : `823fc93ec6cbbf86fbca368452aff587286d2a90031a362aa883b6941328dc96`
- Master Campagne : `09fc513f054444170d08a4c8ed4a21244b12ac442ebfce51479090e4b23d394a`
- Master Session : `d1ba99664a227a54faf6522e10f4943f9144b5cffd0b2ab9b1b97b11a3bb856b`

Préserver ensemble en-tête de campagne, brouillon/changements/historiques/reçus, délégations, opérations, préparation et admissions. Un ancien binaire refusant les grants M2 ne constitue pas un rollback fonctionnel de cette tranche ; une restauration doit conserver l'ensemble cohérent. Aucun exercice complet de sauvegarde/restauration exécuté.

Restent à développer : autres contenus M2 (profils canoniques, factions et dotations préparées), médias et XLSX M2, contrôle/version/publication globale C2, passage des propositions approuvées I3, naissance/ressources protégées I4, relève I5 et autres ateliers. Ne pas convertir silencieusement les IDs de classe/initiation d'I1 en profils historiques. Les 55 recettes complètes restent non validées de bout en bout. C1e livre des fiches narratives préparatoires, pas des personnages jouables.

La branche et la PR sont conservées ; aucun merge, changement de `.github/deploy-request.json`, déploiement, migration, IAM/DNS ou secret. Une mise en production exige l'autorisation explicite distincte prévue dans AGENTS.md.
