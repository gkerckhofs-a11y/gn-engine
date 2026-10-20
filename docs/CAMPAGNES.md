# Campagnes persistantes — version 0.22

Spécification réalisée le 20 octobre 2026 à partir des exigences GN-01 et GN-05 de la note Port-Brèche V0.3. Le [rapport de validation](VALIDATION-0.22.md) distingue code testé, publication et recette terrain.

## Commencer une campagne

Dans une version figée du scénario, choisir **Créer une session**, puis **Premier épisode d’une nouvelle campagne**. Renseigner le nom de campagne et les informations de l’événement. Vérifier le récapitulatif, puis confirmer. Les dotations de la version ne servent qu’à cet épisode initial. Le mode **Partie indépendante** conserve son fonctionnement antérieur.

Le tableau de bord propose ensuite **Vos campagnes**. Le propriétaire crée la campagne et ses épisodes. Un MJ délégué peut préparer et valider la clôture de sa session ; cette délégation ne lui ouvre pas les autres épisodes. Le rôle Accueil ne reçoit pas les bilans privés de campagne.

Cette version ne transforme pas rétroactivement une session indépendante existante en campagne. Elle ne modifie aucune session existante à son installation.

## Valider un état de fin

1. Mettre le jeu en pause s’il est lancé. La clôture peut également terminer un épisode encore en préparation, en briefing ou déjà terminé.
2. Dans la régie, ouvrir **Préparer le bilan de clôture**, saisir un motif, puis examiner les personnages, soldes, PV, lots et connaissances.
3. Régler ou annuler les contrats et primes encore ouverts. Les achats déjà payés doivent être remis ; les crédits, PA ou stocks encore engagés bloquent la clôture. Les contrats ne sont pas reportés automatiquement dans cette version.
4. Pour les offres non acceptées, confirmer explicitement leur annulation : annonces du marché, ventes privées proposées et remises proposées. Le stock réservé au marché redevient disponible. Aucun achat payé n’est annulé par ce choix.
5. Confirmer un bilan à jour. Toute modification d’état survenue depuis son aperçu oblige à en préparer un nouveau. La session est alors archivée et scellée ; elle devient le dernier état validé de la campagne.

Le bouton **Revenir à la pause pour régulariser** permet à un MJ de rouvrir une session terminée mais non scellée, avec un motif. Il peut ensuite reprendre le jeu pour effectuer une remise. Une fois scellé, l’épisode ne peut plus être modifié. Les historiques restent rattachés à leur session. Le propriétaire conserve la possibilité de retirer une délégation d’équipe sur une session scellée, sans changer son bilan.

## Préparer l’épisode suivant

Depuis la campagne, choisir **Préparer l’épisode suivant**. Renseigner les informations d’inscription de ce nouvel événement et choisir explicitement la politique de blessures :

- **Conserver** : PV, maximum et état hors combat restent identiques.
- **Rétablir** : les PV reviennent au maximum propre à chaque personnage et l’état hors combat est levé.

L’aperçu montre les valeurs avant/après. La préparation reprend l’état validé, jamais les dotations du scénario initial. Elle avance par étapes ; si le navigateur ou le réseau s’interrompt, revenir à la campagne et choisir **Reprendre la préparation**. La nouvelle session n’est accessible qu’après copie complète. La reprise ne repaye rien et ne recopie pas deux fois les mêmes lots.

Une campagne ne peut avoir qu’un épisode ouvert ou en préparation à la fois. Le verrou vaut aussi pour une session en préparation : deux copies concurrentes ne peuvent pas dépenser les mêmes acquis.

Les liens d’inscription, invitations et QR restent propres à la nouvelle session. Les identifiants de personnages sont conservés, mais les anciens liens de la session archivée ne donnent pas accès à l’épisode suivant.

## État conservé et éléments de session

| Élément | Traitement |
| --- | --- |
| Personnages | Identifiants stables, textes privés, classe et profil de compétences attribué, niveaux globaux et images conservés. |
| Crédits | Soldes personnels et collectifs repris ; écriture de continuité à variation zéro, sans nouvelle création de monnaie. |
| Objets | Identifiants, quantités, états, propriétaires, détenteurs, emplacements et images conservés. Les lots consommés restent consommés. |
| Connaissances | Catalogue courant et reçus individuels conservés, y compris les versions reçues et les accès retirés. |
| Groupes | Membres, droits, caisses et messages conservés ; chaque ancien message garde ses destinataires d’origine. |
| PV | Politique choisie et prévisualisée pour ce nouvel épisode. Aucun soin implicite. |
| PA et récupération | PA pleins au niveau global conservé ; nouvelle horloge et nouveau calendrier de renouvellement. Usages par session, délais personnels et délai de soin du patient remis à zéro. Une simple reconnexion au même épisode ne réinitialise rien. |
| Inscriptions et accès | Nouvelles inscriptions, attributions et invitations. Le rôle précédent peut être proposé à l’organisateur, sans accès automatique. |
| Missions et offres | Missions engagées à régler ou annuler avant clôture. Offres non acceptées annulables explicitement. Les annonces et conversations commerciales ne sont pas republiées dans le nouvel épisode. |
| Notes personnelles | Restent dans leur session d’origine ; elles ne sont pas transmises au nouveau titulaire d’un personnage. |
| Historiques | Conservés dans la session source ; provenance de la reprise enregistrée dans la campagne et le nouvel épisode. Ce mécanisme n’est pas un export de sauvegarde. |
| Équipe organisatrice | Délégations propres à chaque session, à attribuer de nouveau. |

Le moteur ne développe pas encore un barème XP, les dettes, le spatial, les fouilles ou les états avancés absents du lot précédent. Leur continuité sera raccordée lors de leur implémentation. Depuis la version 0.23, les masters complémentaires et le bouton « Ajouter un personnage » permettent de compléter le nouvel épisode en préparation. Les dotations des anciens personnages ne sont pas réappliquées. Voir [Masters](MASTERS.md).

## Garanties et limites d’exploitation

Les commandes vérifient l’identité et les droits actuels avant de restituer un résultat mémorisé. La clôture est atomique. Un contrôle commun à tous les services bloque les écritures dans les données d’une session scellée, y compris une ancienne commande ou une transaction concurrente.

L’état durable repose sur une référence à la dernière session scellée. La préparation suivante copie cet état par pages, garde les images référencées et ne publie la session qu’à la fin. Les identifiants de personnage et de lot restent les mêmes à l’intérieur de cette campagne ; les sessions continuent d’isoler leurs accès et leurs opérations.

Limites explicites de ce lot : 5 000 enregistrements de reprise et 6 Mio de données sérialisées ; 30 enregistrements ou environ 250 ko par étape de copie ; un enregistrement supérieur à 800 ko est refusé avant création. Une clôture nécessitant plus de 200 mises à jour d’offres/stock est refusée : retirer une partie des offres avant de refaire le bilan. Ces seuils protègent le traitement ; ils ne constituent pas une mesure de performance.

La préparation commencée est reprenable ; son abandon avec purge des données temporaires n’est pas encore proposé. Pas de sessions simultanées dans une campagne, de restauration complète, de conversion d’une ancienne session indépendante ni de copie de campagne de test dans ce lot. La création d’une partie indépendante depuis le scénario reste possible pour les essais.
