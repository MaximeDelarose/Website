# Rapport — Étape 1 : prototype fonctionnel

## Fichiers créés (tous nouveaux ; aucun projet Ashbound Tower n'existait)

- **Projet** : `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`, `.gitignore`, `README.md`
- **Scripts C#** (`Assets/_Project/Scripts/`, 30 fichiers) : voir `README.md` pour la répartition par système.
- **Art & sons** (générés) : sol 1152×640 de l'arène 01, 33 sprites (tourelle ×4 niveaux, 5 ennemis ×2 images, Cœur ×2, 10 types de décor, FX), 14 sprites d'UI, 13 sons WAV.
- **Outils** : `Tools/art/*.py` (génération + aperçu), `Tools/sim/balance_sim.py`.
- **Docs** : `ANALYSE_ET_HYPOTHESES.md`, `apercu_arene.png`, `test_layout.txt`, `test_equilibrage.txt`.

## Fonctionnalités censées être opérationnelles (code écrit, **non exécuté dans Unity**)

Arène avec chemin sinueux, portail d'apparition, Cœur à défendre, 12 emplacements ; ennemis qui suivent le chemin (5 types : standard, rapide, élite, miniboss, boss) avec barres de vie
(toujours visibles pour élite/boss, au premier coup pour les autres) ; séquence de 10 vagues + petits ennemis réguliers, miniboss (vague 5) et boss (vague 10) ; temps de préparation libre ;
construction à la souris (prévisualisation, rayon d'action, validité, paiement à la confirmation) ; Orbe foudroyant avec 3 améliorations (multi-éclairs, chaîne, surtension) qui changent le sprite ;
économie (or par kill, jamais négatif) ; HUD français ; pause / victoire / défaite / redémarrage ; retours visuels (flash, étincelles, éclairs, tremblement de caméra) et sonores.

Garde-fous codés : un ennemi mort ne peut plus être touché ni payer deux fois (`IsDead`) ; une chaîne ne touche jamais deux fois le même ennemi ; éclairs instantanés (aucun projectile persistant) ;
la portée est revérifiée à chaque salve (`EnemyRegistry.GetInRange`) ; `Economy.TrySpend` refuse tout achat impossible ; durée de vie maximale par ennemi (anti-blocage) ; statiques réinitialisés au rechargement.

## Tests réellement effectués

| Test | Résultat |
|---|---|
| Compilation des 30 scripts contre les **vraies DLL UnityEngine 2021.3** (API commune avec 2022.3) | ✅ 0 erreur. *UnityEngine.UI et UnityEditor : vérifiés contre des stubs que j'ai écrits* → la syntaxe et les types de mon code sont cohérents, mais l'exactitude de ces appels d'API n'est vérifiée que par ma connaissance de Unity |
| Invariants du layout (`test_layout.txt`) : chemin dans l'arène, plaques à 2,5-3,8 u du chemin et ≥ 4,2 u entre elles, décor hors chemin/plaques, 100 % du chemin à portée d'une plaque | ✅ |
| Simulation d'équilibrage hors Unity (`test_equilibrage.txt`) | ✅ sans défense : défaite 75 s ; joueur naïf : victoire à 68 % de stabilité. A permis de corriger un défaut de multi-éclairs |
| Contrôle visuel des sprites et d'un aperçu composé (`apercu_arene.png`) | ✅ après correction de l'occlusion du décor et des halos |
| **Exécution dans Unity, génération de scène, jouabilité, ressenti, performances** | ❌ **NON TESTÉ** (pas d'éditeur Unity ici) |

## Problèmes connus / risques non vérifiés

1. **Premier lancement** : l'outil d'éditeur n'a jamais tourné. Une erreur de génération est possible (réglages d'import, chemins) — il journalise `[Ashbound] …` dans la console.
2. L'aperçu `apercu_arene.png` est une **projection composée approximative**, pas une capture : l'échelle réelle des sprites à l'écran (caméra en perspective, 1 unité ≈ 53 px à 1080p) est à valider en jeu.
3. **Art = placeholders procéduraux** : silhouettes lisibles et évolutions distinctes, mais loin de la finesse des références (héros 128² des illustrations). À raffiner/remplacer (surtout ennemis, boss, Cœur). Aucune animation d'attaque ; marche = 2 images.
4. Police Unity par défaut (pas de police pixel/fantasy) ; l'interface est fonctionnelle mais encore sobre.
5. 12 plaques seulement, très loin des « ~30 tourelles T1 » du Google Doc (conflit n°7).
6. Pas de héros, pas d'XP, pas de Relais électrique (étapes suivantes). Pas de pooling des ennemis (instanciation directe, OK pour ≤ 40 ennemis).
7. **PDF corrompu** : recoupement avec le PDF impossible (voir `ANALYSE_ET_HYPOTHESES.md`).
8. Le dossier `ashbound-tower/` se trouve dans le dépôt du site web : s'il est publié par GitHub Pages, ses fichiers deviennent publics.

## Suite proposée

**Étape 2 — Héros** : Épéiste (ZQSD/WASD + visée souris, combo 3 coups, Frappe d'Attraction via `StatusReceiver`, puis Foudre Ancrée, passif, ultime). Trancher d'abord la commande d'attaque (conflit n°2).
