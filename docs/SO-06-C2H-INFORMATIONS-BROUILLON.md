# C2h — Informations M6 dans le brouillon central

24 octobre 2026. Tranche additive de la PR #1 après C2g. Aucun merge, déploiement, migration ou adoption de campagne.

## Parcours livré et sources

Le brouillon pouvait préparer des recettes M4, mais leur connaissance de déblocage restait une référence sans catalogue central. C2h ouvre la préparation privée des connaissances, indices et documents M6 et relie ces références au même brouillon.

Parcours : saisir un document et ses destinataires proposés → préparer les personnages manquants en M2 → sélectionner la connaissance depuis M4 avec le droit de lecture M6 → consulter les références et le contrôle commun. Archiver une connaissance signale le lien M4 ; la restaurer le résout sans réécrire la recette. Préparer un document ne l’attribue à aucun joueur et ne débloque aucune formule.

Sources : [CDC V3.5](source/SO_CDC_V35.md), §§3.1–3.6, 7 et 10, atelier M6 ; [règles V0.7](source/SO_Regles_V07.txt), « Informations, objets et confidentialité » ; [vade-mecum](source/SO_Vademecum_V01.txt), séparation préparation/contrôle/publication ; [gabarits documentaires](SO-00-V34-GABARITS.md), périmètre M6. Le format natif existant `knowledgeInput` est réutilisé. Aucun exemple de contenu ni condition fictive des tests ne devient une règle canonique.

## Format, commandes et limites

Les changements `knowledge_{id}` résident dans `campaigns/{id}/masterDrafts/initial/changes`. Commandes `saveCentralKnowledge` et `archiveCentralKnowledge`, identifiant stable, révision commune et révision du contenu, motif, identifiant de requête, reçu de commande et audit existants. Une restauration est une sauvegarde auditée. Aucun effacement en cascade.

| Champ | Contrat de préparation |
|---|---|
| `kind` | `KNOWLEDGE`, `CLUE` ou `DOCUMENT` |
| `title`, `body`, `origin` | Titre 150, corps 20 000, origine 300 caractères maximum |
| `shareMode` | `SHOW` ou `COPY` : intention conservée, aucun partage effectué |
| `gmTruth`, `gmNotes` | Textes privés, 10 000 caractères chacun |
| `initialCharacterIds` | Destinataires initiaux proposés, références aux définitions M2 |
| `qrEnabled`, `qrAudience`, `qrCharacterIds` | Proposition de découverte, audience `ALL_PLAYERS` ou `SELECTED`, sans QR actif |
| `qrSkillId`, `qrSkillLevel` | Condition proposée ; compétence absente → niveau nul, compétence présente → entier de 1 à 5 |

Les champs de publication, session, compte ou ressources fournis par le client sont refusés. Le serveur impose `publicationState:DRAFT`, sa révision et `masterArchived`. Aucun schéma parallèle n’est introduit pour les trois catégories d’information. Le formulaire neuf propose un document, partage SHOW, découverte désactivée, audience SELECTED, listes et compétence vides.

Limites techniques, sans portée de règle de jeu : **250 informations**, archives comprises ; **100 destinataires par liste**, identifiants uniques ; **96 Kio par définition**, y compris les textes multioctets. Le contrôle commun passe de 909 à **1159 changements**. Budgets de 16 Mio de contenu et 4 Mio de rapport inchangés, refus explicite sans troncature.

## Droits, confidentialité et références

L’édition M6 exige lecture M6 et délégation centrale explicite ; un rôle de session n’accorde pas cette permission. Autorité et cycle sont vérifiés avant toute restitution d’un reçu de commande. Révoquer le droit interdit également le réessai d’une ancienne commande.

| Relation | Lecture nécessaire et résultat |
|---|---|
| M6 → destinataire M2 | Lecture M2 ; absence ou archive localisée à l’index de la liste |
| M4 → connaissance M6 | Lecture M6 ; absence, archive ou résolution contrôlée |
| M6 → compétence | Identifiant conservé ; catalogue canonique et conditions encore `REFERENCE_PENDING` |

Sans lecture croisée, aucune requête du catalogue concerné et aucun nom, existence ou état d’archive révélé : `REFERENCE_NOT_CHECKED`. M4 reçoit seulement ID, titre, type, état, révision et source M6, jamais corps, vérité, notes ou destinataires. M6 reçoit seulement les métadonnées minimales autorisées des personnages, sans secrets, plans initiaux ou admissions. Une révocation ne retire pas une information déjà consultée.

