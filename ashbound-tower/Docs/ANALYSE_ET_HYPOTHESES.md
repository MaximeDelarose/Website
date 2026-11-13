# Ashbound Tower — Analyse des documents, conflits et hypothèses provisoires

## 1. Ce qui a réellement été lu

| Source | État | Remarque |
|---|---|---|
| **Google Doc** « Ashbound Tower défense » | **Lu intégralement** (texte) | Les images intégrées au Google Doc n'ont pas pu être consultées via le connecteur (texte seul). |
| **PDF** `ASHBOUND_TOWER_GDD_Claude_Solo_First.pdf` | **Fichier corrompu / tronqué** | Le fichier s'arrête au 34ᵉ objet sur ~73, sans table de références ni « trailer » : aucun lecteur PDF ne l'ouvre. Les pages de texte (objets 48-73) ne sont **pas dans le fichier**. Seules **4 illustrations** ont pu être extraites à la main (voir §2). |

➡ **Conséquence importante** : tout ce que le prompt attribue au PDF (organisation du développement solo, description détaillée de l'Épéiste, planches pages 26-27) n'a pu être pris que dans **votre message** et dans le Google Doc (qui décrit aussi l'Épéiste). **Merci de ré-exporter le PDF** (ou le joindre autrement) : je recouperai alors les règles et planches.

## 2. Illustrations récupérées dans le PDF et usage

| Image | Contenu | Usage dans le projet |
|---|---|---|
| Joker / boîte à ressort (Keroj) | Vrai pixel art sombre : beige/violet, cartes lumineuses | Référence de **palette héros** (gris-brun, violet, or terni, lueurs violettes) |
| Mage à horloge capuchonné (Xelor Tiac) | Vrai pixel art très sombre, or terni + cyan/violet | Référence d'**ambiance** : fonds quasi noirs, accents lumineux ponctuels |
| Planche « Pièges de ronce » (3 voies × 5 tiers) | Illustration **cartoon lisse** (contours épais, dégradés), pas du pixel art | Référence de **logique d'évolution** : la silhouette change à chaque tier, tier 5 = unique et le plus grand |
| Planche « Arbre à poupées » (3 voies × 5 tiers) | Idem, cartoon lisse | Idem + codes couleur par voie (vert ronces / orange feu / teal poison) |

⚠ **Conflit de DA détecté** : les planches d'évolution (probablement pages 26-27) sont en style *cartoon lisse*, alors que le texte demande du *pixel art* dark fantasy et que les portraits de héros sont du vrai pixel art. Choix retenu : **pixel art net** (cohérent avec le texte et les héros) en reprenant la **logique** des planches (silhouette qui évolue, tier 5 imposant).

## 3. Conflits et ambiguïtés → hypothèses provisoires

| # | Conflit / manque | Hypothèse provisoire retenue | Où c'est configurable |
|---|---|---|---|
| 1 | Doc : « vue du dessus » ; prompt : **caméra ¾** | **Caméra ¾** (pitch 55°), sprites billboards | `CameraRig` |
| 2 | Doc (Églantyne/Noctis) : attaque de base « **Maintenir Clic Droit** » ; prompt : ZQSD + souris | Étape 2 : ZQSD déplacement, visée souris. Bouton d'attaque **à trancher** (le clic droit sert actuellement à annuler la construction) | à décider à l'étape 2 |
| 3 | Tourelle universelle : « 3 améliorations, ordre au choix » ; Églantyne : « 5 tiers, tier 5 unique » ; Doc : « dernier upgrade de branche : 1 seule fois » | Modèle de données **3 voies × jusqu'à 5 tiers**, `lastTierUnique` ; prototype = 1 voie × 3 tiers (ordre imposé) | `TowerDefinition.branches` |
| 4 | 3ᵉ tourelle de l'Épéiste (« Tourelle ulti ») : **non définie** | Emplacement d'architecture `implemented = false`, coût 300 (« très chère »), **aucun comportement inventé** | `Tower_UltimeEpeiste.asset` |
| 5 | Relais électrique : seul « + vitesse d'attaque » et « transmet les buffs » | Défini en données, **non implémenté** (étape 3), coût 120 (« moyen chère ») | `Tower_RelaisElectrique.asset` |
| 6 | « Max 30-40 mobs » (Doc) vs « vague = burst massif » | **Aucun plafond** appliqué ; pic simulé ≈ 28 ennemis sans défense | `WaveDirector` |
| 7 | « ~30 tourelles T1, ~10 T2, 3 T3 au niveau max » vs **12 plaques** sur la carte | Le prototype n'a que 12 emplacements. Le plafond de constructions par tier (`maxBuilt`) existe en données, non lié aux niveaux. **Il faudra une carte plus grande ou un placement libre à l'étape 3/5** | `BuildSlot`, `TowerDefinition.maxBuilt` |
| 8 | Passif Épéiste : la décharge à 100 % est écrite dans l'ultime (Doc) mais classée passif (prompt) | Traité comme **passif** (prompt) | étape 2 |
| 9 | Distances du Doc en « m » (aura 6 m, détection 3 m) | **1 unité monde = 1 mètre** | — |
| 10 | Coût / vitesse / PV / dégâts : non définis | Valeurs **provisoires**, flaguées `provisional` dans les données ; vérifiées par simulation (§4) | `Assets/_Project/Data/*.asset` |
| 11 | Tailles : héros 128², tourelles 64² | Tourelle 64×80 (orbe flottant), ennemis 56-144 px selon le rang, héros non encore dessiné | `Tools/art/gen_sprites.py` |
| 12 | Éléments (Feu, Eau, Terre, Air, Lumière, Ténèbre), 3 par héros | Présents dans l'enum `Element` + `HeroDefinition` ; **aucune règle d'interaction** inventée. L'Orbe foudroyant est `Neutre` (la foudre n'est pas l'un des 6) | `GameEnums.cs` |
| 12b | Limites de construction par tier, niveaux de héros débloquant des tourelles | Champs `unlockLevel`, `maxBuilt` prévus, non utilisés (étape 5) | `TowerDefinition` |
| 13 | Victoire : « séquence terminée » (provisoire) | Victoire = tous les ennemis de la séquence apparus **et** éliminés | `WaveDirector` |

## 4. Équilibrage provisoire et vérification

Valeurs (Spectre 55 PV/2,3 u/s/4 dégâts/4 or ; Fureteur 30/4,2/3/3 ; Gardien 240/1,5/15/30 ; Broyeur 1000/1,2/35/90 ; Seigneur 3600/0,9/100/250 ; Orbe : 50 or, 8 dégâts, 1,6 tirs/s, portée 5,5 ; améliorations 60/110/180 or ; or de départ 150 ; Cœur 100).

`Tools/sim/balance_sim.py` (simulation Python qui **reproduit les règles** du C#, indépendante d'Unity) : sans défense → défaite en 75 s ; joueur « glouton » naïf → **victoire avec 68 % de stabilité**. Cette simulation a révélé un défaut réel (multi-éclairs inefficaces sur une cible unique), corrigé dans `Tower.cs`.
