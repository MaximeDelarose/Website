# RADIA ♡ — Suivi des demandes (tout ce qui a été demandé, avec son état réel)

Règle : une fonctionnalité n'est « terminée » que si elle est **jouable ET testée** (Chromium émulé 393×852 / 393×660 ;
jamais de test sur un vrai iPhone dans cet environnement). Mettre ce fichier à jour à chaque étape.

Légende : ✅ terminé et testé · 🟡 partiel (précisé) · ⬜ pas commencé · ⚠️ à vérifier sur iPhone réel

## PRIORITÉ 1 — Stabilité

| Demande | État | Détail / vérification |
|---|---|---|
| Version installée sur l'écran d'accueil figée sur une ancienne version | ✅ | Cause : une PWA iPhone reste suspendue en mémoire (rouvrir l'icône ne recharge rien) + anciens fichiers supprimés à chaque déploiement + page d'accueil servie depuis le cache HTTP (10 min). Correctif : `version.json` lu sans cache à chaque retour au premier plan / réseau / 10 min, mise à jour automatique sur l'écran titre, barre « Mettre à jour » ailleurs, jamais de rechargement brutal. `scripts/update-e2e.mjs` 21/21 (3 déploiements successifs, hors ligne, échec 500, cache max-age 600). ⚠️ iPhone réel |
| Mélange de versions (anciens JS + nouveaux fichiers) | ✅ | Les 4 dernières builds gardent leurs fichiers à empreinte sur le serveur (`vite.config.ts`, `builds.json`) ; précache du service worker = uniquement la build courante, requêtes `cache: 'reload'` ; navigation `no-store`. |
| Afficher la version installée + « Vérifier » | ✅ | Paramètres → Version (identifiant réel = date + commit). |
| Sauvegardes : Safari et l'icône ont des stockages séparés | ✅ | Paramètres → « Copier ma sauvegarde » / « Importer une sauvegarde » (inclut la clé des photos ; l'ancienne partie est gardée dans `radia-save-before-import`). `scripts/transfer-e2e.mjs` 11/11. **Cause des « mauvais personnages » dans l'icône : la clé des photos n'est que dans le stockage de Safari.** |
| Bande sombre en bas de l'application installée | 🟡 | `#app` ne dépend plus de `100dvh` en mode installé. ⚠️ à vérifier sur iPhone réel |
| Blocage tactile du plateau (Endless) | ✅ | Cause : geste jamais terminé après un `touchcancel` / relâchement perdu. 3 garde-fous (`MergeScene.ts`, `pointerFsm.ts`). `scripts/board-gestures-e2e.mjs` 31/31. |
| Blocage tactile du plateau (Chapitres) | ✅ | Même scène de jeu ; `scripts/chapters-gestures-e2e.mjs` 21/21 (tutoriel, générateur, fusions, toucher annulé, retour menu). ⚠️ à confirmer sur iPhone réel |
| Pièces vides / plantage d'une pièce du château | ✅ | Écran d'erreur « Réessayer / Retour à MON MONDE » ; `scripts/stability-e2e.mjs` 20/20. |
| Journaux de diagnostic | 🟡 | `radia-errors` (8 dernières erreurs, localStorage) existe ; pas encore d'écran pour les lire. |
| Ancienne version déjà installée sur l'iPhone | ⚠️ | Elle ne contient pas le nouveau système : **fermer complètement l'application (la faire glisser hors du sélecteur) puis la rouvrir une fois** ; ensuite les mises à jour sont automatiques. |

## PRIORITÉ 2 — Notifications et interface

