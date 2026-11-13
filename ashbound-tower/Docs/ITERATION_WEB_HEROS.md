# Itération — Version navigateur : 4 héros, terrain « maquette », UI minimale, commandes Mobile Legends

## 1. Objectif
Héros jouables façon MOBA mobile (Noctis, Églantyne, Phelto, Épéiste), terrain proche de la maquette fournie, UI légère, contrôle tactile fluide.

## 2. Confirmé par les documents / images
- Noctis : Éclats convergents, Traversée Fantôme, Reflet Abyssal, Nuit Fractionnée, passif Résurrection spectrale (Google Doc) ; sprites **extraits de la planche fournie** (`Tools/art/extract_refs.py`).
- Églantyne : Graines de ronce, Calice de l'Effroi, Terrain Sacrificiel, Éclat de la Grande Serre, Essaim de poupées (Google Doc).
- Épéiste : combo, Frappe d'Attraction, Foudre Ancrée, Tempête de Foudre, charge électrique (Google Doc).
- UI : disposition de la maquette (vague/ennemis en haut à gauche, progression des 10 vagues au centre, ressources à droite, barre de tourelles avec verrous en bas, héros/compétences en bas à droite). Barres de vie : élites/boss permanentes ; autres au hit puis disparition, vert/jaune/rouge (fiche « États »).

## 3. Hypothèses temporaires
- **Phelto n'a AUCUN kit dans les documents** (seulement une image dans la maquette : guitariste aux cheveux roses, notes de musique roses). Kit **inventé** : notes perçantes, Accord de choc (cône, étourdit), Riff d'accélération (zone qui accélère les tourelles), Concert (ultime de zone). À remplacer par le vrai kit.
- Sprites d'Églantyne et de Phelto : dessinés par script (chibi), **pas** issus de vos illustrations (seul Noctis a une planche exploitable). À remplacer.
- Une famille de tourelles par héros (3 améliorations) : Orbe foudroyant, **Faille instable** (Noctis), **Piège de ronce** (Églantyne, posé sur une plaque, pas sur le chemin), **Amplificateur** (Phelto, aura de cadence). Le Relais électrique, l'Arbre à poupées, l'Arbre Monde, le Totem d'ombres… ne sont pas implémentés (barre : 2 verrous).
- Ressource unique « cristaux » (le 2ᵉ compteur vert de la maquette, probablement l'XP, n'est pas implémenté).
- Caméra 3/4 fixe (la maquette est quasi vue du dessus) ; pas de zoom.
- Héros invulnérables (pas de PV de héros).
- Ennemis : l'orbe sombre aux yeux violets reprend la fiche « États » ; les autres ennemis restent ceux du prototype.

## 4. Fichiers
`js/ashbound.js` (moteur, rendu, UI, entrées), `js/ashbound-heroes.js` (kits), `ashbound.html`, `ashbound/` (assets), `Tools/art/{gen_ground2,gen_sprites2,extract_refs,layout}.py`.

## 5. Implémenté
Sélection de héros ; déplacement temps réel (ZQSD/WASD/flèches + souris, ou joystick flottant) ; attaque auto-ciblée maintenue ; 3 compétences : tap = lancer vers l'ennemi le plus proche, **glisser-relâcher = viser** (indicateur ligne/cône/cercle) ; projectiles, zones, clones, ombres, poupées, effets de statut (étourdissement, ralentissement, poison, attraction) ; construction en un tap ; plein écran adaptatif sur mobile ; terrain, décor, Cœur rose.

## 6. Comment tester
Ouvrir `ashbound.html` (ou `?hero=noctis&speed=4` pour un héros direct / accéléré).

