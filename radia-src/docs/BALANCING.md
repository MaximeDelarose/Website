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
| Plancher accéléré (< 6 ⚡) | 25 s | **60 s** |
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