Les deux listes proposées sont conservées et contrôlées même si la découverte est désactivée ou l’audience change. Une découverte activée avec audience SELECTED et liste vide est signalée ; aucun destinataire n’est inventé. Une définition d’une autre campagne ou une instance de session ne résout pas le lien.

## Contrôle commun et import existant

Le contrôle transactionnel C2a/C2b valide le format natif, la provenance et les liens typés. Une connaissance corrompue ne résout pas une référence M4 ; un personnage corrompu ne résout pas un destinataire M6. Les homonymes de types différents restent distincts. Résumé global sans reproduction des textes privés ou listes de destinataires ; pas de rapport persistant ni écriture de jeu.

Empreinte interne portée de 4 à **5** : relancer le contrôle après mise à jour. M6 reste **PARTIAL** et `publicationAvailable=false`. Sont encore absents : cibles terrain, découverte/QR actifs, règles complètes des compétences, attribution et partage, déblocage réel des recettes, import/export M6 et publication globale. Les services historiques d’attribution et de QR ne sont pas appelés.

L’aperçu et la confirmation Excel M4 contrôlent désormais `connaissance_id` sous lecture M6, avec provenance fichier/feuille/ligne/colonne. Une modification M6 invalide l’aperçu M4 par la révision commune. Un import M2 peut résoudre les destinataires sans modifier M6. Aucune provenance XLSX M6 n’est acceptée tant que son contrat n’est pas livré.

## Validation et reprise

26 nouveaux cas métier partagés mémoire/Firestore : droits et non-lecture étrangère, trois catégories, références différées, absence d’attribution, formats et limites, audience et compétence, archive/restauration, audit et réessais, révocation, concurrence M2/M4/M5/M6, corruption et homonymes, provenance, imports, isolation, interruption atomique et gardes de cycle. Six tests UI couvrent rendu échappé, révisions, valeurs initiales prudentes, listes conservées, suggestions minimales, sélection M4 et archive/restauration. Un parcours HTTP/Auth complète le raccordement, la confidentialité et la révocation.

**Local, 24 octobre 2026 : compilation et 1147/1147 tests applicatifs réussis**, zéro échec/annulé/ignoré/todo, Node 24.22.1 / npm 11.9.0. Syntaxe des fichiers d’intégration vérifiée. Firebase non exécuté localement (Java 17) : les résultats définitifs du commit exact, Node 22/Java 21, sont à consigner dans la [PR #1](https://github.com/gkerckhofs-a11y/gn-engine/pull/1) après terminaison des deux CI. Tests HTML/logique, sans recette visuelle navigateur, mobile ou terrain.

Première CI C2h sur `27d250ba1a389269419156b679f41c10a01eafd6` : compilation et 1147 applicatifs réussis dans les deux exécutions, 910/911 intégrations réussies. Un ancien test HTTP M4 attendait deux références non contrôlées, sans tenir compte du nouveau lien M6. L’attente est corrigée en vérifiant précisément les trois champs, puis le seul champ M6 restant sans droit après délégation M1. Aucun contrôle applicatif retiré ou assoupli. Les 26 nouveaux cas Firestore et le nouveau parcours HTTP M6 ont réussi. Une nouvelle CI complète du correctif reste nécessaire ; [push initial](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40118253254) et [PR initiale](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/40118257933).

Base distante C2g `fad9bc4ed8be49087b19ef3a7a5de066b0161537` : deux CI vertes revérifiées avant ce lot, 1115 applicatifs et 884 Firebase chacune ; preuves [archivées](PR-1-HISTORIQUE-AVANT-C2H.md). Ces résultats historiques ne sont pas une validation de C2h.

Quatre Masters historiques CAMPAGNE/SESSION, sources canoniques, dépendances, workflows, règles/index Firebase et marqueur de déploiement inchangés. Sauvegarder l’ensemble cohérent campagne/préparation/brouillon/changements/historiques/délégations/reçus, y compris `knowledge` et grants M6. Les exports ciblés M1/M2/M4 ne sauvegardent pas M6. C2g ne connaît pas ce type au contrôle ni son édition centrale : un retour logiciel n’est pas fonctionnellement équivalent. Ne supprimer aucune définition pour le permettre. Aucune migration ou restauration complète exécutée.

Preuves préparatoires supplémentaires pour la confidentialité, les références interateliers et leur contrôle ; aucune recette complète de publication, mission M7 ou terrain n’est certifiée. Les 55 verdicts complets et SO-GAP-12/13/14 restent inchangés. Compléter les contenus et contrôles centraux requis avant publication globale, I3/I4/I5 et recette humaine.
