# RADIA ♛ — « À toi de jouer, ma reine ♡ »

Jeu d'échecs romantique et **privé** : Radia (les Blancs) affronte Auguste, un adversaire virtuel
(Stockfish 18 + une « personnalité » qui fait des erreurs humaines). Chaque capture de Radia
dévoile une carte souvenir (photo ou illustration + phrase), pendant laquelle les deux pendules
sont en pause.

- Code source (public) : `_radia/` — TypeScript strict, Vite, chess.js, Stockfish WASM (Web Worker), Vitest.
- Jeu publié : `radia/` — **tout le contenu personnel y est chiffré** (AES-256-GCM, clé dérivée du
  mot de passe par PBKDF2-SHA256, 600 000 itérations). Sans le mot de passe, le serveur ne sert
  que des fichiers illisibles : photos, musique, textes et même le code du jeu.
- Le contenu personnel en clair vit dans `_radia/private/` (**jamais commité**, voir `.gitignore`).
- Le jeu n'est lié nulle part sur le site (ni menu, ni page Jeux, ni sitemap), la page est en
  `noindex, nofollow` et `robots.txt` interdit son exploration.

## Développer

```bash
cd _radia
npm install
npm run unpack          # récupère private/ depuis radia/vault/ (demande le mot de passe, voir plus bas)
npm run dev             # http://localhost:5180  (?debug expose RADIA_DEBUG)
npm test                # règles, pendule, IA, cartes, sauvegarde, bulles, chiffrement
npm run build           # vérifie les types, construit puis chiffre vers ../radia/
```

Le mot de passe se donne par `RADIA_PASSWORD=… npm run build` ou dans le fichier `_radia/.password`
(ignoré par git). Sans `private/content.ts`, `npm run dev` utilise un contenu d'exemple neutre.

## Personnaliser

| Quoi | Où |
|---|---|
| Phrases, cartes souvenirs, bulles d'Auguste, textes de fin, scène secrète | `private/content.ts` |
| Photos des cartes | `private/memories/*.jpg` (champ `image` des cartes) |
| Musique | `private/music/radia-theme.mp3` |
| Difficultés (Doux, Joueur, Petit défi) | `src/ai/persona.ts` (`DIFFICULTIES`) |
| Apparence de Radia (tache dans l'œil gauche, anneau au nez, couleurs) | `src/art/portraits.ts` (`RADIA_LOOK`) |
| Couleurs, animations | `src/styles.css` |

`npx tsx scripts/simulate.ts 6 doux joueur` fait jouer Auguste contre une joueuse simulée
pour vérifier qu'il reste accessible sans donner sa dame.

## Publier (GitHub Pages, mdelarose.fr)

1. `npm run build` dans `_radia/`.
2. Commiter `radia/` (fichiers chiffrés) et pousser sur `main` : GitHub Pages publie
   **https://mdelarose.fr/radia/**.

## Partager avec Radia

- Lien direct (le mot de passe est dans la partie après `#`, que le navigateur n'envoie jamais
  au serveur) : `https://mdelarose.fr/radia/#cle=MOT-DE-PASSE`. Le jeu s'ouvre, puis le mot de passe
  est retiré de la barre d'adresse et mémorisé sur son iPhone.
- Ou le lien simple `https://mdelarose.fr/radia/` + le mot de passe à taper une fois.
- Sur iPhone : Safari → Partager → « Sur l'écran d'accueil » pour l'avoir comme une appli, en plein
  écran (il faudra y retaper le mot de passe une fois : iOS sépare les données de l'appli et de Safari).

## Retirer l'accès

- **Changer le mot de passe** : nouveau mot de passe dans `.password`, `npm run build`, commit, push.
  Tout est re-chiffré avec un nouveau sel : l'ancien mot de passe et les anciens liens ne marchent plus.
  (Un appareil qui a déjà ouvert le jeu en garde une copie en cache tant qu'il ne recharge pas la page.)
- **Tout retirer** : supprimer le dossier `radia/` du dépôt et pousser. Les anciennes versions
  restent dans l'historique git, mais chiffrées.

## Ce qui protège, et ce qui ne protège pas

- Protection réelle : chiffrement des fichiers. Ce n'est pas un simple mot de passe vérifié en
  JavaScript : sans la clé, il n'y a rien à lire.
- La solidité dépend du mot de passe : les fichiers chiffrés étant téléchargeables, un mot de passe
  long et aléatoire (comme celui généré par défaut) est indispensable.
- GitHub Pages ne permet pas de contrôle d'accès côté serveur. Pour en ajouter un (en plus du
  chiffrement) : Cloudflare Access ou un hébergeur avec mot de passe (Netlify, Vercel…).
- Le code du jeu (sans contenu personnel) est public dans `_radia/`, comme le reste du dépôt.

## Licences

- chess.js : BSD-2-Clause.
- Stockfish 18 (build WASM de Nathan Rugg / Chess.com) : GPLv3, voir `radia/engine/STOCKFISH-COPYING.txt`.
  Il tourne dans son propre Web Worker et dialogue par UCI ; le code source du moteur est sur
  https://github.com/nmrugg/stockfish.js.
- Aucun classement Elo n'est annoncé : la force d'Auguste n'a pas été mesurée face à des humains.
