# CLAUDE.md

Site perso statique (HTML/CSS/JS). Le dossier racine se déploie tel quel, sans build.

## Carte du repo

**Site principal (source, à modifier)**
- `index.html`, `jeux.html`, `bio.html`, `contact.html`, `compte.html`, `stats.html`, `admin.html`, `projet.html`
- `js/` : scripts du site. `js/data.js` contient la liste des projets (`PROJECTS`) et `SITE`.
- `css/` : styles.
- `data/projects/<id>.json` : fiches projet. `assets/` : images et médias.
- `README.md` : très long (100 Ko). Ne pas le lire en entier, chercher la section voulue.

**Jeux (chacun est autonome)**
- `jeu.html` (Survivor), `merger.html`, `dice.html`, `king-dice.html`, `ages.html`, `arcane.html`, `ronceclair.html`, `echecs.html`, `billard.html`, `golf.html`, `grimpe.html`, `idle.html`, `catower.html`, `ashbound.html`.
- `arcade/` : projet TypeScript (`npm run build`, `npm test`).

**Sous-projets avec build (sources)**
- `_adeux/` : app Vite + TypeScript. Source de `adeux-7c1f3a9e52/`.
- `_radia/` : app Vite + TypeScript. Source de `radia/`.
- `radia-src/` : app Vite + TypeScript (`npm run dev|build|test`).

**Sorties de build : ne pas modifier ni lire, sauf demande explicite**
- `adeux-7c1f3a9e52/` (généré par `_adeux`, `npm run build:pages`)
- `radia/` (généré par `_radia`)
- `radia-52c8654e04/` (build de `radia-src`, à confirmer)
- `_adeux/` et `_radia/` contiennent la source, `radia-src/` aussi : ne pas confondre les trois.

**Autres**
- `tools/` : scripts de génération et de vérification (ex. `grimpe-gen.js`, `import_itch.py`).
- `tests/` : tests du site.
- `supabase/` : schéma et config des classements. `leaderboard/` : package Unity et doc associée.
- `Fonts/`, `Image/` : ressources graphiques.
- `_celia/`, `_notes/` : notes et travaux annexes.
- `TODO.md` : liste des tâches en cours.

## Commandes

- Site statique : ouvrir `index.html` ou lancer un serveur local (`python3 -m http.server`).
- Sous-projets : `cd <dossier> && npm install && npm run dev`.
- Tests : `npm test` dans le sous-projet concerné.

## Conventions

- Modifier la source, jamais les sorties de build.
- Un jeu ajouté : sa carte dans `jeux.html`, son `data-page` dans `GAME_PAGES` (`js/main.js`), et son entrée dans `js/data.js` si besoin.
- Les classements passent par Supabase (clé publique dans `SITE.supabase`).
- Garder les réponses et les commits concis. Un commit par changement logique.
