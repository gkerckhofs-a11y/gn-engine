# SO-01 I1 — invitations et propositions privées

23 octobre 2026. Branche `work/l1-modular-workshop`, PR #1. Base distante C1a `c771db0b321d056d71a650cb17ee7b69b1902794`, arbre `7bf5950add8bf9d6cdddf17b5fffecdcb8ac6a97` ; main relu `03eaace155b052d1b7d1960347746e9ee60ed514`. Package 0.37.0 conservé. Les deux CI de C1a sont terminées avec succès (39968494689 / 39968505268, 808 applicatifs + 624 Firebase chacune). Aucun travail L1/L1b supprimé.

## Parcours livré sur branche

Dans une préparation C1a neuve, le propriétaire ou son MJ de préparation ouvre « Candidatures et invitations » :

1. Renseigner les huit maxima par classe, les consignes et les espèces narratives (libellé, description, nature, disponibilité). Aucun exemple d'espèce n'est prérempli ; aucun bonus mécanique n'est accepté. Zéro ferme le choix de classe. Enregistrer avec un motif, puis ouvrir explicitement les candidatures.
2. Créer un lien limité en comptes distincts, avec libellé et échéance. Maximum d'usages entre 1 et la capacité prévue ; validité 1–168 heures, même borne technique que les invitations privées existantes. Un lien limité à un compte n'est pas nominatif : le premier compte authentifié qui le consomme l'utilise. Ne le présenter comme lié à une adresse précise.
3. Copier le lien et le transmettre par le canal choisi par l'organisateur. L'application n'envoie aucun message automatiquement. Seul le hash est enregistré au serveur ; un lien perdu est révocable depuis sa liste puis remplaçable. Le navigateur conserve le token dans le formulaire pendant un réessai, sans persistance disque ajoutée.
4. Le candidat utilise un compte Google vérifié, lit les informations privées et accepte les consignes/notice. Il ouvre un dossier unique pour son UID dans cette session. Le lien disparaît de l'URL après cette ouverture au profit de `#/proposal/{sessionId}` ; conserver cette adresse privée pour revenir au dossier avec le même compte.
5. Saisir prénom/nom fictifs, espèce, classe, initiation, background et souhait d'amis facultatif. Enregistrer un brouillon incomplet ou soumettre un dossier complet. La nature est déduite de l'espèce côté serveur ; l'initiation vaut N1 et appartient à une autre classe. Les choix proviennent exclusivement des huit classes et initiations V0.7, jamais de FOR-01/LAS-01/Jedi/Sith.
6. Les MJ lisent les dossiers privés. Une nouvelle sauvegarde crée une révision ; les versions soumises sont conservées. Une modification peut revenir explicitement en brouillon. La commande d'approbation et la demande de correction MJ relèvent d'I2.

**Une candidature n'est pas une place confirmée.** I1 ne réserve aucun quota, ne crée aucune définition de personnage, incarnation, compétence acquise, PA, XP, lot, monnaie, groupe ou QR actif. `registrationOpen` historique reste faux et `accepted` reste zéro. Les souhaits d'amis n'accordent aucun mandat.

## Architecture et absence de catalogue parallèle

| Élément | Stockage réutilisé ou extension | Autorité et suite |
|---|---|---|
| Espèces narratives | `campaigns/{cid}/masterDrafts/initial/changes/speciesCatalogue_player` | Une seule définition de choix dans le brouillon central M2 ; pas de copie dans la session, le personnage ou un catalogue d'admission parallèle |
| Brouillon minimal | En-tête `campaign.master`, brouillon initial sans version de base, historique des révisions | `activeVersionId=null`, révision de pointeur zéro ; aucune publication ni conversion d'une campagne historique |
| Paramètres d'inscription | `sessions/{sid}/admission/settings` | Ouverture, consignes, quotas, référence de brouillon et révision ; ces paramètres ne sont pas des effets de jeu |
| Lien | `invitations/{sha256(token)}`, `purpose=ADMISSION`, campagne/session, limite/expiration/révocation | Collection existante ; reçus d'usage par UID sous le lien ; aucune confusion avec `PRIVATE_ACCESS` ou les invitations historiques sans marqueur |
| Dossier | `sessions/{sid}/registrations/{sha256(uid)}` et `history/{revision}` | Collection existante, statut externe inerte `RECEIVED`, `characterId=null`, `accessActive=false`, sous-état versionné `SO_ADMISSION_V1` |
| Réessais / journal | `operations` et audit de session existants | Empreinte de commande, résultat stable, audit sans contenu du dossier/token ; droits revérifiés avant reçu |
| Classes et initiations | `src/shared/admission-rules.mjs` | Manifeste fermé de choix V0.7, pas un second catalogue de compétences ; `classId`/`secondaryId` du dossier sont des **codes canoniques**, pas des IDs supposés des catalogues historiques |

Les choix d'espèces servent à **proposer** du contenu, pas à jouer une règle non publiée. Les espèces existantes ne peuvent être supprimées ou changer de nature : les désactiver ; les changements de libellé/description restent versionnés. Le cycle central complet C1/C2 devra reprendre ce changement M2, préserver ses IDs et raccorder les codes canoniques aux véritables définitions de classes/compétences avant I3/I4. Aucun rapprochement automatique avec des IDs historiques n'est fait ici.

Le droit `content` de la préparation autorise cette commande fermée de choix narratifs, pas un éditeur arbitraire du Master, ses imports, ses effets ou sa publication. Les grants de campagne pour les sept ateliers/publication restent à développer. Le service refuse un contexte historique, un brouillon dont la base/cycle a changé ou un pointeur déjà activé : ne pas lever cette limite sans l'adaptation C1/C2 et ses tests.

