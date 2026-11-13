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
