using System;

namespace AkaBox.Leaderboard
{
    /// <summary>Une ligne du classement.</summary>
    [Serializable]
    public class LeaderboardEntry
    {
        public long rank;
        public string player;
        public double score;
        public string created_at;
    }

    /// <summary>Réponse après l'envoi d'un score.</summary>
    [Serializable]
    public class SubmitResult
    {
        public bool ok;
        public string player;   // pseudo tel qu'enregistré (nettoyé)
        public double score;
        public long rank;       // rang obtenu par ce score
    }

    public enum LeaderboardErrorCode
    {
        NotConfigured,
        UnknownGame,
        InvalidPlayer,
        InvalidScore,
        RateLimited,
        Network,
        Server,
    }

    public class LeaderboardError
    {
        public LeaderboardErrorCode Code;
        public string Message;
        public long HttpStatus;

        public LeaderboardError(LeaderboardErrorCode code, string message, long httpStatus = 0)
        {
            Code = code;
            Message = message;
            HttpStatus = httpStatus;
        }

        public override string ToString() => $"[{Code}] {Message}";
    }

    // --- formats JSON internes (remplis par JsonUtility) ---
#pragma warning disable 0649
    [Serializable] internal class EntryList { public LeaderboardEntry[] items; }
    [Serializable] internal class ErrorBody { public string code; public string message; }
#pragma warning restore 0649
}
