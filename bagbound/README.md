# BAGBOUND (titre provisoire)

Roguelite auto-battler en sac à dos, jouable sur le site (`../bagbound.html`).
Ce dossier contient le **moteur de combat headless** (Phase 1 : TypeScript pur,
sans rendu), le contenu en JSON validé par schéma, les tests, un script de
simulation en masse, et l'**interface navigateur** (Phase 2 : Vite + Canvas 2D)
compilée dans `app/`. Le site reste statique : `app/` est publié tel quel.

```bash
cd bagbound
npm install
npm test            # suite de tests (vitest)
npm run typecheck   # tsc --noEmit
npm run sim         # sac de départ contre chaque ennemi, 500 combats chacun
npm run sim -- --enemies goblin,wolf,spider --n 2000 --policy potion --items
npm run sim:run     # parties complètes jouées par un bot (taux de victoire, où il meurt)
npm run dev         # serveur Vite (index.html) pour travailler sur l'interface
npm run build       # compile app/bagbound.js + app/bagbound.css et met à jour le ?v= de ../bagbound.html
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/engine/` | Bibliothèque pure : RNG à seed, géométrie des sacs, registres, effets/déclencheurs/statuts, boucle de combat. **Interdits** : `Math.random`, `Date.now`, `performance.now`, DOM, Node (vérifié par `tests/purity.test.ts`). |
| `src/content/` | Schémas zod (`schema.ts`), chargeur + vérification des références (`loader.ts`), lecture depuis le disque pour Node (`node.ts`). |
| `data/` | Tout le contenu : `rules.json` (équilibrage du combat), `tags.json`, `items.json`, `enemies.json`, `classes.json`, `run.json` (règles de run), `zones.json`, `loot.json`, `events.json`, `sandbox.json` (atelier). Rien n'est codé en dur. |
| `src/game/` | Logique de jeu hors combat, sans DOM : `bag.ts` (sac du joueur), `map.ts` (carte d'un étage), `run.ts` (boucle de run), `autoplace.ts` (rangement automatique), `bot.ts` (joueur automatique pour les tests et les simulations). |
| `src/ui/` | Interface navigateur : `app.ts` (atelier, combat en direct, entrées tactiles/souris/clavier), `draw.ts` (rendu canvas), `sprites.ts` (pixel art 16 x 16 en texte + variantes de palette), `describe.ts` (infobulles générées depuis les données), `layout.ts`, `fx.ts`, `style.css`. |
| `app/` | Build publié (ne pas modifier à la main). |
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
- [x] Phase 2 : grille, placement, rotation, glisser-déposer, rendu du combat
  (atelier jouable sur le site, voir ci-dessous).
- [x] Phase 3 : boucle de run (carte, boutique, butin, événements, coffres, feux de camp, boss), sauvegarde.
- [ ] Phase 4 : fusions, potions (remplissage), extensions de sac.
- Équilibrage : `npm run sim:run` donne environ 15 % de victoires au bot (qui
  range de façon gloutonne, sans chercher les synergies ni lancer de potions) ;
  la plupart des défaites ont lieu aux étages 2 et 3, contre les groupes.

## Interface (Phase 2)

- **Mise en page** : portrait d'abord (arène ~40 % en haut, barre de commandes,
  sac en bas, réserve sous le sac hors combat) ; en paysage, l'arène prend toute
  la largeur et la colonne du sac s'élargit.
- **Atelier** : glisser un objet entre la réserve et le sac (aperçu vert/rouge,
  aimanté sur la grille), toucher = rotation (`R` ou clic droit sur PC, `M` =
  miroir, deuxième doigt pendant un glisser = rotation), toucher long ou survol =
  infobulle. Les bonus réels du sac (adjacence, pointes) sont calculés par le
  moteur et affichés (petit + vert, valeurs « 6 (5 +1) » dans l'infobulle).
  La flèche jaune montre la case visée par une case spéciale.
- **Combat** : `createCombat` + `stepCombat` à 10 ticks/s × vitesse (x1/x2/x4),
  barres de cooldown interpolées entre deux ticks, effets lus dans le journal
  d'événements (chiffres flottants, flashs, particules, élan d'attaque,
  projectile des lancers, bannières de phase et de mort subite). Potions :
  toucher = boire, toucher long / clic droit = lancer (`queueAction`). Toucher un
  ennemi = inspecter son sac. `Espace` pause, `1/2/3` vitesse, ⏭ fin immédiate.
- **Résultat** : contribution de chaque objet, graine du combat, « Revoir »
  rejoue exactement le même combat (même graine, même sac).
- **Sprites** : 16 x 16 pour les objets et les personnages (2 frames d'idle
  par décalage), à remplacer par du 32 x 32 plus tard sans toucher au code
  (une entrée par sprite dans `SPRITES`, une variante de palette par objet
  dans `VARIANTS`). Un test vérifie que chaque objet et chaque ennemi a un sprite.
- **Atelier** (`data/sandbox.json`) : classe, objets de la réserve, rencontres
  proposées. C'est un mode d'essai en attendant la boucle de run (Phase 3).

## Run (Phase 3)

Une partie traverse les zones de `data/zones.json` (pour l'instant la Forêt des
Murmures : 3 étages, boss à la fin). Toute la logique est dans `src/game/run.ts`,
pure, déterministe (RNG de la run) et sérialisable telle quelle en JSON.

- **Carte** (`map.ts`) : `run.json.rows` rangées de 2 à 4 nœuds, reliées vers le
  haut sans croisement marqué (chaque nœud a une entrée et une sortie). Première
  rangée = combats, élites à partir de `eliteMinRow`, types tirés selon
  `nodeWeights`. Le dernier étage d'une zone finit par un feu de camp puis le boss.
  Les rencontres sont tirées à la génération dans `zones.json` (par étage :
  `normal`, `elite`, `hpMul`) et révélées en touchant le nœud.
- **Combat** : `combatSetup(run)` donne la seed, les PV actuels et le sac posé ;
  `finishCombat(run, …, résultat)` reprend les PV, le sac après combat (charges,
  potions vidées, objets lancés) et donne l'or (`loot.gold` des ennemis, bonus
  d'élite) puis 3 objets au choix tirés dans la table `loot.table` de l'ennemi le
  plus fort (`loot.json`). Défaite ou égalité = fin de la partie.
- **Boutique** : stock tiré dans `shopTable`, achat, vente (`sellRatio`),
  renouvellement (prix croissant), soin payant. **Coffre** : or + 1 objet parmi 2.
  **Feu de camp** : se reposer (`healPct`) ou s'entraîner (+PV max).
- **Événements** (`events.json`) : texte, choix avec conditions (`gold`, `tag`,
  `item`) et effets en données : `gold`, `hp`, `heal`, `maxHp`, `item` (tiré
  dans une table), `addItem`, `loseItem` (par tag), `refill` (remplit les
  bouteilles vides), `fight` (combat), `random` (issues pondérées).
- **Sauvegarde** : l'état complet est écrit en localStorage après chaque étape ;
  un combat interrompu reprend à l'identique (même seed).
- **Réserve** : les objets gagnés arrivent dans la réserve ; seuls les objets
  posés dans le sac combattent.
