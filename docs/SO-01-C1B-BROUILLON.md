# SO-01 / SO-06 — C1b, accès au Master central et modèles M1

24 octobre 2026. Candidat 0.37.0 sur `work/l1-modular-workshop`, [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1). Cette tranche additive porte uniquement sur les nouvelles préparations C1a. Elle ne convertit aucune campagne historique et ne publie aucune version.

## Reprise vérifiée

- Main `03eaace155b052d1b7d1960347746e9ee60ed514`, version 0.36.0 ; branche distante I2b `ea7f47e45ce3f14722b273301bb8e2cab2eedf43`, version 0.37.0.
- Checkout local avant C1b `c243bf34b8d28743a67de077a38a2f0678bc5f10`, arbre commun `a134fe1f02689e1eeb498b4205a7560295d8dd22`. PR ouverte en brouillon, non fusionnée ; autres branches conservées.
- CI I2b revérifiée : push [40006390251](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006390251), PR [40006400292](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40006400292), deux succès avec build, 869 applicatifs et 678 Firebase chacun. Ces preuves concernent la base, pas C1b. [Description I2b et preuves intégrales conservées](PR-1-HISTORIQUE-AVANT-C1B.md).
- `check.yml` reste un workflow de TEST push/PR, Node 22, Java 21, `demo-gn-engine`. Le workflow de déploiement, son marqueur, les règles/index Firebase et les quatre Masters sont inchangés.

## Matrice ciblée V3.5 / code / adaptation / tests

| Exigence | Déjà présent et réutilisé | Adaptation / nouveau C1b | Limite ou migration |
|---|---|---|---|
| Un brouillon de campagne | Contexte C1a et changement M2 `speciesCatalogue_player` de I1 | M1 écrit dans le même `masterDrafts/initial`, révision commune | Base vide seulement ; adoption historique interdite |
| Sept ateliers, six domaines | Navigation L1 des six domaines | Sept entrées et droits explicites, état disponible affiché | M3–M7 ne sont pas raccordés au central ; M2 consultable pour les espèces seulement |
| Définition de bien différente d’un stock | `itemInput`, modèle de biens historique | Création, modification, archive et restauration M1 en brouillon | Aucun lot, monnaie, PA, XP, dose ou QR créé ; aucune mécanique nouvelle |
| Pas de catalogue parallèle | Catalogue narratif M2 existant, schéma natif des biens | Projection des changements seulement ; pas de copie dans session/scénario | Futur C2 devra matérialiser base + changements et préserver ces IDs |
| Droits propres à la campagne | Identité Google vérifiée, normalisation d’email, transactions et reçus existants | Délégations lecture par atelier, édition M1, gestion réservée au propriétaire | Un rôle MJ/Accueil de session ne donne aucun droit central ; publication non disponible |
| Import différent de publication | Importeur v1 et Masters historiques inchangés | Édition web privée seulement, état des biens forcé `DRAFT` | Import/export central, gabarits V0.1 et contrôle global restent à développer |
| Concurrence et réseau instable | Transactions Firestore et `operations` | Révision commune, révision de modèle, empreinte de commande, autorité avant reçu | Deux éditeurs doivent recharger après conflit ; pas de fusion automatique |
| Provenance et reprise | Historique central I1 | Avant/après, auteur, motif, source WEB, révision ; restauration auditée | Aucun effacement historique ; restauration d’infrastructure non exécutée |

SO-GAP-12/13 sont **partiellement traités**. SO-GAP-14 attend toujours les définitions de personnages M2 (I3). Aucun autre écart métier n’est fermé. C1b contribue à SO-01 et au socle Master SO-06 ; il ne constitue pas C1 complet ni C2.

## Parcours disponible

