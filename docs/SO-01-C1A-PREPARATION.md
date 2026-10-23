# SO-01 C1a — préparer une campagne sans dotation

23 octobre 2026. Première tranche fonctionnelle après le [diagnostic V3.5](SO-00-V35-INSCRIPTIONS.md). Le parcours **création → consultation privée → délégation MJ → correction des informations** est disponible sur la branche `work/l1-modular-workshop`, package 0.37.0. Il prépare le contexte d’I1 ; il ne livre pas encore les inscriptions, le Master central ni une session jouable.

## Base vérifiée et périmètre

Main reste `03eaace155b052d1b7d1960347746e9ee60ed514`. Base de travail distante `322ac4f4ddeeb702d7cb4adec8963beb4cefb26f`, arbre `3cf2240091b427d282ab58a8139cd71c72381a1c`, identique au checkout local `325af1d` et à la fusion virtuelle PR `b81490a15ec04a12421bb010f7ca80c6a0526e03`.

La CI de cette **base** est close : [push 39963947327](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39963947327), job 120448778582, fin 14:09 UTC ; [PR 39963954056](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39963954056), job 120448802785, fin 14:06 UTC. Logs lus : build + 795 applicatifs + 613 Firebase par run, zéro échec/annulé/ignoré/todo, Node 22.23.3 / Java 21.0.12+1. Le résultat de C1a sera consigné séparément dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1).

L’autorisation de continuer le développement étape par étape permet cette extension pour des campagnes neuves. Aucune adoption/conversion d’une campagne historique, migration active, fusion sur main ou production n’est effectuée. Les décisions V0.7 et les contrats historiques ne sont pas réécrits.

## Parcours organisateur

1. Dans le tableau de bord propriétaire, choisir **Préparation SPACE OUTLAWS**.
2. Renseigner nom de campagne, titre de session, capacité totale prévue, date, horaires, lieu, présentation, informations pratiques et notice de confidentialité.
3. Créer la préparation. Elle apparaît dans les campagnes et sessions, sans épisode joué. Le profil cible est explicitement SPACE OUTLAWS V0.7 ; ce marqueur ne certifie pas l’implémentation de toutes ses règles.
4. Depuis l’équipe de session existante, déléguer à un MJ ou révoquer son mandat. Le MJ peut corriger les informations avec un motif ; Accueil peut les consulter. Seul le propriétaire gère les délégations. Aucun courriel n’est envoyé.
5. Chaque édition porte la révision lue. Une seconde édition concurrente est refusée ; le MJ doit relire les données. Les valeurs avant/après et le motif sont conservés dans l’audit privé.

Le nouveau parcours affiche ses limites et n’offre ni partage d’inscription, ni import, ni ouverture du briefing/jeu. La campagne ne possède aucune version Master publiée. Les anciens scénarios et sessions gardent leurs écrans et comportements.

## Extension minimale du socle

| Élément | Réutilisation / extension |
|---|---|
| `createSpaceOutlawsPreparation` | Commande du service **campagnes existant**, authentification propriétaire, transaction unique campagne + contexte session + historique + reçu |
| `saveSpaceOutlawsPreparation` | Même service ; OWNER/MJ du contexte, contrôle de révision et audit, liste fermée des champs pratiques |
| `campaigns/{id}` | En-tête avec `preparationSessionId`, `ruleProfile=SPACE_OUTLAWS_V07`, empreinte d’intention ; `episodeCount=0`, aucune session active/jouée, aucune version/scénario source |
| `sessions/{id}` | Contexte stable pour les futures admissions, `preparationKind=SPACE_OUTLAWS_V07`, `preparationVersion=1`, stage PREPARATION, inscriptions fermées et règles économiques/santé/PA non activées |
| `sessionStaff` | Grants existants, mêmes rôles et révocations. Ils ne confèrent aucun droit de publication de campagne |
| `operations` / `audit` / historique de campagne | Reçus et journal existants ; aucune autre collection économique ou catalogue de personnages |
| `campaignGuardStore` | Barrière transactionnelle commune, étendue pour empêcher une écriture de jeu/import dans une préparation C1a |
| UI existante | Bouton du Dashboard, route de session, page campagne et panneau d’équipe réutilisés ; écran de préparation dédié |

Aucun appel à `seedScenarioSession`, `seedWallets`, `seedInventory`, `seedKnowledge`, `seedFieldTargets` ou `seedShip`. Les collections personnages, compétences attribuées, comptes, ledger, lots, PA, informations reçues, vaisseaux et QR actifs restent vides. La capacité globale est une information de préparation, pas un quota confirmé par classe.

### Réessais et concurrence

