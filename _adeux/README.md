# À DEUX — *On ne trouve pas l'amour. On le construit.*

Application de rencontre (PWA, mobile-first) **entièrement indépendante** : son propre dossier, sa propre
compilation, son propre déploiement, son propre manifest, service worker, caches, stockage local et base de
données. Elle ne partage rien avec les autres projets du dépôt (RADIA, jeux, site principal).

> Dossier `_adeux/` : le préfixe `_` est ignoré par Jekyll/GitHub Pages, donc **rien n'est publié** sur
> mdelarose.fr par ce dossier. Le seul fichier hors de `_adeux/` modifié par ce travail : **aucun**.

## Choix techniques (et pourquoi)

| Choix | Raison |
|---|---|
| **Vite + React + TypeScript** (au lieu de Next.js) | Application 100 % cliente, déployable en fichiers statiques sur n'importe quel hébergeur ; service worker et mises à jour entièrement maîtrisés ; pas de serveur Node à héberger. |
| Tailwind CSS 3, **Motion** (animations), Zustand | Design system léger, animations fluides, état persistant versionné. |
| **Supabase** (Postgres + RLS + Storage + Auth) | Règles d'accès *dans la base* (pas dans l'interface). |
| **LiveKit** (WebRTC) via Edge Function | Appel audio réel ; jeton généré côté serveur. |
| Cloudflare Pages (recommandé) | URL HTTPS dédiée gratuite, déploiement à chaque push, domaine `adeux.mdelarose.fr` possible. |

## Lancer en local

```bash
cd _adeux
npm install
npm run dev            # http://localhost:5173  (démo jouable, aucun service externe)
# ou, version de production (avec service worker) :
npm run build && npm run preview     # http://localhost:4173
```
Sur téléphone (même Wi-Fi) : `npm run dev` affiche l'URL réseau (`--host`). Le service worker et l'installation
iPhone exigent HTTPS (voir déploiement) ; en local, utilise la démo dans le navigateur.

## Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | build (publiques) | Active le mode réel. Absentes → démo. **Jamais de clé `service_role` côté navigateur.** |
| `VITE_LIVEKIT_URL` | build (publique) | URL WebSocket LiveKit pour les vrais appels. |
| `ADEUX_BUILD_ID` | build (facultatif) | Force l'identifiant de version (sinon : empreinte du code). |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `ADEUX_ORIGIN` | **secrets Supabase** (Edge Function) | Génération des jetons d'appel. |

## Base de données

`supabase/migrations/0001_adeux_init.sql` — à appliquer sur un **projet Supabase dédié à À DEUX**
(`supabase link` puis `supabase db push`). Contient : tables, fonctions SECURITY DEFINER (proposition,
consentement atomique, blocage, signalement, suppression), politiques RLS, stockage privé (`photos`, `voice`),
limitation d'abus, majorité imposée par la base, codes d'invitation. Créer les codes :

```sql
insert into invite_codes(code_hash, max_uses)
values (encode(sha256(convert_to('MON-CODE','UTF8')),'hex'), 5);
```
Réglages Supabase Auth recommandés : confirmation e-mail activée, inscriptions limitées, mot de passe fort.
Edge Function d'appel : `supabase functions deploy livekit-token` (+ `supabase secrets set LIVEKIT_API_KEY=… LIVEKIT_API_SECRET=… ADEUX_ORIGIN=https://adeux.mdelarose.fr`).

## Accès : démonstration publique, sans compte ni code

La version déployée est une **démo** : elle s'ouvre directement, sans compte ni code d'invitation, avec des
personnages et des données **fictifs** (rien d'autre n'est publié : aucune donnée personnelle, aucun secret,
aucun contenu des autres projets). Elle reste **non indexée** : `<meta robots noindex>`, en-tête `X-Robots-Tag`,
`robots.txt` (`Disallow: /`), aucun sitemap. Une URL non indexée n'est pas une protection : n'y mets rien de réel.

Désactivé tant que non configuré : mode réel Supabase (aucune variable → aucun appel réseau), appel LiveKit
(l'appel est une simulation signalée), connexion/inscription (absentes de l'interface).
Une porte d'accès serveur (`server/gate.ts`, testée) est conservée pour la version privée future, mais n'est
**pas** branchée au déploiement de la démo.

