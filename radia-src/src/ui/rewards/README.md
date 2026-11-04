# Ouverture de cadeaux et de coffres (`src/ui/rewards`)

Mise en scène réutilisable dans tout le jeu : un cadeau / coffre / écrin apparaît, on le touche, il tremble, s'ouvre,
dévoile ses récompenses une par une, puis les ressources volent vers les compteurs du haut. 6 étapes :
1 apparition · 2 « Touche pour ouvrir » (toucher obligatoire) · 3 pré-ouverture (0,6–0,9 s, secousse, tension, vibration)
· 4 ouverture (flash, confettis, étoiles, pluie de paillettes) · 5 révélation + envol vers les compteurs · 6 « Continuer / Super ! ».

## API

```ts
import { openGift } from '../rewards';            // depuis src/ui/…
await openGift({
  kind: 'start' | 'daily' | 'chest' | 'event' | 'premium' | 'romantic',
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
  title: 'Récompense obtenue !', subtitle?: string,
  rewards: [{ type: 'diamonds', qty: 25 }, { type: 'cloth', id: 'dr-royal-gown', qty: 1 }],
  message?: 'J\'ai pensé à toi ♡',          // bulle d'Auguste
  chain?: GiftSpec[],                       // cadeaux suivants (3 au total au plus, bouton « Tout ouvrir »)
  key?: 'start-gift-v1',                    // idempotence : attribué une seule fois par sauvegarde
  day?: { n: 3, of: 7 },                    // compteur de jours (quotidien)
}, { host?: RewardHost, actions?: [{ label: 'Équiper', run }] });
```

`Reward` : `{ type, id?, qty, label?, icon?, rarity?, granted? }` avec `type` ∈ `coins | diamonds | energy | tickets | hearts | res
(id = flowers|fabric|cocoa|coins) | cloth | furniture | chest | memory | bouquet (id = « rose+peony ») | item (id = wand|wind,
sinon affichage seulement)`. La promesse se résout quand le calque a DISPARU (jamais de rejet).

