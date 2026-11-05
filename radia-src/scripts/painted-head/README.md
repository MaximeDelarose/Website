# Couches « tête peinte » de Radia

Tirées des illustrations privées `char-radia` / `char-radia-nc` (même artiste qu'Auguste) pour poser la tête peinte
sur le corps dessiné, quelle que soit la tenue.

1. Déchiffrer `public/assets/p/char-radia*.bin` en `.webp` dans un dossier temporaire (clé = `PHOTO_KEY`, jamais dans le dépôt).
2. Dans ce dossier : `python3 mkhead.py char-radia-nc 0`, `python3 mkhead.py char-radia 49` (la couronne ajoute 49 px), `python3 mkface.py`.
3. Chiffrer `headp-radia.webp`, `headp-radia-nc.webp`, `facep-radia.webp` en `public/assets/p/<nom>.bin`
   (AES-256-GCM : 12 octets d'IV + chiffré + étiquette), avec la MÊME clé.
   ⚠️ Ne pas lancer `scripts/encrypt-photos.mjs` sans `private/photo-key.txt` : il créerait une nouvelle clé.

Placement dans le jeu : `src/game/art/world/avatar.ts` (`PH_*`, yeux peints alignés sur ceux du dessin, tête complète réduite de 12 %
autour du menton) ; choix de la couche : `src/game/world/paintedLook.ts` (`paintedHeadKind`).
