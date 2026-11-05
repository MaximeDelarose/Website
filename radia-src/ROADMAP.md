# RADIA ♡ — Suivi des demandes (tout ce qui a été demandé, avec son état réel)

Règle : une fonctionnalité n'est « terminée » que si elle est **jouable ET testée** (Chromium émulé 393×852 / 393×660 ;
jamais de test sur un vrai iPhone dans cet environnement). Mettre ce fichier à jour à chaque étape.

Légende : ✅ terminé et testé · 🟡 partiel (précisé) · ⬜ pas commencé · ⚠️ à vérifier sur iPhone réel

## ÉTAT DE REPRISE (mis à jour en fin de session « nuit »)
- Dernière version déployée : voir `radia-52c8654e04/version.json` (commit de code `82e4bd9`, nouveautés v7 incluses). Branches : `main` et `claude/radia-game` identiques.
- FAIT cette session : PWA validée · plateau tactile (pointeurs perdus + écran MON MONDE rétabli par une invitation) · fiches de ressources · téléphone (accueil, fonds, navigation 2 niveaux) · carrière/salaire · Messages (étape A) · nouveautés v6/v7 · Snapchien (Hugo contact de départ) · mises à jour automatiques.
- PROCHAINE ÉTAPE (dans l'ordre) : 6) dressing +30 articles · restaurants (5 types) · événements familiaux A/B/C · annuaire « Famille & proches » · organisation simulée des enfants · événements secondaires · PIMBÊCHE (atelier, boutique, réputation, partenariats) · Tindeur↔Snapchien (« T'as Snapchien ? ») · TikTak→Auguste (≥ 25 réactions) · casino/économie · notifications push quotidiennes (nécessite un envoi serveur).
- Messages — reste : vidéo TikTak en pièce jointe, médias dédiés, événements déclenchés par Maman/enfants.
- Rappels : jamais la clé des photos ni un prénom d'enfant dans le dépôt (grep avant chaque commit) ; `scripts/secret-refuse.mjs` exige `PHOTO_KEY` (non disponible ici) ; tests = Chromium émulé (jamais un vrai iPhone) ; ne pas modifier un test pour masquer un bug.

