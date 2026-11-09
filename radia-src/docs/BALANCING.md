# RADIA ♡ — Équilibrage du mode libre (économie, énergie, XP)

Tout se règle dans **`src/game/endless/config.ts`** (`ENDLESS_CFG`). Rien d'autre à toucher.
Rapport chiffré : `BALANCE_REPORT=1 npx vitest run tests/balance-sim.test.ts`
(profils : occasionnelle 3×4 min/j · régulière 2×20 min/j · longue 1×60 min/j · intensive 4×30 min/j, 14 jours, médiane de 3 parties).

## Principes
- L'énergie, les pièces, diamants et tickets doivent compter, **sans frustration** : l'énergie revient toujours (plancher accéléré sous 6 ⚡), Mon Monde / dressing / boutique restent jouables à 0 ⚡.
- Aucune ressource n'est retirée des sauvegardes ; seuls les **gains futurs** changent.
- Plus de bonus répétable à volonté : le « +30 offert par Auguste » est **quotidien** (1 par jour, minuit local).

## Énergie (avant → après)
| Réglage | Avant | Après |
|---|---|---|
| Coût d'un toucher | 1 | 1 |
| Recharge naturelle (`energy.regenMs`) | 45 s | **120 s** (≈ 1 ⚡ / 2 min) |
| Plancher accéléré (< 6 ⚡) | 25 s | **30 s** |
| Toucher gratuit 1 / N (`freeTapEvery`) | 14 | 20 |
| Chance de toucher gratuit (niv. générateur) | 0–8 % | 0–4 % |
| Livraison facile / moyenne / difficile | 3 / 5 / 8 ⚡ | **2 / 3 / 5 ⚡** |
| Cadeau d'Auguste (`dailyGift`) | +30 toutes les 10 min | **+30 une fois par jour** |
| Paliers de combo (3/5/8/12/16) | 1/2/3/4/6 ⚡ | 0/1/1/2/3 ⚡ ; plafond 2 ⚡/min (avant 8) |
| Chapitres : combo ≥ 5 | +5 ⚡ à *chaque* fusion | +2 ⚡ à l'atteinte du palier 5, +3 ⚡ au palier 8 |
| Chapitres : livraison | +3 ⚡ | +1 ⚡ |
| Chapitres : victoire de niveau | 15 / 5 ⚡ | 8 / 2 ⚡ |
| Drops d'énergie (poids / montants) | 18 / 2–25 | 8 / 1–10 |
| Récompenses visibles (cases) | 8–14 ⚡ | 4–8 ⚡ |
| Album : nouveauté / chaîne | 2 ⚡ dès niv. 3 / 20 ⚡ | 1 ⚡ dès niv. 4 / réduit |
| Maximum | 100 | 100 (le surplus n'est jamais perdu en silence : il est refusé avec message, le cadeau quotidien reste disponible) |

## Pièces (avant → après)
`coinsPerTap` 2,4 → 1,5 · drops 6/12/24/50/120 → 4/8/15/30/70 · fusion max 40 → 20 · album 4 → 3 par niveau.
Mesuré : revenu de pièces **−43 % à −53 %** pour les profils occasionnel / régulier.

## Résultats de simulation (après)
| Profil | Commandes/jour | Pièces/jour | XP/jour | Séances bloquées par l'énergie | Part des bonus dans l'énergie |
|---|---|---|---|---|---|
| Occasionnelle | 8,6 | 828 | 168 | 0 % | ≈ 33 % |
| Régulière | 30,4 | 2 786 | 574 | 79 % (fin de séance quand l'énergie est épuisée : voulu) | ≈ 39 % |
| Longue | 16,1 | 1 344 | 287 | 100 % (la séance de 60 min épuise l'énergie) | ≈ 44 % |
| Intensive | 91,1 | 6 958 | 1 584 | 100 % | ≈ 45 % |

Lecture : une séance courte n'est jamais bloquée ; une longue séance finit par l'énergie (c'est le but de l'économie), avec Mon Monde, le dressing, la boutique et les échecs jouables à 0 ⚡.
**Limite honnête** : simulation par robot sur Chromium émulé ; le ressenti réel (iPhone) reste à valider par Maxime.

## Niveau de Radia (XP) — `ENDLESS_CFG.xp`
- XP cumulée pour le niveau *l* = 60 × (l−1)^1,7 (L2 = 60 · L5 ≈ 630 · L10 ≈ 2 500 · L20 ≈ 9 000).
- XP par livraison : facile 10 · moyenne 18 · difficile 30 · +6 si la commande contient un savon PIMBÊCHE.
- Récompense de niveau : 20 + 8 × niveau pièces ; +6 ⚡ tous les 2 niveaux (versées une seule fois, avec la commande).
- Valeur stockée : `fun.endless2.counters.xp` (aucun changement de schéma, aucune migration risquée). Les sauvegardes existantes démarrent à 0 XP et gagnent normalement.

## PIMBÊCHE
- Atelier ouvert dès **3 commandes livrées** (`unlock.at.soap`).
- La **première commande de savon** est garantie (facile) ; ensuite `orders.pimbecheChance` = 30 % des commandes (premier objet).
- Tous les savons sont au **lait de chèvre** (règle de marque, vérifiée par test).

## Pièces : la monnaie centrale (refonte « économie & casino »)
Revenus simulés (voir plus haut) : **≈ 830 pièces/jour** (occasionnelle, 3×4 min) · **≈ 2 800 pièces/jour** (régulière, 2×20 min) · ≈ 90–96 pièces par commande livrée.

### Courbe de prix (`src/data/world/prices.ts`)
| Palier | Règle | Exemples | Jours de jeu (occasionnelle / régulière) |
|---|---|---|---|
| Premiers achats | ≤ 150 pièces : inchangé | tee-shirt rose 60, lunettes 100 | < 1 jour |
| Achats courants | 151–300 : ×2 | robe fleurie 520, commode 440 | ≈ 0,6 / 0,2 |
| Intermédiaires | > 300 : ×3 | canapé 1 050, robe lavande 1 140 | ≈ 1,3 / 0,4 |
| Prestige | prix fixés (`PRESTIGE_PRICE`) | cheminée 4 000, lustre 4 500, pergola 5 000, robe royale 6 000, fontaine 6 000, diadème 8 000, lit royal 8 000, robe tapis rouge 9 000, couronne dorée 12 000 | 5 à 14 jours / 1,5 à 4,5 jours |

Objectifs voulus : 500 pièces = un petit plaisir (≈ 5 commandes) · 5 000 pièces = quelques jours d'épargne · 20 000 pièces = un vrai objectif (PIMBÊCHE niveau max + prestige).

### PIMBÊCHE (`src/game/endless/pimbeche.ts`, 13 améliorations, total 42 800 pièces)
Atelier 400 → 1 200 → 3 000 → 9 000 · recettes (rose 600, lavande 1 000, miel 1 600, exfoliant 2 800, personnalisé 5 000) · emballage 700, présentoir 1 500, vitrine 4 000, décoration pro 12 000.
Effet réel : jusqu’à **+82 % de pièces** (+ pièces fixes + XP) sur les commandes de savon ; niveaux de Radia requis (2 à 9). Rentabilisé en quelques dizaines de commandes de savon : un objectif d'épargne à chaque étape, jamais obligatoire.
Objectif d'épargne : appuyer sur « épargner » d'une amélioration trop chère la place en objectif, avec jauge et « il te manque X pièces (environ N commandes) ».

### Casino en pièces (`src/casino/bank.ts`)
- Les jeux misent directement les pièces de RADIA (`save.data.world.res.coins`) : un seul portefeuille, débit tout-ou-rien avant la manche, jamais de solde négatif, gains crédités une seule fois.
- Mises : 100 / 250 / 500 / 1 000 / 2 500 / 5 000 / 10 000, puis plus si la bourse le permet. Maximum par manche = max(10 000, moitié de la bourse), plafonné à 1 000 000 et jamais supérieur au solde.
- Pas une source infinie de pièces : retour théorique < 100 % (roulette 97,3 %, machine à sous et blackjack publiés dans l'aide de chaque jeu) ; aucun bonus de série.
- Jamais obligatoire : les commandes rapportent des pièces même à 0.
- Les tickets déjà gagnés sont **conservés** (tout ticket resté « à la table » revient en poche à l'ouverture).

### Tickets (ressource rare, plus de mise) — `src/casino/privileges.ts`
Soirée du Casino Royal (50 tickets : 3 tours offerts à 100 pièces, 1 fois/jour) · cadeau d'Auguste (60 → 5 diamants) · coffret d'atelier (40 → 10 fleurs/tissus/cacaos) · collier de perles 150 · cheminée 250 · pergola 300 · fontaine 350 · robe tapis rouge 450 · diadème 500.
Les tickets ne se rechangent jamais en pièces.

### Caisse d'échange pièces → tickets
- Carte d'Auguste : **100 pièces = 10 tickets** (`src/casino/exchange.ts`, `EXCHANGE_COINS` / `EXCHANGE_TICKETS`).
- Plafond : **100 tickets par jour** (`DAILY_CAPS.exchange` dans `src/casino/tickets.ts`), pour éviter de vider la bourse d'un coup.
- Strictement virtuel : aucun argent réel, aucun achat, les tickets ne se rechangent jamais en pièces. Seules des PIÈCES sont débitées (jamais diamants ni énergie).

### Interactions de l'économie
Sources de pièces : livraisons (≈ 85 %), découvertes d'album, fusions maximales, drops, déblocages, niveaux de Radia. Puits : dressing, meubles, jardin, chocolat, générateurs, PIMBÊCHE, caisse d'échange, casino. Le casino ne crée pas de pièces en moyenne (retour théorique < 100 %) ; la soirée offerte (≈ 290 pièces/jour au plus, 50 tickets) reste marginale face à 830–2 800 pièces/jour.

## Plateau plein
- Conseil discret « Ton plateau commence à être plein ♡ » à 80 % d'occupation (`FULL_HINT_RATIO`), au plus toutes les 3 min, jamais pendant une fusion.
- « Vendre » (barre de l'objet sélectionné) : confirmation, prix bas (niveau ÷ 2 pièces), générateurs et objets spéciaux jamais vendables, avertissement pour les objets précieux ou utiles à une commande. Le sac (glisser l'objet dessus) reste la solution sans perte.
