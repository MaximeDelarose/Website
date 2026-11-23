# Echoes of Aether — Max version

Copie modifiable d'Echoes of Aether, séparée de la version originale (`../echoes/`), optimisée pour le web mobile.
Les deux sont affichées sur la page `echoes.html`, avec le choix « Version originale » / « Max version » en haut (`echoes.html#moi` ouvre directement celle-ci).

## Ce qui la sépare de l'original

- Sauvegardes à part : clés `echoes_of_aether_moi_save`, `eoam_slot_*`, `eoam_index`, `eoam_last`, `eoam_fullscreen`, `eoam_diag`, `eoam_res` (définition du rendu choisie automatiquement) (l'original utilise `eoa_*`).
- Salons en ligne à part : préfixe PeerJS `eoam-v03-` et canal local `eoam-local-` ; on ne peut pas rejoindre un salon de la version originale depuis celle-ci.
- Service worker à part : cache `echoes-moi-v3` dans `sw.js`. **Incrémente-le à chaque modification** pour que les téléphones récupèrent la nouvelle version.

## Où modifier

| Fichier | Rôle |
|---|---|
| `assets/game.js` | Tout le jeu (Phaser compris), reformaté pour être lisible. Les noms des variables locales sont ceux du build minifié, mais les textes, les données (héros, sorts, objets, monstres) et la logique se retrouvent en cherchant un texte affiché en jeu. |
| `assets/perf.js` | Optimisations de rendu, indépendantes du gameplay (voir plus bas). |
| `assets/baked.js` + `assets/baked/` | Textures que le jeu générait au démarrage, pré-rendues en PNG. |
| `assets/game.min.js` | **Généré** : le script réellement chargé par `index.html`. |
| `assets/bundler-yPNtbWdW.js` | PeerJS (coop en ligne), chargé seulement à l'ouverture de la coop. |
| `assets/heroes`, `monsters`, `fx`, `layers` | Images. |

Après une modification :

1. `node tools/echoes-build.js` — reconstruit `assets/game.min.js` depuis `game.js` (esbuild via npx).
2. Si un générateur de texture a changé (sols, monstres, icônes, décor…) : `node tools/echoes-bake.js` refait les PNG de `assets/baked/` (Playwright).
3. Incrémenter le cache dans `sw.js`.

Si le code source TypeScript d'origine (projet Vite) est récupéré, mieux vaut le mettre dans un dossier source et reconstruire cette copie depuis lui.

## Performances (différences avec l'original)

Mesuré dans Chromium sans GPU, processeur ralenti ×4 pour imiter un téléphone, en jeu au village :

| | Original | Max version |
|---|---|---|
| Images par seconde | 9,8 | ~29 |
| Temps de rendu JS par image | 69 ms | 7 ms |
| Objets envoyés au rendu | 3 343 | 95 |
| Mémoire GPU des textures | 129 Mo | 17 Mo |
| Démarrage → menu / clic → en jeu | 4,6 s / 3,4 s | 3,6 s / 1,8 s |

Ce qui a changé :

- **Donjons** (`game.js`, `cullRect`) : un Graphics par salle, dessiné seulement quand la salle est à l'écran. L'original trace un seul Graphics de ~210 000 commandes à chaque image, même depuis le village.
- **Rendu limité au visible** (`perf.js`) : images, sprites et textes hors caméra, zones de collision (1 800) et formes transparentes ne sont plus envoyés au rendu. Les clics/toucher ne changent pas.
- **Cache des Graphics** (`perf.js`) : un Graphics qui ne change plus (boutons, anneaux, cadres du HUD et des menus) est dessiné une fois dans une texture par le même moteur WebGL, puis affiché comme une image. Dès que ses commandes changent, il redevient un Graphics normal.
- **Textures GPU à la demande** (`perf.js`) : une image n'est envoyée à la carte graphique qu'au moment où elle est affichée (les 17 planches de héros ne sont plus toutes chargées pour un seul héros joué).
- **Textures pré-rendues** (`baked.js`, `tools/echoes-bake.js`) : 131 textures (sols des zones et royaumes, variantes de monstres, icônes, massues, décor) chargées en PNG (356 Ko) au lieu d'être dessinées pixel par pixel à chaque lancement. Si un PNG manque, le jeu la génère comme avant.
- **Définition adaptative** (`perf.js`) : sous 45 FPS en jeu, la définition du rendu baisse d'un cran (2,5 → 2 → 1,5 → 1) et est mémorisée dans `eoam_res` ; à 58+ FPS, la partie suivante repart un cran plus haut. `localStorage.removeItem('eoam_res')` pour repartir de la définition maximale.
- **Script minifié** (`tools/echoes-build.js`) : 1,9 Mo au lieu de 3,8 Mo, analysé plus vite au démarrage.
- **GPU rapide demandé** (`powerPreference: high-performance`) sur les appareils qui en ont deux.

Pour comparer, chaque optimisation se coupe depuis la console : `localStorage.setItem('eoam_perf_off', 'cache,lazy,cull,baked')` puis recharger (`removeItem` pour réactiver). `window.__perf` affiche les compteurs (textures envoyées au GPU, Graphics en cache…).

## Corrigé au passage

- La coop en ligne ne pouvait pas se charger : `bundler-yPNtbWdW.js` importait `./index-nh8iQ6bC.js`, qui n'existe que dans l'original. Il contient maintenant ses propres aides de modules.
