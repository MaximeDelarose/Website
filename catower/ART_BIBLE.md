# CATOWER — mini-bible graphique (v0.1)

Référence principale : les planches « Animations des Héros » et la capture de jeu pixel art fournies par l'équipe, plus le document « Art » (caméra, lisibilité, UI sobre).

## 1. Ce que dit la référence
- **Format** : pixel art 2D, vue du dessus inclinée (3/4), caméra fixe en rotation et en zoom, qui suit le héros.
- **Chats** : tête très grosse, petit corps, grandes oreilles triangulaires, gros yeux (souvent en **spirale**), joues roses, contour fin **doré/crème** légèrement irrégulier, particules magiques (étoiles, lueurs).
- **Héros** : Églantyne (verts, dorés, crème), Noctis (noir, violet, lavande), Phelto (crème, rose, bleu, doré).
- **Ennemis** (doc « Art ») : pelotes de laine vivantes corrompues, formes très simples, plaisir de les voir disparaître en chaîne. Sombres, yeux rouges, lisibilité du danger avant tout.
- **Monde** : forêt de conte sombre, sol vert-bleu profond, chemin brun bien visible, ruines et décors bas, petites lumières. Peu de décor, pas de bâtiments qui cachent l'action.
- **UI** : sombre, sobre, contrastée. Cadres arrondis, filet doré, très peu d'ornements. La lisibilité et le confort tactile passent avant la décoration.

## 2. Règles communes à tous les assets
| Élément | Règle |
|---|---|
| Palette | Fond nuit `#09130F` / `#16372F`, chemin `#5B4730`, or `#E8C65A` (contours et UI), danger `#FF4D6D` (yeux, barres de vie ennemies), croquettes or, XP violet |
| Contours | 1 pixel d'art, or/crème pour tout ce qui est allié, rouge sombre pour les ennemis |
| Résolution d'art | 1 pixel d'art = 3 px écran sur PC, 2 px sur téléphone (le monde est rendu en basse résolution puis agrandi sans lissage) |
| Proportions chat | tête ≈ 1,3 × la largeur du corps, hauteur totale ≈ 2 unités, yeux 1/4 de la tête |
| Animations | rebond léger (marche), respiration (attente), squash à l'attaque, flash rouge aux dégâts |
| Lisibilité | silhouette reconnaissable à 24 px de haut ; couleur dominante unique par personnage |

## 3. Ennemis (lisibilité du danger)
| Rôle | Forme | Détail distinctif |
|---|---|---|
| Normal | Pelote corrompue (boule violette) | yeux rouges, fil qui traîne |
| Rapide | Fil filant (petite boule bleu-vert) | traînée de lignes de vitesse, vole : ne peut pas être bloqué |
| Résistant | Pelote cuirassée (grande, grise) | plaques et aiguilles dorées |
| Mini-boss | Pelote-Ciseaux | couronne dorée, ciseaux, barre de vie + nom |
| Boss | Mère des nœuds | énorme, un œil, tentacules de fil, aura rouge |

## 4. Tourelles (3 familles, 9 tourelles)
Églantyne : Ronce, Arbre vaudou, Arbre monde. Noctis : Totem lunaire, Chat fantôme, Arbre des âmes. Phelto : Machine à cartes, Dé géant, Chat porte-bonheur.
Chaque amélioration ajoute des perles (rose = branche A, vert = branche B) autour du socle ; l'ultime T5 ajoute une couronne dorée.

## 5. Ce qui est fait dans le jeu actuel
Rendu pixelisé en direct (formes vectorielles dessinées en basse résolution), 3 héros, 9 tourelles, ennemis pelotes, carte forêt, interface sombre à filet doré.

## 6. Limites et spécifications pour un artiste
Les formes sont dessinées par code : elles imitent le style mais ne remplacent pas des sprites peints à la main. Pour la version finale (Unity/Steam) il faut produire :
- **Héros** : 8 directions, 12 à 16 images par action (attente, marche, course, attaque, 3 compétences, dégâts, mort, réapparition, victoire, défaite), 64×64 px par image, contour doré 1 px, palette limitée à 16 couleurs par héros.
- **Tourelles** : 3 niveaux visuels par tourelle plus 2 variantes de branche et un ultime, 64×64 px, animation de tir 6 à 8 images.
- **Ennemis** : 5 formes, roulement 8 images, attaque 6 images, mort 8 images (la pelote se défait).
- **Décor** : tuiles de sol 32×32 px, chemin à bords arrondis, 12 objets de décor bas, particules de lucioles.
- **UI** : cadres 9-slice à filet doré, 24 icônes de compétence 48×48 px, jeu d'icônes ressources.
