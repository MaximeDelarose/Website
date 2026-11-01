using UnityEngine;

namespace AkaBox.Leaderboard
{
    /// <summary>
    /// Réglages d'un classement : projet Supabase + identifiant du jeu.
    /// Créer : clic droit dans Project → Create → AkaBox → Leaderboard Config.
    /// </summary>
    [CreateAssetMenu(menuName = "AkaBox/Leaderboard Config", fileName = "LeaderboardConfig")]
    public class LeaderboardConfig : ScriptableObject
    {
        [Tooltip("Supabase → Project Settings → API → Project URL (ex : https://xxxx.supabase.co)")]
        public string projectUrl = "";

        [Tooltip("Clé PUBLIQUE : « publishable » (sb_publishable_…) ou « anon ». " +
                 "Ne JAMAIS mettre la clé secrète / service_role dans un jeu.")]
        public string publicKey = "";

        [Tooltip("Identifiant du jeu dans la table lb_games (ex : chaaat)")]
        public string gameId = "";

        [Tooltip("Délai max d'une requête en secondes (ignoré en WebGL)")]
        public int timeoutSeconds = 10;

        public bool IsValid =>
            !string.IsNullOrWhiteSpace(projectUrl) &&
            !string.IsNullOrWhiteSpace(publicKey) &&
            !string.IsNullOrWhiteSpace(gameId);
    }
}
