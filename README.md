# AkarisuMD — site perso

Site statique (HTML/CSS/JS, rien à compiler) : il s'héberge tel quel sur GitHub Pages, Netlify, itch.io ou n'importe quel hébergeur.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : forêt pixel 2.5D animée, jeu jouable à la une, ce que je fais, derniers projets |
| `bibliotheque.html` | Tous les jeux et plugins Unity, avec filtres et recherche (`#jeux` / `#plugins` dans l'URL pour pré-filtrer) |
| `jeu.html` | **Écureuil Survivor** : mini jeu maison façon « survivors » (6 écureuils, 4 cartes à 3 biomes, 11 armes, 9 fusions + 5 légendaires, 12 objets, boutique, succès, 2 boss), jouable au clavier (ZQSD/WASD/flèches), à la souris (clic maintenu) ou au joystick tactile, avec classement en ligne |
| `chaaat.html` | **Chaaat** (version web) : lâche des chats dans un bocal, deux chats de la même couleur fusionnent en un plus gros (9 chats, combos). Souris, clavier ou doigt. Code : `js/chaaat.js` (liste des chats `CATS` en haut du fichier), meilleur score en localStorage, classement en ligne `chaaat` |
| `bio.html` | Biographie |
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
  - **Coop en ligne** (2 à 4 joueurs) : Supabase Realtime (diffusion + présence, clé publique, aucune table). L'hôte simule la partie et diffuse l'état ~8 fois/s ; chaque invité bouge son écureuil en local. Bibliothèque `js/vendor/supabase-2.45.4.min.js` (licence MIT, hébergée sur le site). Limites du plan gratuit Supabase : 100 messages/s pour tout le projet et 2 M/mois (≈ 20 h de jeu à 2 par mois).
  - Après une modification des fichiers JS/CSS, change le `?v=…` dans les balises `<script>`/`<link>` des pages pour forcer les navigateurs à recharger.
  - Pour son classement, exécute une fois dans le SQL Editor de Supabase :
    `insert into public.lb_games (id, name, higher_is_better, min_score, max_score) values ('ecureuil-survivor', 'Écureuil Survivor', true, 0, 2000000) on conflict (id) do nothing;`
- **Réseaux** : `SITE.links` (laisse `""` pour masquer un lien).

Le texte de la bio est directement dans `bio.html`.

## Le reste

- `css/style.css` : couleurs (variables en haut du fichier, jour et nuit), blocs pixel, mise en page.
- `js/scene.js` : la forêt animée (parallaxe souris, écureuil, champignons, lucioles la nuit). Change `data-seed` sur un `<canvas class="pixel-scene">` pour générer une autre forêt.
- `js/main.js` : thème jour/nuit, menu, bibliothèque, formulaire.
- `assets/` : écureuil pixel (logo, favicon).

Pour tester en local : `python3 -m http.server` puis ouvre http://localhost:8000.
