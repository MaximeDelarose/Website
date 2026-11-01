# AkaBox Leaderboard (Unity)

Classements en ligne génériques basés sur Supabase.
Documentation complète et script SQL : https://github.com/MaximeDelarose/Website/tree/main/leaderboard

1. Create → AkaBox → Leaderboard Config (Project URL, clé publique, gameId)
2. `var client = new LeaderboardClient(config);`
3. `StartCoroutine(client.Submit("Pseudo", score, ok, err));` / `StartCoroutine(client.GetTop(10, ok, err));`
