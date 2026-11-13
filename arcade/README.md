# Sources de l'arcade (Tetris, Flipper, Breakout)

Dossier de développement uniquement. Les jeux sont des pages du site comme les autres :

- pages : `tetris.html`, `flipper.html`, `breakout.html` (coque de `merger.html`) ; cartes dans `jeux.html`.
- scripts compilés : `js/arcade/` (committés, le site ne compile rien).
- données : `data/arcade/table.json` (flipper), `data/arcade/levels.json` (breakout).
- bibliothèques : `js/vendor/phaser.min.js` et `js/vendor/matter.min.js` (licences à côté).

Sources : `src/` (TypeScript). Règles pures testées dans `src/*/core/*.test.ts`.

```
cd arcade
npm install     # TypeScript + typings (dev uniquement, node_modules ignoré)
npm run build   # tsc -> ../js/arcade/
npm test        # build + tests des règles
```

## Sprites

Les jeux réutilisent les sprites d'Écureuil Survivor : `js/v2/game-data.js` (chargé par chaque page) expose `ES_DATA.SPRITES`, et `arcade/src/shared/art.ts` en fait des textures Phaser nettes (échelle entière) avec un pool d'images et une mascotte. Si le fichier manque, les jeux se dessinent sans sprites.
