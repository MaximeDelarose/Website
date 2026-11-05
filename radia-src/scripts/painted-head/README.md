# Calques « tête peinte » de Radia

Tirés des illustrations privées `char-radia` / `char-radia-nc` (même artiste qu'Auguste) pour poser la tête peinte sur le corps
dessiné, quelle que soit la tenue. Sorties : `headp-radia-nc` (tête + cheveux, crâne COMPLET avec dôme ajusté sur le vrai contour),
`facep-radia` (visage seul), `crownp-gold` (couronne dorée détourée, calque séparé).

1. Déchiffrer `public/assets/p/char-radia*.bin` en `char-radia.webp` / `char-radia-nc.webp` dans un dossier temporaire
   (AES-256-GCM : 12 octets d'IV + chiffré + étiquette de 16 octets ; clé = `PHOTO_KEY`, jamais dans le dépôt).
2. Dans ce dossier : `python3 build.py` (Pillow + numpy). Il affiche l'ellipse du crâne (sommet y = -6 px) et l'origine de la couronne.
3. Chiffrer les trois `.webp` obtenus en `public/assets/p/<nom>.bin` avec la MÊME clé.
   ⚠️ Ne pas lancer `scripts/encrypt-photos.mjs` sans `private/photo-key.txt` : il créerait une nouvelle clé.

Placement : `src/game/art/world/rig.ts` (gabarit) et `radiaNow.ts` (`HEAD_GEOM` : origine de chaque calque dans le repère de
l'illustration sans couronne). Si `PAD` change dans `build.py`, mettre à jour `HEAD_GEOM['headp-radia-nc'].y0` (= -PAD).
