# Version 0.5 — connaissances, indices et découverte par QR

19 octobre 2026. Extension partielle du lot B, de CON-01/02, QR-01/02, INF-01/03 et REC-04/09. Aucun lot complet n'est déclaré terminé.

## Fonctionnalités livrées

- Bibliothèque de textes de type connaissance, indice ou document : titre, corps, origine fictionnelle, vérité MJ et notes MJ séparés. États brouillon/prêt/publié. Aucun label vrai/faux n'est transmis au joueur.
- Attribution de départ à une sélection explicite de personnages du scénario. Les connaissances sont figées avec la version, puis copiées en session. Seuls les textes publiés donnent un reçu initial. Un brouillon publié plus tard nécessite une attribution MJ explicite.
- Reçu personnel au personnage et à la session : texte exact, révision, origine, mode d'acquisition, date et état de lecture. Les modifications ultérieures du modèle ou du texte de session ne remplacent pas les reçus existants. Une copie transmet le texte réellement reçu par son auteur.
- Révélation ou retrait par le MJ vers un personnage explicitement choisi, avec motif et valeurs avant/après. Réattribuer remplace son reçu par la version actuelle et remet la lecture à confirmer. Le retrait bloque lecture, redécouverte et réception d'une nouvelle copie jusqu'à une réattribution MJ. Il ne supprime pas les copies déjà transmises à d'autres personnages.
- Dépublier masque les lectures du contenu, y compris son titre dans la liste. Interdire la copie bloque les nouvelles transmissions. Un ancien reçu non partageable ne devient pas partageable par simple modification du catalogue.
- Découverte réutilisable par QR pendant EN_JEU seulement : tous les personnages ayant un accès personnel actif, ou une sélection explicite. Connexion Google vérifiée, inscription acceptée, attribution active, authentification suffisamment récente, personnage publié et conditions du QR sont revérifiés côté serveur. Le QR identifie la cible ; il ne prouve pas une présence physique et ne représente pas un objet unique ou épuisable.
- Copie numérique autorisée ou lecture montrée sur place uniquement. Le joueur colle le lien d'un badge public de la même session et confirme le nom du destinataire. Aucun annuaire privé ni liste de détenteurs ne lui est fourni. L'auteur garde son texte et son accès ; le destinataire voit le nom de personnage de l'auteur, jamais ses coordonnées de compte.
- Les nouvelles copies et découvertes sont fermées hors EN_JEU. Les lectures et confirmations de lecture restent possibles au briefing, en pause et en fin de jeu. L'archivage ferme ces accès. Un réessai déjà réussi retrouve son résultat si les droits actuels restent valides.
- Écran « Mes informations », tri antéchronologique, filtres type/lu/non lu, lecture détaillée et confirmation explicite de lecture. La confirmation compare la révision du reçu affiché : une fiche ouverte avant une réattribution ne peut ni marquer la nouvelle version comme lue, ni la transmettre à la place du texte affiché. Aucun effet de lecture ou de partage dans l'aperçu MJ.
- Le rôle Accueil ne reçoit ni bibliothèque, ni reçu, ni historique. Les secrets, règles de découverte, destinataires et vérité MJ ne figurent jamais dans les projections joueurs ou badges publics.

## Vérifications

- `npm test` : 71 tests métier/interface réussis, dont 15 parcours de connaissances partagés avec les tests Firestore et 2 tests de rendu/validation des badges.
- `npm run test:emulator` : 54 tests réussis sur la version finale, soit 125 tests au total avec la suite métier/interface. Exécution uniquement dans `demo-gn-engine` avec Auth et Firestore, Java 21.
- Les nouveaux cas couvrent fragments distincts, projections sans vérité MJ, aperçu neutre, copie explicite, QR conditionnel, compte non vérifié, autre session, modification de requête, concurrence, réessai, retrait, dépublication, snapshots, rôles, lecture personnelle, phases, versions de scénario et nouvelle session sans acquis précédents.
- Les essais HTTP utilisent la véritable fonction exportée et les jetons de l'émulateur Auth : absence de contenus dans la projection Accueil, refus des routes privées, refus des accès anonymes et lecture de l'historique réservée au MJ.
- Aucun contenu, personnage, compte de test ou partage ajouté dans la production. La recette complète des formulaires privés avec plusieurs comptes Google réels reste à faire.

## Parcours MJ

1. Dans le scénario, ouvrir **Connaissances**, créer un texte et renseigner séparément la présentation joueur et les données MJ.
2. Choisir le partage, les personnages connaissant le texte au départ et, si utile, les conditions de découverte QR. Publier le texte avant de figer la version et créer la session.
3. Dans la session, **Modifier** ne réécrit pas les reçus existants. **Attribuer / retirer** choisit un seul personnage, affiche son état actuel et exige un motif.
4. Utiliser **Voir comme le joueur → Voir ses informations** pour vérifier la projection exacte, sans confirmer sa lecture.
5. Pour un contenu publié avec découverte activée, afficher le **QR de découverte** et le placer selon les règles du scénario. La caméra du téléphone peut ouvrir ce lien ; aucun lecteur caméra intégré n'est livré.
6. Consulter **Historique** pour les 30 dernières éditions et interventions, avec auteur, date, motif et états avant/après.

## Stockage et concurrence

La bibliothèque vit sous `scenarios/{id}/knowledge`, ses versions figées puis `sessions/{id}/knowledge`. Les reçus privés vivent sous `sessions/{id}/characters/{characterId}/knowledge/{knowledgeId}`. Il n'existe aucun accès direct client à ces collections.

Le reçu conserve une projection strictement limitée aux champs destinés au joueur, construite avant stockage. L'API vérifie le document publié et les droits actuels à chaque lecture. La préparation du partage ne retourne que le titre déjà connu, le nom public du destinataire choisi et le nom de personnage de l'auteur.

Chaque mutation, reçu, résultat idempotent et journal concerné est écrit dans la même transaction. Les droits sont vérifiés avant le cache de résultat. Les éditions comparent la révision du scénario/de la session. Les interventions comparent aussi la révision du contenu et celle du reçu : deux MJ ne s'écrasent pas silencieusement. Une découverte répétée ou une copie déjà reçue ne remplace pas l'original, ne remet pas la lecture à zéro et ne révèle pas à l'expéditeur si le destinataire possédait déjà le texte.

Les révocations empêchent les nouvelles consultations, sans prétendre effacer un souvenir, une photographie ou une copie antérieure. Aucun cache privé hors ligne ni accès Storage ajouté.

## Limites restantes

- Notes personnelles CON-03, pièces jointes privées/Storage, transfert d'un document unique, nouvelles versions écrites par le joueur, compétences/langues comme conditions mécaniques, présence confirmée et épuisement d'une cible restent à réaliser.
- Diffusion à plusieurs personnages/groupes, programmation, notifications poussées et fil unifié avec les messages de groupe restent à réaliser. Le partage actuel vise un seul personnage explicitement choisi.
- L'historique MJ est limité aux 30 dernières entrées. Les listes de connaissances et reçus n'ont pas encore de pagination ; charge, volume des snapshots et taille des transactions de création de session restent à mesurer.
- Aucun calcul de vérité, de loyauté ou de réussite d'une fouille. Pas d'annuaire de résistants ni de données Port-Brèche préchargées.
- Navigation mobile complète à quatre entrées et recette de tous les formulaires privés dans de vrais navigateurs restent à valider. Les tests de rendu ne les remplacent pas.

## Publication

Le commit de cette version demande le déploiement Firebase via le workflow autorisé. La preuve GitHub Actions et le contrôle du site publié sont ajoutés après leur réussite.
