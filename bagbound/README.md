# BAGBOUND (titre provisoire)

Roguelite auto-battler en sac à dos. Ce dossier contient la **Phase 1** de la
roadmap : le **moteur de combat headless** (TypeScript, sans aucun rendu), le
contenu en JSON validé par schéma, une suite de tests et un script de
simulation en masse. L'UI (Vite + Canvas) arrive en Phase 2 : le site reste
statique, le jeu sera compilé dans un dossier publié tel quel.

```bash
cd bagbound
npm install
npm test            # suite de tests (vitest)
npm run typecheck   # tsc --noEmit
npm run sim         # sac de départ contre chaque ennemi, 500 combats chacun
npm run sim -- --enemies goblin,wolf,spider --n 2000 --policy potion --items
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/engine/` | Bibliothèque pure : RNG à seed, géométrie des sacs, registres, effets/déclencheurs/statuts, boucle de combat. **Interdits** : `Math.random`, `Date.now`, `performance.now`, DOM, Node (vérifié par `tests/purity.test.ts`). |
| `src/content/` | Schémas zod (`schema.ts`), chargeur + vérification des références (`loader.ts`), lecture depuis le disque pour Node (`node.ts`). |
| `data/` | Tout le contenu : `rules.json` (équilibrage global), `tags.json`, `items.json`, `enemies.json`, `classes.json`. Rien n'est codé en dur. |
| `scripts/simulate.ts` | Simulation en masse (N combats headless) : victoires, durée, PV restants, contribution de chaque objet. |
| `tests/` | Déterminisme, effets, statuts, déclencheurs, adjacence, cases spéciales, potions, phases, mort subite, validation du contenu, extensibilité. |

## API

```ts
import { loadContent } from "./src/content/loader";
import { runCombat, createCombat, stepCombat, queueAction } from "./src/engine";

const content = loadContent({ rules, tags, items, enemies, classes }); // lève ContentError si invalide

// D'une traite (simulations, validation serveur)
const r = runCombat(content, {
  seed: 42,
  player: { hp: 60, bag: [{ item: "wooden_sword", pos: [1, 0], rot: 0 }] },
  enemies: [{ id: "goblin" }, { id: "wolf", hpMul: 1.2 }],
  actions: [{ tick: 30, type: "drink", combatant: 0, item: "0:4" }],
});
r.outcome; r.hash; r.playerBagAfter; r.itemStats;

// Pas à pas (rendu) : x1 / x2 / x4 = 1, 2 ou 4 appels à stepCombat par pas de 100 ms
const st = createCombat(content, setup, { record: true });
stepCombat(st);                                   // st.events : journal pour le rendu
queueAction(st, { type: "throw", combatant: 0, item: "0:4", target: 1 });
```

