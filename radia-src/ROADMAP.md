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

## SÉRIE « MESSAGES · BRAS ET POSE DE RADIA · ÉVÉNEMENTS DE FAMILLE » (dernières demandes)
1. ✅ **BUG Messages (aperçu ≠ conversation)** — CAUSE : DEUX historiques. Les messages « spontanés » des événements (ex. « …ne pas oublier de manger. Sahha ! ») vivaient dans `events.msgs`, le nouveau moteur dans `fun.apps.messages` ; la vue les fusionnait à la main : les anciens étaient affichés TOUT EN HAUT du fil, avant des messages plus anciens (séparateur « 17:58 » avant « 16:00 »), donc hors de vue sur une longue conversation. CORRECTION STRUCTURELLE : un seul historique. `engine.deliver` (dépôt chronologique, sans doublon) + `engine.syncLegacy` (migration idempotente des anciens messages, marqués `synced`, rien supprimé) ; `messagesState()` migre avant toute lecture ; invitations datées (`Invite.ts`, estimée pour les anciennes sauvegardes) ; la vue construit UNE chronologie (messages + invitations + vocal) utilisée pour l'aperçu ET le fil ; mise à jour en direct de la liste / du fil ouverts. Les messages de contacts sans conversation ne sont plus émis. Tests : `tests/messages-sync.test.ts` (14), `scripts/messages-sync-e2e.mjs` (44 contrôles : 6 contacts, badge de l'icône, rechargement, ancienne sauvegarde, vocal).
2. ✅ **Bras de Radia** : l'articulation de l'épaule remonte sur la vraie ligne d'épaule (y 190, au lieu de l'aisselle y 204) ; dôme d'épaule ; bras nu et manche = même tube (`tube()`), contour seulement sur le bord extérieur puis sous l'aisselle (plus de couture dans le torse) ; coude rapproché ; bandoulière sous la manche, sac derrière la main ; mèche de droite de la tête peinte en fondu (plus de coupe franche).
3. ✅ **Pose idle** (`RIG.pose`) : bras GAUCHE plié, main sur la hanche (raccourci par la perspective ≈ 10 %) ; bras DROIT détendu, légèrement plié, main qui repose près du sac. Ancienne pose conservée (`RIG.poseRest`). Tests d'anatomie dans `tests/rig.test.ts`. ⚠️ La figure PEINTE (tenue illustrée) garde la pose de son illustration (bras le long du corps) : un changement demande une nouvelle illustration (voir `docs/ASSETS_PERSONNAGES.md`).
4. ✅ **Snapchien** : toute story reçoit une réaction dans ses 2,4 premières secondes (une story d'une image dure 3,2 s ; avant, ≈ 20 % des stories n'en montraient aucune). Remplace la note « test instable » : c'était un vrai défaut.
5. ✅ **Événements de famille** : A « Une visite chez maman », B « À l'aéroport avec maman » (histoire unique) + B2 « Les retrouvailles » (après ~22 min de jeu actif), C « Auguste t'invite à sortir » (organisation des enfants → 3 issues : soirée à deux / sortie en famille / report doux). Nouveaux : proches fictifs (`data/family/relatives.ts`, portraits dessinés `game/art/relatives.ts`), lieux « Chez maman » et « Aéroport », mini-jeux `familyPick` et `arrangeCare` (disponibilité simulée déterministe, jamais d'impasse, aucune culpabilisation, tests). Tests : `tests/events-family.test.ts`, `tests/relatives.test.ts`, `scripts/family-events-e2e.mjs`.
6. ⬜ RESTE de cette série : annuaire « Famille & proches ♡ » (conversations avec tante / sœur / amie dans Messages), événements secondaires (parc, anniversaire surprise, week-end), restaurants (5 types), dressing +30, Tindeur↔Snapchien, TikTak→Auguste, économie / casino, PIMBÊCHE.

## SÉRIE « VISAGE CANONIQUE · ACCUEIL · TABLEAU DE BORD » (dernières demandes)
1. ✅ **Visage canonique unique** — la tête actuelle de Radia est LA référence. Retiré : Peau, Forme du visage, Yeux, Sourcils, Nez, Bouche, Cheveux (couleur/volume), « Ancien dessin » dans « Personnaliser Radia » ; rayons Yeux / Bouche / Lèvres du dressing ; objets `ey-*`, `mo-*`, `el-wing/soft/none` (ne s'équipent plus ; **restent dans l'inventaire**, rien n'est perdu). Gardé : coiffure, couronne, accessoires, vêtements, **maquillage léger** (fard, eye-liner « appuyé », blush, rouge à lèvres / gloss — un seul rayon « Maquillage » au dressing + écran « Personnaliser Radia » réduit à Maquillage · Voile · Mes maquillages).
   - Maquillage = **surcouche** (`game/art/world/makeupOverlay.ts`, règle pure `game/world/makeupSpec.ts`), dessinée dans le repère de l'illustration par-dessus la tête peinte (teintes multipliées avec la peau). Il ne change JAMAIS le mode de tête peinte (`paintedHeadKind` : seul un voile passe en « visage seul »). Réglage d'origine = aucune surcouche = pixel pour pixel l'illustration.
   - Sauvegarde : `sanitizeFace` ramène toute structure à la tête canonique (maquillage, couleur de rouge et voile conservés) ; l'ancien réglage est gardé en copie `wardrobe.legacyFace` (retour en arrière possible) ; looks enregistrés nettoyés des objets retirés ; achats / tenues / inventaire intacts.
   - Tests : `face-custom`, `face-upgrade`, `makeup-overlay`, `painted-look`, `world-beauty` (attendus modifiés légitimement : l'ancien comportement — yeux/bouche qui remplacent la tête — n'existe plus) ; `scripts/face-canonical-e2e.mjs` (planche, 19 contrôles : silhouette identique, hors yeux/joues/bouche identique), `face-canonical-screens-e2e.mjs` (rendus réels utilisés par accueil, dressing, dialogues, médaillons), `face-studio-e2e.mjs` réécrit (53 contrôles). ⚠️ À regarder sur l'iPhone réel : rendu du maquillage.
2. ✅ Accueil : Casino en grand bouton, Succès en petite icône, cadeau du jour conservé ; Nouveautés v10 ; invitation unique aux petites pensées (voir séries précédentes pour le détail).
3. 🟡 **TABLEAU DE BORD PRIVÉ des statistiques de jeu** (demande « créateur », avec consentement explicite de Radia ; à développer APRÈS les corrections bloquantes, sans toucher au gameplay) :
   - Serveur : `supabase/radia-stats.sql` (3 tables verrouillées RLS sans politique, fonctions `radia_stats_join/beat/mine/pause/forget` côté Radia authentifiées par un secret d'appareil haché, `radia_stats_admin*` réservées à `public.site_admins` via la connexion Google du site, purge nocturne : sessions 90 j, jours 400 j, appareil inactif 180 j). ⚠️ NON appliqué tant que la confirmation de l'outil Supabase n'a pas été validée dans l'interface (deux délais dépassés).
   - Reste : suivi d'activité côté jeu (visibilité, inactivité 60 s, battement ≈ 45 s, `pagehide`), consentement + info claire + désactiver/consulter/supprimer dans Réglages, page admin `radia-admin.html` hors menu, tests (Safari/PWA émulés, changements de réseau, fermeture brutale), présentation « estimé » du temps de jeu.
   - Principes : aucune conversation / message / position collectés ; une session ne prouve pas que c'est Radia → identification explicite et consentie par appareil ; temps de jeu = ESTIMÉ à partir de la dernière activité connue (iPhone ne permet pas de détecter une fermeture brutale).

## SÉRIE « COMBOS · PENSÉES · FINITION DE RADIA · STATISTIQUES » (dernières demandes)
1. ✅ **Combos sans pop-ups** (Chapitres + Endless) : indicateur unique « Combo x3 ! / Super combo x10 ! » dans une bande RÉSERVÉE au-dessus de la grille (la grille rétrécit si la place manque ; jamais sur les cases), points de la chaîne additionnés dedans, plus de « +N » flottants pendant un combo. `game/fx/comboState.ts` : un combo est actif 3 s (= fenêtre du moteur) ; pendant combo OU glissement/animation : aucune notice (`notify` bloqué + `dismissLive` à l'ouverture du combo), pas de bulle d'Auguste (`bark` différé, la plus importante est dite une fois), pas d'invitation surprise (`safeToNotify`), gains/annonces d'Endless regroupés en UNE pastille, récap unique en chapitres (+ historique `noticeHistory`). Toasts : 1 à la fois (les autres attendent). Effets qui montent avec le combo (particules +50 % max, anneau, confettis, haptique 3/5/8/10/15), réduction d'animations respectée. Tests : `combo-state` (9), `scripts/combo-feel-e2e.mjs` 179/179 (séries 3/5/10/15, Endless + Chapitres, 393×852 et 393×660 : indicateur au-dessus de la grille, rien pendant la chaîne, un seul récap, glissé OK après, aucun calque bloquant, fluidité comparée au repos). ⬜ Historique des annonces : conservé en mémoire (`noticeHistory`), pas encore d'écran dédié.
2. ✅ **6 nouvelles pensées du jour** ajoutées À LA FIN de la banque (indices 0–52 inchangés, empreinte testée) avec titres ; aperçu de notification raccourci par le service worker, texte intégral conservé (700 car.) dans « Petites pensées ♡ » ; paquets en cours enrichis sans doublon ; réservation atomique du jour avant l'envoi (aucun doublon même si le planificateur se déclenche deux fois). ✅ Fonction Edge `radia-push` REDÉPLOYÉE (version 2) : les nouvelles pensées entrent dans la rotation des paquets en cours.
3. ✅/⚠️ **Finition de Radia** : tête remontée de 13 u (`RIG.head.lift`) pour un vrai COU (colonne évasée vers les trapèzes, ombre du menton, contours) ; mains redessinées (doigts fins et effilés, pouce allongé, taille +12 %) ; Radia est désormais TOUJOURS « tête peinte + corps dessiné » (figure peinte complète désactivée : `USE_PAINTED_FIGURE`) pour que cou, mains et pose soient identiques quelle que soit la tenue ; vignettes du dressing recadrées (lunettes, boucles, lèvres, maquillage, vernis) ; fenêtres de récompenses : fond plus opaque, cartes de même hauteur. **Vernis** : 5 objets gratuits optionnels (nude, rose pâle, rouge, bordeaux, french ; « sans vernis » = ne rien porter) dans le rayon « Vernis » du dressing, dessinés sur les ongles des deux mains. ⚠️ À regarder sur iPhone réel.
4. ✅/⚠️ **Statistiques de jeu (tableau de bord privé)** — SERVEUR APPLIQUÉ ET TESTÉ sur le projet Supabase du site : 3 tables verrouillées (RLS, aucun droit direct), fonctions `radia_stats_join/beat/mine/pause` (secret d'appareil stocké haché, temps crédité plafonné au temps réellement écoulé, une seule session ouverte par appareil, silence > 4 min = session close sans compter le trou), `radia_stats_admin(_label)` réservées à `site_admins` ; suppressions (« supprimer mes données », suppression d'un appareil par le créateur) et purge de conservation (sessions 90 j, jours 400 j, appareil inactif 180 j) faites par la fonction Edge `radia-push` (l'outil SQL refuse de traiter des `delete` sans confirmation interactive que le client ne peut pas afficher). Client : Réglages → « Statistiques de jeu ♡ » (information complète, activer / désactiver / voir / supprimer), invitation UNIQUE seulement si le serveur répond, suivi d'activité réelle (visible + écran touché < 60 s, battement 45 s, arrière-plan, `pagehide`). Page `radia-admin.html` (connexion Google, `fcrdaug@gmail.com` et le compte de Maxime sont les seuls admins). Tests : `stats-logic` (9), `scripts/stats-e2e.mjs` 16/16 contre le vrai serveur (appareil de test supprimé), test serveur 23/23 (sécurité, plafonds, doublons, pause, suppression), vue admin vérifiée via `request.jwt.claim.sub`. ⚠️ Non testé : connexion Google réelle sur la page admin depuis l'iPhone ; changements de réseau réels.

## SÉRIE « REFONTE STRUCTURELLE DU PERSONNAGE DE RADIA » (dernière demande)
- POINT DE RESTAURATION : branche `backup/pre-refonte-personnage` (commit 48ca189, version en ligne mw3o7b25). Aucune donnée de sauvegarde modifiée
  (le dessin seul change) → aucune migration nécessaire ; revenir en arrière = redéployer cette branche.
- DIAGNOSTIC (mesuré) : l'hypothèse « illustration peinte + personnage assemblé en code » est CONFIRMÉE, avec une cause chiffrée : deux échelles de tête
  choisies selon la coiffure / la couronne (mode « visage » 69,8 u vs mode « tête » 61,4 u de large = +13,6 %, et +15 % par rapport à l'illustration
  de référence 60,6 u). Couronnes dessinées calées sur le crâne DESSINÉ (≈ 40 u plus bas que le crâne peint). Pose du corps (main sur la hanche +
  inclinaison en deux moitiés) différente de celle de l'illustration (bras le long du corps).
- ✅ GABARIT UNIQUE `src/game/art/world/rig.ts` : proportions et ancres centralisées (échelle de tête 0,807 pivot au menton, sommet du crâne, pose de
  référence, bras, mains). ✅ UNE échelle de tête : le visage est identique avec toute couronne / coiffure / accessoire / tenue.
- ✅ CRÂNE complet : dôme reconstruit par ajustement d'ellipse sur le vrai contour (sommet y = -6 px, erreur 0,09 px²). ✅ Couronne dorée = calque
  peint séparé ; TOUTES les couronnes ancrées sur le sommet du crâne (`skullTopY` / `crownDy`). La couronne ne change plus le mode de la tête.
- ✅ POSE de l'illustration (bras le long du corps) ; inclinaison en deux moitiés SUPPRIMÉE (plus de couture, moins de coût). Bras 29→18,5, mains
  recalées sur la mesure de l'illustration.
- ✅ PLANCHE `?planche` (vrais composants, même échelle, repères du gabarit, Auguste en référence) + `scripts/board-shots.mjs`.
- ✅ TESTS : `tests/rig.test.ts`, `tests/painted-look.test.ts`, `scripts/character-visual-e2e.mjs` (33 contrôles : le visage ne change pas avec la
  couronne / coiffure / accessoire / tenue, écarts ≤ 3,7/255 ; temps de dessin ≈ 1 ms en émulé).
- ✅ « Nouveautés » v9 (nouveau look de Radia, tête stable, bouton « Tenue illustrée », partie intacte) — `main.ts` `showWhatsNewV9`, clé `v9` ajoutée aux sauvegardes neuves et aux amorces des parcours.
- ✅ Test Snap « réactions fictives » : fenêtre d'observation élargie de 3 s à ~7 s (la 1re réaction peut arriver à 3–5,5 s ; avant : ≈ 18 % d'échecs). Pas un bug du jeu.
- 🟡 RESTE : coiffures dessinées plus plates que la tête peinte ; col de la tenue noire dessinée ≠ illustration ; vêtements / corps encore en vectoriel →
  cahier des charges `docs/ASSETS_PERSONNAGES.md` (5 tenues prioritaires). ⚠️ À valider sur iPhone réel. La DA n'est PAS déclarée validée.

## SÉRIE « DA COMMUNE RADIA × AUGUSTE » (dernière demande — refonte artistique)
- DIAGNOSTIC : sur l'iPhone (avec le lien secret), Auguste est une ILLUSTRATION PEINTE du pack chiffré (`char-auguste`) alors que Radia était
  dessinée en vectoriel par le dressing : deux techniques → « deux univers ». Les illustrations peintes de Radia existaient (`char-radia`,
  `char-radia-nc`, `bust-radia`, `bust-radia-nc`) mais n'étaient plus utilisées depuis le dressing.
- ✅ BUG DE BUILD : `char-radia-nc.bin` et `bust-radia-nc.bin` étaient SUPPRIMÉS à chaque build (`vite.config.ts` : « -radia-nc » ressemblait
  à une empreinte de 8 caractères). Les fichiers privés `assets/p/` sont exclus de cette règle.
- ✅ Radia PEINTE partout où elle porte la tenue de l'illustration (sweat noir, pantalon large, baskets blanches, sac bandoulière, cheveux
  longs, sans autre accessoire, visage non personnalisé ; avec / sans couronne dorée) : accueil, MON MONDE, dressing, événements, photos
  souvenirs, casino, fin, dialogues (buste), médaillons. Règle pure testée : `game/world/paintedLook.ts` (`tests/painted-look.test.ts`).
- ✅ Bouton « Tenue illustrée ♡ » dans le dressing (`W.equipIllustrated`) : remet en un geste cette tenue avec les pièces possédées.
- ✅ Vectoriel (autres tenues) : base de visage calquée sur l'illustration (peau dorée, yeux bruns en amande, eye-liner relevé, lèvres nude).
- ✅ VISAGE PEINT SUR TOUTES LES TENUES (priorité « tête / visage / DA ») : couches tirées de l'illustration (`headp-radia`,
  `headp-radia-nc`, `facep-radia`, chiffrées). Cheveux longs → tête complète peinte (cheveux, couronne dorée) réduite aux proportions
  d'Auguste, cheveux dessinés derrière pour combler ; autre coiffure / accessoire de tête → visage peint seul, coiffure dessinée autour.
  Visage personnalisé ou maquillage du dressing → dessin (il suit les réglages). Tenue de la joueuse INCHANGÉE. Expressions : le visage
  peint garde un sourire (comme l'illustration d'Auguste). Fabrication : `scripts/painted-head/`.
- ✅ CORPS de Radia repris dans la même logique qu'Auguste (code, toutes les tenues) : bras EFFILÉS et ombrés (épaule → poignet arrondi),
  mains peintes (paume, 4 doigts, pouce côté corps), jambes modelées (cuisse, genou, mollet, cheville, lumière du tibia), contours ≈ 20 %
  plus fins (`LINE_K` dans `avatar.ts`), jonction des deux moitiés de la posture en S en FONDU (plus de couture à la taille), mèches de la
  tête peinte complètes devant l'épaule. Tenue et dressing inchangés.
- ✅ PASSE « PROPORTIONS / HOMOGÉNÉITÉ » (corps de Radia) : tête réduite autour du MENTON (−7 % pour toute tête ; −18 % pour la tête peinte complète,
  très volumineuse) — cheveux arrière, visage, accessoires et couronne suivent ; bras plus épais (épaule 25, poignet 16,5) ; mains refaites et
  agrandies (~1,5×, paume + 4 doigts épais + pouce charnu, ombre et lumière douces) ; reflets du bras sans tache au poignet. Mesures prises face
  à Auguste peint (hauteur de tête ≈ 23 % de la silhouette, main ≈ 4 % de la hauteur sur la référence). Vérifié à l'écran : accueil, dressing,
  événement (restaurant), 5 tenues / coiffures dont visage seul peint.
- (RÉSOLU, voir ci-dessus : c'était un vrai défaut de Snapchien) `apps-e2e` « Snap : réactions fictives affichées pendant la story » échouait ≈ 18 % du temps :
  les délais des réactions sont tirés de l'identifiant de la story (donc de l'heure) ; sans réaction d'Auguste (20 %), la première arrive à ≥ 3 s,
  alors que le test ne regarde que ~3 s (mesuré avec le vrai `genReactions` : 19,5 % sans réaction avant 3,0 s). À élargir à ~7 s si besoin.
- 🟡 PHASE B — illustrations en calques pour TOUTES les tenues : cahier des charges `docs/ASSETS_PERSONNAGES.md` (gabarit 720 × 1800,
  calques, identifiants, intégration avec repli sur le dessin). En attente des fichiers d'illustration (pas d'outil de génération ici).
- ⚠️ À vérifier sur iPhone : la tenue illustrée (dressing → « Tenue illustrée »), puis accueil / MON MONDE / un événement.

## SÉRIE « RADIA : REFONTE VISUELLE + CORRECTIF DE SUPERPOSITION »
1. ✅ **Bug « personnage dédoublé » (capture iPhone)** — CAUSE RÉELLE (introduite par la refonte précédente, pas par les sauvegardes ni d'anciens sprites) : la posture en S de `drawAvatar` (`game/art/world/avatar.ts`) dessinait l'avatar ENTIER pivoté autour des pieds, puis le haut du corps une 2e fois pivoté autrement → silhouette fantôme derrière l'épaule, tête/cheveux doublés. Correctif : la moitié basse est découpée SOUS la taille (avec 9 unités de recouvrement pour éviter toute fente claire à la taille).
2. ✅ **Visage « à lunettes »** — CAUSE : yeux trop larges (48) et trop rapprochés (écartement 33) → l'eye-liner rejoignait l'arête du nez. Nouveau réglage de base (`defaultFace()` : yeux un peu plus petits, plus écartés). Migration SANS PERTE (`upgradeUntouchedFace`) : seul un visage strictement égal à l'ancien réglage de base (jamais retouché) est mis à jour ; tout visage personnalisé et les 6 visages enregistrés sont intacts. Test : `tests/face-upgrade.test.ts`.
3. ✅ **Look de référence pour les NOUVELLES parties** : cheveux longs ondulés (`hair-wavy`, déjà offerts) + sweat noir, pantalon large, sac, baskets (déjà le look de départ). Les sauvegardes existantes gardent leurs choix. La couronne dorée reste un objet à acquérir (progression non court-circuitée).
4. 🟡 Reste : vraie coiffure « longues vagues ombrées » plus proche de la référence, vrai contrapposto des jambes, finesse de dessin au niveau d'Auguste, brushing / chignon haut. ⚠️ À voir sur iPhone réel.

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
