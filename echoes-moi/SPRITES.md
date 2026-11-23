# Echoes of Aether (Max version) — specs des sprites et images

Référence pour refaire les graphismes de `echoes-moi/` (la version originale `echoes/` n'est pas concernée).
Tous les chemins sont relatifs à `echoes-moi/assets/`.

## Règles générales

- **Pixel art**, PNG RGBA avec transparence, **sans anticrénelage** : le jeu affiche tout au plus proche voisin (`pixelArt: true`).
- **Unité du monde : 1 case = 32 × 32 px.** Carte : 96 × 330 cases.
- Le monde est affiché avec un zoom d'environ ×1,3 à ×2,6 selon la hauteur de l'écran (≈ ×1,3 sur un téléphone en paysage). Un personnage de 64 px de haut fait donc ~85 px CSS à l'écran.
- **Remplacer une image = même nom, mêmes dimensions, même grille.** Ajouter des images, des lignes d'animation ou changer une taille demande une modification du code (`game.js`), puis `node tools/echoes-build.js`.
- Tri de profondeur : les objets du monde sont triés par leur **y au sol** (le bas du sprite). Dessiner les pieds / la base en bas de l'image.
- Police de l'interface : **Pixelify Sans** (400 et 700, fichiers `pixelify-sans-*.woff2`).

## Héros — `heroes/*.png` (17 planches)

| Propriété | Valeur |
|---|---|
| Taille de la planche | **384 × 3072 px** |
| Case | **64 × 64 px**, grille de **6 colonnes × 48 lignes** |
| Une ligne | 1 animation × 1 direction, 6 images, lues de gauche à droite |
| Directions | 4 lignes consécutives par animation : **sud (face), est (droite), nord (dos), ouest (gauche)** |
| Point d'ancrage | centre horizontal, **pieds à y = 57** dans la case de 64 (origine 0,5 / 0,89) |
| Collision | carré de 18 × 18 px à (23, 43) dans la case : la zone des pieds |
| Affichage | échelle 1 (64 px = 2 cases de haut) |

Fichiers : une planche par héros **et par arme** (l'arme fait partie du dessin).

| Héros | Planches |
|---|---|
| Augh | `augh_throwing_axe`, `augh_bow`, `augh_daggers`, `augh_boomerang`, `augh_javelin`, `augh_none` (sans arme) |
| Aka | `aka_grimoire`, `aka_staff`, `aka_orb`, `aka_scepter` |
| Gorak | `gorak_club` (massue, maillet et masse cloutée utilisent la même planche) |
| Nyra | `nyra_chakram`, `nyra_chakram1` à `nyra_chakram4` (paliers du chakram) |
| Ralya | `ralya_sceptre` |

### Ordre des lignes — Augh, Gorak, Nyra, Ralya

Lignes = animation × 4 + direction (0 sud, 1 est, 2 nord, 3 ouest). ↻ = en boucle.

| Lignes | Animation | Images/s |
|---|---|---|
| 0–3 | `idle` repos ↻ | 7,1 |
| 4–7 | `walk` marche ↻ | 9,5 |
| 8–11 | `run` course ↻ | 12,5 |
| 12–15 | `axe_throw` attaque de base | 10,5 |
| 16–19 | `axe_fire` compétence 1 | 9,1 |
| 20–23 | `axe_ice` compétence 2 | 9,1 |
| 24–27 | `axe_catch` rattrape / fin d'attaque | 11,8 |
| 28–31 | `dash` esquive | 15,4 |
| 32–35 | `hurt` touché | 10,5 |
| 36–39 | `death` mort (garder la dernière image) | 8,7 |
| 40–43 | `victory` victoire | 9,1 |
| 44–47 | `equip_switch` changement d'arme | 11,1 |

Les noms viennent d'Augh ; pour Gorak, Nyra et Ralya les mêmes lignes servent à leurs attaques et sorts.

### Ordre des lignes — Aka

| Lignes | Animation | Images/s |
|---|---|---|
| 0–3 | `idle` ↻ | 7,1 |
| 4–7 | `walk` ↻ | 9,5 |
| 8–11 | `run` ↻ | 12,5 |
| 12–15 | `orb_attack` attaque de base | 10 |
| 16–19 | `summon_wolf` invocation du loup | 9,1 |
| 20–23 | `place_trap` piège | 9,5 |
| 24–27 | `raise_wall` mur | 9,1 |
| 28–31 | `area_burst` explosion de zone | 8,3 |
| 32–35 | `dash` | 15,4 |
| 36–39 | `hurt` | 10,5 |
| 40–43 | `death` | 8,7 |
| 44–47 | `victory` | 9,1 |

### Calques d'équipement — `layers/<héros>_<panoplie>_<pièce>.png` (200 fichiers)

- **Même format exact que les planches de héros** (384 × 3072, cases de 64, mêmes lignes), transparents sauf la pièce, posés **par-dessus** le héros image par image.
- Héros : `augh`, `aka`, `gorak`, `nyra`, `ralya`.
- Panoplies (10) : `petit`, `belier`, `mystique`, `grand_belier`, `cimes`, `temple`, `ombres`, `abysses`, `abime`, `celeste`.
- Pièces (4) : `head` coiffe, `cape`, `belt` ceinture, `boots` bottes.
- Chargés seulement quand une pièce est équipée.

Le jeu génère aussi des variantes de couleur (peaux) des planches à partir de ces images : pas de fichier à fournir.

## Monstres — `monsters/*.png`

| Propriété | Monstre normal | Grand / boss |
|---|---|---|
| Planche | **384 × 384 px** | **768 × 768 px** |
| Case | **64 × 64**, grille 6 × 6 | **128 × 128**, grille 6 × 6 |
| Ancrage | centre, pieds à y ≈ 57 (origine 0,5 / 0,89) | pieds à y ≈ 114 |
| Orientation | **une seule direction : regard vers la droite** (le jeu retourne l'image pour la gauche) | idem |

Lignes (6 images chacune) :

| Ligne | Animation | Images/s |
|---|---|---|
| 0 | `idle` repos ↻ | 6 |
| 1 | `move` déplacement ↻ | 10 |
| 2 | `windup` préparation de l'attaque (doit se lire comme un avertissement) | 10 |
| 3 | `attack` attaque | 12 |
| 4 | `hurt` touché | 14 |
| 5 | `death` mort | 10 |

Fichiers 64 px : `mon_petit` (petit mouton), `mon_belier` (bélier furieux), `mon_mystique` (mouton mystique), `mon_blob`, `mon_archer` (archer corrompu), `mon_boar` (sanglier), `mon_spectre` (spectre des ronces, vole), `mon_wolf`, `mon_yeti`, `mon_guard`.
Fichiers 128 px : `mon_grand` (le Grand Bélier), `mon_boss` (Gardien de la Forêt).

Variantes générées par recoloration (dans `baked/`, pas besoin de les dessiner si on garde le principe) :

| Variante | Base | | Variante | Base |
|---|---|---|---|---|
| `mon_diablotin` | `mon_spectre` | | `mon_esprit_lum` | `mon_spectre` |
| `mon_molosse` | `mon_wolf` | | `mon_lion` | `mon_wolf` |
| `mon_obsidienne` | `mon_yeti` | | `mon_gardien_sanct` | `mon_yeti` |
| `mon_sorcier` | `mon_archer` | | `mon_succube` | `mon_archer` |
| `mon_sentinelle` | `mon_archer` | | `mon_archange` | `mon_archer` |
| `mon_azrakar` (128) | `mon_boss` | | `mon_seraphel` (128) | `mon_boss` |

### PNJ — `monsters/npcs.png`

384 × 256 px, cases de 64, **6 colonnes × 4 lignes**, une animation de repos par ligne (4 images/s, en boucle), même ancrage que les héros :
ligne 0 `elder` (ancienne), 1 `merchant` (marchand), 2 `villager` (villageois), 3 `guard` (garde).

## Terrain — `terrain.png`

512 × 192 px, **tuiles de 32 × 32**, 16 colonnes × 6 lignes (index 0 à 95, de gauche à droite puis de haut en bas).

| Index | Contenu |
|---|---|
| 0–4 | herbe claire, 5 variantes |
| 5–7 | herbe claire avec fleurs |
| 8–11 | herbe sombre (forêt), 4 variantes |
| 12–15 | vides |
| 16–31 | transitions **herbe sombre** |
| 32–47 | transitions **chemin de terre** |
| 48–63 | transitions **pavés** |
| 64–79 | transitions **eau**, image A |
| 80–95 | transitions **eau**, image B (l'eau alterne A/B pour s'animer) |

**Transitions par coins** (lignes 1 à 5) : tuile = début de la série + masque des coins couverts,
avec 1 = haut-gauche, 2 = haut-droite, 4 = bas-gauche, 8 = bas-droite.
Ex. : +0 vide, +3 bord du haut, +5 bord gauche, +15 plein. Les 16 combinaisons doivent toutes exister.
Ces calques se superposent dans cet ordre : herbe → herbe sombre → chemin → pavés → eau.

## Objets du monde — `objects.png` + `objects.json` (atlas, 1024 × 158)

Ancrage **en bas au centre** (origine 0,5 / 1) : le bas de l'image = le sol. Taille en px :

| Objet | Taille | Objet | Taille | Objet | Taille |
|---|---|---|---|---|---|
| `house_blue` | 112×112 | `pillar` | 26×60 | `bridge_h` / `bridge_v` | 32×32 |
| `house_red` | 112×112 | `banner` | 22×52 | `sign` | 26×30 |
| `tree_pine` | 56×92 | `well` | 40×50 | `bush` / `bush_berry` | 36×28 |
| `tree_blossom` | 72×88 | `standing_stone` | 26×46 | `barrel` | 22×26 |
| `tree_oak` | 72×88 | `crystal_wall` | 34×44 | `chest` / `chest_open` | 30×26 |
| `arch` | 76×80 | `lantern` | 16×44 | `crate` | 24×24 |
| `gate` / `gate_open` | 100×76 | `ruin_wall` | 52×40 | `fence_h` | 32×22 |
| `stall` (étal) | 84×68 | `crystal_blue` / `_purple` | 30×38 | `tallgrass` | 30×22 |
| `fountain` | 72×60 | `rock_big` | 44×34 | `log` | 44×20 |
| `rock_small` | 26×20 | `stump` | 26×20 | `bridge_rail` | 32×16 |
| `flowers` | 22×14 | `mushrooms` | 18×14 | `shadow` (ombre au sol) | 32×12 |

Pour changer une taille, modifier aussi `objects.json` (position et taille du cadre dans l'atlas).
Les arbres sont posés 4 px plus bas que leur case ; fleurs et champignons restent toujours sous les personnages.

## Effets — `fx/*.png` (bandes horizontales, images de gauche à droite)

| Fichier | Planche | Case | Images | Images/s |
|---|---|---|---|---|
| `fx_hit` impact | 160×32 | 32×32 | 5 | 24 |
| `fx_fire` feu | 384×64 | 64×64 | 6 | 18 |
| `fx_ice` glace | 384×64 | 64×64 | 6 | 18 |
| `fx_arcane` arcane | 384×64 | 64×64 | 6 | 18 |
| `fx_smoke` fumée | 192×32 | 32×32 | 6 | 16 |
| `fx_levelup` niveau supérieur | 512×96 | 64×96 | 8 | 12 |
| `fx_trap` piège ↻ | 160×24 | 40×24 | 4 | 6 |
| `fx_flame` flamme ↻ | 48×14 | 12×14 | 4 | 12 |
| `fx_gold` pièces | 288×48 | 48×48 | 6 | 16 |
| `club` massue de Gorak | 56×128 | image seule | – | – |
| `totem` | 32×60 | image seule | – | – |

Autres : `sigil.png` / `sigil_t.png` 128 × 128 (sceau du menu).

## Interface — `ui.png` + `ui.json` (atlas, 1024 × 1098, 243 images)

| Famille | Taille | Contenu |
|---|---|---|
| `i_*` | **48 × 48** | icônes : équipement par panoplie (`i_<panoplie>_<pièce>`, variantes `_a` / `_d`), armes (`i_bow`, `i_bow_fire`, `i_bow_ice`…), compétences (`i_dash`, `i_storm`, `i_wolf`…), emplacements vides (`i_slot_*`), menus (`i_menu`, `i_quest`, `i_stats`, `i_skills`, `i_bag`…), objets (`i_potion`, `i_gold`…) |
| `portrait_*` | 64 × 64 | portraits `augh`, `aka`, `gorak`, `nyra`, `ralya` (HUD et sélection) |
| `emblem_*` | 64 × 64 | emblèmes `nyra`, `ralya` |
| `joy_base` / `joy_knob` | 140×140 / 60×60 | joystick tactile |
| `btn_ring` / `btn_ring_s` | 72×72 / 56×56 | anneaux des boutons d'action |
| `panel` | 48 × 48 | fond de panneau en 9 parties (étiré, coins préservés) |
| `p_*` | 8 à 48 px | projectiles : flèches 32×12, dagues 20×10, haches/boomerangs/javelots 32×32, orbes 18–33, chakrams 24×24, cœurs 24/48… (variantes `_fire` / `_ice`) |
| `dot*`, `leaf`, `p_shard`, `p_petal` | 4 à 8 px | particules |
| `target_ring`, `target_ring_g` | 48 × 22 | cercle de ciblage au sol |
| `dir_arrow` | 48 × 24 | flèche de direction |
| `frozen` | 40 × 44 | bloc de glace sur un ennemi gelé |

La liste exacte (nom, position, taille) est dans `ui.json`. Une grande partie de l'interface (cadres, boutons, barres, fenêtres) est **dessinée par le code**, pas par des images.

Couleurs principales de l'interface : fond `#0e1228`, panneaux bleu nuit, or `#ffd24a` / `#ffe58a`, texte crème `#f4ecd8`.

## Textures générées par le code — `baked/*.png`

Dessinées par `game.js`, enregistrées en PNG par `tools/echoes-bake.js` (voir `assets/baked.js`).
On peut les redessiner à la main, **en gardant la même taille**, mais attention : relancer `echoes-bake.js` régénère tout depuis le code et écrase les PNG modifiés.

| Famille | Taille | Rôle |
|---|---|---|
| `zg_<zone>` | moitié de la taille réelle (affiché ×2) | sol des zones : `foret` 608×512, `ruines` 400×416, `ombre` 400×352, `givre` 320×256, `plage` 1536×608 |
| `realm_<royaume>` + `_fx` | 1536 × 512 (affiché ×2) | sol et reflets animés des royaumes `abime` et `celeste` |
| `zd_*` | 5 à 34 px | petit décor posé au sol (fleurs, champignons, souches, colonnes, braseros, coraux…) |
| `mon_*` | 384² ou 768² | variantes de monstres (voir plus haut) |
| `i_<panoplie>_*`, `i_club_*` | 48 × 48 | icônes d'équipement des panoplies générées |
| `club_<panoplie>` | 56 × 128 | massues de Gorak par panoplie |
| `tcloud` | 96 × 46 | nuage de l'écran titre |

## Application et site

| Fichier (dans `echoes-moi/`) | Taille |
|---|---|
| `cover.png` (jaquette de la page jeux) | 960 × 540 |
| `icon-192.png` / `icon-512.png` | 192² / 512² |
| `icon-maskable-192.png` / `-512.png` (logo dans les 80 % du centre) | 192² / 512² |
| `icon-transparent-512.png` | 512² |
| `apple-touch-icon.png` | 180² |
| `favicon-16.png` / `favicon-32.png` | 16² / 32² |
