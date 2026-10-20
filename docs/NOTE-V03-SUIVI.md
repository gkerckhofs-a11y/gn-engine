# Reprise du développement — note Port-Brèche V0.3

Source : demande et note fonctionnelle fournies par Guilz le 20 octobre 2026, conservées dans [la note source](source/port-breche-engine-note-v03.md). Base inspectée : commit GitHub `bd670dea159c5c7f01cfe83f8fcba9b81657dd44`, version 0.20. Les statuts ci-dessous décrivent le code, pas une validation terrain.

## Lot 0.21 : PA et récupération des soins existants

Le tableau de bord du scénario et de la session propose « Points d’action et niveaux globaux ». Le MJ prépare une modification, relit les valeurs et les personnages concernés, puis confirme. Les interventions de session demandent un motif privé.

- Module facultatif, désactivé pour les scénarios existants tant que le MJ ne l’active pas. Valeurs proposées : niveau global 1 = 5 PA, niveau 2 = 8 PA, renouvellement complet toutes les 300 minutes de jeu, coût 1 PA, récupération 600 secondes. Aucun plafond supplémentaire n’est inventé.
- Le niveau global est indépendant des niveaux des compétences. Il peut être attribué dans le scénario ou corrigé en session. La hausse du plafond ne remplit pas les PA ; la baisse réduit le disponible sans toucher aux PA réservés.
- Renouvellement calculé sur l’horloge de session, arrêté pendant les pauses. Les cycles manqués ne se cumulent pas. Une reconnexion ne distribue rien. Le premier cycle part du début de la session ; activer en cours de jeu initialise les réserves une fois et conserve ce calendrier commun.
- Une modification de période conserve la prochaine échéance puis utilise le nouvel intervalle. À 4 h 40, passer à deux heures donne des échéances à 5 h puis 7 h. Un remplacement explicite de l’échéance exige une date future en minutes de jeu.
- Correction ou remise au plafond distincte, motivée et unique, sans déplacer l’échéance. Changer les règles ne déclenche pas de recharge supplémentaire.
- Un soin instantané existant consomme son PA, son consommable, son usage et ses effets dans la même transaction. Le dernier PA ne peut pas financer deux actions concurrentes. Un réessai réseau retrouve son résultat sans dépenser de nouveau.
- L’éditeur du soin permet récupération personnelle, récupération du patient commune à tous les soins de terrain, ou aucune récupération pour le soin en clinique. La portée est explicite ; aucun nom ou identifiant de compétence n’est deviné. Le délai de terrain ne bloque pas la clinique. Les échéances déjà déclenchées sont conservées après changement des paramètres ou du profil.
- Les écrans personnage et soins affichent la réserve et le prochain renouvellement. Les confirmations de soin montrent le coût et le disponible avant/après. Les PA privés restent absents du badge et du rôle Accueil.
- Les règles et niveaux sont copiés dans les versions de scénario et exportés/importés dans les archives existantes. Cela n’est pas encore un import Sheets de campagne ni une sauvegarde de session.

Les primitives de réservation, résolution et libération des PA sont testées, notamment à travers une échéance. Les soins restent instantanés dans ce lot : il n’existe pas encore d’action chronométrée pouvant être lancée, interrompue puis reprise. Aucun coût n’est ajouté aux paiements, remises, lectures ou déclarations de dégâts.

## Correspondance avec les exigences de la note

| Exigence | État après ce lot | Suite nécessaire |
| --- | --- | --- |
| GN-01 | Scénario et sessions indépendantes existants | Ajouter la campagne persistante et le choix du mode. |
| GN-02 | Archives de scénario existantes ; PA et niveau global inclus | Master de campagne XLSX, dictionnaire et exemple validé. |
| GN-03 | Paramètres de session et catalogues existants | Master de session complémentaire avec identifiants durables. |
| GN-04 | Vérification des archives avant création existante | Import complémentaire sans écraser les acquis, archivage et journal d’import. |
| GN-05 | Non couvert par la continuité actuelle | Clôture, conservation de l’état, reprise et exclusion de sessions simultanées. |
| GN-06 | Crédits, objets, profils, PV et maintenant PA/niveau global | XP et progression de campagne, prérequis avancés. |
| GN-07 | PA, horloge, pauses, plafonds, renouvellement, soins | Famille FOUILLE et raccordement aux autres actions. |
| GN-08 | Réglages en session, aperçu, échéances stables, corrections | Migration explicite des actions engagées, journal consultable dédié et reçus hors réseau. |
| GN-09 | Soins instantanés et coûts atomiques | Exécuteur commun avec durée, D6, bonus, effets, interruption et règles figées au lancement. |
| GN-10 | Récupération du patient et protection contre les doubles dépenses | Fouilles, pillage, quotas, soins en deux étapes, installations, aide, DIRECT/DISCRET. |
| GN-11 | Marché, comptes, ventes et retrait physique existants | Gros/détail, négociation commerciale, cours, entrepôts, douanes et corruption. |
| GN-12 | Lots et remises existants | Ouverture explicite des recharges et suivi de leur stock physique. |
| GN-13 | Groupes, caisses et mandat de mission existants | Droits distincts sur les stocks, les ventes et les départs. |
| GN-14 | Annonces, candidatures, preuves et paiement personnel/collectif existants | Compléter selon la recette finale de la note. |
| GN-15 | Non implémenté | Vaisseaux et trajets ; barèmes Port-Brèche à définir avant activation. |
| GN-16 | PA dans les écrans existants | Réorganiser en Mon personnage / Mon groupe / Action / Terminal, inventaire unifié et scan. |
| GN-17 | Médiathèque et images présentes en 0.19–0.20 | Activation du stockage selon sa procédure existante et recette sur les contenus réels. |
| GN-18 | Inscription, invitation, attribution, révocation et aperçu existants | Retrouver le même personnage d’une campagne et compléter le pack sans smartphone. |
| GN-19 | Tests ajoutés pour ce lot | Recette complète avec campagne, masters, terrain et plusieurs comptes réels. |

## Ordre de reprise proposé

1. Socle PA livré en 0.21 et vérifié sur Firestore/Auth : 777 tests réussis et publication contrôlée. Recette terrain encore nécessaire.
2. Introduire la campagne persistante, sa clôture et sa reprise sans remettre les soldes à zéro.
3. Définir et fournir les deux masters XLSX, puis les imports complémentaires avec aperçu et protection des acquis.
4. Construire l’exécuteur d’actions : fouilles, durée, D6, objets bonus, soins complets, sabotage et réservations.
5. Réorganiser les quatre espaces joueur et compléter l’économie, les entrepôts et les recharges.
6. Traiter le spatial après définition de ses règles, puis réaliser la recette terrain.

Les montants économiques, les plafonds au-delà du niveau 2, les durées du GN, la portion de billes par recharge et les barèmes spatiaux restent des décisions de jeu. Cette reprise n’en fixe aucune implicitement.
