#!/usr/bin/env bash
# Extrait RADIA du dépôt du site vers un NOUVEAU dépôt indépendant (avec l'historique du dossier radia-src/).
# Ne modifie ni le site ni ce dépôt : tout se passe dans un dossier neuf.
#   bash radia-src/scripts/extract-standalone.sh ../radia-jeu
set -euo pipefail
DEST="${1:?Usage : extract-standalone.sh <dossier-de-destination-inexistant>}"
[ -e "$DEST" ] && { echo "« $DEST » existe déjà : choisis un dossier neuf." >&2; exit 1; }
TOP="$(git rev-parse --show-toplevel)"
cd "$TOP"
TMP_BRANCH="radia-extract-$$"
git subtree split --prefix=radia-src -b "$TMP_BRANCH" >/dev/null
git init -q "$DEST"
git -C "$DEST" pull -q "$TOP" "$TMP_BRANCH"
git branch -q -D "$TMP_BRANCH"
git -C "$DEST" branch -M main
echo "✔ Nouveau dépôt prêt dans $DEST (branche main)."
echo "  Étapes suivantes : voir docs/DEPLOIEMENT.md (créer un dépôt GitHub vide, y pousser, relier Cloudflare Pages)."
