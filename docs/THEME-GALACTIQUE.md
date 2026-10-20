# Habillage galactique — GN Engine 0.27.1

20 octobre 2026. Auteur : Codex. Demande : un habillage évoquant Star Wars sur l’ensemble de l’application.

Le thème évoque une console industrielle : métal vert sombre, accents ambrés, repères cyan, panneaux anguleux et petits libellés de terminal. Les textes narratifs conservent une typographie courante pour la lecture sur téléphone. Les quatre espaces joueur utilisent des pictogrammes vectoriels cohérents. L’accueil possède une carte de navigation décorative, qui ne représente aucune donnée de jeu.

La feuille `web/galactic.css` s’applique après les styles structurels. Elle couvre l’accueil, l’organisation, les quatre espaces joueur, les formulaires, les imports de masters, la médiathèque et les dialogues. Le build la publie avec les autres ressources. Le thème utilise uniquement du CSS et des SVG locaux : aucune police ni image externe. Les QR conservent leur fond blanc. Les animations sont désactivées lorsque le système demande une réduction des mouvements.

Ce lot ne change ni les règles, ni les données, ni les permissions. Les noms des sessions et les images attribuées par les organisateurs restent les contenus de référence. Il n’ajoute pas de sélecteur de thèmes.

## Vérifications

- 523 tests applicatifs réussis, aucun échec ni test ignoré ; compilation réussie.
- Analyse des deux feuilles CSS par esbuild : aucun avertissement.
- Contrastes des couleurs principales calculés avec la luminance relative sRGB (hors transparences et états désactivés) : texte 14,4:1 ; texte secondaire 8,2:1 ; cyan 9,8:1 ; texte sur bouton ambre 9,8:1. Ce contrôle ciblé ne constitue pas un audit complet d’accessibilité.
- `test/ui/galactic-preview.mjs` fournit des écrans fictifs pour la recette visuelle. Ce fichier n’est pas publié dans l’application.

La recette sur téléphones et comptes réels reste à réaliser. Les résultats de publication sont consignés séparément dans le document de validation de la version.
