# RADIA ♡ — Personnages : gabarit, état actuel et cahier des charges des illustrations

Objectif : que Radia et Auguste paraissent **dessinés par le même artiste dans TOUTES les tenues**, comme sur l'illustration
de référence du duo. Ce document décrit le gabarit unique, ce qui existe aujourd'hui, ce qu'il reste à illustrer et comment
l'intégrer.

> Source de vérité des proportions : `src/game/art/world/rig.ts`. Aucun composant n'a ses propres chiffres.

## 1. Gabarit unique (rig)

Repère « avatar » : boîte **240 × 600**, axe de symétrie x = 120, pieds en bas. Pour des illustrations en haute définition :
**720 × 1800 px = avatar × 3** (1 unité d'avatar = 3 px). Référence mesurée : l'illustration peinte de Radia (952 px de haut,
`PAINT_SCALE` = 0,5714 unité / px, partagée avec Auguste).

| Ancre | Avatar (u) | 720 × 1800 (px) | Note |
|---|---|---|---|
| Menton (pivot de la tête) | y 166,6 | 500 | le cou ne bouge jamais |
| Cou / début des épaules | y 168–204 | 504–612 | épaule : x = 120 ± 50, y = 204 |
| Taille | y 288 | 864 | |
| Hanches / ligne de coupe historique | y 352 | 1056 | |
| Pieds (bas des chaussures) | y 585 | 1755 | marge basse 15 u |
| Largeur du visage | 60,6 | 182 | mesurée sur l'illustration (106 px) |
| Poignet (pose de référence) | y 352, x = 120 ± 60 | 1056 | bras le long du corps, coudes légèrement écartés |
| Main (visible) | ≈ 19 × 28 | 57 × 84 | la manche en recouvre le haut |
| Bras : épaisseur épaule → poignet | 29 → 18,5 | 87 → 55 | |

**Une seule échelle de tête** (`RIG.head.scale` = 0,807) pour tout le bloc tête (crâne, visage, cheveux, accessoires), pivot au menton :
le visage a la même largeur avec ou sans couronne, quelle que soit la coiffure. Les couronnes se posent par rapport au **sommet du
crâne** (`skullTopY`), jamais par rapport à la taille d'une image. Les vêtements s'adaptent au gabarit, pas l'inverse.

## 2. État actuel (ce qui est peint, ce qui est dessiné en code)

| Élément | Rendu | Fichiers |
|---|---|---|
| Tête complète (cheveux longs, crâne COMPLET avec dôme) | **peint** (calque) | `headp-radia-nc` |
| Visage seul (coiffures dessinées, foulards) | **peint** (calque) | `facep-radia` |
| Couronne dorée | **peinte** (calque, ancrée au crâne) | `crownp-gold` |
| Couronnes de fleurs / diadème | dessinées, ancrées au crâne | `avatar.ts` |
| Tenue noire complète (figure entière) | **peinte** (illustration d'origine) | `char-radia`, `char-radia-nc`, `bust-*` |
| Corps (bras, mains, jambes) | dessiné en code, selon le gabarit | `avatar.ts` |
| ≈ 150 vêtements, chaussures, sacs, bijoux, coiffures dessinées | dessinés en code | `avatar*.ts` |
| Auguste | **peint** (illustration) | `char-auguste` |

Les calques de tête sont **tirés de l'illustration privée** (chiffrés, jamais dans le dépôt en clair) par
`scripts/painted-head/build.py` (voir son README). Sans le lien secret, tout retombe sur le dessin vectoriel.

## 3. Écarts connus à combler par des illustrations (liste honnête)

1. **Coiffures dessinées** (queue, chignon, carré, tresse, bouclés, macarons…) : rendu plus plat que la tête peinte.
2. **Vêtements dessinés** : contours plus marqués et ombrages plus simples que l'illustration (ex. le col de la tenue noire
   dessinée est un col roulé, celui de l'illustration est une capuche en V).
3. **Corps dessiné** : proportions alignées sur le gabarit, mais pas de plis, mains et bras en vectoriel.
4. **Chaussures** : plus grandes et plus arrondies que celles de l'illustration.

## 4. Calques à illustrer (ordre de dessin, du fond vers l'avant)

| # | Calque | Fichiers (identifiants de `src/data/world/ids.ts`) | Remarques |
|---|--------|------|-----------|
| 1 | cheveux arrière | `hair-<id>-back` | 12 coiffures ; tons neutres pour être teintés |
| 2 | corps nu | `body-base` + `body-shade` | peau neutre + ombres : le jeu teinte (9 teintes) |
| 3 | bas / robe | `bot-<id>`, `dr-<id>` | |
| 4 | haut | `top-<id>` | |
| 5 | bras + manches | `arm-l`, `arm-r`, `<id>-sleeve-l/r` | séparés pour que les manches couvrent les bras |
| 6 | veste | `jk-<id>` | |
| 7 | chaussures, sac | `sh-<id>`, `bg-<id>` | |
| 8 | tête | `head-base` (+ `headp-radia-nc` existant) | sans accessoires |
| 9 | traits du visage | — | **RETIRÉ** : le visage est canonique (une seule tête) ; seul le maquillage léger (calque `makeup-*`, voir `makeupOverlay.ts`) se pose par-dessus |
| 10 | maquillage | `liner-<style>`, `blush`, `lip-mask` | masques teintés |
| 11 | cheveux avant | `hair-<id>-front` | |
| 12 | accessoires, couronnes, voiles | `ac-<id>`, `cr-<id>`, `veil-<style>` | ancrés au crâne / au visage |

## 5. Éléments PRIORITAIRES pour les cinq tenues demandées

Pour chaque tenue : **calques 3 à 7** sur le gabarit 720 × 1800 (+ les bras nus du calque 5, communs à toutes).

| Tenue | Identifiants | Calques à illustrer en priorité |
|---|---|---|
| **1. Noire illustrée** | `top-hoodie-black`, `bot-wide-black`, `sh-sneakers-white`, `bg-crossbody-black` | haut + manches (capuche en V), pantalon large, baskets, sac + bandoulière, mèches avant devant l'épaule. *Une grande partie existe déjà dans `char-radia` : à découper en calques.* |
| **2. Survêtement rouge** | `jk-track-red`, `bot-track-red` | veste zippée + manches, pantalon à bandes |
| **3. Casual** | `top-tee-white`, `bot-jeans` | tee-shirt + manches courtes, jean |
| **4. Robe élégante** | `dr-satin-champagne` (+ `sh-heels`) | robe longue satinée, escarpins |
| **5. Tenue de soirée** | `dr-redcarpet` (+ `sh-heels`, `ac-pearls`) | robe longue fendue, collier de perles |
| *Communs* | corps nu, bras nus + mains, jambes, pieds nus | indispensables pour toutes les tenues |

## 6. Intégration progressive (côté code, déjà en place pour la tête)

- Point d'entrée unique : `src/game/art/world/radiaNow.ts`. La tête passe par `setPaintedHeadProvider` (calques `PaintedLayer`
  placés par `paintedToHead` dans le gabarit). **Même mécanisme à étendre** aux calques de vêtements : pour chaque identifiant,
  l'image peinte si elle existe, sinon le dessin actuel → aucune régression, migration article par article.
- Achats, tenues enregistrées et sauvegardes : inchangés (les identifiants ne changent pas) ; aucune migration de données n'est
  nécessaire pour le dessin.
- Illustrations personnelles : chiffrées (clé jamais dans le dépôt). Illustrations génériques (vêtements) : possibles en clair
  dans `public/avatar/`.

## 7. Planche de validation

`?planche` (dans le jeu, sur iPhone aussi) : vrais composants, même échelle, repères du gabarit, Auguste en référence.
Tests visuels : `scripts/character-visual-e2e.mjs` (le visage ne change pas avec la couronne, la coiffure, l'accessoire ou la tenue),
captures : `scripts/board-shots.mjs`.