## Publication : le même système que RADIA (GitHub Pages)

Le dépôt est publié par **GitHub Pages** (fichier `CNAME` = mdelarose.fr, aucun workflow). RADIA y est publié en
**commitant son build dans le dépôt** (`radia/`), puis en fusionnant sur `main`. À DEUX fait pareil, dans son propre
dossier au nom non devinable :

- Build publié : `adeux-7c1f3a9e52/` (généré par `npm run build:pages`, ne pas éditer à la main).
- URL : **https://mdelarose.fr/adeux-7c1f3a9e52/** (non listée sur le site, `noindex` dans la page).
- Publier une nouvelle version : `cd _adeux && npm test && npm run build:pages`, commiter `adeux-7c1f3a9e52/`,
  fusionner sur `main`. Les iPhone reçoivent la mise à jour via la bannière.
- Séparation : dossier, service worker (scope = ce dossier), caches `adeux-*`, stockage `adeux:*`, base IndexedDB
  `adeux-db`. Aucun fichier partagé du dépôt n'est modifié (`robots.txt` n'est volontairement pas touché).
- Limite : GitHub Pages n'applique pas les en-têtes de `public/_headers` ; le `noindex` repose sur la balise meta.

Alternative indépendante (Cloudflare Pages, plus tard) : `npm run build` produit `dist/` (racine d'un domaine).

## Installer sur iPhone

1. Ouvrir l'URL dans **Safari** (HTTPS obligatoire).
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. L'icône À DEUX apparaît ; elle s'ouvre en plein écran (mode standalone), avec écran de lancement, zones de
   sécurité et clavier gérés. Les données et la connexion sont conservées entre les ouvertures.

## Publier une nouvelle version

```bash
cd _adeux && npm test && npm run build && npx wrangler pages deploy dist --project-name adeux-app
```
Le build calcule un identifiant (empreinte du code) → `dist/version.json` et `dist/sw.js` (cache `adeux-static-<id>`).

**Côté iPhone, sans rien désinstaller** :
- À l'ouverture, au retour dans l'app (`visibilitychange`), au retour du réseau et toutes les 30 min, l'app vérifie
  `sw.js` et `version.json` (jamais mis en cache).
- La nouvelle version se télécharge en arrière-plan ; une bannière discrète propose **« Une nouvelle version est
  disponible → Mettre à jour »**. Elle n'est **jamais affichée ni appliquée pendant un jeu, un appel, un
  enregistrement ou la révélation** (compteur « occupé »), puis apparaît dès que l'activité se termine.
- Au clic, le nouveau service worker s'active et la page se recharge proprement ; les anciens caches `adeux-*`
  sont supprimés (aucune ancienne version ne reste bloquée). Les navigations passent d'abord par le réseau.
- **Données conservées** : `localStorage` (`adeux:store`, versionné avec **migrations** `migrate()` testées),
  IndexedDB (photo, vocaux), session Supabase. Pour changer la structure : incrémenter `STORE_VERSION` et ajouter
  une étape dans `migrate()` (`src/lib/store.ts`) + un test.
- Côté base : ajouter une nouvelle migration `supabase/migrations/000N_*.sql` (ne jamais modifier une migration appliquée).

## Séparation technique

Sources `_adeux/src`, commandes `npm run build` (dans `_adeux`), build `_adeux/dist`, manifest `adeux`
(`id: "/"`), icônes `public/icons`, service worker `adeux-*` (préfixe de cache dédié, ne touche jamais un autre
cache), stockage local `adeux:*`, base Supabase dédiée. Rien dans le dépôt en dehors de `_adeux/` n'est modifié.

## Tests

```bash
npm test            # unitaires + base de données (PostgreSQL embarqué PGlite)
npm run build && npm run test:e2e   # parcours complets sur émulation iPhone 14 (Chromium)
```

## État des fonctionnalités

Voir la section **« État réel »** en bas de ce fichier.

---

## État réel (honnête)

### ✅ Terminé et vérifié par des tests exécutés
- **Démo jouable complète**, hors ligne, sans service externe : introduction (3 écrans, passer, « Essayer la démo »
  clairement identifiée comme simulation), inscription 18+ avec déclaration d'âge, questionnaire de 20 cartes
  (5 mécaniques : cartes, choix multiples, dilemmes, échelles, question ouverte facultative), sauvegarde automatique,
  retour arrière, passer les facultatives, récapitulatif modifiable.
- **Matching** (`src/lib/matching.ts`) : critères essentiels mutuels (majorité, préférences, âges, distance,
  intentions/enfants « indispensables »), puis points communs/différences **sans score**. Une rencontre active max,
  une proposition par jour, personne bloquée/déjà vue jamais reproposée, état « personne pour l'instant ».
- **Rencontre mystère** + parcours 4 étapes (découverte, connexion, voix, révélation) à actions réciproques, avec
  pause / quitter / signaler / bloquer.
- **3 mini-jeux** : Le Miroir (secret → cartes qui se retournent), Le Pont (coopération, gabarits à emboîter, victoire
  commune, partenaire asynchrone), La Boussole (3 situations, aiguilles, aucun jugement). Reprise après fermeture.
- **Notre moment** (rituel facultatif, sans série ni perte), **messagerie** (texte + **vrais messages vocaux** via
  MediaRecorder, stockés en local), **double consentement**, **révélation animée**, **Notre monde** (scène qui
  grandit, carnet de souvenirs, propositions de rendez-vous, questions à découvrir), réglages de confidentialité,
  suppression des données.
- **PWA** : manifest, icônes (dont maskable et apple-touch), écrans de lancement iPhone, standalone, safe areas,
  clavier (`visualViewport`), cibles ≥ 44 px, `prefers-reduced-motion`, sons synthétisés désactivables, vibrations
  seulement si disponibles (pas sur Safari iOS).
- **Mises à jour** : service worker versionné, détection (au retour dans l'app, réseau, 30 min), bannière élégante,
  jamais pendant jeu/appel/enregistrement/révélation, anciens caches supprimés, migrations de données testées.
- **Base de données** (`0001_adeux_init.sql`) : RLS + fonctions testées sur un vrai PostgreSQL (voir ci-dessous).
- **Porte d'accès serveur** (cookie signé) : logique testée en unitaire.

### ⚠️ Fonctionnel mais avec des limites assumées
- **Appel vocal** : en démo, c'est une **SIMULATION explicitement indiquée** (le micro sert uniquement à afficher ton
  niveau, rien n'est transmis). Le moteur LiveKit + l'Edge Function de jeton sont écrits mais **non testés** faute de
  compte LiveKit. Alternative réelle : messages vocaux.
- **Mode réel (Supabase)** : schéma, politiques, fonctions et couche client (`src/lib/realApi.ts`) sont écrits ;
  les politiques sont testées. **L'interface n'est pas encore branchée** sur cette couche (pas d'écran de connexion,
  pas de synchronisation) : l'app tourne aujourd'hui en mode démo local. Jamais de faux utilisateurs en production :
  sans personne disponible, l'état vide s'affiche.
- **Photos** : en démo, ta photo reste sur ton appareil (IndexedDB) ; les portraits des personnages fictifs sont des
  illustrations. En mode réel, la photo irait dans un bucket **privé** avec la politique « révélation validée ».
- **Concurrence** : l'atomicité du double consentement repose sur un verrou de ligne (`for update`) ; PGlite n'a
  qu'une connexion, donc seuls les **deux ordres d'arrivée** sont testés, pas de vrai parallélisme.
- Tests E2E : **émulation iPhone 14 sous Chromium** — pas Safari iOS réel. Safari (audio, MediaRecorder, installation,
  vibrations) doit être vérifié sur ton iPhone.

### ❌ Non fait / à ta charge
- **Déploiement** (aucun accès à ton hébergeur/DNS), domaine `adeux.mdelarose.fr`, secrets `ADEUX_*`.
- Projet Supabase **dédié** + migration + codes d'invitation ; compte LiveKit ; branchement UI du mode réel.
- Vérification d'identité/âge (la déclaration n'en est pas une), modération humaine des signalements, e-mails
  transactionnels, notifications push, politique de confidentialité, mentions légales, **audit RGPD/sécurité**.
- Test sur appareils réels (plusieurs iPhone, Android).