## SÉRIE « PERSONNALISATION · SNAPCHIEN · ÉNERGIE · NOTIFICATIONS » (dernière demande)
1. ✅ **Personnaliser Radia** — carte « Personnaliser Radia » dans MON MONDE (écran `faceStudio.ts`) : 10 sections (Peau 9 teintes + réglages fins teinte/luminosité/saturation/chaleur · Visage 7 formes · Yeux 5 formes + taille/écartement/iris + 8 couleurs · Sourcils 5 formes + épaisseur/courbure/couleur · Nez 4 formes + taille/largeur/longueur · Bouche 6 formes + volume/largeur + rouge à lèvres · Cheveux 12 couleurs + coiffures possédées · Voile 4 styles (simple, long, élégant, foulard de soie) + 10 couleurs · Maquillage eye-liner, fard, blush, mascara, style doux↔marqué · Mes visages = 6 emplacements). Aperçu en direct (visage / corps entier), Annuler (confirmation), Origine, Appliquer ; sauvegardé dans `world.wardrobe.face` / `faces`. Dessin : `characters.ts` (peau variable `SK`, `setFaceCustom`), modèle pur `data/world/face.ts`. **Sans réglage, le rendu est identique pixel pour pixel à l'ancien** (`scripts/face-diff.mjs`). Tests : `face-custom` 6, `face-studio-e2e` 49/49, dressing 151/151. ⬜ RESTE : nouvelles COIFFURES dessinées (il n'y a toujours que les 12 existantes, achetables au dressing), voile affiché dans les portraits photo (les vraies photos chiffrées ne changent pas), hijab « long » dans toutes les scènes en pied non vérifié visuellement partout.
2. ✅ **Snapchien** — icône jaune + mascotte « chien-fantôme » blanche (`apps/icons.ts`) ; 5 onglets Chats / Snaps / Amis / Stories / Souvenirs avec pastilles ; Snaps = échanges de snaps (non ouverts d'abord) ; Amis = amis, flammes, suggestions à ajouter ; Stories = stories d'amis du jour (déterministes, vues mémorisées) + mes stories + moments ; Souvenirs = album. Tests : `snap-chat` 32, `snap-tabs-e2e` 37/37.
3. ✅ **Énergie** — plafond ABSOLU de 100 (`addEnergy` renvoie le gain réel) ; ancien surplus (ex. 644) converti en **réserve** (`economy.reserve`, utilisée seulement à 0) : aucune sauvegarde ne perd rien ; recharge offerte 38→30 et non consommée si c'est plein ; achats « remplir à 100 » refusés sans dépenser quand c'est plein. Tests : `economy` 17, `energy-cap-e2e` 11/11.
4. ✅/⚠️ **Vraies notifications iPhone** — côté application + serveur FAITS et déployés : service worker (push, clic, cache des pensées), `core/push.ts`, Réglages « Petite pensée du jour ♡ » (consentement après un toucher, « Activées » seulement si le serveur a confirmé, désactiver, tester maintenant), carte + « Petites pensées ♡ ». Serveur (projet Supabase du site) : tables verrouillées, fonction Edge `radia-push` (chiffrement RFC 8291/VAPID testé par aller-retour), `pg_cron` horaire, 56 messages, 1/jour/appareil, 9 h locale, jamais la nuit. Tests : `push-webpush` 9, `push-logic` 12, `push-e2e` 25/25 (API simulées). ⚠️ À VÉRIFIER SUR L'IPHONE RÉEL : app installée sur l'écran d'accueil (iOS ≥ 16.4) → Réglages → Activer → autoriser → « Tester maintenant » : la notification doit arriver en quelques secondes. Non vérifiable ici : la réception réelle par Apple.

## ORDRE DE TRAVAIL AUTONOME (consigne « nuit », à suivre dans cet ordre)
1. ✅ **Plateau de fusion : cases inertes intermittentes** — CAUSE : le pool de 2 pointeurs tactiles de Phaser s'épuise quand des relâchements de doigt sont perdus (iOS : bord, centre de contrôle, bandeau) → la grille (canvas) ne reçoit plus rien, les boutons HTML oui. Correctif : `src/game/pointerHygiene.ts` (les doigts réels d'`event.touches` font foi, libération des pointeurs périmés, nettoyage au changement de plan) + Paramètres → « Diagnostic tactile » / « Débloquer le plateau ». Tests : `board-hit-audit` 31/31 (le scénario « relâchements perdus » échouait avant), `board-gestures-e2e` 31/31, `chapters-gestures-e2e` 21/21, 1341 unitaires. ⚠️ à confirmer sur iPhone réel.
2. ✅ **Fiches de ressources (appui long ≈ 500 ms)** : composant unique `src/ui/components/resourceInfo.ts` + données `src/data/resourceInfo.ts` (méthodes d'obtention vérifiées dans le code ; tickets = Casino Royal gratuits ; diamants = boutique fictive). Branché sur : barre de jeu (énergie, cœurs, diamants, pièces), écran titre, MON MONDE (matières + diamants), casino (tickets) ; Paramètres → « Ressources » (accès sans appui long). Fenêtre « Petites améliorations » une fois (v6). `resource-info-e2e` 61/61, `resource-info.test` 3. ⚠️ Constat : les « tickets » de loot de l'Endless (`endless2.tickets`) s'accumulent mais ne servent encore à rien (à brancher plus tard, non annoncés aux joueuses).
3. ✅ **Téléphone virtuel : écran d'accueil + navigation à deux niveaux** — le téléphone s'ouvre sur un VRAI écran d'accueil (`phoneHome.ts`) : fond d'écran dessiné (5 thèmes, `phoneWallpapers.ts`, choix dans Réglages, sauvegardé dans `fun.phone.wallpaper`), heure + date, icônes (Souvenirs, Agenda, Historique, Réglages + Tindeur), dock (Messages, Tindeur, Snapchien, TikTak), pastilles non lues, bouton ✕ « Quitter le téléphone » + balayage vers le haut. Les applications s'ouvrent PAR-DESSUS le téléphone (animation depuis l'icône) : fermer Snapchien/TikTak/Tindeur ramène à l'accueil ; seul ✕ ramène au jeu, exactement où elle était (plateau Endless identique). Messages = conversations du jeu seulement (plus de Tindeur/Snapchien mélangés). `scripts/phone-nav-e2e.mjs` 47/47 ; anciens parcours adaptés (apps-e2e, clips-comments, snap-chat, tindeur, overlay-check : sélecteurs `.phh-*`). ⬜ restant : fond « photo souvenir de Radia et Auguste », icônes Famille & proches (app inexistante), réorganisation des icônes, notifications par application via le gestionnaire central (existe pour Snapchien).
4. ✅ **Carrière visible dans MON MONDE + salaire** — carte « Ma carrière » remontée juste après le dressing (même ligne, visible sans défiler sur 852) ; badge doré « 🪙 Salaire prêt ! » (reflet discret, sans « Nouveau ») ; écran Carrière : bandeau en haut « Ton salaire est prêt ♡ / Tu as gagné N pièces grâce à ton travail ! » + grand bouton « Récupérer mes N pièces » (N = montant réel `salaryAmount`) ; pièces qui s'envolent, pop, retour haptique, Auguste « Bsahték, tu l'as mérité ! », badge et bandeau retirés immédiatement, pas de second versement (délai réel de 4 h). Pas prêt : « Prochain salaire dans 2 h 10 » (le salaire est lié au TEMPS, pas à une mission). `scripts/career-salary-e2e.mjs` 38/38 ; tests `world-hub-state` adaptés (badge `salary`, délai réel, montant réel). Le conseil d'accueil de la carrière ne masque plus le bandeau.
5. 🟡 **Application Messages façon iMessage** — FAIT (`src/apps/messages/` : `data.ts`, `engine.ts` pur, `runtime.ts`, `view.ts`, `format.ts`, `messages.css`) : liste (photo, nom, aperçu, heure, pastille bleue + compteur, flèche, recherche, bouton ✎ nouveau message, ‹ retour accueil téléphone), conversation (bulles bleues envoyées / grises reçues, séparateurs d'heure, « … », « Distribué » puis « Lu hh:mm » **simulés** — jamais « Lu » sans lecture simulée —, réactions ❤️😂👍😮😢❓ en appui long avec effet « pop », réactions des personnages, infos + coupure des notifications, saisie + clavier iOS, pièce jointe = souvenirs du jeu), 6 contacts (Auguste ≥ 42 messages banals/drôles/tendres, galbi ≤ 1 ; Maman ; 3 enfants dont la plus jeune par petits vocaux fictifs « avec l'aide d'un adulte » ; Studio Lumière), messages spontanés en temps de jeu ACTIF (≤ 2 non lus par contact, ≤ 4 au total), réponses planifiées même si l'application est quittée, notifications via le gestionnaire central + pastille sur l'icône. Anciens messages d'événements, invitations, message vocal et dessin conservés dans les conversations. Sauvegarde `fun.apps.messages`. Tests : `messages-engine` 19, `messages-format` 4, `scripts/messages-e2e.mjs` 51/51. ⬜ RESTE : envoi d'une vidéo TikTak, photo du chat/château/cadeau comme pièces jointes dédiées, événements déclenchés par les messages de Maman/enfants (visite, aéroport, sortie, anniversaire, chercher les enfants), contacts supplémentaires (tante, sœur, amie de confiance : annuaire « Famille & proches »), `secret-refuse` nécessite la clé des photos (non disponible ici).
6. ⬜ Puis la série existante : dressing +30, restaurants, événements familiaux, annuaire « Famille & proches », organisation simulée des enfants, événements secondaires, PIMBÊCHE (atelier, boutique, réputation), Tindeur↔Snapchien, TikTak→Auguste, Casino/économie, notifications push quotidiennes.
Rappel confidentialité : aucun prénom d'enfant ni la clé des photos dans le dépôt (libellés neutres).

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

### Diagnostic « application installée ≠ Safari » (étape 3 — ✅ VALIDÉE sur iPhone réel par la joueuse : bons personnages et dernières modifications en mode application installée. Cause : mémoire séparée Safari/app → clé des photos absente ; correctif : rappel « Reprendre les photos » + mise à jour automatique)

**Constat** (code + captures de l'app installée) : ce n'est PAS une ancienne version du code. L'app « Ouvrir comme app web » a son **propre stockage** (iOS le sépare de Safari) :
partie neuve (150 ⚡ / 70 💎 / tutoriel du chapitre 1) et **aucune clé de photos** → personnages dessinés, fonctionnalités de départ.
Le raccourci « Ouvrir comme app web » désactivé ouvre Safari, donc la mémoire de Safari (partie avancée + clé) → « la bonne version ».
Vérifié : `manifest.webmanifest` (`start_url`/`scope` relatifs → `radia-52c8654e04/`, + `id` stable), aucun code propre au mode standalone, l'ancien dossier `radia/` est une autre application (échecs ♛), service worker identique depuis le début (réseau d'abord pour la page).

**Corrigé** : Paramètres → **Diagnostic** (build, déploiement publié, mise à jour, adresse sans `#`, mode Safari/app, service worker, cache, « partie existante / NEUVE », « photos présentes / ABSENTES », bouton Copier) ;
au 1ᵉʳ lancement de l'app avec une mémoire vide : explication + « Importer ma partie » (avec « Coller depuis le presse-papiers »).
Tests : `scripts/standalone-e2e.mjs` 12/12 (même build dans les deux modes, partie et clé reprises, cœurs/pièces identiques), `tests/diagnostics.test.ts`.
**Non testé** : vrai iPhone / WebKit (non installé ici).

**Vérifier sur iPhone** : (1) Safari → Paramètres → Diagnostic → noter « Build » ; (2) Paramètres → « Copier ma sauvegarde » ; (3) ouvrir l'icône (app web) → « Importer ma partie » → « Coller » ; (4) Paramètres → Diagnostic dans l'app : « Build » identique, « Mode : APPLICATION INSTALLÉE », partie existante, photos présentes.

## NOTIFICATIONS PUSH QUOTIDIENNES « Une petite pensée par jour » (⬜ À FAIRE APRÈS validation de la PWA sur iPhone)
- Une seule notification Web Push par jour (Europe/Paris), pas de nuit, activable/désactivable dans les réglages, **jamais sans consentement** (demande après un geste volontaire), « activées » affiché seulement quand l'abonnement est réellement enregistré.
- Bibliothèque ≥ 50 messages (douas, bonne journée, encouragements, tendresse, romantique, amusant, motivation douce), catégories alternées, pas de « galbi » partout, pas de promesse d'avenir ni de garantie divine. Les 14 exemples fournis sont repris.
- Toucher la notification : ouvre RADIA + petite carte ; section « Petites pensées ♡ » (historique, conservation).
- Fiabilité : permission, abonnement expiré/renouvelé, doublons, fuseau, désactivation, sauvegardes intactes.
- **Prérequis manquant à ce jour** : un envoi programmé côté serveur (le site est statique sur GitHub Pages : il faut un petit service d'envoi, p. ex. fonction planifiée Supabase + clés VAPID gardées côté serveur) et une vérification réelle sur l'iPhone installé (iOS ≥ 16.4, PWA sur l'écran d'accueil). Aucune simulation ne sera présentée comme une vraie notification.

- ✅ Mise à jour automatique : message « mise à jour en cours… » puis rechargement tout seul sur l'écran titre **et** au retour dans l'app après ≥ 30 s d'absence (jamais pendant une fenêtre/cadeau ouvert, jamais deux fois de suite) ; sinon barre « Mettre à jour ». Confirmation « RADIA est à jour ♡ » après. `update-e2e` 25/25 (Chromium émulé).

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


## PRIORITÉ 3 bis — Avancement PIMBÊCHE / clients (mis à jour)

| Étape | État | Détail |
|---|---|---|
| Catalogue de 20 clients (prénoms, personnalités, goûts, demandes, remerciements, histoires), sans âge ni origine | ✅ | `src/data/customers.ts`, `tests/customers.test.ts` (9) |
| Portraits (Canvas 2D, 6 teintes, 10 coiffures, hijabs de 6 couleurs, accessoires) | ✅ | `src/game/art/customers.ts` — vérifiés visuellement |
| Client sur chaque commande (portrait + prénom dans l'en-tête, carte non agrandie), fiche au toucher, remerciement discret, fidélité 5 niveaux sauvegardée, histoire + récompense au changement de niveau | ✅ | `scripts/customers-e2e.mjs` 29/29, `tests/customers-logic.test.ts` (14) |
| Chaîne des savons (8 niveaux), générateur « Atelier Pimbêche », déblocage par la boutique de fleurs / palier, matériau fleurs | ✅ code + tests unitaires · 🟡 parcours navigateur à rejouer | `src/game/art/items4.ts`, `tests/endless-chains.test.ts` |
| Atelier « Ma savonnerie ♡ » (mini-jeu), boutique, réputation, partenariats (Lina), événements commerciaux, liens carrière | ⬜ | prochaines étapes de la priorité 3 |
| « Mes clients » (galerie, histoires, récompenses de relation) | ⬜ | |

## NOUVELLE SÉRIE DE DEMANDES — réseaux sociaux, dressing, restaurants, vie de famille (⬜ à développer dans cet ordre)

> Noms officiels (confirmés) : **TikTak** et **Snapchien**. Les demandes ci-dessous écrivent parfois « TOCKTIK » : lire TikTak.

1. ✅ **TikTak — commentaires variés** : compliments, questions, fans, drôles, critiques, désagréables, jaloux ; ≥ 40 commentaires adaptés aux publications ; personnages fictifs récurrents ; pas sous toutes les vidéos ; jalousie jamais présentée comme cause certaine.
2. ✅ **Réponses d'Auguste** (compte TikTak avec son avatar) : ≥ 40 réponses drôles / piquantes sans formule répétée ; likes fictifs progressifs animés (120 → 3 500 selon la popularité) ; fils de discussion cohérents (l'auteur peut réagir) ; Radia peut liker et répondre ; jamais d'attaque violente ni de harcèlement ; Auguste ne parle jamais à la place de Radia. — *Fait* : `src/apps/clips/threads.ts` (16 critiques × 3 réponses = 48, 6 discussions, 10 réactions), `tests/clips-threads.test.ts` (18), `scripts/clips-comments-e2e.mjs` 15/15.
3. ✅ **Snapchien — vie des garçons** : messages spontanés variés (≥ 10 personnages adultes fictifs, personnalité + historique), relances après plusieurs jours, **snaps rouges** (photo non ouverte avec indicateur rouge ; vidéo = autre indicateur), ouverture plein écran, réponses de Radia (choix multiples), statut « Ouvert », illustrations humoristiques non explicites (selfies torse nu : Dylan, Kevin, Nicolas, Maxime, Jordan, Thomas, Enzo), flammes inchangées (échange réciproque, jours consécutifs, sans notification insistante), sauvegarde des séries et contacts supprimés. → Fait : onglet « Chat » (liste, pastilles rouge/violet/bleu, 🔥), 10 garçons fictifs adultes, 4 au départ + arrivées spontanées, selfies illustrés non explicites, réponses à choix + réponses selon personnalité, flammes réciproques, contact supprimable / notifications coupables. 24 tests unitaires + `scripts/snap-chat-e2e.mjs` 21/21 (Chromium émulé).
4. ⬜ **Dressing : ≥ 30 nouveaux articles** (chic/luxe, casual, streetwear, tenues élégantes et couvrantes dont hijabs facultatifs, accessoires, coiffures) — essayables, achetables, sauvegardés, utilisables en événement ; tenue habituelle jamais modifiée ; bracelet romantique conservé ; galerie compacte multi-lignes avec avatar visible.
5. ⬜ **Restaurants** : 5 types fictifs (gastronomique, italien, algérien, japonais, brasserie parisienne), menus évolutifs (plats qui changent, suggestions du chef, desserts spéciaux, prix variables), jeu de devinette avec Auguste conservé et dialogues variés.
6. ⬜ **Événements de famille** : A — visite chez maman ; B — accompagner maman à l'aéroport (+ retrouvailles plus tard) ; C — Auguste invite Radia à sortir.
7. ⬜ **Répertoire « Famille & proches ♡ »** (maman, tante, sœur, amie de confiance fictives : portrait, prénom, disponibilité simulée, conversation).
8. ⬜ **Organisation des sorties / garde simulée** des trois enfants (jamais nommés dans le code ni dans ce fichier : étiquettes neutres, prénoms uniquement dans les données chiffrées) : choisir un proche, message, réponse, plan B (autre proche, autre date, sortie familiale, reporter), jamais de compte à rebours ni de culpabilisation, aucun vrai contact.
9. ⬜ **Événements secondaires** : shopping, parc avec les enfants, anniversaire surprise, spa, week-end romantique, visite chez maman, soirée cinéma ; invitations reportables ; jamais pendant une fusion ; via le gestionnaire de notices ; pas de surcharge de l'écran principal.
10. ⬜ **Tests** : réponses d'Auguste, likes, snaps rouges, réponses aux snaps, tenues, menus, événements familiaux, répertoire, garde simulée, sorties, sauvegardes, iPhone 16.

## PRIORITÉ 4 — Téléphone virtuel

| Demande | État | Détail |
|---|---|---|
| Renommer : Snap/Snapchat → **Snapchien**, RADIA Clips/TikTok → **TikTak** (orthographe exacte) | ✅ | Icônes du téléphone, titres, toasts, boutons de partage, textes. Identifiants internes (`fun.apps.snap`, `fun.apps.clips`) inchangés : aucune donnée perdue. `apps-e2e` 41/41. Remarque : tes derniers messages écrivent aussi « Toktik / Tocktik » ; j'ai retenu **TikTak** (orthographe de ta consigne officielle). |
| Snapchien plus proche de Snapchat (fond sombre, accent jaune, anneaux de stories) | ✅ | Habillage sombre + jaune fait. Liste de conversations, barre d'onglets, flammes : ⬜ (dépend des contacts Snapchien) |
| Tindeur : 24 profils jouables, 3 essais de désinstallation, conversations | ✅ | `scripts/tindeur-e2e.mjs` |
| Tindeur : les anciens matchs reviennent parler (plusieurs relances par personnage, mémoire des choix, pas de retour après suppression/blocage) | ⬜ | |
| Tindeur → Snapchien : « T'as Snapchien ? », choix Oui / On reste ici / Non, conséquences | ⬜ | |
| Snapchien : conversations, snaps, flammes (échange réciproque de snaps, jours consécutifs, sauvegardées, sans pression) | 🟡 | (RADIA Snap existant : stories / réactions / photos souvenirs — flammes absentes) |
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
