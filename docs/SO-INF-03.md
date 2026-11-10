# Space Outlaws — INF-03 : falsification fictive, première tranche

Date : 9 novembre 2026. Sources : SO_Regles_V07.txt chapitre 14 ; SO_CDC_V35.md §5.1 et annexe A.3.

## Objet du développement
Raccorder une fabrication de documents de jeu à partir des **modèles M6** et des **formulaires vierges M1**, sans introduire de droits réels ou d'effets douaniers non prévus.

- Un nouveau lieu/modèle `fieldTarget` de type `FORGERY` est préparé dans M6, avec catégorie : RECEIPT N1, MANIFEST N2, LICENSE N3, ORDER N4, EXCEPTIONAL N5. Des niveaux minima plus élevés sont permis, pas plus bas. `SHIP_IDENTITY` n'est pas permis.
- Le modèle référence un identifiant stable d'item M1. La publication vérifie l'existence de l'item et son caractère consommable. Compatibilité expresse pour les anciens modèles du slot de kit initial Infiltrateur `blank-forms`, historiquement non marqués `consumable`. Ces deux formulaires de départ sont néanmoins consommés à la fabrication, sans modification des Masters publiés.
- Chaque modèle est accessible via son QR placé dans un atelier de fiction. Le jeu exige la présence physique déclarée au lieu, un niveau INF-03 suffisant, un formulaire vierge personnel disponible, et une cible non occupée.
- Le démarrage réserve 1 PA, le formulaire et l'action sur la cible. Durées canoniques 300/270/240/210/180 secondes de **temps de jeu** selon N1 à N5.
- Résolution au D6 côté serveur : 1D6 + niveau INF-03 contre le seuil préparé M6, sans critique automatique. Le jet consomme un PA et un formulaire quelle que soit l'issue, avec récupération personnelle de dix minutes de jeu.
- Succès : crée **une seule unité** d'un objet INDIVIDUAL dans l'inventaire, avec titre et texte fictionnels, identifiant distinct, historique d'origine et traçabilité. Un registre `forgeryRecords` séparé, non projeté dans `publicLot`, garde le niveau de fabrication (qualité), les anomalies de contrôle et l'identifiant du modèle.
- Échec : ni objet ni registre de faux créé. Le formulaire est consommé. Annulation avant résolution : restitution du PA et libération du formulaire ; aucune récupération.
- Permissions, empreinte de la requête et transactions verrouillent double clic, changements de cible et état périmé. Aucune fusion, migration ni publication Firebase.

## Limites et recette nécessaire
- Aucun document de fiction ne confère une permission serveur, un mandat, une identité authentifiée, une propriété réelle ou une habilitation MJ.
- **Le protocole spécifique d'identité falsifiée de vaisseau (MEC-02, INF-03 et arbitrage MJ)** reste distinct. Une réussite INF-03 ne remplace jamais le transpondeur ou l'inspection douanière.
- Les falsifications ne sont pas encore automatiquement examinées par TRA-03 ou la douane. Les anomalies et la qualité existent comme preuves privées pour une future intégration sans réattribuer rétrospectivement les résultats.
- La présence au décor, l'usage des formulaires physiques, l'authenticité narrative et l'interprétation des anomalies demeurent des décisions du MJ.
- Une recette de transferts, pillages, objets multiples, anciens Masters, sauvegarde, Android/iOS et charge reste indispensable avant toute publication.
- Les nouveaux modèles sont éditables dans M6 sur le Web, **pas encore certifiés pour l'import/export XLSX**. Une vérification spécifique du round-trip Excel serait nécessaire.
- La CI ciblée certifie son propre périmètre seulement. Attendre une CI verte sur le SHA exact ; tests complets et recette avant fusion.

## Tests ciblés
Les suites doivent couvrir succès, échec, D6/PA, durée, formulaire de départ historique, annulation/réessai, niveau minimal, catégories, droits, STOP, création unique, absence de divulgation de la qualité et des anomalies, historique, transactions concurrentes et anciennes versions.

La première livraison du lot n'inclut **aucun déploiement**.

## Extension : contrôle des faux par le MJ (candidat)

Une régie INF-03 permet au MJ autorisé de saisir l'identifiant du lot présenté et de consulter sa provenance, la qualité de fabrication et les anomalies préparées. La vérification lit le registre privé `forgeryRecords` et ne révèle jamais ces données au joueur. Le lot reste un objet fictif ; aucun droit informatique, mandat ou résultat douanier automatique n'en découle. Contrôler la CI du SHA exact avant validation.

## Complément : remise traçable des faux (candidat)

- Le transfert de lot dans Space Outlaws reste **fermé par défaut**. Une capacité serveur circonscrite à `FORGERY_TRANSFER` autorise uniquement les lots individuels issus d'INF-03 et pourvus d'un registre privé cohérent ; aucun autre kit ou objet n'est libéré par cette extension.
- La remise complète conserve l'identifiant de lot, l'origine du faux, la qualité et les anomalies privées, quel que soit le détenteur. Aucun partage ni duplication du registre MJ.
- Dans le sac, la commande « Remettre à un joueur » ne s'affiche que pour un lot éligible à la remise ; la projection ne révèle ni qualité, ni anomalies, ni provenance secrète.
- Les remises existantes demandent toujours accord explicite du destinataire, restent annulables et sont journalisées. Un lot avec registre manquant ou incohérent ne peut pas être transmis.
- Le MJ peut consulter les vingt dernières remises du lot dans le contrôle INF-03, avec détenteur actuel, qualité et anomalies. Cela ne produit **aucune décision automatique de police, de douane ou de légalité**.
- Tests ciblés de création/remise/refus/confidentialité sur deux joueurs et un MJ ; tests sur appareils réels et recette d'animation encore nécessaires. CI du SHA exact à vérifier.
