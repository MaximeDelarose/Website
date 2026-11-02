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
| `rd_open_chest(id)` | prix vérifié, tirage fait par le serveur |
| `rd_level_up(type)` | exemplaires et glands vérifiés |
| `rd_start_run(mode)` / `rd_end_run(...)` | une partie est ouverte puis fermée ; la vague est bornée par la durée réelle (au mieux une vague / 7 s), gains calculés par le serveur (500 max), succès attribués par le serveur, 60 parties / heure max |

**Admins** : table `site_admins` (modifiable seulement depuis Supabase). Un admin voit dans Écureuil Dice un panneau « 🛠 Admin » (`rd_admin_gold`, `rd_admin_unlock`) et un badge ADMIN sur Mon compte. Ajouter un admin :
`insert into public.site_admins (user_id) select id from auth.users where email = 'adresse@gmail.com';`

Limite connue : le résultat d'une partie vient toujours du navigateur (le serveur ne rejoue pas la partie), il est
seulement borné. En versus en ligne, chaque navigateur simule son propre terrain.

## Connexion Google

Supabase → Authentication → Providers → Google (ID client + code secret de la console Google Cloud),
URL Configuration : Site URL `https://mdelarose.fr`, Redirect URLs `https://mdelarose.fr/**`.
Côté Google : origine `https://mdelarose.fr`, redirection `https://euxlmipqzmvnzzyalyfn.supabase.co/auth/v1/callback`.

## Ajouter un autre jeu

Même schéma : une table `<jeu>_profiles` (lecture seule pour son propriétaire, `on delete cascade` sur `auth.users`)
et des fonctions qui vérifient chaque gain. Côté page : `SiteAuth.rpc("<fonction>", { ... })` (voir `js/auth.js`).
