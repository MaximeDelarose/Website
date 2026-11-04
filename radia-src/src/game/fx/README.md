# Game feel du plateau de fusion (agent B1)

Fichiers : `feel.ts` (logique pure, testée), `reactions.ts` (répliques d'Auguste). Le rendu est dans
`src/game/merge/MergeScene.ts`, les textures d'effets dans `src/game/merge/textures.ts`, les sons dans
`src/audio/AudioManager.ts`, l'haptique dans `src/core/haptics.ts`.

## Chronologie d'une fusion
| t (ms) | ordinaire | rare (niveau ≥ 6) | maximale (collMax) |
|---|---|---|---|
| 0 | anticipation : les 2 objets se compriment (70 ms), son `windup` | idem | idem |
| 70 | impact (90 ms) | idem | idem |
| 160 | POP : squash & stretch, éclat, particules, `pop1/2/4/5`, `haptic('merge')` | `popRare` (double POP), 2e anneau à +90 ms, étincelles dorées, rayons, ralenti ~120 ms, `haptic('rare')` | `maxMerge`, flash plein plateau, 3 ondes de choc, rayons plein plateau, pluie d'étincelles, secousse, ralenti ~140 ms, `haptic('maxMerge')` |

Dès qu'une nouvelle action arrive (`pointerdown`), les fusions **ordinaires** en cours sont finalisées
immédiatement (`flushOrdinary`) : l'entrée n'est jamais bloquée. Le nouvel objet existe dans la grille dès le
début de l'animation (invisible), donc une action pendant l'animation agit sur le bon objet.

## Réglages
- `effects === 'reduced'` : ~40 % des particules, plafond 40, rayons limités à 6, pas de secousse.
- `reducedMotion` : ~30 % des particules, plafond 24, **ni ralenti, ni rayons, ni secousse**.
- Plafond dur de particules vivantes : 110 (`ParticleBudget`) ; au-delà, les particules sont simplement ignorées.
- Haptique : `settings.haptics` (voir `haptics.ts`), anti-rafale 45 ms.

## API publique de `MergeScene` (pour l'interface — coordonnées en pixels CSS)
```ts
scene.dropFx(cell: number, rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary'): void
scene.chestFx(x: number, y: number): void
scene.maxMergeFx(cell: number): void
scene.comboFx(value: number, mult = 1): void
scene.flyTo(kind: string, fromCell: number, toXY: {x:number;y:number}, cb?: () => void): void
scene.highlightCells(cells: number[]): void
```
- `dropFx` : lumière et étincelles à la couleur de rareté (RARITY_COLOR), anneaux, rebond de l'objet posé ; haptique `drop` (`rare` dès « épique »).
- `chestFx` : confettis dorés, rayons, son `chestOpen`, `haptic('chest')`. Utilisé aussi pour les paquets cadeaux et coffrets surprise.
- `maxMergeFx` : l'effet spectaculaire complet (déjà déclenché automatiquement par une fusion qui crée le niveau max).
- `comboFx` : compteur discret en haut du plateau (`Combo 4 · ×1.5` si `mult > 1`), son qui monte, `haptic('combo')` aux paliers 3/5/8.
  Les fusions l'appellent déjà elles-mêmes à chaque événement `combo` ; l'appeler en plus n'est utile que pour un combo « hors plateau ».
- `flyTo` : icônes disponibles `coin, diamond, energy, heart, star, flowers, fabric, cocoa, ticket, chest` (autre nom : étincelle dorée).
  Le callback est **toujours** appelé à l'arrivée (~0,6 s), même si le budget de particules est plein.
- `highlightCells` : fait pulser les cases (~2 s), remplace la précédente mise en évidence.

## Réactions d'Auguste
```ts
import { AUGUSTE_REACTIONS, pickReaction } from '../fx/reactions';
augusteSays(pickReaction('rare'));      // 'rare' | 'maxMerge' | 'combo3' | 'combo5' | 'chest' | 'drop'
```
`pickReaction(key, rng?)` ne répète jamais les 3 dernières répliques de la même clé. À afficher avec parcimonie
(par ex. au plus une réaction toutes les ~20 s, jamais pendant un glisser).

## Sons ajoutés (`audio.play(name, pitch?)`)
`pop4`, `pop5` (variantes), `popRare` (double POP), `maxMerge`, `chestOpen`, `select` (très doux), `windup`.
`drop` est maintenant un peu plus rond et accepte un `pitch`. `sparkle` existait déjà.
