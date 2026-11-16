# Connaissances galactiques — audit et retrait de l'accès global

Auteur : Codex. Date : 16 novembre 2026.
Source faisant autorité pour ce chantier : [instruction intégrale de Guillaume](source/SO_Galactic_Knowledge_2026-11-16.md), fournie comme pièce jointe « Texte collé(6).txt ».

## Décision et statut exact

Cette instruction remplace la distribution automatique de tous les codes proposée plus tôt dans la PR #46. Elle ne remplace pas l'accès à l'outil Carte par la compétence PIL-01, ni les contrôles natifs de vol. Un Courtier peut détenir et transmettre une information sans acquérir une compétence de pilotage. Le bonus de PV Combattant reste annulé ; la simplification du Terminal est conservée.

**Tranche 1 : audit effectué et ouverture globale de la carte retirée. Le Carnet galactique et les tranches 2 à 6 ne sont pas encore implémentés.** Il ne faut ni publier cette PR comme livraison complète du nouveau chantier, ni présenter les tests historiques comme sa validation.

Base main contrôlée : `98a3342d6f9c789f2edcc2c75faf1776296d7171`. PR #46 avant ce changement : `2eef994b7e6a9b2f58ba10e644eb317ec7d442f3`. PR #45 (compétences, interventions et modules) ouverte, non modifiée. Aucun changement en production.

## Audit des composants réutilisables

| Besoin | Preuve dans le dépôt | Couverture et écart |
|---|---|---|
| Informations privées | `src/core/knowledge.mjs`, `knowledgeInput`, `knowledgeSnapshot`, reçus sous `characters/{id}/knowledge` | Texte, identifiant, détenteur, provenance, date, révision, révocation et règle SHOW/COPY existent. Pas de lien structuré destination/route/marché ni de qualité/expiration galactique. |
| Attribution initiale individuelle | `central-knowledge.mjs`, M6 `initialCharacterIds` ; `space-outlaws-entry.mjs` | Les reçus sont déjà distribués individuellement à la naissance. Aucun tirage global nécessaire. Contrôle de 3–4 dossiers par personnage professionnel et diagnostic de complémentarité à ajouter. |
| Attribution/correction MJ | `grantKnowledge`, `knowledgeRecipients`, `knowledgeHistory` | Révision, motif, retrait et journal existent. La matrice personnage/destination/type et les filtres PC restent à construire. |
| Partage gratuit | `prepareKnowledgeShare` et `shareKnowledge` | Détention et restrictions de copie contrôlées ; copie conservée chez l'émetteur. Réception actuellement immédiate : il faut une proposition avec acceptation volontaire du destinataire pour le carnet. |
| Vente de renseignement | `knowledge-sales.mjs` | Achat PNJ déjà atomique avec portefeuille, reçu et journal natifs. Ce n'est pas une vente entre joueurs : montant négocié, vendeur joueur, offre volontaire et refus/expiration sont à raccorder. Ne pas détourner les trois tarifs PNJ canoniques. |
| PNJ, indices et compétences | `field-actions.mjs`, `space-merchant-analysis.mjs` | PIL-01, COU-01 et COU-03 remettent des reçus de contenus préparés ; quotas COU-03, PA et durée restent natifs. Le dossier structuré doit suivre ce reçu, pas créer un nouveau contact ou stock. |
| Carte | `galactic-map.mjs`, `knownMapNetwork`, `galactic-map-planning.mjs` | Filtre existant par codes présentés et analyses obtenues, coûts/autonomie/itinéraires natifs. Le remplacement par tous les ports/routes est retiré ici. La saisie de code reste le fonctionnement transitoire ; ce n'est pas encore un carnet serveur persistant. |
| Bourse | `planet-markets.mjs`, `price-state.mjs`, `shops.mjs` | Marchés activés et historiques publics ; pas encore de visibilité privée par dossier. Filtrer également les offres de boutique, détails, graphiques, devis et URL directes pour éviter un contournement. |
| Continuité | `space-outlaws-episodes.mjs`, racines `knowledge` et enfants `characters/knowledge` | Connaissances/reçus déjà repris. Qualité, validité, références stables et offres de transmission en cours doivent être éprouvées avec les nouvelles données. |
| Atlas public | ports de session/version, carte et M6 existants | Le nom public doit être séparé du code et des liaisons. Les ports techniques ne constituent pas automatiquement le catalogue narratif de 30 planètes. Schéma public à préparer explicitement. |

