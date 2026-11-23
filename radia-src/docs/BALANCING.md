# RADIA ♡ — Équilibrage du mode libre (économie, énergie, XP)

Tout se règle dans **`src/game/endless/config.ts`** (`ENDLESS_CFG`). Rien d'autre à toucher.
Rapport chiffré : `BALANCE_REPORT=1 npx vitest run tests/balance-sim.test.ts`
(profils : occasionnelle 3×4 min/j · régulière 2×20 min/j · longue 1×60 min/j · intensive 4×30 min/j, 14 jours, médiane de 3 parties).

## Principes
- L'énergie, les pièces et les diamants doivent compter, **sans frustration** : l'énergie revient toujours (plancher accéléré sous 6 ⚡), Mon Monde / dressing / boutique restent jouables à 0 ⚡.
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
- Les jeux misent directement les pièces de RADIA (`save.data.world.res.coins`) : un seul portefeuille, débit tout-ou-rien avant la manche, jamais de solde négatif, gains crédités une seule fois dans la même bourse.
- Mises : 100 / 250 / 500 / 1 000 / 2 500 / 5 000 / 10 000, puis plus si la bourse le permet. Maximum par manche = max(10 000, moitié de la bourse), plafonné à 1 000 000 et jamais supérieur au solde.
- Pas une source infinie de pièces : retour théorique < 100 % (roulette 97,3 %, machine à sous et blackjack publiés dans l'aide de chaque jeu) ; aucun bonus de série.
- Jamais obligatoire : les commandes rapportent des pièces même à 0.

## Simplification de l'économie : plus de tickets, plus de pièces grises
Monnaies : **pièces dorées** (principale), **diamants** (rare), **énergie** (pour jouer). Les fleurs / tissus / cacao restent des matières, les cœurs un compteur d'événements.

### Pièces grises
Il n'y a jamais eu de seconde monnaie : c'était l'émoji 🪙 (rendu gris/argenté sur iPhone) dans la roue du jour, le bouton « Vendre », le salaire de carrière et le badge « Salaire prêt ». Il est remplacé partout par la pièce dorée dessinée (`resIconUrl('coins')`, `drawResIcon`). Un seul portefeuille : `world.res.coins`. Test : plus aucun 🪙 / 🎟 dans `src/`.

### Tickets supprimés
Il existait DEUX compteurs : les tickets du casino (`fun.casino.chips` en poche + `bring` sur la table) et des « tickets d'événement » (`fun.endless2.tickets`, jamais utilisés). Supprimés, ainsi que la caisse d'échange, la mini-recharge, les plafonds et compteurs propres aux tickets (`src.*`, `priv.*`).
- **Migration** (`mergeTickets` dans `src/save/fun.ts`, appelée par `sanitize` dans `src/save/schema.ts`) : **1 ticket = 10 pièces** (le taux de l'ancienne caisse d'échange : 100 pièces = 10 tickets), **une seule fois** (marque durable `fun.economy.merged`), plafonnée au maximum de pièces du jeu (999 999 999). Rechargement, réimportation ou reprise ne dupliquent rien ; une ancienne sauvegarde réimportée est convertie une fois de plus, séparément. Les récompenses visibles « ticket » restées sur un plateau sont converties au même taux. Un message unique (« Une économie plus simple ») annonce le nombre de pièces reçues.
- Diamants, énergie, objets achetés et progression ne sont pas touchés. Tests : `tests/tickets-migration.test.ts` (11) et `scripts/tickets-migration-e2e.mjs`.

### Remplacement des gains en tickets (futurs gains, calibrés sur 830–2 800 pièces/jour)
| Source | Avant | Maintenant |
|---|---|---|
| Roue du jour | tickets 200 / 600 (16 %) | pièces 100 (24 %) · 300 (14 %) · **600 (4 %)** ; énergie 3 (14 %) · **8 (4 %)** ; diamants 2 · 6 ; mode 6 % · déco 6 % · **objet rare 4 %** · fragment 6 %. Espérance ≈ **90 pièces**, 0,5 diamant, 0,7 énergie par tirage |
| Calendrier quotidien | J3 : 250 tickets · J6 : 400 tickets + objet | J3 : **500 pièces + 5 énergie** · J6 : **800 pièces** + objet (×1,15 par tour de thèmes, plafond ×2) |
| Défis du jour du casino | 30 / 30 / 30 / 40 tickets | **40 / 40 / 40 / 60 pièces** (plafond 400/jour) |
| Missions du casino | 100 à 500 tickets + objet | **150 à 1 000 pièces** + objet exclusif (doublon : 200 pièces) |
| Succès | 50 tickets | **150 pièces** (une seule fois par succès) |
| Événements du mode libre | 20 / 30 / 60 tickets par palier | **60 / 90 / 180 pièces** (plafond 1 200/jour) ; gain « ticket » d'un coffre → petites pièces ; événement « Tenues » → 10 énergie |
| Cadeau d'ouverture du casino | 500 tickets | **300 pièces** (une fois) |
| Cadeau de démarrage | 300 pièces + 100 tickets | **500 pièces** |

### Privilèges du casino (pièces, ou gratuits par les missions)
Coffret d'atelier 400 · collier de perles 1 500 · cheminée 2 500 · pergola 3 000 · fontaine 3 500 · robe tapis rouge 4 500 · diadème 5 000. Valeur de l'ancienne boutique (1 ticket = 10 pièces), toujours sous les prix de prestige des boutiques classiques (`PRESTIGE_PRICE`). Les mêmes objets s'obtiennent gratuitement par les missions. Supprimés : la « Soirée » (3 tours offerts, sans intérêt avec des pièces) et le cadeau de 5 diamants (une conversion pièces → diamants).

### À quoi servent les pièces
Vêtements, décoration de Mon Monde, PIMBÊCHE (13 améliorations), améliorations de générateurs, objets rares et de prestige, mises du casino, privilèges exclusifs. Prix inchangés (courbe ci-dessus).

## Plateau plein
- Conseil discret « Ton plateau commence à être plein ♡ » à 80 % d'occupation (`FULL_HINT_RATIO`), au plus toutes les 3 min, jamais pendant une fusion.
- « Vendre » (barre de l'objet sélectionné) : confirmation, prix bas (niveau ÷ 2 pièces), générateurs et objets spéciaux jamais vendables, avertissement pour les objets précieux ou utiles à une commande. Le sac (glisser l'objet dessus) reste la solution sans perte.
