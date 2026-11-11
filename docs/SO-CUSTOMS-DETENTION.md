# Space Outlaws — première tranche de retenue douanière provisoire

Date : 10 novembre 2026. Sources canoniques : `docs/source/SO_Regles_V07.txt` chapitre 24, notamment retenue administrative maximale de 15 minutes réelles ; `docs/source/SO_CDC_V35.md` §7.3.

## Ce que couvre la tranche

- Capacité `customsDetentionVersion=1` émise pour les **nouveaux Masters** uniquement, sans mutation d'anciens Masters ou sessions.
- Le propriétaire/MJ autorisé peut inscrire en retenue un **lot AVAILABLE dans le sac de son propriétaire**, avec confirmation de consignation matérielle sûre et motif écrit. Le seul fondement ouvert est `REGULATED_NO_LICENSE` (bien réglementé sans permis) : la qualification est confirmée par le MJ, aucune inférence automatique du catalogue.
- Une retenue change provisoirement le statut numérique en `CUSTOMS_HELD` sans déplacer la propriété, le détenteur ni l'emplacement. Les actions qui exigent `AVAILABLE` sont bloquées.
- **15 minutes réelles** exactement, à partir de l'heure serveur, indépendantes de l'horloge fictive et de sa pause. À l'expiration, `effectiveLot` rend le lot immédiatement disponible dans les lectures et actions utilisant le modèle de lot effectif, même si l'organisateur n'a pas encore clos le dossier.
- Le MJ peut clore plus tôt et rendre le lot disponible, ou constater l'expiration pour inscrire l'événement permanent. Le journal conserve retenue et libération. Le joueur n'est jamais immobilisé physiquement.
- Un index durable par lot interdit une seconde retenue du même lot pendant la session ; mesure volontairement stricte contre l'enchaînement abusif de retenues.
- Le joueur ne voit aucune donnée privée de l'infraction ou de l'agent ; le statut de disponibilité du lot seul lui est projeté. Les décisions et motifs restent consultables dans la régie MJ.

## Ce qui est volontairement exclu

- La **saisie formelle**, le transfert vers un inventaire officiel, le procès-verbal/quittance de saisie, les amendes, les retenues de personnes et les recours sont hors de cette première tranche.
- Le contrôle documentaire approfondi et les licences restent des parcours distincts ; le service ne confère aucun niveau d'autorité douanière au joueur.
- Cette tranche ne gère pas encore la retenue d'un lot en soute, en entrepôt ou sous contrat, ni les mouvements croisés avec toutes les activités de cargaison : elle exige un lot personnel libre, sans réservation de marché ou embarquement.
- À expiration, la restitution **numérique** est effective par horodatage serveur ; la remise de l'accessoire réel doit être faite par le MJ. Le système ne pilote aucun verrou et ne retient aucun participant.
- L'état Firestore brut peut conserver la retenue jusqu'à la prochaine écriture ; les lectures de stock opérationnelles utilisent `effectiveLot`. Un audit complémentaire est nécessaire avant d'affirmer que tous les écrans/services historiques traitent ces expirations.

## Tests et déploiement

Suite Node en mémoire et Firestore : début de retenue, refus d'un lot indisponible, refus joueur/non-MJ, durée stricte, expiration pendant un STOP SÉCURITÉ, libération anticipée, maintien de provenance et de propriété, impossibilité de nouvelle retenue, absence d'effets rétroactifs sur anciens Masters, échappement HTML de l'interface.

CI ciblée sur le **SHA exact** à vérifier. Pas de fusion, déploiement, migration ni essai Android/iOS réel à cette étape.