| Demande | État | Détail |
|---|---|---|
| Gestionnaire centralisé de notifications / modales / dialogues (file d'attente, priorités) | ⬜ | Pas de gestionnaire unique. Existe seulement : couche récompense unique (`src/ui/rewards`, z-index 5000), voie de notices unique sous le plateau Endless, réactions d'Auguste limitées. |
| Aucune superposition | 🟡 | Corrigée dans Endless (Auguste, pastilles, combos) et récompenses ; les autres écrans gardent chacun leur logique. |
| Combos / bonus discrets, plus de bandeau permanent, Auguste rare | ✅ | Livré (voir SUIVI.md). |
| Réglage « notifications par application » | ⬜ | |

## PRIORITÉ 3 — PIMBÊCHE et clients (⬜ RIEN n'est commencé — demande à conserver impérativement)

À développer **dans cet ordre**, une étape = un commit testé :

1. ⬜ Portraits (≈ 20 clients, hijabs variés, aucun âge / origine affichés), prénoms, personnalités, goûts — `src/data/customers.ts` (identifiant unique par client).
2. ⬜ Cartes de commande Facile / Moyenne / Difficile : petit portrait rond à côté du prénom, sans agrandir les cartes ni réduire le plateau ; dialogue complet uniquement au toucher du client.
3. ⬜ Remerciements (bulle discrète 2–3 s, portrait qui s'agrandit brièvement, plusieurs variantes par client, via le système de notices).
4. ⬜ Fidélité 5 niveaux, dialogues débloqués, souvenirs, section « Mes clients ».
5. ⬜ Chaîne de fusion « savons » (8 niveaux : base → coffret Pimbêche de luxe), 7 parfums, générateur « Atelier Pimbêche », déblocage progressif.
6. ⬜ Savons dans les commandes (jamais d'objet impossible à fabriquer), récompenses équilibrées.
7. ⬜ Atelier « Ma savonnerie ♡ » dans MON MONDE : mini-jeu (base, parfum, couleur, moule, décor, emballage) + inventaire sans doublon avec la fusion.
8. ⬜ Boutique PIMBÊCHE (améliorations visibles), réputation 5 niveaux, partenariats (Lina…), événements commerciaux.
9. ⬜ Liens carrière (séances photo, Clips), sauvegarde de tout, tests.

Contraintes : ne jamais afficher âge / origine ; ne pas associer personnalité ou langage au hijab ; pas de marque réelle ; interface légère (rien de permanent en plus sur le plateau Endless).

## PRIORITÉ 4 — Téléphone virtuel

| Demande | État | Détail |
|---|---|---|
| Renommer : Snap/Snapchat → **Snapchien**, RADIA Clips/TikTok → **TikTak** (orthographe exacte) | ✅ | Icônes du téléphone, titres, toasts, boutons de partage, textes. Identifiants internes (`fun.apps.snap`, `fun.apps.clips`) inchangés : aucune donnée perdue. `apps-e2e` 41/41. Remarque : tes derniers messages écrivent aussi « Toktik / Tocktik » ; j'ai retenu **TikTak** (orthographe de ta consigne officielle). |
| Snapchien plus proche de Snapchat (fond sombre, accent jaune, anneaux de stories) | 🟡 | Habillage sombre + jaune fait. Liste de conversations, barre d'onglets, flammes : ⬜ (dépend des contacts Snapchien) |
| Tindeur : 24 profils jouables, 3 essais de désinstallation, conversations | ✅ | `scripts/tindeur-e2e.mjs` |
| Tindeur : les anciens matchs reviennent parler (plusieurs relances par personnage, mémoire des choix, pas de retour après suppression/blocage) | ⬜ | |
| Tindeur → Snapchien : « T'as Snapchien ? », choix Oui / On reste ici / Non, conséquences | ⬜ | |
| Snapchien : conversations, snaps, flammes (échange réciproque de snaps, jours consécutifs, sauvegardées, sans pression) | ⬜ | (RADIA Snap existant : stories / réactions / photos souvenirs — flammes absentes) |
| Radia envoie des snaps (avatar, tenue, château, chat, légende) et les garçons répondent | ⬜ | |
| TikTak : vidéos, likes, commentaires, publications | 🟡 | existant (ex-RADIA Clips) |
| TikTak → « Envoyer à… Auguste ♡ » + ≥ 25 réactions d'Auguste variées (sans « galbi » systématique) | ⬜ | |
| Auguste contact spécial dans Snapchien | ⬜ | |
| Identifiant unique par personnage entre Tindeur / Snapchien / TikTak | ⬜ | |
| Notifications regroupées, désactivables par application | ⬜ | dépend du gestionnaire (priorité 2) |

## Autres demandes en attente (à ne pas perdre)

- ⬜ Équilibrage Endless (grosses récompenses toutes les ~6,7 min pour une cible de 10–15 ; énergie des coffres).
- ⬜ Darija d'Auguste branchée dans les parties / le casino (`pickLine`, `pickReaction`).
- ⬜ `emitMoment` pour le casino et le collier.
- 🟡 Dressing : à 393×660 la 2ᵉ rangée n'est visible qu'en partie.
- ⬜ Écran de lecture des journaux d'erreurs.

## Vérifications automatiques disponibles (`radia-src/scripts/`)

`update-e2e` · `transfer-e2e` · `board-gestures-e2e` · `chapters-gestures-e2e` · `stability-e2e` · `board-e2e` · `endless-e2e` · `overlay-check` ·
`rewards-e2e` · `dressing-e2e` · `decor-e2e` · `casino-e2e` · `necklace-e2e` · `domain-e2e` · `career-e2e` · `tindeur-e2e` · `apps-e2e` · `world-e2e` · `chess-e2e`.
Tests unitaires : `npx vitest run` (≈ 1240).
