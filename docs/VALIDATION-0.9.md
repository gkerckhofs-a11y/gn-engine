# Version 0.9 — objets, sac et consommables médicaux

19 octobre 2026. Extension partielle de INV-01/02/05, COM-02/03, ACT-01/03, VIE-04, REC-07 et de l’éditeur/publication du cahier V1. Aucun lot complet déclaré terminé.

## Catalogue et matériel de départ

Le catalogue décrit des modèles d’objets avec identifiant, nom, description joueur, catégorie, unité, type, caractère consommable, légalité visible, volume unitaire facultatif, notes MJ, publication et révision. Un exemplaire individuel accepte une quantité de 1 ; un lot empilable accepte des quantités entières positives. Ce type individuel ne garantit pas qu’un seul exemplaire du modèle existe dans le monde.

Le catalogue existe dans le scénario, sa version figée et la session. Un modèle peut être dupliqué en nouveau brouillon. Les notes MJ ne sont jamais copiées dans les objets destinés aux joueurs.

Dans le scénario, **Matériel de départ** permet de choisir les modèles publiés et leurs quantités pour un personnage. Une préparation sans effet présente les objets avant/après ; la confirmation copie les définitions sélectionnées. Un changement de catalogue ne transforme pas cette copie : il faut préparer puis confirmer à nouveau le matériel pour l’actualiser. Retirer une ligne modifie uniquement la dotation des prochaines sessions issues d’une nouvelle version.

Créer une session produit des lots indépendants depuis la version figée. Une autre session reprend ses quantités initiales, jamais les consommations, saisies ou corrections d’une partie précédente. Les anciennes versions sans objets produisent simplement des sacs vides.

## Lots de session et interventions MJ

Chaque lot conserve sa définition publique copiée, quantité, propriétaire, détenteur, emplacement, disponibilité, révision et provenance interne. Les parcours de cette version attribuent le même personnage comme propriétaire et détenteur, avec emplacement dans son sac. La séparation des champs prépare les autres usages ; elle ne constitue pas encore un système de transport ou de garde pour autrui.

Le MJ peut **Attribuer un lot** à un personnage depuis un modèle publié. Le récapitulatif confirme la cible, le modèle et la quantité ; un motif est obligatoire. L’attribution crée un nouveau lot, sans fusion avec un lot existant. Deux envois de la même commande ne créent qu’un lot.

Une correction MJ ajuste la quantité et la disponibilité du lot avec motif et contrôle de révision. Elle ne change ni son propriétaire, ni son détenteur, ni son emplacement, ni les PV, usages ou textes du personnage. Un lot saisi est inutilisable. Un lot détruit doit avoir une quantité nulle ; les lots consommés et détruits restent enregistrés et ne peuvent être réouverts par ce parcours. Réapprovisionner demande un nouveau lot.

Les historiques MJ présentent les versions de modèles, les dotations de départ et les opérations par lot, avec auteur et motif. Chaque vue est limitée aux 30 derniers événements. Le retrait par soin référence la même opération que l’historique de santé.

## Sac joueur et confidentialité

**Mon sac** est accessible depuis la fiche du personnage. Le joueur peut chercher un nom ou une description, filtrer par catégorie et disponibilité, et ouvrir un lot pour consulter ses propriétés et sa référence. Les lots consommés, saisis et détruits restent consultables avec les filtres correspondants ; seuls les lots disponibles sont montrés par défaut.

Le sac contient uniquement les biens personnels détenus dans le sac du personnage actuellement attribué au compte authentifié. Le serveur ignore un autre identifiant de personnage fourni par le client. Les notes MJ, motifs, UID et provenance interne ne figurent pas dans cette projection. Le rôle Accueil et les badges publics ne reçoivent ni catalogue privé ni inventaire.

L’aperçu MJ utilise la même projection et n’exécute aucune action. Révoquer l’accès, dépublier la fiche ou réattribuer le personnage ferme les anciennes lectures. Les lots restent attachés au personnage, pas au compte humain. La lecture reste permise pendant le briefing, la pause et la fin du jeu, tant que les droits courants restent valides. L’archive ferme les lectures joueurs.

## Consommables des soins

Dans une compétence de soin, le MJ peut choisir **Aucun objet consommé** ou un modèle consommable publié avec une quantité par soin. Aucun coût en objet n’est ajouté aux soins existants qui n’en avaient pas.

Le soin retient l’identifiant et la révision exacte du modèle consommable lors de son enregistrement, puis lors de la copie du profil au personnage. Seuls les lots de cette version sont compatibles. Un changement de nom ou de paramètres du catalogue crée une autre révision : il ne transforme ni les anciens lots ni les anciens soins. Pour employer le nouveau modèle, réenregistrer la compétence, confirmer le profil actualisé et préparer/attribuer le matériel correspondant. Les versions sont visibles dans le sac et la description du coût.

