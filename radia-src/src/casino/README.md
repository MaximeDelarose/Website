# Casino Royal ♛ et roue du jour ♡ — API pour le hub

> Il n'y a **plus de tickets** : le casino se joue avec les **pièces dorées** de RADIA (portefeuille unique `world.res.coins`, voir `bank.ts`).
> Les gains gratuits (défis, événements, succès) sont versés en pièces (`rewards.ts`, `grantCoins`), plafonnés par jour pour les sources ouvertes.
> Les anciens tickets des sauvegardes ont été convertis une fois (1 ticket = 10 pièces, `mergeTickets` dans `src/save/fun.ts`).

Les écrans sont chargés à la demande (import dynamique) ; seuls ces points d'entrée sont légers.

```ts
import { openCasino, grantCoins, casinoStatus, onCasinoChange } from '../casino';
import { openWheel, wheelReady, nextWheelIn } from '../wheel';
```

| API | Rôle |
| --- | --- |
| `openCasino(): Promise<void>` | Ouvre l'écran plein cadre (carte d'Auguste → salon → jeux/missions). Promesse résolue à la fermeture. Appels répétés : même promesse. |
| `grantCoins(n, reason?): number` | Verse `n` pièces gratuites dans le portefeuille (événements, défis…), plafond du jour appliqué. Renvoie le nombre versé. |
| `casinoStatus(now?)` | `{ coins, tasks, claimable, isNew, hasNews }` — `hasNews` sert de badge (première visite, mission ou défi prêt). |
| `onCasinoChange(fn)` | Abonnement (renvoie la désinscription) quand le solde change. |
| `openWheel(): Promise<void>` | Ouvre la roue du jour (un tirage gratuit par jour). |
| `wheelReady(now?: Date \| number): boolean` | Le tirage du jour est-il disponible ? |
| `nextWheelIn(now?): number` | Millisecondes avant le prochain tirage (0 si disponible). |

## Branchement attendu (agent H)
- Importer `src/casino` (et `src/wheel`) depuis le hub : l'import enregistre aussi les outils `RADIA.casino` / `RADIA.wheel` en mode `?debug`.
- Badges : `casinoStatus().hasNews` et `wheelReady()`.

## Mode développeur (`?debug` uniquement)
`RADIA.casino.open()`, `.give(n)`, `.set(n)`, `.state()`, `.roulette(0..36 | graine)`, `.slots(n, graine)` (simulation pure),
`.blackjack(graine)`, `.mission(id)`, `.reset()` ; `RADIA.wheel.show()`, `.reset()`, `.skipDay()`, `.force(lotId)`, `.state()`.

## Règles clés
- Mise débitée AVANT chaque manche (en pièces), jamais de solde négatif ; limites min/max par jeu (`chips.ts`).
- Résultats tirés UNE fois (RNG injectable, `rng.ts`), l'animation s'y conforme ; multi-tirage de la machine = même fonction pure, 10 manches maximum, arrêtable.
- Machine à sous : table dans `slotsTable.ts`, retour théorique calculé exactement par `exactRtp()` (testé).
- Missions (`missions.ts`) : sans hasard, objets réels (vérifiés par test). Roue (`src/wheel/table.ts`) : probabilités affichées = poids de la table.

## Gains gratuits en pièces (rewards.ts)
Cadeau d'ouverture (300, une fois) · calendrier quotidien J3 (500 + 5 ⚡) et J6 (800) · roue du jour (pièces, diamants, énergie, mode, déco, objet rare, fragment) ·
missions (150 à 1 000 pièces + objets exclusifs, sans hasard) · défis du jour (40/40/40/60 : visite, saluer, lire une règle, roue ; sans mise) ·
paliers des événements Endless (`endlessHook.ts`, 60/90/180, plafond 1 200/jour, jamais deux fois pour un même événement) · succès (150, une fois).
Les privilèges exclusifs (`privileges.ts`) s'achètent en pièces ou s'obtiennent par les missions. Aucun jeu n'est requis pour gagner des pièces.

## Salon
Illustration vivante (lustres, machines, grande roue du jour, tables de roulette et de blackjack, Radia et Auguste) : chaque zone est un bouton,
les personnages réagissent (bulles rares, `pickLine`). « Prochain gain gratuit » + « Défis du jour » + accès roue / missions / carte.
Grosse victoire (gain net >= 20 x la mise) : `bigWinBanner` (décompte doré, ~2,6 s, un toucher la ferme).