Rejouer = relancer `runCombat` avec la même seed, les mêmes sacs et `r.actions`
(l'empreinte `r.hash` doit être identique). C'est la base des replays, des
fantômes, des seeds quotidiens et de la validation côté serveur.

## Règles de simulation

- **Pas fixe** : 1 tick = 100 ms (`rules.tick`). Les durées sont converties en
  millisecondes entières : un objet à 3 s part exactement au tick 30.
- **Ordre d'un tick** : actions manuelles → poison/brûlure → durée des statuts
  d'objets → remplissage de toutes les barres → déclenchement des objets prêts
  (le camp qui commence alterne à chaque tick) → mort subite → fin.
- **Coups simultanés** : tous les objets prêts au même tick frappent, même si
  leur porteur tombe pendant la résolution ; deux coups mortels simultanés
  donnent un match nul.
- **Vitesse** : `1 + haste statique + haste/slow temporaires`, bornée par
  `rules.speed` (0,25 à 3). Le gel bloque la barre (plafonné à `freezeMax`).
- **Recharge** : remplit la barre mais ne déclenche jamais immédiatement
  (l'objet part au tick suivant) ; pas de boucle infinie possible.
- **Chaînes de déclencheurs** : profondeur max `maxTriggerDepth`, et un objet
  ne se déclenche pas plus de `maxFiresPerItemPerTick` fois par tick.
- **Statuts** (`rules.statuses`) : poison = 1 dégât par stack chaque seconde,
  ignore le bouclier, ne décroît pas ; brûlure = toutes les 0,5 s, absorbée par
  le bouclier, perd 1 stack à chaque fois.
- **Mort subite** : après `suddenDeath.start` secondes, dégâts croissants
  (1, 2, 3…) aux deux camps chaque seconde, bouclier ignoré.
- **Cibles** : « l'ennemi » du joueur est le premier ennemi vivant ; les
  ennemis visent le joueur.
- **Potions** (seule interaction directe) : `drink` applique `effects` et
  consomme une charge ; `throw` applique `throwEffects` (à défaut, `effects`
  retournés vers l'ennemi) à l'ennemi visé et consomme une charge. Sans charge
  (bouteille vide, couteau de lancer), c'est l'objet lui-même qui est lancé et
  détruit. À 0 charge, `onEmpty.transformInto` remplace l'objet (même case).
  Verrou de `potionLockout` s entre deux utilisations du même objet.
- **Boss à phases** : quand PV / PV max passe sous `hpBelow`, le sac est
  remplacé (`replace`) ou enrichi (`add`), avec soin/bouclier optionnels.

## Contenu

Objet (`data/items.json`) — tous les champs sauf `id`, `name`, `shape` ont une
valeur par défaut :

```json
{
  "id": "flame_sword", "name": "Épée de flammes",
  "shape": [[0, 0], [0, 1], [0, 2]],
  "specialCells": [{ "cell": [0, 0], "role": "tip", "dir": [0, -1], "effect": { "type": "buff", "stat": "burn", "value": 1 } }],
  "tags": ["Arme", "Métal", "Feu"], "tier": 2, "rarity": "rare", "price": 12,
  "cooldown": 3,
  "effects": [{ "type": "damage", "value": 6 }, { "type": "burn", "value": 2 }],
  "triggers": [],
  "adjacency": [{ "target": { "tag": "Arme" }, "effect": { "type": "haste", "value": 0.15 } }],
  "charges": null, "manual": false, "onEmpty": null, "throwEffects": null
}
```

- **Effets** : `damage`, `shield`, `heal`, `poison`, `burn`, `purge` (sur un
  combattant) ; `freeze` (`duration`), `haste` / `slow` (`value` + `duration`),
  `recharge` (`value` en secondes ou `full: true`) (sur des objets).
- **Cibles** (`target`) : `self`, `enemy`, `randomEnemy`, `allEnemies` ;
  `thisItem`, `adjacent`, `randomAllyItem`, `allAllyItems`, `randomEnemyItem`,
  `allEnemyItems` (+ `count`, `filter: { tag, anyTag, notTag }`).
- **Déclencheurs** (`triggers`, en plus de la barre si `cooldown`) :
  `onCombatStart`, `onItemTrigger`, `onAdjacentTrigger`, `onHit` (le porteur
  touche), `onDamaged` (le porteur est touché), `onLowHP` (`threshold`, une
  fois), `onKill`. Options : `filter`, `chance`, `icd` (s), `max`.
- **Adjacence** : `apply: "neighbor"` (défaut, le voisin reçoit) ou `"self"`
  (+ `perNeighbor`). Modificateurs : `haste` (vitesse) et `buff`
  (`stat` = type d'effet augmenté). Toujours par **tags**, jamais par nom.
- **Cases spéciales** : `dir` vise la case `cell + dir` (tournée avec l'objet) ;
  sans `dir`, les 4 côtés de la case.

Le chargeur refuse les tags, effets, cibles, déclencheurs et objets inconnus,
les champs mal orthographiés, les effets incomplets, les sacs qui se
chevauchent ou sortent de la forme de la classe.

## Ajouter une mécanique sans toucher au cœur

```ts
import { registerEffect, dealDamage, healCombatant, effectValue } from "./src/engine";

registerEffect({
  type: "lifesteal", targetKind: "combatant", defaultTarget: "enemy", requires: ["value"],
  apply(ctx, effect, targets) {
    for (const t of targets) {
      const dealt = dealDamage(ctx.state, { source: ctx.owner, target: t, amount: effectValue(ctx, effect), item: ctx.item, kind: "damage", depth: ctx.depth });
      healCombatant(ctx.state, ctx.owner, dealt, ctx.item);
    }
  },
});
```

Idem avec `registerTrigger`, `registerTarget`, `registerStatus` (statut de
combattant), `registerItemStatus` (statut d'objet) et `registerModifier`.
Les modules de base sont dans `src/engine/builtins.ts`.

## État

- [x] Phase 1 : moteur headless, contenu de départ (≈40 objets, 10 ennemis dont
  1 élite et 1 boss à 2 phases, 1 classe), tests, simulation en masse.
- [ ] Phase 2 : grille, placement, rotation, glisser-déposer, rendu du combat.
- L'équilibrage du contenu de départ est à faire avec `npm run sim` : le sac de
  départ bat tous les monstres seuls et perd contre les groupes et le boss.
