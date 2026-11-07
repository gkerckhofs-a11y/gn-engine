# Space Outlaws — groupes préparés dans M2 vers la session

Mise à jour : [souhaits textuels d’amis dans la régie](SO-SOUHAITS-GROUPES.md), projection privée du dossier courant sans nouveau droit. Les limitations ci-dessous décrivent le jalon M2.

6 novembre 2026. Auteur : Codex. Base `a5e33fd6e3bc85c33c4f29373675692d5ce88c7a`, [CI 42220814560](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/42220814560) completed/success : huit jobs requis, 1 027 applicatifs, 811 Firestore, 23 HTTP. Même branche et PR nº 2.

## Périmètre

Sources : [CDC V3.5 §§3, 4.8, 4.10, 4.11](source/SO_CDC_V35.md), schéma central `central-groups.mjs` et [régie de session existante](SO-GROUPES-SESSION.md). Le format M2 natif ne contient ni type TEAM/FACTION, ni capacité ni responsable de session : ces choix restent explicites dans la régie, sans défaut inventé ni nouveau gabarit.

Les définitions group UPSERT deviennent publiables. Le contrôle vérifie leur forme native, les références M2 y compris les appartenances inactives, les droits effectivement raccordés et le maximum technique de 50 groupes. Les permissions non raccordées bloquent la publication avec entityId et champ précis : elles ne sont pas supprimées silencieusement. Les groupes archivés dans M2 restent exclus. Le calcul des 440 écritures de définitions inclut les groupes.

`groupDefinitionsVersion=1` dépend de `groupsVersion=1`, participe à la confirmation et au manifeste, est validé à la lecture et propagé à la naissance avec cohérence de session. Aucun enrichissement des anciens manifestes ou anciennes sessions. Une version portant des définitions de groupe sans ce marqueur est refusée.

## Instanciation et droits

La publication ne crée aucune instance. La première naissance crée les groupes une seule fois, avec leur contenu natif publié mais **sans membre actif et sans roster**. La provenance `soDefinition` référence uniquement la définition dans le manifeste immuable ; les appartenances prévues ne sont pas copiées dans un registre parallèle. Aucune ressource, caisse, attribution ou notification n’est ajoutée. Une naissance suivante ou un réessai ne réinitialise aucun groupe, même déjà configuré/affecté.

La régie relit les propositions depuis la version attachée à la session (et non un futur pointeur courant de campagne), sous autorité propriétaire/MJ. Elle distingue personnage à faire naître, réserve, décédé, proposition inactive, groupe à configurer et appartenance déjà active. Les réserves prévues dans M2 sont visibles sans être instanciées ni dotées. Aucune préférence d’amis ni relation de participant ne constitue une appartenance de jeu.

Le MJ configure explicitement type/capacité, ouvre une proposition, relit rôle/révélations/droits, coche l’autorisation et demande l’aperçu. L’aperçu et sa fermeture n’ont aucun effet. La confirmation appelle le même applyGroupMembership natif, avec capacités, équipe principale unique, versions, droits, STOP, clôture, réessais et concurrence déjà contrôlés. Les champs proposés sont modifiables : les choix de régie actuels font foi. Un groupe rejoint n’est pas réappliqué depuis M2.

Lire le briefing et Lire les membres restent les seules permissions ouvertes. Notes MJ, provenance de version, autres propositions et données d’admission ne passent pas dans les lectures joueur. Une affiliation publique préparée n’apparaît pas sur le badge avant validation. Décès et relève n’héritent d’aucun mandat : la réserve devenue personnage doit être affectée explicitement. Les épisodes suivants conservent groupe, provenance et mandats sans les rejouer.

## Validation et limites

Local : build et **1 068/1 068 applicatifs ciblés**, zéro échec/annulé/ignoré/todo, Node 24.22.1. Douze nouveaux cas partagés mémoire/Firestore : publication/naissance, configuration/accord, naissance suivante, droit non raccordé, référence inactive, archive M2, réserve/relève, STOP/archive, épisode suivant, corruption/provenance/manifeste, badge public et bornes/forme. Régressions centrales et de session conservées.

Six parcours Chromium 153.0.8010.0 : bureau 1280×900 et petit écran 360×800 tactile simulé, création/transfert/STOP existants plus proposition M2, absence d’autorisation précochée, fermeture de l’aperçu sans effet et confirmation native. Composants réels + workflow MemoryStore, sans réseau distant ; débordement contrôlé et captures inspectées. Pas d’appareil réel ni d’authentification Firebase navigateur revendiqués.

Profil targeted-group-definitions : 85 fichiers applicatifs, 50 suites Firestore, 24 HTTP sélectionnés. HTTP nouveau : groupes publiés par le workflow natif, identités authentifiées avant activation, propositions privées, absence de droit avant confirmation, portefeuille conservé, tiers et accès révoqué refusés. Les émulateurs restent réservés à la CI Node 22/Java 21 ; résultat final du commit exact à consigner dans PR nº 2. Aucun complet ni recette humaine certifiée.

Restent distincts : demandes d’amis intégrées en régie, recherche unifiée de tous les statuts, opérations collectives de caisse/stock/missions/pilotage et cycle Master Vn+1. Cette tranche ne certifie pas §4.11 ou INS-05/09/10 complets. Aucune ouverture de permission collective supplémentaire.

Reprise : conserver ensemble code/marqueurs/manifeste/pages, groupes/provenance, rosters/membres/droits/révélations/responsables, révisions/historiques, identités/accès, décès/relève, épisodes/sauvegardes et reçus. Les deux permissions de cette version sont fixes : ne pas les élargir silencieusement dans une ancienne version. Ne pas recopier la proposition M2 sur un successeur ni rejouer la première naissance pour reconstituer les groupes. Même PR brouillon ; aucun merge, déploiement Firebase, migration ou restauration externe.