1. Le propriétaire ouvre une préparation C1a, puis **Master central**, également accessible au tableau de bord.
2. M1 permet de préparer un modèle avec un ID stable, un motif et les champs du modèle de biens existant. Le navigateur conserve l’ID pendant les réessais du formulaire ; le serveur impose les révisions et l’idempotence.
3. Archiver conserve le changement et son historique ; restaurer crée une nouvelle révision. Une absence de ligne ne supprime rien.
4. M2 affiche le catalogue d’espèces narratif déjà utilisé par les inscriptions. Les paramètres des candidatures restent dans leur parcours I1 ; aucun dossier, souhait d’amis, quota ou lien d’invitation n’est livré au lecteur M1/M2.
5. Le propriétaire délègue explicitement la lecture d’ateliers et, pour M1, l’édition. Le compte délégué retrouve la campagne au tableau de bord sans recevoir l’accès aux candidatures ou à la session.
6. Une révocation s’applique aux nouvelles requêtes et aux réessais de commandes déjà reçues. Le contenu déjà consulté ne peut pas être repris au destinataire. L’interface efface sa vue privée au changement de route, à la déconnexion et à la sortie de page.

Aucun bouton de publication globale n’est proposé. Le statut de contenu `DRAFT` n’est pas une autorisation de jeu.

## Contrat et frontières

Chemins réutilisés :

- `campaigns/{id}.master` : schéma 1, `activeVersionId:null`, `pointerRevision:0`, `openDraftId:initial`.
- `campaigns/{id}/masterDrafts/initial` : même document que I1, base nulle, profil `SPACE_OUTLAWS_V07`, statut `DRAFT`, révision monotone.
- `changes/item_{itemId}` : propriétaire fonctionnel M1, type `item`, ID métier stable, `UPSERT` ou `ARCHIVE`, données issues de `itemInput`, provenance WEB. Ce sont des définitions préparées, pas des instances.
- `changes/speciesCatalogue_player` : reste l’unique source narrative des inscriptions M2 ; aucune modification de son format ni de son service.
- `history/{draftRevision}` : historique commun, entrée C1b avec `workshop:M1`, motif et avant/après. Le lecteur M1 ne retourne pas les historiques I1 contenant des paramètres d’admission.
- `operations/{hash(uid:requestId)}` : reçu existant, empreinte canonique de l’action et de son entrée. Les contrôles d’autorité et de contexte précèdent sa restitution.

Nouvelle portée d’autorisation, sans nouveau compte utilisateur : `campaignStaff/{hash(campaignId:email_normalise)}` contient propriétaire, campagne, email, activation, ateliers lisibles/éditables, révision et date. Les modifications sont auditées dans l’historique de campagne. Aucun import ne peut créer ces droits. Aucun droit de publication n’est encore représenté. Les listes sont filtrées côté serveur ; un atelier non autorisé est refusé, pas simplement masqué dans l’interface.

Limites explicites de cette tranche : 250 modèles M1, y compris archivés, 50 identités déléguées par campagne. Les dernières 30 entrées centrales portant une révision sont examinées pour afficher l’historique M1 ; I1 garde son propre historique complet. Le serveur HTTP conserve son plafond existant de corps de requête. Médias, dotations, effets arbitraires et champs étrangers sont refusés dans l’écriture M1 ; le branchement des médias requerra l’indexation des usages centrale avant toute autorisation.

La garde C1a n’est pas relâchée. C1b ne passe jamais par les seeds ni par l’importeur historique. Le service refuse une campagne déjà jouée, un scénario associé, un pointeur publié/modifié, un autre brouillon, un gel ou un rebasage. Le passage futur à C2 devra adapter explicitement cette frontière et le lecteur d’admissions I1.

## Preuves exécutées

Le 24 octobre 2026 dans le contexte de travail, Node **24.19.0** :

| Contrôle | Résultat constaté | Preuve |
|---|---|---|
| Tests ciblés métier + rendu | 21 réussis | 17 cas partagés + 4 tests UI |
| `npm test` complet | **890 réussis**, 0 échec/annulé/ignoré/TODO, 14 113,666229 ms | [Journal local](verification/so-c1b-npm-test.log) |
| `npm run build` | **Réussi**, interface compilée | [Journal local](verification/so-c1b-build.log) |
| Syntaxe du test HTTP | Réussie (`node --check`) | Contrôle local, pas une exécution HTTP |
| Diff et Masters | `git diff --check` réussi, quatre SHA-256 conservés | Empreintes ci-dessous |
| GitHub Actions + Firebase | Résultat exact à consigner après terminaison dans la PR | Ne pas substituer la CI I2b |
| Android/iOS, navigateur et coupure physique | **NON EXÉCUTÉS** | Aucun appareil ni environnement de recette utilisé |

