# Holopédia — vignettes optimisées

Les illustrations originales restent inchangées et restent affichées en grand dans les fiches. L'index utilise des miniatures WebP générées lors de la publication Firebase, sans exposer d'URL Google Drive.

| Type | Origine | Miniature | Cadre sur l'accueil |
|---|---|---|---|
| Affiche historique | `posters/{slug}.webp` | `posters/thumbs/{slug}.webp` (max. 600×900) | cadre 3:4, `contain`, affiche entièrement visible |
| Planète | `images/planets/{slug}.webp` | `images/planets/thumbs/{slug}.webp` (500×500) | carré 1:1 |
| Lieu de Breach Port | `images/places/{slug}.webp` | `images/places/thumbs/{slug}.webp` (800×450) | panoramique 16:9, sans coupe du bâtiment |

Les images sont chargées en différé (lazy loading). Chaque vignette constitue un lien clavier/souris vers sa propre notice, avec texte alternatif descriptif. Les hauteurs et le cadrage sont gérés par `style.css`. La page d'accueil ne télécharge plus les originaux en pleine résolution.

**Vérification :** le test `Vignettes optimisées : images légères, entières et cliquables` vérifie les 43 vignettes actuelles (6 archives historiques, 30 planètes et 7 lieux), les URL des miniatures, l'accès aux originaux et les ratios.

La publication doit rester limitée au site Firebase `hosting:holopedia`, sans déploiement du moteur GN Engine ni modification des textes RP.
