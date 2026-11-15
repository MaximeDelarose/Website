# Et toi ? — appli de rencontre pour parents solos

PWA React + TypeScript + Vite. Sources ici, build statique dans `../etoi/` (servi tel quel : GitHub Pages, Cloudflare Pages).

```
npm install && npm run dev      # développement
npm run build                   # compile vers ../etoi
NODE_PATH=$(npm root -g) node demo/record.cjs   # re-génère demo/etoi-demo.mp4
```

## État par phase

| Phase | État |
|---|---|
| 1. Design system (couleurs, Instrument Serif + Inter, boutons, puces, feuilles, halos) | **Terminé** (`src/styles.css`, `src/ui.tsx`) |
| 2. Prototype : accueil, onboarding 5 étapes, découverte, Ce soir, connexions, messagerie, Notre moment, profil | **Terminé en mode démo** |
| 3. UX : captures mobiles vérifiées | **Partiel** : iPhone 390×844 testé, tablette / petits écrans / VoiceOver à tester |
| 4. Backend (comptes, profils, intérêts, messages temps réel) | **À faire** : schéma proposé dans `supabase/schema.sql`, non appliqué |
| 5. Tests automatisés, sécurité | **À faire** |
| 6. Déploiement PWA | **Prêt côté front** (manifest, service worker, icônes) ; publication réelle à documenter |

## Réel vs simulé
- **Réel** : navigation, onboarding, validation majorité (≥ 18 ans), import de photo (redimensionnée localement), filtres de recherche, raisons de compatibilité *explicables* (critères remplis, aucun pourcentage), réciprocité, créneaux communs, blocage, réglages, suppression des données locales. État sauvegardé dans le `localStorage` de l'appareil.
- **Simulé** : les 8 profils (fictifs, étiquetés), les réponses des conversations, le signalement (non transmis), « Ce soir » (visible uniquement localement), notifications (permission navigateur seule).
- **Absent** : authentification, vérification de profil, modération de photos, envoi réel de messages, export des données.

## RGPD
L'interface ne suffit pas à la conformité : base légale, registre, mentions, DPA hébergeur, durées de conservation, modération, procédure d'exercice des droits sont à traiter avant publication.