Les 17 cas métier sont branchés sur la suite Firestore réelle émulée : brouillon sans initialisation en lecture ; schéma de bien natif sans ressources ; M1→M2 et M2→M1 ; concurrence M1/M2 ; séparation des rôles ; projection et tableau de bord cloisonnés ; lecture seule ; révocation avant reçu ; délégations concurrentes ; édition concurrente sans mélange ; double clic/réponse perdue ; interruption avant commit ; archive/restauration ; champs étrangers/ressources interdits ; refus de cycle publié/rebasé ; borne incluant les archives.

Le nouveau cas HTTP/Auth vérifie le handler exporté avec comptes synthétiques, délégation M1, refus M2/admissions, réessai, révocation, ajout M2 par le propriétaire et absence de ressources. Il ne sera déclaré exécuté qu’après CI. Les quatre tests UI vérifient le rendu/échappement, droits et formulaires ; ils ne constituent pas une recette sur téléphone.

Les tests C1b couvrent des prérequis du brouillon (droits, révisions, absence de dotation, archive auditée), pas les scénarios complets MST d’import et de publication. Aucun des 55 critères complets n’est certifié par C1b. Le test crucial M1/M4/M5, la modification M3 avec contrôle global, les publications concurrentes et le rollback d’une version publiée restent non exécutés : C2 et les adaptateurs métier sont nécessaires.

## Compatibilité, sauvegarde et retour arrière

Les quatre empreintes SHA-256 restent :

| Fichier `assets/masters/` | SHA-256 |
|---|---|
| GN_Engine_Exemple_Campagne.xlsx | `4153682948869ab96568acc463d8c3fd28cba46adcd838065d6debe0865d8a67` |
| GN_Engine_Exemple_Session.xlsx | `823fc93ec6cbbf86fbca368452aff587286d2a90031a362aa883b6941328dc96` |
| GN_Engine_Master_Campagne.xlsx | `09fc513f054444170d08a4c8ed4a21244b12ac442ebfce51479090e4b23d394a` |
| GN_Engine_Master_Session.xlsx | `d1ba99664a227a54faf6522e10f4943f9144b5cffd0b2ab9b1b97b11a3bb856b` |

Pour une sauvegarde future, conserver au même point de cohérence : campagne/header, préparation/session, brouillon et tous ses changements/historiques, `campaignStaff`, audit de campagne, reçus `operations`, admissions/confirmations/identités/invitations/usages existants. Les XLSX et archives de scénario historiques ne contiennent pas ce brouillon central ni ses délégations.

La reprise démontrée automatiquement est limitée : un échec avant commit ne laisse aucun état partiel ; un réessai après réponse perdue ne réécrit rien ; une définition archivée se restaure avec une nouvelle révision auditée. **Aucune sauvegarde/restauration complète d’infrastructure ni ancien binaire n’a été essayé.** Ne pas revenir à un binaire qui ignore ces changements et droits ; conserver un lecteur compatible ou préparer une procédure validée. Aucun effacement de reçus ni restauration isolée de compteurs.

La [procédure de déploiement](SO-SAUVEGARDE-DEPLOIEMENT.md) reste **À FAIRE VALIDER**, non exécutée. Aucun changement Firebase production, IAM, DNS, secrets, règles/index, `.github/deploy-request.json` ou workflow de déploiement.

## Ordre minimal suivant

1. Compléter C1 : projection des types centraux nécessaires, adaptateurs d’édition/import partiel et références différées, provenance et diagnostics ; préserver les services historiques et les données M1/M2 C1b.
2. C2 : contrôle global, snapshot complet immuable, droits de contrôle/publication, pointeur atomique avec révision anti-ABA, reprise des constructions et futurs épisodes. Aucun effet de dotation.
3. I3 : proposition approuvée → définition M2 unique avec rapprochement explicite des codes V0.7. I4 : naissance distincte/idempotente, quotas revérifiés, kit/200 Cr protégés/PA/QR. I5 : décès, relève et retrait des anciens mandats.
4. Compléter les 55 recettes, sécurité, concurrence, mobile, sauvegarde/restauration et procédure de publication. Toute adoption/migration historique reste soumise à validation préalable du plan.
