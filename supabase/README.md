# Base de données Supabase (projet « BoxUtils »)

Tout est déjà appliqué sur le projet `euxlmipqzmvnzzyalyfn`. Ces fichiers servent de trace et pour recréer la base si besoin
(SQL Editor de Supabase, dans l'ordre) :

1. `../leaderboard/supabase.sql` : classements (`lb_games`, `lb_scores`, `lb_submit`, `lb_top`).
2. `comptes-et-dice.sql` : comptes du site (`profiles`, connexion Google) et progression d'Écureuil Dice côté serveur.
3. `glands-clans-stats.sql` : glands globaux, clans, statistiques publiques (`site_stats`) et outils de la page admin (`admin_*`).

## Principe anti-triche

Le navigateur ne peut **que lire** sa propre ligne (`profiles`, `rd_profiles`). Toute modification passe par des
fonctions `security definer` qui vérifient tout :

| Fonction | Rôle |
|---|---|
| `acct_me()` / `acct_set_pseudo(p)` / `acct_delete()` | profil du site, pseudo, suppression du compte et de toutes ses données |
| `rd_load()` | progression d'Écureuil Dice (créée au premier appel) |
| `rd_import(p)` | reprise **unique** de la sauvegarde du navigateur, plafonnée (1 500 glands, niveau 3, 10 exemplaires) |
| `rd_set_deck(deck)` | deck : seulement des écureuils possédés, sans doublon, 5 max |
| `rd_open_chests(id, n)` | 1 ou 10 coffres (10 = prix de 9), prix vérifié, tirage fait par le serveur |
| `rd_level_up(type)` | exemplaires et glands vérifiés |
| `rd_start_run(mode)` / `rd_end_run(...)` | une partie est ouverte puis fermée ; la vague est bornée par la durée réelle (au mieux une vague / 7 s), gains calculés par le serveur (500 max), succès attribués par le serveur, 60 parties / heure max |

**Admins** : table `site_admins` (modifiable seulement depuis Supabase). Un admin voit dans Écureuil Dice un panneau « 🛠 Admin » (`rd_admin_gold`, `rd_admin_unlock`) et un badge ADMIN sur Mon compte. Ajouter un admin :
`insert into public.site_admins (user_id) select id from auth.users where email = 'adresse@gmail.com';`

Limite connue : le résultat d'une partie vient toujours du navigateur (le serveur ne rejoue pas la partie), il est
seulement borné. En versus en ligne, chaque navigateur simule son propre terrain.

## Sauvegardes des autres jeux (Survivor, Chêne, Merger)

`js/cloudsave.js` synchronise la sauvegarde localStorage existante de chaque jeu avec le compte, **sans toucher au code du jeu** :
il suffit de le charger avant le script du jeu (`data-game` + `data-key` ou `data-prefix`). Table `game_saves`, fonctions
`gs_load` / `gs_save`. À l'écriture, `gs_guard` refuse les sauvegardes impossibles (sauf pour les admins) :

- **ecureuil-survivor** : glands gagnés (`stats.goldEarned`) au plus 50 / s + 5 000, glands possédés ≤ glands gagnés + 20 000,
  rang au plus +3 (+1 / 30 s), points de prestige seulement avec un prestige, reprise d'une sauvegarde plafonnée.
- **grand-chene** : pas de sauvegarde « dans le futur » ni de saut dans le temps, compteurs à vie qui ne reculent pas,
  glands ≤ total récolté, saisons au plus +1 par minute.
- **merger** : records dans des bornes.

Refus enregistrés dans `game_save_rejects` (jeu, raison, date) ; le joueur revient à sa dernière sauvegarde valide.
Pour un nouveau jeu : ajouter son id dans le `check` de `game_saves` et dans `gs_save`, écrire sa branche de `gs_guard`.

## Connexion Google

Supabase → Authentication → Providers → Google (ID client + code secret de la console Google Cloud),
URL Configuration : Site URL `https://mdelarose.fr`, Redirect URLs `https://mdelarose.fr/**`.
Côté Google : origine `https://mdelarose.fr`, redirection `https://euxlmipqzmvnzzyalyfn.supabase.co/auth/v1/callback`.

## Ajouter un autre jeu

Même schéma : une table `<jeu>_profiles` (lecture seule pour son propriétaire, `on delete cascade` sur `auth.users`)
et des fonctions qui vérifient chaque gain. Côté page : `SiteAuth.rpc("<fonction>", { ... })` (voir `js/auth.js`).

## RADIA ♡ — petites pensées quotidiennes (Web Push)

Appliqué sur le projet : `radia-push.sql` (tables `radia_push_config` / `radia_push_subs`, **verrouillées** : RLS sans aucune politique ;
le navigateur n'y accède que par `radia_push_public_key()`, `radia_push_register(...)`, `radia_push_unregister(...)`, qui valident tout :
https, service de push connu (Apple / Google / Mozilla / Microsoft), tailles, 300 appareils au plus), la fonction Edge `radia-push`
(`functions/radia-push/`, chiffrement RFC 8291 + VAPID en WebCrypto, testé dans `radia-src/tests/push-*.test.ts`) et la tâche
`pg_cron` **`radia-push-horaire`** (à :05 de chaque heure ; le secret partagé est lu dans la table au moment de l'appel).

- Une seule notification par jour et par appareil, à partir de 9 h **heure locale de l'appareil** (fuseau enregistré), jamais avant 8 h ni à partir de 21 h ; rattrapage possible dans la journée.
- 56 messages en rotation (aucun deux fois avant d'avoir tout vu, jamais la même catégorie d'affilée).
- Les clés VAPID sont créées PAR la fonction (`{"action":"init"}`, une seule fois) : la clé privée ne quitte jamais le serveur et n'est dans aucun dépôt.
- Test à la demande : `{"action":"test","endpoint":"…"}` (3 par jour et par appareil) — bouton « Tester maintenant » dans RADIA.
- Voir ce qui partirait sans envoyer : `select net.http_post(url:='…/functions/v1/radia-push', headers:=jsonb_build_object('x-radia-cron',(select cron_secret from radia_push_config)), body:='{"action":"send","dry":true}')`.
- **Tout arrêter** : `select cron.unschedule('radia-push-horaire');` (les abonnements restent mais plus rien ne part). Supprimer un appareil : `delete from radia_push_subs where endpoint = '…';`.

## Glands globaux, clans, stats et page admin (`glands-clans-stats.sql`)

**Glands globaux** (prêts, **pas encore branchés**) : un porte-monnaie par compte, commun à tous les jeux.

| Élément | Rôle |
|---|---|
| `acorn_wallets` | solde, total gagné, total dépensé |
| `acorn_ledger` | chaque mouvement (+/-), avec le jeu, la raison et l'admin éventuel |
| `acorn_sources` | jeux autorisés à donner des glands, avec `max_per_call` et `max_per_hour` ; **tous désactivés** |
| `acorn_earn(jeu, n, raison)` | gain depuis un jeu : refusé (`source_disabled`) tant que la source n'est pas activée, puis plafonné |
| `acorn_spend(n, jeu, raison)` / `acorn_me()` | dépense (solde vérifié) / mon solde et mes 20 derniers mouvements |

Pour brancher un jeu plus tard : activer sa source dans la page admin (ou `acorn_sources.enabled`), puis appeler
`SiteAuth.rpc("acorn_earn", { p_game: "merger", p_amount: 25, p_reason: "partie" })` à la fin d'une partie.

**Clans** : `clans` (3 clans : Chêne 🌳, Braise 🔥, Givre ❄️), `clan_members`. `clan_join(id)` (changement possible tous les 7 jours,
sauf admin), `clan_me()`. Les glands d'un clan = somme des glands gagnés par ses membres.

**Stats publiques** : `site_stats()` (sans compte) → comptes, glands récoltés, parties enregistrées, scores, clans. Page `stats.html`.

**Page admin** (`admin.html`, réservée à `site_admins`, lien depuis le badge ADMIN de Mon compte et depuis la page Stats) :
vue d'ensemble (`admin_overview`), recherche de joueur (`admin_find_user`), donner / retirer des glands (`admin_acorn_grant`, `admin_acorn_history`),
changer le clan d'un joueur (`admin_set_clan`), effacer une sauvegarde en ligne bloquée (`admin_save_reset`), classements : créer, modifier,
activer, vider, supprimer un score (`admin_lb_game`, `admin_lb_reset`, `admin_lb_delete_score`), réglages des sources de glands
(`admin_acorn_source`), journal des sauvegardes refusées (`admin_clear_rejects`). Chaque fonction revérifie `is_admin()` côté serveur.
