# Casino Royal ♛ et roue du jour ♡ — API pour le hub

Jetons FICTIFS et GRATUITS (portefeuille séparé `save.data.fun.casino`). Rien à acheter, rien à convertir.
Les écrans sont chargés à la demande (import dynamique) ; seuls ces points d'entrée sont légers.

```ts
import { openCasino, grantChips, casinoStatus, onCasinoChange } from '../casino';
import { openWheel, wheelReady, nextWheelIn } from '../wheel';
```

| API | Rôle |
| --- | --- |
| `openCasino(): Promise<void>` | Ouvre l'écran plein cadre (carte d'Auguste → salon → jeux/missions). Promesse résolue à la fermeture. Appels répétés : même promesse. |
| `grantChips(n, reason?): number` | Verse `n` jetons gratuits en poche (récompenses quotidiennes, événements, missions du hub). Renvoie le nombre versé. |
| `casinoStatus(now?)` | `{ chips, pocket, table, claimable, refillReady, isNew, hasNews }` — `hasNews` sert de badge (première visite, mission prête, mini-recharge). |
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
- Mise débitée AVANT chaque manche, jamais de solde négatif ; limites min/max par jeu (`chips.ts`).
- Résultats tirés UNE fois (RNG injectable, `rng.ts`), l'animation s'y conforme ; multi-tirage de la machine = même fonction pure, 10 manches maximum, arrêtable.
- Machine à sous : table dans `slotsTable.ts`, retour théorique calculé exactement par `exactRtp()` (testé).
- Missions (`missions.ts`) : sans hasard, objets réels (vérifiés par test). Roue (`src/wheel/table.ts`) : probabilités affichées = poids de la table.
