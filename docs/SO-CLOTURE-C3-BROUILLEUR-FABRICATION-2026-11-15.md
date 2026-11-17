# Space Outlaws — C3, brouilleur R04-01 : fabrication et pose

État : code sur la branche de travail et PR brouillon #45 ; aucune publication Firebase ni fusion.

## Préparation M1

Un modèle individuel R04-01 par gabarit lie trois références M1 distinctes : un plan individuel conservé, une ressource courante et un composant rare consommables, chacun doté d'une valeur de référence par unité. La publication refuse les références absentes, les coûts non divisibles en unités entières, et une offre de boutique pour le brouilleur ou le composant rare. La capacité de jeu R04-01 est portée uniquement par une nouvelle version qui contient ce modèle validé. Les versions existantes ne sont pas enrichies.

## Intervention en jeu

Le MJ propose une fabrication sur un vaisseau à quai avec un Mécano MEC-03 N4, un atelier déclaré, le plan et les deux lots physiques du propriétaire. Le propriétaire donne son accord. La proposition et l'accord ne consomment rien. Au démarrage personnel, le système réserve les trois lots et 1 PA, immobilise le vaisseau, puis attend 20 minutes de temps de jeu. La finalisation personnelle exige de nouveau le port, l'atelier et la présence ; elle consomme exactement 20 % de ressources courantes et 10 % de composants rares de la valeur de référence du vaisseau, conserve le plan, consomme 1 PA et crée un seul lot R04-01 monté. Pour un cargo à 10 000 Cr avec des unités à 100 Cr : 20 unités courantes et 10 rares. Une annulation rend les réservations et le PA. STOP et pause empêchent la finalisation ; la clôture d'épisode bloque les travaux actifs.

Le module obtenu porte son origine de fabrication et emprunte les circuits natifs de retrait, de réparation et de vol. Son effet de fuite +1 une fois par voyage est couvert par la tranche précédente. Aucun module n'est créé à la préparation.

## Vérification

- Tests mémoire de l'offre, de l'accord, de la réservation, de la pose, du stock insuffisant, de l'annulation, du STOP et de la révocation.
- Même parcours sur l'émulateur Firestore de `demo-gn-engine`.
- Régressions ciblées du catalogue M1, de l'entrée Space Outlaws, des mandats, du montage, du retrait, du vol et de l'effet R04-01.

Restent dans le cahier des charges C3 : R04-02, R05-01 et R05-02, chacun avec son effet et son circuit de fabrication propres. Aucun master de test n'est préparé par cette tranche.