* **Attribution** : faite par `openGift` AVANT la mise en scène (tous les cadeaux de la chaîne d'un coup), via un `RewardHost`
  (par défaut `host.ts` : wallet, monde, tickets du casino, `giveChest` de l'Endless, `unlockMemory`). Une clé `key` marque
  le drapeau `world.flags['rw:<key>']` (écrit tout de suite) avant le versement : pas de doublon au rechargement ni au double clic.
  Doublons d'objets = moitié du prix en pièces (comme ailleurs) ; souvenir déjà là = 50 pièces.
* **`granted: true`** : récompense DÉJÀ versée par l'appelant (affichage seulement). À utiliser partout où la logique d'attribution
  existe déjà (c'est le cas de toutes les intégrations ci-dessous).
* **Variantes** : `start`/`daily` = cadeau emballé (rose / lavande) ; `chest` = coffre en bois ; `event` = cadeau à sceau étoilé ;
  `premium` = coffre violet et or avec couronne (aura dorée) ; `romantic` = écrin rose, cœurs, lueur douce, son tendre, flash adouci.
  La rareté règle l'intensité (flash, confettis, étoiles, pluie, son : épique = accord doré, légendaire = fanfare), couleurs
  `#9FB4C7 #6FCF97 #5AA9FF #B07CFF #FFC857`.
* **Ergonomie** : calque propre `.rw-root` (dans `#reward-overlay`, z-index 5000, préfixe `rw-`, safe areas), boutons ≥ 44 px, « Passer » (accélère sans perdre de
  récompense), Échap/Entrée au clavier. Tout est retiré à la fin, sur sortie anticipée (`closeAllGifts()`) et si le calque est
  enlevé de l'extérieur (garde-fou 0,7 s). Animations réduites (`reducedMotion` / `effects: 'reduced'`) : version statique douce,
  aucune boucle d'animation, 5 étoiles au plus. Particules : un canvas propre, budget 90 simultanées / 40 par salve.
* `giftBusy()`, `whenGiftIdle()` : les ouvertures sont mises en file (une à la fois) ; le calendrier du jour attend qu'il n'y en ait plus.

## Intégration Endless (à faire dans `src/ui/endless/chestFlow.ts`, agent suivant)

Après `settleLoot(placed.loot)` (le butin est DÉJÀ versé), remplacer la carte « Un coffre pour toi ! » (de `ui.root.append(back)` jusqu'à
la boucle des lignes) par :

```ts
import { openGift } from '../rewards';
import { endlessChestSpec } from '../rewards/endless';
const spec = endlessChestSpec({
  rarity,                                   // 'common' | … | 'legendary' (res.rarity ou `force`)
  loot: placed.loot,                        // Loot[] de merge/types.ts
  cloth: out.cloth, furniture: out.furniture, dupCoins: out.dupCoins,
  itemIcon: (l) => (l.item ? itemImageUrl(l.item, 64) : undefined),
  names: { cloth: clothName, furniture: furnitureName },
});
await openGift(spec);                        // rareté épique/légendaire → coffre « premium » doré, sinon coffre en bois
// puis afterOpen(env, placed.events, placed.loot, out.cloth, out.furniture) (envols vers les compteurs du plateau, inchangé)
```
Pour « Ouvrir le suivant », boucler sur `pendingChests(fun)` avec un `await` par coffre (ou `chain` pour 2–3 coffres d'un coup).
`endlessChestSpec` marque tout `granted: true` : l'ouverture n'ajoute rien. Gros merge / fusion maximale : même appel avec
`kind: 'chest'` et `rarity: 'epic'` (`openGift({ kind: 'chest', rarity: 'epic', title: 'Fusion maximale !', rewards: [...granted] })`).

## Déjà branché

| Où | Quoi |
|---|---|
| `src/core/startGift.ts` (installé par `startDaily()`) | Cadeau de démarrage : 50 ⚡, 60 💎, 300 pièces, 100 tickets, 1 coffre ; une fois par sauvegarde (clé `start-gift-v1`), écran titre + `safeToNotify()` |
| `src/daily/ui.ts` | Cadeau du jour (`kind: 'daily'`, compteur de jours, Équiper / Placer / Utiliser au casino) ; calendrier et illustrations gardés |
| `src/casino/ui/lobby.ts` | Mission accomplie (tickets + objet exclusif) |
| `src/ui/screens/world/career/result.ts` | Palier de carrière franchi |
| `src/events/ui/conclusion.ts` | Récompenses d'un événement, avant le récapitulatif |
| `src/events/incidents/scenes/reveal.ts` | Colis surprise, sac de boutique |
| `src/domain/ui.ts` | Fin de rénovation d'un lieu (Équiper / Placer) |

Adaptateurs : `adapters.ts` (`careerMilestoneSpec`, `eventGiftSpec`, `parcelSpec`, `casinoMissionSpec`). Cadeau romantique d'Auguste :
`openGift({ kind: 'romantic', rarity, title, rewards, message: augusteNote(seed) })`.
Notifications : `.rw-root` n'est pas dans la liste de `safeToNotify()` (scheduler.ts) ; `giftBusy()` permet de s'en passer
(à ajouter à la liste si une notification devait s'afficher pendant une ouverture).

## Architecture d'empilement (RewardOverlay)

Table unique : `zlayers.ts` (`Z`). Un test statique (`tests/stacking-css.test.ts`) lit toutes les feuilles CSS et les styles en ligne de `src/` :
aucun z-index déclaré ne doit atteindre celui de la couche récompense.

| Couche | Où | z-index |
|---|---|---|
| Plateau Phaser (`#game`) | dans `#app` | 0 |
| `#ui` (écrans, modales 90–130, `.ev-layer` 91, `.ph-back`, `.dy-back` 130, casino 120/310, sheets Endless 56–60, paillettes 300…) | dans `#app` (`position: fixed` = contexte d'empilement) | 10 ; z internes jusqu'à 1000, prisonniers de `#ui` |
| Barre « mise à jour » (`core/updateWatch.ts`) | enfant de `<body>` | 2000 |
| **`#reward-overlay`** | enfant direct de `<body>`, HORS de `#app` | **5000** |

* `#reward-overlay` (layer.ts) est créé à l'ouverture de la première scène et RETIRÉ quand il n'y a plus de `.rw-root` (aucun calque résiduel).
  Il contient : la scène, son canvas de particules, les étoiles, les objets qui volent vers les compteurs, le bandeau des compteurs, ET un
  second calque de paillettes (`sparkle.ts` y bascule tant que la couche est ouverte ; `diamondBurst` de la boutique via `fxMount`).
* `#app`, `body`, `#ui` ne doivent JAMAIS avoir `transform/filter/will-change/isolation` (testé).
* Ouverture : `holdInterface()` (suspend.ts) mémorise puis masque (`visibility:hidden`, sans détruire) `.modal-backdrop`, `.toasts`, `.bubble`,
  `.gift-bub`, `.aug-says`, `.ev-notif`… ; `#app` reçoit `inert` + `aria-hidden` (plus de toucher, de clavier ni de lecteur d'écran en dessous) ;
  le focus est mémorisé. Un `MutationObserver` sur `#ui` masque aussi (et restitue ensuite) toute fenêtre ou bulle qui apparaît PENDANT l'ouverture ; `html.rw-open` marque l'état.
* Fermeture : restitution EXACTE (styles en ligne et attributs d'origine, focus), différée de 80 ms pour que deux scènes enchaînées ne fassent pas
  clignoter l'interface. Les écrans plein cadre (téléphone, casino, carrière, dressing, château, album, boutique, sheets Endless, événements) ne
  sont pas touchés : la couche s'affiche au-dessus et ils sont là, tels quels, à la fermeture.
* Jamais de fermeture automatique : « Continuer / Super ! » n'apparaît qu'après la révélation ; seul le toucher de la joueuse (ou « Passer ») avance.
* Doubles attributions : clé `key` (drapeau écrit avant le versement), `granted: true` pour les butins déjà versés, garde `chestBusy` côté boutique,
  garde `albumClaimed` côté album. File d'attente : `openGift` enchaîne les scènes une à une.
* Outil : `node scripts/stacking-check.mjs` (Playwright 393×852 / 393×660) — voir « Outils de test ».

### Où le coffre est routé (liste)
Cadeau de démarrage · cadeau du jour · missions du casino · palier de carrière · fin d'événement · colis des incidents · fin de rénovation d'un lieu ·
**Coffre d'Auguste (toutes les 4 h) et Coffre du royaume (boutique, `shopChest.ts`)** · **récompenses d'album Endless (`album.ts`, `endlessChestSpec`)**.
À brancher par l'agent S : `chestFlow.ts` (voir plus haut). Restent volontairement en notification légère : recharge d'énergie offerte et +100 ⚡ (toast),
bulle-cadeau flottante (quelques pièces toutes les 4–7 min), gain de cœurs d'un mini-jeu (fenêtre de résultat avec étoiles).

## Outils de test (`?debug`)

`RADIA.rewards.demo(kind, rarity, n?)`, `.chain()`, `.startGift()`, `.resetStart()`, `.give(spec)`, `.closeAll()`, `.slow(k)`
(ralenti ×k pour les captures), `.pending()`. Les démos n'attribuent rien. Tests : `tests/rewards-*.test.ts` (Vitest, hôte factice),
`scripts/rewards-e2e.mjs` (Playwright, Chromium émulé), `scripts/stacking-check.mjs` (cadeau PAR-DESSUS chaque contexte ; captures `shots/u-*.png`).
