# AkarisuMD — site perso

Site statique (HTML/CSS/JS, rien à compiler) : il s'héberge tel quel sur GitHub Pages, Netlify, itch.io ou n'importe quel hébergeur.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : forêt pixel 2.5D animée, jeu jouable à la une, ce que je fais, derniers projets |
| `bibliotheque.html` | Tous les jeux et plugins Unity, avec filtres et recherche (`#jeux` / `#plugins` dans l'URL pour pré-filtrer) |
| `bio.html` | Biographie |
| `contact.html` | Formulaire « message direct » + liens |

## Modifier le contenu

Presque tout se règle dans **`js/data.js`** :

- **Projets** : ajoute un objet dans `PROJECTS` (`type: "game"` ou `"plugin"`). Sans `cover`, une jaquette pixel est générée automatiquement.
- **Jeu jouable sur l'accueil** : `SITE.featured.embed` = `https://itch.io/embed-upload/XXXXXXX?color=1f3a2b` (le numéro se trouve dans l'URL `html-classic.itch.zone/html/XXXXXXX/…` de la page du jeu).
- **Formulaire de contact** : crée un formulaire gratuit sur [Formspree](https://formspree.io) et colle l'URL dans `SITE.formEndpoint`. Sinon, renseigne `SITE.email` et le bouton ouvrira le logiciel mail du visiteur.
- **Réseaux** : `SITE.links` (laisse `""` pour masquer un lien).

Le texte de la bio est directement dans `bio.html`.

## Le reste

- `css/style.css` : couleurs (variables en haut du fichier, jour et nuit), blocs pixel, mise en page.
- `js/scene.js` : la forêt animée (parallaxe souris, écureuil, champignons, lucioles la nuit). Change `data-seed` sur un `<canvas class="pixel-scene">` pour générer une autre forêt.
- `js/main.js` : thème jour/nuit, menu, bibliothèque, formulaire.
- `assets/` : écureuil pixel (logo, favicon).

Pour tester en local : `python3 -m http.server` puis ouvre http://localhost:8000.
