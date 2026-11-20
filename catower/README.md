# CATOWER — prototype Unity (vertical slice v0.1)

Tower defense + action RPG. Mochi, un chat gardien, défend le Cœur contre des vagues d'ennemis.

> **État honnête :** ce code a été écrit sans éditeur Unity. Sa syntaxe a été vérifiée avec un analyseur C#,
> mais il n'a **jamais été compilé ni lancé**. Attends-toi à corriger quelques erreurs à la première ouverture
> (copie-les moi, je les corrige).

## Lancer

1. Unity Hub → *Add project from disk* → dossier `catower/` → Unity **2022.3 LTS** (éditeur 2022.3.x).
2. Menu **Catower → Créer la scène Main**, puis **Play**.
   (Sans cette étape, Play dans n'importe quelle scène vide lance aussi le jeu : `Bootstrap` se crée tout seul.)
3. Après la première ouverture, versionne aussi les fichiers `.meta` générés.

Tout est construit par code à partir de primitives (art provisoire), donc aucun asset à importer.
Pipeline Built-in, ancien Input Manager (réglages par défaut d'un projet 2022.3).

## Commandes

| Action | Entrée |
|---|---|
| Bouger / attaquer | Clic droit (sol ou ennemi) |
| Capacités | **Q** Pelote filée (niv. 1), **W** Bond (niv. 2), **E** Miaou-choc (niv. 3) |
| Construire | **1 / 2 / 3** puis clic gauche sur un emplacement rose (Maj : en enchaîner plusieurs) |
| Tourelle | Clic gauche pour la sélectionner, **A / B** pour améliorer, **V** pour vendre |
| Lancer les vagues | **Entrée** (aussi pour appeler la vague suivante plus tôt) |
| Recentrer caméra / pause | **Espace** / **P** |

## Règles implémentées

- Séquence de 10 vagues (mini-boss vague 5, boss vague 10), 3 séquences pour gagner, Cœur à 30 PV.
- Préparation illimitée entre séquences (Entrée pour continuer), +100 croquettes et +6 PV de Cœur.
- Croquettes : lâchées par les ennemis, à ramasser (aimant court, disparaissent après 12 s). XP : automatique.
- Tourelles : Canon à pelotes (60), Fontaine à lait (110), Pointeur laser (200).
  Deux branches de 5 paliers ; dès qu'une branche dépasse le palier 2, l'autre reste limitée au palier 2.
- Synergies : Pelote filée marque (+25 % des tourelles), Miaou-choc accélère les tourelles proches.

## Structure

```
Assets/_Catower/Scripts/
  Core/      Bootstrap, Game (boucle), Map, CameraRig, Fx/Sfx, Gfx (primitives + chat chibi)
  Data/      Database : EnemyDef, TowerDef + arbres d'amélioration, HeroDef + AbilityDef
  Heroes/    HeroController
  Towers/    Tower, Projectile, BuildSystem
  Enemies/   Enemy, EnemyView
  Economy/   Pickup (croquettes, XP)
  UI/        Hud (IMGUI provisoire)
  Editor/    Menu « Catower »
```

Ajouter un héros : un nouveau `HeroDef` (stats + `AbilityDef` avec leur `cast`) dans `Database`.
Ajouter une tourelle ou un ennemi : une entrée dans `Database.Towers` / `Database.Enemies`.

## Valeurs à équilibrer après test

Toutes les valeurs (PV, coûts, vitesses, `Game.WaveGap`, seuils d'XP) sont des propositions non testées.

## Pas encore fait

Multijoueur, plusieurs héros/cartes, vrais assets et animations, passage de l'IMGUI à UI Toolkit, ScriptableObjects,
nouveau Input System, tests automatisés.
