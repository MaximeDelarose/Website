# AkaBox Leaderboard

Un système de classement en ligne **générique**, réutilisable pour n'importe quel jeu :

- **`supabase.sql`** : la base de données (Supabase, gratuit) ;
- **`../js/leaderboard.js`** : le client pour le site (et les jeux web en JavaScript) ;
- **`unity/com.akabox.leaderboard`** : le package Unity (WebGL, PC, mobile).

Un jeu = une ligne dans la table `lb_games`. Chaque jeu a son propre classement : meilleur score de chaque joueur, pseudo insensible à la casse.

---

## 1. Mise en place (une seule fois)

1. Dans Supabase, ouvre **SQL Editor**, colle tout le contenu de [`supabase.sql`](supabase.sql), puis clique sur **Run**.
   Le script crée les tables, les règles de sécurité, les fonctions et 2 jeux : `demo` (pour les tests) et `chaaat`.
2. Dans **Project Settings → API**, récupère :
   - le **Project URL** (`https://xxxx.supabase.co`) ;
   - la clé **publique** : *publishable* (`sb_publishable_…`) ou *anon*.
3. Mets-les dans `js/data.js` → `SITE.supabase = { url, key }`.

> ⚠️ Ne mets **jamais** la clé *secret* / *service_role* dans le site ou dans un jeu : tout le monde peut la lire.
> La clé publique ne permet que ce que le SQL autorise : lire le classement et envoyer un score vérifié.

## 2. Ajouter un jeu

Dans le SQL Editor :

```sql
insert into public.lb_games (id, name, higher_is_better, min_score, max_score)
values ('chaaat-v2', 'Chaaat v2', true, 0, 10000000);
```

| Colonne | Rôle |
|---|---|
| `id` | identifiant utilisé partout (`a-z`, `0-9`, `-`) |
| `higher_is_better` | `true` = plus grand score gagne ; `false` = plus petit (un temps de course, par exemple) |
| `min_score` / `max_score` | les scores en dehors de ces bornes sont refusés : règle-les au plus juste, c'est l'anti-triche de base |
| `max_per_hour` | nombre d'envois max par IP et par heure (30 par défaut) |
| `enabled` | `false` pour fermer un classement sans le supprimer |

Pour vider les scores d'un jeu : `delete from public.lb_scores where game_id = 'demo';`

## 3. Sur le site

```html
<!-- n'importe où dans une page qui charge js/data.js puis js/leaderboard.js -->
<div data-leaderboard="chaaat" data-limit="10" data-title="Classement Chaaat"></div>
```

Pour l'afficher sous la borne de l'accueil, mets `leaderboard: true` sur le projet dans `js/data.js` (c'est déjà fait pour Chaaat).

En JavaScript :

```js
Leaderboard.top("chaaat", 10).then(rows => console.log(rows));
Leaderboard.submit("chaaat", "Maxime", 4200, { version: "2.0" })
  .then(r => console.log("rang", r.rank))
  .catch(e => alert(Leaderboard.message(e)));
```

## 4. Dans Unity

**Installer le package :** Window → Package Manager → **+** → *Add package from git URL…*

```
https://github.com/MaximeDelarose/Website.git?path=/leaderboard/unity/com.akabox.leaderboard
```

**Configurer :** clic droit dans Project → *Create → AkaBox → Leaderboard Config*, puis remplis le Project URL, la clé publique et `gameId`.

**Utiliser :**

```csharp
using AkaBox.Leaderboard;

public class GameOver : MonoBehaviour
{
    public LeaderboardConfig config;
    LeaderboardClient client;

    void Awake() => client = new LeaderboardClient(config);

    public void SendScore(string pseudo, int score)
    {
        StartCoroutine(client.Submit(pseudo, score,
            r => Debug.Log($"Rang {r.rank} !"),
            e => Debug.LogWarning(e)));          // e.Code : RateLimited, InvalidPlayer…
    }

    public void LoadTop()
    {
        StartCoroutine(client.GetTop(10,
            rows => { foreach (var row in rows) Debug.Log($"#{row.rank} {row.player} {row.score}"); },
            e => Debug.LogWarning(e)));
    }
}
```

Un exemple complet est dans le Package Manager → AkaBox Leaderboard → *Samples* → **Exemple simple**.

## Sécurité et limites

- Les tables ne sont **pas** accessibles directement : tout passe par `lb_top` et `lb_submit`, qui vérifient le jeu, le pseudo (2 à 20 caractères, nettoyé) et les bornes du score, et limitent les envois par IP. L'IP est stockée uniquement sous forme de hash.
- Un score envoyé par un jeu **peut toujours être falsifié** par quelqu'un de motivé (le jeu tourne chez le joueur). Pour un jeu perso, les bornes et la limite d'envois suffisent. Pour aller plus loin : vérifier côté serveur la cohérence du score (durée de partie, actions…), via une Edge Function Supabase.
- Le niveau gratuit de Supabase met en pause un projet inactif pendant longtemps : il suffit de le relancer depuis le tableau de bord.
