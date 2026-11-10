# RADIA ♡ — « Un petit monde, rien que pour toi. »

Jeu web (mobile d'abord, iPhone 16 / Safari) : fusion cozy, histoire en 5 chapitres,
3 mini-jeux, échecs contre l'IA et Mode Reine, album de souvenirs, fin romantique.

Suivi détaillé (fait / reste à faire / décisions) : [`SUIVI.md`](SUIVI.md).

## Développer

```bash
cd radia-src
npm install
npm run dev      # puis ouvrir http://localhost:5173 (sur le téléphone : http://<ip-du-pc>:5173)
npm test
npm run build    # écrit le site prêt à publier dans ./dist (projet indépendant)
GIFT=demo npm run dev   # autre cadeau (src/config/gifts/<id>.json)
npm run check:update && npm run check:isolation   # mises à jour de l'appli installée / isolation des caches et sauvegardes
```

`?debug` dans l'adresse expose `window.RADIA` (sauvegarde, audio, jeu) dans la console.

## Arborescence

```
src/
  main.ts                 démarrage (sauvegarde → Phaser → polices → accueil)
  core/                   contexte global, progression (cœurs, souvenirs, succès, répliques)
  data/                   objets, 30 niveaux, dialogues, histoire, souvenirs, succès  ← contenu modifiable
  save/                   format versionné, validation, copie de secours
  audio/                  musique + effets synthétisés
  game/
    merge/                règles (rules.ts), bot/indices, scène Phaser, HUD (playLevel.ts)
    chess/                échecs (chess.js + IA en Worker), problèmes, Mode Reine
    minigames/            3 mini-jeux (logique pure dans logic/)
    narrative/            moteur d'histoire, tutoriel, séquence finale
    scenes/               scène de fond (décors + particules), scène finale
    art/                  dessins vectoriels : personnages, objets, décors, souvenirs
  ui/                     écrans HTML (accueil, carte, album, succès, paramètres), dialogues, styles
public/assets/music/radia-theme.mp3   la musique (fichier fourni, réencodé en 128 kb/s)
```

## Publier

RADIA est un projet **indépendant** du site `mdelarose.fr` : voir [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) (Cloudflare Pages / Vercel,
protection d'accès, mises à jour automatiques, extraction vers un dépôt séparé). Personnaliser un cadeau : [`PERSONNALISATION.md`](PERSONNALISATION.md).
`npm run build:legacy` reproduit l'ancienne sortie `../radia-52c8654e04` (ancien lien, tant que tu ne l'as pas retiré toi-même).

## Vérifications à faire sur l'iPhone 16 (non testables ici)

- [ ] Le son démarre au premier toucher sur « JOUER », le volume suit les réglages ; avec le bouton silencieux activé (iOS 17+ : la musique doit quand même jouer).
- [ ] Verrouiller l'écran / passer à une autre appli / recevoir un appel : la musique se coupe puis reprend au retour (un toucher peut être nécessaire).
- [ ] Rien n'est caché sous la Dynamic Island ni sous la barre d'accueil, en mode Safari normal et une fois ajouté à l'écran d'accueil.
- [ ] Glisser-déposer fluide sur le plateau, pas de défilement de la page, pas de zoom au double toucher.
- [ ] Billard : la visée au doigt est confortable ; échecs : glisser une pièce fonctionne.
- [ ] Tourner le téléphone : le message « mode portrait » s'affiche, puis le jeu revient correctement.
- [ ] Recharger la page en plein niveau : le plateau est retrouvé tel quel.
- [ ] Mode avion après une première visite : le jeu se lance (service worker).
- [ ] Le texte arabe de la déclaration s'affiche bien de droite à gauche.
- [ ] Fluidité (60 images/s visées) ; sinon Paramètres → Effets visuels « Réduits ».
