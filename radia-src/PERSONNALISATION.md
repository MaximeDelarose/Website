# Personnaliser un cadeau (nouveau client, nouveau prénom)

Un cadeau = **un fichier de configuration** `src/config/gifts/<id>.json` + **un contenu** (textes, photos, musique). Le moteur
(`src/game`, `src/ui`, `src/core`…) ne contient aucun prénom : il lit la configuration.

## 1. Ce qui est déjà pilotable par la configuration

| Champ | Effet |
|---|---|
| `id` | identifiant du cadeau (minuscules, chiffres, tirets) — obligatoire |
| `partner.name` | **prénom du compagnon** : dialogues, messages, lettres, cadeaux, missions, réseaux fictifs, scènes… (voir §2) |
| `partner.fieldLabel` | libellé du champ **dans le questionnaire / l'outil de préparation** (jamais affiché dans le jeu) : « Prénom de votre homme », « Prénom de votre partenaire », « Prénom de votre femme » |
| `partner.fallbackName` | formulation si `partner.name` est vide (« Ta moitié ») — aucun champ vide n'est jamais affiché |
| `app.title`, `app.shortName`, `app.subtitle`, `app.description`, `app.lang` | titre de la page, nom sous l'icône iPhone (≤ 14 caractères), sous-titre de l'écran d'accueil |
| `app.themeColor`, `app.backgroundColor` | couleurs de la PWA (`#RRGGBB`) |
| `pwa.id` | identifiant unique de l'application installée — obligatoire |
| `pwa.cachePrefix` | préfixe des caches **et** des clés de sauvegarde — obligatoire, unique par cadeau (sépare les progressions) |
| `pwa.display`, `pwa.orientation` | `standalone` (défaut) / `fullscreen` / `minimal-ui` ; `portrait` / `any` |

Le manifeste (`manifest.webmanifest`), le `<title>`, `theme-color` et le nom de l'icône sont **générés à la build** depuis ce fichier.
Un champ manquant ou invalide prend une valeur par défaut ; `id`, `pwa.id` et `pwa.cachePrefix` sont obligatoires (la build s'arrête sinon).

## 2. Changer le prénom du compagnon

1. Copier `src/config/gifts/radia.json` en `src/config/gifts/emma.json`.
2. Modifier `id` (`emma`), `pwa.id` (`emma-app`), `pwa.cachePrefix` (`emma`), `app.*` et `partner.name` (ex. `"Hugo"`).
3. Compiler : `GIFT=emma npm run build` (ou `GIFT=emma npm run dev`).

L'élision est automatique : « la promesse **d'Hugo** », « le cadeau **de Thomas** ». Sans prénom : « **Ta moitié** », « le cadeau **de ta moitié** ».
Dans le code, on écrit `PARTNER` / `PARTNER_DE` (`src/config/gift.ts`), **jamais** un prénom. Le test `tests/no-hardcoded-names.test.ts`
échoue si « Auguste » réapparaît dans un texte du moteur.

La configuration `demo.json` (« Thomas », couleurs turquoise, sans donnée personnelle) sert à vérifier la réutilisation :
`npm run build:demo` produit `dist-demo/`.

## 3. Ce qui n'est PAS encore dans la configuration (état honnête)

Le **contenu RADIA** vit encore dans `src/data/**` et `src/events/data/**` (histoire en 5 chapitres, dialogues, répliques d'Auguste,
souvenirs, déclaration finale, expressions en darija, scènes d'événements) et le **prénom de la destinataire** (« Radia ») est le titre
du jeu et le nom des illustrations. Pour un autre couple il faut donc, aujourd'hui, remplacer ces fichiers de données (même
structure, aucun code à toucher). Prochaine étape recommandée : déplacer ces données dans `src/config/gifts/<id>/` et les charger
par le même alias `@gift-config`, avec validation de schéma (voir ROADMAP).

| Quoi | Où aujourd'hui |
|---|---|
| Histoire, dialogues des chapitres | `src/data/story.ts`, `src/data/dialogue.ts` |
| Répliques du compagnon par situation (ton, darija) | `src/data/augusteTone.ts`, `src/data/world/augusteLines.ts`, `src/data/darija.ts` |
| Souvenirs et photos de l'album | `src/data/memories.ts`, `src/data/photos.ts` |
| Événements romantiques (restaurant, photo, spa, bracelet, feu d'artifice, déclaration) | `src/events/data/*.ts` |
| Objets, niveaux, tenues | `src/data/items.ts`, `src/data/levels.ts`, `src/data/world/*.ts` |
| Musique | `public/assets/music/*.mp3` |
| Icônes de l'appli | `public/assets/icons/` (192, 512, maskable-512, apple-touch-icon 180, favicon) |

## 4. Photos et données privées

- Les photos ne sont **jamais** commitées en clair : `private/photos/` (ignoré par git) → `node scripts/encrypt-photos.mjs` →
  fichiers chiffrés AES-256-GCM dans `public/assets/p/*.bin`. La clé (`private/photo-key.txt`) est envoyée dans le lien (`#k=…`), jamais au serveur.
- Photo ou illustration absente : le jeu affiche le dessin de repli. Aucune photo n'est inventée.
- **Un dépôt public ne doit contenir aucun texte personnel** : pour un vrai client, garder le dépôt du moteur public et le contenu privé dans un dépôt privé (voir `docs/DEPLOIEMENT.md` §5).

## 5. Checklist de livraison d'un nouveau cadeau

- [ ] Questionnaire reçu (prénoms, surnoms, photos, histoire, souvenirs, messages, blagues, ambiance)
- [ ] `src/config/gifts/<id>.json` créé et validé (`npm test` : `tests/gift-config.test.ts`)
- [ ] Contenu relu et **validé par le client** (aucune génération IA pendant le jeu ; si une IA aide à rédiger, c'est avant, hors moteur)
- [ ] Photos chiffrées, musique libre de droits ou fournie par le client
- [ ] `GIFT=<id> npm run build` + `npm test` + `npm run check:isolation`
- [ ] Projet d'hébergement dédié + domaine/lien propre + protection d'accès (`docs/DEPLOIEMENT.md`)
- [ ] Test manuel sur iPhone (liste dans `docs/DEPLOIEMENT.md` §7)