## 7. Résultats observés (réels)
- Chromium : sélection, 4 héros × (attaque + 3 compétences) sans erreur JS ; tactile simulé par CDP : joystick, glisser-viser S2 (cooldown déclenché, indicateur visible), tap rapide S1, attaque maintenue (projectiles) ; captures relues.
- Partie complète accélérée ×20 avec un bot (construit, améliore, patrouille et spamme les compétences) : **victoire pour les 4 héros** (Églantyne et Phelto perdaient avant que j'augmente les dégâts de leurs tourelles). Le bot est trop efficace : l'équilibrage reste à faire avec de vrais joueurs.
- **Non testé** : vrai téléphone (ressenti du joystick, taille des boutons, plein écran iOS), son sur mobile, performances sur appareil modeste.

## 8. Problèmes restants
Sprites Églantyne/Phelto basiques ; animations d'attaque absentes (une pose) ; pas de progression en run (XP, niveaux) ; équilibrage ; kit de Phelto ; le projet Unity n'a pas encore ces héros (seule la version navigateur les a).

## 9. Étape suivante proposée
XP/niveaux en run + 2ᵉ tourelle débloquée par niveau ; vraies illustrations d'Églantyne/Phelto ; équilibrage après tests sur téléphone.

---
## Itération suivante — alignement sur les captures + mode grand écran
- Composition : plaque de nom colorée + mini-barre de ressource au-dessus du héros ; portrait + rangée de 4 compétences en bas à droite (clavier/souris) ; barres de vie encadrées (vert/jaune/rouge) avec étincelle au coup ; « SPAWN » sous la flèche d'entrée ; Cœur avec libellé et barre.
- **Mode grand écran** (PC et mobile) : bouton dans le HUD, touche `G`, bouton de page, menu pause. API plein écran native si disponible, sinon plein cadre CSS (iOS). Le canvas s'adapte au ratio de l'écran (960 → 1700 de large logique) et la résolution interne suit l'écran (×1 ou ×2) pour des textes et traits nets.
- Tests : Chromium 1920×1080 (normal → grand écran → retour), mobile paysage 844×390 en grand écran ; aucune erreur JS. **Non testé** : plein écran natif sur vrai appareil, iOS.

---
## Itération — correction des boutons, DA des planches fournies, mode application
- **Bug des boutons (plein écran)** : le canvas est étiré dans son conteneur (`object-fit: contain`) mais la conversion des touches ne tenait compte ni des bandes noires, ni de la zone réellement affichée, ni de la largeur logique calculée avant le passage en plein écran → décalage vers la droite. Corrigé : conversion basée sur la zone réellement affichée, largeur logique calculée sur le conteneur, `ResizeObserver` + `visualViewport` + `orientationchange`, zones sûres (encoche) retirées de la zone de jeu, zone de toucher élargie, défilement/zoom bloqués pendant le jeu.
- **Mode application** : `ashbound.webmanifest` (plein écran, paysage, icônes), `?app=1` ou mode `standalone` détecté → plein cadre automatique.
- **DA** : sprites **extraits des planches fournies** (`Tools/art/extract_refs2.py`) pour Phelto et Églantyne (poses idle/marche/attaque/incantation, portraits, projectiles), tourelles des familles de ces planches (Piège de ronce, Totem mélodique), Totem d'ombre de Noctis, orbe sombre de la fiche d'états. Effets de déplacement : ronces qui jaillissent sous les pas d'Églantyne, arcs de foudre (Épéiste, plus nombreux avec la charge), volutes d'ombre (Noctis), notes (Phelto).
- **Pas de planche fournie** : Épéiste, Fureteur, Gardien, Broyeur, Seigneur de Cendre, Cœur, décor → toujours procéduraux, donc en dessous du niveau des planches. Une tentative de redessiner l'Épéiste en plus fin a été jugée insuffisante et abandonnée.
- Tests : 7 formats d'écran (PC 1920×1080, 2560×900, 1366×768, 4:3, mobiles 844×390 / 932×430 / 667×375), clic/toucher sur le **bord droit** de chaque bouton (attaque, 3 compétences) → 28/28 ; 4 héros × séquence complète accélérée sans erreur. **Non testé** : appareil réel, installation PWA, plein écran natif iOS.

---
## Itération — Épéiste électrique en pixel art simple (planche « Lame du Tonnerre »)
- Sprites **extraits de la planche fournie** (`Tools/art/extract_epeiste.py`) puis ramenés en pixel art simple : réduction, **palette commune de 30 couleurs**, alpha binaire, contour de 1 px. Poses : repos ×2, course ×2 (avec traînée de foudre), estoc, grand arc ; portraits ; **icônes officielles des compétences** (Frappe d'Attraction, Foudre Ancrée, Tempête de Foudre) sur les boutons.
- Le combo enchaîne les poses : estoc puis grand arc.
- **Conflit à trancher** : cette planche montre aussi une **Phelto « Chevalière de l'Aurore »** (armure, épée, compétences Estoc Foudroyant / Rempart d'Éclat / Lancée de Lame / Orage Céleste) alors que la planche précédente montrait **Phelto « Maîtresse des mélodies »** (guitariste/magicienne rose, notes de musique). Le jeu utilise encore la version mélodies. De même, les compétences d'Églantyne de cette planche (Piège de Ronce, Arbre à Poupées, Étreinte Végétale, Arbre Monde) diffèrent du Google Doc.
- Tests : Chromium, Épéiste (séquence complète accélérée sans erreur), 7 formats d'écran (boutons) toujours OK.

**Décision (auteur du projet)** : Phelto = version **« Maîtresse des mélodies »** (musique). La version « Chevalière de l'Aurore » de la planche « Lame du Tonnerre » n'est pas utilisée. Églantyne : kit du Google Doc conservé (décision sur les compétences de la planche toujours en attente).

---
## Itération — Coop en ligne à 2 joueurs
- **Architecture** : l'hôte exécute toute la simulation et envoie des instantanés (~12/s : héros, ennemis, tourelles, or, Cœur, vague). L'invité exécute le même moteur en *mode miroir* : il prédit les déplacements et rejoue les effets visuels (dégâts neutralisés) ; ses entrées (déplacement, visée, attaque maintenue, compétences, constructions, améliorations) partent vers l'hôte, qui les valide. Les actions de l'hôte sont rejouées chez l'invité par événements.
- **Transport** : Supabase Realtime en diffusion par salon (`ashbound-room-XXXX`), comme le Billard — aucune table, aucune modification serveur. Repli `BroadcastChannel` (même navigateur) avec `?net=bc`, utilisé pour les tests.
- **Règles de coop** (provisoires) : or et Cœur partagés ; chaque joueur construit la tourelle de son héros ; ennemis +50 % de PV ; l'invité ne peut pas relancer la partie (l'hôte seul) ; pas de pause (le bouton ouvre un menu, la partie continue) ; déconnexion détectée (hôte : 9 s sans entrée ; invité : 8 s sans instantané).
- **Invitation** : « Créer un salon » → code de 4 lettres ou lien `?room=CODE` (partage natif sur mobile). 
- **Test réel** (2 pages Chromium, repli local) : connexion, choix des héros, lancement, construction demandée par l'invité et exécutée par l'hôte (apparaît des deux côtés), déplacements et compétences, 9 ennemis / même or des deux côtés, départ de l'invité. **Non testé** : le transport Supabase réel (pas d'accès réseau dans l'environnement de développement), la latence réelle, deux appareils.
- **Limites** : les ombres spectrales de Noctis ne sont pas visibles chez l'invité (état non diffusé) ; les effets de zone de l'hôte sont rejoués d'après l'événement, donc de légères différences de timing sont possibles ; un seul invité ; pas de reconnexion en cours de partie.

