# Arcade

Phase 1 du plan (classiques) : **Tetris**, **Flipper**, **Breakout**. Site statique : le TypeScript est compilé dans `js/` et committé, donc rien à lancer côté serveur.

- `index.html` : hub. Pages de jeu : `tetris/`, `flipper/`, `breakout/`.
- `src/shared/` : RNG graineux (mulberry32), meilleur score local, sons générés, manette, graines (`?seed=N`, graine du jour).
- `src/tetris/core/` : règles pures (sac de 7, SRS et kicks, DAS/ARR, verrouillage, score). Tests : `game.test.ts`.
- `src/flipper/core/` et `src/breakout/core/` : règles pures, avec tests.
- `src/*/render/` : scènes Phaser ; physique Matter.js pour le flipper et le breakout.
- `flipper/data/table.json`, `breakout/data/levels.json` : données lues au chargement (à relire telles quelles pour Unity).
- `vendor/` : Phaser 3.80.1 et Matter.js 0.19.0 (bundles minifiés, licences incluses).

## Commandes

```
cd arcade
npm install     # TypeScript, typings Phaser et Matter (dev uniquement)
npm run build   # tsc -> js/
npm test        # build + tests des règles
```

Les pages chargent les données par `fetch` : il faut les servir en HTTP (pas en `file://`).

## Pas encore fait (Phases 2 et 3 du plan)

Roguelites, modes marathon et autres, graine du jour en classement, en ligne (versus, coop).