Le soignant choisit un seul lot compatible, personnel, disponible et assez fourni. Il voit la cible, les PV avant/après, le gain réel, les usages, le délai, la référence du lot, la quantité consommée et son solde après soin. La préparation ne réserve ni ne consomme rien. Le système ne prélève pas automatiquement dans plusieurs lots ; deux lots insuffisants séparément ne remplacent pas un lot assez fourni.

À la confirmation, le serveur relit les droits, le profil, la cible, les PV, les usages, le temps de jeu et le lot. La quantité vient de la compétence enregistrée, jamais d’un coût déclaré par le navigateur. PV, usage, délai, stock, historiques et résultat idempotent sont modifiés dans une seule transaction. La dernière unité amène le lot à zéro et à l’état consommé.

Un réessai de la même commande restitue son résultat, même si ce soin a épuisé le lot. Il ne consomme pas une seconde fois. Les droits courants, l’attribution, la compétence et la propriété/détention du lot restent vérifiés avant cette restitution. Un nouveau soin doit de nouveau satisfaire toutes les conditions.

Deux soins disputant la dernière unité ne réussissent pas tous les deux. Un soin sans PV à restaurer, une cible changée, une pause, un état hors combat interdit, une saisie, une quantité insuffisante ou une version périmée n’entraînent aucun coût. Une correction de stock préparée avant une consommation ne peut pas l’écraser silencieusement. Le destinataire voit le nom et la quantité du consommable utilisé, sans recevoir le stock restant du soignant.

## Parcours organisateur

1. Créer et publier les objets dans **Objets et inventaires** du scénario.
2. Sur chaque personnage, préparer puis confirmer son **Matériel de départ**.
3. Dans les compétences de soin, choisir si nécessaire le consommable publié et sa quantité, puis confirmer les profils des personnages.
4. Figer une version et créer la session. Les lots sont créés depuis cette version.
5. En cours de session, utiliser les attributions ou corrections MJ avec motif ; les consommations normales passent par la compétence du joueur.
6. Vérifier le sac via **Aperçu du sac** et suivre les opérations via l’historique du lot.

## Vérifications

- `npm run build` : interface compilée en version 0.9.0.
- `npm test` : 149 tests métier/interface réussis, sans échec. Vingt parcours d’inventaire et quatre tests d’interface ajoutés.
- `npm run test:emulator` : 123 tests réussis, sans échec, sur Auth et Firestore de `demo-gn-engine`, avec Java 21. Les vingt parcours d’inventaire sont réexécutés sur Firestore.
- Total local : **272 tests**. Ils couvrent copies, droits, profils, quantités, versions de consommables, dernier stock concurrent, soin concurrent, correction périmée, réessai après épuisement, révocation, réattribution, fermeture terminale et rollback après panne synthétique avant commit.
- Le nouveau test HTTP utilise le véritable gestionnaire exporté et des jetons Auth émulés : sac personnel malgré une requête forgée, refus des accès MJ/anonymes, préparation sans effet, consommation unique avec le soin et refus après révocation.
- Comptes et contenus synthétiques uniquement dans les émulateurs. Aucun objet, personnage, scénario ou compte de test créé en production.

## Limites et recette restante

- Pas de remise entre joueurs, changement de propriétaire, prêt, dépôt, entrepôt, contenant, quai, vaisseau, transfert, transport ou marché. La saisie MJ bloque l’usage mais ne déplace pas le lot.
- Pas de fractionnement/fusion, QR d’objet physique, photo, équipement, installation, valeur monétaire ou capacité appliquée. Le volume est descriptif. L’individualité d’un lot n’impose pas l’unicité globale du modèle.
- Matériel de départ individuel, jusqu’à 60 modèles par personnage ; pas encore de dotation par classe, migration collective, import/export ou réapplication automatique. Aucun catalogue Port-Brèche ni valeur d’équilibrage inventé.
- Consommation dans un seul lot et pour les soins instantanés de PV uniquement. Pas d’usage générique d’objet, réparation, sabotage, fabrication ou action différée. Les blessures spécialisées, protections et autres états restent ouverts.
- Les modèles déjà copiés restent valides même si le catalogue est ensuite modifié ou dépublié. La dépublication du catalogue bloque de nouvelles attributions ; elle ne rappelle pas les lots déjà distribués. Un consommable incompatible exige une mise à jour explicite des modèles, profils et stocks.
- Actualisation explicite des vues. Les filtres portent sur les lots chargés. Charge 60/120 joueurs, grands volumes, pagination et transaction de création d’une très grande session non mesurés.
- La recette des formulaires authentifiés sur plusieurs comptes Google, mobile et réseau terrain reste à réaliser. Les tests purs d’interface et les émulateurs ne la remplacent pas. REC-07 et les lots A/B ne sont pas déclarés complètement validés.

## Publication

Le workflow et les preuves de la version réellement servie seront consignés après le déploiement. La version précédente vérifiée est la 0.8.