---
## Itération — Points de vie, attaques ennemies, ranimation, XP et niveaux
- **PV des héros** (Noctis 90, Églantyne 100, Phelto 95, Épéiste 125, +12 % par niveau) : barre sur la plaque du héros, panneau niveau/PV/XP à gauche, chiffres de dégâts flottants, clignotement et invulnérabilité brève (0,35 s) après un coup, régénération lente hors combat.
- **Ennemis qui attaquent** (valeurs provisoires) : Spectre et Fureteur au corps à corps (5 et 4 dégâts), Gardien de cendre tire des projectiles (9), Broyeur frappe en zone (16), Seigneur de Cendre tire 3 projectiles en éventail (12). Les projectiles sont visibles et esquivables.
- **À terre / ranimation** : à 0 PV le héros tombe. **Coop** : son équipier le ranime en restant à moins de 1,9 u pendant 3 s (anneau de progression visible des deux côtés, retour à 50 % PV) ; sans ranimation, retour automatique au Cœur après 30 s (35 % PV) ; si les deux sont à terre, la partie est perdue. **Solo** : réapparition au Cœur après 8 s (60 % PV).
- **XP et niveaux** (partagés par l'équipe, 10 niveaux) : chaque ennemi vaincu donne de l'XP (4 / 25 / 80 / 200). Chaque niveau : PV max accrus + soin complet, +8 % de dégâts des héros ; les améliorations de tourelle exigent les niveaux 2, 3 et 5.
- **Coop** : PV, état « à terre », progression de ranimation, XP, niveau et projectiles ennemis sont diffusés dans les instantanés ; l'invité les voit en direct.
- Tests (Chromium) : solo — blessé, mort, réapparition, +400 XP → niveau 5 ; coop (2 pages) — équipier à terre vu des deux côtés, ranimé après 3,7 s, niveaux synchronisés, défaite quand les deux tombent ; séquences complètes accélérées sans erreur. **Non testé** : équilibrage réel de la difficulté (les ennemis blessent désormais les héros), appareils réels, Supabase réel.

## Mise à jour gameplay — étape A : XP, orbes, niveaux, améliorations

- Les ennemis lâchent des **orbes d'XP** (`G.orbs`), ramassées par proximité (aimant léger) ; synchronisées en coop (snapshot `O`).
- XP d'équipe `G.xp` / niveau `G.lvl` (max 10, seuils `xpCum`). Barre d'XP fine en bas d'écran + indicateur de niveau compact dans le cadre du héros.
- À chaque niveau : un choix d'amélioration de compétence parmi **3 cartes max** (touche 1–3 ou toucher), « Plus tard » pour différer ; mods par héros (`h.mod`, `h.picks`, `h.pend`) lus par les kits.
- Coop : choix de l'invité envoyés via `pick`, appliqués côté hôte et répliqués.
- Tests : bots complets (t7), positions des boutons (t9), synchro coop (t13), PV/réanimation (t15), choix d'amélioration solo + coop (t16) — sans erreur JS.
- Pas encore testé : appareils réels, réseau Supabase réel, équilibrage avec de vrais joueurs.

## Mise à jour gameplay — étape B : déblocage progressif des tourelles

- 3 familles par héros, sans mélange (`FAM`) : Noctis Totem d'ombre / Pylône d'arcs / Colosse d'ombre ; Églantyne Piège de ronce / Arbre à poupées / Arbre Monde ; Phelto Totem mélodique / Enceinte à feedback / Scène de concert ; Épéiste Orbe foudroyant / Bobine Tesla / Pylône de foudre.
- Paliers et limites **provisoires et configurables** dans `TIERCFG` (déblocage T1 niv.1, T2 niv.3, T3 niv.6 ; limite de tourelles par niveau d'équipe). Coûts par tourelle (50 / 110 / 200–220). Revente 60 % (`SELL_RATE`).
- Écart connu avec le GDD (~30 T1, ~10 T2, ~3 T3) : le terrain actuel n'a que 12 emplacements ; les caps sont donc plafonnés par ces emplacements.
- Menu de construction compact et rétractable (3 boutons, verrous, `n/limite`), annonce légère au déblocage (bandeau + pulsation du bouton), pastilles de rang sous les tourelles, bouton Vendre.
- Coop : l'hôte valide famille / niveau / limite / coût ; requêtes `build`, `up`, `sell` ; les tourelles vendues disparaissent aussi chez l'invité.
- Limites : les T2/T3 réutilisent les sprites T1 du héros (agrandis, sans art dédié) ; l'Arbre à poupées / l'Arbre Monde n'ont pas encore leurs mécaniques propres (étapes suivantes).

## Mise à jour gameplay — carte agrandie et caméra

- Arène 60×34 unités (~2,8× la surface), chemin de 159 unités à 24 points de contrôle (virages en S, boucles), 56 emplacements (≥ 43 requis : 30 T1 + 10 T2 + 3 T3), répartis puis regroupés en grappes près des virages ; tous à portée du chemin. Générés par `layout.py` (contrôles : distance mini entre portions du chemin, couverture), sol par `gen_ground2.py` (distance au chemin via EDT), nouveaux décors `gen_decor3.py` (buisson, fougère, tombe) + arbres, piliers, arche, ossements, cristaux.
- Limites de tourelles `TIERCFG` : 30 / 10 / 3 atteintes au niveau 10.
- Caméra : zoom de combat 1,5, suivi lissé du héros, bornée à la carte ; mode construction : zoom 0,72, retour automatique au zoom de combat. Emplacements libres (losanges pulsés) / occupés (point vert) ; aperçu de la portée (survol à la souris, 1er toucher au tactile, 2e toucher pour construire).
- Performances : sol dessiné par fenêtre visible, culling hors écran (décor, tours, ennemis, projectiles, orbes, barres), particules poolées et plafonnées, qualité adaptative (Q) selon le temps d'image.
- Tests : bots complets 4 héros gagnent (t7 adapté), parcours des ennemis jusqu'au Cœur sans défense, 43 constructions toutes à portée, 60 i/s en Chromium headless avec 43 tours, tactile mobile (2 touchers), coop, boutons sur 7 formats.
- Limites : pas testé sur vrais téléphones (perf réelle inconnue) ; l'équilibrage (chemin 2,5× plus long) reste à régler ; le Cœur peut passer sous les boutons de compétence sur téléphone.

## Mise à jour gameplay — étape 3 : Piège de ronce d'Églantyne (sur le chemin)

- T1 d'Églantyne = **Piège de ronce posé sur le chemin** (hors des emplacements, donc hors des 43 constructions). Mode construction : le chemin est surligné, aperçu du rayon, pose au clic (tactile : 1er toucher aperçu, 2e toucher poser). Règles : sur le chemin, espacement 2,4, pas près de l'entrée/du Cœur, limite par niveau (`TRAP.cap`, 4→20), coût 40.
- Comportement : persistant ; se déclenche quand un ennemi passe dessus (épines : dégâts de zone + ralentissement), puis recharge (3,5 s) ; 6 charges avant de se dessécher.
- Spécialisations (choix à 80 cristaux, niveau 2) : **Floraison solaire** (gros dégâts de zone), **Constricteur** (immobilise 1,4 s — réduit sur boss/minibosses — puis ralentit fort), **Éclat de spores** (poison + ralentissement de zone). Évolution courte (130, niveau 4) : dégâts, rayon et charges accrus. Vente 60 %.
- Réactivation : un piège desséché est rouvert par **sacrifice d'une poupée** d'Églantyne proche (crochet `wiltedTrap`/`reactivateTrap` utilisé par le kit) ou replanté pour 24 cristaux.
- Coop : requêtes `trap`, `tup`, `tsell`, `tres` validées par l'hôte ; l'instantané transporte les pièges (`R`) et un compteur de déclenchements pour rejouer le visuel chez l'invité.
- Arbre à poupées / Arbre Monde : toujours T2 / T3 en emplacements, stats génériques (mécaniques propres aux étapes suivantes).
- Limites : visuel du piège procédural (canvas), sans sprites dédiés ; équilibrage non testé en conditions réelles ; Églantyne n'a plus de tour T1 sur emplacement (conforme à ses 3 familles du GDD, mais à confirmer pour la cible « 30 T1 »).

## Mise à jour gameplay — étapes 4, 5, 6 : transition de monde, gélatines, difficulté 11–20

- **Transition** : à la fin des 10 vagues, au lieu de la victoire, la partie passe en préparation de la **séquence 2** (bandeau « LE MONDE S'ÉVEILLE », +120 cristaux, héros à terre relevés, Cœur NON soigné, constructions / pièges / niveaux conservés). La victoire n'arrive qu'après la vague 20. Coop synchronisée (`sq`, `ct` dans l'instantané).
- **Monde qui évolue** (rendu uniquement, arène inchangée) : teinte violette du sol, 170 champignons et cristaux lumineux révélés progressivement avec la vague, yeux qui clignent dans les bois, brume mouvante, vignette plus sombre, ambiance sonore ralentie. La corruption monte de 30 % à 100 % sur les vagues 11–20.
- **Ennemis gélatineux** (`ENEMY`, art procédural `gen_gel.py`, sons `splat/blop/boing/boom`) : gélatine verte ; blop violet (se divise en 2 petits blops) ; gelée bleue (résistance : coups réduits de 7 points, min. 30 %, tirs qui ralentissent le héros) ; gélatine explosive (explose, AoE sur ennemis et héros, **réaction en chaîne** entre explosifs) ; gélatine géante (miniboss, se divise en 3 blops + 3 gélatines) ; **Roi gélatineux** (boss, se divise en géante + 3 explosives + 3 blops). Squash & stretch au rendu, gouttelettes et flaques au sol (particules poolées, plafonnées, adaptées à la qualité).
- **Difficulté 11–20** (`WAVES2`, `SEQ2`, configurables) : groupes mixtes, +9 % de PV et +3 % de vitesse par vague, cuirasses, explosions en chaîne, géante en vague 15, doubles géantes en 19, Roi en 20.
- Tests : transition (état conservé), division / chaîne / résistance / boss (t26), coop sur transition + gélatines (t28), parties complètes 20 vagues avec bots des 4 héros (3 perdent à la vague 19-20, 1 gagne) — les bots n'ont pas la maîtrise d'un joueur.
- Limites : niveau max toujours 10 (aucune récompense d'XP supplémentaire en séquence 2) ; équilibrage non validé par de vrais joueurs ; art des gélatines procédural ; sons synthétiques.
