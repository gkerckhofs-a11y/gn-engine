# SPACE OUTLAWS V3 — audit SO-00 et tranche Master SO-06a

État du 23 octobre 2026. Candidat 0.37.0 sur `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1), non fusionné et non déployé. Le nom historique de branche est conservé pour préserver L1a–L1m. SPACE OUTLAWS devient le produit prioritaire ; le créateur universel n'est plus un objectif.

## Sources intégralement lues

1. [Cahier des charges V3.0](source/GN_Engine_SPACE_OUTLAWS_Edition_Cahier_des_charges_V3_0.md), copie intégrale du fichier joint, 582 lignes. SHA-256 `6976c67ba340fd5ef150119b4443d67c628d8f56a9302522348353ac484a3bf3`.
2. [Livre V0.6 FINAL, transcription textuelle](source/SPACE_OUTLAWS_Livre_des_regles_V0_6_FINAL.txt). Le document exact `SPACE_OUTLAWS_Livre_des_regles_V0_6_FINAL.docx` a été retrouvé puis lu intégralement, 2 988 lignes extraites, fichier source de 133 412 octets, créé le 23 octobre 2026 à 09:34:56 UTC, identifiant documentaire `libfile_10698212bcb48191bf5b90926b9887cb`. SHA-256 de la transcription `4c67da3399c51aa01285e7a4b053b60d3b22abcc0e1e5a9e7cd1d6eb2bd27c74`.
3. [Rapport de cohérence, transcription textuelle](source/SPACE_OUTLAWS_V0_6_Rapport_de_coherence.txt), 202 lignes extraites du fichier exact `SPACE_OUTLAWS_V0_6_Rapport_de_coherence.docx`, 42 884 octets, créé le 23 octobre 2026 à 09:34:59 UTC, identifiant `libfile_50fafdc9726c8191beca099de4a1ea5a`. SHA-256 de la transcription `787d0b6ff0d194b8370b2537828a4a5322f5f05402ecb65c75ce81bccf24012a`.

Les transcriptions conservent le texte extrait, pas la mise en page des DOCX ni leurs objets graphiques. Les empreintes ci-dessus ne sont pas celles des binaires DOCX. Le livre joint sans suffixe FINAL n'est pas déclaré identique au FINAL : c'est bien ce dernier qui fait foi. Les sources originales restent inchangées. Le rapport de cohérence constate une validation documentaire, pas des tests logiciels ou une homologation physique.

Priorité : décisions A01–A38 et livre FINAL > exigences V3 > adaptation des contrats techniques existants > documents V2 historiques. Les propositions de schéma V3 restent des propositions, les paramètres de session restent à préparer, les barèmes V0.6 sont clos. Exemple de changement majeur : la révision du vaisseau dépend de tirs réellement exécutés, même esquivés, ou de dommages spéciaux explicitement marqués ; elle n'est pas due après toute interception sans tirs.

## État GitHub constaté à la reprise

| Élément | Observation |
|---|---|
| `main` | `03eaace155b052d1b7d1960347746e9ee60ed514`, package 0.36.0 |
| Branche de travail | `16e1a194ecbd413d13966827e5c0bbc7bcaafb4c`, package 0.37.0, L1a–L1m préservés |
| PR #1 | Ouverte, brouillon, non fusionnée, base `main`, fusion techniquement possible au constat |
| `codex/mission-participation-0.18` | `7072cda44252d2fded85bfe9661240140eed0a61` ; 0 commit propre, 71 derrière main |
| `codex/open-bounties-0.17` | `787ffbdc3d17b768a0bb44aab6a4d1bb015a871a` ; 0 commit propre, 74 derrière main |
| Inventaire | Deuxième page de branches vide ; recherche de PR : seule PR #1. Tags non inventoriés |
| CI de référence | [39911044989](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39911044989), job `120273881441`, succès vérifié dans métadonnées et journal |
| Commit réellement testé par cette CI | Fusion de contrôle `d720692911b66f7c25c9dc5580052d80c15b9d90` de `16e1a…` dans `03eaace…` |
| Résultats de référence | Build ; 757 tests applicatifs et 586 tests émulateurs, aucun échec/ignoré/annulé. Node 22.23.3, Java 21.0.12+1, `demo-gn-engine`. Fin émulateurs 23 octobre 06:42:06 UTC / 08:42:06 Bruxelles |
| Dernier déploiement documenté | [39731774273](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39731774273), commit `d5334d8dfcb493421c9bd4efaf83c50eb56e373f`, succès 22 octobre 06:24:29 UTC ; 0.36.0 observée dans le rapport historique |

La dernière ligne est une preuve historique issue de `VALIDATION-0.36.md` et de l'audit L0, pas une nouvelle inspection exhaustive des déploiements ni un contrôle actuel du site de production. Aucun appel de modification de production effectué. Les outils de runs utilisés pour la reprise filtrent les exécutions de PR ; ils ne prouvent pas l'absence de déploiement plus récent. Aucun artefact téléchargeable n'est publié par la CI de référence : les journaux sont la preuve consultée.

`check.yml` a été lu : push/PR, droits lecture, Node 22, Java 21, `npm ci`, build, tests, émulateurs Firestore/Auth/Storage. `deploy-firebase.yml` a été lu : déclenchement manuel ou changement du marqueur sur main. Aucun workflow ni marqueur de déploiement modifié ou déclenché. `verify-live.yml` n'a pas été lancé.

## Socle réutilisé et écarts structurants

| Socle réel | Réutilisation / écart V0.6 |
|---|---|
| `workflow.mjs`, permissions, invitations et projections | Contrôles serveur de rôle/session, fiches privées, invitations et révocation conservés. Un QR de jeu ne donne jamais accès au compte ou à la fiche privée |
| `abilities.mjs` | Catalogues de compétences/classes et profils publiés ; manque le profil fermé à 8 classes, 34 compétences, initiations, rareté, XP utilisateur et succession |
| `action-point-state.mjs`, `clock.mjs` | Réservations/remboursements, 5/8 PA et cycle 300 min réutilisables ; seuil de 4 sessions au niveau utilisateur et nouvelle incarnation absents |
| `health-state.mjs`, `person-actions.mjs` | PV, soins, consommables, aide et pillage existants ; aucune stabilisation intermédiaire à 60 s, mort à 5 min, protection unique ou distinction humanoïde/droïde conforme |
| `inventory-state.mjs`, `economy-state.mjs` | Lots identifiés, détenteur/propriétaire, comptes, réservations et journal ; manque une part protégée dans le compte existant et la provenance non revendable des kits |
| `field-actions.mjs`, connaissances, QR | Cibles et profils d'interaction, états temporaires et informations filtrées ; Rogue, traces fictives et toxicologie exigent des services métier supplémentaires, pas une ouverture des droits |
| `navigation-state.mjs`, `voyages.mjs` | Fret, propriété, droits de pilote, carburant, trajet et horloge ; capacité strictement positive incompatible avec le chasseur à 0 fret. Aucun modèle, passager, combat ou remorquage canonique |
| Prix, commerce, douanes et contrats | Paiements/stock et devis réutilisables ; arrondi actuel au prix unitaire différent de l'arrondi de ligne canonique. Financement `GM_EXTERNAL` à exclure du profil SO. Assurance et litiges absents |
| `campaigns.mjs` | Copie explicite, identités conservées, source scellée, contrôle de version. Bloque les voyages/contrats ouverts ; option RESTORE soigne ; conserve certaines durées temporaires : ces trois comportements doivent être adaptés pour A38 |
| `masters.mjs`, projections/éditeurs L1 | Import atomique aperçu/confirmation, versionnement de lignes, contrôles de références. Colonnes inconnues refusées ; toute extension SO exige lecteur, écrivain, archive et tests compatibles |
| Médias, archives | Autorisations et références de médias conservées. `.gnscenario.zip` n'est pas une sauvegarde des sessions, comptes, historiques, invitations ou données Auth |

Les noms des domaines proposés dans V3 ne créent pas une seconde base de données. Les extensions seront des champs ou opérations dans les services actuels, avec les mêmes identifiants de biens, comptes et campagnes. Un profil canonique ne sera pas activable en session tant que ses contrôles métier ne sont pas effectifs.

## Rapprochement des travaux L1 et des lots SO

| Lot | Apports L1 conservés | Travail restant et dépendances |
|---|---|---|
| SO-00 | Audit L0, historique PR et L1a–L1m | Présent audit, matrice V3, stratégie remplacée sans effacer l'historique |
| SO-01 | L1b/c/h/i/j/k : fiches, classes, compétences, créations, profils, PA, dotations | Profil V0.6 immuable puis création/activation réelle ; utilisateur/session/incarnation, 200 Cr protégés, kits, XP, mort/soins. Prérequis de Rogue, droïdes et pilotes |
| SO-02 | L1f/g : cibles, interactions, récompenses ; QR et connaissances existants | ROG-02/03, durées et exceptions, quotas atomiques, notification différée, traces et substances ; dépend de SO-01 et du transfert réel de lots |
| SO-03 | Catalogues objets, soins MEC et interactions terrain | Modules identifiés, 2 emplacements, quatre états indépendants, ateliers/réparation ; dépend de SO-01, inventaire et ciblage SO-02 |
| SO-04 | L1d et navigation/fret/carburant existants | Modèles et capacité nulle, achats/vente, passagers, événements, interceptions, combat simultané, vrai butin, maintenance conditionnelle, épaves ; dépend des PA, stocks, droits et coûts |
| SO-05 | L1d/e et tarifs, comptes, boutiques privées, contrats génériques | Magasins financés, règles de prix, douane/identités, séquestres, assurance et litiges ; interface avec voyages SO-04 et clôture SO-06 |
| SO-06 | L1a–m, versions et campagnes | Six vues du Master, export global partiel dans SO-06a ; référentiel complet et A38, clôture/reprise, 24 recettes, sécurité, mobile et charge restent ouverts |

Séquence minimale : SO-01a profil publié et création protégée, puis progression/mort/soins ; SO-02 et SO-03 sur ces états ; SO-04 et SO-05 sur les mêmes comptes/lots ; SO-06 clôture et recette complète. Les travaux d'interface Master déjà avancés justifient SO-06a dès maintenant sans déclarer SO-06 terminé. Les nouvelles migrations restent explicites et testées sur copies fictives.

## Tranche fonctionnelle SO-06a réalisée

Les six vues portent les intitulés V3 : Personnages & Compétences, Missions & Communication, Boutiques, Spatioport, Économie & Stocks, Informations & Fouilles. Leurs identifiants techniques historiques restent inchangés, ainsi que les liens, frontières d'import et collections.

Parcours : propriétaire → Master → **Exporter le catalogue des six vues** → contrôle du périmètre/références → téléchargement XLSX → champ Master complet de la même destination → aperçu → confirmation. `masterWorkspace` lit les six projections dans une seule transaction à la révision du parent. L'export global retire le filtre de module mais conserve destination, campagne et révision. Il réutilise les projections et importeurs L1, sans nouvelle collection, nouvelle copie métier ou mutation à l'export.

Un échec de projection, une vue manquante/répétée, une révision incohérente ou une limite dépassée bloque le fichier entier. Les exports ciblés restent disponibles. Une réponse tardive après fermeture est abandonnée. L'export reste accessible au propriétaire après lancement, mais le réimport reste soumis à la préparation initiale.

**Limites explicites :** export de catalogues existants, pas encore le Master SPACE OUTLAWS V0.6 complet. Dotations de départ et informations générales du scénario exclues ; en session, attributions acquises et paramètres santé/monnaie exclus. Aucun solde, stock acquis, compte joueur ou historique. Pas de copie autonome ni de sauvegarde ; 250 lignes / 1 Mio de données / 8 Mio de fichier selon les limites existantes. Aucun profil canonique activé par cette tranche.

## Migration et intégrité

SO-06a ne migre aucune donnée ; ajout d'une lecture et d'un export, titres de vues seulement. Format XLSX 1 et package 0.37.0 conservés. Aucun changement des quatre fichiers historiques :

| Fichier dans `assets/masters/` | SHA-256 après contrôles |
|---|---|
| `GN_Engine_Exemple_Campagne.xlsx` | `4153682948869ab96568acc463d8c3fd28cba46adcd838065d6debe0865d8a67` |
| `GN_Engine_Exemple_Session.xlsx` | `823fc93ec6cbbf86fbca368452aff587286d2a90031a362aa883b6941328dc96` |
| `GN_Engine_Master_Campagne.xlsx` | `09fc513f054444170d08a4c8ed4a21244b12ac442ebfce51479090e4b23d394a` |
| `GN_Engine_Master_Session.xlsx` | `d1ba99664a227a54faf6522e10f4943f9144b5cffd0b2ab9b1b97b11a3bb856b` |

Risques des tranches suivantes : migrations de profils publiés et des lecteurs stricts XLSX ; identité utilisateur distincte du personnage ; conservation des fractions protégées/réservées d'argent ; règles d'arrondi figées dans les devis ; transfert des opérations ouvertes entre épisodes sans double exécution ; séparation temps réel/temps de jeu et STOP ; provenance des modules/lots et propriété distincte du fret. Ne pas appliquer ces changements rétroactivement aux sessions historiques.

Voir [matrice V3 et registre des recettes](MATRICE-SPACE-OUTLAWS-V3.md), [rapport de conformité courant](SO-VALIDATION.md) et [sauvegarde/reprise et déploiement à faire valider](SO-SAUVEGARDE-DEPLOIEMENT.md).
