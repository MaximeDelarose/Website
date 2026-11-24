# Echoes of Aether — Max version

Copie modifiable d'Echoes of Aether, séparée de la version originale (`../echoes/`), optimisée pour le web mobile.
Les deux sont affichées sur la page `echoes.html`, avec le choix « Version originale » / « Max version » en haut (`echoes.html#moi` ouvre directement celle-ci).

## Ce qui la sépare de l'original

- Sauvegardes à part : clés `echoes_of_aether_moi_save`, `eoam_slot_*`, `eoam_index`, `eoam_last`, `eoam_fullscreen`, `eoam_diag`, `eoam_res` (définition du rendu choisie automatiquement) (l'original utilise `eoa_*`).
- Salons en ligne à part : préfixe PeerJS `eoam-v03-` et canal local `eoam-local-` ; on ne peut pas rejoindre un salon de la version originale depuis celle-ci.
- Service worker à part : cache `echoes-moi-b<build>` dans `sw.js`, renouvelé automatiquement à chaque build.

## Où modifier

| Fichier | Rôle |
|---|---|
| `assets/game.js` | Tout le jeu (Phaser compris), reformaté pour être lisible. Les noms des variables locales sont ceux du build minifié, mais les textes, les données (héros, sorts, objets, monstres) et la logique se retrouvent en cherchant un texte affiché en jeu. |
| `assets/perf.js` | Optimisations de rendu, indépendantes du gameplay (voir plus bas). |
| `assets/baked.js` + `assets/baked/` | Textures que le jeu générait au démarrage, pré-rendues en PNG. |
| `assets/title16.js` | Écran titre en 16 px par case : prairie Pixel Crawler, héros 16×32, texte et boutons sur la même grille de pixels (agrandie d'un facteur entier). |
| `assets/world16.js` | **Carte de surface** dessinée à la main (villages, routes, rebords, donjons) : formes simples, positions des PNJ, coffres, portails, groupes de monstres et objectifs de quête. Voir « La carte » plus bas. |
| `assets/pixelfont.js` | Police bitmap 5×7 dessinée pixel par pixel (accents compris) : texte net sur la grille. |
| `assets/pc/` | Images Pixel Crawler (Anokolisa, usage commercial et modifications autorisés, voir `Terms-Anokolisa.txt`) et héros 16×32 générés par `tools/art16/pc_heroes.py`. |
| `assets/game.min.js` | **Généré** : le script réellement chargé par `index.html`. |
| `assets/bundler-yPNtbWdW.js` | PeerJS (coop en ligne), chargé seulement à l'ouverture de la coop. |
| `assets/heroes`, `monsters`, `fx`, `layers` | Images (formats, grilles et animations : voir `SPRITES.md`). |

Après une modification :

1. Si un générateur de texture a changé (sols, monstres, icônes, décor…) : `node tools/echoes-bake.js` refait les PNG de `assets/baked/` (Playwright).
2. `node tools/echoes-build.js` — reconstruit `assets/game.min.js` depuis `game.js` (esbuild via npx) et **incrémente le numéro de build** (`version.json`, `assets/version.js`). Ce numéro et sa date s'affichent en bas de l'écran titre (« Max version · build N · date ») et sur la page `echoes.html` : si le numéro affiché est le dernier, on est à jour. Le build renouvelle aussi le cache du service worker et l'adresse du script (`?b=N`).

Si le code source TypeScript d'origine (projet Vite) est récupéré, mieux vaut le mettre dans un dossier source et reconstruire cette copie depuis lui.

## Performances (différences avec l'original)

Mesuré dans Chromium sans GPU, processeur ralenti ×4 pour imiter un téléphone, en jeu au village :

| | Original | Max version |
|---|---|---|
| Images par seconde | 9,8 | ~29 |
| Temps de rendu JS par image | 69 ms | 7 ms |
| Objets envoyés au rendu | 3 343 | 95 |
| Mémoire GPU des textures | 129 Mo | 17 Mo |
| Démarrage → menu / clic → en jeu | 4,6 s / 3,4 s | 3,6 s / 1,8 s |

Ce qui a changé :

- **Donjons** (`game.js`, `cullRect`) : un Graphics par salle, dessiné seulement quand la salle est à l'écran. L'original trace un seul Graphics de ~210 000 commandes à chaque image, même depuis le village.
- **Rendu limité au visible** (`perf.js`) : images, sprites et textes hors caméra, zones de collision (1 800) et formes transparentes ne sont plus envoyés au rendu. Les clics/toucher ne changent pas.
- **Cache des Graphics** (`perf.js`) : un Graphics qui ne change plus (boutons, anneaux, cadres du HUD et des menus) est dessiné une fois dans une texture par le même moteur WebGL, puis affiché comme une image. Dès que ses commandes changent, il redevient un Graphics normal.
- **Textures GPU à la demande** (`perf.js`) : une image n'est envoyée à la carte graphique qu'au moment où elle est affichée (les 17 planches de héros ne sont plus toutes chargées pour un seul héros joué).
- **Textures pré-rendues** (`baked.js`, `tools/echoes-bake.js`) : 131 textures (sols des zones et royaumes, variantes de monstres, icônes, massues, décor) chargées en PNG (356 Ko) au lieu d'être dessinées pixel par pixel à chaque lancement. Si un PNG manque, le jeu la génère comme avant.
- **Définition adaptative** (`perf.js`) : sous 45 FPS en jeu, la définition du rendu baisse d'un cran (2,5 → 2 → 1,5 → 1) et est mémorisée dans `eoam_res` ; à 58+ FPS, la partie suivante repart un cran plus haut. `localStorage.removeItem('eoam_res')` pour repartir de la définition maximale.
- **Script minifié** (`tools/echoes-build.js`) : 1,9 Mo au lieu de 3,8 Mo, analysé plus vite au démarrage.
- **GPU rapide demandé** (`powerPreference: high-performance`) sur les appareils qui en ont deux.

Pour comparer, chaque optimisation se coupe depuis la console : `localStorage.setItem('eoam_perf_off', 'cache,lazy,cull,baked')` puis recharger (`removeItem` pour réactiver). `window.__perf` affiche les compteurs (textures envoyées au GPU, Graphics en cache…).

## Corrigé au passage

- La coop en ligne ne pouvait pas se charger : `bundler-yPNtbWdW.js` importait `./index-nh8iQ6bC.js`, qui n'existe que dans l'original. Il contient maintenant ses propres aides de modules.

## La carte (world16.js)

Carte de surface de 96 × 71 cases (32 unités par case), organisée comme un RPG 16 bits : des villages reliés par des routes bordées de forêt.

- **Village d'Aelor** (départ) : quatre maisons, l'Ancienne Mira (quêtes) et trois habitants qui expliquent le jeu. Pas de boutique ni de portail visible (on peut toujours y revenir par les autres portails).
- **Route 1 · Prairies d'Aelor** (couloir nord, voie haute / voie basse, Bois de la Lisière) → **Cité d'Orée** (boutiques, bazar, Zaap).
  - Sur la route 1 : le **Cercle de l'Antre** et l'**Antre oublié** (porte ouverte par la quête 4), l'herbe de lune et le slaad furieux (quêtes 2 et 3).
- **Cité d'Orée** → **Route 2 · Forêt mystérieuse** (Pied des Cimes et **Sanctuaire des Cimes**) → pont du ravin (à reconstruire) → **Hameau des Ruines**.
- Depuis le hameau : **Bosquet corrompu** au nord (Nid des Ombres), **Ruines anciennes** au sud (Temple Fracturé). Le port (bateaux, traversée vers l'archipel) est sur la rivière, à l'ouest du hameau.

**Style** : sol, chemins, eau, arbres, hautes herbes, maisons et panneaux viennent du pack **Ninja Adventure** de Pixel-boy (CC0, domaine public), générés par `python3 tools/art16/ninja_world.py`. La forêt n'est pas faite d'objets : le jeu dessine une fois des rangées d'arbres en quinconce sur les cases `forest` (`buildForest`, une seule texture). Pas de sol ni de décor de zone sur la surface (lucioles, plantes, sol sombre) : l'herbe et les chemins suffisent.

**Rebords** : une rangée de terre qu'on ne franchit qu'en descendant (le héros saute par-dessus, `ledgeHop` dans `game.js`) ; ils servent de raccourcis pour rentrer.

Pour modifier la carte : changer les formes dans `buildOverworld()` (rectangles, ellipses, tracés), puis vérifier en texte avec
`node -e "import('./echoes-moi/assets/world16.js').then(m => console.log(m.ascii()))"` (copier le fichier en `.mjs` si Node refuse l'import).
Après un changement des images : `python3 tools/art16/ninja_world.py` (refait aussi le terrain et l'atlas d'objets).
Une sauvegarde faite sur l'ancienne carte (sans `mapVer: 2`) repart du village d'Aelor, brouillard de la carte remis à zéro.

## Aka, archer invocateur

Aka (l'homme-écureuil) est un **archer qui invoque** : il tire de loin, plante des balises qui tirent pour lui et lâche son loup de chasse.
Les identifiants internes n'ont pas changé (sauvegardes et équipements restent valides) :

| Compétence (id) | Effet |
|---|---|
| Flèche (`orb`) | Tir de base, selon l'arc : Arc court, Arc long (perce), Arc double (2 flèches), Arc runique (chercheuse) |
| Balise sentinelle (`wall`) | Balise qui tire seule sur l'ennemi le plus proche pendant 8 s (une à la fois) — classe `Xa` en mode `archer` |
| Flèche de recul (`trap`) | Projette l'ennemi touché, étourdi s'il heurte un obstacle |
| Loup de chasse (`wolf`) | Invocation qui fonce, retient et attire l'attention |
| Pluie de flèches (`rain`) | Zone : des flèches tombent pendant quelques secondes |
| Volée givrante (`frost`), Flèche harpon (`storm`), Leurre du chasseur (`double`), Tir céleste (`comet`), Flèches de dispersion (`nova`), Balises jumelles (`portal`) | Mêmes mécaniques qu'avant, thème archer |

L'arc tenu en main (`showBow`), la balise, les flèches et les icônes viennent du pack Ninja Adventure (CC0) : `python3 tools/art16/aka_archer.py` (part de `tools/art16/orig/ui.png`).

## Tout sur la grille (grid16.js)

Le jeu reste en temps réel mais se joue **case par case** (cases de 32 unités, celles de la carte) :

- **Déplacements** : héros (hors combat et en combat), monstres, groupes qui errent, avancent d'une case à la fois en 4 directions, façon RPG 16 bits. Le moteur `gridMotor` transforme la vitesse voulue (manette, IA, recul, dash) en pas d'une case ; chacun réserve sa case, on ne se chevauche plus (les poussées physiques entre acteurs sont coupées en combat). Contre un obstacle, le héros se tourne sur place. Le dash et les reculs font avancer de plusieurs cases d'un coup ; un recul contre une case occupée ou un mur = impact.
- **Attaques** : les tirs du héros partent dans l'une des 8 directions (lignes, colonnes, diagonales) : il faut s'aligner. Les zones (Pluie de flèches, tourbillon, givre, harpon…) couvrent un carré de cases et touchent les monstres dont la case est dedans. Augh « Lames du vent » : 3 haches (−45°, 0°, +45°).
- **Ennemis** : les alertes (cercle, ligne, charge, éventail) sont dessinées en cases rouges ; les charges suivent les 4 directions, les archers tirent en 8 directions ; les dégâts de zone utilisent les mêmes cases que l'alerte.
- Rebords : le saut part de la case au-dessus du rebord.

Pour comparer avec le déplacement libre : `localStorage.setItem('eoam_perf_off', 'grid')` puis recharger.