L’identifiant de création est produit une fois côté client puis conservé dans le stockage de session du navigateur (repli en mémoire si le stockage est indisponible). Seule cette clé, sans réponse personnelle ni jeton d’invitation, y est conservée. Les IDs de campagne/session dérivent côté serveur de l’UID authentifié et de cette clé ; aucune clé d’un autre utilisateur ne désigne sa campagne.

Même requête ou nouveaux `requestId` pour la même intention : une seule campagne/session et un seul événement de création. Même clé avec des informations différentes : refus explicite, invitation à retrouver la préparation dans le Dashboard. Après réponse confirmée, la clé est libérée pour une création volontaire ultérieure. Un changement de navigateur sans clé exige de retrouver la préparation existante dans le Dashboard ; il n’est pas présenté comme une reprise automatique universelle.

Le mandat MJ est relu **avant** de retourner un reçu d’édition déjà enregistré. Révocation puis rejeu = refus. Les éditions concurrentes comparent la révision dans la transaction. Les services historiques sont refusés dès le contrôle de contexte ; une seconde barrière avant commit refuse toute écriture de ressources, ouverture d’inscription ou retrait du marqueur de préparation, avec annulation atomique des écritures associées.

## Preuves exécutées et limites

| Contrôle | Verdict de C1a |
|---|---|
| 10 cas métier MemoryStore + 3 UI | 13/13 réussis, sous-ensemble du total suivant |
| `npm test`, Node 24.19.0 | **808/808 réussis**, 0 échec/annulé/ignoré/todo, 17 336,240202 ms ; [log](verification/so-c1a-npm-test.log) |
| `npm run build` | Réussi ; [log](verification/so-c1a-build.log) |
| Git diff / Masters | `git diff --check` réussi ; les quatre SHA-256 restent ceux de SO-00 V3.5 |
| Firestore Emulator | Les mêmes 10 cas sont raccordés à `test/integration/firestore.test.mjs`. Verdict exact du nouveau commit dans la PR après fin de CI ; pas de verdict local (Java 17 local, Java 21 CI) |
| HTTP + Auth Emulator | Un nouveau parcours authentifié teste création unique, refus joueur, confidentialité, édition et réessai ; exécution par CI du nouveau commit, non revendiquée comme test local |
| Navigateur réel / Android / iOS | **NON EXÉCUTÉ**. Les trois tests UI vérifient HTML, droits affichés et clé de reprise, sans exécuter un téléphone |
| REC-SO-INS-01…10 / MST | Aucune recette complète validée par C1a ; préparation et absence de dotation seulement |
| Sauvegarde/restauration complète | **NON EXÉCUTÉE**. L’interruption avant commit simulée et le réessai métier ne remplacent pas une restauration Firebase |

Les dix tests métier couvrent : absence de ressources ; création concurrente/rejeu ; exception avant commit et reprise ; droits/confidentialité ; injection de champs ; conflit d’édition ; MJ/Accueil/révocation ; refus des anciennes commandes ; défense transactionnelle commune ; coexistence d’une session historique avec une nouvelle préparation. Les transactions sont les vraies commandes du moteur sur stores synthétiques. L’interruption est une exception injectée avant commit, et non une panne réseau physique.

## Sauvegarde, retour arrière et suite

Pour une future recette isolée, sauvegarder ensemble les nouveaux en-têtes campagne/session, `preparationIntent`, `preparationSessionId`, révisions, reçus `operations`, historique/audit et grants `sessionStaff`, avec les identités Auth correspondantes. Ne jamais supprimer un reçu ou changer la clé de création pour résoudre une réponse incertaine.

Un simple retour à un ancien binaire ignorant `preparationKind` **n’est pas un retour arrière sûr** dès que des préparations sont enregistrées : les anciens chemins pourraient tenter de les ouvrir/importer. Avant tout rollback logiciel dans un environnement disposant de ces données, suspendre les écritures et conserver une version qui reconnaît et bloque ces contextes, ou restaurer une sauvegarde cohérente expressément validée. Aucune de ces opérations n’est lancée ici ; aucun état de production n’a changé. La procédure finale reste [à faire valider](SO-SAUVEGARDE-DEPLOIEMENT.md).

**Prochaine tranche I1** : profil fermé de choix canoniques raccordé aux catalogues existants, espèces narratives administrées, invitation d’admission expirante/révocable, proposition privée sauvegardable et soumission. Étendre délibérément la barrière C1a pour ces seules écritures, en conservant son blocage des seeds et anciennes API. Les quotas/approbations I2, M2/publication globale I3, naissance I4 et relève/groupes I5 restent dépendants du plan ; ne pas activer le jeu avant ces contrôles. Le titre de campagne fixé à la création sera administrable avec le futur en-tête central ; C1a édite les informations de session seulement.
