# Héberger RADIA séparément de mdelarose.fr

Objectif : un lien dédié, une PWA autonome, des mises à jour automatiques, **aucune modification du site habituel**.

> ⚠️ État du dépôt : le dossier `radia-src/` (code) et les anciens dossiers `radia/`, `radia-52c8654e04/`, `_radia/`, `radia-admin.html`
> vivent aujourd'hui **dans le dépôt du site**, donc servis par GitHub Pages sur `mdelarose.fr`. Les retirer du site demande ton accord
> explicite : je n'y ai pas touché. Procédure au §6.

## 1. Ce qui garantit la séparation (déjà en place)

- Build **indépendante** : `npm run build` écrit dans `radia-src/dist/` (plus dans le dossier du site). `RADIA_OUT=…` pour un autre dossier.
- Aucune dépendance au site : le projet se compile seul (`npm ci && npm run build`), il n'importe rien hors de `radia-src/`.
- Manifeste, `start_url: ./` et `scope: ./` **relatifs** : la PWA se comporte pareil sur n'importe quel domaine.
- Service worker, caches (`radia-…`) et sauvegardes (`radia-save-v1`…) préfixés par cadeau (`pwa.cachePrefix`).
  Sur un domaine dédié, **l'origine** isole en plus tout stockage du site habituel (testé : `npm run check:isolation`).
- `noindex` : balise `<meta>`, en-tête `X-Robots-Tag` (`public/_headers`, `vercel.json`) et `robots.txt` « Disallow: / ».
- Aucun lien depuis le site vers RADIA ; `robots.txt` du site déjà configuré pour `/radia/` et `/_radia/`.

## 2. Mises à jour automatiques (Radia ne réinstalle jamais)

1. Tu modifies le code, `git push` → l'hébergeur reconstruit et publie (chaque build a un identifiant unique, `version.json`).
2. L'application installée relit `version.json` **sans cache** : au lancement, au retour au premier plan, au retour du réseau, toutes les 10 min si elle reste ouverte.
3. Nouvelle version détectée : le service worker télécharge tous les fichiers en arrière-plan (cache versionné, l'ancienne version + la précédente sont conservées).
4. Activation : **sur l'écran titre sans fenêtre ouverte**, rechargement automatique après sauvegarde ; **en pleine partie**, une barre discrète propose « Mettre à jour » — jamais de rechargement brutal.
5. La sauvegarde (`localStorage`) n'est **jamais** touchée par une mise à jour ; les caches (fichiers) et les données (progression) sont séparés. Les changements de format passent par les migrations de `src/save/schema.ts` (testées).

Limite réelle d'iOS : une appli fermée ou hors ligne ne peut pas se mettre à jour toute seule ; la mise à jour se fait **au prochain lancement avec du réseau**.
Vérifié par `npm run check:update` (installation v1 → progression → déploiement v2 → détection → activation → sauvegarde intacte → panne réseau → déploiements successifs).

## 3. Cloudflare Pages (recommandé) — création d'un projet NEUF

1. Dépôt dédié (§6) ou le dépôt actuel avec « Root directory » = `radia-src`.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → choisir le dépôt.
3. Build command : `npm run build` · Output directory : `dist` · Variable : `GIFT=radia` (et `NODE_VERSION=22`).
4. Le projet reçoit une adresse `https://<nom>.pages.dev` ; domaine personnalisé facultatif (Custom domains) — **sans toucher à `mdelarose.fr`**.
5. Un autre cadeau = un autre projet Pages (même moteur, `GIFT=emma`, autre adresse).

Alternative Vercel : importer le dépôt, « Root Directory » = `radia-src`, framework « Other » (`vercel.json` fourni). Déploiement manuel :
`npm run build && npx wrangler pages deploy dist --project-name=<nom>`.

## 4. Confidentialité : ce qu'un lien secret ne suffit pas à protéger

- Un lien non référencé n'est **pas** une protection. Pour un cadeau contenant des données sensibles :
  - **Cloudflare Access** (gratuit jusqu'à 50 utilisateurs) devant le projet Pages : code envoyé par e-mail au destinataire avant d'ouvrir le lien ; ou
  - mot de passe d'hébergeur (Vercel/Netlify Pro) ; et
  - photos chiffrées dans le build (`scripts/encrypt-photos.mjs`, clé dans le lien `#k=…`).
- Le **code source public** ne doit pas contenir les textes d'un vrai client : dépôt moteur public, contenu privé dans un dépôt privé fusionné à la build.

## 5. Dépôt public / privé (avant les premières ventes)

Moteur (code) : dépôt public possible. Par client : dépôt **privé** (`config/gifts/<id>.json`, textes, `private/`), compilé par un projet Pages dédié.
Les ventes (boutique, paiement) ne sont pas traitées ici.

## 6. Extraire RADIA du dépôt du site

```bash
git commit -am "…"                                  # l'extraction part de l'historique commité
bash radia-src/scripts/extract-standalone.sh ../radia-jeu   # nouveau dépôt local avec l'historique de radia-src/
cd ../radia-jeu && git remote add origin git@github.com:<toi>/radia.git && git push -u origin main
```
Ensuite, **seulement si tu le décides** : supprimer du dépôt du site `radia-src/`, `radia-52c8654e04/`, `radia/`, `_radia/`, `radia-admin.html`
(ces deux derniers = ancien jeu d'échecs chiffré et tableau d'administration) et rediriger l'ancien lien. Garde l'ancien lien actif
tant que Radia n'a pas migré : son installation actuelle est liée à `mdelarose.fr/radia-52c8654e04/` (un nouveau domaine = nouvelle
installation, **nouvelle sauvegarde** : prévoir le transfert, voir « Copier ma sauvegarde » dans les Paramètres).

## 7. Tests manuels restant à faire sur un vrai iPhone (non réalisables ici)

- [ ] Ouvrir le lien dans Safari ; le bouton « Installer mon petit monde ❤️ » affiche les 3 gestes.
- [ ] Partager → « Sur l'écran d'accueil » : icône et nom « RADIA » corrects.
- [ ] Lancement depuis l'icône : plein écran sans barres Safari, rien sous l'encoche / la barre d'accueil.
- [ ] Jouer, fermer complètement l'appli (balayage), rouvrir : progression et monnaies conservées, préférences audio conservées.
- [ ] Déployer une v2 ; rouvrir l'appli (avec réseau) : la v2 s'applique (écran titre) ou la barre « Mettre à jour » apparaît (en partie) ; sauvegarde intacte.
- [ ] Mode avion après une première visite : le jeu se lance.
- [ ] Musique : démarre au premier toucher, reprend après appel / verrouillage.
- [ ] Vibrations, glisser-déposer au doigt, pas de défilement de la page.