## Sécurité et concurrence

- Vérification Google/UID, campagne liée et rôle courant dans la transaction. Accueil : aucun dossier ni audit de candidature, y compris par l'ancienne route `session`. Joueur : uniquement son dossier ; pas d'annuaire de candidats ni de souhaits d'autres comptes.
- La dernière utilisation d'un lien partagé est consommée atomiquement. Même UID/réessai ne consomme pas une deuxième utilisation. Une autre invitation peut réautoriser le même dossier sans le dupliquer. Cela ne mesure pas le quota de places confirmées I2.
- Expiration évaluée à l'intérieur de chaque tentative transactionnelle. Révocation/fermeture bloque l'ouverture et l'édition ; le dossier reste lisible par son titulaire et les MJ. Elle n'est pas une suppression ou une future annulation d'approbation implicite.
- Révisions du dossier, paramètres, brouillon et informations pratiques/notice contrôlées à la sauvegarde/consentement. Une lecture périmée doit être renouvelée. Deux modifications concurrentes ne produisent pas de dossier/configuration hybride.
- Tous les champs sont en liste fermée, types/longueurs contrôlés. Aucune espèce avec effet, classe PNJ, initiation interdite, nature imposée, monnaie ou rôle injecté. Échappement HTML des textes.
- La garde C1a n'autorise que paramètres d'admission, dossiers inertes/historique et audit en plus de ses écritures antérieures. Les commandes historiques `assign`, import, ouverture de jeu et dotation restent refusées.
- Les liens ne sont pas journalisés en clair ni incorporés au badge public. L'API HTTP conserve `private, no-store`. Aucun droit Firestore client/production n'est modifié.

## Vérifications exécutées et limites

Local, Node 24.19.0 : `npm test` **825 réussis, 0 échec/annulé/ignoré/todo**, durée 20 751,524123 ms ; `npm run build` réussi. Journaux `verification/so-i1-npm-test.log` et `so-i1-build.log`. Le premier passage ciblé avait deux erreurs de fixture (motif de délégation absent) corrigées avant ces résultats ; aucune erreur restante dans le contrôle final.

Ajouts : 14 tests métier partagés mémoire/Firestore, 3 tests de rendu HTML, un parcours HTTP avec Auth Emulator. Le raccordement des tests Firebase n'est pas une preuve de leur exécution : **résultats finaux CI, commit exact et liens à relever dans la PR #1 après terminaison**. Les tests vérifient permissions, dernière utilisation concurrente, réessai après réponse ignorée, rollback d'exception avant commit, conservation des versions, références canoniques et zéro dotation. L'exception injectée et la réponse ignorée sont des simulations, pas une mesure de réseau mobile instable.

Les quatre fichiers XLSX historiques gardent leurs SHA-256 de C1a. Aucun workflow, fichier de déploiement, configuration Firebase, index, règle client, secret ou donnée de production touché. Aucun merge ni déploiement.

| Recette ciblée | Apport I1 | Ce qui reste à exécuter/livrer |
|---|---|---|
| INS-01 | Invitation authentifiée, bornée, liée, révocable/expirable ; test HTTP et concurrence | Recette humaine navigateur et Android/iOS ; invitation nominative facultative non implémentée |
| INS-02 | Huit classes/initiations, nature dérivée, espèces sans mécanique, refus Force et injections | Attribution canonique des compétences à la naissance ; recette sur appareils |
| INS-03 | Quotas configurés ; quota nul exclut une classe ; aucun participant confirmé | Confirmation atomique de dernière place par classe/global, liste d'attente et compteurs I2 |
| INS-04 | Brouillon/soumission, révisions, confidentialité, reprise | Demande de correction, approbation/refus, retrait et historique consultable complet I2 |
| INS-05 | Souhait narratif conservé sans groupe ni permission créé | Gestion des souhaits, confirmation et groupe réel I2b |
| INS-06 à 10 / MST | Préparation sans ressource préservée | M2 personnage, publication globale, naissance, succession et groupes non livrés |

**Aucun des 55 cas complets n'est déclaré validé par ces tests partiels.** Portrait facultatif, collision d'identité fictive à l'approbation, filtres avancés de file, invitation nominative, historique UI détaillé, clôture/retrait de dossier, confirmations/quota I2, charge 60 joueurs, navigateurs réels/Android/iOS et restauration complète restent non exécutés ou non implémentés. L'interface actuelle liste les dossiers MJ ; aucun bouton d'approbation fictif.

## Sauvegarde, reprise et prochaine tranche

Préserver ensemble campagne/en-tête/brouillon/changements/historiques, paramètres, inscriptions/historiques, invitations/usages, reçus `operations`, grants et audits. Ne pas supprimer un reçu pour « rejouer » une commande. Une réponse perdue se reprend avec la même intention ; en cas de révision périmée, relire avant une nouvelle modification. Ne pas supprimer un dossier pour libérer un usage de lien.

La conservation atomique est démontrée par injection d'exception avant commit et reprise dans les tests ; **aucune restauration de sauvegarde complète ni rollback déployé n'a été exécuté**. En cas de retour applicatif, geler les écritures et conserver un binaire sachant protéger C1a/I1 ou faire valider une restauration cohérente. Un ancien binaire ignorant les marqueurs n'est pas un rollback sûr. Les opérations de migration restent soumises à validation préalable.

Ordre suivant : **I2** décisions MJ, normalisation/collision des noms fictifs et confirmation atomique des quotas de classe/capacité totale ; **I2b** groupes ; **C1/C2 + I3** références M2 et publication globale ; **I4/I5** naissance et relève. Toute mise en production demeure une procédure séparée à approuver après recette finale isolée.
