# Echoes of Aether — ma version

Copie modifiable d'Echoes of Aether, séparée de la version originale (`../echoes/`).
Les deux sont affichées sur la page `echoes.html`, avec le choix « Version originale » / « Ma version » en haut (`echoes.html#moi` ouvre directement celle-ci).

## Ce qui la sépare de l'original

- Sauvegardes à part : clés `echoes_of_aether_moi_save`, `eoam_slot_*`, `eoam_index`, `eoam_last`, `eoam_fullscreen`, `eoam_diag` (l'original utilise `eoa_*`).
- Salons en ligne à part : préfixe PeerJS `eoam-v03-` et canal local `eoam-local-` ; on ne peut pas rejoindre un salon de la version originale depuis celle-ci.
- Service worker à part : cache `echoes-moi-v1` dans `sw.js`. **Incrémente-le à chaque modification** pour que les téléphones récupèrent la nouvelle version.

## Où modifier

- `assets/game.js` : tout le jeu (Phaser compris), reformaté pour être lisible. Les noms des variables locales sont ceux du build minifié, mais les textes, les données (héros, sorts, objets, monstres) et la logique se retrouvent en cherchant un texte affiché en jeu.
- `assets/heroes`, `assets/monsters`, `assets/fx`, `assets/layers` : images.
- Pas de build : on modifie, on recharge la page.

Si le code source TypeScript d'origine (projet Vite) est récupéré, mieux vaut le mettre dans un dossier source et reconstruire cette copie depuis lui.
