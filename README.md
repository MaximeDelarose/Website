# AkarisuMD — site perso

Site statique (HTML/CSS/JS, rien à compiler) : il s'héberge tel quel sur GitHub Pages, Netlify, itch.io ou n'importe quel hébergeur.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : forêt pixel 2.5D animée, jeu jouable à la une, ce que je fais, derniers projets |
| `bibliotheque.html` | Tous les jeux et plugins Unity, avec filtres et recherche (`#jeux` / `#plugins` dans l'URL pour pré-filtrer) |
| `jeu.html` | **Écureuil Survivor** : mini jeu maison façon « survivors » (6 écureuils, 4 cartes à 3 biomes, 11 armes, 9 fusions + 5 légendaires, 12 objets, boutique, succès, 2 boss), jouable au clavier (ZQSD/WASD/flèches), à la souris (clic maintenu) ou au joystick tactile, avec classement en ligne |
| `merger.html` | **Merger** : les écureuils tombent deux par deux (permutables), 3 de la même couleur qui se touchent disparaissent. Fond du bac arrondi. Difficulté = nombre d'écureuils sélectionnés sur 12 (ex. 6/12), points × difficulté. Chaque écureuil a sa fourrure, ses yeux, sa bouche et parfois un accessoire (champs `fur`, `eyes`, `mouth`, `brow`, `acc` dans `SQUIRRELS`) ; ils respirent pour de vrai (leur rayon physique gonfle de ±3,5 % et pousse les voisins, réglage `BREATH`), et rebondissent un peu entre eux et contre le bac (réglage `BOUNCE` = 0.12), suivent la paire du regard, remuent la queue, s'écrasent en atterrissant, sourient près d'un copain de leur couleur et paniquent près de la ligne. Souris, clavier ou doigt. Version : `VERSION` en haut de `js/merger.js` (affichée dans le menu, tag git `merger-v<version>`). Code : `js/merger.js` (liste des 12 écureuils `SQUIRRELS` en haut du fichier), meilleur score par difficulté en localStorage, classement en ligne `merger` (à créer une fois dans Supabase : `insert into public.lb_games (id, name, higher_is_better, min_score, max_score) values ('merger', 'Merger', true, 0, 10000000) on conflict (id) do nothing;`) |
| `dice.html` | **Écureuil Dice** : défense « fusion de dés » avec des écureuils (13 types), les ennemis et boss du Survivor ; solo, versus contre l'IA, coop et versus à 2 (en ligne ou même écran), aucun achat |
| `idle.html` | **Le Grand Chêne** : idle / incrémental maison. On tape sur le chêne pour récolter des glands (combo, critiques, % de la production par clic), habitants de la forêt et pic tapeur en automatique, glands dorés, jardin (fleurs en pot à arroser → bonus et pétales), ferme (cultures → nourriture), bétail (marchandises à vendre + bonus tant qu'il est nourri), 2 prestiges (Replanter → graines, Saisons → essence), succès, hors ligne, export de sauvegarde |
| `bio.html` | Biographie |
| `compte.html` | Mon compte : connexion Google (facultative), pseudo, progression, export et suppression des données |
| `confidentialite.html` | Ce que le site garde (ou pas) : pas de pub, pas de traceur, compte facultatif |
| `contact.html` | Formulaire « message direct » + liens |
| `projet.html?id=<id>` | Fiche d'un projet : jaquette, images, vidéo, description complète, infos, bouton Télécharger (renvoie vers la section téléchargement d'itch.io) |

## Modifier le contenu

Presque tout se règle dans **`js/data.js`** :

- **Projets** : ajoute un objet dans `PROJECTS` (`type: "game"` ou `"plugin"`). Sans `cover`, une jaquette pixel est générée automatiquement.
- **Fiches projet** : le contenu détaillé (description, images, infos, fichiers) est dans `data/projects/<id>.json` et `assets/projects/<id>/`. Pour le remettre à jour depuis itch.io : `python3 tools/import_itch.py` (ou `python3 tools/import_itch.py chaaat` pour un seul projet ; nécessite `pip install beautifulsoup4 pillow`). Tu peux aussi éditer le JSON à la main.
- **Jeux web jouables sur le site** : ajoute `embed: "https://itch.io/embed-upload/XXXXXXX?color=1f3a2b"` au projet (le numéro se trouve dans l'URL `html-classic.itch.zone/html/XXXXXXX/…` de la page du jeu). Le jeu reçoit un bouton « ▶ Jouer ici » qui l'ouvre dans une fenêtre, et un lien direct `bibliotheque.html#jouer=<id>`. `SITE.featured.id` choisit le jeu de la borne de l'accueil.
- **Formulaire de contact** : les messages partent directement vers `SITE.email` via [FormSubmit](https://formsubmit.co). Au tout premier message, FormSubmit envoie un mail d'activation à cette adresse : il faut cliquer sur le lien une fois. (Ou mets ton propre endpoint Formspree dans `SITE.formEndpoint`.)
- **Classements en ligne** : `SITE.supabase = { url, key }` (clé publique) et `leaderboard: true` sur un jeu. Mise en place, ajout d'un jeu et package Unity : voir [`leaderboard/README.md`](leaderboard/README.md).
- **Écureuil Survivor** (`jeu.html`) :
  - `js/game-data.js` : tout le contenu modifiable à la main. Sprites en texte, écureuils jouables (`CHARACTERS`), armes (`WEAPONS`, champ `type` = comportement), fusions (`FUSIONS`, champ `from` = les deux ingrédients, `tier: 2` = légendaire), biomes (`MAPS[].biomes`), objets (`PASSIVES`), butin des objets cassables (`LOOT`), cartes (`MAPS`), boutique permanente (`SHOP`), succès (`ACHIEVEMENTS`), ennemis et boss (`ENEMIES`), modes de difficulté. Un `unlock: "<id de succès>"` verrouille un personnage, une arme, une amélioration ou un mode jusqu'au succès correspondant.
  - `js/game.js` : moteur, menus, sauvegarde (localStorage `es-save-v1`, dans le navigateur du joueur).
  - **Progression** : rang d'écureuil (XP de rang à chaque partie → 1 point de compétence par rang), arbre de compétences (`SKILLS`), prestige (`PRESTIGE` : il faut débloquer une part de la progression boutique + arbre — 1/3 au début, de plus en plus — et des glands d'or de plus en plus chers ; tout repart à zéro contre des points de prestige ✨ à dépenser dans `PRESTIGE_SHOP`). Version affichée dans le menu : `VERSION` en haut de `js/game.js` (format 0.x.x).
  - **Mode Arène** : arène fermée, 20 manches, boutique de manche (noisettes 🌰 + intérêts), manches d'élite et de boss. Réglages dans `ARENA` (`js/game-data.js`). Classement séparé `ecureuil-arene`. Compatible coop (chacun fait ses achats, la manche suivante démarre quand tout le monde est prêt).
  - **Mode Donjon** : 3 étages générés procéduralement (graine partagée en coop) ; salles rectangulaires, en L, en T ou en croix reliées par des couloirs coudés (avec des rôdeurs endormis), piliers, trous, pièges à pointes, flaques d'eau (ralentissent) et de poison, végétation, torches et obscurité ; les armes ne tirent qu'en combat. Salles de combat qui se verrouillent (2 vagues), salles d'élite (ennemis renforcés + coffre + relique), salle au trésor, un gardien (mini-boss) par étage qui ouvre l'escalier, boss final au 3ᵉ étage. 10 reliques permanentes pour la partie, mini-carte. Réglages dans `DUNGEON` et `RELICS` (`js/game-data.js`). Classement séparé `ecureuil-donjon`.
  - **Élites à pouvoirs** (`AFFIXES`) : n'importe quel ennemi, boss compris, peut être Ardent, Glacial, Rapide, Blindé, Vampire, Explosif, Invocateur, Électrique ou Épineux (contour coloré, particules, nom au-dessus). Nouveaux ennemis (salamandre, tisseuse, luciole, vesse-de-loup, tortue, serpent, chauve-souris, rat) et boss liés aux cartes (Reine des guêpes, Grand Cerf, Roi Champignon, Taupe géante, Golem de racines au fond du donjon).
  - **Objets à effets** (`ITEMS`, `RARITIES`) : 24 objets ramassés au sol et empilables, en 4 raretés (commun, peu commun, rare, légendaire) : effets au coup (glands, éclairs, gel, pommes de pin chercheuses, météores…), à la mort (explosions, soins), à la blessure (bouclier, cape) ou passifs. Lâchés par les élites, les boss, les salles d'élite et au trésor, et parfois par les objets cassables.
  - **Coop en ligne** (2 à 6 joueurs) : connexion directe entre navigateurs (WebRTC, canal de données hôte ↔ invité). Supabase Realtime ne sert qu'au salon (présence) et à la mise en relation ; si la connexion directe échoue pour un joueur (certains réseaux 4G/entreprise), il repasse automatiquement par le relais Supabase (100 messages/s et 2 M/mois sur le plan gratuit). Bibliothèque `js/vendor/supabase-2.45.4.min.js` (licence MIT).
  - Après une modification des fichiers JS/CSS, change le `?v=…` dans les balises `<script>`/`<link>` des pages pour forcer les navigateurs à recharger.
  - Pour son classement, exécute une fois dans le SQL Editor de Supabase :
    `insert into public.lb_games (id, name, higher_is_better, min_score, max_score) values ('ecureuil-survivor', 'Écureuil Survivor', true, 0, 2000000) on conflict (id) do nothing;`
- **Écureuil Dice** (`dice.html`) :
  - `js/dice-data.js` : écureuils (`TYPES` : dégâts, cadence, effets, prix de déblocage en glands d'or), ennemis (`ENEMIES`, sprites repris de `js/game-data.js`), boss, réglages d'équilibrage (`CFG`), succès.
  - `js/dice-core.js` : moteur sans DOM (vagues, combat, fusions, IA, instantanés réseau). Testable dans Node : `require("./js/dice-data.js"); require("./js/dice-core.js")` puis `RD_CORE.createWorld(...)` / `RD_CORE.step(...)`.
  - `js/dice.js` : rendu canvas, commandes (glisser-déposer, multi-touch pour le même écran), menus, sauvegarde (localStorage `rd-save-v1`), en ligne (Supabase Realtime, salon `rd-room-CODE` : en coop l'hôte simule et l'invité envoie ses actions ; en versus chacun simule son monde et envoie un instantané 4×/s). `dice.html?debug` expose `RD_DEBUG` dans la console.
  - Pour son classement : `insert into public.lb_games (id, name, higher_is_better, min_score, max_score) values ('ecureuil-dice', 'Écureuil Dice', true, 0, 1000000) on conflict (id) do nothing;`
- **Le Grand Chêne** (`idle.html`) :
  - `js/idle-data.js` : tout le contenu modifiable à la main : habitants (`PRODUCERS`), améliorations (`LEVELED`, `PROD_UPG`, `CLICK_UPG`, `SAP_UPG`, `GLOBAL_UPG`, `GOLD_UPG`), fleurs (`FLOWERS`) et boutique du jardin, cultures (`CROPS`) et matériel de ferme, animaux (`ANIMALS`), marchandises (`GOODS`), racines (`ROOTS`, 1er prestige, formule des graines `SEED_DIV` / `SEED_POW`), saisons (`SEASONS`, `PERKS`, 2e prestige).
  - `js/idle.js` : moteur, rendu du chêne (canvas pixel), interface, succès (`ACH`), sauvegarde (localStorage `idle-chene-v1`, toutes les 15 s) et progression hors ligne. Version : `VERSION` en haut du fichier. `idle.html?debug` expose `IDLE_DEBUG` dans la console (ex. `IDLE_DEBUG.skip(3600)` pour avancer d'une heure).
  - `css/idle.css` : la mise en page du jeu (sur mobile, l'arbre reste collé en haut de l'écran).
- **Compte unique du site** (`js/auth.js`, chargé sur toutes les pages) : connexion Google via Supabase Auth, bouton dans l'en-tête, liens « Mon compte · Confidentialité » dans le pied de page. La bibliothèque Supabase n'est chargée que si quelqu'un est connecté ou clique sur « Se connecter ». Côté jeux : `SiteAuth.rpc("fonction", {...})`. Base de données, anti-triche et réglages Google : voir [`supabase/README.md`](supabase/README.md).
  - **Écureuil Dice** : connecté, la progression (glands, coffres, niveaux, deck) est sur le serveur et chaque action passe par une fonction qui vérifie tout (coffres tirés côté serveur, gains de fin de partie bornés par la durée réelle). En invité, la progression reste dans le navigateur ; le jeu en ligne demande un compte.
- **Réseaux** : `SITE.links` (laisse `""` pour masquer un lien).

Le texte de la bio est directement dans `bio.html`.

## Le reste

- `css/style.css` : couleurs (variables en haut du fichier, jour et nuit), blocs pixel, mise en page.
- `js/scene.js` : la forêt animée (parallaxe souris, écureuil, champignons, lucioles la nuit). Change `data-seed` sur un `<canvas class="pixel-scene">` pour générer une autre forêt.
- `js/main.js` : thème jour/nuit, menu, bibliothèque, formulaire.
- `assets/` : écureuil pixel (logo, favicon).

Pour tester en local : `python3 -m http.server` puis ouvre http://localhost:8000.
