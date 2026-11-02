# Base de données Supabase (projet « BoxUtils »)

Tout est déjà appliqué sur le projet `euxlmipqzmvnzzyalyfn`. Ces fichiers servent de trace et pour recréer la base si besoin
(SQL Editor de Supabase, dans l'ordre) :

1. `../leaderboard/supabase.sql` : classements (`lb_games`, `lb_scores`, `lb_submit`, `lb_top`).
2. `comptes-et-dice.sql` : comptes du site (`profiles`, connexion Google) et progression d'Écureuil Dice côté serveur.

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
