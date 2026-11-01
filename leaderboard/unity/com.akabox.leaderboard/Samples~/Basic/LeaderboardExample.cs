using AkaBox.Leaderboard;
using UnityEngine;

/// <summary>
/// Exemple : pose ce script sur un GameObject, assigne un LeaderboardConfig,
/// lance la scène → un score de test est envoyé puis le top 10 s'affiche
/// dans la console. Utilise le jeu « demo » pour tester sans polluer un vrai classement.
/// </summary>
public class LeaderboardExample : MonoBehaviour
{
    public LeaderboardConfig config;
    public string playerName = "Testeur";
    public int testScore = 1234;

    private LeaderboardClient _client;

    private void Start()
    {
        _client = new LeaderboardClient(config);
        SubmitScore(playerName, testScore);
    }

    public void SubmitScore(string player, int score)
    {
        StartCoroutine(_client.Submit(player, score,
            result =>
            {
                Debug.Log($"Score envoyé : {result.player} = {result.score} → rang {result.rank}");
                ShowTop();
            },
            error => Debug.LogWarning("Envoi impossible : " + error)));
    }

    public void ShowTop()
    {
        StartCoroutine(_client.GetTop(10,
            rows =>
            {
                foreach (var row in rows)
                    Debug.Log($"#{row.rank}  {row.player}  {row.score}");
            },
            error => Debug.LogWarning("Classement indisponible : " + error)));
    }
}
