# Validation 0.17 — primes ouvertes

Date : 20 octobre 2026. Statut : version 0.17.0 publiée et contrôlée.

## Parcours livré

1. Régie → Petites annonces : publier une annonce en mode Prime ouverte, récompense fixe, quota et échéance.
2. Financer la prime : saisir le montant unitaire et désigner un compte personnel, collectif ou un financement extérieur. Relire les conditions et le budget total avant confirmation.
3. Le budget entier du compte est réservé. L’annonce devient immuable : pour corriger ses conditions, clôturer puis créer une nouvelle annonce.
4. Joueur → Primes ouvertes : consulter les conditions, rédiger et confirmer une preuve. Aucune candidature préalable nécessaire. Un dépôt ne bloque ni place ni récompense pour son auteur.
5. Régie → Primes ouvertes : consulter les preuves privées ; demander un complément avant échéance, refuser définitivement ou valider une récompense.
6. Paiement atomique : une récompense au maximum par personnage, décrément de la réserve et du quota disponible, journal comptable. Une validation répétée ne crée pas un second paiement.
7. La clôture libère le reliquat du compte payeur et affiche le nombre de preuves en attente qui ne seront pas rémunérées. Les paiements déjà faits sont conservés. L’épuisement du quota ferme automatiquement l’annonce.

## Règles et limites explicites

- Récompenses personnelles uniquement. La représentation et le partage au nom d’une bande restent à développer.
- Montant entier fixe, saisi explicitement ; aucun prix issu du canon ou du texte narratif n’est supposé. Sans acompte, garantie ni pénalité automatique.
- Une prime financée ne se rouvre pas. Le refus définitif ferme la preuve de ce personnage pour cette prime ; une demande de complément autorise une nouvelle version avant échéance.
- L’ordre de dépôt ne constitue pas une priorité automatique : le MJ arbitre selon les conditions affichées. Les autres candidats ne voient pas les preuves ni les identités de leurs concurrents.
- Échéance réelle, même pendant les pauses, cohérente avec les annonces 0.15. Dépôt uniquement pendant EN_JEU et selon les permissions liées à l’état du personnage. Paiement d’une preuve déposée à temps possible en pause, après échéance ou en FINISHED, tant que la prime n’est pas close/épuisée.
- Pas de libération automatique à l’échéance : le MJ traite les preuves et clôture explicitement. L’archivage de session exige de clore les primes encore ouvertes.
- Le briefing réservé et les notes MJ de l’annonce ne sont pas communiqués par ce parcours. Les consignes nécessaires doivent figurer dans la description et les conditions publiques de la prime.
- Le compte payeur est autorisé par le MJ. Son titulaire ne peut réclamer sa propre prime. Le financement extérieur est une création de monnaie journalisée seulement au paiement.
- Une révocation ou réattribution bloque le paiement à l’ancienne identité et la reprise de sa preuve par le successeur ; le MJ peut refuser/clore et libérer les fonds.
- Les preuves sont des textes ; pas de pièces jointes, capture automatique, QR de terrain ni notification poussée. Consultation et actualisation depuis Primes ouvertes et Mes informations.
- Aucun changement des règles de combat, aucune donnée de production ou de canon injectée.

## Vérifications

Local : compilation réussie ; 353 tests métier/interface réussis sous Node 24.19.0. Le projet cible Node 22 ; la vérification GitHub utilise Node 22 et Java 21.

Nouveaux contrôles : réservation et fonds disponibles ; deux prétendants à la dernière récompense ; deux lauréats distincts ; conservation de monnaie ; versement et clôture concurrents ; rejeu idempotent ; restitution partielle ; financement extérieur ; refus/complément avec historique ; échéance en pause ; restrictions de santé et de phase ; archivage ; audiences ; séparation MJ/Accueil/joueur ; anonymat ; révocation/réattribution ; arrêt économique ; rollback en cas d’échec ; rendu échappé et confirmations financières.

La suite métier est exécutée également sur Firestore émulé. Un parcours HTTP utilise des jetons Google de test de l’émulateur Auth, de l’inscription au paiement et à la révocation. Résultats distants : **353 + 299 = 652 tests réussis**, sans échec, annulation ou test ignoré, dans le [run GitHub 39376274000](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39376274000), job `118475014804`, commit `787ffbdc3d17b768a0bb44aab6a4d1bb015a871a`. Journaux terminés consultés : tests métier/interface à 05:42:34 UTC, intégrations à 05:49:38 UTC (environ 411 secondes). Compilation réussie.

La recette réelle avec plusieurs comptes Google, appareils mobiles et une charge de 60/120 joueurs n’a pas été réalisée. REC-10 reste partiel.



## Publication vérifiée

- Commit applicatif : `787ffbdc3d17b768a0bb44aab6a4d1bb015a871a` ; commit de publication : `35156077cd4652fb00a8d44161ad48d77582bde0`.
- [Déploiement GitHub 39377091774](https://github.com/gkerckhofs-a11y/gn-engine/actions/runs/39377091774) terminé avec succès le 20 octobre 2026 à 06:00:02 UTC.
- Job de vérification `118477560323` : compilation puis **353 tests métier/interface et 299 intégrations réussis**, zéro échec, annulation ou test ignoré. Fin des intégrations à 05:57:53 UTC.
- Job de publication `118479484398` : fonction HTTP, règles/index Firestore et Hosting publiés. Installation Firebase terminée à 05:59:37 UTC.
- Contrôle en ligne terminé à 05:59:56 UTC : site HTTP 200, manifeste **0.17.0**, **110 commandes privées** refusées sans authentification avec HTTP 401 / LOGIN_REQUIRED. Résultats lus dans les journaux terminés.
- Application : https://gn-engine.web.app/.

Ces contrôles ne remplacent pas la recette avec de vrais joueurs, plusieurs comptes Google et des appareils mobiles. Aucune donnée de jeu ni de test n’a été créée en production pendant cette livraison.
