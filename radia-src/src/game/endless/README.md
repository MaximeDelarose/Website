# Endless 2.0 — moteur (logique pure) · guide pour l'interface (agent B2)

Tout est **sans DOM**, sérialisable en JSON, testé (`tests/endless-*.test.ts`). Aucun nombre d'équilibrage dans la
logique : tout est dans [`config.ts`](./config.ts) (`ENDLESS_CFG`, commenté). Import unique : `src/game/endless` (`index.ts`).

## 1. Câblage OBLIGATOIRE (5 lignes à ne pas oublier)

```ts
import * as R from '../merge/rules';
import { bindEndless, applyEvents, applyLoot, openChest } from '../endless';

// 1. À l'ouverture du mode infini (et après tout rechargement / reset de sauvegarde) :
bindEndless(save.data.fun);                 // le moteur lit/écrit fun.endless2 (gens, album, jauge, événements…)
// 2. Après avoir chargé la partie : migration tolérante (3 commandes, paliers, récompenses annoncées…)
R.ensureGenerators(state, R.ENDLESS_DEF);   // fait aussi migrateEndless()
// 3. Avant de dépenser l'énergie d'un toucher de générateur :
const cost = R.tapCost(state, genCell);     // 0 ou 1  (toucher gratuit : 1 sur 14 + chance liée au niveau du générateur)
// 4. Toucher : passer `Date.now()` (temps de jeu actif → remplacements gratuits)
const ev = R.tapGenerator(state, def, genCell, Date.now());   // idem R.deliver(s, def, slot, now), R.tapItem(s, def, i, now), R.forceDeliver(s, def, slot, now)
// 5. Verser les gains de CHAQUE lot d'événements, une seule fois :
const got = applyEvents(host, ev);          // got.text = « +12 pièces · Robe fleurie »  (pour un toast)
```

