# RADIA ♡ — Cahier des charges des illustrations de personnages (phase B)

But : que Radia et Auguste soient **dessinés par le même artiste dans TOUTES les tenues**, comme sur l'illustration de
référence du duo. Aujourd'hui, seules les illustrations existantes sont peintes (Auguste ; Radia en sweat noir avec ou
sans couronne). Toute autre tenue du dressing est dessinée en code (vectoriel), d'où l'écart de style.

## 1. Référence de style (obligatoire)
- Base : les illustrations du pack privé `char-radia`, `char-radia-nc`, `char-auguste`, `bust-*` (même artiste).
- Rendu peint doux : contour fin brun foncé, ombres et lumières douces, plis des tissus, cheveux en mèches éclairées.
- Visages : même construction pour les deux (visage doux, yeux bruns en amande à paupière marquée, petit nez modelé
  par l'ombre, lèvres naturelles). Radia : eye-liner relevé, anneau au nez, grain de beauté, cheveux longs ondulés
  brun → caramel. Auguste : moustache fine et bouc, cheveux bruns bouclés.

## 2. Gabarit (un seul pour toutes les pièces)
- Toile **720 × 1800 px** par personnage, fond transparent (PNG ou WebP avec alpha), pieds à 18 px du bas,
  personnage centré. C'est le triple du repère du jeu (240 × 600) : les points d'ancrage existants restent valables.
- Une pose debout naturelle par personnage (celle des illustrations actuelles). Toutes les pièces sont dessinées
  EXACTEMENT sur ce gabarit (même position, même échelle), sinon elles ne se superposent pas.

## 3. Calques (ordre de dessin, du fond vers l'avant)
| # | Calque | Fichiers | Remarques |
|---|--------|----------|-----------|
| 1 | cheveux arrière | `hair-<id>-back` | 12 coiffures (`hair-loose`, `hair-wavy`, `hair-bun`…), en tons NEUTRES (gris chaud) pour être teintés |
| 2 | corps | `body-base` + `body-shade` | peau en ton neutre + calque d'ombres : le jeu teinte (9 teintes + réglages fins) |
| 3 | bas / robe | `bot-<id>`, `dr-<id>` | une image par article |
| 4 | haut | `top-<id>` | |
| 5 | bras + manches | `arm-l`, `arm-r`, `<id>-sleeve-l/r` | séparés pour que les manches recouvrent les bras |
| 6 | veste | `jk-<id>` (+ manches) | |
| 7 | chaussures, sac | `sh-<id>`, `bg-<id>` | |
| 8 | tête | `head-base` | sans yeux / sourcils / bouche |
| 9 | traits du visage | `eyes-<forme>`, `brows-<forme>`, `nose-<forme>`, `mouth-<forme>` | petites images posées sur des ancres fixes ; iris en ton neutre teinté |
| 10 | maquillage | `liner-<style>`, `blush`, `lip-mask` | masques teintés par le jeu |
| 11 | cheveux avant | `hair-<id>-front` | |
| 12 | accessoires | `ac-<id>`, `cr-<id>`, voiles `veil-<style>` | |

Identifiants : exactement ceux de `src/data/world/ids.ts` (≈ 150 articles). Auguste : mêmes règles, calques 1–8 et 11.

## 4. Intégration (côté code, prête à recevoir les fichiers)
- Point d'entrée unique : `src/game/art/world/radiaNow.ts` (tout le jeu passe déjà par lui).
- Règle : pour chaque calque, l'image peinte si elle existe, sinon le dessin actuel → aucune régression, migration
  progressive. Les portraits / médaillons sont découpés dans le même rendu (une seule source partout).
- Les illustrations personnelles restent chiffrées (`scripts/encrypt-photos.mjs`, clé jamais dans le dépôt) ;
  des illustrations génériques (vêtements) peuvent être publiques dans `public/avatar/`.
- Achats, tenues et sauvegardes : inchangés (les identifiants ne changent pas).

## 5. Ordre de production conseillé
1. Gabarits nus des deux personnages + 1 visage chacun → comparaison avec la référence du duo.
2. Tenue de départ (sweat noir, pantalon large, baskets, sac) en calques.
3. Les 12 coiffures. 4. Le reste du dressing par lots (robes, hauts, bas, vestes, chaussures, sacs, bijoux).
