# Le Monde Magique de Célia

Petit jeu mobile 2D pour une enfant de 3 ans (iPhone / Safari, installable sur l'écran d'accueil). Aucune donnée n'est envoyée sur Internet : pas de compte, pas de pub, pas d'achat, pas de lien externe.

## Publication (même système que RADIA)
Le dépôt est publié par **GitHub Pages** (`CNAME` = mdelarose.fr, aucun workflow) : tout dossier commité sur `main` est servi.
RADIA est un build commité dans `radia/`. Célia est du JavaScript/CSS statique sans étape de build : **le dossier `celia/` est lui-même le build publié**.
- URL attendue : `https://mdelarose.fr/celia/` (à confirmer après la fusion sur `main`).
- Chemins tous relatifs ; service worker et manifeste avec `scope: ./` (ne touchent pas RADIA / À DEUX) ; caches `celia-*`.
- `robots.txt` racine non modifié. La page contient `noindex` — ce n'est **pas** une protection d'accès.
- Ce dossier `_celia/` commence par `_` : ignoré par GitHub Pages (docs + tests seulement).

## Mettre à jour
Modifier `celia/`, changer `VERSION` dans `celia/sw.js` (et la liste `FILES` si un fichier est ajouté), commiter, fusionner sur `main`.

## Tests
`python3 -m http.server 8123` à la racine du dépôt, puis `NODE_PATH=$(npm root -g) node _celia/tests/smoke.cjs` (Chromium mobile émulé, **pas** un vrai iPhone).

## Personnalisation
`celia/custom/custom.js` : prénom et portrait facultatif (le dossier est public : ne publier une photo que si c'est voulu).

## Limites connues
- Safari peut effacer les données du site (créations locales non garanties).
- Le mode silencieux de l'iPhone peut couper les sons ; la voix utilise la synthèse vocale du navigateur (bulle + petits sons en secours).
- Non testé sur un vrai iPhone.
