# Publier l'Holopédia sur un second site Firebase Hosting

Objectif : publier **seulement l'encyclopédie statique** sans redéployer l'application GN Engine, les fonctions, les règles Firestore ou les index. Les sources sont maintenues sur la branche `gh-pages` ; le workflow de publication est déclenché manuellement depuis la branche `main`.

## Première mise en ligne autorisée — 16 novembre 2026

L'organisateur a explicitement demandé la création du site indépendant Firebase Hosting.

- Identifiant souhaité : `holopedia-space-outlaws` ; disponibilité mondiale non garantie.
- La PR du workflow est fusionnée dans `main` ; son déclencheur `push` sur la modification de ce fichier lance une fois la création et le déploiement du site Holopédia uniquement.
- Authentification : compte de service préexistant du projet `gn-engine`, borné par le fournisseur OIDC de `main`. La création peut échouer si ce compte ne possède pas `firebasehosting.sites.create`.
- Étape de création : `firebase hosting:sites:get` puis, s'il n'existe pas, `firebase hosting:sites:create holopedia-space-outlaws`.
- Le déploiement est limité à `firebase deploy --only hosting:holopedia --config firebase.holopedia.json`, sans toucher aux Functions, règles Firestore, index et site GN Engine.
- Pour les mises à jour suivantes, utiliser le déclenchement manuel de ce seul workflow sur `main` ; il prend les contenus de la branche `gh-pages`.
- Le domaine personnalisé `holopedia.leludificateur.be` reste une option future nécessitant les enregistrements DNS exacts fournis par Firebase et ne doit pas être configuré automatiquement.

**La création réelle, les permissions et l'accessibilité de l'URL doivent être constatées dans les journaux du workflow et par une requête à l'adresse Firebase avant d'annoncer un site publié.**

## Publications suivantes

- Modifier les fichiers `index.html`, `style.css`, `app.mjs`, `world-encyclopedia.mjs` et `world-encyclopedia-data.mjs` dans la seule branche `gh-pages`.
- Déclencher le workflow manuel Holopédia ; il consulte `gh-pages` et exécute uniquement `firebase deploy --only hosting:holopedia --config firebase.holopedia.json`.
- Les déploiements existants GN Engine restent gérés par `.github/workflows/deploy-firebase.yml` sur `main`, sans dépendance de ce site secondaire.

## Lien dans le Terminal

La PR #48 pointe temporairement vers GitHub Pages. **Après confirmation de l'URL Firebase**, substituer ce lien par `https://holopedia-space-outlaws.web.app/?session=<SESSION_ID>` sans changer l'identité de session ni les droits. Le bouton « Retour au Terminal » du site statique lira le paramètre public `session` pour ouvrir la route GN Engine correspondante ; sans paramètre, il retourne à l'accueil GN Engine.

## Domaine personnalisé (facultatif)

Un sous-domaine comme `holopedia.leludificateur.be` peut être lié au deuxième site, **uniquement après validation du contrôle de domaine** et ajout des enregistrements DNS exacts générés par Firebase. Ne pas modifier les DNS de l'application GN Engine ni ceux de la messagerie.

## Sécurité et limites

Le site `gh-pages` ne contient que le Livre du monde **public** : ne jamais y copier des codes de navigation, secrets MJ, fiches personnages ou données de session. Le lien de session n'est pas un jeton d'authentification. Le site est indépendant côté Hosting mais appartient au projet Firebase `gn-engine` ; aucun accès backend n'est requis pour l'encyclopédie.

Le site secondaire, sa disponibilité de nom, les droits IAM, le premier déploiement et le domaine personnalisé ne sont **pas encore vérifiés**. Aucun déploiement Firebase n'est déclenché par cette PR.