`LootHost` (à construire côté UI avec les API existantes) :
```ts
const host: LootHost = {
  world: save.data.world,                   // res / wardrobe.owned / castle.owned sont modifiés en place
  giveEnergy: (n) => wallet.giveEnergy(n),
  giveDiamonds: (n) => wallet.giveDiamonds(n),
  addHearts: (n) => addHearts(n),
  giveBooster: (k, n) => { save.data.boosters[k] += n; },
};
```
`applyEvents` verse : `deliver` (pièces/matériaux `gain`, énergie, cœurs), `drop`, `discover` (récompense de nouveauté / chaîne /
palier d'album), `maxMerge`, `comboTier` (énergie, cœurs, baguette), `secondary` (récompense de palier). **Ne pas** appeler
`addHearts(e.hearts)` / `giveEnergy(3)` / `gain(deliverReward…)` soi-même pour `deliver` : ce serait un double versement.
Tout ce qui est « géré par le moteur » (coffres, tickets, fragments de vêtements, points de jauge) est déjà enregistré dans
`fun.endless2` au moment de l'événement ; `applyLoot` l'ignore. Après `applyEvents`, appeler `save.save()` (+ `wallet.notify()`).

Objets à poser sur le plateau (`rareItem`, `star`) : le moteur les place lui-même pour les `drop`/`maxMerge`
(événement `spawn` avec `source: 'drop'`), et les convertit en pièces s'il reste moins de 5 cases libres.
Pour le butin d'un **coffre ouvert** : `const { loot, events } = R.placeLoot(state, chest.loot)` puis `applyLoot(host, loot)` (voir §4).

## 2. Événements (`BoardEvent`, src/game/merge/types.ts) — nouveautés

| événement | quand | champs utiles |
|---|---|---|
| `spawn` (enrichi) | production | `source: 'gen'\|'box'\|'combo'\|'reward'\|'drop'\|'rescue'`, `free?: true` (toucher gratuit), `double?: true` (2ᵉ objet) |
| `deliver` (enrichi) | livraison | `tier`, `reward` (OrderReward annoncée), `gain` (pièces/matériaux **monde**), `energy`, `hearts`, `forced?` (payée en diamants) |
| `orderNew` | nouvelle commande du **même palier** | `slot`, `tier` |
| `orderReplace` | remplacement gratuit | `slot`, `tier`, `left` (stock restant) |
| `replaceGain` | +1 remplacement gagné | `n`, `total` |
| `combo` (enrichi) | chaque fusion enchaînée (≥ 2) | `value`, `mult` (≤ 3), `reward?` (hérité : star/wand/hearts), `capped?` |
| `comboTier` | palier de combo atteint (3, 5, 8, 12, 16) | `tier` (index), `value`, `mult`, `energy`, `hearts`, `reward?`, `capped` (budget/minute épuisé → rien versé) |
| `drop` | drop à la fusion | `loot` (`kind`, `n`, `rarity`, `item?`), `rarity`, `at` (case d'origine), `auto` (vrai = monnaie/coffre/ticket/fragment) |
| `chest` | un coffre de plus à ouvrir | `pending` (total en attente), `source: 'gauge'\|'drop'\|'max'\|'order'` |
| `treasure` | jauge de trésor mise à jour | `points`, `goal`, `gained` |
| `discover` | **nouvel** objet (jamais pour un déjà vu) | `item`, `isNew: true`, `reward: Loot[]`, `completed?` (chaîne complétée), `milestone?` (palier d'album) |
| `maxMerge` | fusion au niveau maximum de la collection | `at`, `item`, `loot: Loot[]` (pièces + drop garanti rare+) |
| `secondary` | événement secondaire | `id`, `progress`, `goal`, `stage`, `done` (palier atteint → `reward`), `final?` (dernier palier : il est remplacé) |
| `unlock` | collection débloquée | `coll`, `kind` (générateur posé juste après : `spawn` `source:'reward'`) |
| `rescue` | garde-fou anti-blocage | `at`, `item` (une Étoile filante a remplacé l'objet le moins précieux) |
| `full` | plateau plein à un toucher | (le garde-fou peut suivre) |

Inchangés : `move`, `merge`, `invalid` (`reason:'max'` utilise `collMax`), `giftOpen`, `remove`, `upgrade`, `boxOpen`, `objective`,
`challenge`, `win`. Les `discover` sont aussi émis pour les objets issus des générateurs, coffrets, baguettes, butins.

## 3. API par domaine

### Collections / objets (`src/data/items.ts`)
`COLLECTION_IDS` (11, dans l'ordre des générateurs : kind = index + 1), `LEGACY_COLLECTION_IDS` (4 d'origine), `COLLECTIONS[c]` (nom, couleur, 8/10 noms+blurbs),
`collMax(c)` (**toujours l'utiliser** à la place de `MAX_LEVEL`), `GENERATORS[1..11]`, `Rarity`, `RARITIES`, `RARITY_COLOR`, `RARITY_NAME`, `allItems()`.

### Déblocage (`unlocks.ts`)
`tierPoints(fun)` (= commandes livrées + 3 × chaînes d'album), `unlockedColls(fun)`, `activeColls(fun)` (au plus **6** générateurs posés ;
les plus anciens « se reposent » et leur générateur quitte le plateau, les objets restent), `isUnlocked`, `nextUnlock(fun)` (→ barre « prochaine collection »), `palier(fun)`.

### Générateurs (`generators.ts`)
- `generatorInfo(kind, level)` → `{ name, level, maxLevel, table:[{l,name,pct}], maxProduced, doublePct, freePct, starPct, boxPct, perks[], next:{level,gains[]}|null, description }`
- `genState(fun, coll)` → `{ level, xp, rank }` · `genLevel(fun, coll)` · `masteryRank(xp)` · `masteryNext(xp)`
- `upgradeCost(kind, level, rank?)` → `{coins, flowers?|fabric?|cocoa?}` (jamais de diamants) · `canAfford(world, cost)`
- `upgradeGenerator(fun, kind, world)` → `{ ok, reason?: 'poor'|'max'|'locked', level, cost }` — `world` = `save.data.world` (déduit `world.res`). Appeler ensuite `save.save()`.
- Le niveau apporte : objets plus hauts, chance de **production double**, de **toucher gratuit**, de **Coffret surprise**/Étoile. XP de maîtrise : +1 par toucher et par fusion de la collection ; 6 %/rang de rabais sur le coût (max 30 %).

### Commandes (`orders.ts` + rules.ts)
3 emplacements = 3 paliers : `slot 0 'easy'`, `1 'mid'`, `2 'hard'`. `OrderState` : `{ items, id, tier, reward: {hearts,coins,mat,matN,energy,treasure}, progress (0..1) }`.
- `R.orderProgress(state, slot)` → `{ have, need, ratio (0..1), ready, per:[{item, have, ratio}] }` (les objets de niveau inférieur comptent au prorata).
- `R.replaceOrder(state, def, slot)` → événements (`orderReplace`) ; `R.replacesLeft()` ; stock `fun.endless2.replaces` (départ 2, +1 / 8 min de jeu actif ou / 6 livraisons, max 3).
- Toute commande générée est **atteignable** (`isReachable`) : collection active, niveau ≤ `collMax`, coût estimé en touchers (`tapsFor`) borné selon le niveau des générateurs. Démarrage en douceur (premières commandes minuscules).
- Gains « monde » : `orderGain(order.reward)` (src/game/world/fusionRewards.ts) = pièces + fleurs/tissu/cacao selon la collection (rare/fleurs→fleurs ; amour/choc→cacao ; Paris/vêtements/accessoires→tissu ; autres → pièces).

### Trésor, coffres, drops (`treasure.ts`, `drops.ts`)
- `treasureView(fun)` → `{ points, goal, ratio, pending, earned }` · `pendingChests(fun)`
- `chestOdds()` → `{ rows:[{rarity,name,color,pct}], pity:{rare,epic}, text }` (**probabilités publiées**, à afficher dans le coffre : Commun 55 %, Peu commun 28 %, Rare 12 %, Épique 4,2 %, Légendaire 0,8 % ; garantie : ≤ 7 coffres sans Rare+, ≤ 29 sans Épique+)
- `openChest(fun, rand = Math.random)` → `null` ou `{ rarity, loot: Loot[], forced }` ; le moteur règle coffres/tickets/fragments. Ensuite côté UI : `const p = R.placeLoot(state, res.loot)` (objets sur le plateau), `applyLoot(host, p.loot)` → `LootResult` (`cloth[]`, `furniture[]`, `dupCoins`, `text`), animer `p.events`.
- `rollTreasure(rand)` : tirage pur (tests / aperçu).
- Drops : `rollDrop`, `AUTO_KINDS`, `isAuto`. Raretés des drops et montants dans `config.drops`. Statistiques : `fun.endless2.drops` (`rarity:*`, `kind:*`, `chest:*`).
- Espacement : ≥ 2 fusions entre deux drops ; objets sur le plateau seulement s'il reste ≥ 5 cases libres.

### Butin (`loot.ts`)
`applyLoot(host, loot|loot[])`, `applyEvents(host, events)`, `lootLabel(loot)`, `describeResult`, `clothRarity(id)`, `furnitureRarity(id)`, `rarityIndex`. Un vêtement/meuble déjà possédé → pièces de compensation (`dupCoins`).
Vêtements : `world.wardrobe.owned` (ids de `data/world/wardrobe.ts`) ; meubles : `world.castle.owned[id]++` (ids de `FURNITURE_IDS`).

### Album (`album.ts`)
`discover(fun, item)` → `{ isNew, reward, completed?, milestone? }` (le moteur l'appelle déjà : écouter `discover`) · `albumProgress(fun)` → `{ found, total, perColl[], chainsDone, next:{label,have,need,reward} }`
· `isDiscovered` · `syncLegacyAlbum(fun, save.data.discovered)` (à appeler une fois pour importer l'ancien album **sans** récompense).

### Événements secondaires (`secondary.ts`)
`secondaryView(fun)` → ≤ 2 `{ id, name, blurb, icon, color, progress, goal, stage, stages, text, nextReward }` · `SEC_DEFS` (Festival des fleurs, Collection de chocolats, Album de souvenirs, Puzzle du château, Collection de bijoux, Défis de fusion).
Sans date limite ; aucune récompense perdue ; état dans `fun.endless2.sec` / `secDone`.

### Objectifs (`goals.ts`)
`goals(state, fun)` → `{ immediate, mid, long }`, chacun `{ id, kind, label, progress, goal, ratio, reward }` (immédiat = commande la plus proche ; moyen = coffre / événement ; long = prochaine collection puis album).

### Énergie (`economy.ts`)
Jauge inchangée (100, 45 s/énergie) **plus** : plancher (sous 6 énergie → 1 énergie / 25 s : 0→6 en 2 min 30), toucher gratuit (`R.tapCost`), énergie en jouant (livraison 3/5/8 selon palier, paliers de combo, nouveautés d'album, drops, coffres). Aucun achat de diamants requis. Constantes : `FLOOR_LEVEL`, `FLOOR_REGEN_MS`, `FREE_TAP_EVERY`, `deliveryEnergy(tier)`, `regenStep(e)`.

### Garde-fous
- **Anti-blocage** : après chaque action, si le plateau est plein, sans fusion ni livraison possible, l'objet le moins précieux (restes de collections « au repos » d'abord) devient une Étoile filante (`rescue`) ; si tout est au niveau max, une case est libérée. Test : 2000 actions aléatoires, aucune situation sans issue.
- **Combos** : multiplicateur ≤ ×3 ; au-delà de ×16 la fusion suivante repart à ×6 ; au plus 5 récompenses de palier et 8 énergie de combo par minute (`capped`).
- **Pas de saturation** : drops espacés, objets de drop convertis en pièces si le plateau est chargé.

## 4. Où lire les données (`save.data.fun.endless2`)
`gens['gen:<coll>']` `{level,xp}` · `album` (« coll:niveau ») · `albumClaimed` · `treasure` `{points,earned,opened,pity}` · `sec` · `secDone` · `replaces` · `tickets` · `fragments.cloth`
· `drops` (stats) · `counters` : `orders`, `orders:easy|mid|hard`, `merges`, `taps`, `freeTaps`, `chains`, `chestsEarned`, `chestsOpened`, `maxMerges`, `rescues`, `maxL:<coll>`, `activeMs`, `unlockedSeen`, `replaced`, `comboTiers`.
`RunState` (partie) reste dans `save.data.endless.run` ; champs facultatifs ajoutés : `clock`, `activeMs`, `comboWin`, `lastDropMerge` ; `OrderState.tier/reward/progress`. `validRun` (schema.ts) les nettoie ; un objet inconnu devient une case vide (la partie n'est jamais perdue).

## 5. Points d'attention pour l'UI / les textures
- `src/ui/screens/album.ts` (hors périmètre moteur) dessine encore **10 niveaux × `COLLECTION_IDS`** et `total = 43` : utiliser `collMax(c)` et `albumTotal()` (87 objets). `fun.endless2.album` est la source d'album Endless (l'ancien `save.data.discovered` reste valable → `syncLegacyAlbum`).
- Les textures (MergeScene/textures.ts) doivent couvrir les 7 nouvelles collections × 8 niveaux et les générateurs kinds 5..11 ; `MergeScene` utilise encore `MAX_LEVEL` pour un facteur d'échelle (inoffensif).
- Les anciens consommateurs de `deliver`/`combo` (playLevel.ts) continuent de compiler ; ils doivent passer à `applyEvents` pour éviter de rater les nouveaux gains.
- `tapGenerator` ne dépense pas l'énergie : l'UI le fait via `tapCost` (déjà le cas : `useEnergy` avant l'appel). Si `tapCost` = 0, **ne pas** dépenser.

## 6. Mesures de simulation (tests/endless-sim.test.ts)
Voir la sortie console du test (8 parties × 1800 actions, deux rythmes) : les durées visées sont des **hypothèses mesurées**, pas des garanties.
Ordres de grandeur (rythme « tranquille », fusion 2,5 s / toucher 5 s) : 1ʳᵉ récompense ≈ 0,8 min ; commande facile ≈ 1 / 2,7 min ; 1 coffre / ≈ 30 fusions ;
progrès secondaire ≈ 1 / 3,8 min (visé 5–8) ; récompense majeure ≈ 1 / 6,7 min (visée 10–15) ; énergie : 0 % du temps à attendre.

## 7. Plateau à zones et cases verrouillées (`src/game/merge/locks.ts`, `pointerFsm.ts`)

- `Cell.lock?: CellLock` : `kind` = `web` (objet sous toile), `sand` (case ensablée), `chest` (coffre derrière une toile), `reward` (diamants, énergie,
  fragment de tenue, décoration exclusive derrière une toile), `energy` (cadenas doux : N fusions). Un verrou ne contient JAMAIS d'objet vivant : l'objet visible est
  `lock.item`, il n'entre dans `cell.item` qu'à la libération. `isFree`/`spawnCell`/`placeGenerator` ignorent les cases verrouillées.
- Libération (événement `cellUnlock {at, kind, how: merge|order|energy|goal|zone, item?, reward[]}`) : fusion adjacente compatible (`lock.need`), sable = 2 fusions
  voisines (`lockHit` à la première), livraison de commande moyenne / difficile (1 case, celles qui cachent quelque chose d'abord), énergie
  (`R.buyUnlock(s, def, i, pay)` ; prix 3 à 6 ⚡, toujours ≤ plancher d'énergie), objectif (cadenas : N fusions ; zone atteinte).
- Zones (`ZONE_OF`, `EC.board.zoneAt`) : zone 0 = 28 cases ; les zones 1 à 3 sont ensablées puis dissipées (`zone`) quand `boardPoints` (palier + 4 par lieu ouvert) atteint le seuil.
  Persistance : `fun.endless2.board = { zone, serial, opened, claimed }` (optionnel, sanitisé). Une nouvelle partie ne reverrouille pas les zones atteintes et pose de NOUVELLES surprises.
- Garantie : jamais plus de `EC.board.maxLocked` (20) cases verrouillées → au moins 16 cases ouvertes (test : ≥ 14).
- UI : `hud.sel` (panneau sous le plateau), `openInfoFor` / `openLockSheet` (`src/ui/endless/itemSheet.ts`), appui long (550 ms, tolérance 8 px) = `MergeScene → host.onLongPress`.
- Nouvelles chaînes : `pastry` (12 · Four du pâtissier), `bag` (13 · Vitrine à sacs), `gift` (14 · Atelier d'emballage) ; débloquées au palier `unlock.at` OU plus tôt par un lieu
  (`unlock.byPlace` : salon de thé, boutique de mode, hôtel) une fois `minPoints` atteints.