## Modèle de raccordement proposé pour les tranches suivantes

Étendre la définition M6 existante avec un bloc galactique typé, sans second stockage des connaissances : type NAVIGATION/COMMERCE/CONTACT, destination stable, références des routes ou marchés effectivement préparés, qualité CONFIRMED/REPORTED/RUMOR/EXPIRED, validité, provenance préparée et restrictions. Le reçu natif conserve l'instantané acquis. La lecture de ce bloc ne doit jamais exposer `gmTruth`, des destinataires privés ou une autre connaissance du catalogue.

L'autorisation exploitable doit être distincte du texte : une rumeur, un texte contenant un code ou un dossier commercial ne crée aucune route autorisée. Contrôler le reçu actif, sa validité, ses références et les conditions de session côté serveur. Une route acquise ne remplace jamais le mandat du vaisseau, les compétences ou les contrôles du cockpit.

L'Atlas public doit être configuré et versionné : nom et description publique seulement. Les vingt destinations restantes sont une validation narrative distincte, pas des valeurs à générer en production. Le document fourni annonce dix destinations décrites ; cette quantité n'est pas ici un inventaire vérifié de la base réelle.

Le niveau ne distribue aucun dossier : il reste utilisé uniquement par les analyses natives. Les contrôles d'attribution portent sur la dotation initiale (3 ou 4), pas sur un plafond du nombre de connaissances acquises pendant la campagne.

## Livraison ordonnée et critères de fin

1. **Audit et retrait de la contradiction — cette tranche.** Annuler tous-les-codes sans modifier données, voyages, PA ou crédits ; conserver PIL-01 pour l'accès à l'outil.
2. **Définitions et dotation MJ.** Extension M6, références vérifiées avant publication, choix de 3/4 dossiers par Pilote/Courtier, aucune attribution uniforme ou aléatoire ; affichage PC de la répartition, correction motivée et audit. Préserver les versions historiques.
3. **Carnet.** Atlas public, Mes routes, Mes marchés et contacts ; consultation personnelle, source/date/qualité/validité, compteur de destinations distinctes ; accès au carnet sans conférer la navigation ou le commerce.
4. **Échanges et découvertes.** Offre de partage gratuit ou vente, aperçu sans contenu secret, acceptation/refus ; paiement et copie atomiques, idempotence, concurrence, révocation recontrôlée. Relier les récompenses PNJ/QR/COU-03 aux mêmes reçus.
5. **Projections et permissions.** Carte filtrée par dossiers, Bourse public/acquis/privé ; vérifier détails et chemins indirects. Conserver les cours vraiment publics gratuits et les stocks/livraisons actuels.
6. **Continuité et recette.** Plusieurs personnages montent une expédition grâce à des informations complémentaires ; reprises d'épisode, échéances, correction MJ, aucun double débit ou enrichissement indu. Exécuter les 20 cas du cahier fourni et une recette navigateur.

## Éléments narratifs à fournir ou valider

Les recherches par noms exacts `SO_Classe_Pilote` et `SO_Classe_Courtier`, puis par noms simplifiés, n'ont pas permis d'identifier leurs fichiers sources autonomes. Le Livre des règles V0.7 ne sera pas modifié pour les remplacer. Les supports originaux seront nécessaires pour conserver leur ton et leur contenu. La définition des vingt destinations supplémentaires doit être validée séparément, conformément à l'instruction.

## Vérification de cette tranche

Résultats locaux : 41 tests Node ciblés, 15 tests Firestore et 1 test HTTP/Auth réussis sous Node 22 (Java 21 pour les émulateurs demo-gn-engine). Compilation réussie et git diff --check sans erreur. CI du parent 2eef994b : run 43844444736 encore en cours lors du contrôle ; aucune conclusion sur la CI du nouveau commit. Les tests concernent le retrait de l'accès global et le maintien des contrôles existants, pas le futur carnet. La recette Chromium reste non validée localement (environnement refusant une socket au démarrage du navigateur). Aucune fusion, aucun déploiement, aucune migration.
