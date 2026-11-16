# Publier l'Holopédia sur un second site Firebase Hosting

Objectif : publier **seulement l'encyclopédie statique** sans redéployer l'application GN Engine, les fonctions, les règles Firestore ou les index. Les sources sont maintenues sur la branche `gh-pages` ; le workflow de publication est déclenché manuellement depuis la branche `main`.

## Préparation unique (non exécutée ici)

1. Dans la [console Firebase du projet gn-engine](https://console.firebase.google.com/project/gn-engine/hosting), ajouter un **second site Hosting**. Proposer l'ID `holopedia-space-outlaws` seulement s'il est libre ; l'ID est mondialement unique, 30 caractères au maximum. Ne jamais remplacer le site `gn-engine`.
2. Dans GitHub > Settings > Secrets and variables > Actions > **Variables**, créer `HOLOPEDIA_SITE_ID` avec **l'identifiant réel** du second site.
3. Vérifier que le compte de service existant `gn-engine-deployer@gn-engine.iam.gserviceaccount.com` possède les droits Firebase Hosting sur ce second site. Le workflow réutilise l'authentification OIDC de `main`, sans créer de secret.
4. Fusionner la PR de ce workflow après validation. Dans GitHub > Actions, exécuter **Publier Holopédia indépendamment sur Firebase** depuis `main`.
5. Vérifier le contenu de `https://<SITE_ID>.web.app/` et tester un article puis le retour au Terminal. L'adresse n'est effective qu'une fois le site créé et le premier déploiement réussi.

## Publications suivantes

- Modifier les fichiers `index.html`, `style.css`, `app.mjs`, `world-encyclopedia.mjs` et `world-encyclopedia-data.mjs` dans la seule branche `gh-pages`.
- Déclencher le workflow manuel Holopédia ; il consulte `gh-pages` et exécute uniquement `firebase deploy --only hosting:holopedia --config firebase.holopedia.json`.
- Les déploiements existants GN Engine restent gérés par `.github/workflows/deploy-firebase.yml` sur `main`, sans dépendance de ce site secondaire.

## Lien dans le Terminal

La PR #48 pointe temporairement vers GitHub Pages. **Après confirmation de l'URL Firebase**, substituer ce lien par `https://<SITE_ID>.web.app/?session=<SESSION_ID>` sans changer l'identité de session ni les droits. Le bouton « Retour au Terminal » du site statique lira le paramètre public `session` pour ouvrir la route GN Engine correspondante ; sans paramètre, il retourne à l'accueil GN Engine.

## Domaine personnalisé (facultatif)

Un sous-domaine comme `holopedia.leludificateur.be` peut être lié au deuxième site, **uniquement après validation du contrôle de domaine** et ajout des enregistrements DNS exacts générés par Firebase. Ne pas modifier les DNS de l'application GN Engine ni ceux de la messagerie.

## Sécurité et limites

Le site `gh-pages` ne contient que le Livre du monde **public** : ne jamais y copier des codes de navigation, secrets MJ, fiches personnages ou données de session. Le lien de session n'est pas un jeton d'authentification. Le site est indépendant côté Hosting mais appartient au projet Firebase `gn-engine` ; aucun accès backend n'est requis pour l'encyclopédie.

Le site secondaire, sa disponibilité de nom, les droits IAM, le premier déploiement et le domaine personnalisé ne sont **pas encore vérifiés**. Aucun déploiement Firebase n'est déclenché par cette PR.
