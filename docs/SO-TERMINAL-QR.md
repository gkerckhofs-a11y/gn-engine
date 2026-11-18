# Terminaux joueurs et QR de lieu — réalisation PR #59

Source : cahier des charges PR #59, commit fe172a20c6ce558ca86961c024240d53558ceb14 (18 novembre 2026).
Base : main a59ec255748de8c236f861e6a3ea3f29bbd44088, validation globale réussie 44266765944.

## TQ-01 — Cours et comptoir

Adoption explicite et irréversible du mode `spaceOutlaws.terminalQrVersion=1` par le MJ via Lieux & Terminaux, en préparation/briefing/pause. Aucun changement implicite des anciennes sessions. Les permissions de modification de session limitent cette écriture à ce seul marqueur et à la révision.

| Commande | Présence | Droit natif | Hors contexte |
| --- | --- | --- | --- |
| commodityMarket | Comptoir, ressource = session | Joueur actif | Refus, aucun cours renvoyé |
| galacticMarkets | Comptoir, ressource = session | Courtier principal | Refus, aucun prix professionnel |
| preparePlanetSale / sellToPlanetMarket | Comptoir | Courtier et propriété/stock/prix natifs | Refus avant mutation |
| shop / prepareShopPurchase / buyShopOffer | Comptoir lié | Achat natif et conditions M5 | Raccordement historique conservé |
| Retraits et reçus déjà acquis | Suivi natif | Propriété/consentements natifs | Pas de nouveau contrôle local |

L’achat distant reste natif : la présence au comptoir ne téléporte aucune marchandise et n’impose pas la planète du vendeur au joueur.
Les cours ne sont plus une entrée permanente du terminal personnel en mode QR.

## TQ-02 — Sabacc

Nouvelle entrée : QR natif `tableId + qrToken`, sans second QR de Cantina. Le mode QR GN autorise la consultation et les tours de la même table avec `sabaccPresence` ET siège ET identité native courante. La rotation du QR ne retire ni siège, ni main, ni mise. La reprise ne fournit aucun token ni catalogue de tables. Une nouvelle entrée exige toujours le QR courant. Révocation d'accès et expulsion restent prioritaires. Le mode LOCAL et les sessions GN historiques gardent leur contrôle QR existant.

Tranches TQ-03 à TQ-06 en cours. Les résultats CI seront consignés dans la PR de code sur le SHA réellement testé. Aucun déploiement ou changement de main autorisé par ce chantier.

## TQ-03 — Terminal personnel

En mode QR : Mon activité / Mes ressources / Mes informations, suivis et commandes conservés, informations et messages permanents, scanner unique avec saisie manuelle et caméra native. Les nouvelles négociations et recherches de contacts ne sont plus proposées comme des actions libres à distance. Navigation principale Identité / Action / Terminal / News préservée. Les sessions historiques conservent leur classement.
L'écran de lieu présente le temps restant, un message d'accès absent/expiré, les refus et le retour au terminal personnel. Le Courtier est vérifié avant de proposer le lien professionnel.
