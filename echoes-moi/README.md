# Echoes of Aether — Max version

Copie modifiable d'Echoes of Aether, séparée de la version originale (`../echoes/`).
Les deux sont affichées sur la page `echoes.html`, avec le choix « Version originale » / « Max version » en haut (`echoes.html#moi` ouvre directement celle-ci).

## Ce qui la sépare de l'original

- Sauvegardes à part : clés `echoes_of_aether_moi_save`, `eoam_slot_*`, `eoam_index`, `eoam_last`, `eoam_fullscreen`, `eoam_diag`, `eoam_res` (définition du rendu choisie automatiquement) (l'original utilise `eoa_*`).
- Salons en ligne à part : préfixe PeerJS `eoam-v03-` et canal local `eoam-local-` ; on ne peut pas rejoindre un salon de la version originale depuis celle-ci.
- Service worker à part : cache `echoes-moi-v2` dans `sw.js`. **Incrémente-le à chaque modification** pour que les téléphones récupèrent la nouvelle version.

## Où modifier

- `assets/game.js` : tout le jeu (Phaser compris), reformaté pour être lisible. Les noms des variables locales sont ceux du build minifié, mais les textes, les données (héros, sorts, objets, monstres) et la logique se retrouvent en cherchant un texte affiché en jeu.
- `assets/heroes`, `assets/monsters`, `assets/fx`, `assets/layers` : images.
- Pas de build : on modifie, on recharge la page.

Si le code source TypeScript d'origine (projet Vite) est récupéré, mieux vaut le mettre dans un dossier source et reconstruire cette copie depuis lui.

## Performances (différences avec l'original)

- Donjons : un Graphics par salle, dessiné seulement quand la salle est à l'écran (`cullRect`). L'original trace un seul Graphics de ~210 000 commandes à chaque image, même depuis le village.
- Images, sprites et textes hors de la vue de la caméra ne sont plus envoyés au rendu (`getVisibleChildren` de Phaser).
- Résolution adaptative (`autoRes`) : sous 45 FPS en jeu, la définition du rendu baisse d'un cran (2,5 → 2 → 1,5 → 1) et est mémorisée dans `eoam_res` ; si ça tourne à 58+ FPS, la partie suivante repart un cran plus haut. `localStorage.removeItem('eoam_res')` pour repartir de la définition maximale.
