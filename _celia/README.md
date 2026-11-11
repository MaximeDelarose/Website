# Le Monde Magique de Celia

Petit jeu mobile 2D pour une enfant de 3 ans (iPhone / Safari, installable sur l'écran d'accueil). Aucune donnée n'est envoyée sur Internet : pas de compte, pas de pub, pas d'achat, pas de lien externe.

## Publication (même système que RADIA)
Le dépôt est publié par **GitHub Pages** (`CNAME` = mdelarose.fr, aucun workflow) : tout dossier commité sur `main` est servi.
RADIA est un build commité dans `radia/`. Celia est du JavaScript/CSS statique sans étape de build : **le dossier `celia/` est lui-même le build publié**.
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

## Musique d'ambiance
4 morceaux (`celia/audio/musique-1..4.mp3`, normalisés à −20 LUFS, crête ≤ −1 dBTP), joués 1→2→3→4→1 avec fondu enchaîné de 4 s, en streaming (jamais les 4 en mémoire). Volume par défaut 20 %, réglable par l'adulte (appui long sur le haut-parleur). Voir `celia/js/music.js`.

## Voix
Voir `_celia/voix/README.md` (génération de fichiers vocaux, échantillons, ce qu'il manque).

## Tests
`node _celia/tests/french.cjs` (français, sans navigateur) ; avec `python3 -m http.server 8123` lancé : `smoke.cjs` (parcours), `ux.cjs` (ergonomie + musique), `atelier.cjs` (atelier coloriage : tailles, mode actif, retours visuels, aide), `cuisine.cjs` (partie de cuisine complète), `interactions.cjs` (coloriage, dessin, dressing, maquillage, animaux, jeux, chambre : action → résultat visible), `histoires.cjs [0-3]` (les 4 histoires), `session.cjs` (mode parent : code, durée, minuteur, pause en arrière-plan, rechargement, avertissement, fin, blocage sans code ; horloge simulée). Les autres tests injectent `_session.cjs` (session déjà démarrée) pour passer l'écran parent.

**Mode parent** : code stocké haché (SHA-256 salé, localStorage `celia.session`) — protection d'interface seulement, ne verrouille pas l'iPhone. Code perdu : effacer les données du site Safari (réglages iPhone › Safari › Avancé › Données de sites web).

Règle de conception : **toucher → effet visible → vérification → validation**. Un clic n'est jamais une réussite à lui seul ; un refus (« pas encore ») ne bloque jamais le bouton et ne bouge jamais la zone de dessin.
