# Happy Daily

Cozy game 3D sur le quotidien (three.js + TypeScript). Sources ici, jeu publié dans `../happy-daily/` (`index.html` + `game.js` bundlé).

```
npm install
npm run build      # → ../happy-daily/game.js
npm test           # tests de la simulation (node --test)
npm run typecheck
```

- `src/sim.ts` : simulation pure (journée de 8 unités, actions, humeur à 5 paliers, nuit). Aucune dépendance au rendu.
- `src/world.ts` : appartement-diorama, lumière matin → nuit, objets qui vivent (tasse, vaisselle, lit, plante, linge).
- `src/character.ts` : personnage entièrement animé par code ; couleur, posture et rythme suivent l'état mental.
- `src/game.ts` : entrées, menus, scénarios d'action, coucher et réveil.
- `?fast=6` dans l'URL accélère le temps du jeu (réglage et tests).

- `src/people.ts` : les proches (Mamie Lou, Sam, Inès, Noé) : leurs humeurs, leurs messages en pictogrammes, réponses et appels.
- `src/phone.ts` : interface du téléphone (messages, appels, boutique).
- `src/places.ts` : décors des sorties (parc, café, restaurant, chez Mamie Lou, rendez-vous, vide-grenier).

Avancement : jalons A et B faits (boucle de journée, actions, état mental, animations, appartement vivant, cycle du jour ; téléphone et relations, visites, hall, événements, météo, sorties).
À venir : arc de l'année, lettre et introduction, mouton et bilans de cycle, rêves, sound design, UI finale, polish.
