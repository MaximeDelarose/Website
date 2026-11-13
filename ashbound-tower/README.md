# ASHBOUND TOWER — projet Unity (Étape 1 : prototype jouable)

Tower Defense temps réel + Action RPG, dark fantasy pixel art. Unity **2022.3 LTS**, C#, pipeline Built-in, PC Windows (clavier/souris).
Architecture pensée pour évoluer vers WebGL et la coopération (aucun multijoueur pour l'instant).

> ⚠ **Ce projet n'a pas pu être ouvert dans Unity pendant son développement** (aucun éditeur Unity dans l'environnement du développeur).
> Le code a été **compilé** contre les DLL Unity 2021.3 (UnityEngine.UI et UnityEditor via stubs) et la logique d'équilibrage a été simulée hors Unity.
> Voir `Docs/ETAPE_1_RAPPORT.md` pour le détail honnête de ce qui est vérifié ou non.

## Lancer le projet

1. Unity Hub → *Add project from disk* → dossier `ashbound-tower/` (Unity 2022.3 LTS ; une autre 2022.3.x convient).
2. Au premier import, un outil d'éditeur **génère automatiquement** les données et la scène `Assets/_Project/Scenes/Arene_01.unity`
   (menu manuel : **Ashbound Tower ▸ Générer la scène de prototype**). Ouvrez la scène si elle ne s'ouvre pas seule.
3. **Lecture ▶**.

Si la console affiche une erreur au premier import, relancez le menu *Ashbound Tower ▸ Générer la scène de prototype* et envoyez-moi le message.

## Jouer (prototype)

| Action | Commande |
|---|---|
| Lancer la séquence | `Entrée` / `Espace` ou bouton |
| Construire un Orbe foudroyant | `1` ou bouton en bas, puis clic gauche sur une plaque runique |
| Sélectionner / améliorer | clic gauche sur une tourelle → fiche à droite |
| Annuler | clic droit / `Échap` |
| Pause | `P` / `Échap` |
| Recommencer | `R` |

But : survivre à **10 vagues (~5 min)** — miniboss en vague 5, boss en vague 10 — sans que la **stabilité du Cœur** tombe à 0.
Victoire provisoire : tous les ennemis de la séquence sont apparus et éliminés.

## Structure

```
Assets/_Project/
  Art/Ground, Art/Billboards     sprites pixel art (PNG générés)
  Resources/Ashbound/{UI,Fx,Audio}   sprites d'interface/FX et sons (WAV)
  Data/                          ScriptableObjects (ennemis, tourelles, séquence, équilibrage) + Arena01_layout.json
  Scenes/Arene_01.unity          (générée)
  Scripts/
    Data/      définitions configurables (EnemyDefinition, TowerDefinition, SequenceDefinition, GameBalance, HeroDefinition…)
    Core/      GameManager (états), Economy, HeartCore, AudioManager, Notifier
    World/     PathRoute, CameraRig, BillboardSprite, SpriteFrameAnimator
    Enemies/   Enemy, EnemyRegistry (ciblage), StatusReceiver (ralentissement/étourdissement)
    Waves/     WaveDirector
    Towers/    Tower, BuildSlot, BuildController
    Combat/    ZapVfx, FxPool, DamageInfo
    UI/        GameUI (HUD en français)
    Editor/    ArtImportPostprocessor, PrototypeSceneBuilder
Tools/art/     générateurs d'art/sons (Python) + preview.py      Tools/sim/  simulation d'équilibrage
Docs/          analyse des documents, hypothèses, rapport d'étape, aperçu
```

## Modifier le contenu sans toucher au code

Tout se règle dans `Assets/_Project/Data/*.asset` (inspecteur) : PV/vitesse/dégâts des ennemis, coûts et statistiques des tourelles et de leurs améliorations,
composition des 10 vagues et des apparitions régulières, or de départ, stabilité du Cœur. Les valeurs inventées sont marquées *provisoires*.
Le bouton *Réinitialiser les données par défaut* du menu Ashbound Tower restaure les valeurs d'origine.

## Régénérer les assets (Python 3 + Pillow + numpy)

```
python3 Tools/art/generate_all.py     # sol, sprites, UI, sons, layout JSON
python3 Tools/art/preview.py Docs/apercu_arene.png
python3 Tools/sim/balance_sim.py
```
Le chemin, les 12 plaques et le décor sont définis dans `Tools/art/layout.py` : le sol est peint **à partir du même tracé** que celui suivi par les ennemis.
Tous les assets sont **originaux et procéduraux** (aucun asset externe, aucune licence à vérifier). Ils sont des placeholders de qualité « prototype » à remplacer/raffiner (voir rapport).

## Git

Les fichiers `.meta` sont générés par Unity à la première ouverture : **commitez-les** ensuite.
