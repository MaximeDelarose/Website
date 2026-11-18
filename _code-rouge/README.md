# MAB — CODE ROUGE

Escape game numérique de team building : une équipe de 3 à 6 personnes, un seul téléphone,
quinze minutes pour ouvrir quatre verrous (mémoire, déduction, communication, stabilisation)
et rétablir les communications.

- Sources : `_code-rouge/` (React 18, TypeScript strict, Vite). Aucun backend, aucun compte.
- Jeu publié : `code-rouge/` (résultat de `npm run build`, commité) → **https://mdelarose.fr/code-rouge/**
- Même schéma que les autres jeux privés du dépôt : lien direct, lié nulle part sur le site
  (ni menu, ni page Jeux), page en `noindex, nofollow`.

## Lancer en local

```bash
cd _code-rouge
npm install
npm run dev        # http://localhost:5190 — sur le téléphone (même Wi-Fi) : http://<ip-du-pc>:5190
npm test           # moteur : énigmes résolubles, barème, chrono, déroulement d'une partie
npm run build      # vérifie les types puis écrit le jeu dans ../code-rouge/
```

Partie complète automatisée dans un vrai navigateur (format iPhone, 25 vérifications, captures) :

```bash
npm run build && (cd .. && python3 -m http.server 8765 &) && npm run e2e
```

## Publier

1. `npm run build` dans `_code-rouge/`.
2. Commiter `code-rouge/` et fusionner dans `main` : GitHub Pages publie `https://mdelarose.fr/code-rouge/`.

Le dossier `code-rouge/` est un site statique autonome en chemins relatifs : il se dépose tel quel
sur **Cloudflare Pages** (commande de build `npm run build`, répertoire racine `_code-rouge`,
sortie `../code-rouge`), Netlify ou tout hébergeur HTTPS statique. Une mise à jour ne touche que
`_code-rouge/` et `code-rouge/`.

## Personnaliser pour un client

Tout est dans **`src/config/game.config.ts`** :

| Quoi | Clé |
|---|---|
| Logo, opérateur, entreprise cliente, titre | `brand` (`logoUrl` : fichier déposé dans `public/`) |
| Couleurs | `theme` (injectées en variables CSS) |
| Durée de la partie | `durationSeconds` |
| Barème, coût des indices, grades | `scoring` |
| Textes (accroche, briefing, intitulés des épreuves) | `texts` |
| Épreuve 1 : tailles de grille, longueur des séquences, temps d'affichage | `memory` |
| Épreuve 2 : agents, casiers, heures d'entrée, badge cloné, voyage, indices | `deduction` |
| Épreuve 3 : mot de passe, relais actifs (= clé de chiffrement), indices | `cipher` |
| Finale : vitesse de chute de la stabilité, durée de maintien, anneaux | `finale` |

Les réponses ne sont jamais saisies à la main : elles sont **calculées** à partir des données
(`src/engine/puzzles.ts`). Changer un casier ou un relais met à jour le code attendu, et
`npm test` vérifie que chaque énigme garde une solution unique.

## Solutions (configuration actuelle)

- **Mémoire** : grilles et séquences tirées au sort à chaque partie (3 manches : 3×3, 4×3, 4×4).
  Fragment 1 = dernier symbole de la dernière séquence.
- **Déduction** : la note donne la règle (casiers des agents entrés, dans l'ordre d'entrée) ; le
  journal compte cinq entrées ; la carte d'embarquement prouve que Sauvage était à Lisbonne (badge
  cloné, à écarter). Ordre : Leroy 21:04, Novak 21:37, Imbert 22:52, Duval 23:20 → **4927**.
- **Communication** : 5 relais actifs sur 8 → l'agent a avancé de 5 lettres, il faut reculer de 5.
  `FZWTWJ` → **AURORE**.
- **Finale** : symbole d'amorçage (fragment 1) + double verrou tenu à deux, code 4927, trois
  anneaux à synchroniser, mot de passe AURORE, puis maintien pour rétablir.

## Barème (identique pour toutes les équipes)

Par épreuve : points de réussite + bonus de rapidité (linéaire, nul au temps de référence)
− erreurs − indices, avec un plancher. En finale, chaque surcharge du noyau coûte 100 points.
Mission réussie : +2 points par seconde restante. Le chrono ne tourne que pendant les épreuves
(en pause pendant les explications et les bilans). Le détail est affiché dans le jeu
(« Comment le score est calculé ») et au rapport final.

## Architecture

```
src/
  config/      game.config.ts (tout le paramétrable) + types
  engine/      logique pure, testée : state.ts (réducteur + chrono), scoring.ts, puzzles.ts, storage.ts
  services/    audio.ts (sons synthétisés), fx.ts (étincelles, secousses), session.ts (mode événement)
  components/  noyau animé, HUD, cadre d'épreuve, claviers, feuilles modales, barème
  screens/     accueil, équipe, briefing, entrée d'épreuve, bilan, victoire, rapport final
  stages/      les quatre épreuves
tests/         engine.test.ts (Vitest) · e2e.mjs (Playwright)
```

- **Sauvegarde** : l'état complet est écrit dans `localStorage` à chaque action. Après un
  rechargement, l'écran d'accueil propose de reprendre ; le chrono, lui, a continué de tourner
  (horloge réelle), ce qui évite toute triche par fermeture de l'onglet.
- **Mode événement (à venir)** : le jeu ne parle qu'à l'interface `SessionGateway`
  (`services/session.ts`), notifiée du début de partie, de chaque verrou ouvert et de la fin.
  Aujourd'hui `localGateway` ne fait rien (aucun faux joueur, aucun faux classement). Il suffira
  de brancher une implémentation réseau dans `createGateway()` (code de session, classement
  partagé) sans toucher au moteur ni aux écrans. Le moteur étant un réducteur pur piloté par une
  graine, un serveur peut rejouer et vérifier un score.
