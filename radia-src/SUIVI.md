# RADIA ♡ — fichier de suivi

Jeu cadeau pour Radia : fusion « cozy » + histoire en 5 chapitres + échecs.
Source : `radia-src/` (TypeScript strict, Phaser 3.90, Vite 6, chess.js).
Version compilée : `radia-52c8654e04/` (site statique, servi tel quel par GitHub Pages → `https://mdelarose.fr/radia-52c8654e04/` une fois fusionné dans `main`).

## Commandes

```bash
cd radia-src
npm install
npm run dev        # http://localhost:5173 (ajouter ?debug pour window.RADIA)
npm test           # Vitest : règles, niveaux, sauvegarde, histoire, échecs, mini-jeux
npm run build      # vérifie les types puis écrit ../radia-52c8654e04 (+ service worker)
npx vite preview   # sert ../radia-52c8654e04 sur http://localhost:4173
```

## État — ce qui est terminé et vérifié

| Élément | État | Vérification |
|---|---|---|
| Fusion 6×6 (glisser-déposer, toucher-toucher, annulation hors plateau, anti double action) | ✅ | tests unitaires + Playwright (souris en mode mobile) |
| 43 objets (4 collections × 10 + 3 spéciaux), visuels distincts | ✅ | test d'unicité + captures |
| 30 niveaux (6 par chapitre), commandes, paquets cadeaux, combos, bonus | ✅ | bot : chaque niveau gagné avec 8 graines ; équilibrage `scripts/balance.ts` |
| Récupération en cas de blocage (Souffle magique gratuit) | ✅ | test unitaire |
| Game feel (anticipation, compression, flash, particules, rebond, score flottant, sons, secousse) | ✅ | revu en capture ; ressenti tactile à valider sur iPhone |
| 5 chapitres, 25 dialogues, choix « Nord de Paris bb », répliques contextuelles avec temps de recharge | ✅ | parcours automatique complet de l'histoire (74 étapes) |
| 8 souvenirs + album (souvenirs, collections, historique des dialogues) | ✅ | captures |
| 3 mini-jeux (puzzle Arc de Triomphe, billard des cœurs, chemin des deux cœurs) | ✅ | tests de solvabilité + réussite complète dans le navigateur |
| Échecs : règles complètes, IA dans un Web Worker (Facile / Normal / Difficile), annuler, partie reprise | ✅ | tests chess.js (roque, en passant, promotion, pat, nullités) + navigateur |
| 11 problèmes d'échecs + 11 puzzles Mode Reine (bouclier, portails, dalles) | ✅ | solveur BFS en test |
| Scène finale (Auguste, miroir « Oui ♡ », déclaration FR + arabe, retour au jeu, rejouable depuis l'album) | ✅ | parcours automatique + captures |
| Mode infini (défis renouvelables, record) après la fin | ✅ | logique testée ; écran vérifié |
| 17 succès à conditions mesurables | ✅ | test « aucun succès sur une sauvegarde neuve » |
| Sauvegarde auto versionnée, validée, copie de secours, migration, recalage de l'histoire | ✅ | tests + rechargement en plein niveau (plateau identique) |
| Musique (MP3 fourni), 35 % au départ, fondus, continuité, réglages, interruptions iOS | ✅ code | à écouter sur iPhone (pas de son dans le navigateur de test) |
| PWA : manifeste, icônes, service worker, jeu hors ligne après la 1ʳᵉ visite | ✅ | test hors ligne Playwright (Chromium) |
| Mobile : portrait, zones sûres, `dvh`, redimensionnement, message en paysage | ✅ | Chromium 393×852, 430×932, 852×393, 768×1024 |

## Mise à jour v2 — jeu de fusion façon mobile (inspiration Gossip Harbor, sans rien copier)

| Élément | État | Vérification |
|---|---|---|
| Générateurs posés sur le plateau (pot de fleurs, boîte aux lettres, appareil photo, coffret d'échecs), déplaçables, débloqués au fil des chapitres | ✅ | tests de règles + bot : 30 niveaux gagnables |
| Énergie : 1 ⚡ par toucher, +1 toutes les 30 s, recharge gratuite +50 toutes les 5 min, récompenses (commandes, combos, niveaux), achat en diamants | ✅ | tests unitaires + captures |
| Diamants : gagnés en jouant (niveaux, succès, mini-jeux, échecs, commandes) et offerts par « la carte d'Auguste » | ✅ | tests + parcours navigateur |
| Boutique « La carte d'Auguste ♡ » : carte cadeau fictive (aucun numéro), 5 packs aux prix fictifs, animation de paiement, éclats de diamants, 12 répliques d'Auguste sans répétition rapprochée | ✅ | captures de chaque étape |
| Dépenses en diamants : énergie, baguettes, souffles, objets rares (sac), coffre du royaume, agrandir le sac, accélérer une commande, apparence du plateau et des fusions | ✅ | tests + captures |
| Sac de rangement (glisser un objet sur le sac, le ressortir) | ✅ | test navigateur |
| Commandes passées par des personnages (Auguste, Minou, Rosie, Petit Pion) | ✅ | captures |
| « Notre petit monde » : 12 décorations achetées avec les cœurs (une en diamants), scène animée | ✅ | captures |
| Objets rares : 2,5 % de Coffret surprise à chaque toucher de générateur | ✅ | règles |
| Coffre gratuit toutes les 4 h | ✅ | — |
| Deux versions de la musique qui s'enchaînent | ✅ code | à écouter sur iPhone |
| Migration de sauvegarde v1 → v2 (+50 💎 offerts, écran « Nouveautés ») | ✅ | test de migration |

Aucun paiement réel, aucun service de paiement, aucune donnée bancaire : tout est local et gratuit.

## Décisions techniques

- **Rendu hybride** : Phaser (canvas WebGL) pour le plateau, les mini-jeux et la fin ; HTML/CSS pour les menus, dialogues et le HUD (texte net, accessible, plus léger). Toutes les scènes travaillent en pixels CSS, caméra zoomée de la densité d'écran (net sur Retina).
- **Illustrations vectorielles en Canvas 2D** (`src/game/art/`) : aucun fichier image lourd, rendu net à toute taille, personnages animables par paramètres (expressions, clignement, marche). Pas de génération d'images par IA.
- **Marque dans l'œil** : œil situé à gauche de l'image, bord de l'iris vers « 8 heures » (constante `EYE_MARK` dans `characters.ts`), anneau au nez sur la narine à droite de l'image (`NOSE_RING_SIDE`) — comme sur les photos fournies. Les portraits ne sont jamais retournés en miroir.
- **Règles séparées du rendu** : `src/game/merge/rules.ts`, `src/game/chess/rules.ts`, `src/game/chess/queen.ts`, `src/game/minigames/logic/*` sont sans DOM et testés.
- **Données modifiables sans toucher au moteur** : `src/data/` (objets, niveaux, dialogues, histoire, souvenirs, succès).
- **IA d'échecs** : moteur alpha-bêta déjà écrit pour le site (`js/chess-core.js`), copié dans `src/game/chess/engine/` (petite correction de détection du Worker pour Vite).
- **Musique** : un seul `<audio>` chargé en mémoire (blob) et branché sur Web Audio (sur iOS, `audio.volume` est ignoré) ; effets sonores synthétisés.
- **Étoiles** : 3 ★ si le panier est utilisé au plus `par` fois (par calé sur la simulation).
- **Histoire** : liste d'étapes (`src/data/story.ts`) ; la sauvegarde retient l'index ET l'identifiant de l'étape, pour qu'une mise à jour qui insère des étapes ne décale pas une partie en cours.

## Reste à faire / limites connues

- **Aucun test sur un vrai iPhone ni dans Safari/WebKit** (seul Chromium est disponible ici). Voir la liste de vérifications manuelles dans `README.md`.
- Les personnages sont dessinés de face : le souvenir « Arc de Triomphe » les montre côte à côte (pas dos à dos comme dans la trend).
- Pas d'images de démarrage iOS dédiées (`apple-touch-startup-image`) : l'écran de chargement HTML s'affiche à la place.
- P2 non commencé (volontairement) : échecs en ligne, coopératif à deux — il faudrait un serveur (Supabase est déjà utilisé ailleurs sur le site).
- Phaser pèse ~340 Ko compressé ; une build Phaser sur mesure pourrait réduire le premier chargement.

## v3 — « Mon domaine » (Décorer)
- Hub à 8 destinations : château (9 pièces, 36 meubles, couleurs), dressing (32 pièces, 5 coiffures, 3 looks), jardin, chocolaterie, famille (3 enfants fictives, 4 mini-jeux), chat, carrières (4 × 5 paliers), fans (6 paliers, 5 couvertures).
- Économie : la fusion rapporte pièces, fleurs, tissu, cacao. Sauvegarde v3 avec migration depuis v2.
- Vérifié : tsc propre, 295 tests Vitest, parcours Playwright (Chromium émulé 393×852) hub → 8 destinations → retour, sans erreur console.
- Non vérifié : vrai iPhone/Safari, difficulté des mini-jeux (testés par bot seulement), équilibrage de l'économie, musique/rythme à l'oreille.

## v4 — Invitations surprises
- Téléphone intégré (messages, invitations, souvenirs, historique) + notifications (rebond, son doux, « Voir l'invitation » / « Plus tard ») ; file d'attente, un seul message à la fois.
- Planificateur : temps de jeu ACTIF, tirage pondéré, max 2 grandes invitations / 30 min, écart minimal, pas de répétition immédiate, enveloppe dorée rare. Réglages dans `src/events/manager.ts` (EVENT_CONFIG). Notification uniquement à un moment sûr (pas en pleine fusion/animation, minijeu, cinématique, transaction).
- 24 événements : 11 sorties romantiques (restaurant « Devine ce que je prends ♡ », palace, feu d'artifice, spa, hôtel, cinéma, marché aux fleurs, chocolats, shopping, rooftop, bal), 5 activités familiales, 7 de carrière, 1 enveloppe dorée (shopping + restaurant + palace).
- 14 mini-jeux (src/events/activities), 15 décors, photos souvenirs (poses, cadres, filtres, export PNG, aucune caméra réelle).
- Reprise : l'activité interrompue est sauvegardée (étape + choix) ; le mode d'origine (fusion ou Mon monde) est mis en pause puis retrouvé à l'identique.
- Récompense versée UNE seule fois par partie (runId), rejeux réduits.
- Sauvegarde v4 (migration depuis v3).
- Vérifié : tsc, 378 tests, parcours automatisés (restaurant de bout en bout depuis l'accueil et en pleine fusion ; 24 événements déroulés avec mini-jeux sautés en mode test ; 14 mini-jeux montés ; téléphone). Non vérifié : vrai iPhone/Safari ; difficulté et équilibrage des mini-jeux (essais robotisés) ; illustration d'Auguste détourée dans les photos (testée sans la clé) ; mode « animations réduites ».
